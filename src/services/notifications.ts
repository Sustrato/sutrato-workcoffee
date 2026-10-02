import { supabase } from './supabase'

export const PAYMENTS_UPDATED_EVENT = 'sutrato:payments-updated'

interface NotificationPayment {
  id?: string | number
  fecha_pago?: string | null
  bruto?: number | null
  proximo_pago?: string | null
}

interface NotificationCompany {
  id: string | number
  nombre: string
  rut: string
  estado: string | null
  pagos?: NotificationPayment[] | null
}

export interface WorkNotification {
  id: string
  title: string
  detail: string
  date: string
  kind: 'overdue' | 'upcoming' | 'payment'
}

export interface NotificationFeed {
  alerts: WorkNotification[]
  recentPayments: WorkNotification[]
}

function dayDifference(dateValue: string): number | null {
  const [year, month, day] = dateValue.slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return null

  const today = new Date()
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const dueUtc = Date.UTC(year, month - 1, day)
  return Math.round((dueUtc - todayUtc) / 86_400_000)
}

function formatDate(value: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value)
  return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

function formatMoney(value?: number | null): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Monto no informado'
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value)
}

export async function getNotificationFeed(): Promise<NotificationFeed> {
  const { data, error } = await supabase
    .from('empresas')
    .select('id, nombre, rut, estado, pagos(id, fecha_pago, bruto, proximo_pago)')
    .order('nombre', { ascending: true })

  if (error) throw new Error(`No se pudieron cargar las notificaciones: ${error.message}`)

  const companies = (data ?? []) as NotificationCompany[]
  const alerts: WorkNotification[] = []
  const recentPayments: WorkNotification[] = []

  for (const company of companies) {
    const payments = [...(company.pagos ?? [])].sort((first, second) =>
      (second.fecha_pago ?? '').localeCompare(first.fecha_pago ?? ''),
    )
    const nextPayment = payments.find((payment) => Boolean(payment.proximo_pago))

    if (company.estado === 'VIGENTE' && nextPayment?.proximo_pago) {
      const daysUntilDue = dayDifference(nextPayment.proximo_pago)
      if (daysUntilDue !== null && daysUntilDue < 0) {
        const overdueDays = Math.abs(daysUntilDue)
        alerts.push({
          id: `overdue-${company.id}`,
          title: `Pago atrasado: ${company.nombre}`,
          detail: `RUT ${company.rut} · ${overdueDays} ${overdueDays === 1 ? 'día' : 'días'} de atraso · venció ${formatDate(nextPayment.proximo_pago)}`,
          date: nextPayment.proximo_pago,
          kind: 'overdue',
        })
      } else if (daysUntilDue !== null && daysUntilDue <= 5) {
        alerts.push({
          id: `upcoming-${company.id}`,
          title: `Pago por vencer: ${company.nombre}`,
          detail: daysUntilDue === 0
            ? `RUT ${company.rut} · vence hoy`
            : `RUT ${company.rut} · vence en ${daysUntilDue} ${daysUntilDue === 1 ? 'día' : 'días'}`,
          date: nextPayment.proximo_pago,
          kind: 'upcoming',
        })
      }
    }

    for (const payment of payments) {
      if (!payment.fecha_pago) continue
      recentPayments.push({
        id: `payment-${company.id}-${payment.id ?? payment.fecha_pago}`,
        title: `Pago registrado: ${company.nombre}`,
        detail: `${formatMoney(payment.bruto)} · ${formatDate(payment.fecha_pago)}`,
        date: payment.fecha_pago,
        kind: 'payment',
      })
    }
  }

  alerts.sort((first, second) => first.date.localeCompare(second.date))
  recentPayments.sort((first, second) => second.date.localeCompare(first.date))

  return { alerts, recentPayments: recentPayments.slice(0, 5) }
}
