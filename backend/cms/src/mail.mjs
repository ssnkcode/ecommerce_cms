// ============================================================================
//  Módulo de correo (COMMERCE CMS)
//  ----------------------------------------------------------------------------
//  - En producción usa nodemailer + SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER,
//    SMTP_PASS, MAIL_FROM). Si no está configurado, se interpreta como fallback
//    de desarrollo: el "mail" se loguea por consola y el enlace se devuelve en
//    la respuesta de la API (devLink) para poder probar el flujo completo.
// ============================================================================

import 'dotenv/config'
import nodemailer from 'nodemailer'

// Remitente de los correos. Por defecto usa la dirección SMTP_USER (Gmail) con
// el nombre SsnkCode; MAIL_FROM lo sobreescribe si se quiere otra identidad.
const fromUser = process.env.SMTP_USER || 'no-reply'
const FROM = process.env.MAIL_FROM || `SsnkCode <${fromUser}>`

// Reply-To opcional: si MAIL_REPLY_TO está definido, las respuestas del usuario
// van a esa dirección (p. ej. un correo de "solo envío" / no-reply).
const REPLY_TO = process.env.MAIL_REPLY_TO || undefined

const smtpConfigured = Boolean(
  process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS,
)

let transporter = null
if (smtpConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
}

export function mailConfigured() {
  return smtpConfigured
}

// Devuelve una URL pública para acciones con token (verificar email, reset).
// FRONTEND_URL apunta a la home del catálogo (con su hash router).
export function actionUrl(token) {
  const base = (process.env.FRONTEND_URL || 'http://localhost:5178/catalog/catalog.html').replace(/\/+$/, '')
  return `${base}#${token}`
}

function buildVerificationLink(token) {
  return actionUrl(`/verificar/${token}`)
}

function buildResetLink(token) {
  return actionUrl(`/recuperar/${token}`)
}

export function buildVerificationEmail(email, token) {
  const link = buildVerificationLink(token)
  return {
    to: email,
    subject: 'Confirmá tu cuenta — Commerce CMS',
    text:
      `Confirmá tu correo para activar tu cuenta.\n\n` +
      `Hacé click en este enlace (o copialo en el navegador):\n${link}\n\n` +
      `Si no creaste una cuenta, ignorá este correo.\n`,
    html:
      `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e2e2e2;border-radius:10px">` +
      `<h2 style="margin-top:0">Confirmá tu cuenta</h2>` +
      `<p>Hacé click en el botón para activar tu cuenta en <strong>Commerce CMS</strong>:</p>` +
      `<p style="text-align:center"><a href="${link}" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none">Confirmar correo</a></p>` +
      `<p style="font-size:13px;color:#666">Si el botón no funciona, copiá este enlace:<br>${link}</p>` +
      `<p style="font-size:12px;color:#999">Si no creaste una cuenta, ignorá este correo.</p>` +
      `</div>`,
  }
}

export function buildResetEmail(email, token) {
  const link = buildResetLink(token)
  return {
    to: email,
    subject: 'Recuperá tu contraseña — Commerce CMS',
    text:
      `Pediste recuperar tu contraseña.\n\n` +
      `Hacé click en este enlace (o copialo en el navegador):\n${link}\n\n` +
      `El enlace vence en 1 hora. Si no lo pediste, ignorá este correo.\n`,
    html:
      `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e2e2e2;border-radius:10px">` +
      `<h2 style="margin-top:0">Recuperá tu contraseña</h2>` +
      `<p>Hacé click en el botón para elegir una contraseña nueva:</p>` +
      `<p style="text-align:center"><a href="${link}" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none">Crear contraseña nueva</a></p>` +
      `<p style="font-size:13px;color:#666">El enlace vence en <strong>1 hora</strong>.<br>Si el botón no funciona, copiá este enlace:<br>${link}</p>` +
      `<p style="font-size:12px;color:#999">Si no pediste recuperar la contraseña, ignorá este correo.</p>` +
      `</div>`,
  }
}

// Envía un correo. En dev (sin SMTP) loguea el contenido y devuelve { ok, devLink }.
export async function sendMail(message) {
  const link = /verificar\//.test(message.html) || /recuperar\//.test(message.html)
    ? (message.html.match(/https?:\/\/[^"<]+/) || [null])[0]
    : null

  if (!smtpConfigured) {
    console.log('\n----------------------------------------')
    console.log('[MAIL DEV] Para: ' + message.to)
    console.log('[MAIL DEV] Asunto: ' + message.subject)
    console.log('[MAIL DEV] Contenido:')
    console.log('  ' + message.text.split('\n').join('\n  '))
    console.log('----------------------------------------\n')
    return { ok: true, dev: true, devLink: link }
  }

  try {
    const mail = { from: FROM, ...message }
    if (REPLY_TO) mail.replyTo = REPLY_TO
    await transporter.sendMail(mail)
    return { ok: true }
  } catch (err) {
    console.error('[MAIL] Error enviando correo:', err.message)
    return { ok: false, error: 'No se pudo enviar el correo.' }
  }
}