import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { Search, FileText, ExternalLink, RefreshCw, Upload, CheckCircle2, Clock } from 'lucide-react'

interface EmpresaFisica {
  id: string
  nombre_cliente: string
  rut_empresa?: string
  rut?: string
  frecuencia_pago?: string
  contrato_url?: string
  estado?: string
  tipo_espacio?: string
  espacio_asignado?: string
  monto_mensual?: number
  representante_legal?: string
  rut_representante?: string
}

export default function ContratosFisicasPage() {
  const navigate = useNavigate()
  const [empresas, setEmpresas] = useState<EmpresaFisica[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  // 🔄 Cargar clientes de Oficinas Físicas desde Supabase
  const fetchEmpresas = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('oficinas_fisicas')
      .select('*')
      .order('nombre_cliente', { ascending: true })

    if (error) {
      console.error('Error al cargar contratos físicos:', error.message)
    } else if (data) {
      setEmpresas(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchEmpresas()
  }, [])

  // 📤 Subir PDF firmado directamente a Supabase Storage y guardar la ruta en la BD
  const handleSubirContratoPDF = async (empresaId: string, file: File) => {
    setUploadingId(empresaId)
    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `contratos_fisicas/${empresaId}_${Date.now()}.${fileExt}`

      // 1. Subir archivo al Bucket Privado 'documentos_oficinas'
      const { error: uploadErr } = await supabase.storage
        .from('documentos_oficinas')
        .upload(filePath, file, { upsert: true })

      if (uploadErr) throw uploadErr

      // 2. Obtener la URL base del objeto
      const { data: publicUrlData } = supabase.storage
        .from('documentos_oficinas')
        .getPublicUrl(filePath)

      const urlFinal = publicUrlData.publicUrl

      // 3. Actualizar la columna contrato_url en la tabla oficinas_fisicas
      const { error: updateErr } = await supabase
        .from('oficinas_fisicas')
        .update({ contrato_url: urlFinal })
        .eq('id', empresaId)

      if (updateErr) throw updateErr

      alert('¡Contrato firmado subido y guardado exitosamente!')
      fetchEmpresas()
    } catch (err: any) {
      alert('Error al subir el contrato: ' + err.message)
    } finally {
      setUploadingId(null)
    }
  }

  // 🔒 Abrir contrato privado de forma segura mediante URL Firmada
  const handleVerContrato = async (empresa: EmpresaFisica) => {
    if (!empresa.contrato_url) return

    try {
      // Extraer el path relativo dentro del bucket (ej: contratos_fisicas/id_123.pdf)
      let filePath = ''
      if (empresa.contrato_url.includes('/documentos_oficinas/')) {
        filePath = empresa.contrato_url.split('/documentos_oficinas/')[1]
      } else {
        filePath = empresa.contrato_url
      }

      filePath = decodeURIComponent(filePath)

      // Generar URL firmada temporal válida por 60 segundos para el usuario autenticado
      const { data, error } = await supabase.storage
        .from('documentos_oficinas')
        .createSignedUrl(filePath, 60)

      if (error) throw error

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
      }
    } catch (err: any) {
      alert('Error al obtener acceso seguro al contrato: ' + err.message)
    }
  }

  // 📄 Abrir borrador en la plantilla editora
  const handleAbrirBorrador = (empresa: EmpresaFisica) => {
    const queryParams = new URLSearchParams({
      id: String(empresa.id || ''),
      nombre: empresa.nombre_cliente || '',
      rut: empresa.rut_empresa || empresa.rut || '',
      espacio: empresa.espacio_asignado || empresa.tipo_espacio || 'Oficina N°1',
      monto: String(empresa.monto_mensual || '350000'),
      rep_nombre: empresa.representante_legal || '',
      rep_rut: empresa.rut_representante || '',
      origen: 'fisicas'
    }).toString()

    navigate(`/oficinas-fisicas/plantilla-contrato?${queryParams}`)
  }

  // Filtrado por Búsqueda (Nombre o RUT)
  const empresasFiltradas = empresas.filter((e) => {
    const nombre = e.nombre_cliente?.toLowerCase() || ''
    const rutVal = (e.rut_empresa || e.rut || '').toLowerCase()
    const busqueda = searchTerm.toLowerCase()
    return nombre.includes(busqueda) || rutVal.includes(busqueda)
  })

  return (
    <div className="mx-auto max-w-7xl space-y-6 font-sans">
      
      {/* Encabezado */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Contratos de oficinas físicas
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Selecciona una empresa para preparar, subir o consultar su contrato.
          </p>
        </div>

        {/* Buscador */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por nombre o RUT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#C5A059] bg-white shadow-sm"
          />
        </div>
      </section>

      {/* Tabla de Contratos */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Listado de Arriendos Físicos ({empresasFiltradas.length})
          </span>
          <button
            onClick={fetchEmpresas}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-6">Empresa / Cliente</th>
                <th className="py-3.5 px-4">RUT</th>
                <th className="py-3.5 px-4">Frecuencia</th>
                <th className="py-3.5 px-4">Contrato</th>
                <th className="py-3.5 px-6 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400 font-medium">
                    Cargando listado de contratos...
                  </td>
                </tr>
              ) : empresasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400 font-medium">
                    No se encontraron empresas ni contratos registrados.
                  </td>
                </tr>
              ) : (
                empresasFiltradas.map((emp) => {
                  const tieneContrato = Boolean(emp.contrato_url)
                  const isUploading = uploadingId === emp.id

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-6 font-bold text-slate-900">
                        {emp.nombre_cliente}
                        <span className="block text-[11px] font-semibold text-amber-700 mt-0.5">
                          {emp.espacio_asignado || emp.tipo_espacio || 'Oficina Física'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-700 font-medium">
                        {emp.rut_empresa || emp.rut || 'Sin RUT'}
                      </td>
                      <td className="py-4 px-4 text-slate-600">
                        {emp.frecuencia_pago || 'Mensual'}
                      </td>

                      {/* BADGE ESTADO DEL CONTRATO */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            tieneContrato
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {tieneContrato ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                          {tieneContrato ? 'Guardado' : 'Pendiente'}
                        </span>
                      </td>

                      {/* BOTONES DE ACCIÓN */}
                      <td className="py-4 px-6 text-right space-x-2">
                        {tieneContrato ? (
                          <div className="inline-flex items-center gap-2">
                            {/* Botón con URL firmada temporal de 60s */}
                            <button
                              onClick={() => handleVerContrato(emp)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 transition shadow-sm"
                            >
                              <FileText size={13} /> Ver PDF
                              <ExternalLink size={12} className="text-emerald-500" />
                            </button>

                            {/* Reemplazar PDF por uno nuevo */}
                            <label
                              title="Reemplazar o subir nuevo contrato PDF"
                              className="cursor-pointer p-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-500 transition inline-block"
                            >
                              <Upload size={14} />
                              <input
                                type="file"
                                accept="application/pdf"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) handleSubirContratoPDF(emp.id, e.target.files[0])
                                }}
                              />
                            </label>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2">
                            {/* Botón 1: Generar / Editar borrador */}
                            <button
                              onClick={() => handleAbrirBorrador(emp)}
                              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                            >
                              Abrir borrador
                            </button>

                            {/* Botón 2: Subir PDF Firmado desde el PC */}
                            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#C5A059] hover:bg-[#b59049] text-slate-950 rounded-lg text-xs font-bold transition shadow-sm">
                              <Upload size={13} />
                              {isUploading ? 'Subiendo...' : 'Subir PDF'}
                              <input
                                type="file"
                                accept="application/pdf"
                                className="hidden"
                                disabled={isUploading}
                                onChange={(e) => {
                                  if (e.target.files?.[0]) handleSubirContratoPDF(emp.id, e.target.files[0])
                                }}
                              />
                            </label>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}