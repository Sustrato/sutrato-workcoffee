import type { LucideIcon } from 'lucide-react'

type MetricTone = 'blue' | 'violet' | 'emerald' | 'amber'

interface MetricCardProps {
  title: string
  value: string | number
  detail: string
  icon: LucideIcon
  tone: MetricTone
}

const toneClasses: Record<MetricTone, { icon: string; background: string }> = {
  blue: { icon: 'text-primary-600', background: 'bg-primary-50' },
  violet: { icon: 'text-violet-600', background: 'bg-violet-50' },
  emerald: { icon: 'text-emerald-600', background: 'bg-emerald-50' },
  amber: { icon: 'text-amber-600', background: 'bg-amber-50' },
}

export default function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  tone,
}: MetricCardProps) {
  const colors = toneClasses[tone]

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${colors.background}`}>
          <Icon size={19} className={colors.icon} strokeWidth={2} />
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{detail}</p>
    </article>
  )
}
