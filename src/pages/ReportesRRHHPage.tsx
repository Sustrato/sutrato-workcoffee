import { useState } from 'react'

export default function ReportesRRHHPage() {
  const [people] = useState<any[]>(() => JSON.parse(localStorage.getItem('sutrato_people') || '[]'))

  const trabajadoresActivos = people.filter((p: any) => p.type === 'trabajadores' && !['Desvinculado', 'Renuncia', 'Renunciado'].includes(p.status)).length
  const totalHorasPracticas = people.filter((p: any) => p.type === 'practicantes').reduce((acc: number, p: any) => acc + (Number(p.completedHours) || 0), 0)
  const externosRegistrados = people.filter((p: any) => p.type === 'externos').length

  const exportCSV = () => {
    const h = ['tipo', 'nombre', 'rut', 'correo', 'telefono', 'cargo_carrera_servicio', 'institucion', 'estado']
    const rows = people.map((p: any) => [p.type, p.name, p.rut, p.email, p.phone, p.role || p.career, p.institution, p.status])
    const csv = [h, ...rows].map((r: any[]) => r.map((v: any) => `"${String(v || '').replaceAll('"', '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'gestion-personas-sutrato.csv'
    a.click()
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-amber-900">Reportes</h1>
          <p className="text-xs text-slate-500 mt-1">Resumen para administración, control documental y seguimiento.</p>
        </div>
        <button 
          type="button"
          onClick={exportCSV}
          className="px-4 py-2.5 bg-[#d9b354] text-slate-900 rounded-xl font-bold text-xs shadow-sm hover:brightness-105 transition"
        >
          Exportar CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-[#ddd4c3] space-y-2 shadow-xs">
          <h3 className="font-black text-slate-900 text-base">Situación laboral</h3>
          <p className="text-xs text-slate-600 font-medium">{trabajadoresActivos} trabajadores activos</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#ddd4c3] space-y-2 shadow-xs">
          <h3 className="font-black text-slate-900 text-base">Prácticas</h3>
          <p className="text-xs text-slate-600 font-medium">{totalHorasPracticas} horas registradas</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#ddd4c3] space-y-2 shadow-xs">
          <h3 className="font-black text-slate-900 text-base">Servicios externos</h3>
          <p className="text-xs text-slate-600 font-medium">{externosRegistrados} perfiles registrados</p>
        </div>
      </div>
    </div>
  )
}