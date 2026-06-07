import type { Metadata } from 'next'
import ContactForm from '@/components/ContactForm'

export const metadata: Metadata = {
  title: 'Contacto · Merkao.pe',
  description:
    'Envíanos tu sugerencia, reclamo o consulta. También si quieres vender en Merkao, contáctanos.',
}

export default function ContactoPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>
      {/* Header sticky con el branding de Merkao */}
      <header className="sticky top-0 z-50 border-b border-white/10" style={{ backgroundColor: '#131921' }}>
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-0.5">
            <span className="text-white text-xl font-black">merkao</span>
            <span className="text-xl font-black" style={{ color: '#FF9900' }}>.pe</span>
          </a>
          <a
            href="/"
            className="text-xs text-gray-300 hover:text-white transition inline-flex items-center gap-1"
          >
            ← Volver al inicio
          </a>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
        <div className="text-center mb-8">
          <p className="text-xs font-black tracking-widest mb-2" style={{ color: '#FF9900' }}>
            CONTACTO
          </p>
          <h1 className="text-3xl sm:text-4xl font-black mb-3" style={{ color: '#131921' }}>
            ¿En qué te podemos ayudar?
          </h1>
          <p className="text-sm sm:text-base text-gray-600 max-w-lg mx-auto">
            Sugerencias, reclamos, consultas o si quieres vender en Merkao — escríbenos y te
            respondemos lo antes posible.
          </p>
        </div>

        <ContactForm />

        <div className="mt-8 grid sm:grid-cols-2 gap-3 text-xs text-gray-600">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="font-bold mb-1" style={{ color: '#131921' }}>📧 Respuesta rápida</p>
            <p>Te contestamos a tu email en 24-48 horas hábiles.</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="font-bold mb-1" style={{ color: '#131921' }}>🇵🇪 Hecho en Perú</p>
            <p>Marketplace 100% peruano. 0% de comisión al vendedor.</p>
          </div>
        </div>
      </div>

      <footer className="mt-12 py-6 px-4 text-center text-xs text-gray-500" style={{ backgroundColor: '#232f3e' }}>
        <p className="text-gray-400">© 2026 Merkao.pe — Hecho en Perú 🇵🇪</p>
      </footer>
    </main>
  )
}
