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

// ── 1. Parse args ─────────────────────────────────────────────
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const force = args.includes('--force')
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

// ── 6. POST to Graph API ──────────────────────────────────────
const url = new URL(`https://graph.facebook.com/${API_VERSION}/${PAGE_ID}/feed`)
url.searchParams.set('message', variante.texto)
url.searchParams.set('access_token', PAGE_TOKEN)

const t0 = Date.now()
let res
try {
  res = await fetch(url, { method: 'POST' })
} catch (e) {
  log(`ERROR network index=${nextIndex} msg="${e.message}"`)
  bail(`Network error a Graph API: ${e.message}`)
}
const elapsed = Date.now() - t0
const data = await res.json().catch(() => ({}))

if (!res.ok || !data.id) {
  const errMsg = data?.error?.message || JSON.stringify(data).slice(0, 300)
  log(`ERROR api status=${res.status} index=${nextIndex} msg="${errMsg}"`)
  console.error(`[fb] ✗ Graph API ${res.status}:`, errMsg)
  if (data?.error?.code === 190) {
    console.error('   → Code 190 = token expirado o inválido. Volvé a correr get-token.mjs')
  }
  process.exit(1)
}

const fbPostId = data.id // formato: "pageId_postId"
const postIdOnly = fbPostId.includes('_') ? fbPostId.split('_')[1] : fbPostId
const postUrl = `https://www.facebook.com/${PAGE_ID}/posts/${postIdOnly}`

console.log(`[fb] ✓ publicado en ${elapsed}ms`)
console.log(`[fb]   id: ${fbPostId}`)
console.log(`[fb]   url: ${postUrl}`)

// ── 7. Persist state + log ────────────────────────────────────
const histEntry = {
  fecha: new Date().toISOString(),
  fechaPeru: todayPeru,
  variantIndex: nextIndex,
  variantId: variante.id,
  enfoque: variante.enfoque,
  fbPostId,
  url: postUrl,
}
const newState = {
  lastIndex: nextIndex,
  lastPostedDate: todayPeru,
  totalPosts: (state.totalPosts || 0) + 1,
  history: [...(state.history || []), histEntry].slice(-50),
}
writeFileSync(STATE_PATH, JSON.stringify(newState, null, 2), 'utf8')
log(
  `OK index=${nextIndex} enfoque="${variante.enfoque}" fb_id=${fbPostId} url=${postUrl} ms=${elapsed}`,
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
