'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { SiteTopnav, SiteFootnav } from '@/components/SiteShell'
import { PROVEEDOR } from '@/lib/reclamaciones'

type DocTipo = 'DNI' | 'CE' | 'PASAPORTE'
type BienTipo = 'PRODUCTO' | 'SERVICIO'
type ReclamoTipo = 'RECLAMO' | 'QUEJA'

type Estado =
  | { kind: 'editando' }
  | { kind: 'enviando' }
  | { kind: 'exito'; codigo: string; fecha: string; constanciaEnviada: boolean; emailUsuario: string }
  | { kind: 'error'; msg: string }

export default function LibroReclamacionesPage() {
  const fechaActual = useMemo(
    () =>
      new Date().toLocaleString('es-PE', {
        timeZone: 'America/Lima',
        dateStyle: 'long',
        timeStyle: 'short',
      }),
    [],
  )

  // Consumidor
  const [nombre, setNombre] = useState('')
  const [documentoTipo, setDocumentoTipo] = useState<DocTipo>('DNI')
  const [documentoNum, setDocumentoNum] = useState('')
  const [domicilio, setDomicilio] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [esMenor, setEsMenor] = useState(false)
  const [apoderadoNombre, setApoderadoNombre] = useState('')
  const [apoderadoDocumento, setApoderadoDocumento] = useState('')

  // Bien
  const [bienTipo, setBienTipo] = useState<BienTipo>('PRODUCTO')
  const [bienMonto, setBienMonto] = useState('')
  const [bienDescripcion, setBienDescripcion] = useState('')

  // Reclamo
  const [tipo, setTipo] = useState<ReclamoTipo>('RECLAMO')
  const [detalle, setDetalle] = useState('')
  const [pedidoConsumidor, setPedidoConsumidor] = useState('')
  const [acepta, setAcepta] = useState(false)

  const [estado, setEstado] = useState<Estado>({ kind: 'editando' })

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (estado.kind === 'enviando') return
    if (!acepta) {
      setEstado({ kind: 'error', msg: 'Debes confirmar la veracidad de los datos.' })
      return
    }
    setEstado({ kind: 'enviando' })
    try {
      const res = await fetch('/api/reclamaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          documentoTipo,
          documentoNum,
          domicilio,
          telefono,
          email,
          esMenor,
          apoderadoNombre: esMenor ? apoderadoNombre : undefined,
          apoderadoDocumento: esMenor ? apoderadoDocumento : undefined,
          bienTipo,
          bienMonto: Number(bienMonto || 0),
          bienDescripcion,
          tipo,
          detalle,
          pedidoConsumidor,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean
        codigo?: string
        fechaReclamo?: string
        constanciaEnviada?: boolean
        error?: string
      }
      if (!res.ok || !data.success || !data.codigo) {
        setEstado({ kind: 'error', msg: data.error ?? 'No se pudo registrar el reclamo.' })
        return
      }
      setEstado({
        kind: 'exito',
        codigo: data.codigo,
        fecha: data.fechaReclamo ?? new Date().toISOString(),
        constanciaEnviada: data.constanciaEnviada === true,
        emailUsuario: email,
      })
    } catch (err) {
      setEstado({
        kind: 'error',
        msg: err instanceof Error ? err.message : 'Error de red.',
      })
    }
  }

  if (estado.kind === 'exito') {
    const fechaFmt = new Date(estado.fecha).toLocaleString('es-PE', {
      timeZone: 'America/Lima',
      dateStyle: 'long',
      timeStyle: 'short',
    })
    return (
      <>
        <SiteTopnav />
        <main className="mk-libro">
          <div className="mk-libro-wrap">
            <div className="mk-libro-success">
              <div className="mk-libro-success-icon">✓</div>
              <h1>Reclamo registrado</h1>
              <p className="mk-libro-success-lead">
                Tu reclamo quedó asentado en el Libro de Reclamaciones de Merkao.
              </p>
              <div className="mk-libro-codigo">
                <div className="mk-libro-codigo-label">Código de registro</div>
                <div className="mk-libro-codigo-val">{estado.codigo}</div>
                <div className="mk-libro-codigo-fecha">Fecha: {fechaFmt}</div>
              </div>
              {estado.constanciaEnviada ? (
                <p className="mk-libro-success-info">
                  Te enviamos una <strong>constancia por correo</strong> a {estado.emailUsuario}.
                  Conserva el código como respaldo.
                </p>
              ) : (
                <p className="mk-libro-success-warn">
                  Tu reclamo fue registrado, pero la constancia por correo no pudo enviarse en
                  este momento. Conserva el código <strong>{estado.codigo}</strong> y escríbenos
                  a <a href={`mailto:${PROVEEDOR.emailContacto}`}>{PROVEEDOR.emailContacto}</a>{' '}
                  si necesitas el comprobante.
                </p>
              )}
              <p className="mk-libro-success-plazo">
                Merkao tiene un plazo no mayor a <strong>15 días hábiles improrrogables</strong>{' '}
                para responderte (Ley 29571).
              </p>
              <div className="mk-libro-success-actions">
                <Link href="/" className="mk-btn mk-btn-primary">Volver al inicio</Link>
                <button
                  type="button"
                  className="mk-btn mk-btn-ghost"
                  onClick={() => window.print()}
                >
                  Imprimir constancia
                </button>
              </div>
            </div>
          </div>
        </main>
        <SiteFootnav />
      </>
    )
  }

  const enviando = estado.kind === 'enviando'

  return (
    <>
      <SiteTopnav />
      <main className="mk-libro">
        <div className="mk-libro-wrap">
          <header className="mk-libro-head">
            <h1>Libro de Reclamaciones</h1>
            <p>
              Conforme a la <strong>Ley 29571</strong>, Código de Protección y Defensa del
              Consumidor, <strong>Merkao cuenta con Libro de Reclamaciones</strong>.
              Registra aquí tu reclamo o queja y recibirás constancia por correo electrónico.
            </p>
          </header>

          <form className="mk-libro-form" onSubmit={onSubmit} noValidate>
            {/* Proveedor */}
            <section className="mk-libro-section">
              <h2>1. Datos del proveedor</h2>
              <dl className="mk-libro-prov">
                <div><dt>Titular</dt><dd>{PROVEEDOR.titular}</dd></div>
                <div><dt>Nombre comercial</dt><dd>{PROVEEDOR.nombreComercial}</dd></div>
                <div><dt>RUC</dt><dd>{PROVEEDOR.ruc}</dd></div>
                <div><dt>Email de contacto</dt><dd>{PROVEEDOR.emailContacto}</dd></div>
                <div><dt>Domicilio</dt><dd>{PROVEEDOR.domicilio}</dd></div>
                <div><dt>Fecha del reclamo</dt><dd>{fechaActual}</dd></div>
              </dl>
            </section>

            {/* Consumidor */}
            <section className="mk-libro-section">
              <h2>2. Datos del consumidor</h2>
              <div className="mk-libro-grid">
                <label className="mk-libro-field mk-libro-field-full">
                  <span>Nombre y apellidos *</span>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                  />
                </label>

                <label className="mk-libro-field">
                  <span>Tipo de documento *</span>
                  <select
                    value={documentoTipo}
                    onChange={(e) => setDocumentoTipo(e.target.value as DocTipo)}
                  >
                    <option value="DNI">DNI</option>
                    <option value="CE">Carnet de Extranjería</option>
                    <option value="PASAPORTE">Pasaporte</option>
                  </select>
                </label>

                <label className="mk-libro-field">
                  <span>N° de documento *</span>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    value={documentoNum}
                    onChange={(e) => setDocumentoNum(e.target.value.replace(/\s/g, ''))}
                  />
                </label>

                <label className="mk-libro-field mk-libro-field-full">
                  <span>Domicilio *</span>
                  <input
                    type="text"
                    required
                    maxLength={300}
                    value={domicilio}
                    onChange={(e) => setDomicilio(e.target.value)}
                  />
                </label>

                <label className="mk-libro-field">
                  <span>Teléfono *</span>
                  <input
                    type="tel"
                    required
                    maxLength={30}
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                  />
                </label>

                <label className="mk-libro-field">
                  <span>Email * (recibirás la constancia)</span>
                  <input
                    type="email"
                    required
                    maxLength={200}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>

                <label className="mk-libro-check mk-libro-field-full">
                  <input
                    type="checkbox"
                    checked={esMenor}
                    onChange={(e) => setEsMenor(e.target.checked)}
                  />
                  <span>El consumidor es menor de edad</span>
                </label>

                {esMenor && (
                  <>
                    <label className="mk-libro-field mk-libro-field-full">
                      <span>Nombre del padre, madre o apoderado *</span>
                      <input
                        type="text"
                        required
                        maxLength={200}
                        value={apoderadoNombre}
                        onChange={(e) => setApoderadoNombre(e.target.value)}
                      />
                    </label>
                    <label className="mk-libro-field mk-libro-field-full">
                      <span>DNI / documento del apoderado *</span>
                      <input
                        type="text"
                        required
                        maxLength={30}
                        value={apoderadoDocumento}
                        onChange={(e) => setApoderadoDocumento(e.target.value)}
                      />
                    </label>
                  </>
                )}
              </div>
            </section>

            {/* Bien */}
            <section className="mk-libro-section">
              <h2>3. Identificación del bien contratado</h2>
              <div className="mk-libro-grid">
                <label className="mk-libro-field">
                  <span>Tipo *</span>
                  <select
                    value={bienTipo}
                    onChange={(e) => setBienTipo(e.target.value as BienTipo)}
                  >
                    <option value="PRODUCTO">Producto</option>
                    <option value="SERVICIO">Servicio</option>
                  </select>
                </label>
                <label className="mk-libro-field">
                  <span>Monto reclamado (S/) *</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={bienMonto}
                    onChange={(e) => setBienMonto(e.target.value)}
                  />
                </label>
                <label className="mk-libro-field mk-libro-field-full">
                  <span>Descripción del bien o servicio *</span>
                  <textarea
                    required
                    rows={3}
                    maxLength={1000}
                    value={bienDescripcion}
                    onChange={(e) => setBienDescripcion(e.target.value)}
                  />
                </label>
              </div>
            </section>

            {/* Reclamo */}
            <section className="mk-libro-section">
              <h2>4. Detalle del reclamo o queja</h2>

              <div className="mk-libro-tipo">
                <label className={'mk-libro-tipo-opt' + (tipo === 'RECLAMO' ? ' on' : '')}>
                  <input
                    type="radio"
                    name="tipo"
                    value="RECLAMO"
                    checked={tipo === 'RECLAMO'}
                    onChange={() => setTipo('RECLAMO')}
                  />
                  <div>
                    <strong>RECLAMO</strong>
                    <p>Disconformidad con el producto o servicio recibido.</p>
                  </div>
                </label>
                <label className={'mk-libro-tipo-opt' + (tipo === 'QUEJA' ? ' on' : '')}>
                  <input
                    type="radio"
                    name="tipo"
                    value="QUEJA"
                    checked={tipo === 'QUEJA'}
                    onChange={() => setTipo('QUEJA')}
                  />
                  <div>
                    <strong>QUEJA</strong>
                    <p>Malestar respecto a la atención recibida (no por el bien).</p>
                  </div>
                </label>
              </div>

              <label className="mk-libro-field mk-libro-field-full">
                <span>Detalle del {tipo === 'RECLAMO' ? 'reclamo' : 'queja'} *</span>
                <textarea
                  required
                  rows={5}
                  maxLength={4000}
                  value={detalle}
                  onChange={(e) => setDetalle(e.target.value)}
                />
              </label>

              <label className="mk-libro-field mk-libro-field-full">
                <span>Pedido concreto del consumidor *</span>
                <textarea
                  required
                  rows={4}
                  maxLength={4000}
                  placeholder="Qué solicitas: devolución, cambio, reembolso, etc."
                  value={pedidoConsumidor}
                  onChange={(e) => setPedidoConsumidor(e.target.value)}
                />
              </label>
            </section>

            {/* Declaración */}
            <section className="mk-libro-section">
              <label className="mk-libro-check mk-libro-field-full">
                <input
                  type="checkbox"
                  required
                  checked={acepta}
                  onChange={(e) => setAcepta(e.target.checked)}
                />
                <span>
                  Declaro bajo juramento que los datos consignados son verdaderos. Autorizo
                  a Merkao a comunicarse conmigo por el correo y teléfono indicados para
                  atender este reclamo.
                </span>
              </label>
            </section>

            {estado.kind === 'error' && (
              <div className="mk-libro-error" role="alert">{estado.msg}</div>
            )}

            <div className="mk-libro-actions">
              <button
                type="submit"
                className="mk-btn mk-btn-primary"
                disabled={enviando}
              >
                {enviando ? 'Enviando…' : 'Enviar reclamo'}
              </button>
              <Link href="/" className="mk-btn mk-btn-ghost">Cancelar</Link>
            </div>

            <p className="mk-libro-foot">
              El proveedor tiene un plazo no mayor a 15 días hábiles improrrogables para
              atender el reclamo (Ley 29571).
            </p>
          </form>
        </div>
      </main>
      <SiteFootnav />
    </>
  )
}
