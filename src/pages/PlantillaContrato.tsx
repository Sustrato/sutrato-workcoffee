import { useCallback, useEffect, useState } from 'react'
import { FileText, LoaderCircle, Save } from 'lucide-react'
import type { Editor } from '@tiptap/react'
import ContractRichTextEditor from '../components/ContractRichTextEditor'
import { DEFAULT_CONTRACT_TEMPLATE, getActiveContractTemplate, saveContractTemplate, type ContractTemplate } from '../services/contracts'

const VARIABLES = ['cliente_nombre', 'rut', 'direccion', 'plan', 'valor_neto', 'iva', 'total', 'fecha_inicio', 'representante_legal', 'giro', 'medio_pago']

export default function PlantillaContrato() {
  const [template, setTemplate] = useState<ContractTemplate | null>(null)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [content, setContent] = useState(DEFAULT_CONTRACT_TEMPLATE)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getActiveContractTemplate()
      .then((activeTemplate) => {
        if (!active) return
        setTemplate(activeTemplate)
        setContent(activeTemplate.content)
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la plantilla.')
      })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [])

  const handleEditorReady = useCallback((instance: Editor | null) => setEditor(instance), [])

  async function saveTemplate() {
    setIsSaving(true)
    setError('')
    setMessage('')
    try {
      const saved = await saveContractTemplate(content)
      setTemplate(saved)
      setMessage(`Plantilla guardada como versión ${saved.version}. Los borradores existentes no fueron modificados.`)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la plantilla.')
    } finally {
      setIsSaving(false)
    }
  }

  function insertVariable(variable: string) {
    editor?.chain().focus().insertContent(`{{${variable}}}`).run()
  }

  if (isLoading) return <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18} /> Cargando plantilla...</div>

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-primary-50 text-primary-700"><FileText size={21} /></span>
          <div><h1 className="text-xl font-semibold text-slate-900">Plantilla maestra de contrato</h1><p className="mt-1 text-sm text-slate-500">Cada guardado crea una versión nueva y conserva las anteriores.</p></div>
        </div>
        <button type="button" onClick={() => void saveTemplate()} disabled={isSaving} className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-md bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"><Save size={16} />{isSaving ? 'Guardando...' : 'Guardar nueva versión'}</button>
      </header>

      {(error || message) && <p role={error ? 'alert' : 'status'} className={`rounded-md px-4 py-3 text-sm ${error ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{error || message}</p>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-sm"><span className="font-semibold text-slate-800">Documento base</span><span className="text-slate-500">Versión {template?.version ?? '—'}</span></div>
          <div className="p-4"><ContractRichTextEditor content={content} onUpdate={setContent} onEditorReady={handleEditorReady} /></div>
        </section>
        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-800">Variables disponibles</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">Pulsa una variable para insertarla al final de la selección.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {VARIABLES.map((variable) => <button key={variable} type="button" onClick={() => insertVariable(variable)} className="rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-700 hover:border-primary-300 hover:bg-primary-50">{`{{${variable}}}`}</button>)}
          </div>
        </aside>
      </div>
    </div>
  )
}