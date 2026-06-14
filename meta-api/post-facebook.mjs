#!/usr/bin/env node
// post-facebook.mjs — Publica 1 variante por día en la Page de Merkao
// (Facebook) y en @merkao_marketplace (Instagram) si está configurada.
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
//   --dry-run        muestra qué publicaría pero no llama a la API
//   --force          ignora la guarda de "ya posteó hoy"
//   --index=N        fuerza una variante específica (0-based)
//   --no-image       saltar Unsplash, postear text-only a /feed (FB)
//   --no-instagram   no publicar en Instagram aunque esté configurada
//
// Imagen: si UNSPLASH_ACCESS_KEY está seteada (.env o GitHub secret), busca
// una foto landscape en Unsplash según el tema de la variante (VARIANT_THEMES
// abajo) y la sube como /photos con caption. Si Unsplash falla o no hay
// access key, hace fallback a /feed text-only sin romper el cron.
//
// Instagram: si META_IG_BUSINESS_ACCOUNT_ID está seteada Y hay imagen,
// publica también en @merkao_marketplace (mismo texto + imagen + hashtags
// peruanos). IG no permite posts text-only por API → si Unsplash falló o
// se usó --no-image, IG se salta. Falla en IG NO interrumpe el flujo: FB
// ya quedó publicado y mañana se rota igual.

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
// Cada tema tiene un fallback chain de queries en orden de preferencia.
// Algunas en español tienen 0 fotos en Unsplash (catálogo en inglés mayoritario),
// así que después de la spec original viene una variante en inglés que sí
// devuelve resultados. searchUnsplash() prueba en orden hasta encontrar fotos.
const THEMES = {
  alimentos: ['mercado peruano frutas', 'peruvian market fruits', 'mercado peru', 'amazon rainforest fruits'],
  artesania: ['tejidos cusco peru', 'weaving peru', 'cusco textiles', 'peruvian handicrafts'],
  moda:      ['ropa colorida peru', 'peruvian textiles', 'andean clothing'],
  cafe:      ['cafe peru plantacion', 'coffee plantation peru', 'cacao plantation'],
  general:   ['paisaje peru', 'peru landscape', 'machu picchu peru'],
}

// ── Instagram ─────────────────────────────────────────────────
// Hashtags peruanos que se append-ean SOLO al caption de Instagram (no
// se ensucia el copy de Facebook). Si querés cambiarlos, editá acá.
const IG_HASHTAGS = '#merkao #marketplaceperuano #hechoenperu #emprendedoresperuanos #peruano'

// ── 1. Parse args ─────────────────────────────────────────────
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const force = args.includes('--force')
const noImage = args.includes('--no-image')
const noInstagram = args.includes('--no-instagram')
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
const IG_USER_ID = process.env.META_IG_BUSINESS_ACCOUNT_ID?.trim() || null
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
  const queries = THEMES[theme] || THEMES.general
  console.log(`[fb] Unsplash: tema="${theme}" queries=${JSON.stringify(queries)}`)
  try {
    const { photo, query } = await searchUnsplash(queries, unsplashKey)
    if (!photo) {
      console.warn('[fb]   ⚠ sin resultados en ninguna query, fallback a text-only')
      log(`WARN unsplash_no_results theme="${theme}"`)
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

// ── 8. Publicar en Instagram (si está configurada y hay imagen) ─
// IG no acepta posts text-only por API. Si no hay imageMeta (Unsplash falló
// o --no-image), se salta IG sin marcarlo como error. La falla en IG NO
// detiene el flujo: el post de FB ya está publicado.
let igResult = null
if (noInstagram) {
  console.log('[ig] --no-instagram activo → skip')
} else if (!IG_USER_ID) {
  console.log('[ig] META_IG_BUSINESS_ACCOUNT_ID no seteada → skip')
} else if (!imageMeta) {
  console.log('[ig] sin imagen disponible → IG requiere imagen, skip')
} else {
  const igCaption = `${variante.texto}\n\n${IG_HASHTAGS}`
  console.log(`[ig] Publicando en @merkao_marketplace (ig_user=${IG_USER_ID})…`)
  console.log(`[ig]   caption: ${igCaption.length} chars (texto + hashtags)`)
  try {
    igResult = await postToInstagram({
      igUserId: IG_USER_ID,
      pageToken: PAGE_TOKEN,
      imageUrl: imageMeta.photo_url,
      caption: igCaption,
    })
    console.log(`[ig] ✓ publicado en ${igResult.elapsedMs}ms`)
    console.log(`[ig]   media id: ${igResult.mediaId}${igResult.permalink ? ` · ${igResult.permalink}` : ''}`)
    log(
      `OK_IG media_id=${igResult.mediaId} container=${igResult.containerId} ` +
      `ms=${igResult.elapsedMs}`,
    )
  } catch (e) {
    igResult = { error: e.message }
    console.warn(`[ig] ✗ falló: ${e.message}`)
    log(`ERROR_IG msg="${e.message}"`)
    // No salimos: FB ya quedó publicado y mañana rota igual.
  }
}

// ── 9. Persist state + log ────────────────────────────────────
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
  ig: igResult, // { mediaId, containerId, permalink, elapsedMs } | { error } | null si skip
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

// Prueba cada query del array en orden y devuelve la PRIMERA con resultados,
// eligiendo UNA foto al azar entre los primeros 20. Devuelve { photo, query }
// donde photo === null si todas las queries quedaron en 0 resultados.
// throws si la API responde !ok (no quota, rate limit, key inválida).
async function searchUnsplash(queries, accessKey) {
  const arr = Array.isArray(queries) ? queries : [queries]
  for (const query of arr) {
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
    if (results.length > 0) {
      return { photo: results[Math.floor(Math.random() * results.length)], query }
    }
    console.log(`[fb]   query "${query}" → 0 resultados, probando siguiente…`)
  }
  return { photo: null, query: null }
}

// Descarga la imagen al heap como Buffer. FB acepta JPEG/PNG, Unsplash
// devuelve JPEG cuando pedís ?auto=format con `urls.regular`.
async function downloadImage(url) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`download ${r.status} url=${url}`)
  const ab = await r.arrayBuffer()
  return Buffer.from(ab)
}

// Publica una imagen en Instagram via Graph API en 2 pasos:
//   1) POST /{ig_user}/media con image_url + caption → creation_id (container)
//   2) Poll del container hasta status_code=FINISHED (suele tardar <2s para
//      imágenes; carrouseles y videos pueden tardar más).
//   3) POST /{ig_user}/media_publish con creation_id → media id final.
// Devuelve { mediaId, containerId, permalink, elapsedMs }. Throws en error.
// Docs: https://developers.facebook.com/docs/instagram-api/guides/content-publishing
async function postToInstagram({ igUserId, pageToken, imageUrl, caption }) {
  const t0 = Date.now()

  // (1) Crear container
  const containerUrl = new URL(`https://graph.facebook.com/${API_VERSION}/${igUserId}/media`)
  containerUrl.searchParams.set('image_url', imageUrl)
  containerUrl.searchParams.set('caption', caption)
  containerUrl.searchParams.set('access_token', pageToken)
  const containerRes = await fetch(containerUrl, { method: 'POST' })
  const containerData = await containerRes.json().catch(() => ({}))
  if (!containerRes.ok || !containerData.id) {
    const m = containerData?.error?.message || JSON.stringify(containerData).slice(0, 300)
    throw new Error(`container ${containerRes.status}: ${m}`)
  }
  const containerId = containerData.id

  // (2) Esperar status_code=FINISHED (recomendado por docs antes de publish)
  await waitForIgContainerReady(containerId, pageToken)

  // (3) Publicar
  const publishUrl = new URL(`https://graph.facebook.com/${API_VERSION}/${igUserId}/media_publish`)
  publishUrl.searchParams.set('creation_id', containerId)
  publishUrl.searchParams.set('access_token', pageToken)
  const publishRes = await fetch(publishUrl, { method: 'POST' })
  const publishData = await publishRes.json().catch(() => ({}))
  if (!publishRes.ok || !publishData.id) {
    const m = publishData?.error?.message || JSON.stringify(publishData).slice(0, 300)
    throw new Error(`publish ${publishRes.status}: ${m}`)
  }
  const mediaId = publishData.id

  // Permalink es opcional; si falla no rompemos.
  let permalink = null
  try {
    const permUrl = new URL(`https://graph.facebook.com/${API_VERSION}/${mediaId}`)
    permUrl.searchParams.set('fields', 'permalink')
    permUrl.searchParams.set('access_token', pageToken)
    const r = await fetch(permUrl)
    const j = await r.json()
    if (r.ok && j.permalink) permalink = j.permalink
  } catch {
    // ignore
  }

  return { mediaId, containerId, permalink, elapsedMs: Date.now() - t0 }
}

// Polleá status_code del container hasta FINISHED. Para imágenes single
// suele estar listo en el primer poll; carrouseles/videos pueden tardar.
// Docs recomiendan no más de 5 polls/min — usamos 5 intentos con backoff
// progresivo (1s, 2s, 3s, 4s, 5s) = ~15s máx.
async function waitForIgContainerReady(containerId, pageToken, maxAttempts = 5) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const u = new URL(`https://graph.facebook.com/${API_VERSION}/${containerId}`)
    u.searchParams.set('fields', 'status_code,status')
    u.searchParams.set('access_token', pageToken)
    const r = await fetch(u)
    const j = await r.json().catch(() => ({}))
    if (!r.ok) {
      throw new Error(`status check ${r.status}: ${j?.error?.message || JSON.stringify(j).slice(0, 200)}`)
    }
    if (j.status_code === 'FINISHED') return
    if (j.status_code === 'ERROR' || j.status_code === 'EXPIRED') {
      throw new Error(`container status=${j.status_code} status="${j.status || ''}"`)
    }
    // IN_PROGRESS o PUBLISHED → seguir polleando (PUBLISHED no debería pasar acá)
    await new Promise((res) => setTimeout(res, attempt * 1000))
  }
  throw new Error('container no llegó a FINISHED en 5 intentos (~15s)')
}
