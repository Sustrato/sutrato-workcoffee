import { supabase } from './supabase'

const TRUSTED_DEVICE_ID_KEY = 'sutrato:trusted-device-id'

interface TrustedDeviceStatus {
  trusted: boolean
  verificationRequired?: boolean
  verified?: boolean
  challengeId?: string
  email?: string
}

function getTrustedDeviceId(): string {
  let deviceId = localStorage.getItem(TRUSTED_DEVICE_ID_KEY)
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    localStorage.setItem(TRUSTED_DEVICE_ID_KEY, deviceId)
  }
  return deviceId
}

async function invokeTrustedDeviceAuth(body: Record<string, string>): Promise<TrustedDeviceStatus> {
  const headers: Record<string, string> = {}
  if (body.action === 'check') {
    const { data, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw new Error(`No se pudo obtener la sesión para verificar el dispositivo: ${sessionError.message}`)
    if (!data.session?.access_token) throw new Error('Debes iniciar sesión antes de verificar el dispositivo.')
    headers.Authorization = `Bearer ${data.session.access_token}`
  }

  const { data, error } = await supabase.functions.invoke('trusted-device-auth', {
    body: { ...body, deviceId: getTrustedDeviceId() },
    headers,
  })
  if (error) {
    const response = error.context
    if (response instanceof Response) {
      let errorMessage = ''
      try {
        const errorBody = await response.json() as { error?: string }
        errorMessage = errorBody.error ?? ''
      } catch {
        // Fall back to the Supabase Functions error when the response is not JSON.
      }
      if (errorMessage) throw new Error(errorMessage)
    }
    console.error('Error al invocar la Edge Function trusted-device-auth:', {
      name: error.name,
      message: error.message,
      context: error.context,
    })
    const cause = error.context instanceof Error ? ` (${error.context.message})` : ''
    throw new Error(
      error.name === 'FunctionsFetchError'
        ? `No se pudo conectar con la Edge Function trusted-device-auth. Verifica que esté desplegada y que la URL de Supabase sea correcta${cause}.`
        : error.message || 'No se pudo verificar este dispositivo.',
    )
  }
  return data as TrustedDeviceStatus
}

export function checkTrustedDevice(): Promise<TrustedDeviceStatus> {
  return invokeTrustedDeviceAuth({ action: 'check' })
}

export async function verifyTrustedDevice(challengeId: string, code: string): Promise<void> {
  const result = await invokeTrustedDeviceAuth({ action: 'verify', challengeId, code })
  if (!result.verified) throw new Error('El servicio no confirmó la verificación del dispositivo.')
}
