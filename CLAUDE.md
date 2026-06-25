# CLAUDE.md — Merkao Web

## 1. Proyecto e idioma

Merkao es un **marketplace de comercio electrónico** para Perú (compradores y vendedores).
Stack: **Next.js 16.2.1** (Turbopack), Supabase, nodemailer, zustand. Dominio: **merkao.org**.

Estructura del repo: **flat** (`app/`, `components/`, `lib/`, `meta-api/`, `posts/`, `public/`, `scripts/`, `supabase/` al root — **NO** hay `src/`).

**Responder siempre en español.**

---

## 2. Deploy — AUTO-DEPLOY ⚠️ MUY CUIDADOSO

A diferencia de PresupIA, Merkao **se deploya automáticamente** al hacer push a `main`:

- **Push a `main` → publica directo a producción** (`merkao.org`)
- No hay `vercel.json` ni workflow de deploy — la integración Vercel↔GitHub está activa en el panel de Vercel
- **Repo**: `https://github.com/Jaimealexis42/merkao-web`
- **Branch productiva**: `main`

**Regla operativa**:
1. Trabajar siempre en una rama feature.
2. Antes de `git push origin main` o `git merge → push`, **AVISAR explícitamente** y esperar OK.
3. Si se mergea por error, el deploy ya salió — solo se mitiga con un revert push (que también se autodeploya).

GitHub Actions **no hace deploy**: el único workflow (`.github/workflows/merkao-facebook-post.yml`) corre cron diario 13:00 UTC (8:00 Lima) para auto-post FB+IG + reel diario via `meta-api/post-facebook.mjs` y `meta-api/create-reel.mjs`.

---

## 3. Supabase

| | |
|---|---|
| **Project ref** | `mlpsewryuaoklvokhejd` |
| URL | `https://mlpsewryuaoklvokhejd.supabase.co` |
| Dashboard SQL Editor | `https://app.supabase.com/project/mlpsewryuaoklvokhejd/sql/new` |

**Distinto al de PresupIA** (`tnrqdyagfecceeebocvn`) y al de ExpeditIA (`wznwvndztnqpitscmyzo`). NO confundir.

Migraciones SQL en `supabase/` (no numeradas — flat files). Tablas/dominios identificables por filename:
`tiendas`, `pedidos`, `perfiles_pago`, `comisiones_merkao`, `page_views`, `productos` (seed), `order_tracking`, `nuevos_campos`.

---

## 4. Marca y diseño

| Token | Valor | Definición |
|---|---|---|
| Color de marca | `#F2700C` | `app/globals.css:8` — variable CSS `--brand` |
| Fuente | **Manrope** | `app/layout.tsx:2` — `import { Manrope } from "next/font/google"` |
| Namespace CSS legal | `.mk-legal` | (paralelo al `.pi-legal` de PresupIA) |
| Namespace cookie consent | `.mk-cc` | `app/globals.css` |

Footer compartido: `components/SiteShell.tsx` (contiene la nav con links legales).
Convención: prefijo `mk-` para clases y cookies (ej. `mk_cookie_consent`).

---

## 5. Integraciones activas

### 5.1 Google OAuth (login)
`app/login/page.tsx:35-36` y `app/register/page.tsx:87-88`:
```ts
supabase.auth.signInWithOAuth({ provider: 'google' })
```
Callback: `app/auth/callback/route.ts`.

### 5.2 Google Analytics 4 (con consent gate)
- `components/GoogleAnalytics.tsx` lee `process.env.NEXT_PUBLIC_GA_ID` (no hardcoded)
- **Gated por consent**: línea 52 `if (consent !== 'accepted') return null` — no carga gtag si el user no aceptó
- Cookie de consentimiento: `mk_cookie_consent` (1 año, SameSite=Lax)
- Helpers: `lib/consent.ts` (`readConsent`, `writeConsent`, `CONSENT_EVENT`)
- Banner: `components/CookieConsentBanner.tsx`, montado en `app/layout.tsx`

### 5.3 Culqi (pagos)
- `app/api/culqi-token/route.ts` → tokenización
- `app/api/culqi-charge/route.ts` → cobro
- Merkao es **Merchant of Record (MoR)** — Culqi **NO tiene split nativo**, las comisiones se trackean en tabla `comisiones_merkao` (ledger interno)

### 5.4 Marketing automation
- Workflow: `.github/workflows/merkao-facebook-post.yml` (cron 13:00 UTC diario)
- Scripts: `meta-api/post-facebook.mjs` + `meta-api/create-reel.mjs`
- Fuente de variantes: `posts/variants.json` (7 variantes)
- Estado mantenido por CI: `meta-api/state.json` y `meta-api/reel-state.json`
- Secrets requeridos en GitHub Actions: `META_PAGE_ID`, `META_PAGE_ACCESS_TOKEN`, IG user id, etc.

---

## 6. Legal (en producción)

Páginas legales montadas en `merkao.org`:
- `/privacidad` · `/terminos` · `/cookies` · `/libro-de-reclamaciones` · `/como-funciona-escrow`
- Banner cookie consent activo (gateando GA4)

Datos del proveedor (`lib/reclamaciones.ts` — fuente única, re-exportado en `lib/legal.ts`):

| | |
|---|---|
| Razón social | ARANA PAREDES JAIME ALEXIS |
| RUC | `10414179709` |
| Domicilio | Jr. Puno C-8, Puerto Maldonado, Madre de Dios |
| **Email contacto/reclamos** | **`merkao.org@gmail.com`** |

Última actualización legal: `LEGAL_LAST_UPDATE_ISO = '2026-06-24'` (`lib/legal.ts`).

### Banco de datos ANPD — REGISTRADO ✓

| | |
|---|---|
| **Código de inscripción** | **`PN-2026-143`** |
| **Denominación** | USUARIOS MARKETPLACE MERKAO |
| Autoridad | ANPD (Autoridad Nacional de Protección de Datos Personales) |

⚠️ **NO confundir** con `PN-2026-142` — ese es el de **PresupIA**, no de Merkao.

Reclamaciones: tabla y RPC `crear_reclamacion` en Supabase Merkao; email constancia via Gmail SMTP (nodemailer) usando `lib/email.ts`.

---

## 7. PowerShell (Windows)

- **Nunca** template literals con backtick (`` ` ``). Solo concatenación de strings.
- Para escribir archivos: `Set-Content` con heredoc.
- Bash POSIX → tool Bash (git-bash). Cmdlets nativos → PowerShell.
- Indicar siempre **qué terminal corre cada bloque**.

---

## 8. Estilo de trabajo (con énfasis en auto-deploy)

- Antes de tocar código → mostrar plan, esperar confirmación.
- Archivos con múltiples errores → **rewrite completo**, no parche línea por línea.
- Comandos en **bloques copiables**, especificando terminal.
- Confirmación post-tarea con `✅` / `🧪` / `✔️` probando verificación.
- **CRÍTICO Merkao**: como `push a main` autodeploya a producción:
  - Trabajar siempre en rama feature
  - **Avisar SIEMPRE** antes de mergear o pushear a `main`
  - Tener `npm run build` exitoso antes del push
  - Si rompiste prod, mitigá con **revert push** (que también autodeploya el revert) — no hay rollback de un click en Vercel sin promoting un deploy previo

---

## Apéndice — Comisiones por categoría (`lib/comisiones.ts`)

Primeros **12 meses gratis** (`MESES_GRATIS = 12`). Después:

| Categoría | % |
|---|---|
| Alimentos, Artesanías, Agrícola | **3%** |
| Ropa y Moda, Hogar, Otros | **5%** |
| Electrónicos, Autos y Motos | **7%** |

Helper: `comisionEfectiva(categoriaId, mesesActivo)`.

---

@AGENTS.md
