import { useState, useEffect, useRef } from 'react'
import { supabase } from '../services/supabase'
import { Plus, X, Search, Calendar, Trash2, Edit2, Upload, QrCode, Download, ExternalLink, CheckCircle2, AlertCircle, FileUp, CheckCircle, Clock } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

interface ClienteParticular {
  id: string
  nombre_completo: string
  rut: string
  telefono: string
  correo?: string
  empresa?: string
  rut_empresa?: string
  observaciones?: string
  terminos_aceptados?: boolean
  fecha_aceptacion?: string
  zoho_enviado?: boolean
  zoho_payload?: any
  created_at?: string
}

interface UsoOficina {
  id: string
  oficina_asignada: string
  fecha_inicio: string
  fecha_fin: string
  hora_inicio: string
  hora_fin: string
  modalidad: string
  horas_calculadas: number
  monto_total: number
  monto_neto?: number
  iva?: number
  monto_liquido?: number
  comision_tarjeta?: number
  estado_pago: string
  forma_pago?: string
  voucher_url?: string
  bases_aceptadas?: boolean
  fecha_aceptacion_bases?: string
  iniciado_por?: string
  cobrado_por?: string
}

const normalizarRut = (valor: string) => {
  if (!valor) return ''
  return valor.toLowerCase().replace(/[\.\-\s]/g, '')
}

export default function ClientesParticularesPage() {
  const [clientes, setClientes] = useState<ClienteParticular[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  
  const [oficinasLibresAhora, setOficinasLibresAhora] = useState<string[]>([])
  
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [mensajeError, setMensajeError] = useState<string | null>(null)
  
  const mostrarExito = (msg: string) => {
    setMensajeExito(msg)
    setMensajeError(null)
    setTimeout(() => setMensajeExito(null), 4000)
  }
  
  const mostrarError = (msg: string) => {
    setMensajeError(msg)
    setMensajeExito(null)
    setTimeout(() => setMensajeError(null), 5000)
  }
  
  const [isClienteModalOpen, setIsClienteModalOpen] = useState(false)
  const [isArriendoModalOpen, setIsArriendoModalOpen] = useState(false)
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  
  const [clienteQrSeleccionado, setClienteQrSeleccionado] = useState<any>(null)
  const [clienteUploadSeleccionado, setClienteUploadSeleccionado] = useState<ClienteParticular | null>(null)
  const [zohoFileManual, setZohoFileManual] = useState<File | null>(null)
  const [uploadingZohoManual, setUploadingZohoManual] = useState(false)
  
  const [editingClienteId, setEditingClienteId] = useState<string | null>(null)
  const [editingVisitaId, setEditingVisitaId] = useState<string | null>(null)
  
  const [clienteAEliminar, setClienteAEliminar] = useState<ClienteParticular | null>(null)
  const [confirmacionTexto, setConfirmacionTexto] = useState('')
  const [visitaAEliminar, setVisitaAEliminar] = useState<UsoOficina | null>(null)
  const [confirmacionVisitaTexto, setConfirmacionVisitaTexto] = useState('')
  
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [rut, setRut] = useState('')
  const [telefono, setTelefono] = useState('')
  const [correo, setCorreo] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [rutEmpresa, setRutEmpresa] = useState('')
  const [obsCliente, setObsCliente] = useState('')
  
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState('')
  const [oficina, setOficina] = useState('Oficina 1')
  const [fechaIngreso, setFechaIngreso] = useState(new Date().toISOString().split('T')[0])
  const [fechaTermino, setFechaTermino] = useState(new Date().toISOString().split('T')[0])
  const [modalidad, setModalidad] = useState('Por hora')
  
  const [historialVisitasCliente, setHistorialVisitasCliente] = useState<UsoOficina[]>([])
  
  const [horaIngreso, setHoraIngreso] = useState('09:00')
  const [horaSalida, setHoraSalida] = useState('10:00')
  
  // Control para mostrar el panel de pauta horaria al hacer clic en los inputs de hora
  const [showPautaIngreso, setShowPautaIngreso] = useState(false)
  const [showPautaSalida, setShowPautaSalida] = useState(false)
  const pautaIngresoRef = useRef<HTMLDivElement>(null)
  const pautaSalidaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pautaIngresoRef.current && !pautaIngresoRef.current.contains(event.target as Node)) {
        setShowPautaIngreso(false)
      }
      if (pautaSalidaRef.current && !pautaSalidaRef.current.contains(event.target as Node)) {
        setShowPautaSalida(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const [horasCalculadas, setHorasCalculadas] = useState(1)
  const [valorCalculado, setValorCalculado] = useState(3000)
  const [estadoPago, setEstadoPago] = useState('Pagado')
  const [formaPago, setFormaPago] = useState('Transferencia')
  
  const [iniciadoPorVisita, setIniciadoPorVisita] = useState('Damián')
  const [cobradoPorVisita, setCobradoPorVisita] = useState('')
  
  const [montoLiquidoCustom, setMontoLiquidoCustom] = useState(3000)
  
  const listaTodasOficinas = [
    'Oficina 1', 'Oficina 2', 'Oficina 3', 'Oficina 4', 
    'Oficina 5', 'Oficina 6', 'Oficina 7', 
    'Sala de Reuniones A', 'Sala de Reuniones B'
  ]

  const [reservasDelDiaModal, setReservasDelDiaModal] = useState<any[]>([])

  const calcularOficinasLibres = async () => {
    const hoyStr = new Date().toISOString().split('T')[0]
    const ahora = new Date()
    const horaActualStr = ahora.toLocaleTimeString('es-CL', {
      timeZone: 'America/Santiago',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })

    const { data: empresasActivas } = await supabase
      .from('oficinas_fisicas')
      .select('tipo_espacio')
      .eq('estado', 'Activo')
    
    const { data: reservasHoy } = await supabase
      .from('uso_oficinas_particulares')
      .select('oficina_asignada, hora_inicio, hora_fin, estado_pago')
      .eq('fecha_inicio', hoyStr)
      .neq('estado_pago', 'Cancelado')

    const ocupadas = new Set<string>()
    empresasActivas?.forEach(e => ocupadas.add(e.tipo_espacio))
    
    reservasHoy?.forEach(r => {
      if (r.hora_inicio && r.hora_fin) {
        const hIn = r.hora_inicio.substring(0, 5)
        const hOut = r.hora_fin.substring(0, 5)
        if (r.estado_pago === 'Pendiente') {
          if (horaActualStr >= hIn) ocupadas.add(r.oficina_asignada)
        } else {
          if (horaActualStr >= hIn && horaActualStr <= hOut) ocupadas.add(r.oficina_asignada)
        }
      }
    })

    const libres = listaTodasOficinas.filter(of => !ocupadas.has(of))
    setOficinasLibresAhora(libres)
  }

  const calcularMontoOriginal = (hIn: string, hOut: string, mod: string) => {
    if (!hIn || !hOut) return 3000
    const [hI, mI] = hIn.substring(0, 5).split(':').map(Number)
    const [hO, mO] = hOut.substring(0, 5).split(':').map(Number)
    if (!isNaN(hI) && !isNaN(mI) && !isNaN(hO) && !isNaN(mO)) {
      const minInicio = hI * 60 + mI
      const minFin = hO * 60 + mO
      let diffMinutos = minFin - minInicio
      if (diffMinutos < 0) diffMinutos += 24 * 60
      if (mod === 'Por hora') {
        const horasDecimales = diffMinutos / 60
        const calculado = Math.round(horasDecimales * 3000)
        return Math.max(3000, calculado)
      } else if (mod === 'Por día') {
        return 20000
      } else if (mod === 'Por semana') {
        return 102000
      } else if (mod === 'Mensual') {
        return 350000
      }
    }
    return 3000
  }

  const montoDevolucionReal = calcularMontoOriginal(horaIngreso, horaSalida, modalidad)
  const netoCalculado = estadoPago === 'Cancelado' ? 0 : Math.round(valorCalculado / 1.19)
  const ivaCalculado = estadoPago === 'Cancelado' ? 0 : valorCalculado - netoCalculado
  const comisionTarjetaCalculada = estadoPago === 'Cancelado' ? 0 : Math.max(0, valorCalculado - montoLiquidoCustom)
  
  const [voucherFile, setVoucherFile] = useState<File | null>(null)
  const [voucherActualUrl, setVoucherActualUrl] = useState<string>('')
  const [uploadingVoucher, setUploadingVoucher] = useState(false)
  const [basesAceptadas, setBasesAceptadas] = useState(false)
  const [fechaAceptacion, setFechaAceptacion] = useState(new Date().toISOString().split('T')[0])
  
  const [oficinasBloqueadas, setOficinasBloqueadas] = useState<string[]>([])
  const [detallesBloqueo, setDetallesBloqueo] = useState<Record<string, string>>({})
  
  const cargarHoraActualChile = () => {
    const ahora = new Date()
    const horaActual = ahora.toLocaleTimeString('es-CL', {
      timeZone: 'America/Santiago',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    const [h, m] = horaActual.split(':').map(Number)
    const hSalidaNum = (h + 1) % 24
    const horaSalidaCalc = `${String(hSalidaNum).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    setHoraIngreso(horaActual)
    setHoraSalida(horaSalidaCalc)
  }

  const fetchClientes = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('clientes_particulares')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000)
    if (data) {
      setClientes(data)
      if (data.length > 0 && !clienteSeleccionadoId) {
        setClienteSeleccionadoId(data[0].id)
      }
    }
    if (error) {
      console.error('Error al cargar clientes:', error.message)
    }
    setLoading(false)
    calcularOficinasLibres()
  }

  useEffect(() => {
    fetchClientes()
    const channel = supabase
      .channel('public:clientes_particulares')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clientes_particulares' },
        () => {
          fetchClientes()
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchHistorialVisitas = async (clienteId: string) => {
    if (!clienteId) return
    const { data } = await supabase
      .from('uso_oficinas_particulares')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('fecha_inicio', { ascending: false })
    
    if (data) {
      setHistorialVisitasCliente(data)
    }
  }

  useEffect(() => {
    if (isArriendoModalOpen && !editingVisitaId) {
      cargarHoraActualChile()
    }
  }, [isArriendoModalOpen])

  useEffect(() => {
    if (clienteSeleccionadoId) {
      fetchHistorialVisitas(clienteSeleccionadoId)
    }
  }, [clienteSeleccionadoId])

  const resetFormularioCliente = () => {
    setEditingClienteId(null)
    setNombreCompleto('')
    setRut('')
    setTelefono('')
    setCorreo('')
    setEmpresa('')
    setRutEmpresa('')
    setObsCliente('')
  }

  const resetFormularioArriendo = () => {
    setEditingVisitaId(null)
    setVoucherFile(null)
    setVoucherActualUrl('')
    setEstadoPago('Pagado')
    setFormaPago('Transferencia')
    setIniciadoPorVisita('Damián')
    setCobradoPorVisita('')
  }

  const handleAbrirEditarCliente = (c: ClienteParticular) => {
    setEditingClienteId(c.id)
    setNombreCompleto(c.nombre_completo || '')
    setRut(c.rut || '')
    setTelefono(c.telefono || '')
    setCorreo(c.correo || '')
    setEmpresa(c.empresa || '')
    setRutEmpresa(c.rut_empresa || '')
    setObsCliente(c.observaciones || '')
    setIsClienteModalOpen(true)
  }

  const handleAbrirQr = (c: ClienteParticular) => {
    setClienteQrSeleccionado(c)
    setIsQrModalOpen(true)
  }

  const handleAbrirUploadManual = (c: ClienteParticular) => {
    setClienteUploadSeleccionado(c)
    setZohoFileManual(null)
    setIsUploadModalOpen(true)
  }

  const handleGuardarSubidaManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clienteUploadSeleccionado || !zohoFileManual) {
      mostrarError('Debes seleccionar un archivo exportado de Zoho.')
      return
    }
    setUploadingZohoManual(true)
    try {
      const fileExt = zohoFileManual.name.split('.').pop()
      const fileName = `zoho_manual_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('vouchers')
        .upload(fileName, zohoFileManual)
      if (uploadError) throw uploadError
      const { data: publicURLData } = supabase.storage
        .from('vouchers')
        .getPublicUrl(fileName)
      const payloadManual = {
        archivoManualNombre: zohoFileManual.name,
        archivoUrl: publicURLData.publicUrl,
        subidoManualmente: true,
        fechaSubida: new Date().toISOString()
      }
      const { error: updateError } = await supabase
        .from('clientes_particulares')
        .update({
          terminos_aceptados: true,
          fecha_aceptacion: new Date().toISOString(),
          zoho_enviado: true,
          zoho_payload: payloadManual
        })
        .eq('id', clienteUploadSeleccionado.id)
      if (updateError) throw updateError
      mostrarExito('¡Respaldo subido y cliente marcado como aceptado con éxito!')
      setIsUploadModalOpen(false)
      setClienteUploadSeleccionado(null)
      setZohoFileManual(null)
      fetchClientes()
    } catch (err: any) {
      mostrarError('Error al subir el archivo: ' + err.message)
    } finally {
      setUploadingZohoManual(false)
    }
  }

  const handleVerZohoPayload = (c: ClienteParticular) => {
    const jsonString = JSON.stringify({ cliente: c, respaldoZoho: c.zoho_payload }, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }

  const calcularHorasYPrecios = (hIn: string, hOut: string, mod: string) => {
    if (!hIn || !hOut) return
    const hInParts = hIn.substring(0, 5)
    const hOutParts = hOut.substring(0, 5)
    const [hI, mI] = hInParts.split(':').map(Number)
    const [hO, mO] = hOutParts.split(':').map(Number)
    if (!isNaN(hI) && !isNaN(mI) && !isNaN(hO) && !isNaN(mO)) {
      const minInicio = hI * 60 + mI
      const minFin = hO * 60 + mO
      let diffMinutos = minFin - minInicio
      if (diffMinutos < 0) diffMinutos += 24 * 60
      const horasDecimales = diffMinutos / 60
      setHorasCalculadas(Number(horasDecimales.toFixed(2)))
      
      let calculado = 3000
      if (mod === 'Por hora') {
        const prop = horasDecimales * 3000
        calculado = Math.max(3000, Math.round(prop))
      } else if (mod === 'Por día') {
        calculado = 20000
      } else if (mod === 'Por semana') {
        calculado = 102000
      } else if (mod === 'Mensual') {
        calculado = 350000
      }
      setValorCalculado(calculado)
      setMontoLiquidoCustom(calculado)
    }
  }

  const handleSeleccionarVisitaParaEditar = (visita: UsoOficina) => {
    setEditingVisitaId(visita.id)
    setOficina(visita.oficina_asignada || 'Oficina 1')
    setFechaIngreso(visita.fecha_inicio || new Date().toISOString().split('T')[0])
    setFechaTermino(visita.fecha_fin || new Date().toISOString().split('T')[0])
    
    const hIn = visita.hora_inicio || '09:00'
    const hOut = visita.hora_fin || '10:00'
    setHoraIngreso(hIn)
    setHoraSalida(hOut)
    
    const mod = visita.modalidad || 'Por hora'
    setModalidad(mod)
    setEstadoPago(visita.estado_pago || 'Pagado')
    setFormaPago(visita.forma_pago || 'Transferencia')
    setIniciadoPorVisita(visita.iniciado_por || 'Damián')
    setCobradoPorVisita(visita.cobrado_por || '')
    setBasesAceptadas(visita.bases_aceptadas ?? true)
    setVoucherActualUrl(visita.voucher_url || '')
    setVoucherFile(null)
    
    if (visita.estado_pago === 'Cancelado') {
      setValorCalculado(0)
      setMontoLiquidoCustom(0)
    } else {
      calcularHorasYPrecios(hIn, hOut, mod)
    }
  }

  const handleVerVoucherSeguro = async (urlOriginal: string) => {
    if (!urlOriginal) return
    try {
      const partes = urlOriginal.split('/')
      const nombreArchivo = partes[partes.length - 1]
      const { data, error } = await supabase.storage
        .from('vouchers')
        .createSignedUrl(nombreArchivo, 60)
      if (error) throw error
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
      }
    } catch (err: any) {
      mostrarError('Error al abrir el voucher: ' + err.message)
    }
  }

  const verificarDisponibilidad = async () => {
    const { data: empresasActivas } = await supabase
      .from('oficinas_fisicas')
      .select('tipo_espacio')
      .eq('estado', 'Activo')
    
    const { data: reservasCruzadas } = await supabase
      .from('uso_oficinas_particulares')
      .select('id, oficina_asignada, hora_inicio, hora_fin, estado_pago')
      .eq('fecha_inicio', fechaIngreso)
      .neq('estado_pago', 'Cancelado')
    
    setReservasDelDiaModal(reservasCruzadas || [])

    const bloqueos: Record<string, string> = {}
    if (empresasActivas) {
      empresasActivas.forEach(e => {
        bloqueos[e.tipo_espacio] = 'Ocupada por contrato mensual'
      })
    }
    if (reservasCruzadas) {
      reservasCruzadas.forEach(r => {
        if (editingVisitaId && r.id === editingVisitaId) return
        
        if (r.hora_inicio && r.hora_fin) {
          const rInicio = r.hora_inicio.substring(0, 5)
          const rFin = r.hora_fin.substring(0, 5)
          
          let hayTraslape = false
          if (r.estado_pago === 'Pendiente') {
            hayTraslape = horaIngreso >= rInicio && horaSalida > rInicio
          } else {
            hayTraslape = horaIngreso < rFin && horaSalida > rInicio
          }

          if (hayTraslape) {
            bloqueos[r.oficina_asignada] = `Ocupada (${rInicio} - ${rFin} hrs / ${r.estado_pago})`
          }
        }
      })
    }
    const listaBloqueadas = Object.keys(bloqueos)
    setDetallesBloqueo(bloqueos)
    setOficinasBloqueadas(listaBloqueadas)
    if (listaBloqueadas.includes(oficina)) {
      const disponible = listaTodasOficinas.find(of => !listaBloqueadas.includes(of))
      if (disponible) setOficina(disponible)
    }
  }

  useEffect(() => {
    if (isArriendoModalOpen && horaIngreso && horaSalida) {
      verificarDisponibilidad()
    }
  }, [isArriendoModalOpen, fechaIngreso, horaIngreso, horaSalida])

  const handleGuardarCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombreCompleto || !rut || !telefono || !correo) {
      mostrarError('Completa los campos obligatorios (*) incluyendo el correo')
      return
    }
    
    const payload = {
      nombre_completo: nombreCompleto,
      rut: normalizarRut(rut),
      telefono,
      correo,
      empresa,
      rut_empresa: normalizarRut(rutEmpresa),
      observaciones: obsCliente,
      terminos_aceptados: false,
      zoho_enviado: false
    }
    
    let error
    if (editingClienteId) {
      const res = await supabase.from('clientes_particulares').update(payload).eq('id', editingClienteId)
      error = res.error
    } else {
      const res = await supabase.from('clientes_particulares').insert([payload])
      error = res.error
    }
    if (error) {
      mostrarError('Error guardando cliente: ' + error.message)
    } else {
      mostrarExito(editingClienteId ? '¡Cliente actualizado con éxito en Sustrato!' : '¡Cliente creado con éxito en Sustrato!')
      setIsClienteModalOpen(false)
      resetFormularioCliente()
      fetchClientes()
    }
  }

  const handleConfirmarEliminarCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clienteAEliminar) return
    if (confirmacionTexto.trim().toUpperCase() !== 'ELIMINAR') {
      mostrarError('Debes escribir la palabra exacta ELIMINAR para proceder.')
      return
    }
    const { error } = await supabase.from('clientes_particulares').delete().eq('id', clienteAEliminar.id)
    if (error) {
      mostrarError('Error al eliminar cliente: ' + error.message)
    } else {
      mostrarExito('Cliente eliminado definitivamente del sistema.')
      setClienteAEliminar(null)
      setConfirmacionTexto('')
      fetchClientes()
    }
  }

  const handleConfirmarEliminarVisita = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!visitaAEliminar) return
    if (confirmacionVisitaTexto.trim().toUpperCase() !== 'ELIMINAR') {
      mostrarError('Debes escribir la palabra exacta ELIMINAR para proceder con el borrado del pago.')
      return
    }
    const { error } = await supabase.from('uso_oficinas_particulares').delete().eq('id', visitaAEliminar.id)
    if (error) {
      mostrarError('Error al eliminar el registro: ' + error.message)
    } else {
      mostrarExito('Registro de visita y pago eliminado correctamente.')
      setVisitaAEliminar(null)
      setConfirmacionVisitaTexto('')
      fetchHistorialVisitas(clienteSeleccionadoId)
    }
  }

  const handleGuardarArriendo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!basesAceptadas) {
      mostrarError('Debes aceptar las Bases y Condiciones de uso físico para guardar el arriendo.')
      return
    }
    if (oficinasBloqueadas.includes(oficina) && estadoPago !== 'Cancelado') {
      mostrarError(`La ${oficina} no está disponible en este horario (${detallesBloqueo[oficina]}).`)
      return
    }
    setUploadingVoucher(true)
    let finalVoucherUrl = voucherActualUrl
    
    if (voucherFile) {
      const fileExt = voucherFile.name.split('.').pop()
      const fileName = `voucher_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${fileName}`
      const { error: uploadError } = await supabase.storage
        .from('vouchers')
        .upload(filePath, voucherFile)
      if (uploadError) {
        setUploadingVoucher(false)
        mostrarError('Error al subir el archivo de voucher: ' + uploadError.message)
        return
      }
      const { data: publicURLData } = supabase.storage
        .from('vouchers')
        .getPublicUrl(filePath)
      finalVoucherUrl = publicURLData.publicUrl
    }

    const payloadArriendo: any = {
      cliente_id: clienteSeleccionadoId,
      oficina_asignada: oficina,
      fecha_inicio: fechaIngreso,
      fecha_fin: fechaTermino,
      hora_inicio: horaIngreso,
      hora_fin: horaSalida,
      modalidad,
      horas_calculadas: estadoPago === 'Cancelado' ? 0 : horasCalculadas,
      monto_total: Number(valorCalculado),
      monto_neto: netoCalculado,
      iva: ivaCalculado,
      monto_liquido: montoLiquidoCustom,
      comision_tarjeta: comisionTarjetaCalculada,
      estado_pago: estadoPago,
      forma_pago: formaPago,
      bases_aceptadas: basesAceptadas,
      fecha_aceptacion_bases: fechaAceptacion,
      iniciado_por: iniciadoPorVisita,
      cobrado_por: cobradoPorVisita || null,
      voucher_url: finalVoucherUrl || null
    }

    let error
    if (editingVisitaId) {
      const res = await supabase.from('uso_oficinas_particulares').update(payloadArriendo).eq('id', editingVisitaId)
      error = res.error
    } else {
      const res = await supabase.from('uso_oficinas_particulares').insert([payloadArriendo])
      error = res.error
    }
    setUploadingVoucher(false)
    if (error) {
      mostrarError('Error guardando el arriendo: ' + error.message)
    } else {
      mostrarExito(editingVisitaId ? '¡Visita actualizada con éxito!' : '¡Nueva visita y pago registrado con éxito!')
      setIsArriendoModalOpen(false)
      resetFormularioArriendo()
      fetchHistorialVisitas(clienteSeleccionadoId)
    }
  }

  const queryLimpio = normalizarRut(searchTerm)
  const clientesFiltered = clientes.filter(c => {
    const nombreMatch = c.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) || false
    const empresaMatch = c.empresa?.toLowerCase().includes(searchTerm.toLowerCase()) || false
    const correoMatch = c.correo?.toLowerCase().includes(searchTerm.toLowerCase()) || false
    const rutClienteLimpio = normalizarRut(c.rut || '')
    const rutEmpresaLimpio = normalizarRut(c.rut_empresa || '')
    const rutMatch = queryLimpio ? (rutClienteLimpio.includes(queryLimpio) || rutEmpresaLimpio.includes(queryLimpio)) : false
    return nombreMatch || empresaMatch || correoMatch || rutMatch
  })

  const totalHorasAcumuladas = historialVisitasCliente.reduce((acc, curr) => acc + (Number(curr.horas_calculadas) || 0), 0)

  const reservasOficinaSeleccionadaHoy = reservasDelDiaModal.filter(r => r.oficina_asignada === oficina)

  return (
    <div className="mx-auto max-w-7xl space-y-7 font-sans relative">
      
      {(mensajeExito || mensajeError) && (
        <div className="fixed top-6 right-6 z-[9999] max-w-md animate-bounce-short">
          {mensajeExito && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-900 text-emerald-50 px-5 py-4 shadow-2xl backdrop-blur-md">
              <CheckCircle2 size={22} className="text-emerald-400 shrink-0" />
              <div className="text-xs font-semibold leading-relaxed">{mensajeExito}</div>
              <button onClick={() => setMensajeExito(null)} className="ml-auto text-emerald-300 hover:text-white">
                <X size={16} />
              </button>
            </div>
          )}
          {mensajeError && (
            <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-950 text-rose-50 px-5 py-4 shadow-2xl backdrop-blur-md">
              <AlertCircle size={22} className="text-rose-400 shrink-0" />
              <div className="text-xs font-semibold leading-relaxed">{mensajeError}</div>
              <button onClick={() => setMensajeError(null)} className="ml-auto text-rose-300 hover:text-white">
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Encabezado */}
      <section className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Clientes particulares</h1>
          <p className="mt-1 text-sm text-slate-500">Registro de personas, uso de oficinas e historial de pagos</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              resetFormularioArriendo()
              setIsArriendoModalOpen(true)
            }}
            className="flex items-center gap-2 border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold px-4 py-2 rounded-lg text-xs transition"
          >
            <Calendar size={16} /> + Uso de oficina
          </button>
          <button 
            onClick={() => {
              resetFormularioCliente()
              setIsClienteModalOpen(true)
            }}
            className="flex items-center gap-2 bg-[#C5A059] hover:bg-[#b59049] text-slate-950 font-bold px-4 py-2 rounded-lg text-xs shadow transition"
          >
            <Plus size={16} /> Nuevo cliente
          </button>
        </div>
      </section>

      {/* BARRA SUPERIOR: OFICINAS LIBRES EN TIEMPO REAL */}
      <section className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shrink-0">
            <CheckCircle size={20} />
          </span>
          <div>
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wide">Oficinas y Salas Disponibles en este Momento</h4>
            <p className="text-[11px] text-emerald-700">Espacios listos para asignación presencial inmediata hoy.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {oficinasLibresAhora.length === 0 ? (
            <span className="text-xs font-bold text-rose-700 bg-rose-100 px-3 py-1 rounded-lg border border-rose-200">
              ⚠️ Todas las oficinas están ocupadas ahora
            </span>
          ) : (
            oficinasLibresAhora.map(of => (
              <span key={of} className="bg-white border border-emerald-300 text-emerald-900 px-2.5 py-1 rounded-lg text-xs font-bold shadow-2xs">
                🟢 {of}
              </span>
            ))
          )}
        </div>
      </section>

      {/* Tarjetas de Tarifas */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm border-l-4 border-l-[#C5A059]">
          <p className="text-xs font-semibold text-slate-400">Valor por hora (Mínimo $3.000)</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">$3.000</h3>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400">Valor por día</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">$20.000</h3>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400">Valor por semana</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">$102.000</h3>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400">Valor mensual</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">$350.000</h3>
        </article>
      </section>

      {/* Búsqueda */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-900 text-sm">Registro y cálculo de uso</h3>
        <p className="text-xs text-slate-500">
          Primero registre al cliente. Luego presione <strong>+ Uso de oficina</strong>, seleccione la modalidad y escriba las horas. El sistema aplicará un mínimo de $3.000 para estancias menores o iguales a 1 hora.
        </p>
        <div className="pt-2 relative max-w-md">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, RUT, empresa o correo"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
          />
        </div>
      </section>

      {/* Listado de Clientes */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#181818] text-[#C5A059] font-bold uppercase tracking-wider">
              <th className="py-3.5 px-4">NOMBRE / RUT</th>
              <th className="py-3.5 px-4">EMPRESA (OPCIONAL)</th>
              <th className="py-3.5 px-4">CONTACTO</th>
              <th className="py-3.5 px-4">TÉRMINOS / ZOHO</th>
              <th className="py-3.5 px-4 text-right">ACCIONES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">Cargando clientes...</td></tr>
            ) : clientesFiltered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">No hay clientes particulares registrados.</td></tr>
            ) : (
              clientesFiltered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition">
                  <td className="py-4 px-4 font-bold text-slate-900">
                    {c.nombre_completo}
                    <span className="block text-[11px] font-normal text-slate-500">{c.rut}</span>
                  </td>
                  <td className="py-4 px-4 text-slate-700">
                    {c.empresa ? (
                      <>
                        <span className="font-semibold">{c.empresa}</span>
                        {c.rut_empresa && <span className="block text-[11px] text-slate-400">{c.rut_empresa}</span>}
                      </>
                    ) : (
                      <span className="text-slate-400 italic">Sin empresa</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-slate-600">
                    {c.telefono}
                    <span className="block text-[11px] text-slate-400">{c.correo || '—'}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.terminos_aceptados 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {c.terminos_aceptados ? '• Aceptado' : '• Pendiente'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAbrirQr(c)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#C5A059] hover:underline transition"
                      >
                        <QrCode size={12} /> Ver QR
                      </button>
                      {!c.terminos_aceptados && (
                        <button
                          type="button"
                          onClick={() => handleAbrirUploadManual(c)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition"
                        >
                          <FileUp size={11} /> Subir respaldo Zoho
                        </button>
                      )}
                      {c.terminos_aceptados && (
                        <button
                          type="button"
                          onClick={() => handleVerZohoPayload(c)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:text-purple-800 transition"
                        >
                          <Download size={11} /> Ver respaldo Zoho
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right space-x-1.5">
                    <button 
                      onClick={() => {
                        resetFormularioArriendo()
                        setClienteSeleccionadoId(c.id)
                        setIsArriendoModalOpen(true)
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-[#C5A059] text-slate-900 bg-amber-50 rounded-lg text-[11px] font-bold hover:bg-amber-100 transition"
                    >
                      + Uso de oficina
                    </button>
                    <button 
                      onClick={() => handleAbrirEditarCliente(c)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-100 align-middle transition"
                      title="Editar cliente"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => {
                        setClienteAEliminar(c)
                        setConfirmacionTexto('')
                      }}
                      className="p-1.5 text-rose-500 hover:text-rose-700 border border-rose-200 hover:bg-rose-50 rounded-lg align-middle transition"
                      title="Eliminar cliente"
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

      {/* MODAL QR */}
      {isQrModalOpen && clienteQrSeleccionado && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl p-6 text-center space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-slate-900 text-base">QR de Aceptación de Términos</h3>
              <button onClick={() => setIsQrModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Escanea el código para precargar los datos de <strong>{clienteQrSeleccionado.nombre_completo}</strong> en el formulario de Zoho.
            </p>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-center">
              <QRCodeSVG 
                value={`https://forms.zohopublic.com/rotaryconcordia1/form/Aceptacionterminossutrato/formperma/dEiuFyNghAj8CFZhy7d5P7knBvun9DFBkH6HX0l2Bh4?zf_lang=en&Field_3=${encodeURIComponent(clienteQrSeleccionado.rut || '')}&Field_4=${encodeURIComponent(clienteQrSeleccionado.telefono || '')}&Field_5=${encodeURIComponent(clienteQrSeleccionado.correo || '')}&Field_6=${encodeURIComponent(clienteQrSeleccionado.nombre_completo || '')}&Field_7=${encodeURIComponent(clienteQrSeleccionado.rut_empresa || '')}&Field_9=Oficina%201`} 
                size={180} 
              />
            </div>
            <div className="text-left bg-blue-50/60 p-3 rounded-lg text-[11px] text-slate-700 space-y-1">
              <p><strong>Cliente:</strong> {clienteQrSeleccionado.nombre_completo} ({clienteQrSeleccionado.rut})</p>
              <p><strong>Estado:</strong> <span className={clienteQrSeleccionado?.terminos_aceptados ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>{clienteQrSeleccionado?.terminos_aceptados ? 'Aceptado' : 'Pendiente'}</span></p>
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

      {/* MODAL SUBIR RESPALDO ZOHO MANUALMENTE */}
      {isUploadModalOpen && clienteUploadSeleccionado && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-slate-900 text-base">Subir respaldo Zoho (Manual)</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Sube el archivo PDF o comprobante exportado de Zoho para <strong>{clienteUploadSeleccionado.nombre_completo}</strong>. Al subirlo, pasará automáticamente a estado <strong>Aceptado</strong>.
            </p>
            <form onSubmit={handleGuardarSubidaManual} className="space-y-4 text-xs">
              <div className="border border-slate-300 rounded-lg p-3 bg-slate-50">
                <input 
                  type="file" 
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setZohoFileManual(e.target.files[0])
                    }
                  }}
                  className="w-full text-xs text-slate-600 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-[#C5A059] file:text-slate-950 hover:file:bg-[#b59049]" 
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsUploadModalOpen(false)} 
                  className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={uploadingZohoManual}
                  className="bg-[#C5A059] hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold px-5 py-2 rounded-lg shadow transition"
                >
                  {uploadingZohoManual ? 'Subiendo...' : 'Confirmar y marcar aceptado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NUEVO / EDITAR CLIENTE */}
      {isClienteModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
            <div className="bg-[#181818] text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-base">
                {editingClienteId ? 'Editar cliente particular' : 'Nuevo cliente particular'}
              </h3>
              <button onClick={() => { setIsClienteModalOpen(false); resetFormularioCliente(); }} className="text-neutral-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleGuardarCliente} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombre completo *</label>
                  <input type="text" value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" required />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">RUT *</label>
                  <input type="text" value={rut} onChange={(e) => setRut(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" required />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teléfono *</label>
                  <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" required />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Correo *</label>
                  <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" required />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Empresa (Opcional)</label>
                  <input type="text" placeholder="Nombre de la empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">RUT empresa (Opcional)</label>
                  <input type="text" placeholder="XX.XXX.XXX-X" value={rutEmpresa} onChange={(e) => setRutEmpresa(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Observaciones</label>
                <textarea rows={3} value={obsCliente} onChange={(e) => setObsCliente(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => { setIsClienteModalOpen(false); resetFormularioCliente(); }} 
                  className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button type="submit" className="bg-[#C5A059] hover:bg-[#b59049] text-slate-950 font-bold px-5 py-2 rounded-lg shadow transition">
                  {editingClienteId ? 'Guardar cambios' : 'Guardar cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ELIMINACIÓN CLIENTE */}
      {clienteAEliminar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[999]">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-rose-100">
            <div className="bg-[#E11D48] text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-base tracking-wide">Eliminar cliente particular</h3>
              <button onClick={() => setClienteAEliminar(null)} className="text-white/80 hover:text-white transition">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleConfirmarEliminarCliente} className="p-6 space-y-5 text-xs">
              <p className="text-slate-800 text-sm font-medium">
                ¿Estás seguro de que deseas eliminar a <strong>{clienteAEliminar.nombre_completo}</strong>?
              </p>
              <div className="bg-rose-50 border border-rose-200 text-rose-900 p-4 rounded-xl space-y-1">
                <p>
                  Escribe <strong className="underline font-black">ELIMINAR</strong> a continuación para confirmar el borrado definitivo.
                </p>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Confirmación *</label>
                <input 
                  type="text" 
                  placeholder="ESCRIBE ELIMINAR"
                  value={confirmacionTexto}
                  onChange={(e) => setConfirmacionTexto(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs font-bold uppercase placeholder:font-normal placeholder:text-rose-300 text-rose-600"
                  required
                />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setClienteAEliminar(null)} 
                  className="px-5 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition text-xs"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={confirmacionTexto.trim().toUpperCase() !== 'ELIMINAR'}
                  className="bg-[#FB7185] hover:bg-[#F43F5E] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-6 py-2.5 rounded-xl shadow transition text-xs"
                >
                  Presiona ELIMINAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ELIMINACIÓN VISITA / PAGO */}
      {visitaAEliminar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[999]">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-rose-100">
            <div className="bg-[#E11D48] text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-base tracking-wide">Eliminar registro de pago / visita</h3>
              <button onClick={() => setVisitaAEliminar(null)} className="text-white/80 hover:text-white transition">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleConfirmarEliminarVisita} className="p-6 space-y-5 text-xs">
              <p className="text-slate-800 text-sm font-medium">
                ¿Estás seguro de que deseas eliminar la visita del <strong>{visitaAEliminar.fecha_inicio}</strong> ({visitaAEliminar.oficina_asignada})?
              </p>
              <div className="bg-rose-50 border border-rose-200 text-rose-900 p-4 rounded-xl space-y-1">
                <p>
                  Escribe <strong className="underline font-black">ELIMINAR</strong> para confirmar el borrado definitivo de este pago.
                </p>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Confirmación *</label>
                <input 
                  type="text" 
                  placeholder="ESCRIBE ELIMINAR"
                  value={confirmacionVisitaTexto}
                  onChange={(e) => setConfirmacionVisitaTexto(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs font-bold uppercase placeholder:font-normal placeholder:text-rose-300 text-rose-600"
                  required
                />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setVisitaAEliminar(null)} 
                  className="px-5 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition text-xs"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={confirmacionVisitaTexto.trim().toUpperCase() !== 'ELIMINAR'}
                  className="bg-[#FB7185] hover:bg-[#F43F5E] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-6 py-2.5 rounded-xl shadow transition text-xs"
                >
                  Presiona ELIMINAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR / EDITAR ARRIENDO */}
      {isArriendoModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="bg-[#181818] text-white px-6 py-4 flex justify-between items-center sticky top-0 z-20">
              <h3 className="font-bold text-base">
                {editingVisitaId ? 'Editar registro de arriendo / pago' : 'Registrar arriendo y acumular horas de visita'}
              </h3>
              <button onClick={() => { setIsArriendoModalOpen(false); resetFormularioArriendo(); }} className="text-neutral-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleGuardarArriendo} className="p-6 space-y-5 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cliente particular *</label>
                  <select 
                    value={clienteSeleccionadoId} 
                    onChange={(e) => setClienteSeleccionadoId(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none bg-white font-bold"
                    required
                  >
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre_completo} {c.empresa ? `(${c.empresa})` : ''} - RUT: {c.rut}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex flex-wrap justify-between items-center bg-white border border-slate-200 rounded-lg p-3 text-[11px]">
                  <div>
                    <span className="text-slate-500">Visitas registradas: </span>
                    <strong className="text-slate-900">{historialVisitasCliente.length} veces</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Total horas acumuladas: </span>
                    <strong className="text-[#C5A059]">{totalHorasAcumuladas.toFixed(1)} hrs</strong>
                  </div>
                </div>
                {historialVisitasCliente.length > 0 && (
                  <div className="space-y-1">
                    <p className="font-bold text-slate-600 text-[10px] uppercase tracking-wider">
                      Historial de visitas (Haz clic en una para editarla):
                    </p>
                    <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                      {historialVisitasCliente.map((visita) => (
                        <div 
                          key={visita.id} 
                          className={`flex justify-between items-center bg-white px-3 py-2 rounded-lg border transition ${editingVisitaId === visita.id ? 'border-[#C5A059] bg-amber-50/60 ring-1 ring-[#C5A059]' : 'border-slate-200 hover:bg-slate-50'}`}
                        >
                          <span 
                            onClick={() => handleSeleccionarVisitaParaEditar(visita)} 
                            className="cursor-pointer flex-1"
                          >
                            📅 {visita.fecha_inicio} ({visita.hora_inicio} - {visita.hora_fin}) — <strong className="text-slate-700">{visita.oficina_asignada} [{visita.horas_calculadas}h]</strong> 
                            <span className="block text-[10px] text-slate-500">Inició: {visita.iniciado_por || '—'} | Cobró: {visita.cobrado_por || 'Aún no se cobra'}</span>
                          </span>
                          <div className="flex items-center gap-2">
                            {visita.voucher_url ? (
                              <button 
                                type="button"
                                onClick={() => handleVerVoucherSeguro(visita.voucher_url!)}
                                className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 px-2 py-1 rounded text-[10px] font-bold transition"
                              >
                                <ExternalLink size={11} /> Voucher
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Sin voucher</span>
                            )}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              visita.estado_pago === 'Pagado' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : visita.estado_pago === 'Reservado' 
                                ? 'bg-blue-100 text-blue-800' 
                                : visita.estado_pago === 'Cancelado'
                                ? 'bg-rose-100 text-rose-800 line-through'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {visita.estado_pago}
                            </span>
                            <button 
                              type="button"
                              onClick={() => {
                                setVisitaAEliminar(visita)
                                setConfirmacionVisitaTexto('')
                              }}
                              className="text-rose-500 hover:text-rose-700 p-1.5 border border-rose-200 rounded-lg hover:bg-rose-50 transition"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {editingVisitaId && (
                  <div className="flex justify-between items-center bg-amber-100/70 border border-amber-300 p-2 rounded-lg text-[11px] text-amber-900">
                    <span>✏️ Estás editando una visita seleccionada del historial.</span>
                    <button type="button" onClick={() => resetFormularioArriendo()} className="underline font-bold hover:text-amber-950">
                      Cancelar edición / Crear nueva
                    </button>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Oficina *</label>
                  <select 
                    value={oficina} 
                    onChange={(e) => setOficina(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none bg-white font-medium"
                  >
                    {listaTodasOficinas.map((of) => {
                      const estaBloqueada = oficinasBloqueadas.includes(of)
                      const motivo = detallesBloqueo[of]
                      return (
                        <option key={of} value={of} disabled={estaBloqueada} className={estaBloqueada ? 'text-slate-400 bg-slate-100 font-semibold' : ''}>
                          {of} {estaBloqueada ? `— (${motivo})` : ''}
                        </option>
                      )
                    })}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Modalidad</label>
                  <select 
                    value={modalidad} 
                    onChange={(e) => {
                      const nuevaMod = e.target.value
                      setModalidad(nuevaMod)
                      if (estadoPago !== 'Cancelado') {
                        calcularHorasYPrecios(horaIngreso, horaSalida, nuevaMod)
                      }
                    }} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none bg-white"
                  >
                    <option value="Por hora">Por hora</option>
                    <option value="Por día">Por día</option>
                    <option value="Por semana">Por semana</option>
                    <option value="Mensual">Mensual</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Forma de pago</label>
                  <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none bg-white">
                    <option value="Transferencia">Transferencia</option>
                    <option value="Mercado Pago">Mercado Pago</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta de Débito/Crédito">Tarjeta de Débito/Crédito</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha ingreso *</label>
                  <input type="date" value={fechaIngreso} onChange={(e) => setFechaIngreso(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" required />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha término *</label>
                  <input type="date" value={fechaTermino} onChange={(e) => setFechaTermino(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" required />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estado del pago</label>
                  <select 
                    value={estadoPago} 
                    onChange={(e) => {
                      const nuevoEstado = e.target.value
                      setEstadoPago(nuevoEstado)
                      if (nuevoEstado === 'Cancelado') {
                        setValorCalculado(0)
                        setMontoLiquidoCustom(0)
                      } else {
                        calcularHorasYPrecios(horaIngreso, horaSalida, modalidad)
                      }
                    }} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none bg-white font-bold text-amber-700"
                  >
                    <option value="Pagado">Pagado</option>
                    <option value="Reservado">Reservado (Anticipado)</option>
                    <option value="Pendiente">Pendiente (Bloquea espacio)</option>
                    <option value="Cancelado">Cancelado (Devolución 24h)</option>
                  </select>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">⚠️ Cancelado libera la oficina y descuenta el dinero.</span>
                </div>

                {/* 🟢 HORA DE INGRESO: AL HACER CLIC EN EL INPUT ABRE LA PAUTA DE OCUPADOS */}
                <div className="relative" ref={pautaIngresoRef}>
                  <label className="block font-bold text-slate-700 mb-1">Hora de ingreso *</label>
                  <div className="relative">
                    <input 
                      type="time" 
                      value={horaIngreso} 
                      onClick={() => setShowPautaIngreso(true)}
                      onChange={(e) => {
                        const val = e.target.value
                        setHoraIngreso(val)
                        if (estadoPago !== 'Cancelado') {
                          calcularHorasYPrecios(val, horaSalida, modalidad)
                        }
                      }} 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C5A059] font-extrabold text-slate-900 bg-white cursor-pointer"
                      required 
                    />
                  </div>

                  {showPautaIngreso && (
                    <div className="absolute left-0 mt-1 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 space-y-3 animate-fade-in">
                      <div className="flex justify-between items-center border-b pb-2">
                        <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <Clock size={14} className="text-[#C5A059]" /> Ocupados en {oficina}
                        </h4>
                        <button type="button" onClick={() => setShowPautaIngreso(false)} className="text-slate-400 hover:text-slate-700">
                          <X size={16} />
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
                        {reservasOficinaSeleccionadaHoy.length === 0 ? (
                          <p className="text-emerald-700 bg-emerald-50 p-2.5 rounded-lg font-bold text-center">
                            🟢 ¡Todo libre hoy en esta oficina!
                          </p>
                        ) : (
                          reservasOficinaSeleccionadaHoy.map((r, idx) => (
                            <div key={idx} className="bg-rose-50 border border-rose-200 text-rose-900 px-3 py-2 rounded-lg font-bold flex justify-between items-center">
                              <span>🔴 {r.hora_inicio?.substring(0, 5)} - {r.hora_fin?.substring(0, 5)} hrs</span>
                              <span className="text-[10px] uppercase bg-rose-200 px-1.5 py-0.5 rounded text-rose-900">Ocupado</span>
                            </div>
                          ))
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 text-center">
                        Puedes escribir cualquier hora exacta (ej. 14:15) en el cuadro de texto.
                      </p>
                    </div>
                  )}
                </div>

                {/* 🟢 HORA DE SALIDA: AL HACER CLIC EN EL INPUT ABRE LA PAUTA DE OCUPADOS */}
                <div className="relative" ref={pautaSalidaRef}>
                  <label className="block font-bold text-slate-700 mb-1">Hora de salida *</label>
                  <div className="relative">
                    <input 
                      type="time" 
                      value={horaSalida} 
                      onClick={() => setShowPautaSalida(true)}
                      onChange={(e) => {
                        const val = e.target.value
                        setHoraSalida(val)
                        if (estadoPago !== 'Cancelado') {
                          calcularHorasYPrecios(horaIngreso, val, modalidad)
                        }
                      }} 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C5A059] font-extrabold text-slate-900 bg-white cursor-pointer"
                      required 
                    />
                  </div>

                  {showPautaSalida && (
                    <div className="absolute left-0 mt-1 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 space-y-3 animate-fade-in">
                      <div className="flex justify-between items-center border-b pb-2">
                        <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <Clock size={14} className="text-[#C5A059]" /> Ocupados en {oficina}
                        </h4>
                        <button type="button" onClick={() => setShowPautaSalida(false)} className="text-slate-400 hover:text-slate-700">
                          <X size={16} />
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
                        {reservasOficinaSeleccionadaHoy.length === 0 ? (
                          <p className="text-emerald-700 bg-emerald-50 p-2.5 rounded-lg font-bold text-center">
                            🟢 ¡Todo libre hoy en esta oficina!
                          </p>
                        ) : (
                          reservasOficinaSeleccionadaHoy.map((r, idx) => (
                            <div key={idx} className="bg-rose-50 border border-rose-200 text-rose-900 px-3 py-2 rounded-lg font-bold flex justify-between items-center">
                              <span>🔴 {r.hora_inicio?.substring(0, 5)} - {r.hora_fin?.substring(0, 5)} hrs</span>
                              <span className="text-[10px] uppercase bg-rose-200 px-1.5 py-0.5 rounded text-rose-900">Ocupado</span>
                            </div>
                          ))
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 text-center">
                        Puedes escribir cualquier hora exacta (ej. 16:50) en el cuadro de texto.
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Horas calculadas</label>
                  <input type="number" step="0.01" value={estadoPago === 'Cancelado' ? 0 : horasCalculadas} readOnly className="w-full px-3 py-2 border border-slate-200 bg-stone-100 rounded-lg focus:outline-none font-semibold text-slate-800" />
                </div>
              </div>

              {estadoPago === 'Cancelado' && (
                <div className="bg-gradient-to-r from-rose-600 to-rose-700 text-white p-6 rounded-2xl shadow-xl space-y-2 text-center animate-fade-in border border-rose-400">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-rose-100 flex items-center justify-center gap-1.5">
                    <AlertCircle size={18} /> MONTO EXACTO A DEVOLVER AL CLIENTE
                  </p>
                  <h2 className="text-4xl font-black tracking-tight drop-shadow-md">
                    ${montoDevolucionReal.toLocaleString('es-CL')}
                  </h2>
                  <p className="text-xs text-rose-100 font-medium max-w-lg mx-auto leading-relaxed">
                    Esta reserva ha sido excluida del calendario y los montos contables se fijaron en $0. Recuerda realizar la transferencia de devolución al cliente a través de <strong>{formaPago}</strong> por el valor indicado arriba.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-50/50 p-4 rounded-xl border border-amber-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Iniciado / Reservado por *</label>
                  <select 
                    value={iniciadoPorVisita} 
                    onChange={(e) => setIniciadoPorVisita(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none bg-white font-bold text-slate-800"
                    required
                  >
                    <option value="Damián">Damián</option>
                    <option value="Joaquín">Joaquín</option>
                    <option value="Constanza">Constanza</option>
                    <option value="Jorge">Jorge</option>
                  </select>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Quién tomó la reserva o inició la visita.</span>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cobrado / Gestionado por</label>
                  <select 
                    value={cobradoPorVisita} 
                    onChange={(e) => setCobradoPorVisita(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none bg-white font-bold text-[#C5A059]"
                  >
                    <option value="">-- Sin cobrar / Pendiente (Aún no cierra) --</option>
                    <option value="Damián">Damián</option>
                    <option value="Joaquín">Joaquín</option>
                    <option value="Constanza">Constanza</option>
                    <option value="Jorge">Jorge</option>
                  </select>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Quién recibió el pago o cerró el comprobante.</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Monto Bruto ($)</label>
                  <input type="number" value={valorCalculado} onChange={(e) => setValorCalculado(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-lg font-extrabold text-slate-900" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Monto Líquido Recibido</label>
                  <input type="number" value={montoLiquidoCustom} onChange={(e) => setMontoLiquidoCustom(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-emerald-700" />
                </div>
              </div>

              <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                <div>
                  <p className="text-[10px] font-semibold text-slate-500">Monto bruto</p>
                  <p className="font-extrabold text-slate-900 text-sm mt-0.5">${valorCalculado.toLocaleString('es-CL')}</p>
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
                  <p className="font-bold text-emerald-700 text-xs mt-0.5">${montoLiquidoCustom.toLocaleString('es-CL')}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-500">Comisión tarjeta</p>
                  <p className="font-bold text-amber-700 text-xs mt-0.5">${comisionTarjetaCalculada.toLocaleString('es-CL')}</p>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Comprobante de pago / Voucher (Archivo)</label>
                {voucherActualUrl && !voucherFile && (
                  <div className="mb-2 flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2 rounded-lg text-[11px]">
                    <span className="text-emerald-800 font-medium truncate max-w-xs">📎 Voucher Guardado <A:link></A:link>ctual</span>
                    <button type="button" onClick={() => handleVerVoucherSeguro(voucherActualUrl)} className="text-emerald-700 font-bold underline">
                      Ver archivo actual
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2 border border-slate-300 rounded-lg p-2 bg-white">
                  <Upload size={16} className="text-slate-400 shrink-0" />
                  <input 
                    type="file" 
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setVoucherFile(e.target.files[0])
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-[#C5A059] file:text-slate-950 hover:file:bg-[#b59049]" 
                  />
                </div>
              </div>

              <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    <QrCode size={18} className="text-[#C5A059]" /> Bases y Condiciones de Uso Físico (SOHO QR)
                  </h4>
                  <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold">Escaneo QR</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input type="checkbox" id="bases" checked={basesAceptadas} onChange={(e) => setBasesAceptadas(e.target.checked)} className="rounded text-[#C5A059] focus:ring-[#C5A059]" />
                  <label htmlFor="bases" className="font-bold text-slate-800">Aceptado por el cliente</label>
                </div>
                {basesAceptadas && (
                  <div className="pt-1">
                    <label className="block font-bold text-slate-700 mb-1">Fecha de aceptación</label>
                    <input type="date" value={fechaAceptacion} onChange={(e) => setFechaAceptacion(e.target.value)} className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none" />
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => { setIsArriendoModalOpen(false); resetFormularioArriendo(); }} className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={uploadingVoucher} className="bg-[#C5A059] hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold px-6 py-2 rounded-lg shadow transition">
                  {uploadingVoucher ? 'Subiendo archivo...' : editingVisitaId ? 'Actualizar registro de arriendo' : 'Registrar nueva visita y acumular'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}