import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin', '/api/', '/auth/', '/carrito', '/checkout', '/escrow/', '/mis-pedidos',
        '/pedidos/', '/perfil', '/tracking/', '/vendedor',
      ],
    },
    sitemap: 'https://merkao.org/sitemap.xml',
  }
}
