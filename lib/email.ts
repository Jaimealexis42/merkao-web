// Envío de email transaccional vía Gmail SMTP (nodemailer).
//
// ── CONFIGURACIÓN ──
// Variables de entorno (.env.local + Vercel):
//   GMAIL_USER          = merkao.org@gmail.com
//   GMAIL_APP_PASSWORD  = contraseña de aplicación de 16 caracteres
//                         (NO es la contraseña normal de Gmail; requiere 2FA
//                          activado en la cuenta. Ver README del módulo).
//
// ── COMPORTAMIENTO SI FALTA CONFIGURACIÓN ──
// Si GMAIL_USER o GMAIL_APP_PASSWORD están vacíos, sendEmail() devuelve
//   { ok: false, reason: 'not_configured' }
// SIN tirar excepción. El caller (`/api/reclamaciones`) ya está preparado:
// guarda el reclamo en DB igual, marca `constancia_enviada = false` y deja
// `constancia_error = 'email_no_configurado'`. El reclamo queda registrado
// (cumplimiento Indecopi), solo no se envía la constancia.

import nodemailer, { type Transporter } from 'nodemailer'

export type EmailMessage = {
  to: string
  cc?: string[]
  subject: string
  html: string
  text: string
}

export type SendResult =
  | { ok: true; provider: string; id?: string }
  | { ok: false; reason: 'not_configured' | 'failed'; error?: string }

// Reutilizamos el transporter entre invocaciones tibias del lambda. nodemailer
// abre conexiones SMTP perezosamente, así que mantener la instancia evita
// reabrir el handshake TLS en cada email.
let _transporter: Transporter | null = null
function getTransporter(user: string, pass: string): Transporter {
  if (_transporter) return _transporter
  _transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS en 587 (true sería SMTPS en 465)
    auth: { user, pass },
  })
  return _transporter
}

export async function sendEmail(msg: EmailMessage): Promise<SendResult> {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD

  if (!user || !pass) {
    console.warn(
      '[email] Gmail SMTP no configurado. Email NO enviado:',
      JSON.stringify({ to: msg.to, cc: msg.cc, subject: msg.subject }),
    )
    return { ok: false, reason: 'not_configured' }
  }

  try {
    const transporter = getTransporter(user, pass)
    const info = await transporter.sendMail({
      from: `Merkao <${user}>`,
      to: msg.to,
      cc: msg.cc,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    })
    return { ok: true, provider: 'gmail-smtp', id: info.messageId }
  } catch (e) {
    return {
      ok: false,
      reason: 'failed',
      error: e instanceof Error ? e.message : String(e),
    }
  }
}
