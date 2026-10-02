import { supabase } from './supabase'

export async function sendCompanyTestEmail(companyId: string | number): Promise<void> {
  const { data, error } = await supabase.functions.invoke('send-payment-reminders', {
    body: { mode: 'test', companyId: String(companyId) },
  })

  if (error) throw new Error(error.message || 'No se pudo enviar el correo de prueba.')
  if (!data?.sent) throw new Error('El servidor no confirmó el envío del correo de prueba.')
}
