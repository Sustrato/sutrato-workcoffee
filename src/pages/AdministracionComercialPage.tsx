import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { Plus, X, Trash2, CreditCard, ExternalLink, Search, FileText, Edit2, Download, QrCode } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

// Nombre del bucket exacto
const BUCKET_NAME = 'documentos_oficinas'

// Función para eliminar puntos, guiones y espacios de cualquier RUT
const normalizarRut = (valor: string) => {
  if (!valor) return ''
  return valor.toLowerCase().replace(/[\.\-\s]/g, '')
}

export default function AdministracionComercialPage() {
  const navigate = useNavigate()
  const [arriendos, setArriendos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPagosModalOpen, setIsPagosModalOpen] = useState(false)
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)
  const [empresaQrSeleccionada, setEmpresaQrSeleccionada] = useState<any>(null)
  
  // Estado para saber si estamos Creando o Editando Empresa
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // Empresa seleccionada para el modal de pagos y estado de Edición de Pago
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<any>(null)
  const [historialPagos, setHistorialPagos] = useState<any[]>([])
  const [loadingPagos, setLoadingPagos] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingPagoId, setEditingPagoId] = useState<string | null>(null)

  // Formulario "Nueva empresa / Editar empresa"
  const [empresa, setEmpresa] = useState('')
  const [rutEmpresa, setRutEmpresa] = useState('')
  const [representanteLegal, setRepresentanteLegal] = useState('')
  const [rutRepresentante, setRutRepresentante] = useState('')
  const [telefono, setTelefono] = useState('')
  const [correo, setCorreo] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [tipoEspacio, setTipoEspacio] = useState('Oficina 1')
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0])
  const [frecuencia, setFrecuencia] = useState('MENSUAL')
  const [montoMensual, setMontoMensual] = useState('350000')
  const [vigencia, setVigencia] = useState('VIGENTE')

  // Formulario "Registrar / Editar pago"
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0])
  const [formaPago, setFormaPago] = useState('Transferencia')
  const [montoBruto, setMontoBruto] = useState(350000)
  const [montoLiquido, setMontoLiquido] = useState(350000)
  const [proximoPago, setProximoPago] = useState('')
  
  // Archivo único para comprobante de pago
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null)
  
  // Lista base de oficinas privadas
  const listaOficinas = ['Oficina 1', 'Oficina 2', 'Oficina 3', 'Oficina 4', 'Oficina 5', 'Oficina 6', 'Oficina 7']
  
  // Detectar oficinas ocupadas por contratos activos (excluyendo la empresa que se está editando)
  const oficinasOcupadas = arriendos
    .filter(a => a.estado === 'Activo' && a.id !== editingId)
    .map(a => a.tipo_espacio)

  // Cálculos de IVA y Neto
  const netoCalculado = Math.round(montoBruto / 1.19)
  const ivaCalculado = montoBruto - netoCalculado

  const fetchArriendos = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('oficinas_fisicas')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setArriendos(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchArriendos()
  }, [])

  // Limpiar formulario de empresa
  const resetFormularioEmpresa = () => {
    setEditingId(null)
    setEmpresa('')
    setRutEmpresa('')
    setRepresentanteLegal('')
    setRutRepresentante('')
    setTelefono('')
    setCorreo('')
    setObservaciones('')
    setFechaInicio(new Date().toISOString().split('T')[0])
    setFrecuencia('MENSUAL')
    setMontoMensual('350000')
    setVigencia('VIGENTE')
    const primeraDisponible = listaOficinas.find(of => !oficinasOcupadas.includes(of))
    if (primeraDisponible) setTipoEspacio(primeraDisponible)
  }

  // Cargar datos para EDITAR Empresa
  const handleAbrirEditar = (a: any) => {
    setEditingId(a.id)
    setEmpresa(a.nombre_cliente || '')
    setRutEmpresa(a.rut_empresa || '')
    setRepresentanteLegal(a.representante_legal || '')
    setRutRepresentante(a.rut_representante || '')
    setTelefono(a.telefono || '')
    setCorreo(a.correo || '')
    setObservaciones(a.observaciones || '')
    setTipoEspacio(a.tipo_espacio || 'Oficina 1')
    setFechaInicio(a.fecha_inicio || new Date().toISOString().split('T')[0])
    setFrecuencia(a.frecuencia || 'MENSUAL')
    setMontoMensual(String(a.monto_mensual || '350000'))
    setVigencia(a.vigencia || 'VIGENTE')
    setIsModalOpen(true)
  }

  // Cargar datos para EDITAR un Pago del historial
  const handleSeleccionarPagoParaEditar = (pago: any) => {
    setEditingPagoId(pago.id)
    setFechaPago(pago.fecha_pago || new Date().toISOString().split('T')[0])
    setFormaPago(pago.forma_pago || 'Transferencia')
    setMontoBruto(pago.monto_bruto || 350000)
    setMontoLiquido(pago.monto_liquido || 350000)
    setProximoPago(pago.proximo_pago || '')
    setComprobanteFile(null)
  }

  const resetFormularioPago = () => {
    setEditingPagoId(null)
    setComprobanteFile(null)
    if (empresaSeleccionada) {
      setMontoBruto(empresaSeleccionada.monto_mensual || 350000)
      setMontoLiquido(empresaSeleccionada.monto_mensual || 350000)
    }
  }

  // 📄 Ver el Payload de Zoho
  const handleVerZohoPayload = (empresaItem: any) => {
    if (!empresaItem.zoho_payload) {
      alert("Este cliente aún no ha enviado el formulario de Zoho.")
      return
    }
    const jsonString = JSON.stringify(empresaItem.zoho_payload, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }

  // 📱 Abrir Modal QR
  const handleAbrirQr = (empresaItem: any) => {
    setEmpresaQrSeleccionada(empresaItem)
    setIsQrModalOpen(true)
  }

  // Auto-calcular fecha del próximo pago según frecuencia
  useEffect(() => {
    if (fechaPago && !editingPagoId) {
      const d = new Date(fechaPago)
      if (frecuencia === 'ANUAL') {
        d.setFullYear(d.getFullYear() + 1)
      } else {
        d.setMonth(d.getMonth() + 1)
      }
      setProximoPago(d.toISOString().split('T')[0])
    }
  }, [fechaPago, frecuencia, editingPagoId])

  // Cargar el historial de pagos de la empresa seleccionada
  const fetchHistorialPagos = async (empresaId: string) => {
    setLoadingPagos(true)
    const { data } = await supabase
      .from('pagos_oficinas_fisicas')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('fecha_pago', { ascending: false })
    if (data) setHistorialPagos(data)
    setLoadingPagos(false)
  }

  const handleAbrirPagos = (empresaItem: any) => {
    setEmpresaSeleccionada(empresaItem)
    setMontoBruto(empresaItem.monto_mensual || 350000)
    setMontoLiquido(empresaItem.monto_mensual || 350000)
    setFrecuencia(empresaItem.frecuencia || 'MENSUAL')
    resetFormularioPago()
    setIsPagosModalOpen(true)
    fetchHistorialPagos(empresaItem.id)
  }

  // 📄 Abrir o Generar Contrato seguro
  const handleAbrirContrato = async (empresaItem: any) => {
    if (empresaItem.contrato_url) {
      window.open(empresaItem.contrato_url, '_blank')
    } else {
      const queryParams = new URLSearchParams({
        id: String(empresaItem.id || ''),
        nombre: empresaItem.nombre_cliente || '',
        rut: empresaItem.rut_empresa || empresaItem.rut || '',
        espacio: empresaItem.tipo_espacio || empresaItem.espacio_asignado || 'Oficina 1',
        monto: String(empresaItem.monto_mensual || '350000'),
        rep_nombre: empresaItem.representante_legal || '',
        rep_rut: empresaItem.rut_representante || '',
        origen: 'fisicas'
      }).toString()
      navigate(`/oficinas-fisicas/plantilla-contrato?${queryParams}`)
    }
  }

  // Subir archivo asegurando la ruta correcta dentro de la carpeta 'comprobantes'
  const uploadFile = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `comprobantes/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, { upsert: true })
      
      if (error) {
        console.error('Error subiendo archivo:', error)
        alert('Error al subir el comprobante: ' + error.message)
        return null
      }
      
      // Obtener URL pública de manera segura
      const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName)
        
      return data?.publicUrl || null
    } catch (err: any) {
      console.error('Excepción al subir archivo:', err)
      return null
    }
  }

  // 💾 Guardar (Crear o Editar Empresa)
  const handleGuardarEmpresa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empresa || !rutEmpresa) return alert('Completa los campos obligatorios (*)')
    if (oficinasOcupadas.includes(tipoEspacio)) {
      return alert(`La ${tipoEspacio} ya se encuentra ocupada por un contrato activo.`)
    }
    const payload = {
      nombre_cliente: empresa,
      rut_empresa: normalizarRut(rutEmpresa),
      representante_legal: representanteLegal,
      rut_representante: normalizarRut(rutRepresentante),
      telefono,
      correo,
      observaciones,
      tipo_espacio: tipoEspacio,
      fecha_inicio: fechaInicio,
      frecuencia,
      monto_mensual: Number(montoMensual) || 0,
      vigencia,
    }
    let error;
    if (editingId) {
      const res = await supabase
        .from('oficinas_fisicas')
        .update(payload)
        .eq('id', editingId)
      error = res.error
    } else {
      const res = await supabase
        .from('oficinas_fisicas')
        .insert([{
          ...payload,
          proximo_pago: proximoPago,
          vigencia: 'VIGENTE',
          estado: 'Activo'
        }])
      error = res.error
    }
    if (!error) {
      alert(editingId ? '¡Empresa actualizada con éxito!' : '¡Empresa guardada con éxito!')
      setIsModalOpen(false)
      resetFormularioEmpresa()
      fetchArriendos()
    } else {
      alert('Error al guardar la empresa: ' + error.message)
    }
  }

  // Registrar o Actualizar Pago de arriendo
  const handleGuardarPago = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empresaSeleccionada) return
    setUploading(true)
    
    let urlComprobante = ''
    if (comprobanteFile) {
      const url = await uploadFile(comprobanteFile)
      if (url) urlComprobante = url
    }

    const payloadPago: any = {
      empresa_id: empresaSeleccionada.id,
      fecha_pago: fechaPago,
      forma_pago: formaPago,
      monto_bruto: montoBruto,
      monto_neto: netoCalculado,
      iva: ivaCalculado,
      monto_liquido: montoLiquido,
      proximo_pago: proximoPago
    }

    if (urlComprobante) {
      payloadPago.comprobante_url = urlComprobante
    }

    let errPago = null
    if (editingPagoId) {
      const { error } = await supabase
        .from('pagos_oficinas_fisicas')
        .update(payloadPago)
        .eq('id', editingPagoId)
      errPago = error
    } else {
      const { error } = await supabase
        .from('pagos_oficinas_fisicas')
        .insert([payloadPago])
      errPago = error

      await supabase.from('ventas_diarias').insert([
        {
          fecha: fechaPago,
          linea_negocio: 'Arriendo Oficina Física',
          medio_pago: formaPago,
          monto_bruto: montoBruto,
          documento: `PAGO-OF-${empresaSeleccionada.nombre_cliente.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
          observacion: `Cobro arriendo: ${empresaSeleccionada.tipo_espacio} (${empresaSeleccionada.nombre_cliente})`
        }
      ])
    }

    const { error: errEmpresa } = await supabase
      .from('oficinas_fisicas')
      .update({
        proximo_pago: proximoPago,
        vigencia: 'VIGENTE'
      })
      .eq('id', empresaSeleccionada.id)

    setUploading(false)
    if (!errPago && !errEmpresa) {
      alert(editingPagoId ? '¡Pago actualizado con éxito!' : '¡Pago registrado con éxito!')
      resetFormularioPago()
      fetchHistorialPagos(empresaSeleccionada.id)
      fetchArriendos()
    } else {
      alert('Error guardando el pago: ' + (errPago?.message || errEmpresa?.message))
    }
  }

  const handleEliminarPago = async (pagoId: string) => {
    if (!confirm('¿Seguro que deseas eliminar este registro de pago?')) return
    const { error } = await supabase
      .from('pagos_oficinas_fisicas')
      .delete()
      .eq('id', pagoId)
    if (!error) {
      fetchHistorialPagos(empresaSeleccionada.id)
      fetchArriendos()
    } else {
      alert('Error al eliminar el pago: ' + error.message)
    }
  }

  const handleEliminar = async (empresaItem: any) => {
    const confirmacion = prompt(
      `⚠️ ATENCIÓN: Esta acción eliminará permanentemente la empresa "${empresaItem.nombre_cliente}" y sus contratos/pagos asociados.\n\nEscribe "ELIMINAR" en mayúsculas para confirmar:`
    )
    if (confirmacion === 'ELIMINAR') {
      const { error } = await supabase.from('oficinas_fisicas').delete().eq('id', empresaItem.id)
      if (!error) {
        alert('Empresa eliminada de manera definitiva.')
        fetchArriendos()
      } else {
        alert('Error al eliminar empresa: ' + error.message)
      }
    } else if (confirmacion !== null) {
      alert('Confirmación incorrecta. No se realizaron cambios.')
    }
  }

  // Búsqueda flexible ignorando puntos, guiones y espacios en los RUTs
  const queryLimpio = normalizarRut(searchTerm)
  const arriendosFiltrados = arriendos.filter(a => {
    const nombreMatch = a.nombre_cliente?.toLowerCase().includes(searchTerm.toLowerCase()) || false
    const rutEmpresaLimpio = normalizarRut(a.rut_empresa || '')
    const rutRepLimpio = normalizarRut(a.rut_representante || '')
    const rutMatch = queryLimpio ? (rutEmpresaLimpio.includes(queryLimpio) || rutRepLimpio.includes(queryLimpio)) : false
    return nombreMatch || rutMatch
  })

  return (
    <div className="mx-auto max-w-7xl space-y-7 font-sans">
      
      {/* Encabezado */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Administración comercial
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Directorio, documentos, términos y condiciones e historial de arriendos
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar por empresa o RUT"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs w-60 focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
            />
          </div>
          <button 
            onClick={() => { resetFormularioEmpresa(); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-[#C5A059] hover:bg-[#b59049] text-slate-950 font-bold px-4 py-2 rounded-lg text-xs shadow transition whitespace-nowrap"
          >
            <Plus size={16} /> Nueva empresa
          </button>
        </div>
      </section>

      {/* Tabla Comercial */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#181818] text-[#C5A059] text-xs font-bold uppercase tracking-wider">
              <th className="py-3.5 px-4">EMPRESA / RUT</th>
              <th className="py-3.5 px-4">REPRESENTANTE LEGAL / RUT</th>
              <th className="py-3.5 px-4">CONTACTO</th>
              <th className="py-3.5 px-4">FRECUENCIA</th>
              <th className="py-3.5 px-4">TÉRMINOS / ZOHO</th>
              <th className="py-3.5 px-4 text-center">VIGENCIA</th>
              <th className="py-3.5 px-4 text-center">CONTRATO</th>
              <th className="py-3.5 px-4 text-right">ACCIONES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-8 text-slate-400">Cargando directorio...</td></tr>
            ) : arriendosFiltrados.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-slate-400">No hay empresas registradas.</td></tr>
            ) : (
              arriendosFiltrados.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 transition">
                  <td className="py-4 px-4 font-bold text-slate-900">
                    {a.nombre_cliente}
                    <span className="block text-[11px] font-normal text-slate-500">{a.rut_empresa || '—'}</span>
                  </td>
                  <td className="py-4 px-4 text-slate-700">
                    {a.representante_legal || '—'}
                    <span className="block text-[11px] font-normal text-slate-500">{a.rut_representante || '—'}</span>
                  </td>
                  <td className="py-4 px-4 text-slate-600">
                    {a.telefono || '—'}
                    <span className="block text-[11px] text-slate-400">{a.correo || '—'}</span>
                  </td>
                  <td className="py-4 px-4 font-bold text-slate-700">
                    <span className="border border-slate-200 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                      {a.frecuencia || 'MENSUAL'}
                    </span>
                  </td>
                  {/* 🟢 COLUMNA TÉRMINOS / ZOHO */}
                  <td className="py-4 px-4">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        a.terminos_aceptados 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {a.terminos_aceptados ? '• Aceptado' : '• Pendiente'}
                      </span>
                      <button
                        onClick={() => handleAbrirQr(a)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#C5A059] hover:underline transition"
                      >
                        <QrCode size={12} /> Ver QR
                      </button>
                      {a.zoho_payload && (
                        <button
                          onClick={() => handleVerZohoPayload(a)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:text-purple-800 transition"
                        >
                          <Download size={11} /> Ver respaldo Zoho
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      a.vigencia === 'NO VIGENTE' 
                        ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      • {a.vigencia || 'VIGENTE'}
                    </span>
                  </td>
                  {/* 📄 COLUMNA DE CONTRATO */}
                  <td className="py-4 px-4 text-center">
                    <button
                      onClick={() => handleAbrirContrato(a)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition ${
                        a.contrato_url
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      <FileText size={13} />
                      {a.contrato_url ? 'Ver contrato' : 'Generar / Editar'}
                    </button>
                  </td>
                  {/* ⚙️ ACCIONES */}
                  <td className="py-4 px-4 text-right space-x-1.5">
                    <button 
                      onClick={() => handleAbrirPagos(a)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-blue-600 text-blue-700 bg-blue-50/50 rounded-lg text-[11px] font-bold hover:bg-blue-100 transition"
                      title="Gestión de pagos"
                    >
                      <CreditCard size={14} /> Pagos
                    </button>
                    <button 
                      onClick={() => handleAbrirEditar(a)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-100 align-middle transition"
                      title="Editar datos de empresa"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleEliminar(a)} 
                      className="p-1.5 text-rose-500 hover:text-rose-700 border border-rose-200 hover:bg-rose-50 rounded-lg align-middle transition"
                      title="Eliminar empresa"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* 📱 MODAL DE CÓDIGO QR */}
      {isQrModalOpen && empresaQrSeleccionada && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl p-6 text-center space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-slate-900 text-base">QR de Aceptación de Términos</h3>
              <button onClick={() => setIsQrModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-xs text-slate-500">
              Escanea el código para precargar los datos de <strong>{empresaQrSeleccionada.nombre_cliente}</strong> en el formulario de Zoho.
            </p>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-center">
              <QRCodeSVG 
                value={`https://forms.zohopublic.com/rotaryconcordia1/form/Aceptacionterminossutrato/formperma/dEiuFyNghAj8CFZhy7d5P7knBvun9DFBkH6HX0l2Bh4?zf_lang=en&Field_3=${encodeURIComponent(empresaQrSeleccionada.rut_representante || '')}&Field_4=${encodeURIComponent(empresaQrSeleccionada.telefono || '')}&Field_5=${encodeURIComponent(empresaQrSeleccionada.correo || '')}&Field_6=${encodeURIComponent(empresaQrSeleccionada.nombre_cliente || '')}&Field_7=${encodeURIComponent(empresaQrSeleccionada.rut_empresa || '')}&Field_9=${encodeURIComponent(empresaQrSeleccionada.tipo_espacio || '')}`} 
                size={180} 
              />
            </div>
            <div className="text-left bg-blue-50/60 p-3 rounded-lg text-[11px] text-slate-700 space-y-1">
              <p><strong>Representante:</strong> {empresaQrSeleccionada.representante_legal || '—'} ({empresaQrSeleccionada.rut_representante || '—'})</p>
              <p><strong>Empresa:</strong> {empresaQrSeleccionada.nombre_cliente} ({empresaQrSeleccionada.rut_empresa})</p>
              <p><strong>Oficina:</strong> {empresaQrSeleccionada.tipo_espacio}</p>
            </div>
            <button 
              onClick={() => setIsQrModalOpen(false)}
              className="w-full bg-[#181818] text-[#C5A059] font-bold py-2 rounded-lg text-xs hover:bg-black transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* 🖤 MODAL 1: NUEVA / EDITAR EMPRESA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
            <div className="bg-[#181818] text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-base">
                {editingId ? 'Editar empresa' : 'Nueva empresa'}
              </h3>
              <button onClick={() => { setIsModalOpen(false); resetFormularioEmpresa(); }} className="text-neutral-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleGuardarEmpresa} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Empresa *</label>
                  <input type="text" value={empresa} onChange={(e) => setEmpresa(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" required />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">RUT empresa *</label>
                  <input type="text" value={rutEmpresa} onChange={(e) => setRutEmpresa(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" required />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Representante legal</label>
                  <input type="text" value={representanteLegal} onChange={(e) => setRepresentanteLegal(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">RUT representante</label>
                  <input type="text" value={rutRepresentante} onChange={(e) => setRutRepresentante(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teléfono</label>
                  <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Correo</label>
                  <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Espacio asignado *</label>
                  <select 
                    value={tipoEspacio} 
                    onChange={(e) => setTipoEspacio(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
                  >
                    {listaOficinas.map((of) => {
                      const estaOcupada = oficinasOcupadas.includes(of)
                      return (
                        <option key={of} value={of} disabled={estaOcupada} className={estaOcupada ? 'text-slate-400 bg-slate-100' : ''}>
                          {of} {estaOcupada ? '— (Ocupada por otra empresa)' : ''}
                        </option>
                      )
                    })}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha inicio contrato *</label>
                  <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" required />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Frecuencia de cobro</label>
                  <select value={frecuencia} onChange={(e) => setFrecuencia(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white">
                    <option value="MENSUAL">MENSUAL</option>
                    <option value="ANUAL">ANUAL</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Monto mensual ($)</label>
                  <input type="number" value={montoMensual} onChange={(e) => setMontoMensual(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" />
                </div>
                {editingId && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Vigencia contrato</label>
                    <select 
                      value={vigencia} 
                      onChange={(e) => setVigencia(e.target.value)} 
                      className={`w-full px-3 py-2 border rounded-lg font-bold ${
                        vigencia === 'NO VIGENTE' ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      <option value="VIGENTE">🟢 VIGENTE</option>
                      <option value="NO VIGENTE">🔴 NO VIGENTE (Cese SII)</option>
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Observaciones</label>
                <textarea rows={3} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => { setIsModalOpen(false); resetFormularioEmpresa(); }}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button type="submit" className="bg-[#C5A059] hover:bg-[#b59049] text-slate-950 font-bold px-5 py-2 rounded-lg shadow transition">
                  {editingId ? 'Guardar cambios' : 'Guardar empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🖤 MODAL 2: CONTROL DE PAGOS */}
      {isPagosModalOpen && empresaSeleccionada && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            
            <div className="p-6 border-b border-slate-100 flex justify-between items-start sticky top-0 bg-white z-10">
              <div>
                <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">CONTROL DE PAGOS</p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">
                  {editingPagoId ? 'Editar registro de pago' : 'Registrar pago'}
                </h3>
                <p className="text-xs text-slate-500">Empresa: <strong>{empresaSeleccionada.nombre_cliente}</strong> ({empresaSeleccionada.tipo_espacio})</p>
              </div>
              <button onClick={() => setIsPagosModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 text-xs">
              
              {/* Historial de Pagos */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-slate-800">Pagos e historial registrado ({historialPagos.length})</h4>
                  {editingPagoId && (
                    <button 
                      type="button" 
                      onClick={resetFormularioPago} 
                      className="text-blue-600 hover:underline font-bold text-[11px]"
                    >
                      Cancelar edición / Nuevo pago
                    </button>
                  )}
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">FECHA</th>
                        <th className="p-2.5">FORMA DE PAGO</th>
                        <th className="p-2.5">BRUTO</th>
                        <th className="p-2.5">NETO</th>
                        <th className="p-2.5">LÍQUIDO</th>
                        <th className="p-2.5">PRÓXIMO PAGO</th>
                        <th className="p-2.5 text-center">COMPROBANTE</th>
                        <th className="p-2.5 text-center">EDITAR</th>
                        <th className="p-2.5 text-center">ELIMINAR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loadingPagos ? (
                        <tr><td colSpan={9} className="text-center py-4 text-slate-400">Cargando pagos...</td></tr>
                      ) : historialPagos.length === 0 ? (
                        <tr><td colSpan={9} className="text-center py-4 text-slate-400">Sin historial de pagos registrados.</td></tr>
                      ) : (
                        historialPagos.map((p) => (
                          <tr key={p.id} className={`hover:bg-slate-50 ${editingPagoId === p.id ? 'bg-blue-50/60' : ''}`}>
                            <td className="p-2.5 font-bold text-slate-800">{p.fecha_pago}</td>
                            <td className="p-2.5 text-slate-600">{p.forma_pago}</td>
                            <td className="p-2.5 font-bold text-slate-900">${Number(p.monto_bruto).toLocaleString('es-CL')}</td>
                            <td className="p-2.5 text-slate-600">${Number(p.monto_neto).toLocaleString('es-CL')}</td>
                            <td className="p-2.5 font-bold text-emerald-700">${Number(p.monto_liquido).toLocaleString('es-CL')}</td>
                            <td className="p-2.5 text-slate-700">{p.proximo_pago}</td>
                            <td className="p-2.5 text-center">
                              {p.comprobante_url ? (
                                <a href={p.comprobante_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center justify-center gap-1 font-bold">
                                  Ver <ExternalLink size={12} />
                                </a>
                              ) : <span className="text-amber-600 italic">Sin archivo</span>}
                            </td>
                            <td className="p-2.5 text-center">
                              <button 
                                onClick={() => handleSeleccionarPagoParaEditar(p)}
                                className="text-slate-600 hover:text-blue-600 p-1"
                                title="Editar pago o adjuntar comprobante"
                              >
                                <Edit2 size={14} />
                              </button>
                            </td>
                            <td className="p-2.5 text-center">
                              <button 
                                onClick={() => handleEliminarPago(p.id)}
                                className="text-rose-500 hover:text-rose-700 p-1"
                                title="Eliminar pago"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Formulario de Pago */}
              <form onSubmit={handleGuardarPago} className="space-y-4 border-t border-slate-100 pt-5">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-900 text-sm">
                    {editingPagoId ? '✏️ Editando pago seleccionado' : 'Datos del nuevo pago'}
                  </h4>
                  {editingPagoId && (
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">Modo edición activo</span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Fecha de pago *</label>
                    <input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" required />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Forma de pago</label>
                    <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white">
                      <option value="Transferencia">Transferencia</option>
                      <option value="Mercado Pago">Mercado Pago</option>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Tarjeta de Débito/Crédito">Tarjeta de Débito/Crédito</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Monto bruto *</label>
                    <input type="number" value={montoBruto} onChange={(e) => { setMontoBruto(Number(e.target.value)); setMontoLiquido(Number(e.target.value)); }} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none font-bold text-slate-900" required />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Monto líquido recibido</label>
                    <input type="number" value={montoLiquido} onChange={(e) => setMontoLiquido(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Próximo pago *</label>
                    <input type="date" value={proximoPago} onChange={(e) => setProximoPago(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" required />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Comprobante (PDF / Imagen)</label>
                    <input 
                      type="file" 
                      accept="application/pdf,image/*"
                      onChange={(e) => setComprobanteFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                </div>

                <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500">Monto bruto</p>
                    <p className="font-extrabold text-slate-900 text-sm mt-0.5">${montoBruto.toLocaleString('es-CL')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500">Neto calculado</p>
                    <p className="font-bold text-slate-800 text-xs mt-0.5">${netoCalculado.toLocaleString('es-CL')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500">IVA (19%)</p>
                    <p className="font-bold text-blue-700 text-xs mt-0.5">${ivaCalculado.toLocaleString('es-CL')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500">Líquido recibido</p>
                    <p className="font-bold text-slate-800 text-xs mt-0.5">${montoLiquido.toLocaleString('es-CL')}</p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsPagosModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-700">
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={uploading} 
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-lg shadow transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {uploading ? 'Guardando...' : editingPagoId ? 'Actualizar pago' : 'Registrar pago'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}