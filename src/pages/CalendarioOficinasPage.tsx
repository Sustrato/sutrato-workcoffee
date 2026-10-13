import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { ChevronLeft, ChevronRight, Clock, User, Trash2, Calendar as CalendarIcon, Grid } from 'lucide-react'

interface EventoReserva {
  id: string
  oficina: string
  cliente: string
  horaInicio?: string
  horaFin?: string
  tipo: 'particular' | 'empresa'
  fecha: string
}

export default function CalendarioOficinasPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 9, 12)) // Octubre 2026
  const [eventos, setEventos] = useState<EventoReserva[]>([])
  const [loading, setLoading] = useState(false)
  const [vista, setVista] = useState<'mes' | 'semana'>('mes')

  // Cargar reservas desde Supabase
  const fetchReservas = async () => {
    setLoading(true)
    
    // 1. Cargar reservas particulares
    const { data: particulares } = await supabase
      .from('uso_oficinas_particulares')
      .select('id, oficina_asignada, hora_inicio, hora_fin, fecha_inicio, clientes_particulares(nombre_completo)')

    // 2. Cargar arriendos mensuales de empresas
    const { data: empresas } = await supabase
      .from('oficinas_fisicas')
      .select('id, tipo_espacio, nombre_cliente, fecha_inicio, estado')
      .eq('estado', 'Activo')

    const listaEventos: EventoReserva[] = []

    if (particulares) {
      particulares.forEach((p: any) => {
        listaEventos.push({
          id: p.id,
          oficina: p.oficina_asignada,
          cliente: p.clientes_particulares?.nombre_completo || 'Cliente Particular',
          horaInicio: p.hora_inicio?.substring(0, 5),
          horaFin: p.hora_fin?.substring(0, 5),
          tipo: 'particular',
          fecha: p.fecha_inicio
        })
      })
    }

    if (empresas) {
      empresas.forEach((e: any) => {
        listaEventos.push({
          id: e.id,
          oficina: e.tipo_espacio,
          cliente: e.nombre_cliente,
          tipo: 'empresa',
          fecha: e.fecha_inicio
        })
      })
    }

    setEventos(listaEventos)
    setLoading(false)
  }

  useEffect(() => {
    fetchReservas()
  }, [currentDate])

  // 🗑️ Eliminar reserva particular de prueba
  const handleEliminarReserva = async (id: string, tipo: string) => {
    if (!confirm('¿Seguro que deseas borrar esta reserva del calendario?')) return

    const tabla = tipo === 'particular' ? 'uso_oficinas_particulares' : 'oficinas_fisicas'
    const { error } = await supabase.from(tabla).delete().eq('id', id)

    if (!error) {
      fetchReservas()
    } else {
      alert('Error al borrar la reserva: ' + error.message)
    }
  }

  // Navegación
  const prevPeriod = () => {
    const d = new Date(currentDate)
    if (vista === 'mes') {
      d.setMonth(d.getMonth() - 1)
    } else {
      d.setDate(d.getDate() - 7)
    }
    setCurrentDate(d)
  }

  const nextPeriod = () => {
    const d = new Date(currentDate)
    if (vista === 'mes') {
      d.setMonth(d.getMonth() + 1)
    } else {
      d.setDate(d.getDate() + 7)
    }
    setCurrentDate(d)
  }

  // Lógica de cálculo del Mes
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDayIndex = new Date(year, month, 1).getDay()
  const totalDays = new Date(year, month + 1, 0).getDate()
  const adjustedFirstDay = (firstDayIndex + 6) % 7

  // Lógica de cálculo de la Semana (Lunes a Domingo)
  const getStartOfWeek = (d: Date) => {
    const date = new Date(d)
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(date.setDate(diff))
  }

  const startOfWeek = getStartOfWeek(currentDate)
  const diasSemana = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(d.getDate() + i)
    return d
  })

  const horas = Array.from({ length: 13 }).map((_, i) => `${String(8 + i).padStart(2, '0')}:00`)

  const monthNames = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-6 font-sans">
      
      {/* Encabezado */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Calendario de oficinas
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Visualización de reservas y arriendos presenciales
          </p>
        </div>

        {/* Switch Vista Mensual / Semanal */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button 
            onClick={() => setVista('mes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              vista === 'mes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Grid size={14} /> Mensual
          </button>
          <button 
            onClick={() => setVista('semana')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              vista === 'semana' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <CalendarIcon size={14} /> Semanal
          </button>
        </div>
      </section>

      {/* Contenedor del Calendario */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        
        {/* Header de navegación */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <button 
            onClick={prevPeriod}
            className="flex items-center gap-1 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <ChevronLeft size={16} /> Anterior
          </button>

          <h2 className="text-lg font-black text-slate-900 capitalize">
            {vista === 'mes' 
              ? `${monthNames[month]} de ${year}`
              : `Semana del ${startOfWeek.getDate()} de ${monthNames[startOfWeek.getMonth()]} ${startOfWeek.getFullYear()}`}
          </h2>

          <button 
            onClick={nextPeriod}
            className="flex items-center gap-1 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            Siguiente <ChevronRight size={16} />
          </button>
        </div>

        {/* 📅 VISTA 1: GRID MENSUAL */}
        {vista === 'mes' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-7 text-center font-bold text-xs text-slate-400">
              <div>Lun</div>
              <div>Mar</div>
              <div>Mié</div>
              <div>Jue</div>
              <div>Vie</div>
              <div>Sáb</div>
              <div>Dom</div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: adjustedFirstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[110px] rounded-xl bg-slate-50/50 border border-transparent"></div>
              ))}

              {Array.from({ length: totalDays }).map((_, i) => {
                const dayNum = i + 1
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                const reservasDelDia = eventos.filter(e => e.fecha === dateStr)

                return (
                  <div 
                    key={dayNum} 
                    className="min-h-[110px] rounded-xl border border-slate-100 p-2 space-y-1.5 bg-white hover:border-slate-300 transition"
                  >
                    <div className="text-xs font-bold text-slate-400">{dayNum}</div>

                    <div className="space-y-1">
                      {reservasDelDia.map(r => (
                        <div 
                          key={r.id} 
                          className={`p-1.5 rounded-lg text-[10px] font-medium border relative group transition ${
                            r.tipo === 'particular' 
                              ? 'bg-blue-50 border-blue-200 text-blue-900' 
                              : 'bg-amber-50 border-amber-200 text-amber-900'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-bold truncate">{r.oficina}</span>
                            <button 
                              onClick={() => handleEliminarReserva(r.id, r.tipo)}
                              className="text-rose-500 opacity-0 group-hover:opacity-100 hover:text-rose-700 p-0.5 transition"
                              title="Borrar reserva"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <div className="truncate text-slate-600 flex items-center gap-0.5">
                            <User size={10} /> {r.cliente}
                          </div>
                          {r.horaInicio && (
                            <div className="text-[9px] font-semibold text-blue-700 mt-0.5 flex items-center gap-0.5">
                              <Clock size={9} /> {r.horaInicio} - {r.horaFin}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* ⏱️ VISTA 2: HORARIO SEMANAL (Días arriba, Horas a la izquierda) */
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header Días de la semana */}
              <div className="grid grid-cols-8 border-b border-slate-200 pb-2 text-center text-xs font-bold text-slate-600">
                <div className="text-slate-400 text-left pl-2">Hora</div>
                {diasSemana.map((dia, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <span className="block text-[10px] uppercase text-slate-400">
                      {dia.toLocaleDateString('es-CL', { weekday: 'short' })}
                    </span>
                    <span className="block text-sm font-black text-slate-800">
                      {dia.getDate()}
                    </span>
                  </div>
                ))}
              </div>

              {/* Filas por hora */}
              <div className="divide-y divide-slate-100">
                {horas.map((hora) => (
                  <div key={hora} className="grid grid-cols-8 min-h-[50px]">
                    {/* Etiqueta de Hora a la izquierda */}
                    <div className="text-[11px] font-semibold text-slate-400 py-2 pl-2">
                      {hora}
                    </div>

                    {/* Columnas para cada día de la semana */}
                    {diasSemana.map((dia, idx) => {
                      const dateStr = dia.toISOString().split('T')[0]
                      
                      // Buscar eventos que comiencen en esta hora exacta
                      const eventosHora = eventos.filter(e => {
                        if (e.fecha !== dateStr) return false
                        if (!e.horaInicio) return false
                        const horaEvento = e.horaInicio.split(':')[0]
                        const horaGrid = hora.split(':')[0]
                        return horaEvento === horaGrid
                      })

                      return (
                        <div key={idx} className="border-l border-slate-100 p-1 space-y-1 bg-slate-50/30">
                          {eventosHora.map((r) => (
                            <div 
                              key={r.id}
                              className="p-1.5 rounded-lg text-[10px] bg-blue-100 border border-blue-300 text-blue-900 shadow-sm relative group"
                            >
                              <div className="flex justify-between items-center font-bold">
                                <span className="truncate">{r.oficina}</span>
                                <button 
                                  onClick={() => handleEliminarReserva(r.id, r.tipo)}
                                  className="text-rose-600 opacity-0 group-hover:opacity-100 hover:text-rose-800 transition"
                                  title="Borrar reserva"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                              <div className="truncate text-slate-700">{r.cliente}</div>
                              <div className="text-[9px] font-semibold text-blue-800">
                                {r.horaInicio} - {r.horaFin}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </section>

    </div>
  )
}