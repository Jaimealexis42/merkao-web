import type { NextConfig } from 'next'

// Headers de seguridad aplicados a TODAS las rutas. CSP deliberadamente
// permisiva para no romper Culqi (checkout.culqi.com + culqi.com),
// Supabase (*.supabase.co), Tawk.to (*.tawk.to), fuentes Google y
// Picsum (placeholders). Endurecer cuando se quite Tawk o se migre Culqi
// a v5 con dominios fijos.
const ContentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.culqi.com https://secure.culqi.com https://*.culqi.com https://embed.tawk.to https://*.tawk.to https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.tawk.to",
  "img-src 'self' data: blob: https: http:",
  "font-src 'self' data: https://fonts.gstatic.com https://*.tawk.to",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.culqi.com https://*.culqi.com https://*.tawk.to wss://*.tawk.to https://ipapi.co https://formspree.io https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
  "frame-src 'self' https://checkout.culqi.com https://*.culqi.com https://*.tawk.to",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://formspree.io",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: ContentSecurityPolicy },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.culqi.com")' },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
