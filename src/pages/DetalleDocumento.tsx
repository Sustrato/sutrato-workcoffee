import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Hash,
  UserRound,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getDocuments } from '../services/mockStorage'

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha desconocida'

  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default function DetalleDocumento() {
  const { id } = useParams<{ id: string }>()
  const [documents] = useState(() => getDocuments())
  const document = documents.find((item) => item.id === id)

  if (!document) {
    return (
      <section className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <FileText size={22} />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">Documento no encontrado</h1>
        <p className="mt-2 text-sm text-slate-500">El documento puede haber sido eliminado o el enlace no es válido.</p>
        <Link to="/documentos" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700">
          <ArrowLeft size={16} /> Volver a documentos
        </Link>
      </section>
    )
  }

  const FileIcon = document.tipo === 'PDF' ? FileText : FileSpreadsheet

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link to="/documentos" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-primary-600">
        <ArrowLeft size={17} />
        Volver a documentos
      </Link>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.02]">
        <div className="flex flex-col gap-5 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-7">
          <div className="flex min-w-0 items-center gap-4">
            <div className={`flex size-14 shrink-0 items-center justify-center rounded-xl ${document.tipo === 'PDF' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>
              <FileIcon size={26} />
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-sm font-medium text-primary-600">Detalle del documento</p>
              <h1 className="break-words text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{document.nombre}</h1>
              <p className="mt-1 break-all text-sm text-slate-500">{document.nombre_archivo}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.alert(`Descarga simulada: ${document.nombre_archivo}. En esta demo no se almacena el archivo binario.`)}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white shadow-sm shadow-primary-600/20 transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <Download size={17} />
            Descargar archivo
          </button>
        </div>

        <div className="p-6 sm:p-8">
          <h2 className="text-base font-semibold text-slate-900">Información del archivo</h2>
          <dl className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-2">
            <div className="flex gap-3">
              <Hash size={18} className="mt-0.5 shrink-0 text-slate-400" />
              <div className="min-w-0">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">ID del documento</dt>
                <dd className="mt-1 break-all text-sm font-medium text-slate-700">{document.id}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <FolderOpen size={18} className="mt-0.5 shrink-0 text-slate-400" />
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Categoría</dt>
                <dd className="mt-1 text-sm font-medium text-slate-700">{document.categoria}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <FileText size={18} className="mt-0.5 shrink-0 text-slate-400" />
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Tipo de archivo</dt>
                <dd className="mt-1 text-sm font-medium text-slate-700">{document.tipo}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <CalendarDays size={18} className="mt-0.5 shrink-0 text-slate-400" />
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Fecha de subida</dt>
                <dd className="mt-1 text-sm font-medium text-slate-700">{formatDate(document.fecha_subida)}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <UserRound size={18} className="mt-0.5 shrink-0 text-slate-400" />
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Usuario responsable</dt>
                <dd className="mt-1 text-sm font-medium text-slate-700">{document.usuario_id === 'usr-001' ? 'Yordan Basáez' : document.usuario_id}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <FolderOpen size={18} className="mt-0.5 shrink-0 text-slate-400" />
              <div className="min-w-0">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Ruta de almacenamiento</dt>
                <dd className="mt-1 break-all text-sm font-medium text-slate-700">{document.ruta_storage}</dd>
              </div>
            </div>
          </dl>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/[0.02] sm:p-8">
        <div className="flex items-center gap-2">
          <Clock3 size={18} className="text-slate-500" />
          <h2 className="text-base font-semibold text-slate-900">Historial de acciones</h2>
        </div>
        <div className="mt-5 flex gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">Archivo subido por Yordan Basáez</p>
            <p className="mt-1 text-xs text-slate-500">{formatDate(document.fecha_subida)}</p>
          </div>
        </div>
      </section>
    </div>
  )
}
