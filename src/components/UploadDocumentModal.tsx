import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { FileSpreadsheet, FileText, FileUp, Upload, X } from 'lucide-react'
import type { DocumentType } from '../types'

export interface UploadDocumentValues {
  nombre: string
  categoria: string
  file: File
  tipo: DocumentType
}

interface UploadDocumentModalProps {
  categories: string[]
  isSaving: boolean
  onClose: () => void
  onSave: (values: UploadDocumentValues) => void | Promise<void>
}

function getDocumentType(fileName: string): DocumentType | null {
  const extension = fileName.split('.').pop()?.toLocaleLowerCase()
  if (extension === 'pdf') return 'PDF'
  if (extension === 'xls' || extension === 'xlsx') return 'Excel'
  return null
}

function formatFileSize(size: number): string {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export default function UploadDocumentModal({
  categories,
  isSaving,
  onClose,
  onSave,
}: UploadDocumentModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function selectFile(selectedFile?: File) {
    if (!selectedFile) return
    if (!getDocumentType(selectedFile.name)) {
      setFile(null)
      setError('Selecciona un archivo PDF, XLS o XLSX.')
      return
    }
    setFile(selectedFile)
    setError('')
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    setIsDragging(false)
    selectFile(event.dataTransfer.files[0])
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file) {
      setError('Adjunta un archivo para continuar.')
      return
    }
    if (!categoria.trim()) {
      setError('Ingresa una categoría para el documento.')
      return
    }

    const tipo = getDocumentType(file.name)
    if (!tipo) {
      setError('El formato de archivo seleccionado no es compatible.')
      return
    }

    await onSave({ nombre: nombre.trim(), categoria: categoria.trim(), file, tipo })
  }

  const FileIcon = file && getDocumentType(file.name) === 'PDF' ? FileText : FileSpreadsheet

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/45 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-modal-title"
        className="my-auto w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-950/20"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5 sm:px-7">
          <div>
            <h2 id="upload-modal-title" className="text-lg font-semibold text-slate-900">
              Subir documento
            </h2>
            <p className="mt-1 text-sm text-slate-500">Completa los datos para guardar el archivo en el catálogo.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Cerrar ventana"
            className="flex size-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6 sm:px-7">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            aria-label="Seleccionar archivo PDF o Excel"
            onChange={(event) => selectFile(event.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSaving}
            onDragOver={(event) => {
              event.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex min-h-36 w-full flex-col items-center justify-center rounded-xl border border-dashed px-5 py-6 text-center transition ${
              isDragging
                ? 'border-primary-500 bg-primary-50'
                : 'border-slate-300 bg-slate-50/70 hover:border-primary-400 hover:bg-primary-50/50'
            }`}
          >
            {file ? (
              <>
                <span className="flex size-11 items-center justify-center rounded-xl bg-white text-primary-600 shadow-sm">
                  <FileIcon size={22} />
                </span>
                <span className="mt-3 max-w-full truncate text-sm font-semibold text-slate-800">{file.name}</span>
                <span className="mt-1 text-xs text-slate-500">{formatFileSize(file.size)} · Pulsa para cambiar</span>
              </>
            ) : (
              <>
                <span className="flex size-11 items-center justify-center rounded-xl bg-white text-primary-600 shadow-sm">
                  <Upload size={21} />
                </span>
                <span className="mt-3 text-sm font-semibold text-slate-800">
                  Arrastra un archivo aquí o <span className="text-primary-600">selecciónalo</span>
                </span>
                <span className="mt-1 text-xs text-slate-500">Formatos admitidos: PDF, XLS y XLSX</span>
              </>
            )}
          </button>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="document-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                Nombre del documento
              </label>
              <input
                id="document-name"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                disabled={isSaving}
                required
                maxLength={120}
                placeholder="Ej. Planilla de remuneraciones - Septiembre"
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="document-category" className="mb-1.5 block text-sm font-medium text-slate-700">
                Categoría
              </label>
              <input
                id="document-category"
                list="document-categories"
                value={categoria}
                onChange={(event) => setCategoria(event.target.value)}
                disabled={isSaving}
                required
                maxLength={60}
                placeholder="Selecciona o escribe una categoría"
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
              <datalist id="document-categories">
                {categories.map((item) => <option key={item} value={item} />)}
              </datalist>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white shadow-sm shadow-primary-600/20 transition hover:bg-primary-700 disabled:cursor-wait disabled:opacity-70"
            >
              {isSaving ? <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <FileUp size={16} />}
              {isSaving ? 'Cargando...' : 'Guardar documento'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
