import { useEffect, useMemo, useState } from 'react'
import { FileText, LoaderCircle, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getContractCompanies, type ContractCompany } from '../services/contracts'

export default function Contratos() {
  const [companies, setCompanies] = useState<ContractCompany[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getContractCompanies()
      .then((data) => { if (active) setCompanies(data) })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar las empresas.')
      })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [])

  const filteredCompanies = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es-CL')
    if (!query) return companies
    return companies.filter((company) =>
      `${company.nombre} ${company.rut}`.toLocaleLowerCase('es-CL').includes(query),
    )
  }, [companies, search])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-primary-50 text-primary-700"><FileText size={21} /></span>
          <div><h1 className="text-xl font-semibold text-slate-900">Contratos</h1><p className="mt-1 text-sm text-slate-500">Selecciona una empresa para preparar su contrato.</p></div>
        </div>
        <label className="relative block w-full sm:max-w-sm">
          <Search size={17} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre o RUT"
            aria-label="Buscar empresas por nombre o RUT"
            className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </label>
      </header>
      {error && <p role="alert" className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin" /> Cargando empresas...</div>
        ) : filteredCompanies.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">{companies.length ? 'No hay empresas que coincidan con la búsqueda.' : 'Aún no hay empresas registradas.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500"><tr><th className="px-5 py-3">Empresa</th><th className="px-5 py-3">RUT</th><th className="px-5 py-3">Frecuencia</th><th className="px-5 py-3">Contrato</th><th className="px-5 py-3 text-right">Acción</th></tr></thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredCompanies.map((company) => (
                  <tr key={String(company.id)}>
                    <td className="px-5 py-4 font-semibold text-slate-800">{company.nombre}</td>
                    <td className="px-5 py-4 text-slate-600">{company.rut}</td>
                    <td className="px-5 py-4 text-slate-600">{company.frecuencia || '—'}</td>
                    <td className="px-5 py-4 text-slate-600">{company.contrato_url ? 'Guardado' : 'Pendiente'}</td>
                    <td className="px-5 py-4 text-right"><Link to={`/contratos/${company.id}`} className="inline-flex h-9 items-center rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700">Abrir contrato</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}