#!/usr/bin/env node
// create-reel.mjs — Genera y publica un Reel diario en IG + FB de Merkao.
//
// Pipeline:
//   1. Producto random de Supabase (mismo schema que post-facebook.mjs)
//   2. Descarga imagen del producto
//   3. ffmpeg → video 1080x1920 15s
//        - Ken Burns zoom (zoompan)
//        - Nombre producto (top band)
//        - Ciudad + precio (bottom band, orange)
//        - Logo overlay (si existe assets/logo.png)
//        - Audio: assets/bgm.mp3 si existe, sino silencio
//   4. IG Reel: resumable upload → graph.instagram.com → media_publish
//   5. FB Reel: chunked upload → /video_reels (start/upload/finish)
//
// State propio en reel-state.json. Idempotente por día (TZ America/Lima).
// Mismo workflow que post-facebook.mjs pero step separado.
//
// Flags:
//   --dry-run        genera el video pero NO sube (queda en --keep-video path)
//   --force          ignora la guarda "ya posteó hoy"
//   --no-instagram   skip IG (testear solo FB)
//   --no-facebook    skip FB (testear solo IG)
//   --keep-video     no borra el .mp4 generado (debug)
//   --video=PATH     usar un .mp4 existente en vez de generar uno nuevo
//
// Env:
//   SUPABASE_URL, SUPABASE_ANON_KEY              productos
//   META_PAGE_ID, META_PAGE_ACCESS_TOKEN         FB Reel
//   META_IG_USER_ID, META_IG_ACCESS_TOKEN        IG Reel
//   FFMPEG_PATH                                  override del binario (opcional)

import {
  readFileSync,
  writeFileSync,
  existsSync,
  appendFileSync,
  statSync,
  mkdirSync,
  unlinkSync,
  readdirSync,
} from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn, spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ENV_PATH = resolve(__dirname, '.env')
const STATE_PATH = resolve(__dirname, 'reel-state.json')
const LOG_PATH = resolve(__dirname, 'reel-posts.log')
const ASSETS_DIR = resolve(__dirname, 'assets')
const LOGO_PATH = join(ASSETS_DIR, 'logo.png')
const BGM_PATH = join(ASSETS_DIR, 'bgm.mp3')

const IG_API_VERSION = 'v22.0'
const FB_API_VERSION = 'v21.0'
const TIMEZONE = 'America/Lima'
const VIDEO_W = 1080
const VIDEO_H = 1920
const VIDEO_FPS = 30
const VIDEO_DURATION = 15

const IG_HASHTAGS = '#merkao #marketplaceperuano #hechoenperu #emprendedoresperuanos #peruano'
const MAX_IMAGES_PER_REEL = 4 // 4 × 3.75s = 15s con xfade 0.5s
const XFADE_DUR = 0.5
// Constants para cleanProductName/buildUnsplashQueryChain — declaradas acá
// arriba (no abajo con los helpers) para evitar TDZ desde el top-level await.
const STOP_WORDS = new Set([
  'de','con','para','y','o','el','la','los','las','un','una','del','al',
  'en','tela','sin','por','que','su','sus','este','esta',
])
const ES_EN_MAP = {
  chompa: 'sweater',
  vestido: 'dress',
  polo: 'tshirt',
  quinua: 'quinoa',
  cafe: 'coffee',
  café: 'coffee',
  laptop: 'laptop',
  llantas: 'tires',
  cuadro: 'painting',
  sofa: 'sofa',
  sofá: 'sofa',
  mesa: 'table',
  silla: 'chair',
  zapatos: 'shoes',
  cocina: 'kitchen',
  bicicleta: 'bicycle',
  reloj: 'watch',
  pisco: 'pisco',
  ceviche: 'ceviche',
}
// Queries contextuales por categoría: muestran al PRODUCTO EN SU CONTEXTO real
// (artesana tejiendo, agricultor cosechando, mercado) en vez del producto
// aislado. Mucho más cinematográfico y on-brand para marketplace peruano.
// Lookup por primera palabra del nombre (en español o equivalente inglés).
//
// IMPORTANTE: si la primera palabra del nombre del producto no está acá,
// el producto se SALTA — no usamos paisajes genéricos. Para sumar productos
// nuevos, agregar entrada con queries que mencionen explícitamente
// el producto (las fotos luego se filtran por presencia de keywords).
const CONTEXT_QUERIES = {
  // Granos / alimentos andinos
  quinua: ['quinoa harvest andes peru', 'quinoa farmer field'],
  quinoa: ['quinoa harvest andes peru', 'quinoa farmer field'],
  cacao: ['cacao harvest peru farmer', 'cacao plantation'],
  cafe: ['coffee harvest peru farmer', 'coffee plantation'],
  café: ['coffee harvest peru farmer', 'coffee plantation'],
  coffee: ['coffee harvest peru farmer', 'coffee plantation'],
  maca: ['andes farm peru', 'peruvian highland farmer'],
  // Textiles / ropa tradicional
  vestido: ['peruvian textile artisan weaving', 'andean clothing tradition'],
  chompa: ['alpaca wool knitting peru', 'andean wool textile artisan'],
  sweater: ['alpaca wool knitting peru', 'andean wool textile artisan'],
  alpaca: ['alpaca peru andes wool farm'],
  tejido: ['peruvian textile loom artisan', 'andean weaving'],
  polo: ['cotton textile artisan', 'peruvian artisan workshop'],
  chullo: ['andean chullo hat wool', 'peruvian knitted hat'],
  poncho: ['andean poncho traditional wool', 'peruvian poncho textile'],
  // Arte / artesanías
  cuadro: ['peruvian art painting artisan', 'andean folk art'],
  shipibo: ['shipibo art amazon peru', 'amazon indigenous art'],
  ceramica: ['ceramic artisan pottery peru', 'pottery workshop hands'],
  cerámica: ['ceramic artisan pottery peru', 'pottery workshop hands'],
  retablo: ['peruvian retablo folk art', 'andean altarpiece painted'],
  mate: ['peruvian mate gourd carved', 'andean gourd artisan'],
  joya: ['peruvian silver jewelry handmade', 'silver craft jewelry'],
  joyeria: ['peruvian silver jewelry handmade', 'silver craft jewelry'],
  joyería: ['peruvian silver jewelry handmade', 'silver craft jewelry'],
  tumi: ['peruvian tumi knife silver', 'andean ceremonial silver'],
  bordado: ['peruvian embroidery textile', 'andean embroidered fabric'],
  // Bebidas peruanas
  pisco: ['pisco peruvian distillery', 'pisco grape vineyard peru'],
  chicha: ['chicha morada peru drink', 'peruvian corn drink'],
  // Comida peruana
  ceviche: ['peruvian food market vendor', 'lima food market'],
  aji: ['aji amarillo pepper peru', 'peruvian chili pepper'],
  ají: ['aji amarillo pepper peru', 'peruvian chili pepper'],
}

// Keywords adicionales por keyword del producto. La foto debe mencionar
// AL MENOS UNA en su alt_description o description para ser considerada
// relevante. Sin esto, Unsplash (OR-loose text search) devuelve cualquier
// foto que matchee un solo token — paisajes con tag "peru", etc.
const RELEVANCE_KEYWORDS = {
  quinua: ['quinoa', 'quinua', 'grain', 'cereal', 'harvest'],
  quinoa: ['quinoa', 'quinua', 'grain', 'cereal', 'harvest'],
  cacao: ['cacao', 'cocoa', 'bean', 'pod', 'chocolate'],
  cafe: ['coffee', 'cafe', 'café', 'bean', 'roast', 'cup', 'espresso'],
  café: ['coffee', 'cafe', 'café', 'bean', 'roast', 'cup', 'espresso'],
  vestido: ['dress', 'textile', 'weaving', 'embroider', 'fabric', 'cloth', 'woman wearing'],
  chompa: ['sweater', 'knit', 'wool', 'cardigan', 'jumper', 'chompa', 'alpaca'],
  alpaca: ['alpaca', 'llama', 'wool', 'andes', 'fleece'],
  tejido: ['weaving', 'loom', 'textile', 'knit', 'fabric'],
  polo: ['shirt', 'cotton', 'tshirt', 'textile', 'fabric'],
  chullo: ['chullo', 'hat', 'beanie', 'wool hat', 'knitted hat'],
  poncho: ['poncho', 'cape', 'wool', 'andean clothing'],
  cuadro: ['painting', 'artwork', 'canvas', 'art', 'mural', 'frame'],
  shipibo: ['shipibo', 'amazon', 'indigenous', 'tribal', 'amazonian'],
  ceramica: ['ceramic', 'pottery', 'clay', 'vase', 'pot', 'kiln'],
  cerámica: ['ceramic', 'pottery', 'clay', 'vase', 'pot', 'kiln'],
  retablo: ['retablo', 'altarpiece', 'folk art', 'painted box', 'shrine'],
  mate: ['gourd', 'mate', 'calabash', 'carved gourd'],
  joya: ['jewelry', 'jewellery', 'ring', 'necklace', 'silver', 'bracelet'],
  joyeria: ['jewelry', 'jewellery', 'ring', 'necklace', 'silver', 'bracelet'],
  joyería: ['jewelry', 'jewellery', 'ring', 'necklace', 'silver', 'bracelet'],
  tumi: ['tumi', 'knife', 'silver', 'ceremonial'],
  bordado: ['embroider', 'textile', 'fabric', 'stitching'],
  pisco: ['pisco', 'bottle', 'distillery', 'grape', 'liquor', 'spirit', 'cocktail'],
  chicha: ['chicha', 'corn drink', 'beverage', 'purple drink'],
  ceviche: ['ceviche', 'seafood', 'fish', 'lime', 'food market'],
  aji: ['pepper', 'chili', 'aji', 'spice'],
  ají: ['pepper', 'chili', 'aji', 'spice'],
}

// ── 1. Args ───────────────────────────────────────────────────
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const force = args.includes('--force')
const noIg = args.includes('--no-instagram')
const noFb = args.includes('--no-facebook')
const keepVideo = args.includes('--keep-video')
const videoArg = args.find((a) => a.startsWith('--video='))
const preExistingVideo = videoArg ? videoArg.split('=')[1] : null

// ── 2. .env (solo local; en CI vienen de process.env directo) ─
if (existsSync(ENV_PATH)) {
  const env = parseEnv(readFileSync(ENV_PATH, 'utf8'))
  for (const k of Object.keys(env)) if (!process.env[k]) process.env[k] = env[k]
}
// Strip ALL whitespace (incluyendo \r\n embebidos) — pasa cuando un secret
// se pegó con line break en la UI de GitHub. Headers de fetch rechazan CR/LF.
const stripWs = (v) => v?.replace(/\s+/g, '') || undefined
const SUPABASE_URL = stripWs(process.env.SUPABASE_URL)
const SUPABASE_KEY = stripWs(process.env.SUPABASE_ANON_KEY)
const PAGE_ID = stripWs(process.env.META_PAGE_ID)
const PAGE_TOKEN = stripWs(process.env.META_PAGE_ACCESS_TOKEN)
const IG_USER = stripWs(process.env.META_IG_USER_ID)
const IG_TOKEN = stripWs(process.env.META_IG_ACCESS_TOKEN)
if (!preExistingVideo && (!SUPABASE_URL || !SUPABASE_KEY)) {
  bail('Faltan SUPABASE_URL o SUPABASE_ANON_KEY (necesarias para elegir producto)')
}

// ── 3. State + idempotencia ───────────────────────────────────
const state = existsSync(STATE_PATH)
  ? JSON.parse(readFileSync(STATE_PATH, 'utf8'))
  : { lastReelDate: null, totalReels: 0, history: [] }
const todayPeru = dateInTz(new Date(), TIMEZONE)
if (state.lastReelDate === todayPeru && !force) {
  console.log(`[reel] ya se posteó reel hoy (${todayPeru}). --force para forzar.`)
  log(`SKIP today_already_posted date=${todayPeru}`)
  process.exit(0)
}

// ── 4. ffmpeg ──────────────────────────────────────────────────
const FFMPEG = findFfmpeg()
console.log(`[reel] usando ffmpeg: ${FFMPEG === 'ffmpeg' ? '(PATH)' : FFMPEG}`)

// ── 5. Producto + imagen ──────────────────────────────────────
let product = null
let videoPath = preExistingVideo
let imagePath = null
let tmpDir = null

let imagePaths = []
let voicePath = null
let unsplashMeta = null

if (preExistingVideo) {
  if (!existsSync(preExistingVideo)) bail(`--video file no existe: ${preExistingVideo}`)
  console.log(`[reel] usando video pre-existente: ${preExistingVideo}`)
  product = { id: null, nombre: 'Merkao', ciudad: null, precio: null, imagenes: [] }
} else {
  console.log('[reel] (1/6) Productos candidatos de Supabase…')
  const candidates = await fetchProductCandidates(SUPABASE_URL, SUPABASE_KEY)
  if (candidates.length === 0) bail('Sin productos activos en Supabase')
  console.log(`[reel]     ${candidates.length} candidatos shuffled`)

  tmpDir = resolve(tmpdir(), 'merkao-reel-' + Date.now())
  mkdirSync(tmpDir, { recursive: true })

  // Estrategia v3 (regla del usuario): NO usar paisajes genéricos.
  //   (a) Si el producto tiene imágenes REALES (no picsum/placeholder),
  //       usarlas directo — son las del vendedor.
  //   (b) Si solo tiene placeholders, buscar en Unsplash con queries
  //       ESTRICTAS (context queries o nombre+peru con ≥2 palabras).
  //       Si Unsplash no devuelve nada en queries estrictas → SKIP el
  //       producto y probar el siguiente (NO caer a fallbacks genéricos).
  //   (c) Si tras N intentos ningún producto pasa los filtros, error.
  // Los candidatos vienen ordenados con productos reales PRIMERO.
  const UNSPLASH_KEY = stripWs(process.env.UNSPLASH_ACCESS_KEY)
  console.log('[reel] (2/6) Seleccionando imágenes (real-first, strict-match)…')

  const MAX_ATTEMPTS = Math.min(candidates.length, 10)
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const cand = candidates[attempt]
    const hasReal = cand.realImageUrls.length > 0
    console.log(
      `[reel]   intento ${attempt + 1}/${MAX_ATTEMPTS}: "${cand.nombre}"` +
        (cand.ciudad ? ` · ${cand.ciudad}` : '') +
        ` · ${hasReal ? `${cand.realImageUrls.length} imagen(es) REAL(es)` : 'solo placeholders'}`,
    )

    let paths = []
    let sourceUsed = null

    // (a) Imágenes reales del vendedor — prioridad absoluta
    if (hasReal) {
      paths = await downloadUrlList(cand.realImageUrls, tmpDir, 'product')
      if (paths.length > 0) sourceUsed = 'supabase_real'
      else console.log('[reel]     ✗ imágenes reales no descargaron, probando Unsplash…')
    }

    // (b) Unsplash STRICT — solo si no hay reales o reales fallaron
    if (paths.length === 0 && UNSPLASH_KEY) {
      try {
        const found = await findUnsplashImagesForProduct(cand, UNSPLASH_KEY, 3)
        if (found && found.photos.length > 0) {
          paths = await downloadUnsplashPhotos(found.photos, tmpDir)
          if (paths.length > 0) {
            unsplashMeta = {
              query: found.query,
              photo_ids: found.photos.map((p) => p.id),
              photographers: found.photos.map((p) => p.user?.name || null),
            }
            sourceUsed = `unsplash:${found.query}`
            console.log(`[reel]     ✓ Unsplash estricto "${found.query}" → ${paths.length} imgs`)
          }
        } else {
          console.log(
            '[reel]     ✗ Unsplash sin match estricto para este producto, skip',
          )
        }
      } catch (e) {
        console.warn(`[reel]     ⚠ Unsplash error: ${e.message}`)
      }
    }

    if (paths.length > 0) {
      product = cand
      imagePaths = paths
      console.log(`[reel]     ✓ usando ${sourceUsed} (${paths.length} imgs)`)
      break
    }
    console.log('[reel]   ✗ sin imágenes que correspondan al producto, siguiente…')
  }
  if (!product) {
    bail(
      'Ningún producto pasó los filtros tras ' +
        MAX_ATTEMPTS +
        ' intentos. ' +
        'Verificar que existan productos en Supabase con imágenes reales O ' +
        'productos cuyo nombre matchee CONTEXT_QUERIES (chompa, vestido, ' +
        'quinua, cafe, pisco, etc).',
    )
  }

  console.log(
    `[reel]     ✓ producto final: "${product.nombre}"` +
      (product.ciudad ? ` · ${product.ciudad}` : '') +
      ` · S/ ${product.precio?.toFixed(2) ?? '?'}` +
      ` · ${imagePaths.length} imagen(es)`,
  )

  // (3) Voz: TTS del anuncio del producto
  console.log('[reel] (3/6) Generando voz del anuncio…')
  voicePath = join(tmpDir, 'voice.mp3')
  const voiceText = buildVoiceoverText(product)
  console.log(`[reel]     texto (${voiceText.length} chars): "${voiceText.slice(0, 70)}…"`)
  try {
    const provider = await generateVoiceover(voiceText, voicePath)
    console.log(`[reel]     ✓ voz generada (${provider}, ${statSync(voicePath).size} bytes)`)
  } catch (e) {
    console.warn(`[reel]     ⚠ TTS falló: ${e.message} — sigo sin voz`)
    voicePath = null
  }

  videoPath = join(tmpDir, 'reel.mp4')
  console.log(`[reel] (4/6) ffmpeg → ${videoPath}`)
  const t0 = Date.now()
  await generateReel({ imagePaths, voicePath, videoPath, product, tmpDir })
  console.log(`[reel]     ✓ ${statSync(videoPath).size} bytes en ${Date.now() - t0}ms`)
}

if (dryRun) {
  console.log('[reel] --dry-run → no se sube. Video en:', videoPath)
  log(`DRY_RUN video=${videoPath} product=${product.id || 'preexisting'}`)
  process.exit(0)
}

// ── 6. IG Reel ─────────────────────────────────────────────────
let igResult = null
if (noIg) {
  console.log('[reel] (5/6) IG --no-instagram → skip')
} else if (!IG_USER || !IG_TOKEN) {
  console.log('[reel] (5/6) IG: META_IG_USER_ID/ACCESS_TOKEN no seteadas → skip')
} else {
  const caption = buildCaption(product, { hashtags: true })
  console.log(`[reel] (5/6) IG: subiendo ${statSync(videoPath).size} bytes como REEL…`)
  try {
    igResult = await publishIgReel({
      userId: IG_USER,
      token: IG_TOKEN,
      videoPath,
      caption,
    })
    console.log(
      `[reel]     ✓ IG media=${igResult.mediaId}` +
        (igResult.permalink ? ` · ${igResult.permalink}` : ''),
    )
    log(`OK_IG media=${igResult.mediaId} container=${igResult.containerId} ms=${igResult.elapsedMs}`)
  } catch (e) {
    igResult = { error: e.message }
    console.warn(`[reel]     ✗ IG falló: ${e.message}`)
    log(`ERROR_IG msg="${e.message}"`)
  }
}

// ── 7. FB Reel ─────────────────────────────────────────────────
let fbResult = null
if (noFb) {
  console.log('[reel] (6/6) FB --no-facebook → skip')
} else if (!PAGE_ID || !PAGE_TOKEN) {
  console.log('[reel] (6/6) FB: META_PAGE_ID/ACCESS_TOKEN no seteadas → skip')
} else {
  const description = buildCaption(product, { hashtags: false })
  console.log(`[reel] (6/6) FB: subiendo ${statSync(videoPath).size} bytes como Reel…`)
  try {
    fbResult = await publishFbReel({
      pageId: PAGE_ID,
      token: PAGE_TOKEN,
      videoPath,
      description,
    })
    console.log(
      `[reel]     ✓ FB video_id=${fbResult.videoId}` +
        (fbResult.permalink ? ` · ${fbResult.permalink}` : ''),
    )
    log(`OK_FB video_id=${fbResult.videoId} ms=${fbResult.elapsedMs}`)
  } catch (e) {
    fbResult = { error: e.message }
    console.warn(`[reel]     ✗ FB falló: ${e.message}`)
    log(`ERROR_FB msg="${e.message}"`)
  }
}

// ── 8. Persist state + cleanup ─────────────────────────────────
const histEntry = {
  fecha: new Date().toISOString(),
  fechaPeru: todayPeru,
  product: {
    id: product.id,
    nombre: product.nombre,
    ciudad: product.ciudad,
    precio: product.precio,
  },
  ig: igResult,
  fb: fbResult,
}
const newState = {
  lastReelDate: todayPeru,
  totalReels: (state.totalReels || 0) + 1,
  history: [...(state.history || []), histEntry].slice(-50),
}
writeFileSync(STATE_PATH, JSON.stringify(newState, null, 2), 'utf8')

if (!keepVideo && tmpDir) {
  try {
    if (videoPath && existsSync(videoPath)) unlinkSync(videoPath)
    if (voicePath && existsSync(voicePath)) unlinkSync(voicePath)
    for (const p of imagePaths) if (existsSync(p)) unlinkSync(p)
  } catch {}
}
console.log(`[reel] done. Total reels: ${newState.totalReels}`)

// ══════════════════════════════════════════════════════════════
//                       HELPERS
// ══════════════════════════════════════════════════════════════

function parseEnv(text) {
  const out = {}
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}

function dateInTz(d, tz) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function log(msg) {
  const ts = new Date().toISOString()
  try {
    appendFileSync(LOG_PATH, `${ts}  ${msg}\n`, 'utf8')
  } catch {}
}

function bail(msg) {
  console.error('ERROR:', msg)
  log(`ERROR_BAIL msg="${msg}"`)
  process.exit(1)
}

// ── ffmpeg discovery ──────────────────────────────────────────
function findFfmpeg() {
  if (process.env.FFMPEG_PATH && existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH
  }
  // PATH check
  const finder = process.platform === 'win32' ? 'where' : 'which'
  try {
    const r = spawnSync(finder, ['ffmpeg'], { stdio: 'pipe' })
    if (r.status === 0) return 'ffmpeg'
  } catch {}
  // Windows winget Gyan.FFmpeg
  if (process.platform === 'win32') {
    const home = process.env.USERPROFILE || process.env.HOME
    if (home) {
      const base = join(home, 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages')
      try {
        const dirs = readdirSync(base).filter((d) => /^Gyan\.FFmpeg/i.test(d))
        for (const d of dirs) {
          const sub = readdirSync(join(base, d)).filter((v) => /^ffmpeg.*build$/i.test(v))
          for (const v of sub) {
            const exe = join(base, d, v, 'bin', 'ffmpeg.exe')
            if (existsSync(exe)) return exe
          }
        }
      } catch {}
    }
    for (const p of ['C:\\ffmpeg\\bin\\ffmpeg.exe', 'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe']) {
      if (existsSync(p)) return p
    }
  }
  // Linux/Mac common
  for (const p of ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/opt/homebrew/bin/ffmpeg']) {
    if (existsSync(p)) return p
  }
  throw new Error(
    'ffmpeg no encontrado. Instalá con: winget install Gyan.FFmpeg (Windows) o apt install ffmpeg (Linux), o seteá FFMPEG_PATH',
  )
}

function findFont(bold) {
  const cands = bold
    ? [
        'C:\\Windows\\Fonts\\arialbd.ttf',
        'C:\\Windows\\Fonts\\segoeuib.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
        '/System/Library/Fonts/Helvetica.ttc',
      ]
    : [
        'C:\\Windows\\Fonts\\arial.ttf',
        'C:\\Windows\\Fonts\\segoeui.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
        '/System/Library/Fonts/Helvetica.ttc',
      ]
  for (const p of cands) if (existsSync(p)) return p
  throw new Error('No se encontró ninguna fuente del sistema para drawtext')
}

// ── Supabase ──────────────────────────────────────────────────
// Detecta URLs de placeholder (picsum.photos, placeholder.com, etc.). Estas
// imágenes no corresponden al producto real → no se deben usar para el reel.
function isPlaceholderUrl(url) {
  return /picsum\.photos|placeholder\.com|placehold\.co|via\.placeholder|dummyimage/i.test(
    url || '',
  )
}

// Trae todos los productos activos con imágenes y los devuelve ordenados:
// PRIMERO los que tienen imágenes reales subidas por el vendedor, DESPUÉS
// los que solo tienen placeholders (picsum). Esta prioridad implementa la
// regla del usuario: usar imágenes del vendedor cuando existan, y caer a
// Unsplash temático solo para productos sin foto real.
async function fetchProductCandidates(supabaseUrl, anonKey) {
  const u = new URL(supabaseUrl.replace(/\/+$/, '') + '/rest/v1/productos')
  u.searchParams.set('select', 'id,nombre,ciudad,precio,imagenes')
  u.searchParams.set('estado', 'eq.activo')
  u.searchParams.set('imagenes', 'not.is.null')
  u.searchParams.set('limit', '20')
  const r = await fetch(u, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  })
  if (!r.ok) {
    const body = await r.text().catch(() => '')
    throw new Error(`supabase ${r.status}: ${body.slice(0, 200)}`)
  }
  const rows = await r.json()
  const withImgs = (Array.isArray(rows) ? rows : []).filter(
    (p) => Array.isArray(p.imagenes) && p.imagenes.length > 0,
  )

  // Separar por tipo de imagen: reales (subidas por vendedor) vs placeholder.
  const real = []
  const placeholderOnly = []
  for (const p of withImgs) {
    const hasReal = p.imagenes.some((url) => !isPlaceholderUrl(url))
    ;(hasReal ? real : placeholderOnly).push(p)
  }
  // Shuffle dentro de cada grupo
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
  }
  shuffle(real)
  shuffle(placeholderOnly)

  console.log(
    `[reel]     ${real.length} con imagen real, ${placeholderOnly.length} solo placeholder`,
  )
  return [...real, ...placeholderOnly].map((p) => ({
    id: p.id,
    nombre: p.nombre,
    ciudad: p.ciudad,
    precio: typeof p.precio === 'number' ? p.precio : Number(p.precio) || null,
    imagenes: p.imagenes.slice(0, MAX_IMAGES_PER_REEL),
    realImageUrls: p.imagenes.filter((url) => !isPlaceholderUrl(url)).slice(0, MAX_IMAGES_PER_REEL),
  }))
}

// Descarga al disco. Throws con detalle si no es 200 o el body es chico/HTML
// (Supabase storage devuelve 200 con JSON de error a veces).
async function downloadTo(url, path) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url.slice(0, 80)}`)
  const ct = r.headers.get('content-type') || ''
  if (!/^image\//i.test(ct)) throw new Error(`content-type=${ct} url=${url.slice(0, 80)}`)
  const ab = await r.arrayBuffer()
  if (ab.byteLength < 500) throw new Error(`body=${ab.byteLength}B too small`)
  writeFileSync(path, Buffer.from(ab))
}

// Descarga una lista de URLs en orden. Cada URL → archivo local en tmpDir.
// Si una descarga falla, log warn y continúa con la siguiente. Devuelve los
// paths que sí descargaron.
async function downloadUrlList(urls, tmpDir, prefix) {
  const paths = []
  for (let i = 0; i < urls.length; i++) {
    const p = join(tmpDir, `${prefix}-${i}.jpg`)
    try {
      await downloadTo(urls[i], p)
      paths.push(p)
      console.log(`[reel]     ✓ ${prefix} ${i + 1}/${urls.length}: ${statSync(p).size}B`)
    } catch (e) {
      console.warn(`[reel]     ⚠ ${prefix} ${i + 1} falló: ${e.message}`)
    }
  }
  return paths
}

// ── ffmpeg video generation ───────────────────────────────────
// Diseño visual del Reel (1080x1920, 15s):
//   - N imágenes del producto (1..4) — cada una con su propio Ken Burns:
//     * pan random (UL→DR, UR→DL, etc) para que se sienta cinematográfico
//     * zoom suave 1.0 → 1.2 durante su slot
//     * transiciones xfade fade entre slots (0.5s overlap)
//   - Top band (0..380): #16202B 80% opacity, nombre producto
//   - Bottom band (1500..1920): #16202B 90% opacity, ciudad + precio
//   - Logo (si existe): 140x140 esquina top-right
//   - Audio: bgm.mp3 looped si existe, sino anullsrc (silencio)
async function generateReel({ imagePaths, voicePath, videoPath, product, tmpDir }) {
  const fontReg = findFont(false)
  const fontBold = findFont(true)

  const titleTxt = join(tmpDir, 'title.txt')
  const cityTxt = join(tmpDir, 'city.txt')
  const priceTxt = join(tmpDir, 'price.txt')
  writeFileSync(titleTxt, wrapText(product.nombre, 22), 'utf8')
  writeFileSync(cityTxt, product.ciudad || 'merkao.org', 'utf8')
  writeFileSync(
    priceTxt,
    product.precio != null ? `S/ ${product.precio.toFixed(2)}` : 'Disponible',
    'utf8',
  )

  const N = imagePaths.length
  if (N === 0) throw new Error('imagePaths vacío')

  // Cada slot dura V_slot = (15 + (N-1)*xfade) / N para que con xfade el total
  // dé exactamente 15s. Cada input necesita V_slot + xfade buffer al final.
  // Derivación: out_total = slot*N - xfade*(N-1) = 15 → slot = (15+xfade*(N-1))/N
  const slotDuration = (VIDEO_DURATION + XFADE_DUR * (N - 1)) / N
  const inputDuration = slotDuration + 0.2 // buffer chico
  console.log(`[reel]     N=${N} imágenes, slot=${slotDuration.toFixed(2)}s, xfade=${XFADE_DUR}s`)

  // Inputs: una entrada `-loop 1 -t T -i` por imagen, después logo, después audio
  const inputs = ['-y']
  const idx = { images: [] }
  for (const ip of imagePaths) {
    inputs.push('-framerate', String(VIDEO_FPS), '-loop', '1', '-t', String(inputDuration), '-i', ip)
    idx.images.push(idx.images.length)
  }
  let nextIdx = N

  const hasLogo = existsSync(LOGO_PATH)
  const hasBgm = existsSync(BGM_PATH)
  const hasVoice = voicePath && existsSync(voicePath)

  if (hasLogo) {
    inputs.push('-i', LOGO_PATH)
    idx.logo = nextIdx++
  }
  if (hasBgm) {
    inputs.push('-stream_loop', '-1', '-t', String(VIDEO_DURATION), '-i', BGM_PATH)
    idx.bgm = nextIdx++
  } else {
    inputs.push(
      '-f',
      'lavfi',
      '-t',
      String(VIDEO_DURATION),
      '-i',
      'anullsrc=channel_layout=stereo:sample_rate=44100',
    )
    idx.bgm = nextIdx++
  }
  if (hasVoice) {
    inputs.push('-i', voicePath)
    idx.voice = nextIdx++
  }

  // ── Filter chain ─────────────────────────────────────────────
  // Por cada imagen: scale+crop+zoompan con un patrón de pan distinto.
  // Patrones: 0=centro→zoom, 1=UL→DR, 2=UR→DL, 3=DL→UR
  // El frame total del zoompan es slotDuration*FPS frames.
  const chain = []
  const slotFrames = Math.round(slotDuration * VIDEO_FPS)

  for (let i = 0; i < N; i++) {
    const pattern = i % 4
    const zExpr = `min(1.0+on*${(0.2 / slotFrames).toFixed(6)},1.2)` // 1.0 → 1.2 lineal

    // x/y según patrón. on va de 0 a slotFrames. Movemos el viewport
    // mientras zoom va aumentando. ih,iw son las dims de la imagen ya escalada.
    let xExpr, yExpr
    if (pattern === 0) {
      // Center zoom
      xExpr = 'iw/2-(iw/zoom)/2'
      yExpr = 'ih/2-(ih/zoom)/2'
    } else if (pattern === 1) {
      // Upper-left → Down-right
      xExpr = `iw*0.1+on*${((0.4) / slotFrames).toFixed(6)}*iw - (iw/zoom)/2`
      yExpr = `ih*0.1+on*${((0.4) / slotFrames).toFixed(6)}*ih - (ih/zoom)/2`
    } else if (pattern === 2) {
      // Upper-right → Down-left
      xExpr = `iw*0.6-on*${((0.4) / slotFrames).toFixed(6)}*iw - (iw/zoom)/2 + iw*0.4`
      yExpr = `ih*0.1+on*${((0.4) / slotFrames).toFixed(6)}*ih - (ih/zoom)/2`
    } else {
      // Down-left → Up-right
      xExpr = `iw*0.1+on*${((0.4) / slotFrames).toFixed(6)}*iw - (iw/zoom)/2`
      yExpr = `ih*0.6-on*${((0.4) / slotFrames).toFixed(6)}*ih - (ih/zoom)/2 + ih*0.4`
    }

    chain.push(
      `[${idx.images[i]}:v]` +
        `scale=${VIDEO_W}:${VIDEO_H}:force_original_aspect_ratio=increase,` +
        `crop=${VIDEO_W}:${VIDEO_H},` +
        `zoompan=z='${zExpr}':x='${xExpr}':y='${yExpr}':` +
        `d=1:s=${VIDEO_W}x${VIDEO_H}:fps=${VIDEO_FPS},` +
        `trim=duration=${inputDuration},setpts=PTS-STARTPTS,` +
        `format=yuv420p` +
        `[v${i}]`,
    )
  }

  // xfade chain: encadena v0..vN-1 en cascadas
  let lastV
  if (N === 1) {
    lastV = 'v0'
  } else {
    // [v0][v1] xfade offset=slot duration=xfade → [vc1]
    // [vc1][v2] xfade offset=(slot*2 - xfade) duration=xfade → [vc2]
    // [vc(n-2)][v(n-1)] xfade offset=(slot*(N-1) - xfade*(N-2)) → [vcomp]
    let prevLabel = 'v0'
    for (let i = 1; i < N; i++) {
      // offset acumulado = slot*i - xfade*(i-1)
      const offset = slotDuration * i - XFADE_DUR * (i - 1)
      const out = i === N - 1 ? 'vcomp' : `vc${i}`
      chain.push(
        `[${prevLabel}][v${i}]xfade=transition=fade:duration=${XFADE_DUR}:offset=${offset.toFixed(3)}[${out}]`,
      )
      prevLabel = out
    }
    lastV = 'vcomp'
  }

  // Bandas + texto sobre el composite final
  chain.push(
    `[${lastV}]` +
      `drawbox=x=0:y=0:w=${VIDEO_W}:h=380:color=0x16202BCC:t=fill,` +
      `drawbox=x=0:y=1500:w=${VIDEO_W}:h=420:color=0x16202BE6:t=fill` +
      `[bands]`,
  )
  chain.push(
    `[bands]` +
      `drawtext=fontfile='${escapeFilterPath(fontBold)}':` +
      `textfile='${escapeFilterPath(titleTxt)}':` +
      `fontcolor=white:fontsize=58:line_spacing=12:` +
      `x=(w-text_w)/2:y=120` +
      `[t1]`,
  )
  chain.push(
    `[t1]` +
      `drawtext=fontfile='${escapeFilterPath(fontReg)}':` +
      `textfile='${escapeFilterPath(cityTxt)}':` +
      `fontcolor=0xF2700C:fontsize=58:` +
      `x=(w-text_w)/2:y=1540` +
      `[t2]`,
  )
  chain.push(
    `[t2]` +
      `drawtext=fontfile='${escapeFilterPath(fontBold)}':` +
      `textfile='${escapeFilterPath(priceTxt)}':` +
      `fontcolor=white:fontsize=130:` +
      `x=(w-text_w)/2:y=1640` +
      `[t3]`,
  )

  let finalV = 't3'
  if (hasLogo) {
    chain.push(`[${idx.logo}:v]scale=140:140[logo]`)
    chain.push(`[${finalV}][logo]overlay=W-w-40:40[outv]`)
    finalV = 'outv'
  } else {
    chain.push(`[${finalV}]null[outv]`)
    finalV = 'outv'
  }

  // ── Audio mix ────────────────────────────────────────────────
  // Sin voz: usar bgm directo (mapeo simple, sin filter graph)
  // Con voz: bajar bgm a 0.18, voz a 1.3 + atempo=1.15 (más alegre, sin
  //          cambiar el pitch), delay 0.6s, amix + trim a 15s.
  let audioMap
  if (hasVoice) {
    chain.push(`[${idx.bgm}:a]volume=0.18[bgmlow]`)
    chain.push(`[${idx.voice}:a]atempo=1.15,volume=1.3,adelay=600|600[vodel]`)
    chain.push(
      `[bgmlow][vodel]amix=inputs=2:duration=longest:dropout_transition=0,atrim=duration=${VIDEO_DURATION}[aout]`,
    )
    audioMap = '[aout]'
  } else {
    audioMap = `${idx.bgm}:a`
  }

  const filterFile = join(tmpDir, 'filter.txt')
  writeFileSync(filterFile, chain.join(';\n'), 'utf8')

  const ffArgs = [
    ...inputs,
    '-filter_complex_script',
    filterFile,
    '-map',
    '[outv]',
    '-map',
    audioMap,
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '23',
    '-pix_fmt',
    'yuv420p',
    '-profile:v',
    'high',
    '-level',
    '4.2',
    '-r',
    String(VIDEO_FPS),
    '-t',
    String(VIDEO_DURATION),
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-ar',
    '44100',
    '-ac',
    '2',
    '-movflags',
    '+faststart',
    '-shortest',
    videoPath,
  ]

  await runFfmpeg(FFMPEG, ffArgs)
}

function wrapText(s, maxCharsPerLine) {
  if (!s) return ''
  const words = String(s).split(/\s+/)
  const lines = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxCharsPerLine) {
      if (cur) lines.push(cur)
      cur = w
    } else {
      cur = (cur + ' ' + w).trim()
    }
  }
  if (cur) lines.push(cur)
  return lines.slice(0, 3).join('\n')
}

// Escape para usar paths dentro de filter_complex con comillas simples.
// ffmpeg en Windows quiere forward slashes + backslash-escape de colon.
function escapeFilterPath(p) {
  return p.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'")
}

function runFfmpeg(bin, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    p.stderr.on('data', (d) => {
      stderr += d.toString()
    })
    p.on('error', reject)
    p.on('exit', (code) => {
      if (code === 0) return resolve()
      reject(new Error(`ffmpeg exit ${code}\nstderr (tail):\n${stderr.slice(-2500)}`))
    })
  })
}

// ── Caption ───────────────────────────────────────────────────
function buildCaption(p, { hashtags }) {
  const lines = []
  lines.push(`🛍️ ${p.nombre}${p.ciudad ? ` · ${p.ciudad}` : ''}`)
  if (p.precio != null) lines.push(`💰 S/ ${p.precio.toFixed(2)}`)
  lines.push('')
  lines.push('✨ Descubrilo en merkao.org')
  lines.push('Marketplace 100% peruano · Sin comisión los 3 primeros meses')
  if (hashtags) {
    lines.push('')
    lines.push(IG_HASHTAGS)
  }
  return lines.join('\n')
}

// ══════════════════════════════════════════════════════════════
//                  INSTAGRAM REEL UPLOAD
// ══════════════════════════════════════════════════════════════
// Flujo "Instagram API with Instagram Login" — Reels REQUIEREN video_url
// público (NO soportan resumable upload, a diferencia de Page-based IG).
// Por eso subimos el .mp4 primero a 0x0.st para tener una URL HTTPS válida.
//   1. Upload reel.mp4 → 0x0.st → URL pública (30+ días retention)
//   2. POST /{ig_user}/media  media_type=REELS  video_url=<pub_url>
//      → { id (container) }
//   3. Poll GET /{container}?fields=status_code  hasta FINISHED (~30s-2min)
//      (IG descarga el video en background y lo procesa)
//   4. POST /{ig_user}/media_publish  creation_id=<container>
//      → { id (media id) }
//   5. (opcional) GET /{media}?fields=permalink
async function publishIgReel({ userId, token, videoPath, caption }) {
  const t0 = Date.now()
  const base = `https://graph.instagram.com/${IG_API_VERSION}`

  // (1) Subir a 0x0.st (anonymous file host, retention basada en tamaño)
  console.log('[reel]     subiendo .mp4 a 0x0.st para obtener URL pública…')
  const publicUrl = await uploadToTempHost(videoPath)
  console.log(`[reel]     URL pública: ${publicUrl}`)

  // (2) Crear container con video_url
  const createUrl = new URL(`${base}/${userId}/media`)
  const createBody = new URLSearchParams({
    media_type: 'REELS',
    video_url: publicUrl,
    caption,
    access_token: token,
  })
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: createBody,
  })
  const createJson = await createRes.json().catch(() => ({}))
  if (!createRes.ok || !createJson.id) {
    const m = createJson?.error?.message || JSON.stringify(createJson).slice(0, 300)
    throw new Error(`ig container ${createRes.status}: ${m}`)
  }
  const containerId = createJson.id
  console.log(`[reel]     IG container=${containerId}`)

  // (3) Poll status (Reels son más lentos que single-image — usar timeout más generoso)
  await waitForIgContainer(containerId, token, { maxAttempts: 30, baseDelayMs: 4000 })

  // (4) Publish
  const pubUrl = new URL(`${base}/${userId}/media_publish`)
  pubUrl.searchParams.set('creation_id', containerId)
  pubUrl.searchParams.set('access_token', token)
  const pubRes = await fetch(pubUrl, { method: 'POST' })
  const pubJson = await pubRes.json().catch(() => ({}))
  if (!pubRes.ok || !pubJson.id) {
    const m = pubJson?.error?.message || JSON.stringify(pubJson).slice(0, 300)
    throw new Error(`ig publish ${pubRes.status}: ${m}`)
  }
  const mediaId = pubJson.id

  // (5) Permalink (best-effort)
  let permalink = null
  try {
    const permUrl = new URL(`${base}/${mediaId}`)
    permUrl.searchParams.set('fields', 'permalink')
    permUrl.searchParams.set('access_token', token)
    const r = await fetch(permUrl)
    const j = await r.json()
    if (r.ok && j.permalink) permalink = j.permalink
  } catch {}

  return { mediaId, containerId, permalink, elapsedMs: Date.now() - t0 }
}

async function waitForIgContainer(containerId, token, { maxAttempts, baseDelayMs }) {
  const base = `https://graph.instagram.com/${IG_API_VERSION}`
  for (let i = 1; i <= maxAttempts; i++) {
    const u = new URL(`${base}/${containerId}`)
    u.searchParams.set('fields', 'status_code,status')
    u.searchParams.set('access_token', token)
    const r = await fetch(u)
    const j = await r.json().catch(() => ({}))
    if (!r.ok) {
      throw new Error(`ig status ${r.status}: ${j?.error?.message || JSON.stringify(j).slice(0, 200)}`)
    }
    if (j.status_code === 'FINISHED') return
    if (j.status_code === 'ERROR' || j.status_code === 'EXPIRED') {
      throw new Error(`ig container status=${j.status_code} status="${j.status || ''}"`)
    }
    console.log(`[reel]     IG poll ${i}/${maxAttempts}: status_code=${j.status_code}`)
    await sleep(baseDelayMs)
  }
  throw new Error(`ig container no llegó a FINISHED en ${maxAttempts} intentos`)
}

// ══════════════════════════════════════════════════════════════
//                    FACEBOOK REEL UPLOAD
// ══════════════════════════════════════════════════════════════
// Flujo de "Reels for Pages" — 3 fases:
//   1. POST /{page_id}/video_reels?upload_phase=start
//      → { video_id, upload_url }
//   2. POST <upload_url>  Authorization: OAuth <page_token>  offset:0 file_size:N  binary
//      → { success: true }
//   3. POST /{page_id}/video_reels?upload_phase=finish&video_id=...&video_state=PUBLISHED&description=...
//      → { success: true }
async function publishFbReel({ pageId, token, videoPath, description }) {
  const t0 = Date.now()
  const base = `https://graph.facebook.com/${FB_API_VERSION}`

  // (1) Start
  const startUrl = new URL(`${base}/${pageId}/video_reels`)
  startUrl.searchParams.set('upload_phase', 'start')
  startUrl.searchParams.set('access_token', token)
  const startRes = await fetch(startUrl, { method: 'POST' })
  const startJson = await startRes.json().catch(() => ({}))
  if (!startRes.ok || !startJson.video_id || !startJson.upload_url) {
    const m = startJson?.error?.message || JSON.stringify(startJson).slice(0, 300)
    throw new Error(`fb start ${startRes.status}: ${m}`)
  }
  const videoId = startJson.video_id
  const uploadUrl = startJson.upload_url
  console.log(`[reel]     FB video_id=${videoId} upload_url=${uploadUrl.slice(0, 80)}…`)

  // (2) Upload binario
  const fileBuf = readFileSync(videoPath)
  const upRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `OAuth ${token}`,
      offset: '0',
      file_size: String(fileBuf.length),
      'Content-Type': 'application/octet-stream',
    },
    body: fileBuf,
  })
  const upJson = await upRes.json().catch(() => ({}))
  if (!upRes.ok || upJson?.success === false) {
    const m = upJson?.error?.message || JSON.stringify(upJson).slice(0, 300)
    throw new Error(`fb upload ${upRes.status}: ${m}`)
  }

  // (3) Finish + publish
  const finishUrl = new URL(`${base}/${pageId}/video_reels`)
  finishUrl.searchParams.set('upload_phase', 'finish')
  finishUrl.searchParams.set('video_id', videoId)
  finishUrl.searchParams.set('video_state', 'PUBLISHED')
  if (description) finishUrl.searchParams.set('description', description)
  finishUrl.searchParams.set('access_token', token)
  const finRes = await fetch(finishUrl, { method: 'POST' })
  const finJson = await finRes.json().catch(() => ({}))
  if (!finRes.ok || finJson?.success === false) {
    const m = finJson?.error?.message || JSON.stringify(finJson).slice(0, 300)
    throw new Error(`fb finish ${finRes.status}: ${m}`)
  }

  const permalink = `https://www.facebook.com/reel/${videoId}`
  return { videoId, permalink, elapsedMs: Date.now() - t0 }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// Sube un archivo a un host anónimo y devuelve la URL HTTPS pública.
// Necesario porque IG Reels (via Instagram Login API) requiere video_url y
// no soporta resumable upload. Probamos providers en orden hasta que uno
// funcione — los hosts free van cayendo seguido (0x0.st bloqueó en jun 2026
// por spam de AI botnets), conviene tener fallback.
async function uploadToTempHost(filePath) {
  const fileBuf = readFileSync(filePath)
  const errors = []
  for (const provider of [uploadTmpfiles, uploadFileio, upload0x0]) {
    try {
      const url = await provider(fileBuf)
      console.log(`[reel]     ✓ subido vía ${provider.name}: ${url}`)
      return url
    } catch (e) {
      errors.push(`${provider.name}: ${e.message}`)
      console.warn(`[reel]     ⚠ ${provider.name} falló — ${e.message}`)
    }
  }
  throw new Error('todos los hosts fallaron: ' + errors.join(' | '))
}

// tmpfiles.org — JSON response, link viewer requiere transform a /dl/ para
// download directo. Free, sin auth, expiry 60min default.
async function uploadTmpfiles(buf) {
  const fd = new FormData()
  fd.append('file', new Blob([buf], { type: 'video/mp4' }), 'reel.mp4')
  const r = await fetch('https://tmpfiles.org/api/v1/upload', {
    method: 'POST',
    body: fd,
  })
  if (!r.ok) {
    const body = await r.text().catch(() => '')
    throw new Error(`HTTP ${r.status}: ${body.slice(0, 200)}`)
  }
  const j = await r.json()
  if (j.status !== 'success' || !j.data?.url) {
    throw new Error(`bad response: ${JSON.stringify(j).slice(0, 200)}`)
  }
  // Viewer URL: https://tmpfiles.org/123456/reel.mp4
  // Direct download: https://tmpfiles.org/dl/123456/reel.mp4
  return j.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/')
}

// file.io — simple JSON, 14d default expiry, auto-delete on download por
// default pero podemos pasar autoDelete=false. IG hace una sola descarga
// del video al crear el container, así que auto-delete está bien.
async function uploadFileio(buf) {
  const fd = new FormData()
  fd.append('file', new Blob([buf], { type: 'video/mp4' }), 'reel.mp4')
  fd.append('expires', '1d')
  const r = await fetch('https://file.io', { method: 'POST', body: fd })
  if (!r.ok) {
    const body = await r.text().catch(() => '')
    throw new Error(`HTTP ${r.status}: ${body.slice(0, 200)}`)
  }
  const j = await r.json()
  if (!j.success || !j.link) {
    throw new Error(`bad response: ${JSON.stringify(j).slice(0, 200)}`)
  }
  return j.link
}

// 0x0.st — backup. Estaba bloqueando uploads en jun 2026 por spam, pero
// puede volver. Plain text response = URL.
async function upload0x0(buf) {
  const fd = new FormData()
  fd.append('file', new Blob([buf], { type: 'video/mp4' }), 'reel.mp4')
  const r = await fetch('https://0x0.st', {
    method: 'POST',
    body: fd,
    headers: { 'User-Agent': 'merkao-reel-bot/1.0' },
  })
  if (!r.ok) {
    const body = await r.text().catch(() => '')
    throw new Error(`HTTP ${r.status}: ${body.slice(0, 200)}`)
  }
  const url = (await r.text()).trim()
  if (!/^https:\/\/0x0\.st\//.test(url)) {
    throw new Error(`bad response: ${url.slice(0, 100)}`)
  }
  return url
}

// ══════════════════════════════════════════════════════════════
//                    UNSPLASH PRODUCT IMAGES
// ══════════════════════════════════════════════════════════════
// Las imágenes Supabase son placeholders picsum.photos que NO corresponden
// al producto. Buscamos en Unsplash con queries derivados del nombre del
// producto + ciudad, con fallback chain de más específico a más genérico.

function cleanProductName(s) {
  return s
    .split('—')[0].split(',')[0]
    .replace(/\([^)]*\)/g, '')
    .replace(/\b\d+\s*(kg|g|ml|l|cm|m|mm|gb|tb|pack)\b/gi, '')
    .replace(/\bx\s*\d+\b/gi, '')
    .replace(/[\d/"']/g, ' ')
    .replace(/-/g, ' ') // shipibo-conibo → shipibo conibo
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split(/\s+/).filter((w) => w && !STOP_WORDS.has(w))
    .join(' ')
}

// Devuelve array de queries en orden de relevancia descendente.
// Estrategia: probar primero queries con sesgo peruano (mejor match para
// productos artesanales/tradicionales), luego queries sin "peru" (mejor para
// tech/marcas internacionales donde "peru" puebla con paisajes irrelevantes).
// Chain ESTRICTA — SOLO queries de CONTEXT_QUERIES (curadas a mano).
// Sin fallbacks a top-N+peru porque Unsplash search es OR-loose y eso
// devuelve cualquier foto de Perú tagueada con una de esas palabras (ej:
// "retablo ayacuchano peru" matcheó paisaje Millpu de Ayacucho — bug crítico).
// Si ninguna de las primeras 3 palabras del producto está en CONTEXT_QUERIES
// → skip producto. Multi-palabra captura cosas como "Cuadro shipibo-conibo"
// donde "shipibo" da queries más específicas que "cuadro".
function buildUnsplashStrictChain(product) {
  // Procesamos las palabras EN REVERSA: "Cuadro shipibo-conibo" → primero
  // 'conibo' y 'shipibo' (más específicos), después 'cuadro' (genérico).
  // En español el modificador suele venir tras el sustantivo y es lo que
  // describe mejor al producto.
  const words = cleanProductName(product.nombre).split(/\s+/).slice(0, 3).reverse()
  const chain = []
  for (const w of words) {
    const wen = ES_EN_MAP[w] || null
    const ctx = CONTEXT_QUERIES[w] || (wen && CONTEXT_QUERIES[wen]) || []
    for (const q of ctx) chain.push(q)
  }
  return [...new Set(chain)]
}

// Después de buscar, filtramos foto por foto contra una lista de keywords
// relevantes para esa categoría. Una foto "pasa" si su alt_description o
// description menciona al menos una keyword. Esto resuelve el OR-loose:
// Unsplash devuelve N fotos, nosotros aceptamos solo las que de verdad
// hablan del producto.
function getRelevanceKeywords(product) {
  const words = cleanProductName(product.nombre).split(/\s+/).slice(0, 3)
  const kws = []
  for (const w of words) {
    const wen = ES_EN_MAP[w] || null
    kws.push(w)
    if (wen) kws.push(wen)
    const extra = RELEVANCE_KEYWORDS[w] || (wen && RELEVANCE_KEYWORDS[wen]) || []
    for (const k of extra) kws.push(k)
  }
  return [...new Set(kws.filter(Boolean).map((s) => s.toLowerCase()))]
}

function isPhotoRelevant(photo, keywords) {
  if (keywords.length === 0) return false // sin keywords, no podemos validar
  const text = (
    (photo.alt_description || '') +
    ' ' +
    (photo.description || '')
  ).toLowerCase()
  return keywords.some((kw) => text.includes(kw))
}

async function findUnsplashImagesForProduct(product, accessKey, count) {
  const chain = buildUnsplashStrictChain(product)
  if (chain.length === 0) {
    console.log(`[reel]     producto sin CONTEXT_QUERIES match — skip`)
    return null
  }
  const keywords = getRelevanceKeywords(product)
  console.log(`[reel]     relevance keywords: [${keywords.slice(0, 8).join(', ')}]`)
  for (const query of chain) {
    const u = new URL('https://api.unsplash.com/search/photos')
    u.searchParams.set('query', query)
    u.searchParams.set('per_page', String(Math.min(count * 8, 30)))
    u.searchParams.set('orientation', 'portrait')
    u.searchParams.set('content_filter', 'high')
    const r = await fetch(u, {
      headers: { Authorization: `Client-ID ${accessKey}`, 'Accept-Version': 'v1' },
    })
    if (!r.ok) {
      const body = await r.text().catch(() => '')
      throw new Error(`unsplash ${r.status}: ${body.slice(0, 200)}`)
    }
    const j = await r.json()
    const results = Array.isArray(j?.results) ? j.results : []
    if (results.length === 0) {
      console.log(`[reel]     query "${query}" → 0 hits`)
      continue
    }
    const relevant = results.filter((p) => isPhotoRelevant(p, keywords))
    console.log(
      `[reel]     query "${query}" → ${results.length} hits, ${relevant.length} relevantes`,
    )
    if (relevant.length > 0) {
      const shuffled = [...relevant].sort(() => Math.random() - 0.5)
      return { query, photos: shuffled.slice(0, count) }
    }
  }
  return null
}

async function downloadUnsplashPhotos(photos, tmpDir) {
  const paths = []
  for (let i = 0; i < photos.length; i++) {
    const p = join(tmpDir, `unsplash-${i}.jpg`)
    try {
      await downloadTo(photos[i].urls.regular, p)
      paths.push(p)
    } catch (e) {
      console.warn(`[reel]     ⚠ unsplash imagen ${i + 1} falló: ${e.message}`)
    }
  }
  return paths
}

// ══════════════════════════════════════════════════════════════
//                    VOICEOVER (TTS)
// ══════════════════════════════════════════════════════════════
// Genera el voz anuncio del producto. Provider:
//   1) ElevenLabs si ELEVENLABS_API_KEY está seteada (mejor calidad, voz natural)
//   2) Google Translate TTS si no (gratis, sin auth, ~200 char por request)
// Texto cleanup: reemplaza chars que TTS pronuncia mal (—, /, ", etc.)

function buildVoiceoverText(product) {
  // Limpieza para TTS — el em-dash y caracteres especiales no se pronuncian.
  // También quitamos números pegados a unidades para que se lea natural.
  const nombreLimpio = product.nombre
    .replace(/—/g, ',')
    .replace(/\//g, ' ')
    .replace(/"/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const ciudad = product.ciudad || 'el Perú'
  const precio = product.precio != null ? Math.round(product.precio) : null
  const precioFrase = precio != null
    ? `Solo ${precio} soles con envío a todo el Perú. `
    : ''
  return (
    `¡Hola! Encuentra ${nombreLimpio} directo de ${ciudad} en Merkao punto org. ` +
    `${precioFrase}` +
    `¡Compra seguro con pago Escrow! Entra ya a Merkao punto org.`
  )
}

async function generateVoiceover(text, outPath) {
  const elevenKey = stripWs(process.env.ELEVENLABS_API_KEY)
  if (elevenKey) {
    await ttsElevenLabs(text, outPath, elevenKey)
    return 'elevenlabs'
  }
  await ttsGoogleTranslate(text, outPath)
  return 'gtts'
}

// ElevenLabs Multilingual v2 hace excelente español. Voz por defecto: "Rachel"
// (21m00Tcm4TlvDq8ikWAM) que con multilingual_v2 suena natural en español.
// Override con ELEVENLABS_VOICE_ID.
async function ttsElevenLabs(text, outPath, apiKey) {
  const voiceId = stripWs(process.env.ELEVENLABS_VOICE_ID) || '21m00Tcm4TlvDq8ikWAM'
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true },
    }),
  })
  if (!r.ok) {
    const body = await r.text().catch(() => '')
    throw new Error(`elevenlabs ${r.status}: ${body.slice(0, 200)}`)
  }
  const buf = Buffer.from(await r.arrayBuffer())
  writeFileSync(outPath, buf)
}

// Google Translate TTS undocumented endpoint. Límite ~200 chars por request.
// Para textos más largos, se divide por oraciones y se concatenan los MP3.
// Concatenar MP3 binarios funciona porque MP3 es chunkeable (ID3 al inicio
// y luego frames independientes); el resultado se reproduce como un solo audio.
// Usa el TLD .com.mx para acento latino (más alegre que español de España).
// El TLD afecta el modelo de voz que sirve Google — .com es neutral/español,
// .com.mx es México (acento latino), .com.ar es argentino, etc. La velocidad
// se ajusta luego con atempo en ffmpeg (gTTS endpoint no expone ttsspeed
// confiablemente).
async function ttsGoogleTranslate(text, outPath) {
  const chunks = chunkSentences(text, 195)
  const buffers = []
  for (const chunk of chunks) {
    const u = new URL('https://translate.google.com.mx/translate_tts')
    u.searchParams.set('ie', 'UTF-8')
    u.searchParams.set('q', chunk)
    u.searchParams.set('tl', 'es')
    u.searchParams.set('client', 'tw-ob')
    const r = await fetch(u, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Referer: 'https://translate.google.com.mx/',
      },
    })
    if (!r.ok) {
      throw new Error(`gtts ${r.status}: chunk="${chunk.slice(0, 40)}…"`)
    }
    const buf = Buffer.from(await r.arrayBuffer())
    if (buf.length < 500) throw new Error(`gtts body too small (${buf.length}B)`)
    buffers.push(buf)
  }
  writeFileSync(outPath, Buffer.concat(buffers))
}

function chunkSentences(text, maxLen) {
  if (text.length <= maxLen) return [text]
  const sentences = text.split(/(?<=[.!?])\s+/)
  const out = []
  let cur = ''
  for (const s of sentences) {
    if ((cur + ' ' + s).trim().length > maxLen) {
      if (cur) out.push(cur)
      cur = s
    } else {
      cur = (cur + ' ' + s).trim()
    }
  }
  if (cur) out.push(cur)
  return out
}
