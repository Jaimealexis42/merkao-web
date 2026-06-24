// BORRADOR — requiere validación de abogado y registro del banco de datos
// personales ante la Autoridad Nacional de Protección de Datos Personales (ANPD).
// Fundamentado en la Ley 29571 (Código de Protección y Defensa del Consumidor)
// y normativa complementaria (Indecopi, SUNAT, BCRP).

import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteTopnav, SiteFootnav } from '@/components/SiteShell'
import { PROVEEDOR, formatLegalDate } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Merkao — Términos y Condiciones',
  description:
    'Términos y Condiciones del marketplace Merkao. Rol de intermediario, responsabilidades de vendedores y compradores, comisiones, envíos, devoluciones y derecho de retracto del consumidor.',
}

export default function TerminosPage() {
  const fecha = formatLegalDate()

  return (
    <>
      <SiteTopnav />
      <main className="mk-legal">
        <div className="mk-legal-wrap">
          <header className="mk-legal-head">
            <h1>Términos y Condiciones</h1>
            <p>
              Los presentes Términos y Condiciones regulan el uso del marketplace{' '}
              <Link href="/">merkao.org</Link> (en adelante, <strong>Merkao</strong> o el{' '}
              <strong>marketplace</strong>), conforme a la{' '}
              <strong>Ley N° 29571, Código de Protección y Defensa del Consumidor</strong>,
              y demás normativa peruana aplicable.
            </p>
            <p className="mk-legal-update">Última actualización: {fecha}</p>
          </header>

          <article className="mk-legal-section">
            <h2>1. Identificación del titular</h2>
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
          </article>

          <article className="mk-legal-section">
            <h2>2. Naturaleza del servicio — Rol de intermediario</h2>
            <p>
              Merkao es una <strong>plataforma electrónica de intermediación</strong>{' '}
              (marketplace) que conecta a vendedores con compradores. Merkao{' '}
              <strong>no comercializa productos por cuenta propia</strong>, salvo cuando
              expresamente se identifique como tal en la ficha de un producto. Cada
              operación de compraventa se celebra directamente entre el vendedor y el
              comprador, siendo el vendedor el responsable directo de las características,
              calidad, idoneidad, entrega y garantía del producto.
            </p>
            <p>
              Sin perjuicio de ello, Merkao asume frente al consumidor las obligaciones
              propias del titular del marketplace, incluyendo la administración del Libro
              de Reclamaciones y la mediación en disputas mediante el servicio de Pago
              Escrow.
            </p>
          </article>

          <article className="mk-legal-section">
            <h2>3. Registro de cuenta</h2>
            <p>
              Para usar Merkao como comprador o vendedor es necesario crear una cuenta. El
              usuario se obliga a proporcionar información veraz, exacta y actualizada, y
              es responsable de mantener la confidencialidad de su contraseña. Merkao podrá
              suspender o cancelar cuentas que incumplan estos Términos, contengan
              información falsa o sean utilizadas para fines fraudulentos.
            </p>
          </article>

          <article className="mk-legal-section">
            <h2>4. Obligaciones del vendedor</h2>
            <ul>
              <li>
                Contar con la condición legal y tributaria que le permita comercializar los
                productos ofertados (RUC activo cuando corresponda).
              </li>
              <li>
                Publicar información veraz, completa y exacta sobre cada producto (precio,
                descripción, stock, condiciones de garantía).
              </li>
              <li>
                Despachar los productos dentro de los plazos comprometidos y entregar el
                comprobante de pago electrónico (boleta o factura) conforme a las normas de
                SUNAT.
              </li>
              <li>
                Atender los reclamos, devoluciones y garantías de los productos vendidos,
                conforme a la Ley 29571.
              </li>
              <li>
                Respetar la propiedad intelectual de terceros y abstenerse de ofertar
                productos prohibidos por ley.
              </li>
            </ul>
          </article>

          <article className="mk-legal-section">
            <h2>5. Obligaciones del comprador</h2>
            <ul>
              <li>Proporcionar datos veraces de identidad, contacto y envío.</li>
              <li>Realizar el pago oportuno por los productos adquiridos.</li>
              <li>Confirmar la recepción del producto cuando el envío haya sido entregado.</li>
              <li>Hacer un uso responsable del servicio y respetar al vendedor.</li>
            </ul>
          </article>

          <article className="mk-legal-section">
            <h2>6. Precios, comisiones y formas de pago</h2>
            <p>
              Los precios mostrados en el marketplace son fijados por cada vendedor y se
              expresan en Soles (S/), incluyendo el IGV cuando corresponda. Los costos de
              envío se calculan y muestran antes de confirmar el pedido.
            </p>
            <p>
              Merkao podrá cobrar al comprador una <strong>comisión de servicio
              (buyer fee)</strong> de hasta el 3% del valor del pedido, la cual se mostrará
              de forma desagregada en el checkout antes del pago. Asimismo, Merkao cobra al
              vendedor una comisión sobre cada venta, según la categoría del producto, en
              los términos publicados en el panel del vendedor.
            </p>
            <p>
              Los pagos se procesan a través de <strong>Culqi S.A.C.</strong>, autorizado
              por el BCRP. Se aceptan tarjetas Visa, Mastercard, American Express, Yape,
              Plin y otros medios habilitados por la pasarela.
            </p>
          </article>

          <article className="mk-legal-section">
            <h2>7. Servicio de Pago Escrow</h2>
            <p>
              Merkao retiene el pago realizado por el comprador y lo libera al vendedor
              únicamente cuando: (i) el comprador confirma la recepción conforme del
              producto, o (ii) transcurridos siete (7) días calendario desde la entrega
              registrada por el courier sin que el comprador haya formulado observaciones.
              Más detalles del proceso se encuentran en{' '}
              <Link href="/como-funciona-escrow">Cómo funciona el Pago Escrow</Link>.
            </p>
          </article>

          <article className="mk-legal-section">
            <h2>8. Envíos y entrega</h2>
            <p>
              Los envíos se realizan a través de couriers asociados como{' '}
              <strong>Olva Courier</strong> y <strong>Shalom Empresarial</strong>, según
              cobertura. El plazo de entrega depende del destino y del courier seleccionado,
              y se informa al comprador antes de confirmar el pedido. El comprador podrá
              dar seguimiento al envío desde su sección{' '}
              <Link href="/mis-pedidos">Mis pedidos</Link>.
            </p>
          </article>

          <article className="mk-legal-section">
            <h2>9. Política de devoluciones y derecho de retracto</h2>
            <p>
              Conforme al artículo 59 de la Ley 29571, en las modalidades de venta fuera
              de establecimiento comercial (incluido el comercio electrónico), el
              consumidor tiene <strong>derecho de retracto</strong> dentro del plazo de{' '}
              <strong>siete (7) días calendario</strong> contados desde la recepción del
              producto, sin necesidad de expresión de causa.
            </p>
            <p>
              Para ejercer el retracto, el comprador deberá comunicarlo a{' '}
              <a href={`mailto:${PROVEEDOR.emailContacto}`}>{PROVEEDOR.emailContacto}</a>{' '}
              o desde su panel <Link href="/mis-pedidos">Mis pedidos</Link>, devolviendo el
              producto en su empaque original y en las condiciones recibidas. Los costos de
              devolución serán asumidos por el comprador, salvo que el producto presente
              defectos o no se ajuste a lo ofertado, en cuyo caso serán asumidos por el
              vendedor.
            </p>
            <p>
              No procede el derecho de retracto en los supuestos excluidos por ley
              (productos personalizados, bienes perecibles, contenidos digitales ya
              descargados, entre otros).
            </p>
          </article>

          <article className="mk-legal-section">
            <h2>10. Garantías y reclamos</h2>
            <p>
              Los productos cuentan con la garantía legal e implícita prevista por la Ley
              29571 y, cuando corresponda, con la garantía expresa ofrecida por el
              vendedor o el fabricante. En caso de disconformidad, el comprador podrá
              registrar su reclamo o queja en el{' '}
              <Link href="/libro-de-reclamaciones">Libro de Reclamaciones</Link>. Merkao
              responderá en un plazo no mayor a <strong>quince (15) días hábiles
              improrrogables</strong>, conforme al Reglamento del Libro de Reclamaciones
              (DS 011-2011-PCM).
            </p>
          </article>

          <article className="mk-legal-section">
            <h2>11. Propiedad intelectual</h2>
            <p>
              La marca <strong>Merkao</strong>, el dominio merkao.org, el diseño del sitio,
              los textos, gráficos, logotipos, código fuente y demás elementos del
              marketplace son propiedad de su titular o de quienes han autorizado su uso, y
              están protegidos por la legislación peruana e internacional de propiedad
              intelectual. Las marcas, fotografías y descripciones de los productos
              publicados por los vendedores son responsabilidad de cada vendedor, quien
              declara contar con los derechos para su publicación.
            </p>
          </article>

          <article className="mk-legal-section">
            <h2>12. Limitación de responsabilidad</h2>
            <p>
              Merkao actúa como intermediario y no asume responsabilidad por las
              características, calidad, idoneidad, garantía o cumplimiento de los productos
              ofertados por los vendedores, sin perjuicio de su obligación de mediar en las
              controversias mediante el Pago Escrow y de cumplir la normativa de protección
              al consumidor en lo que corresponde al titular del marketplace.
            </p>
          </article>

          <article className="mk-legal-section">
            <h2>13. Protección de datos personales</h2>
            <p>
              El tratamiento de los datos personales de los usuarios se rige por la{' '}
              <Link href="/privacidad">Política de Privacidad</Link>, la cual forma parte
              integrante de los presentes Términos.
            </p>
          </article>

          <article className="mk-legal-section">
            <h2>14. Modificaciones</h2>
            <p>
              Merkao se reserva el derecho de modificar los presentes Términos. Las
              modificaciones entrarán en vigencia desde su publicación en esta página, con
              la actualización de la fecha indicada al inicio. Cuando se trate de cambios
              sustanciales, se notificará a los usuarios registrados por los medios de
              contacto registrados.
            </p>
          </article>

          <article className="mk-legal-section">
            <h2>15. Ley aplicable y jurisdicción</h2>
            <p>
              Los presentes Términos se rigen por las <strong>leyes de la República del
              Perú</strong>. Cualquier controversia se someterá a los <strong>jueces y
              tribunales de Lima Cercado</strong>, salvo que la normativa de protección al
              consumidor disponga la competencia de Indecopi o de otro foro inderogable a
              favor del consumidor.
            </p>
          </article>

          <p className="mk-legal-foot">
            Para consultas sobre estos Términos, escríbenos a{' '}
            <a href={`mailto:${PROVEEDOR.emailContacto}`}>{PROVEEDOR.emailContacto}</a>.
          </p>
        </div>
      </main>
      <SiteFootnav />
    </>
  )
}
