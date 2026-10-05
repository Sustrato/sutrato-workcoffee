import { createClient } from 'npm:@supabase/supabase-js@2'
import { Resend } from 'npm:resend@6.32.0'

const CODE_LENGTH = 6
const CODE_LIFETIME_MS = 10 * 60 * 1000
const MAX_CODE_ATTEMPTS = 5
const CHALLENGES_TABLE = 'trusted_device_challenges'
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-region, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

interface VerificationChallenge {
  user_id: string
  challenge_id: string
  ip_address: string
  user_agent: string
  device_hash: string
  code_hash: string
  attempts: number
  created_at: string
  expires_at: string
}

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: CORS_HEADERS })
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return null
  return authorization.slice('Bearer '.length)
}

function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = request.headers.get('cf-connecting-ip')?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || forwarded
  if (!ip || ip.length > 64 || !/^[\da-fA-F:.]+$/.test(ip)) return null
  return ip
}

function generateCode(): string {
  const range = 0x1_0000_0000
  const limit = Math.floor(range / 1_000_000) * 1_000_000
  const random = new Uint32Array(1)
  do {
    crypto.getRandomValues(random)
  } while (random[0] >= limit)
  return String(random[0] % 1_000_000).padStart(CODE_LENGTH, '0')
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function safeEqual(first: string, second: string): boolean {
  if (first.length !== second.length) return false
  let difference = 0
  for (let index = 0; index < first.length; index += 1) {
    difference |= first.charCodeAt(index) ^ second.charCodeAt(index)
  }
  return difference === 0
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

async function sendVerificationEmail(
  resend: Resend,
  emailFrom: string,
  email: string,
  code: string,
): Promise<void> {
  const { error } = await resend.emails.send({
    from: emailFrom,
    to: [email],
    subject: 'Código de verificación de Sutrato WorkCoffee',
    text: `Tu código de verificación es ${code}. Vence en 10 minutos. Si no solicitaste este código, puedes ignorar este correo.`,
    html: `<div style="font-family:Arial,sans-serif;color:#1e293b"><h2>Verifica tu dispositivo</h2><p>Ingresa este código para completar el inicio de sesión:</p><p style="font-size:28px;font-weight:700;letter-spacing:8px">${code}</p><p>El código vence en 10 minutos. Si no solicitaste este código, puedes ignorar este correo.</p></div>`,
  })
  if (error) throw new Error(error.message)
}

Deno.serve(async (request: Request) => {
  try {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (request.method !== 'POST') return jsonResponse({ error: 'Método no permitido.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const emailFrom = Deno.env.get('EMAIL_FROM')
  if (!supabaseUrl || !serviceRoleKey || !resendApiKey || !emailFrom) {
    console.error('Falta configurar una variable requerida para la verificación de dispositivos.')
    return jsonResponse({ error: 'La verificación por correo no está configurada.' }, 500)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const ipAddress = getClientIp(request)
  const userAgent = request.headers.get('user-agent')?.trim() ?? ''
  if (!ipAddress) return jsonResponse({ error: 'No se pudo determinar una dirección IP válida para el dispositivo.' }, 400)
  if (!userAgent || userAgent.length > 1024) return jsonResponse({ error: 'No se pudo identificar el navegador de este dispositivo.' }, 400)

  let body: { action?: unknown; challengeId?: unknown; code?: unknown; deviceId?: unknown }
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'La solicitud de verificación no es válida.' }, 400)
  }
  const action = body.action
  if (action !== 'check' && action !== 'verify') return jsonResponse({ error: 'Acción de verificación no válida.' }, 400)
  const deviceId = typeof body.deviceId === 'string' ? body.deviceId : ''
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(deviceId)) {
    return jsonResponse({ error: 'No se pudo identificar de forma segura este navegador.' }, 400)
  }

  const deviceHash = await sha256(deviceId)
  let userId = ''
  let userEmail = ''
  if (action === 'check') {
    const bearerToken = getBearerToken(request)
    if (!bearerToken) return jsonResponse({ error: 'Debes iniciar sesión para verificar este dispositivo.' }, 401)

    const { data: userData, error: authError } = await supabase.auth.getUser(bearerToken)
    if (authError || !userData.user) return jsonResponse({ error: 'La sesión no es válida o ha expirado.' }, 401)
    userId = userData.user.id
    userEmail = userData.user.email ?? ''
  }

  if (action === 'check') {
    const [trustedByIpResult, trustedByDeviceResult] = await Promise.all([
      supabase
        .from('trusted_devices')
        .select('id')
        .eq('user_id', userId)
        .eq('ip_address', ipAddress)
        .limit(1)
        .maybeSingle(),
      supabase
        .from('trusted_devices')
        .select('id')
        .eq('user_id', userId)
        .eq('device_hash', deviceHash)
        .limit(1)
        .maybeSingle(),
    ])
    const trustedDeviceQueryError = trustedByIpResult.error ?? trustedByDeviceResult.error
    if (trustedDeviceQueryError) {
      console.warn('No se pudo consultar trusted_devices; se continuará como dispositivo nuevo:', {
        userId,
        code: trustedDeviceQueryError.code,
        message: trustedDeviceQueryError.message,
        details: trustedDeviceQueryError.details,
        hint: trustedDeviceQueryError.hint,
      })
    }

    const trustedByIp = trustedByIpResult.data
    const trustedByDevice = trustedByDeviceResult.data
    if (!trustedDeviceQueryError && (trustedByIp || trustedByDevice)) {
      const { error: trustUpdateError } = await supabase
        .from('trusted_devices')
        .upsert({
          user_id: userId,
          ip_address: ipAddress,
          user_agent: userAgent,
          device_hash: deviceHash,
          last_seen_at: new Date().toISOString(),
        }, { onConflict: 'user_id, device_hash' })
      if (trustUpdateError) {
        console.error('No se pudo actualizar el dispositivo de confianza:', trustUpdateError.message)
        return jsonResponse({ error: 'No se pudo actualizar el dispositivo de confianza.' }, 500)
      }
      return jsonResponse({ trusted: true })
    }

    const { data: existingChallenge, error: challengeQueryError } = await supabase
      .from(CHALLENGES_TABLE)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (challengeQueryError) {
      console.error(`No se pudo consultar ${CHALLENGES_TABLE}:`, {
        userId,
        code: challengeQueryError.code,
        message: challengeQueryError.message,
        details: challengeQueryError.details,
        hint: challengeQueryError.hint,
      })
      return jsonResponse({ error: 'No se pudo consultar el desafío de verificación.' }, 500)
    }

    if (existingChallenge && new Date(existingChallenge.expires_at).getTime() > Date.now()) {
      const challenge = existingChallenge as VerificationChallenge
      if (challenge.ip_address === ipAddress && challenge.device_hash === deviceHash) {
        if (challenge.attempts >= MAX_CODE_ATTEMPTS) {
          return jsonResponse({ error: 'Se agotaron los intentos. Espera a que venza el código para iniciar sesión nuevamente.' }, 429)
        }
        return jsonResponse({
          trusted: false,
          verificationRequired: true,
          challengeId: challenge.challenge_id,
          email: userEmail,
        })
      }
      if (Date.now() - new Date(challenge.created_at).getTime() < 60_000) {
        return jsonResponse({ error: 'Se inició otra verificación hace poco. Espera un minuto antes de volver a intentarlo.' }, 429)
      }
      const { error: oldChallengeError } = await supabase
        .from(CHALLENGES_TABLE)
        .delete()
        .eq('user_id', userId)
        .eq('challenge_id', challenge.challenge_id)
      if (oldChallengeError) {
        console.error('No se pudo reemplazar el código de verificación:', oldChallengeError.message)
        return jsonResponse({ error: 'No se pudo iniciar una nueva verificación.' }, 500)
      }
    } else if (existingChallenge) {
      await supabase
        .from(CHALLENGES_TABLE)
        .delete()
        .eq('user_id', userId)
        .eq('challenge_id', existingChallenge.challenge_id)
    }

    const email = userEmail.trim()
    if (!isValidEmail(email)) return jsonResponse({ error: 'La cuenta no tiene un correo válido para recibir el código.' }, 422)

    const challengeId = crypto.randomUUID()
    const code = generateCode()
    const { error: insertError } = await supabase
      .from(CHALLENGES_TABLE)
      .insert({
        user_id: userId,
        challenge_id: challengeId,
        ip_address: ipAddress,
        user_agent: userAgent,
        device_hash: deviceHash,
        code_hash: await sha256(`${challengeId}:${code}`),
        attempts: 0,
        expires_at: new Date(Date.now() + CODE_LIFETIME_MS).toISOString(),
      })
    if (insertError) {
      const { data: concurrentChallenge } = await supabase
        .from(CHALLENGES_TABLE)
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      if (
        concurrentChallenge
        && concurrentChallenge.ip_address === ipAddress
        && concurrentChallenge.device_hash === deviceHash
        && new Date(concurrentChallenge.expires_at).getTime() > Date.now()
      ) {
        return jsonResponse({
          trusted: false,
          verificationRequired: true,
          challengeId: concurrentChallenge.challenge_id,
          email,
        })
      }
      console.error('No se pudo guardar el código de verificación:', insertError.message)
      return jsonResponse({ error: 'No se pudo iniciar la verificación por correo. Intenta nuevamente.' }, 500)
    }

    try {
      await sendVerificationEmail(new Resend(resendApiKey), emailFrom, email, code)
    } catch (sendError) {
      await supabase
        .from(CHALLENGES_TABLE)
        .delete()
        .eq('user_id', userId)
        .eq('challenge_id', challengeId)
      console.error('Resend no pudo enviar el código de verificación:', sendError)
      return jsonResponse({ error: 'No se pudo enviar el código de verificación. Intenta nuevamente.' }, 502)
    }

    return jsonResponse({
      trusted: false,
      verificationRequired: true,
      challengeId,
      email,
    })
  }

  const challengeId = typeof body.challengeId === 'string' ? body.challengeId : ''
  const code = typeof body.code === 'string' ? body.code : ''
  if (!/^[0-9a-f-]{36}$/i.test(challengeId) || !/^\d{6}$/.test(code)) {
    return jsonResponse({ error: 'El código de verificación no es válido.' }, 400)
  }

  const { data: challengeData, error: challengeError } = await supabase
    .from(CHALLENGES_TABLE)
    .select('*')
    .eq('challenge_id', challengeId)
    .maybeSingle()
  if (challengeError) {
    console.error('No se pudo consultar la verificación pendiente:', challengeError.message)
    return jsonResponse({ error: 'No se pudo validar el código de verificación.' }, 500)
  }
  if (!challengeData) return jsonResponse({ error: 'El código venció o ya fue utilizado. Inicia sesión nuevamente.' }, 410)

  const challenge = challengeData as VerificationChallenge
  if (new Date(challenge.expires_at).getTime() <= Date.now()) {
    await supabase.from(CHALLENGES_TABLE).delete().eq('user_id', challenge.user_id).eq('challenge_id', challengeId)
    return jsonResponse({ error: 'El código venció. Inicia sesión nuevamente para recibir uno nuevo.' }, 410)
  }
  if (challenge.attempts >= MAX_CODE_ATTEMPTS) {
    return jsonResponse({ error: 'Se agotaron los intentos. Espera a que venza el código para iniciar sesión nuevamente.' }, 429)
  }
  if (challenge.ip_address !== ipAddress || challenge.device_hash !== deviceHash) {
    return jsonResponse({ error: 'La red o el navegador cambió durante la verificación. Inicia sesión nuevamente.' }, 409)
  }

  const submittedHash = await sha256(`${challengeId}:${code}`)
  if (!safeEqual(submittedHash, challenge.code_hash)) {
    const nextAttemptCount = challenge.attempts + 1
    const { data: updatedAttempt, error: attemptError } = await supabase
      .from(CHALLENGES_TABLE)
      .update({ attempts: nextAttemptCount })
      .eq('user_id', challenge.user_id)
      .eq('challenge_id', challengeId)
      .eq('attempts', challenge.attempts)
      .select('challenge_id')
      .maybeSingle()
    if (attemptError) {
      console.error('No se pudo actualizar el contador de intentos:', attemptError.message)
      return jsonResponse({ error: 'No se pudo validar el código de verificación.' }, 500)
    }
    if (!updatedAttempt) return jsonResponse({ error: 'El código ya fue validado en otro intento. Inténtalo nuevamente.' }, 409)
    if (nextAttemptCount >= MAX_CODE_ATTEMPTS) {
      return jsonResponse({ error: 'Se agotaron los intentos. Espera a que venza el código para iniciar sesión nuevamente.' }, 429)
    }
    return jsonResponse({ error: 'El código ingresado es incorrecto.' }, 400)
  }

  const { error: trustSaveError } = await supabase
    .from('trusted_devices')
    .upsert({
      user_id: challenge.user_id,
      ip_address: challenge.ip_address,
      user_agent: challenge.user_agent,
      device_hash: challenge.device_hash,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: 'user_id, device_hash' })
  if (trustSaveError) {
    console.error('No se pudo guardar el dispositivo verificado:', trustSaveError.message)
    return jsonResponse({ error: 'El código fue validado, pero no se pudo guardar el dispositivo de confianza.' }, 500)
  }

  const { error: deleteChallengeError } = await supabase
    .from(CHALLENGES_TABLE)
    .delete()
    .eq('user_id', challenge.user_id)
    .eq('challenge_id', challengeId)
  if (deleteChallengeError) {
    console.error('No se pudo borrar el desafío ya verificado:', deleteChallengeError.message)
    return jsonResponse({ error: 'El dispositivo quedó registrado, pero no se pudo cerrar el desafío de verificación.' }, 500)
  }

  return jsonResponse({ verified: true })
  } catch (error) {
    console.error('Error inesperado en trusted-device-auth:', error)
    return jsonResponse({ error: 'Ocurrió un error inesperado durante la verificación del dispositivo.' }, 500)
  }
})
