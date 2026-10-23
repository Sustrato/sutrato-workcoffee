import { useEffect, useState } from 'react'
import { ArrowLeft, Download, LoaderCircle, Printer, Save } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import ContractRichTextEditor from '../components/ContractRichTextEditor'
import {
  getActiveContractTemplate,
  getContractCompany,
  getSavedContractContent,
  renderContractTemplate,
  saveContractDocument,
  DEFAULT_CONTRACT_TEMPLATE,
  PATRIMONIS_TEMPLATE,
  type ContractCompany,
  type ContractTemplate,
} from '../services/contracts'

export default function ContratoEditor() {
  const { id = '' } = useParams()
  const [company, setCompany] = useState<ContractCompany | null>(null)
  const [template, setTemplate] = useState<ContractTemplate | null>(null)
  const [tipoModelo, setTipoModelo] = useState<'general' | 'patrimonis'>('general')
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([getContractCompany(id), getActiveContractTemplate()])
      .then(async ([loadedCompany, activeTemplate]) => {
        const savedContent = await getSavedContractContent(loadedCompany)
        if (!active) return
        setCompany(loadedCompany)
        setTemplate(activeTemplate)
        setContent(savedContent ?? renderContractTemplate(DEFAULT_CONTRACT_TEMPLATE, loadedCompany))
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el contrato.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => { active = false }
  }, [id])

  const handleCambioModelo = (tipo: 'general' | 'patrimonis') => {
    setTipoModelo(tipo)
    if (!company) return
    if (tipo === 'general') {
      setContent(renderContractTemplate(DEFAULT_CONTRACT_TEMPLATE, company))
    } else {
      setContent(renderContractTemplate(PATRIMONIS_TEMPLATE, company))
    }
  }

  async function saveDocument() {
    if (!company) return
    setIsSaving(true)
    setError('')
    setNotice('')
    try {
      const contractUrl = await saveContractDocument(company, content)
      setCompany({ ...company, contrato_url: contractUrl })
      setNotice('Contrato guardado en la ficha de la empresa.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el contrato.')
    } finally {
      setIsSaving(false)
    }
  }

  function downloadWord() {
    const wordDocument = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Georgia,serif;font-size:12pt;line-height:1.5;margin:2.5cm}h1,h2{text-align:center}p{text-align:justify}</style></head><body>${content}</body></html>`
    const blob = new Blob(['\ufeff', wordDocument], { type: 'application/msword;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Contrato-${company?.rut ?? 'cliente'}.doc`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  if (isLoading) return <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18} /> Cargando contrato...</div>
  if (!company || !template) return <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error || 'No se encontró la empresa o la plantilla activa.'}</div>

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center print:hidden">
        <div>
          <Link to="/contratos" className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800"><ArrowLeft size={16} /> Contratos</Link>
          <h1 className="text-xl font-semibold text-slate-900">Contrato de {company.nombre}</h1>
          <p className="mt-1 text-sm text-slate-500">Selecciona el formato y personaliza el contrato antes de guardar o imprimir.</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={tipoModelo}
            onChange={(e) => handleCambioModelo(e.target.value as 'general' | 'patrimonis')}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-primary-500 shadow-sm"
          >
            <option value="general">📄 Formato General</option>
            <option value="patrimonis">🏛️ Patrimonis Online (CORFO)</option>
          </select>

          <button type="button" onClick={() => void saveDocument()} disabled={isSaving} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"><Save size={16} />{isSaving ? 'Guardando...' : 'Guardar contrato'}</button>
          <button type="button" onClick={downloadWord} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Download size={16} />Descargar Word</button>
          <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-600 px-3 text-sm font-semibold text-white hover:bg-primary-700"><Printer size={16} />Imprimir PDF</button>
        </div>
      </div>
      {(notice || error) && <p role={error ? 'alert' : 'status'} className={`rounded-md px-3 py-2 text-sm print:hidden ${error ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{error || notice}</p>}
      <article className="contract-paper mx-auto w-full max-w-[8.5in] min-h-[11in] bg-white p-8 shadow-md sm:p-[1in] print:min-h-0 print:max-w-none print:p-0 print:shadow-none">
        <div className="mb-8 border-b border-slate-300 pb-4 text-center">
          <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500">SUTRATO LIMITADA | SUTRATO WORKCOFFEE</p>
          <p className="text-xs text-slate-500">RUT 77.935.903-4</p>
        </div>
        <ContractRichTextEditor key={id + tipoModelo} content={content} onUpdate={setContent} />
      </article>
      <style>{`@page{size:letter;margin:1in}@media print{html,body{background:#fff!important}.contract-paper{width:auto!important;border:0!important;margin:0!important}.contract-editor-shell{border:0!important}.contract-prose{font-size:11pt!important;line-height:1.45!important}}`}</style>
    </div>
  )
}