import { useState, useEffect, useRef } from 'react'
import html2pdf from 'html2pdf.js'
import { supabase } from '../services/supabase'
import { Search, FileText, RefreshCw, ExternalLink, Upload, Send, Download } from 'lucide-react'

interface AvisoSIIFisica {
  id: string
  nombre_archivo: string
  documento_url: string
  created_at: string
  respuesta_sii_url?: string
}

const BUCKET_NAME = 'documentos_oficinas'

function formatCreatedAt(value: string): string {
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(value))
}

function nombreSeguro(nombre: string): string {
  return nombre.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export default function HistorialSiiOfFisicasPage() {
  const [avisos, setAvisos] = useState<AvisoSIIFisica[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Estados para el Modal del Aviso Consolidado SII
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [empresasNoVigentes, setEmpresasNoVigentes] = useState<any[]>([])
  const [generating, setGenerating] = useState(false)

  // Referencia al documento oficial limpio
  const documentoRef = useRef<HTMLDivElement>(null)

  // 🔄 Cargar historial desde la tabla avisos_sii_historial_fisicas
  const fetchHistorialSII = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('avisos_sii_historial_fisicas')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error al cargar historial SII de oficinas físicas:', error.message)
    } else if (data) {
      setAvisos(data)
    }
    setLoading(false)
  }

  // 🔄 Cargar empresas no vigentes usando las columnas reales de oficinas_fisicas
  const fetchEmpresasNoVigentes = async () => {
    const { data, error } = await supabase
      .from('oficinas_fisicas')
      .select('nombre_cliente, rut_empresa, tipo_espacio, vigencia')
      .eq('vigencia', 'NO VIGENTE')

    if (error) {
      console.error('Error al cargar empresas no vigentes:', error.message)
    } else if (data) {
      const lista = data.map((f) => ({
        tipo_servicio: f.tipo_espacio || 'Oficina física',
        contribuyente: f.nombre_cliente || 'Sin nombre',
        rut: f.rut_empresa || 'Sin RUT',
        direccion: '18 de Septiembre 537, Arica'
      }))
      setEmpresasNoVigentes(lista)
    }
  }

  useEffect(() => {
    fetchHistorialSII()
    fetchEmpresasNoVigentes()
  }, [])

  // 🔒 Ver documento: abre el enlace del archivo PDF real guardado
  const handleVerDocumento = async (url?: string) => {
    if (!url) return alert('No hay documento adjunto.')
    if (url.startsWith('http')) {
      window.open(url, '_blank')
      return
    }
    await fetchEmpresasNoVigentes()
    setIsModalOpen(true)
  }

  const handleSubirAvisoManual = async (file: File) => {
    setUploading(true)
    try {
      const fileName = file.name
      const filePath = `avisos_sii_fisicas/${Date.now()}_${nombreSeguro(fileName)}`

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, { contentType: file.type || 'application/pdf' })

      if (uploadErr) throw uploadErr

      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath)

      const documentoUrl = publicUrlData.publicUrl

      const { error: insertErr } = await supabase
        .from('avisos_sii_historial_fisicas')
        .insert([{ nombre_archivo: fileName, documento_url: documentoUrl }])

      if (insertErr) throw insertErr

      alert('¡Aviso SII de oficinas físicas registrado correctamente!')
      fetchHistorialSII()
    } catch (err: any) {
      alert('Error al subir el archivo: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSubirRespuestaSII = async (avisoId: string, file: File) => {
    try {
      const filePath = `respuestas_sii_fisicas/${avisoId}_${Date.now()}_${nombreSeguro(file.name)}`

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, { contentType: file.type || 'application/pdf' })

      if (uploadErr) throw uploadErr

      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath)

      const respuestaUrl = publicUrlData.publicUrl

      const { error: updateErr } = await supabase
        .from('avisos_sii_historial_fisicas')
        .update({ respuesta_sii_url: respuestaUrl })
        .eq('id', avisoId)

      if (updateErr) throw updateErr

      alert('¡Respuesta del SII adjuntada con éxito!')
      fetchHistorialSII()
    } catch (err: any) {
      alert('Error al subir respuesta del SII: ' + err.message)
    }
  }

  // 🚀 Generar PDF real mediante html2pdf sin errores de oklch, subirlo y registrarlo
  const handleGuardarAvisoHistorial = async () => {
    if (empresasNoVigentes.length === 0) {
      return alert('No hay empresas no vigentes para consolidar en el informe.')
    }
    if (!documentoRef.current) return

    setGenerating(true)
    try {
      const fechaHoy = new Date().toISOString().split('T')[0]
      const nombreArchivo = `aviso_consolidado_sii_fisicas_${fechaHoy}.pdf`
      const filePath = `avisos_sii_fisicas/${Date.now()}_${nombreArchivo}`

      const pdfBlob: Blob = await html2pdf()
        .set({
          margin: 10,
          filename: nombreArchivo,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(documentoRef.current)
        .outputPdf('blob')

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, pdfBlob, { upsert: true, contentType: 'application/pdf' })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath)

      const documentoUrl = publicUrlData.publicUrl

      const { error: insertError } = await supabase
        .from('avisos_sii_historial_fisicas')
        .insert([{ nombre_archivo: nombreArchivo, documento_url: documentoUrl }])

      if (insertError) {
        await supabase.storage.from(BUCKET_NAME).remove([filePath])
        throw insertError
      }

      const ruts = empresasNoVigentes.map((e) => e.rut).filter((r) => r !== 'Sin RUT')
      if (ruts.length > 0) {
        const { error: updateError } = await supabase
          .from('oficinas_fisicas')
          .update({ vigencia: 'DESVINCULADA' })
          .in('rut_empresa', ruts)

        if (updateError) {
          throw new Error('El aviso quedó guardado, pero falló la desvinculación: ' + updateError.message)
        }
      }

      alert('¡Aviso PDF generado, registrado en el historial y empresas pasadas a desvinculadas con éxito!')
      setIsModalOpen(false)
      fetchHistorialSII()
      fetchEmpresasNoVigentes()
    } catch (err: any) {
      alert('Error al registrar aviso en historial: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  const avisosFiltrados = avisos.filter((a) =>
    a.nombre_archivo?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="mx-auto max-w-7xl space-y-6 font-sans">
      
      {/* Encabezado */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Historial SII - Oficinas Físicas
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Registro de avisos consolidados de cese de arriendos y resoluciones del SII para oficinas físicas.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { fetchEmpresasNoVigentes(); setIsModalOpen(true) }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow transition"
          >
            <FileText size={16} /> Generar Aviso Consolidado SII ({empresasNoVigentes.length})
          </button>

          <button
            onClick={fetchHistorialSII}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>

          <label className="cursor-pointer flex items-center gap-2 bg-[#C5A059] hover:bg-[#b59049] text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow transition">
            <Upload size={16} />
            {uploading ? 'Subiendo...' : 'Subir aviso manual'}
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                if (e.target.files?.[0]) handleSubirAvisoManual(e.target.files[0])
                e.target.value = ''
              }}
            />
          </label>
        </div>
      </section>

      {/* Buscador */}
      <section className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center text-xs">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por nombre de archivo (ej: 2026-10)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
          />
        </div>
        <span className="text-slate-500 font-semibold">
          Total de registros: <strong className="text-slate-900">{avisosFiltrados.length}</strong>
        </span>
      </section>

      {/* Tabla del Historial SII */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#181818] text-[#C5A059] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-6">ARCHIVO</th>
                <th className="py-3.5 px-4">FECHA DE CREACIÓN</th>
                <th className="py-3.5 px-4 text-right">DOCUMENTO</th>
                <th className="py-3.5 px-4 text-right">RESPUESTA SII</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-slate-400 font-medium">
                    Cargando historial...
                  </td>
                </tr>
              ) : avisosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-slate-400 font-medium">
                    Aún no hay avisos SII registrados.
                  </td>
                </tr>
              ) : (
                avisosFiltrados.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="py-4 px-6 font-medium text-slate-800">
                      {item.nombre_archivo}
                    </td>
                    <td className="py-4 px-4 text-slate-600">
                      <time dateTime={item.created_at}>{formatCreatedAt(item.created_at)}</time>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleVerDocumento(item.documento_url)}
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:border-primary-300 hover:bg-emerald-50 hover:text-emerald-700 transition"
                      >
                        <ExternalLink size={15} /> Ver / descargar
                      </button>
                    </td>
                    <td className="py-4 px-4 text-right">
                      {item.respuesta_sii_url ? (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleVerDocumento(item.respuesta_sii_url)}
                            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:border-primary-300 hover:bg-blue-50 hover:text-blue-700 transition"
                          >
                            <ExternalLink size={15} /> Ver / descargar
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-primary-200 px-3 text-xs font-semibold text-primary-700 hover:bg-primary-50 transition">
                            <Upload size={15} /> Subir respuesta
                            <input
                              type="file"
                              accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) handleSubirRespuestaSII(item.id, e.target.files[0])
                                e.target.value = ''
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 🖤 MODAL: VISTA PREVIA COMPLETA CON ESTILOS EN LÍNEA SEGUROS (SIN OKLCH) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">PETICIÓN ADMINISTRATIVA</p>
                <h3 className="text-xl font-black text-slate-900">Aviso de Oficina Física: cese de arriendos</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold text-lg">
                ✕
              </button>
            </div>
            
            <div className="p-8 space-y-6 text-xs leading-relaxed text-slate-900">
              
              {/* 📄 DOCUMENTO OFICIAL CON ESTILOS EN LÍNEA EXPLICITOS */}
              <div 
                ref={documentoRef} 
                style={{ backgroundColor: '#ffffff', color: '#111827', padding: '24px', fontFamily: 'Arial, sans-serif' }}
                className="space-y-6"
              >
                <div>
                  <p style={{ fontWeight: 'bold', color: '#374151' }}>SUTRATO LIMITADA | SUTRATO WORKCOFFEE</p>
                  <h2 style={{ fontSize: '14px', fontWeight: '900', textTransform: 'uppercase', marginTop: '4px', color: '#111827' }}>PETICIÓN ADMINISTRATIVA</h2>
                  <p style={{ fontWeight: 'bold', color: '#1f2937' }}>Aviso de Oficina Física: cese de arriendos</p>
                </div>

                <div style={{ border: '1px solid #d1d5db', borderRadius: '8px', padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px', backgroundColor: '#f9fafb' }}>
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

                <div style={{ textAlign: 'right', fontWeight: '500' }}>
                  Arica, {new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ fontWeight: 'bold', fontSize: '13px' }}>
                    Materia: Petición administrativa de cese de arriendos de oficina física.
                  </p>
                  <p style={{ textAlign: 'justify' }}>
                    Por medio de la presente, don <strong>Jorge García Lira</strong>, en representación de <strong>SUTRATO LIMITADA</strong>, viene en informar que los contribuyentes individualizados a continuación ya no mantienen vigente el servicio de arriendo de oficina en las dependencias de <strong>18 de Septiembre 537, Arica</strong>:
                  </p>
                </div>

                {/* TABLA CONSOLIDADORA CON ESTILOS EN LÍNEA SEGUROS */}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d1d5db', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6', color: '#1f2937', fontWeight: 'bold', borderBottom: '1px solid #d1d5db' }}>
                      <th style={{ padding: '8px', borderRight: '1px solid #d1d5db', width: '48px', textAlign: 'center' }}>N.°</th>
                      <th style={{ padding: '8px', borderRight: '1px solid #d1d5db' }}>Tipo de servicio</th>
                      <th style={{ padding: '8px', borderRight: '1px solid #d1d5db' }}>Contribuyente</th>
                      <th style={{ padding: '8px', borderRight: '1px solid #d1d5db' }}>RUT</th>
                      <th style={{ padding: '8px' }}>Dirección registrada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empresasNoVigentes.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#9ca3af', fontWeight: '500' }}>
                          No hay empresas registradas como NO VIGENTES en oficinas físicas.
                        </td>
                      </tr>
                    ) : (
                      empresasNoVigentes.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #d1d5db' }}>
                          <td style={{ padding: '8px', borderRight: '1px solid #d1d5db', textAlign: 'center', fontWeight: 'bold' }}>{idx + 1}</td>
                          <td style={{ padding: '8px', borderRight: '1px solid #d1d5db' }}>{item.tipo_servicio}</td>
                          <td style={{ padding: '8px', borderRight: '1px solid #d1d5db', fontWeight: 'bold' }}>{item.contribuyente}</td>
                          <td style={{ padding: '8px', borderRight: '1px solid #d1d5db' }}>{item.rut}</td>
                          <td style={{ padding: '8px' }}>{item.direccion}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ textAlign: 'justify' }}>
                    En consecuencia, se deja constancia de que los contribuyentes individualizados ya no cuentan con autorización de <strong>SUTRATO LIMITADA</strong> para utilizar el domicilio ubicado en <strong>18 de Septiembre 537, Arica</strong> como domicilio tributario, comercial, postal o para la recepción de correspondencia y notificaciones.
                  </p>
                  <p style={{ textAlign: 'justify' }}>
                    Por lo anterior, se solicita tener por presentado este aviso consolidado e incorporarlo a los antecedentes administrativos correspondientes, para las revisiones y actualizaciones que procedan.
                  </p>
                  <p style={{ textAlign: 'justify' }}>
                    La presente comunicación se limita a informar el cese de los servicios y arriendos indicados, sin consignar fechas de inicio o de término de las respectivas relaciones contractuales.
                  </p>
                </div>

                <div style={{ paddingTop: '16px' }}>
                  <p>Sin otro particular, saluda atentamente,</p>
                  <div style={{ paddingTop: '12px' }}>
                    <p style={{ fontWeight: 'bold' }}>JORGE GARCÍA LIRA</p>
                    <p>Representante legal | RUT 19.905.955-6</p>
                    <p>SUTRATO LIMITADA | RUT 77.935.903-4</p>
                    <p style={{ color: '#6b7280' }}>Contacto: gerencia@sutrato.com | +56 9 3702 4457</p>
                    <p style={{ color: '#6b7280' }}>18 de Septiembre 537, Arica</p>
                  </div>
                </div>
              </div>
              {/* FIN DOCUMENTO OFICIAL */}

              {/* Botones de acción del Modal (fuera del PDF) */}
              <div className="pt-6 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-800 hover:bg-slate-100"
                >
                  <Download size={14} /> Imprimir / PDF
                </button>
                <button
                  type="button"
                  onClick={handleGuardarAvisoHistorial}
                  disabled={generating || empresasNoVigentes.length === 0}
                  className="flex items-center gap-1.5 px-5 py-2 bg-[#C5A059] hover:bg-[#b59049] text-slate-950 font-bold rounded-xl shadow transition disabled:opacity-50"
                >
                  <Send size={14} /> {generating ? 'Generando PDF y registrando...' : 'Registrar en Historial SII'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  )
}