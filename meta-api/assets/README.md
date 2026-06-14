# meta-api/assets

Assets para el generador de Reels (`create-reel.mjs`).

## `logo.png`

Logo de Merkao (100×100 PNG con fondo naranja). Se overlayea en la esquina
superior derecha del Reel. Si se borra, el script omite el overlay sin error.

## `bgm.mp3`

**Funky Energy Loop** — música de fondo del Reel.

- Fuente: <https://github.com/SoundSafari/CC0-1.0-Music> → `freepd.com/Funky Energy Loop.mp3`
- Licencia: **CC0 1.0 (dominio público)** — sin attribution requerida
- Duración: 3:22 (loop con `-stream_loop -1` en ffmpeg, recortado a 15s)
- Para reemplazar: dropear cualquier MP3 en `bgm.mp3` y `create-reel.mjs` lo
  usa automáticamente. Si el archivo no existe, el reel se genera con
  silencio (`anullsrc`).
