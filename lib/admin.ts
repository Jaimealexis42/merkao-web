// Allowlist de admins de Merkao. Single source of truth para:
//   - guard cliente (page guards en /admin/*)
//   - validación de bearer en API routes /api/admin/*
//
// Agregar emails acá; NO hardcodear en archivos individuales.

const ADMIN_EMAIL_LIST = ['alexisaranap21@gmail.com'] as const

const ADMIN_EMAILS: ReadonlySet<string> = new Set(
  ADMIN_EMAIL_LIST.map((e) => e.toLowerCase()),
)

/**
 * Devuelve `true` si el email pertenece a la allowlist (case-insensitive).
 * Tolera `null`/`undefined`/string vacío sin tirar.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.has(email.toLowerCase())
}
