import { FileSearch, FileSpreadsheet, FileText, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { DocumentRecord } from '../types'

interface DocumentTableProps {
  documents: DocumentRecord[]
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha desconocida'

  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export default function DocumentTable({ documents }: DocumentTableProps) {
  const [query, setQuery] = useState('')
  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('es-CL')
    if (!normalizedQuery) return documents

    return documents.filter((document) =>
      [document.nombre, document.nombre_archivo, document.categoria, document.tipo]
        .join(' ')
        .toLocaleLowerCase('es-CL')
        .includes(normalizedQuery),
    )
  }, [documents, query])

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.02]">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Documentos recientes</h2>
          <p className="mt-1 text-sm text-slate-500">Los últimos archivos añadidos al sistema</p>
        </div>
        <label className="relative block w-full sm:max-w-xs">
          <Search
            aria-hidden="true"
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrar documentos..."
            aria-label="Filtrar documentos recientes"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </label>
      </div>

      {filteredDocuments.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left">
            <thead>
              <tr className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-6 py-3">Documento</th>
                <th scope="col" className="px-4 py-3">Categoría</th>
                <th scope="col" className="px-4 py-3">Formato</th>
                <th scope="col" className="px-6 py-3 text-right">Fecha de subida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocuments.map((document) => {
                const FileIcon = document.tipo === 'PDF' ? FileText : FileSpreadsheet
                const fileIconClass = document.tipo === 'PDF' ? 'text-rose-600 bg-rose-50' : 'text-emerald-700 bg-emerald-50'

                return (
                  <tr key={document.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-6 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${fileIconClass}`}>
                          <FileIcon size={17} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">{document.nombre}</p>
                          <p className="mt-0.5 truncate text-xs text-slate-400">{document.nombre_archivo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{document.categoria}</td>
                    <td className="px-4 py-4">
                      <span className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600">
                        {document.tipo}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-slate-500">
                      {formatDate(document.fecha_subida)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <div className="flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <FileSearch size={21} />
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-800">No encontramos documentos</p>
          <p className="mt-1 text-sm text-slate-500">
            {query ? 'Prueba con otro nombre, categoría o formato.' : 'Los documentos recientes aparecerán aquí.'}
          </p>
        </div>
      )}
    </section>
  )
}
