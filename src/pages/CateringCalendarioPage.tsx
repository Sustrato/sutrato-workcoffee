import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'

interface EventoCalendario {
  id: string
  titulo: string
  cliente: string
  fecha: string // formato YYYY-MM-DD
  hora: string
  lugar: 'Frontis' | 'Salón principal' | 'Sala de reuniones' | 'Externo'
  modalidad: string
}

export default function CateringCalendarioPage() {
  const [eventos, setEventos] = useState<EventoCalendario[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLugar, setSelectedLugar] = useState('Todos los lugares')
  const [selectedModalidad, setSelectedModalidad] = useState('Todas las modalidades')

  // Modal para agendar evento directamente desde el calendario
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [nuevoEvento, setNuevoEvento] = useState({
    titulo: '',
    cliente: '',
    fecha: '2026-10-15',
    hora: '10:00',
    lugar: 'Salón principal' as const,
    modalidad: 'Con catering'
  })

  // Días del mes de octubre de 2026 (Comienza en jueves, 31 días)
  // Generamos una matriz para simular la grilla mensual del mes de octubre 2026
  const diasMes = Array.from({ length: 31 }, (_, i) => {
    const diaNum = i + 1
    const mesStr = '10'
    const diaStr = diaNum < 10 ? `0${diaNum}` : `${diaNum}`
    return {
      numero: diaNum,
      fechaStr: `2026-${mesStr}-${diaStr}`
    }
  })

  const handleAgendar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoEvento.titulo || !nuevoEvento.cliente) return

    const eventoCreado: EventoCalendario = {
      id: Date.now().toString(),
      titulo: nuevoEvento.titulo,
      cliente: nuevoEvento.cliente,
      fecha: nuevoEvento.fecha,
      hora: nuevoEvento.hora,
      lugar: nuevoEvento.lugar,
      modalidad: nuevoEvento.modalidad
    }

    setEventos([eventoCreado, ...eventos])
    setIsModalOpen(false)
    setNuevoEvento({
      titulo: '',
      cliente: '',
      fecha: '2026-10-15',
      hora: '10:00',
      lugar: 'Salón principal',
      modalidad: 'Con catering'
    })
  }

  const eventosFiltrados = eventos.filter((ev) => {
    const matchSearch = ev.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        ev.titulo.toLowerCase().includes(searchTerm.toLowerCase())
    const matchLugar = selectedLugar === 'Todos los lugares' || ev.lugar === selectedLugar
    const matchModalidad = selectedModalidad === 'Todas las modalidades' || ev.modalidad === selectedModalidad
    return matchSearch && matchLugar && matchModalidad
  })

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Calendario de eventos</h1>
          <p className="text-sm text-slate-500">Reservas de Frontis, Salón y servicios externos</p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-amber-400"
        >
          <Plus size={18} />
          + Agendar evento
        </button>
      </div>

      {/* Contenedor principal del calendario */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        {/* Barra de navegación del mes */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm w-fit"
          >
            <ChevronLeft size={16} /> Anterior
          </button>
          <h2 className="text-lg font-bold text-slate-900 capitalize">octubre de 2026</h2>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm w-fit"
          >
            Siguiente <ChevronRight size={16} />
          </button>
        </div>

        {/* Filtros de la grilla */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Filtrar por cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <select
            value={selectedLugar}
            onChange={(e) => setSelectedLugar(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option>Todos los lugares</option>
            <option>Frontis</option>
            <option>Salón principal</option>
            <option>Sala de reuniones</option>
            <option>Externo</option>
          </select>
          <select
            value={selectedModalidad}
            onChange={(e) => setSelectedModalidad(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option>Todas las modalidades</option>
            <option>Solo arriendo</option>
            <option>Con catering</option>
            <option>Arriendo + Catering</option>
          </select>
        </div>

        {/* Días de la semana */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-wider text-slate-500 pt-2">
          <div>Lun</div>
          <div>Mar</div>
          <div>Mié</div>
          <div>Jue</div>
          <div>Vie</div>
          <div>Sáb</div>
          <div>Dom</div>
        </div>

        {/* Cuadrícula del mes */}
        <div className="grid grid-cols-7 gap-2">
          {/* Espacios vacíos iniciales para alinear jueves 1 de octubre de 2026 (Lun=0, Mar=1, Mié=2, Jue=3) */}
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-28 rounded-xl border border-dashed border-slate-100 bg-slate-50/30 p-2" />
          ))}

          {diasMes.map((dia) => {
            const eventosDelDia = eventosFiltrados.filter(ev => ev.fecha === dia.fechaStr)
            return (
              <div
                key={dia.fechaStr}
                className="h-28 rounded-xl border border-slate-200 bg-white p-2 flex flex-col justify-between overflow-y-auto shadow-sm hover:border-slate-300 transition"
              >
                <span className="text-xs font-bold text-slate-700">{dia.numero}</span>
                <div className="space-y-1 overflow-y-auto flex-1 my-1">
                  {eventosDelDia.map((ev) => (
                    <div
                      key={ev.id}
                      className={`rounded-lg p-1.5 text-[11px] font-medium leading-tight shadow-xs ${
                        ev.lugar === 'Salón principal' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                        ev.lugar === 'Frontis' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                        'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}
                    >
                      <p className="font-bold">{ev.hora} · {ev.lugar}</p>
                      <p className="truncate text-slate-700">{ev.cliente}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal Agendar Evento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <h2 className="text-base font-bold">Agendar nuevo evento</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAgendar} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Nombre del evento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej.: Capacitación institucional"
                  value={nuevoEvento.titulo}
                  onChange={(e) => setNuevoEvento({ ...nuevoEvento, titulo: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Cliente *</label>
                <input
                  type="text"
                  required
                  placeholder="Nombre de la empresa o cliente"
                  value={nuevoEvento.cliente}
                  onChange={(e) => setNuevoEvento({ ...nuevoEvento, cliente: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Fecha *</label>
                  <input
                    type="date"
                    value={nuevoEvento.fecha}
                    onChange={(e) => setNuevoEvento({ ...nuevoEvento, fecha: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Hora *</label>
                  <input
                    type="time"
                    value={nuevoEvento.hora}
                    onChange={(e) => setNuevoEvento({ ...nuevoEvento, hora: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Lugar</label>
                  <select
                    value={nuevoEvento.lugar}
                    onChange={(e) => setNuevoEvento({ ...nuevoEvento, lugar: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option>Frontis</option>
                    <option>Salón principal</option>
                    <option>Sala de reuniones</option>
                    <option>Externo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Modalidad</label>
                  <select
                    value={nuevoEvento.modalidad}
                    onChange={(e) => setNuevoEvento({ ...nuevoEvento, modalidad: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option>Solo arriendo</option>
                    <option>Con catering</option>
                    <option>Arriendo + Catering</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 px-6 py-2 text-sm font-bold text-slate-900 shadow-sm hover:bg-amber-400"
                >
                  Guardar evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}