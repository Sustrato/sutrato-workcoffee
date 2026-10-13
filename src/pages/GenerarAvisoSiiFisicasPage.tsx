import { useState, useEffect, useRef } from 'react'
import html2pdf from 'html2pdf.js'
import { supabase } from '../services/supabase'
import { Download, Send, RefreshCw } from 'lucide-react'

const BUCKET = 'documentos_oficinas'
const CARPETA = 'avisos_sii_fisicas'

export default function GenerarAvisoSiiFisicasPage() {
  const [empresasNoVigentes, setEmpresasNoVigentes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const documentoRef = useRef<HTMLDivElement>(null)

  // 🔄 Cargar oficinas físicas con vigencia "NO VIGENTE"
  const fetchEmpresasNoVigentes = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('oficinas_fisicas')
      .select('nombre_cliente, rut_empresa, tipo_espacio, direccion_registrada, vigencia')
      .eq('vigencia', 'NO VIGENTE')

    if (error) {
      console.error('Error al cargar empresas no vigentes:', error.message)
    } else if (data) {
      const lista = data.map((f) => ({
        tipo_servicio: f.tipo_espacio || 'Oficina física',
        contribuyente: f.nombre_cliente,
        rut: f.rut_empresa || 'Sin RUT',
        direccion: f.direccion_registrada || '18 de Septiembre 537, Arica'
      }))
      setEmpresasNoVigentes(lista)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchEmpresasNoVigentes()
  }, [])

  const handleImprimirAviso = () => {
    window.print()
  }

  // 📤 Generar PDF, subirlo al bucket y registrar el aviso en el historial
  const handleGuardarAvisoHistorial = async () => {
    if (empresasNoVigentes.length === 0) {
      return alert('No hay empresas no vigentes para consolidar en el informe.')
    }
    if (!documentoRef.current) return

    setGenerating(true)
    try {
      const fechaHoy = new Date().toISOString().split('T')[0]
      const nombreArchivo = `aviso_consolidado_sii_fisicas_${fechaHoy}.pdf`
      const path = `${CARPETA}/${nombreArchivo}`

      // 1. Generar el PDF desde el documento en pantalla
      const pdfBlob: Blob = await html2pdf()
        .set({
          margin: 10,
          filename: nombreArchivo,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(documentoRef.current)
        .outputPdf('blob')

      // 2. Subir al bucket con el contentType correcto
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, pdfBlob, { contentType: 'application/pdf', upsert: true })
      if (uploadError) throw uploadError

      // 3. Obtener la URL pública real del archivo subido
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)

      // 4. Registrar en el historial
      const { error } = await supabase.from('avisos_sii_historial_fisicas').insert([
        {
          nombre_archivo: nombreArchivo,
          documento_url: urlData.publicUrl
        }
      ])
      if (error) throw error

      alert('¡Aviso consolidado de oficinas físicas registrado en el historial del SII con éxito!')
    } catch (err: any) {
      alert('Error al registrar aviso en historial: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 font-sans">

      {/* Botones de Acción Superior (Ocultos al Imprimir) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Generar Aviso Consolidado SII - Oficinas Físicas</h1>
          <p className="text-xs text-slate-500">Petición administrativa de cese de arriendos para oficinas físicas.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchEmpresasNoVigentes}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>

          <button
            onClick={handleImprimirAviso}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 shadow-sm"
          >
            <Download size={14} /> Imprimir / PDF
          </button>

          <button
            onClick={handleGuardarAvisoHistorial}
            disabled={generating}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#C5A059] hover:bg-[#b59049] text-slate-950 font-bold rounded-xl text-xs shadow transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Send size={14} /> {generating ? 'Generando y guardando...' : 'Registrar en Historial SII'}
          </button>
        </div>
      </div>

      {/* 📄 FORMATO DOCUMENTO OFICIAL PARA EL SII */}
      <div
        ref={documentoRef}
        className="bg-white p-10 border border-slate-200 rounded-2xl shadow-md text-xs leading-relaxed text-slate-900 print:border-none print:shadow-none print:p-0 space-y-6"
      >

        {/* Encabezado Institucional */}
        <div>
          <p className="font-bold text-slate-700">SUTRATO LIMITADA | SUTRATO WORKCOFFEE</p>
          <h2 className="text-base font-black text-slate-900 uppercase tracking-wide mt-1">PETICIÓN ADMINISTRATIVA</h2>
          <p className="font-bold text-slate-800">Aviso de Oficina Física: cese de arriendos</p>
        </div>

        {/* Cabecera Solicitante */}
        <div className="border border-slate-300 rounded-lg p-4 grid grid-cols-2 gap-4 bg-slate-50/50">
          <div>
            <p><strong>A:</strong> DIRECTOR REGIONAL DEL SERVICIO DE IMPUESTOS INTERNOS</p>
            <p><strong>Dirección Regional:</strong> XV Dirección Regional Arica</p>
          </div>
          <div>
            <p><strong>Solicitante:</strong> SUTRATO LIMITADA</p>
            <p><strong>RUT:</strong> 77.935.903-4</p>
            <p><strong>Representante legal:</strong> Jorge García Lira | RUT 19.905.955-6</p>
          </div>
        </div>

        {/* Fecha y Ciudad */}
        <div className="text-right font-medium">
          Arica, {new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>

        {/* Materia y Cuerpo */}
        <div className="space-y-4">
          <p className="font-bold text-sm">
            Materia: Petición administrativa de cese de arriendos de oficina física.
          </p>
          <p className="text-justify">
            Por medio de la presente, don <strong>Jorge García Lira</strong>, en representación de <strong>SUTRATO LIMITADA</strong>, viene en informar que los contribuyentes individualizados a continuación ya no mantienen vigente el servicio de arriendo de oficina en las dependencias de <strong>18 de Septiembre 537, Arica</strong>:
          </p>
        </div>

        {/* TABLA CONSOLIDADORA DE CONTRIBUYENTES NO VIGENTES */}
        <table className="w-full text-left border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
              <th className="p-2 border-r border-slate-300 w-12 text-center">N.°</th>
              <th className="p-2 border-r border-slate-300">Tipo de servicio</th>
              <th className="p-2 border-r border-slate-300">Contribuyente</th>
              <th className="p-2 border-r border-slate-300">RUT</th>
              <th className="p-2">Dirección registrada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300">
            {empresasNoVigentes.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-6 text-slate-400 font-medium">
                  No hay empresas registradas como NO VIGENTES en oficinas físicas.
                </td>
              </tr>
            ) : (
              empresasNoVigentes.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-2 border-r border-slate-300 text-center font-bold">{idx + 1}</td>
                  <td className="p-2 border-r border-slate-300">{item.tipo_servicio}</td>
                  <td className="p-2 border-r border-slate-300 font-bold">{item.contribuyente}</td>
                  <td className="p-2 border-r border-slate-300">{item.rut}</td>
                  <td className="p-2">{item.direccion}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Cierre Legal */}
        <div className="space-y-4">
          <p className="text-justify">
            En consecuencia, se deja constancia de que los contribuyentes individualizados ya no cuentan con autorización de <strong>SUTRATO LIMITADA</strong> para utilizar el domicilio ubicado en <strong>18 de Septiembre 537, Arica</strong> como domicilio tributario, comercial, postal o para la recepción de correspondencia y notificaciones.
          </p>
          <p className="text-justify">
            Por lo anterior, se solicita tener por presentado este aviso consolidado e incorporarlo a los antecedentes administrativos correspondientes, para las revisiones y actualizaciones que procedan.
          </p>
          <p className="text-justify">
            La presente comunicación se limita a informar el cese de los servicios y arriendos indicados, sin consignar fechas de inicio o de término de las respectivas relaciones contractuales.
          </p>
        </div>

        {/* Firma */}
        <div className="pt-8 space-y-2">
          <p>Sin otro particular, saluda atentamente,</p>
          <div className="pt-4">
            <p className="font-bold">JORGE GARCÍA LIRA</p>
            <p>Representante legal | RUT 19.905.955-6</p>
            <p>SUTRATO LIMITADA | RUT 77.935.903-4</p>
            <p className="text-slate-500">Contacto: gerencia@sutrato.com | +56 9 3702 4457</p>
            <p className="text-slate-500">18 de Septiembre 537, Arica</p>
          </div>
        </div>

      </div>
    </div>
  )
}