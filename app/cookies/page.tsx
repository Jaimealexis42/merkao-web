// BORRADOR — requiere validación de abogado y registro del banco de datos
// personales ante la Autoridad Nacional de Protección de Datos Personales (ANPD).
// Fundamentado en la Ley 29733 y su Reglamento (DS 016-2024-JUS), y en la
// recomendación de la ANPD sobre cookies y tecnologías de rastreo.

import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteTopnav, SiteFootnav } from '@/components/SiteShell'
import { PROVEEDOR, formatLegalDate } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Merkao — Aviso de cookies',
  description:
    'Información sobre el uso de cookies y tecnologías similares en el marketplace Merkao, conforme a la Ley 29733 de Protección de Datos Personales.',
}

export default function CookiesPage() {
  const fecha = formatLegalDate()

  return (
    <>
      <SiteTopnav />
      <main className="mk-legal">
        <div className="mk-legal-wrap">
          <header className="mk-legal-head">
            <h1>Aviso de cookies</h1>
            <p>
              Este aviso describe qué cookies y tecnologías similares utiliza el
              marketplace <Link href="/">merkao.org</Link>, con qué finalidad y cómo
              puedes gestionar tus preferencias, en cumplimiento de la{' '}
              <strong>Ley N° 29733, Ley de Protección de Datos Personales</strong>, y de
              su Reglamento (DS 016-2024-JUS).
            </p>
            <p className="mk-legal-update">Última actualización: {fecha}</p>
          </header>

          <article className="mk-legal-section">
            <h2>1. ¿Qué son las cookies?</h2>
            <p>
              Las cookies son pequeños archivos de texto que un sitio web almacena en el
              navegador del usuario cuando este lo visita. Permiten al sitio recordar
              información sobre la visita (por ejemplo, idioma preferido, sesión iniciada,
              productos agregados al carrito) y recolectar datos estadísticos sobre el uso
              del sitio.
            </p>
          </article>

          <article className="mk-legal-section">
            <h2>2. Cookies que utiliza Merkao</h2>

            <h3 className="mk-legal-h3">Cookies técnicas (estrictamente necesarias)</h3>
            <p>
              Son indispensables para el funcionamiento del sitio. No requieren
              consentimiento del usuario. Permiten, entre otras funciones:
            </p>
            <ul>
              <li>Mantener la sesión iniciada (login del comprador o vendedor).</li>
              <li>
                Recordar los productos agregados al <Link href="/carrito">carrito</Link>.
              </li>
              <li>Procesar el checkout y la confirmación del pedido.</li>
              <li>Aplicar medidas básicas de seguridad y prevención de fraude.</li>
            </ul>

            <h3 className="mk-legal-h3">Cookies analíticas (Google Analytics 4)</h3>
            <p>
              Utilizamos <strong>Google Analytics 4</strong> (proveedor: Google LLC) para
              entender cómo los usuarios interactúan con el marketplace, qué páginas son
              más visitadas y cómo mejorar el servicio. Estas cookies recolectan
              identificadores de dispositivo y datos agregados de navegación. Su uso
              requiere consentimiento del usuario.
            </p>
            <p>
              Más información en la{' '}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                Política de Privacidad de Google
              </a>
              .
            </p>

            <h3 className="mk-legal-h3">Cookies de terceros</h3>
            <p>
              Algunos servicios integrados al marketplace pueden colocar cookies
              propias de su dominio para garantizar su funcionamiento, entre ellos:
            </p>
            <ul>
              <li>
                <strong>Culqi</strong> (pasarela de pagos) durante el proceso de checkout.
              </li>
              <li>
                <strong>Vercel</strong> (infraestructura) para balanceo de carga y
                rendimiento.
              </li>
            </ul>
          </article>

          <article className="mk-legal-section">
            <h2>3. Banner de consentimiento</h2>
            <p>
              La primera vez que ingresas al marketplace, se muestra un{' '}
              <strong>banner de consentimiento de cookies</strong> que te permite{' '}
              <strong>aceptar</strong> o <strong>rechazar</strong> las cookies analíticas y
              de terceros no esenciales. Las cookies técnicas se cargan en todos los casos,
              ya que son necesarias para el funcionamiento básico del sitio.
            </p>
            <p>
              Tu preferencia se almacena en una cookie técnica. Podrás cambiar tu decisión
              en cualquier momento desde esta página o desde la configuración de tu cuenta.
            </p>
          </article>

          <article className="mk-legal-section">
            <h2>4. Cómo gestionar las cookies desde el navegador</h2>
            <p>
              Adicionalmente al banner, todos los navegadores modernos permiten ver,
              bloquear o eliminar las cookies almacenadas. Consulta la ayuda oficial de tu
              navegador:
            </p>
            <ul>
              <li>
                <a
                  href="https://support.google.com/chrome/answer/95647"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google Chrome
                </a>
              </li>
              <li>
                <a
                  href="https://support.mozilla.org/es/kb/Borrar%20cookies"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Mozilla Firefox
                </a>
              </li>
              <li>
                <a
                  href="https://support.apple.com/es-es/guide/safari/sfri11471/mac"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Apple Safari
                </a>
              </li>
              <li>
                <a
                  href="https://support.microsoft.com/es-es/microsoft-edge"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Microsoft Edge
                </a>
              </li>
            </ul>
            <p>
              Ten en cuenta que el bloqueo de las cookies técnicas puede afectar el
              correcto funcionamiento de algunas secciones del marketplace (por ejemplo,
              el checkout o el carrito de compras).
            </p>
          </article>

          <article className="mk-legal-section">
            <h2>5. Tratamiento de los datos recolectados</h2>
            <p>
              Los datos recolectados a través de cookies son tratados conforme a la{' '}
              <Link href="/privacidad">Política de Privacidad</Link> de Merkao. Para más
              información sobre los derechos ARCO (Acceso, Rectificación, Cancelación y
              Oposición) puedes consultar esa política o escribirnos a{' '}
              <a href={`mailto:${PROVEEDOR.emailContacto}`}>{PROVEEDOR.emailContacto}</a>.
            </p>
          </article>

          <p className="mk-legal-foot">
            Para consultas sobre cookies, escríbenos a{' '}
            <a href={`mailto:${PROVEEDOR.emailContacto}`}>{PROVEEDOR.emailContacto}</a>.
          </p>
        </div>
      </main>
      <SiteFootnav />
    </>
  )
}
