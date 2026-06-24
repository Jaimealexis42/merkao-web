// BORRADOR — requiere validación de abogado y registro del banco de datos
// personales ante la Autoridad Nacional de Protección de Datos Personales (ANPD).
// Fundamentado en la Ley 29733 (Ley de Protección de Datos Personales) y su
// Reglamento aprobado por DS 016-2024-JUS.

import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteTopnav, SiteFootnav } from '@/components/SiteShell'
import { PROVEEDOR, formatLegalDate } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Merkao — Política de Privacidad',
  description:
    'Política de Privacidad de Merkao conforme a la Ley 29733 y su Reglamento (DS 016-2024-JUS). Cómo recolectamos, usamos y protegemos tus datos personales.',
}

export default function PrivacidadPage() {
  const fecha = formatLegalDate()

  return (
    <>
      <SiteTopnav />
      <main className="mk-legal">
        <div className="mk-legal-wrap">
          <header className="mk-legal-head">
            <h1>Política de Privacidad</h1>
            <p>
              Esta política describe cómo Merkao trata los datos personales de los usuarios
              del marketplace <Link href="/">merkao.org</Link>, en cumplimiento de la{' '}
              <strong>Ley N° 29733, Ley de Protección de Datos Personales</strong>, y su
              Reglamento aprobado por el <strong>Decreto Supremo N° 016-2024-JUS</strong>.
            </p>
            <p className="mk-legal-update">Última actualización: {fecha}</p>
          </header>

          <article className="mk-legal-section">
            <h2>1. Responsable del banco de datos personales</h2>
            <p>
              El responsable del tratamiento de los datos personales recolectados a través
              del marketplace Merkao es:
            </p>
            <ul>
              <li><strong>Titular:</strong> {PROVEEDOR.titular}</li>
              <li><strong>Nombre comercial:</strong> {PROVEEDOR.nombreComercial}</li>
              <li><strong>RUC:</strong> {PROVEEDOR.ruc}</li>
              <li><strong>Domicilio:</strong> {PROVEEDOR.domicilio}</li>
              <li>
                <strong>Canal de contacto:</strong>{' '}
                <a href={`mailto:${PROVEEDOR.emailContacto}`}>{PROVEEDOR.emailContacto}</a>
              </li>
            </ul>
            <p>
              El banco de datos personales será inscrito ante la{' '}
              <strong>Autoridad Nacional de Protección de Datos Personales (ANPD)</strong>{' '}
              del Ministerio de Justicia y Derechos Humanos.
            </p>
          </article>

          <article className="mk-legal-section">
            <h2>2. Datos personales que recolectamos</h2>
            <p>Según la interacción del usuario con el marketplace, recolectamos:</p>
            <ul>
              <li>
                <strong>Datos de identificación:</strong> nombres y apellidos, número de
                DNI o documento de identidad equivalente.
              </li>
              <li>
                <strong>Datos de contacto:</strong> dirección de correo electrónico,
                número de teléfono móvil.
              </li>
              <li>
                <strong>Datos de envío:</strong> dirección postal, distrito, provincia,
                departamento, referencias.
              </li>
              <li>
                <strong>Datos de pago:</strong> los pagos se procesan a través del proveedor{' '}
                <strong>Culqi S.A.C.</strong>{' '}
                <em>
                  Merkao no almacena ni tiene acceso al número completo de tarjeta, código
                  de seguridad ni fecha de vencimiento.
                </em>{' '}
                Culqi devuelve a Merkao únicamente un identificador (token) y los últimos
                cuatro dígitos.
              </li>
              <li>
                <strong>Datos de navegación:</strong> dirección IP, identificadores de
                dispositivo y de sesión, páginas visitadas, referidos, datos de uso del
                sitio (recolectados vía cookies y herramientas analíticas).
              </li>
              <li>
                <strong>Para vendedores:</strong> adicionalmente, RUC o constancia de
                inscripción, datos de cuenta bancaria para liquidaciones, información del
                catálogo de productos.
              </li>
            </ul>
          </article>

          <article className="mk-legal-section">
            <h2>3. Finalidades del tratamiento</h2>
            <p>Los datos personales recolectados son tratados para las siguientes finalidades:</p>
            <ul>
              <li>Procesar pedidos, órdenes de compra y pagos.</li>
              <li>Coordinar el envío, despacho y entrega de los productos adquiridos.</li>
              <li>
                Gestionar el servicio de Pago Escrow (retención del pago hasta confirmación
                de entrega).
              </li>
              <li>
                Comunicar al usuario información transaccional: confirmaciones, comprobantes,
                cambios de estado del pedido, constancias del Libro de Reclamaciones.
              </li>
              <li>Atender consultas, reclamos y quejas a través de los canales oficiales.</li>
              <li>
                Mejorar la calidad del servicio, prevenir fraudes y mantener la seguridad de
                la plataforma.
              </li>
              <li>
                Cumplir con obligaciones legales, tributarias y regulatorias aplicables
                (Indecopi, SUNAT, ANPD).
              </li>
              <li>
                Envío de comunicaciones comerciales <em>solo</em> cuando el usuario haya
                otorgado consentimiento expreso y específico para tal fin. El usuario podrá
                revocar este consentimiento en cualquier momento.
              </li>
            </ul>
          </article>

          <article className="mk-legal-section">
            <h2>4. Base legal del tratamiento</h2>
            <p>
              El tratamiento de los datos personales se sustenta en el{' '}
              <strong>consentimiento expreso, previo, informado e inequívoco</strong> del
              titular, conforme al artículo 5 de la Ley 29733 y su Reglamento. Dicho
              consentimiento se otorga al momento del registro de cuenta, al realizar una
              compra o al aceptar los presentes términos.
            </p>
            <p>
              En los casos previstos por ley, también se podrá tratar datos sin
              consentimiento (ejecución de un contrato, cumplimiento de obligaciones
              legales, datos contenidos en fuentes accesibles al público, entre otros
              supuestos del artículo 14 de la Ley 29733).
            </p>
          </article>

          <article className="mk-legal-section">
            <h2>5. Derechos del titular de los datos (ARCO)</h2>
            <p>
              El titular de los datos personales tiene derecho a ejercer, de forma gratuita,
              los siguientes derechos reconocidos por la Ley 29733:
            </p>
            <ul>
              <li>
                <strong>Acceso:</strong> conocer qué datos personales son tratados, su
                origen y la finalidad del tratamiento.
              </li>
              <li>
                <strong>Rectificación:</strong> solicitar la corrección de datos inexactos,
                incompletos o desactualizados.
              </li>
              <li>
                <strong>Cancelación (supresión):</strong> solicitar la eliminación de los
                datos cuando ya no sean necesarios para la finalidad para la que fueron
                recolectados o cuando se revoque el consentimiento.
              </li>
              <li>
                <strong>Oposición:</strong> oponerse al tratamiento de los datos personales
                por motivos fundados y legítimos.
              </li>
              <li>
                <strong>Información:</strong> conocer las cesiones realizadas o que se
                prevén realizar.
              </li>
              <li>
                <strong>Revocación del consentimiento:</strong> en cualquier momento.
              </li>
            </ul>
            <p>
              Para ejercer estos derechos, el titular puede enviar una solicitud al correo{' '}
              <a href={`mailto:${PROVEEDOR.emailContacto}`}>{PROVEEDOR.emailContacto}</a>,
              adjuntando copia de su documento de identidad. La solicitud será atendida en
              los plazos establecidos en el Reglamento de la Ley 29733.
            </p>
          </article>

          <article className="mk-legal-section">
            <h2>6. Encargados del tratamiento</h2>
            <p>
              Para la prestación del servicio, Merkao comparte determinados datos
              personales con los siguientes encargados de tratamiento, los cuales actúan
              bajo nuestras instrucciones y conforme a sus propias políticas de privacidad:
            </p>
            <ul>
              <li>
                <strong>Culqi S.A.C.</strong> — procesamiento de pagos con tarjeta, Yape y
                otros medios.
              </li>
              <li>
                <strong>Supabase Inc.</strong> — almacenamiento de la base de datos
                (cuentas, pedidos, catálogo).
              </li>
              <li>
                <strong>Vercel Inc.</strong> — hosting y entrega del sitio web.
              </li>
              <li>
                <strong>Google LLC (Google Analytics 4)</strong> — métricas anónimas de uso
                del sitio.
              </li>
              <li>
                <strong>Olva Courier S.A. / Shalom Empresarial S.A.C.</strong> — couriers
                para el despacho y entrega de pedidos.
              </li>
              <li>
                <strong>Google LLC (Gmail / Google Workspace)</strong> — envío de correos
                transaccionales (constancias, confirmaciones).
              </li>
            </ul>
          </article>

          <article className="mk-legal-section">
            <h2>7. Transferencias internacionales</h2>
            <p>
              Algunos de los encargados antes señalados (Supabase, Vercel, Google) tienen
              servidores e infraestructura ubicada fuera del territorio peruano,
              principalmente en Estados Unidos y en la Unión Europea. Estas transferencias
              internacionales se realizan a proveedores que mantienen{' '}
              <strong>niveles de protección equivalentes</strong> a los exigidos por la
              normativa peruana, mediante cláusulas contractuales tipo y certificaciones
              internacionales (ISO 27001, SOC 2, entre otros).
            </p>
            <p>
              Asimismo, cuando vendedores o compradores residan en países distintos al
              Perú, los datos estrictamente necesarios para concretar la operación serán
              compartidos con esa contraparte.
            </p>
          </article>

          <article className="mk-legal-section">
            <h2>8. Medidas de seguridad</h2>
            <p>
              Merkao adopta medidas técnicas, organizativas y legales razonables para
              proteger los datos personales contra el acceso no autorizado, la pérdida,
              alteración o divulgación indebida, conforme a las Directivas de Seguridad de
              la ANPD. Entre estas medidas se incluyen:
            </p>
            <ul>
              <li>Cifrado de las comunicaciones mediante HTTPS/TLS.</li>
              <li>Control de accesos por roles y autenticación segura.</li>
              <li>
                Tokenización de los datos de tarjeta (no se almacenan en infraestructura
                de Merkao).
              </li>
              <li>Auditorías y respaldos periódicos.</li>
            </ul>
          </article>

          <article className="mk-legal-section">
            <h2>9. Plazo de conservación</h2>
            <p>
              Los datos personales son conservados únicamente por el tiempo necesario para
              cumplir la finalidad para la cual fueron recolectados y, posteriormente, por
              los plazos legales de prescripción aplicables:
            </p>
            <ul>
              <li>
                <strong>Datos de cuenta y catálogo:</strong> mientras la cuenta permanezca
                activa.
              </li>
              <li>
                <strong>Datos transaccionales y comprobantes:</strong> por el plazo
                tributario aplicable (mínimo 5 años, conforme al Código Tributario).
              </li>
              <li>
                <strong>Registros del Libro de Reclamaciones:</strong> por dos (2) años,
                conforme al Reglamento del Libro de Reclamaciones (DS 011-2011-PCM).
              </li>
              <li>
                <strong>Datos de navegación:</strong> conforme a los plazos de las
                herramientas analíticas utilizadas (Google Analytics, hasta 14 meses por
                defecto).
              </li>
            </ul>
            <p>
              Vencido dicho plazo, los datos serán bloqueados y posteriormente suprimidos
              de la base de datos.
            </p>
          </article>

          <article className="mk-legal-section">
            <h2>10. Reclamos ante la Autoridad</h2>
            <p>
              Si el titular considera que Merkao no ha atendido adecuadamente el ejercicio
              de sus derechos o ha vulnerado lo dispuesto por la normativa, puede presentar
              un reclamo ante la{' '}
              <strong>Autoridad Nacional de Protección de Datos Personales (ANPD)</strong>{' '}
              del Ministerio de Justicia y Derechos Humanos, a través de su Mesa de Partes
              o portal institucional (
              <a
                href="https://www.gob.pe/anpd"
                target="_blank"
                rel="noopener noreferrer"
              >
                gob.pe/anpd
              </a>
              ).
            </p>
          </article>

          <article className="mk-legal-section">
            <h2>11. Modificaciones</h2>
            <p>
              Merkao podrá actualizar la presente política cuando sea necesario por cambios
              normativos, operativos o tecnológicos. La fecha de la última actualización se
              muestra al inicio de este documento. Recomendamos revisar periódicamente esta
              página.
            </p>
          </article>

          <p className="mk-legal-foot">
            Para consultas sobre privacidad y protección de datos, escríbenos a{' '}
            <a href={`mailto:${PROVEEDOR.emailContacto}`}>{PROVEEDOR.emailContacto}</a>.
          </p>
        </div>
      </main>
      <SiteFootnav />
    </>
  )
}
