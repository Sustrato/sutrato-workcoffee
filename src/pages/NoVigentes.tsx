import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, ArrowLeft, Building2, LoaderCircle, Printer, RefreshCw } from 'lucide-react'
import { supabase } from '../services/supabase'
import { saveSiiNotice } from '../services/siiNotices'

interface Empresa {
  id: string | number
  nombre: string
  rut: string
  estado: string | boolean | null
  direccion: string | null
  representante_legal: string | null
  rut_representante: string | null
  contacto: string | null
}

function formatToday(): string {
  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
}

export default function NoVigentes() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [empresasAviso, setEmpresasAviso] = useState<Empresa[]>([])
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [shouldAutoGeneratePdf, setShouldAutoGeneratePdf] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isArchiving, setIsArchiving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadEmpresas = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const { data, error: queryError } = await supabase
        .from('empresas')
        .select('id, nombre, rut, estado, direccion, representante_legal, rut_representante, contacto')
        .eq('estado', 'NO VIGENTE')
        .order('nombre', { ascending: true })

      if (queryError) throw new Error(queryError.message)
      setEmpresas((data ?? []) as Empresa[])
    } catch (loadError) {
      console.error('Error al cargar empresas no vigentes:', loadError)
      setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar las empresas.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const requestId = window.setTimeout(() => void loadEmpresas(), 0)
    return () => window.clearTimeout(requestId)
  }, [loadEmpresas])

  function handleGenerateNotice() {
    if (empresas.length === 0 || isArchiving) return
    setError('')
    setSuccess('')
    setEmpresasAviso([...empresas])
    setIsPreviewOpen(true)
    setShouldAutoGeneratePdf(true)
  }

  const handlePrint = useCallback(async () => {
    if (empresasAviso.length === 0 || isArchiving) return
    setIsArchiving(true)
    setError('')
    setSuccess('')

    try {
      const documentElement = document.querySelector<HTMLElement>('.sii-document')
      if (!documentElement) throw new Error('No se encontró el documento para generar el PDF.')

      const filename = `aviso_consolidado_sii_${new Date().toISOString().slice(0, 10)}.pdf`
      const html2pdf = (await import('html2pdf.js')).default
      const pdfBlob = await html2pdf()
        .set({
          margin: [15, 15, 15, 15],
          filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' },
        })
        .from(documentElement)
        .outputPdf('blob') as Blob

      const companyIds = empresasAviso.map((empresa) => empresa.id)
      await saveSiiNotice(pdfBlob, filename, companyIds)
      setEmpresas((current) => current.filter((empresa) => !companyIds.includes(empresa.id)))
      setSuccess(`Aviso guardado en Historial SII y ${companyIds.length} empresas desvinculadas.`)

      const pdfUrl = URL.createObjectURL(pdfBlob)
      const downloadLink = document.createElement('a')
      downloadLink.href = pdfUrl
      downloadLink.download = filename
      document.body.appendChild(downloadLink)
      downloadLink.click()
      downloadLink.remove()
      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 0)
      window.print()
    } catch (generationError) {
      console.error('No se pudo generar o guardar el aviso SII:', generationError)
      setError(generationError instanceof Error ? generationError.message : 'No se pudo generar el aviso SII.')
    } finally {
      setIsArchiving(false)
    }
  }, [empresasAviso, isArchiving])

  useEffect(() => {
    if (!isPreviewOpen || !shouldAutoGeneratePdf) return
    const frameId = window.requestAnimationFrame(() => {
      setShouldAutoGeneratePdf(false)
      void handlePrint()
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [handlePrint, isPreviewOpen, shouldAutoGeneratePdf])

  if (isPreviewOpen) {
    return (
      <div className="mx-auto min-h-screen max-w-4xl bg-white p-4 text-slate-800 sm:p-8 print:max-w-none print:p-0">
        <style>{`
          .sii-document { color: #1e293b; background-color: #ffffff; border-color: #e2e8f0; }
          .sii-document .sii-doc-heading { color: #0f172a; }
          .sii-document .sii-doc-muted { color: #334155; }
          .sii-document .sii-doc-secondary { color: #475569; }
          .sii-document .sii-doc-signature { color: #94a3b8; }
          .sii-document .sii-doc-panel { color: #1e293b; background-color: #f8fafc; border-color: #e2e8f0; }
          .sii-document .sii-doc-table-header { background-color: #f1f5f9; }
          .sii-document .sii-doc-rule { border-color: #cbd5e1; }
          .sii-document .sii-doc-cell { border-color: #94a3b8; }
          .sii-document .sii-doc-signature-rule { border-color: #64748b; }
          @page {
            size: auto;
            margin: 15mm;
          }
          @media print {
            aside, .app-navbar { display: none !important; }
            main { min-height: 0 !important; padding: 0 !important; }
            html, body { width: 100%; margin: 0 !important; padding: 0 !important; background: #fff !important; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .sii-document { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; font-size: 10.5pt !important; line-height: 1.3 !important; }
              .sii-document .sii-doc-print-white { background-color: #ffffff !important; }
            .sii-document table { width: 100% !important; table-layout: fixed; break-inside: auto; font-size: 9pt !important; line-height: 1.2 !important; }
            .sii-document tr { break-inside: avoid; break-after: auto; }
            .sii-document thead { display: table-header-group; }
            .sii-document footer { break-inside: avoid; }
            .sii-document p { margin-top: 0 !important; margin-bottom: 5pt !important; }
            .sii-document header { margin-bottom: 9pt !important; padding-bottom: 7pt !important; }
            .sii-document section { margin-bottom: 9pt !important; padding: 7pt !important; }
            .sii-document .sii-table-wrap { margin-top: 8pt !important; margin-bottom: 8pt !important; overflow: visible !important; }
            .sii-document th, .sii-document td { padding: 4pt !important; overflow-wrap: anywhere; }
            .sii-document footer { margin-top: 13pt !important; padding-top: 8pt !important; }
          }
        `}</style>
        {(error || success) && (
          <p role={error ? 'alert' : 'status'} className={`mb-4 rounded-lg px-4 py-3 text-sm print:hidden ${error ? 'border border-rose-200 bg-rose-50 text-rose-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            {error || success}
          </p>
        )}
        <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
          <button
            type="button"
            disabled={isArchiving}
            onClick={() => {
              setIsPreviewOpen(false)
              void loadEmpresas()
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
          >
            <ArrowLeft size={17} /> Volver a empresas no vigentes
          </button>
          <button
            type="button"
            disabled={isArchiving}
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-wait disabled:opacity-60"
          >
            {isArchiving ? <LoaderCircle size={17} className="animate-spin" /> : <Printer size={17} />}
            {isArchiving ? 'Generando y guardando PDF...' : 'Descargar / imprimir y guardar PDF'}
          </button>
        </div>

        <article className="sii-document rounded-xl border p-6 text-sm leading-relaxed shadow-sm sm:p-10 print:rounded-none print:border-0 print:px-1 print:py-0 print:text-sm print:leading-snug print:shadow-none">
          <header className="sii-doc-rule mb-6 flex items-start justify-between gap-4 border-b pb-4 print:mb-3 print:pb-2">
            <div>
              <h1 className="sii-doc-heading text-base font-bold print:text-sm">SUTRATO LIMITADA | SUTRATO WORKCOFFEE</h1>
            </div>
            <div className="sii-doc-muted text-right text-xs">
              <p className="text-lg font-bold tracking-wide print:text-base">PETICIÓN ADMINISTRATIVA</p>
              <p className="mb-0">Aviso de Oficina Virtual: cese de arriendos</p>
            </div>
          </header>

          <section className="sii-doc-panel mb-6 grid gap-4 rounded-lg border p-4 text-xs sm:grid-cols-2 print:mb-2 print:gap-2 print:rounded-none print:p-2 print:text-[11px] sii-doc-print-white">
            <div>
              <p><strong>A:</strong> DIRECTOR REGIONAL DEL SERVICIO DE IMPUESTOS INTERNOS</p>
              <p className="mt-1"><strong>Dirección Regional:</strong> XV Dirección Regional Arica</p>
            </div>
            <div>
              <p><strong>Solicitante:</strong> SUTRATO LIMITADA</p>
              <p><strong>RUT:</strong> 77.935.903-4</p>
              <p className="mt-1"><strong>Representante legal:</strong> Jorge García Lira | RUT 19.905.955-6</p>
            </div>
          </section>

          <p className="mb-6 text-right text-xs print:mb-2 print:text-sm">Arica, {formatToday()}</p>
          <p className="mb-4 print:mb-2 print:text-sm"><strong>Materia:</strong> Petición administrativa de cese de arriendos de oficina virtual.</p>
          <p className="mb-4 text-justify print:mb-2 print:text-sm">
            Por medio de la presente, don <strong>Jorge García Lira</strong>, en representación de
            {' '}<strong>SUTRATO LIMITADA</strong>, viene en informar que los contribuyentes individualizados
            a continuación ya no mantienen vigente el servicio de oficina virtual o arriendo de oficina
            en las dependencias de <strong>18 de Septiembre 537, Arica</strong>:
          </p>

          <div className="sii-table-wrap my-6 overflow-x-auto print:my-2 print:overflow-visible">
            <table className="sii-doc-cell w-full border-collapse border text-left text-xs print:text-sm">
              <thead>
                <tr className="sii-doc-table-header sii-doc-print-white">
                  <th className="sii-doc-cell border p-2 print:p-1">N.º</th>
                  <th className="sii-doc-cell border p-2 print:p-1">Tipo de servicio</th>
                  <th className="sii-doc-cell border p-2 print:p-1">Contribuyente</th>
                  <th className="sii-doc-cell border p-2 print:p-1">RUT</th>
                  <th className="sii-doc-cell border p-2 print:p-1">Dirección registrada</th>
                </tr>
              </thead>
              <tbody>
                {empresasAviso.map((empresa, index) => (
                  <tr key={String(empresa.id)}>
                    <td className="sii-doc-cell border p-2 print:p-1">{index + 1}</td>
                    <td className="sii-doc-cell border p-2 print:p-1">Oficina virtual</td>
                    <td className="sii-doc-cell border p-2 print:p-1">{empresa.nombre}</td>
                    <td className="sii-doc-cell border p-2 print:p-1">{empresa.rut}</td>
                    <td className="sii-doc-cell border p-2 print:p-1">{empresa.direccion || '18 de Septiembre 537, Arica'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mb-4 text-justify print:mb-2 print:text-sm">
            En consecuencia, se deja constancia de que los contribuyentes individualizados ya no cuentan con
            autorización de <strong>SUTRATO LIMITADA</strong> para utilizar el domicilio ubicado en
            {' '}<strong>18 de Septiembre 537, Arica</strong> como domicilio tributario, comercial, postal o
            para la recepción de correspondencia y notificaciones.
          </p>
          <p className="mb-4 text-justify print:mb-2 print:text-sm">
            Por lo anterior, se solicita tener por presentado este aviso consolidado e incorporarlo a los antecedentes
            administrativos correspondientes, para las revisiones y actualizaciones que procedan.
          </p>
          <p className="mb-8 text-justify print:mb-3 print:text-sm">
            La presente comunicación se limita a informar el cese de los servicios y arriendos indicados, sin consignar fechas de inicio o de término de las respectivas relaciones contractuales.
          </p>

          <footer className="sii-doc-rule mt-12 flex flex-col-reverse items-start justify-between gap-8 border-t pt-8 sm:flex-row sm:items-end print:mt-4 print:gap-3 print:pt-3">
            <div className="min-w-64 text-center">
              <p className="mb-10 text-left text-sm print:mb-3 print:text-sm">Sin otro particular, saluda atentamente,</p>
              <div className="sii-doc-signature mb-2 flex h-14 items-end justify-center text-xs print:mb-1 print:h-8">Firma</div>
              <div className="sii-doc-signature-rule border-t px-5 pt-2 print:px-2 print:pt-1">
                <p className="sii-doc-heading mb-0 text-xs font-bold print:text-xs">JORGE GARCÍA LIRA</p>
                <p className="sii-doc-secondary mb-0 text-xs print:text-xs">Representante legal | RUT 19.905.955-6</p>
                <p className="sii-doc-secondary mb-0 text-xs print:text-xs">SUTRATO LIMITADA | RUT 77.935.903-4</p>
                <p className="sii-doc-secondary mb-0 mt-2 text-left text-xs print:mt-1 print:text-xs">Contacto: gerencia@sutrato.com | +56 9 3702 4457</p>
                <p className="sii-doc-secondary mb-0 text-left text-xs print:text-xs">18 de Septiembre 537, Arica</p>
              </div>
            </div>
          </footer>
        </article>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <AlertCircle size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Empresas no vigentes</h1>
            <p className="mt-1 text-sm text-slate-500">Prepara un aviso consolidado de cese de arriendos para el SII.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => void loadEmpresas()}
            disabled={isLoading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-60"
          >
            {isLoading ? <LoaderCircle size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Actualizar
          </button>
          <button
            type="button"
            onClick={() => void handleGenerateNotice()}
            disabled={isLoading || isArchiving || empresas.length === 0}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isArchiving && <LoaderCircle size={16} className="animate-spin" />}
            {isArchiving ? 'Generando y guardando aviso...' : 'Generar Aviso Consolidado SII'}
          </button>
        </div>
      </section>

      {error && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between">
          <span>No fue posible cargar las empresas: {error}</span>
          <button type="button" onClick={() => void loadEmpresas()} className="font-semibold underline">Reintentar</button>
        </div>
      )}
      {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p>}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-14 text-sm text-slate-500">
          <LoaderCircle size={18} className="animate-spin text-primary-600" /> Cargando empresas...
        </div>
      ) : empresas.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center text-slate-500">
          <Building2 className="mx-auto mb-3 size-12 text-slate-300" />
          <p className="text-sm font-semibold text-slate-800">No hay empresas pendientes de cese</p>
          <p className="mt-1 text-sm">Las empresas con estado no_vigente aparecerán aquí.</p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.02]">
          <div className="border-b border-slate-100 px-5 py-4">
            <p className="text-sm font-semibold text-slate-800">{empresas.length} empresas pendientes de aviso</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 sm:px-6">Empresa</th>
                  <th className="px-4 py-3">RUT</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {empresas.map((empresa) => (
                  <tr key={String(empresa.id)} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-5 py-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600"><Building2 size={17} /></span>
                        <span>
                          <span className="block text-sm font-semibold text-slate-800">{empresa.nombre}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">{empresa.direccion || 'Dirección no registrada'}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{empresa.rut}</td>
                    <td className="px-4 py-4"><span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">NO VIGENTE</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
