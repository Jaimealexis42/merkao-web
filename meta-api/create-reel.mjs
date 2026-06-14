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
const SUPABASE_URL = process.env.SUPABASE_URL?.trim()
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY?.trim()
const PAGE_ID = process.env.META_PAGE_ID?.trim()
const PAGE_TOKEN = process.env.META_PAGE_ACCESS_TOKEN?.trim()
const IG_USER = process.env.META_IG_USER_ID?.trim()
const IG_TOKEN = process.env.META_IG_ACCESS_TOKEN?.trim()
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

if (preExistingVideo) {
  if (!existsSync(preExistingVideo)) bail(`--video file no existe: ${preExistingVideo}`)
  console.log(`[reel] usando video pre-existente: ${preExistingVideo}`)
  // sin producto → no podemos generar caption con datos reales; usar genérico
  product = { id: null, nombre: 'Merkao', ciudad: null, precio: null, imageUrl: null }
} else {
  console.log('[reel] (1/5) Producto random de Supabase…')
  product = await fetchRandomProduct(SUPABASE_URL, SUPABASE_KEY)
  if (!product) bail('Sin productos activos con imágenes en Supabase')
  console.log(
    `[reel]     ✓ "${product.nombre}"` +
      (product.ciudad ? ` · ${product.ciudad}` : '') +
      ` · S/ ${product.precio?.toFixed(2) ?? '?'}`,
  )

  console.log('[reel] (2/5) Descargando imagen…')
  tmpDir = resolve(tmpdir(), 'merkao-reel-' + Date.now())
  mkdirSync(tmpDir, { recursive: true })
  imagePath = join(tmpDir, 'product.jpg')
  await downloadTo(product.imageUrl, imagePath)
  console.log(`[reel]     ✓ ${statSync(imagePath).size} bytes`)

  videoPath = join(tmpDir, 'reel.mp4')
  console.log(`[reel] (3/5) ffmpeg → ${videoPath}`)
  const t0 = Date.now()
  await generateReel({ imagePath, videoPath, product, tmpDir })
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
  console.log('[reel] (4/5) IG --no-instagram → skip')
} else if (!IG_USER || !IG_TOKEN) {
  console.log('[reel] (4/5) IG: META_IG_USER_ID/ACCESS_TOKEN no seteadas → skip')
} else {
  const caption = buildCaption(product, { hashtags: true })
  console.log(`[reel] (4/5) IG: subiendo ${statSync(videoPath).size} bytes como REEL…`)
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
  console.log('[reel] (5/5) FB --no-facebook → skip')
} else if (!PAGE_ID || !PAGE_TOKEN) {
  console.log('[reel] (5/5) FB: META_PAGE_ID/ACCESS_TOKEN no seteadas → skip')
} else {
  const description = buildCaption(product, { hashtags: false })
  console.log(`[reel] (5/5) FB: subiendo ${statSync(videoPath).size} bytes como Reel…`)
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
    if (imagePath && existsSync(imagePath)) unlinkSync(imagePath)
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
async function fetchRandomProduct(supabaseUrl, anonKey) {
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
  if (withImgs.length === 0) return null
  const p = withImgs[Math.floor(Math.random() * withImgs.length)]
  return {
    id: p.id,
    nombre: p.nombre,
    ciudad: p.ciudad,
    precio: typeof p.precio === 'number' ? p.precio : Number(p.precio) || null,
    imageUrl: p.imagenes[Math.floor(Math.random() * p.imagenes.length)],
  }
}

async function downloadTo(url, path) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`download ${r.status} url=${url}`)
  const ab = await r.arrayBuffer()
  writeFileSync(path, Buffer.from(ab))
}

// ── ffmpeg video generation ───────────────────────────────────
// Diseño visual del Reel (1080x1920):
//   - Imagen del producto: scale + crop a 1080x1920, zoompan suave (1.0 → 1.3)
//   - Top band (0..380): #16202B 80% opacity, contiene nombre producto centrado
//   - Bottom band (1500..1920): #16202B 90% opacity, contiene ciudad + precio
//   - Logo (si existe): 140x140 esquina bottom-right con padding
//   - Audio: bgm.mp3 si existe, sino anullsrc (silencio) — IG/FB esperan track de audio
async function generateReel({ imagePath, videoPath, product, tmpDir }) {
  const fontReg = findFont(false)
  const fontBold = findFont(true)

  // textos a archivos para evitar escapes en filter_complex
  const titleTxt = join(tmpDir, 'title.txt')
  const cityTxt = join(tmpDir, 'city.txt')
  const priceTxt = join(tmpDir, 'price.txt')
  // Arial/DejaVu (system fonts) NO renderizan emojis → quedan como □. Para los
  // overlays usamos sólo texto plano; los captions de IG/FB sí llevan emojis
  // porque las apps tienen sus propias fuentes emoji.
  writeFileSync(titleTxt, wrapText(product.nombre, 22), 'utf8')
  writeFileSync(cityTxt, product.ciudad || 'merkao.org', 'utf8')
  writeFileSync(
    priceTxt,
    product.precio != null ? `S/ ${product.precio.toFixed(2)}` : 'Disponible',
    'utf8',
  )

  // Inputs dinámicos. `-framerate 30` ANTES de `-loop 1` fija la tasa de
  // input de la imagen estática a 30fps; sin esto, ffmpeg usa 25fps default y
  // el video sale 12.5s en lugar de 15s después de zoompan.
  const inputs = [
    '-y',
    '-framerate',
    String(VIDEO_FPS),
    '-loop',
    '1',
    '-t',
    String(VIDEO_DURATION),
    '-i',
    imagePath,
  ]
  let nextIdx = 1
  const idx = { image: 0 }

  const hasLogo = existsSync(LOGO_PATH)
  const hasBgm = existsSync(BGM_PATH)

  if (hasLogo) {
    inputs.push('-i', LOGO_PATH)
    idx.logo = nextIdx++
  }
  if (hasBgm) {
    inputs.push('-stream_loop', '-1', '-t', String(VIDEO_DURATION), '-i', BGM_PATH)
    idx.audio = nextIdx++
  } else {
    inputs.push(
      '-f',
      'lavfi',
      '-t',
      String(VIDEO_DURATION),
      '-i',
      'anullsrc=channel_layout=stereo:sample_rate=44100',
    )
    idx.audio = nextIdx++
  }

  // filter_complex via archivo (evita drama de shell quoting)
  // Refs:
  //   - zoompan con d=1 + on para zoom suave por frame (no jumpy)
  //   - drawbox t=fill para bandas semi-transparentes
  //   - drawtext textfile=… para evitar escape de unicode / colon / quotes
  const chain = []
  chain.push(
    `[${idx.image}:v]` +
      `scale=${VIDEO_W}:${VIDEO_H}:force_original_aspect_ratio=increase,` +
      `crop=${VIDEO_W}:${VIDEO_H},` +
      `zoompan=z='min(1.0+on*0.0007,1.3)':` +
      `x='iw/2-(iw/zoom)/2':y='ih/2-(ih/zoom)/2':` +
      `d=1:s=${VIDEO_W}x${VIDEO_H}:fps=${VIDEO_FPS},` +
      `format=yuv420p` +
      `[bg]`,
  )
  // Bandas + texto
  chain.push(
    `[bg]` +
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

  let lastV = 't3'
  if (hasLogo) {
    // Logo 140x140 en esquina sup-derecha con padding
    chain.push(`[${idx.logo}:v]scale=140:140[logo]`)
    chain.push(`[${lastV}][logo]overlay=W-w-40:40[outv]`)
    lastV = 'outv'
  } else {
    chain.push(`[${lastV}]null[outv]`)
    lastV = 'outv'
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
    `${idx.audio}:a`,
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
// Flujo "Instagram API with Instagram Login" — Reels resumable upload:
//   1. POST /{ig_user}/media  media_type=REELS upload_type=resumable
//      → { id (container), uri (upload endpoint) }
//   2. POST <uri>  Authorization: OAuth <token>  offset: 0  binary
//      → { id, success }
//   3. Poll GET /{container}?fields=status_code  hasta FINISHED (~30s-2min)
//   4. POST /{ig_user}/media_publish  creation_id=<container>
//      → { id (media id) }
//   5. (opcional) GET /{media}?fields=permalink
async function publishIgReel({ userId, token, videoPath, caption }) {
  const t0 = Date.now()
  const base = `https://graph.instagram.com/${IG_API_VERSION}`

  // (1) Crear container resumable
  const createUrl = new URL(`${base}/${userId}/media`)
  const createBody = new URLSearchParams({
    media_type: 'REELS',
    upload_type: 'resumable',
    caption,
    access_token: token,
  })
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: createBody,
  })
  const createJson = await createRes.json().catch(() => ({}))
  if (!createRes.ok || !createJson.id || !createJson.uri) {
    const m = createJson?.error?.message || JSON.stringify(createJson).slice(0, 300)
    throw new Error(`ig container ${createRes.status}: ${m}`)
  }
  const containerId = createJson.id
  const uploadUri = createJson.uri
  console.log(`[reel]     IG container=${containerId} uri=${uploadUri.slice(0, 80)}…`)

  // (2) Upload binario
  const fileBuf = readFileSync(videoPath)
  const uploadRes = await fetch(uploadUri, {
    method: 'POST',
    headers: {
      Authorization: `OAuth ${token}`,
      offset: '0',
      file_offset: '0',
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(fileBuf.length),
    },
    body: fileBuf,
  })
  const uploadJson = await uploadRes.json().catch(() => ({}))
  if (!uploadRes.ok || uploadJson?.success === false) {
    const m = uploadJson?.error?.message || JSON.stringify(uploadJson).slice(0, 300)
    throw new Error(`ig upload ${uploadRes.status}: ${m}`)
  }

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
