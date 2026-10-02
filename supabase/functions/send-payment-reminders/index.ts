import { createClient } from 'npm:@supabase/supabase-js@2'
import { Resend } from 'npm:resend@6.32.0'

type ReminderPayment = {
  id?: string | number
  fecha_pago?: string | null
  proximo_pago?: string | null
}

type ReminderCompany = {
  id: string
  nombre: string
  rut: string
  email: string | null
  estado: string
  pagos?: ReminderPayment[] | null
}

type EmailContent = {
  subject: string
  text: string
  html: string
}

const DAY_MS = 86_400_000
const REMINDER_WINDOW_DAYS = 5
const PAGE_SIZE = 500
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: CORS_HEADERS })
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysUntil(dateValue: string, today: string): number | null {
  const normalizedDate = dateValue.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) return null

  const dueTime = Date.parse(`${normalizedDate}T00:00:00Z`)
  const todayTime = Date.parse(`${today}T00:00:00Z`)
  if (Number.isNaN(dueTime) || Number.isNaN(todayTime)) return null

  return Math.round((dueTime - todayTime) / DAY_MS)
}

function nextPayment(company: ReminderCompany): ReminderPayment | undefined {
  return [...(company.pagos ?? [])]
    .sort((first, second) => (second.fecha_pago ?? '').localeCompare(first.fecha_pago ?? ''))
    .find((payment) => Boolean(payment.proximo_pago))
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character)
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`))
}

function reminderContent(company: ReminderCompany, dueDate: string) {
  const name = escapeHtml(company.nombre)
  const rut = escapeHtml(company.rut)
  const date = escapeHtml(formatDate(dueDate))

  return {
    subject: `Recordatorio de pago próximo: ${company.nombre}`,
    text: `Hola,\n\nTe recordamos que el próximo pago de ${company.nombre} (RUT ${company.rut}) vence el ${formatDate(dueDate)}.\n\nSaludos.`,
    html: `<p>Hola,</p><p>Te recordamos que el próximo pago de <strong>${name}</strong> (RUT ${rut}) vence el <strong>${date}</strong>.</p><p>Saludos.</p>`,
  }
}

function testEmailContent(company: ReminderCompany): EmailContent {
  const name = escapeHtml(company.nombre)
  const rut = escapeHtml(company.rut)

  return {
    subject: `Prueba de correo: ${company.nombre}`,
    text: `Este es un correo de prueba enviado a ${company.nombre} (RUT ${company.rut}).`,
    html: `<p>Este es un correo de prueba enviado a <strong>${name}</strong> (RUT ${rut}).</p>`,
  }
}

function getBearerToken(request: Request): string | null {
  return request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null
}

async function sendEmail(
  resend: Resend,
  from: string,
  to: string,
  content: EmailContent,
  idempotencyKey: string,
): Promise<void> {
  const { error } = await resend.emails.send(
    { from, to: [to], ...content },
    { idempotencyKey },
  )
  if (error) throw new Error(error.message)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido.' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const emailFrom = Deno.env.get('EMAIL_FROM')

  if (!supabaseUrl || !serviceRoleKey || !resendApiKey || !emailFrom) {
    console.error('Falta configurar una variable requerida para los recordatorios por correo.')
    return jsonResponse({ error: 'Configuración de correo incompleta.' }, 500)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const resend = new Resend(resendApiKey)
  const body = await request.json().catch(() => null) as { mode?: string; companyId?: unknown } | null
  const bearerToken = getBearerToken(request)

  if (body?.mode === 'test') {
    if (!bearerToken) {
      return jsonResponse({ error: 'Debes iniciar sesión para enviar una prueba.' }, 401)
    }

    const { data: userData, error: authError } = await supabase.auth.getUser(bearerToken)
    if (authError || !userData.user) {
      return jsonResponse({ error: 'La sesión no es válida o ha expirado.' }, 401)
    }

    const companyId = typeof body.companyId === 'string' ? body.companyId.trim() : ''
    if (!companyId) return jsonResponse({ error: 'Empresa no válida.' }, 400)

    const { data, error } = await supabase
      .from('empresas')
      .select('id, nombre, rut, email, estado')
      .eq('id', companyId)
      .eq('estado', 'VIGENTE')
      .not('email', 'is', null)
      .maybeSingle()

    if (error) {
      console.error('No se pudo validar la empresa para el correo de prueba:', error.message)
      return jsonResponse({ error: 'No se pudo validar la empresa.' }, 500)
    }
    if (!data) {
      return jsonResponse({ error: 'La empresa no existe o no está VIGENTE.' }, 404)
    }

    const company = data as ReminderCompany
    const email = company.email?.trim() ?? ''
    if (!isValidEmail(email)) {
      return jsonResponse({ error: 'La empresa no tiene un correo válido registrado.' }, 422)
    }

    try {
      await sendEmail(
        resend,
        emailFrom,
        email,
        testEmailContent(company),
        `company-email-test-${company.id}-${crypto.randomUUID()}`,
      )
    } catch (sendError) {
      console.error(`No se pudo enviar el correo de prueba a empresa ${company.id}:`, sendError)
      return jsonResponse({ error: 'Resend no pudo enviar el correo de prueba.' }, 502)
    }

    return jsonResponse({ sent: true, companyId: company.id })
  }

  if (bearerToken !== serviceRoleKey) {
    return jsonResponse({ error: 'Sólo el proceso programado puede enviar recordatorios.' }, 403)
  }

  const today = todayUtc()
  let sent = 0
  let skipped = 0
  let failed = 0
  let lastCompanyId: string | null = null

  try {
    for (;;) {
      let candidatesQuery = supabase
        .from('empresas')
        .select('id')
        .eq('estado', 'VIGENTE')
        .not('email', 'is', null)
        .order('id', { ascending: true })
      if (lastCompanyId) candidatesQuery = candidatesQuery.gt('id', lastCompanyId)

      const { data, error } = await candidatesQuery.limit(PAGE_SIZE)

      if (error) throw error
      const candidates = (data ?? []) as Pick<ReminderCompany, 'id'>[]
      if (candidates.length === 0) break
      lastCompanyId = candidates[candidates.length - 1].id

      for (const candidate of candidates) {
        const { data: companyData, error: companyError } = await supabase
          .from('empresas')
          .select('id, nombre, rut, email, estado, pagos(id, fecha_pago, proximo_pago)')
          .eq('id', candidate.id)
          .eq('estado', 'VIGENTE')
          .not('email', 'is', null)
          .maybeSingle()

        if (companyError) {
          failed += 1
          console.error(`No se pudo revalidar empresa ${candidate.id}:`, companyError.message)
          continue
        }
        if (!companyData) {
          skipped += 1
          continue
        }

        const company = companyData as ReminderCompany
        const email = company.email?.trim() ?? ''
        if (!email || !isValidEmail(email)) {
          skipped += 1
          continue
        }

        const payment = nextPayment(company)
        const dueDate = payment?.proximo_pago?.slice(0, 10)
        const dueInDays = dueDate ? daysUntil(dueDate, today) : null
        if (!dueDate || dueInDays === null || dueInDays < 0 || dueInDays > REMINDER_WINDOW_DAYS) {
          skipped += 1
          continue
        }

        const { error: reservationError } = await supabase
          .from('payment_email_reminders')
          .insert({ empresa_id: company.id, fecha_recordatorio: today, fecha_vencimiento: dueDate })

        if (reservationError?.code === '23505') {
          skipped += 1
          continue
        }
        if (reservationError) {
          failed += 1
          console.error(`No se pudo reservar recordatorio para empresa ${company.id}:`, reservationError.message)
          continue
        }

        try {
          await sendEmail(
            resend,
            emailFrom,
            email,
            reminderContent(company, dueDate),
            `payment-reminder-${company.id}-${today}`,
          )
        } catch (sendError) {
          await supabase
            .from('payment_email_reminders')
            .delete()
            .eq('empresa_id', company.id)
            .eq('fecha_recordatorio', today)
          failed += 1
          console.error(`No se pudo enviar recordatorio a empresa ${company.id}:`, sendError)
          continue
        }

        const { error: sentAtError } = await supabase
          .from('payment_email_reminders')
          .update({ sent_at: new Date().toISOString() })
          .eq('empresa_id', company.id)
          .eq('fecha_recordatorio', today)

        if (sentAtError) {
          failed += 1
          console.error(`Correo enviado, pero no se pudo registrar empresa ${company.id}:`, sentAtError.message)
          continue
        }
        sent += 1
      }

      if (candidates.length < PAGE_SIZE) break
    }
  } catch (error) {
    console.error('Falló la ejecución de recordatorios de pago:', error)
    return jsonResponse({ error: 'No se pudieron procesar los recordatorios.' }, 500)
  }

  return jsonResponse({ date: today, sent, skipped, failed }, failed > 0 ? 500 : 200)
})
