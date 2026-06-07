#!/usr/bin/env node
// post-facebook.mjs — Publica 1 variante por día en la Page de Merkao.
//
// Comportamiento:
//   - Lee ../posts/variants.json (generado por post-generator.mjs)
//   - Mantiene state.json con el último índice usado y la fecha del último
//     post (en zona horaria America/Lima)
//   - Idempotente por día: si ya posteó hoy, sale sin hacer nada
//   - Rota las variantes en orden 1→2→3→...→7→1→2→...
//   - Loguea cada intento a fb-posts.log (append-only)
//
// Flags:
//   --dry-run     muestra qué publicaría pero no llama a la API
//   --force       ignora la guarda de "ya posteó hoy"
//   --index=N     fuerza una variante específica (0-based)
//   --no-image    saltar Unsplash, postear text-only a /feed
//
// Imagen: si UNSPLASH_ACCESS_KEY está seteada (.env o GitHub secret), busca
// una foto landscape en Unsplash según el tema de la variante (VARIANT_THEMES
// abajo) y la sube como /photos con caption. Si Unsplash falla o no hay
// access key, hace fallback a /feed text-only sin romper el cron.

import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ENV_PATH = resolve(__dirname, '.env')
const STATE_PATH = resolve(__dirname, 'state.json')
const LOG_PATH = resolve(__dirname, 'fb-posts.log')
const VARIANTS_PATH = resolve(__dirname, '..', 'posts', 'variants.json')

const API_VERSION = 'v21.0'
const TIMEZONE = 'America/Lima'

// ── Mapeo de variante → tema visual ──────────────────────────
// Diversifica los paisajes: las "general" usan amplios paisajes peruanos,
// las temáticas son más específicas. Para cada tema hay varias queries y
// el script elige una al azar para no repetir foto en runs consecutivos.
const VARIANT_THEMES = {
  1: 'general',     // Comparativa con números
  2: 'general',     // Para la que recién empieza
  3: 'artesania',   // Artesana / productora regional (explícito)
  4: 'general',     // Pregunta abierta a la comunidad
  5: 'alimentos',   // Testimonio (diversifica visualmente)
  6: 'cafe',        // Tip de venta + foto (aspiracional)
  7: 'moda',        // Invitación corta y cálida (menciona ropa)
}
// Queries en español según tu spec. Unsplash devuelve hasta 20 fotos
// por query y el script elige una al azar entre esos resultados —> variedad
// visual aunque la query sea la misma.
const THEMES = {
  alimentos: 'mercado peruano frutas',
  artesania: 'tejidos cusco peru',
  moda:      'ropa colorida peru',
  cafe:      'cafe peru plantacion',
  general:   'paisaje peru',
}

// ── 1. Parse args ─────────────────────────────────────────────
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const force = args.includes('--force')
const noImage = args.includes('--no-image')
const forcedIndexArg = args.find((a) => a.startsWith('--index='))
const forcedIndex = forcedIndexArg ? parseInt(forcedIndexArg.split('=')[1], 10) : null

// ── 2. Load .env ──────────────────────────────────────────────
// En local lee .env. En CI (GitHub Actions) usa process.env directo y .env no existe.
if (existsSync(ENV_PATH)) {
  const env = parseEnv(readFileSync(ENV_PATH, 'utf8'))
  for (const k of Object.keys(env)) {
    if (!process.env[k]) process.env[k] = env[k]
  }
}
const PAGE_ID = process.env.META_PAGE_ID?.trim()
const PAGE_TOKEN = process.env.META_PAGE_ACCESS_TOKEN?.trim()
if (!PAGE_ID || !PAGE_TOKEN) {
  bail(
    'Faltan META_PAGE_ID o META_PAGE_ACCESS_TOKEN en .env. Corré primero: node get-token.mjs',
  )
}

// ── 3. Load variants ──────────────────────────────────────────
if (!existsSync(VARIANTS_PATH)) {
  bail(`No existe variants.json en ${VARIANTS_PATH}. Corré primero el generador en posts/.`)
}
const variantsFile = JSON.parse(readFileSync(VARIANTS_PATH, 'utf8'))
const variantes = Array.isArray(variantsFile.variantes) ? variantsFile.variantes : []
if (variantes.length === 0) bail('variants.json no tiene variantes válidas.')

// ── 4. Load / init state ──────────────────────────────────────
const state = existsSync(STATE_PATH)
  ? JSON.parse(readFileSync(STATE_PATH, 'utf8'))
  : { lastIndex: -1, lastPostedDate: null, totalPosts: 0, history: [] }

const todayPeru = dateInTz(new Date(), TIMEZONE) // YYYY-MM-DD
const yaPosteóHoy = state.lastPostedDate === todayPeru

if (yaPosteóHoy && !force && forcedIndex == null) {
  console.log(`[fb] ya se posteó hoy (${todayPeru} Lima). Saliendo. Usá --force para forzar.`)
  log(`SKIP today_already_posted date=${todayPeru} lastIndex=${state.lastIndex}`)
  process.exit(0)
}

// ── 5. Pick next variant ──────────────────────────────────────
const nextIndex =
  forcedIndex != null
    ? ((forcedIndex % variantes.length) + variantes.length) % variantes.length
    : (state.lastIndex + 1) % variantes.length
const variante = variantes[nextIndex]
if (!variante || typeof variante.texto !== 'string') {
  bail(`Variante en índice ${nextIndex} es inválida.`)
}

console.log(`[fb] Hora Lima: ${new Date().toLocaleString('es-PE', { timeZone: TIMEZONE })}`)
console.log(`[fb] Posteando variante #${nextIndex + 1}/${variantes.length} — enfoque: "${variante.enfoque}"`)
console.log('───────────────────────────────────────')
console.log(variante.texto)
console.log('───────────────────────────────────────')
console.log(`[fb] ${variante.texto.length} caracteres`)

if (dryRun) {
  console.log('[fb] --dry-run activo, no se llama a la API. Saliendo.')
  log(`DRY_RUN index=${nextIndex} enfoque="${variante.enfoque}"`)
  process.exit(0)
}

// ── 6. Buscar y descargar imagen en Unsplash (opcional) ──────
let imageBuffer = null
let imageMeta = null
const unsplashKey = process.env.UNSPLASH_ACCESS_KEY?.trim()
if (noImage) {
  console.log('[fb] --no-image activo → posteo text-only a /feed')
} else if (!unsplashKey) {
  console.log('[fb] UNSPLASH_ACCESS_KEY no seteada → posteo text-only a /feed')
} else {
  const theme = VARIANT_THEMES[variante.id] || 'general'
  const query = THEMES[theme] || THEMES.general
  console.log(`[fb] Unsplash: tema="${theme}" query="${query}"`)
  try {
    const photo = await searchUnsplash(query, unsplashKey)
    if (!photo) {
      console.warn('[fb]   ⚠ sin resultados, fallback a text-only')
      log(`WARN unsplash_no_results query="${query}"`)
    } else {
      imageBuffer = await downloadImage(photo.urls.regular)
      imageMeta = {
        query,
        theme,
        photo_id: photo.id,
        photo_url: photo.urls.regular,
        photographer: photo.user?.name || null,
        photographer_url: photo.user?.links?.html || null,
        alt: photo.alt_description || null,
      }
      console.log(`[fb]   ✓ "${photo.alt_description || photo.id}" by ${photo.user?.name} (${imageBuffer.length} bytes)`)
    }
  } catch (e) {
    console.warn(`[fb]   ⚠ Unsplash falló: ${e.message}. Fallback a text-only.`)
    log(`WARN unsplash_failed msg="${e.message}"`)
    imageBuffer = null
    imageMeta = null
  }
}

// ── 7. POST to Graph API (/photos si hay imagen, /feed si no) ──
const endpoint = imageBuffer ? 'photos' : 'feed'
const fbUrl = `https://graph.facebook.com/${API_VERSION}/${PAGE_ID}/${endpoint}`

const t0 = Date.now()
let res
try {
  if (imageBuffer) {
    const fd = new FormData()
    fd.append('caption', variante.texto)
    fd.append('access_token', PAGE_TOKEN)
    fd.append('source', new Blob([imageBuffer], { type: 'image/jpeg' }), 'merkao.jpg')
    res = await fetch(fbUrl, { method: 'POST', body: fd })
  } else {
    const u = new URL(fbUrl)
    u.searchParams.set('message', variante.texto)
    u.searchParams.set('access_token', PAGE_TOKEN)
    res = await fetch(u, { method: 'POST' })
  }
} catch (e) {
  log(`ERROR network endpoint=${endpoint} index=${nextIndex} msg="${e.message}"`)
  bail(`Network error a Graph API (${endpoint}): ${e.message}`)
}
const elapsed = Date.now() - t0
const data = await res.json().catch(() => ({}))

// /photos devuelve { id (photoId), post_id (feed post) }. /feed devuelve { id (feed post) }.
const photoId = endpoint === 'photos' ? data.id : null
const postIdRaw = data.post_id || data.id
if (!res.ok || !postIdRaw) {
  const errMsg = data?.error?.message || JSON.stringify(data).slice(0, 300)
  log(`ERROR api endpoint=${endpoint} status=${res.status} index=${nextIndex} msg="${errMsg}"`)
  console.error(`[fb] ✗ Graph API ${res.status} (${endpoint}):`, errMsg)
  if (data?.error?.code === 190) {
    console.error('   → Code 190 = token expirado o inválido. Volvé a correr get-token.mjs')
  }
  process.exit(1)
}

const postIdOnly = postIdRaw.includes('_') ? postIdRaw.split('_')[1] : postIdRaw
const postUrl = `https://www.facebook.com/${PAGE_ID}/posts/${postIdOnly}`

console.log(`[fb] ✓ publicado (${endpoint}) en ${elapsed}ms`)
console.log(`[fb]   id: ${postIdRaw}${photoId ? ` (photo: ${photoId})` : ''}`)
console.log(`[fb]   url: ${postUrl}`)

// ── 8. Persist state + log ────────────────────────────────────
const histEntry = {
  fecha: new Date().toISOString(),
  fechaPeru: todayPeru,
  variantIndex: nextIndex,
  variantId: variante.id,
  enfoque: variante.enfoque,
  endpoint,
  fbPostId: postIdRaw,
  fbPhotoId: photoId,
  url: postUrl,
  image: imageMeta, // null si fue text-only
}
const newState = {
  lastIndex: nextIndex,
  lastPostedDate: todayPeru,
  totalPosts: (state.totalPosts || 0) + 1,
  history: [...(state.history || []), histEntry].slice(-50),
}
writeFileSync(STATE_PATH, JSON.stringify(newState, null, 2), 'utf8')
log(
  `OK endpoint=${endpoint} index=${nextIndex} enfoque="${variante.enfoque}" ` +
  `fb_id=${postIdRaw} image=${imageMeta?.photo_id || 'none'} url=${postUrl} ms=${elapsed}`,
)
console.log(`[fb] state.json actualizado. Total publicaciones: ${newState.totalPosts}`)

// ──────────────────────────────────────────────────────────────
function parseEnv(text) {
  const out = {}
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}

function dateInTz(d, tz) {
  // YYYY-MM-DD en la zona indicada
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
  return parts // "2026-06-07"
}

function log(msg) {
  const ts = new Date().toISOString()
  try {
    appendFileSync(LOG_PATH, `${ts}  ${msg}\n`, 'utf8')
  } catch (e) {
    console.warn('[fb] no se pudo escribir fb-posts.log:', e.message)
  }
}

function bail(msg) {
  console.error('ERROR:', msg)
  log(`ERROR_BAIL msg="${msg}"`)
  process.exit(1)
}

// Busca en Unsplash y devuelve UNA foto al azar entre los primeros resultados.
// Devuelve null si no hay resultados; throws si la API responde !ok.
async function searchUnsplash(query, accessKey) {
  const u = new URL('https://api.unsplash.com/search/photos')
  u.searchParams.set('query', query)
  u.searchParams.set('per_page', '20')
  u.searchParams.set('orientation', 'landscape')
  u.searchParams.set('content_filter', 'high')
  const r = await fetch(u, {
    headers: { Authorization: `Client-ID ${accessKey}`, 'Accept-Version': 'v1' },
  })
  if (!r.ok) {
    const body = await r.text().catch(() => '')
    throw new Error(`Unsplash ${r.status}: ${body.slice(0, 200)}`)
  }
  const j = await r.json()
  const results = Array.isArray(j?.results) ? j.results : []
  if (results.length === 0) return null
  return results[Math.floor(Math.random() * results.length)]
}

// Descarga la imagen al heap como Buffer. FB acepta JPEG/PNG, Unsplash
// devuelve JPEG cuando pedís ?auto=format con `urls.regular`.
async function downloadImage(url) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`download ${r.status} url=${url}`)
  const ab = await r.arrayBuffer()
  return Buffer.from(ab)
}
