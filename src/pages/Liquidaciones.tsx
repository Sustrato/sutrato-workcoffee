import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import {  Trash2, PlusCircle, CheckCircle, Clock, ChevronDown, ChevronUp, Check, AlertCircle, Loader2, X, Edit3, Landmark } from 'lucide-react'

interface Liquidacion {
  id: string
  proveedor: string
  tipo: string
  desde: string
  hasta: string
  fecha_deposito: string
  nro_liquidacion: string
  venta_bruta: number
  otros_descuentos: number
  abono_real: number
  cuenta_receptora: string
  comprobante: string
}

interface VentaMPAutomatica {
  id: string
  fecha: string
  medio_pago: string
  monto_bruto: number
  comision: number
  documento: string
  observacion: string
}

interface Propina {
  id: string
  mes_cobro: string
  nombre_garzon: string
  medio_pago: string
  propina_cobrada: number
  monto_entregado: number
  fecha_entrega: string
  cuenta_pago: string
  comprobante: string
}

export default function Liquidaciones() {
  const [loading, setLoading] = useState(false)

  // Notificaciones flotantes tipo Toast
  const [mensajeExito, setMensajeExito] = useState('')
  const [mensajeError, setMensajeError] = useState('')

  // Control de desplegables (Acordeones)
  const [mostrarMpAuto, setMostrarMpAuto] = useState(false)
  const [mostrarFormLiq, setMostrarFormLiq] = useState(false)
  const [mostrarFormPropina, setMostrarFormPropina] = useState(false)

  // Estados para Modal de Eliminación Profesional
  const [itemAEliminar, setItemAEliminar] = useState<{ id: string; tipo: 'liq' | 'prop'; titulo: string } | null>(null)
  const [textoConfirmacion, setTextoConfirmacion] = useState('')

  // --- ESTADOS PARA LIQUIDACIONES MANUALES ---
  const [proveedor, setProveedor] = useState('Transbank')
  const [tipoLiq, setTipoLiq] = useState('Débito')
  const [desde, setDesde] = useState(new Date().toISOString().split('T')[0])
  const [hasta, setHasta] = useState(new Date().toISOString().split('T')[0])
  const [fechaDeposito, setFechaDeposito] = useState(new Date().toISOString().split('T')[0])
  const [nroLiquidacion, setNroLiquidacion] = useState('')
  const [ventaBruta, setVentaBruta] = useState('')
  const [otrosDescuentos, setOtrosDescuentos] = useState('0')
  const [abonoReal, setAbonoReal] = useState('')
  const [cuentaReceptora, setCuentaReceptora] = useState('Caja / Efectivo')
  const [comprobanteLiq, setComprobanteLiq] = useState('')
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([])

  // --- ESTADOS PARA VENTAS AUTOMÁTICAS ---
  const [ventasMpAuto, setVentasMpAuto] = useState<VentaMPAutomatica[]>([])

  // --- ESTADOS PARA PROPINAS Y EDICIÓN ---
  const [modoEdicionPropina, setModoEdicionPropina] = useState(false)
  const [idPropinaEditando, setIdPropinaEditando] = useState<string | null>(null)
  const [mesCobro, setMesCobro] = useState(new Date().toISOString().slice(0, 7))
  const [nombreGarzon, setNombreGarzon] = useState('')
  const [medioPagoProp, setMedioPagoProp] = useState('Efectivo')
  const [propinaCobrada, setPropinaCobrada] = useState('')
  const [montoEntregado, setMontoEntregado] = useState('')
  const [fechaEntrega, setFechaEntrega] = useState(new Date().toISOString().split('T')[0])
  const [cuentaPagoProp, setCuentaPagoProp] = useState('Caja / Efectivo')
  const [archivoComprobante, setArchivoComprobante] = useState<File | null>(null)
  const [propinas, setPropinas] = useState<Propina[]>([])

  const mostrarAlertaExito = (msg: string) => {
    setMensajeExito(msg)
    setMensajeError('')
    setTimeout(() => setMensajeExito(''), 4000)
  }

  const mostrarAlertaError = (msg: string) => {
    setMensajeError(msg)
    setMensajeExito('')
    setTimeout(() => setMensajeError(''), 5000)
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: liqData } = await supabase.from('liquidaciones').select('*').order('fecha_deposito', { ascending: false })
      setLiquidaciones(liqData || [])
      
      const { data: mpData } = await supabase.from('ventas_diarias').select('*').eq('linea_negocio', 'Ventas cafetería').order('fecha', { ascending: false }).limit(20)
      setVentasMpAuto(mpData || [])
      
      const { data: propData } = await supabase.from('propinas').select('*').order('mes_cobro', { ascending: false })
      setPropinas(propData || [])
    } catch (err: any) {
      mostrarAlertaError('Error al sincronizar datos: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleGuardarLiquidacion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ventaBruta || !abonoReal) {
      mostrarAlertaError('Por favor completa la venta bruta y el abono real.')
      return
    }

    const nuevaLiq = {
      proveedor,
      tipo: tipoLiq,
      desde,
      hasta,
      fecha_deposito: fechaDeposito,
      nro_liquidacion: nroLiquidacion || 'S/N',
      venta_bruta: Number(ventaBruta),
      otros_descuentos: Number(otrosDescuentos),
      abono_real: Number(abonoReal),
      cuenta_receptora: cuentaReceptora,
      comprobante: comprobanteLiq,
    }

    setLoading(true)
    const { error } = await supabase.from('liquidaciones').insert([nuevaLiq])
    setLoading(false)

    if (error) {
      mostrarAlertaError('Error al guardar liquidación: ' + error.message)
    } else {
      mostrarAlertaExito('¡Liquidación guardada correctamente!')
      setNroLiquidacion('')
      setVentaBruta('')
      setAbonoReal('')
      setComprobanteLiq('')
      setMostrarFormLiq(false)
      fetchData()
    }
  }

  const handleGuardarPropina = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombreGarzon || !propinaCobrada) {
      mostrarAlertaError('Ingresa el nombre del garzón y la propina cobrada.')
      return
    }

    setLoading(true)
    let comprobanteUrl = ''
    
    if (archivoComprobante) {
      const fileName = `propina_${Date.now()}_${archivoComprobante.name}`
      const { error: uploadError } = await supabase.storage
        .from('comprobantes_propinas')
        .upload(fileName, archivoComprobante)

      if (uploadError) {
        setLoading(false)
        mostrarAlertaError('Error al subir el comprobante: ' + uploadError.message)
        return
      }

      const { data: publicURLData } = supabase.storage
        .from('comprobantes_propinas')
        .getPublicUrl(fileName)
      comprobanteUrl = publicURLData.publicUrl
    }

    const datosPropina: any = {
      mes_cobro: mesCobro,
      nombre_garzon: nombreGarzon,
      medio_pago: medioPagoProp,
      propina_cobrada: Number(propinaCobrada),
      monto_entregado: Number(montoEntregado || 0),
      fecha_entrega: fechaEntrega,
      cuenta_pago: cuentaPagoProp,
    }

    if (comprobanteUrl) {
      datosPropina.comprobante = comprobanteUrl
    }

    let error = null

    if (modoEdicionPropina && idPropinaEditando) {
      const res = await supabase.from('propinas').update(datosPropina).eq('id', idPropinaEditando)
      error = res.error
    } else {
      const res = await supabase.from('propinas').insert([datosPropina])
      error = res.error
    }

    setLoading(false)

    if (error) {
      mostrarAlertaError('Error al guardar propina: ' + error.message)
    } else {
      mostrarAlertaExito(modoEdicionPropina ? '¡Propina actualizada correctamente!' : '¡Propina mensual registrada con éxito!')
      limpiarFormPropina()
      fetchData()
    }
  }

  const prepararEdicionPropina = (p: Propina) => {
    setModoEdicionPropina(true)
    setIdPropinaEditando(p.id)
    setMesCobro(p.mes_cobro)
    setNombreGarzon(p.nombre_garzon)
    setMedioPagoProp(p.medio_pago)
    setPropinaCobrada(String(p.propina_cobrada))
    setMontoEntregado(String(p.monto_entregado))
    setFechaEntrega(p.fecha_entrega)
    setCuentaPagoProp(p.cuenta_pago)
    setMostrarFormPropina(true)
  }

  const limpiarFormPropina = () => {
    setModoEdicionPropina(false)
    setIdPropinaEditando(null)
    setNombreGarzon('')
    setPropinaCobrada('')
    setMontoEntregado('')
    setArchivoComprobante(null)
    setMostrarFormPropina(false)
  }

  const ejecutarEliminacion = async () => {
    if (!itemAEliminar) return
    if (textoConfirmacion.trim().toUpperCase() !== 'ELIMINAR') {
      mostrarAlertaError('Debes escribir la palabra ELIMINAR en mayúsculas para confirmar.')
      return
    }

    setLoading(true)
    const tabla = itemAEliminar.tipo === 'liq' ? 'liquidaciones' : 'propinas'
    const { error } = await supabase.from(tabla).delete().eq('id', itemAEliminar.id)
    setLoading(false)

    if (error) {
      mostrarAlertaError('Error al eliminar: ' + error.message)
    } else {
      mostrarAlertaExito('Registro eliminado permanentemente.')
      setItemAEliminar(null)
      setTextoConfirmacion('')
      fetchData()
    }
  }

  return (
    <div className="space-y-10 p-6 bg-slate-50 min-h-screen relative">
      
      {/* 🚀 NOTIFICACIONES FLOTANTES TIPO TOAST */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {mensajeExito && (
          <div className="pointer-events-auto bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-bold border border-emerald-500 animate-bounce">
            <Check size={20} className="shrink-0" />
            <span>{mensajeExito}</span>
          </div>
        )}
        {mensajeError && (
          <div className="pointer-events-auto bg-rose-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-bold border border-rose-500 animate-pulse">
            <AlertCircle size={20} className="shrink-0" />
            <span>{mensajeError}</span>
          </div>
        )}
      </div>

      {/* 🛑 MODAL PROFESIONAL DE ELIMINACIÓN */}
      {itemAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">¿Eliminar registro?</h3>
                  <p className="text-xs text-slate-500">{itemAEliminar.titulo}</p>
                </div>
              </div>
              <button 
                onClick={() => { setItemAEliminar(null); setTextoConfirmacion(''); }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Escribe <span className="text-rose-600 uppercase font-extrabold">ELIMINAR</span> para confirmar:
              </label>
              <input 
                type="text"
                placeholder="Escribe ELIMINAR aquí..."
                value={textoConfirmacion}
                onChange={(e) => setTextoConfirmacion(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="button"
                onClick={() => { setItemAEliminar(null); setTextoConfirmacion(''); }}
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={ejecutarEliminacion}
                disabled={textoConfirmacion.trim().toUpperCase() !== 'ELIMINAR' || loading}
                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Confirmar baja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 Encabezado */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Sutrato WorkCoffee • Arica</span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Liquidaciones y conciliación</h1>
        </div>
      </div>

      {/* ================= SECCIÓN 1A: CONCILIACIÓN AUTOMÁTICA MERCADO PAGO (DESPLEGABLE) ================= */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Conciliación Automática • Mercado Pago</h2>
            <p className="text-xs text-slate-500">Transacciones bajadas automáticamente de la API de Mercado Pago con su comisión neta calculada.</p>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold flex items-center gap-1">
              <CheckCircle size={12} /> Sincronizado cada 30 min
            </span>
            <button
              onClick={() => setMostrarMpAuto(!mostrarMpAuto)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow transition"
            >
              <Landmark size={15} />
              <span>{mostrarMpAuto ? 'Ocultar Transacciones' : 'Ver Transacciones Automáticas'}</span>
              {mostrarMpAuto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {mostrarMpAuto && (
          <div className="overflow-x-auto pt-2 animate-in fade-in duration-200 border-t border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase">
                  <th className="py-3 px-3">Fecha</th>
                  <th className="py-3 px-3">Documento / ID</th>
                  <th className="py-3 px-3">Medio de Pago</th>
                  <th className="py-3 px-3">Venta Bruta</th>
                  <th className="py-3 px-3">Comisión (MP)</th>
                  <th className="py-3 px-3">Abono Real (Neto)</th>
                  <th className="py-3 px-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {ventasMpAuto.map((v) => {
                  const montoBruto = Number(v.monto_bruto) || 0
                  const comision = Number(v.comision) || 0
                  const abonoNeto = montoBruto - comision
                  return (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 text-slate-600">{v.fecha}</td>
                      <td className="py-3 px-3 font-medium text-slate-800">{v.documento}</td>
                      <td className="py-3 px-3 text-slate-600">{v.medio_pago}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">${montoBruto.toLocaleString('es-CL')}</td>
                      <td className="py-3 px-3 text-rose-600 font-semibold">${comision.toLocaleString('es-CL')}</td>
                      <td className="py-3 px-3 text-emerald-600 font-bold">${abonoNeto.toLocaleString('es-CL')}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                          <CheckCircle size={12} /> Conciliado
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {ventasMpAuto.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400 text-sm">No hay transacciones automáticas registradas aún.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= SECCIÓN 1B: LIQUIDACIONES MANUALES ================= */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Ingreso Manual de Liquidación (Banco Chile / Santander / Otros)</h2>
            <p className="text-xs text-slate-500">Registra lotes y abonos de terminales físicas y otros pagos.</p>
          </div>
          
          <button
            onClick={() => setMostrarFormLiq(!mostrarFormLiq)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow transition"
          >
            <PlusCircle size={16} />
            <span>{mostrarFormLiq ? 'Ocultar Formulario' : '➕ Nueva Liquidación Manual'}</span>
            {mostrarFormLiq ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {mostrarFormLiq && (
          <form onSubmit={handleGuardarLiquidacion} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 animate-in fade-in duration-200">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Proveedor</label>
              <select value={proveedor} onChange={(e) => setProveedor(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                <option value="Banco de Chile">Banco de Chile</option>
                <option value="Santander">Santander</option>
                <option value="Transbank">Transbank</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo</label>
              <select value={tipoLiq} onChange={(e) => setTipoLiq(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                <option value="Débito">Débito</option>
                <option value="Crédito">Crédito</option>
                <option value="Transferencia">Transferencia</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Desde</label>
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Hasta</label>
              <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha de depósito</label>
              <input type="date" value={fechaDeposito} onChange={(e) => setFechaDeposito(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">N.º liquidación / Lote</label>
              <input type="text" placeholder="Ej. LOTE-401" value={nroLiquidacion} onChange={(e) => setNroLiquidacion(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Venta bruta ($)</label>
              <input type="number" placeholder="0" value={ventaBruta} onChange={(e) => setVentaBruta(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Otros descuentos ($)</label>
              <input type="number" placeholder="0" value={otrosDescuentos} onChange={(e) => setOtrosDescuentos(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Abono real recibido ($)</label>
              <input type="number" placeholder="0" value={abonoReal} onChange={(e) => setAbonoReal(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Cuenta receptora</label>
              <select value={cuentaReceptora} onChange={(e) => setCuentaReceptora(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                <option value="Banco de Chile">Banco de Chile</option>
                <option value="Santander">Santander</option>
                <option value="Caja / Efectivo">Caja / Efectivo</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Comprobante / Enlace</label>
              <input type="text" placeholder="URL o referencia" value={comprobanteLiq} onChange={(e) => setComprobanteLiq(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" />
            </div>
            <div className="md:col-span-4 flex justify-end pt-2">
              <button type="submit" disabled={loading} className="flex items-center gap-2 py-2 px-6 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-sm shadow transition disabled:opacity-50">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={18} />} Guardar liquidación manual
              </button>
            </div>
          </form>
        )}

        <div className="pt-2">
          <h3 className="text-md font-bold text-slate-900 mb-3">Liquidaciones manuales registradas</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase">
                  <th className="py-3 px-3">Depósito</th>
                  <th className="py-3 px-3">Proveedor</th>
                  <th className="py-3 px-3">Lote</th>
                  <th className="py-3 px-3">Venta Bruta</th>
                  <th className="py-3 px-3">Comisión (Real)</th>
                  <th className="py-3 px-3">Abono Real</th>
                  <th className="py-3 px-3">Cuenta</th>
                  <th className="py-3 px-3 text-center">Estado</th>
                  <th className="py-3 px-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {liquidaciones.map((l) => {
                  const comisionReal = Number(l.venta_bruta) - Number(l.otros_descuentos) - Number(l.abono_real)
                  return (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 text-slate-600">{l.fecha_deposito}</td>
                      <td className="py-3 px-3 font-medium text-slate-800">{l.proveedor} • {l.tipo}</td>
                      <td className="py-3 px-3 text-slate-600">{l.nro_liquidacion}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">${Number(l.venta_bruta).toLocaleString('es-CL')}</td>
                      <td className="py-3 px-3 text-rose-600 font-semibold">${comisionReal.toLocaleString('es-CL')}</td>
                      <td className="py-3 px-3 text-emerald-600 font-bold">${Number(l.abono_real).toLocaleString('es-CL')}</td>
                      <td className="py-3 px-3 text-slate-600">{l.cuenta_receptora}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                          <CheckCircle size={12} /> Conciliado
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button 
                          onClick={() => setItemAEliminar({ id: l.id, tipo: 'liq', titulo: `Liquidación de ${l.proveedor} (${l.fecha_deposito})` })} 
                          className="text-rose-500 hover:text-rose-700 p-1"
                          title="Eliminar liquidación"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {liquidaciones.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-slate-400 text-sm">No hay liquidaciones manuales registradas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ================= SECCIÓN 2: PROPINAS MENSUALES DE GARZONES CON EDICIÓN ================= */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Propinas Mensuales de Garzones (Fudo)</h2>
            <p className="text-xs text-slate-500">Asigna el total de propina mensual por garzón y controla su entrega adjuntando el comprobante.</p>
          </div>
          
          <button
            onClick={() => {
              if (mostrarFormPropina) limpiarFormPropina()
              setMostrarFormPropina(!mostrarFormPropina)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow transition"
          >
            <PlusCircle size={16} />
            <span>{mostrarFormPropina ? 'Ocultar Formulario' : '➕ Nueva Propina Garzón'}</span>
            {mostrarFormPropina ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {mostrarFormPropina && (
          <form onSubmit={handleGuardarPropina} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 animate-in fade-in duration-200">
            <div className="md:col-span-4 flex justify-between items-center bg-amber-100/60 px-4 py-2 rounded-xl border border-amber-200">
              <span className="text-xs font-bold text-amber-900">
                {modoEdicionPropina ? `✏️ Editando registro de: ${nombreGarzon}` : '✨ Registrando nueva propina de garzón'}
              </span>
              {modoEdicionPropina && (
                <button type="button" onClick={limpiarFormPropina} className="text-xs text-rose-600 font-bold hover:underline">
                  Cancelar edición ✕
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Periodo (Mes / Año)</label>
              <input type="month" value={mesCobro} onChange={(e) => setMesCobro(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre del garzón</label>
              <input type="text" placeholder="Ej. Diego" value={nombreGarzon} onChange={(e) => setNombreGarzon(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Medio de pago Fudo</label>
              <select value={medioPagoProp} onChange={(e) => setMedioPagoProp(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                <option value="Efectivo">Efectivo</option>
                <option value="Débito / Tarjeta">Débito / Tarjeta</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Propina cobrada Fudo ($)</label>
              <input type="number" placeholder="0" value={propinaCobrada} onChange={(e) => setPropinaCobrada(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Monto entregado ($)</label>
              <input type="number" placeholder="0" value={montoEntregado} onChange={(e) => setMontoEntregado(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha de entrega</label>
              <input type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Cuenta de pago</label>
              <select value={cuentaPagoProp} onChange={(e) => setCuentaPagoProp(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                <option value="Caja / Efectivo">Caja / Efectivo</option>
                <option value="Banco de Chile">Banco de Chile</option>
                <option value="Santander">Santander</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Comprobante (Archivo opcional)</label>
              <input 
                type="file" 
                accept="image/*,application/pdf"
                onChange={(e) => setArchivoComprobante(e.target.files?.[0] || null)} 
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100" 
              />
            </div>
            <div className="md:col-span-4 flex justify-end pt-2">
              <button type="submit" disabled={loading} className="flex items-center gap-2 py-2 px-6 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-sm shadow transition disabled:opacity-50">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={18} />} 
                {modoEdicionPropina ? 'Actualizar propina mensual' : 'Guardar propina mensual'}
              </button>
            </div>
          </form>
        )}

        <div className="pt-2">
          <h3 className="text-md font-bold text-slate-900 mb-3">Control de propinas mensuales</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase">
                  <th className="py-3 px-3">Periodo</th>
                  <th className="py-3 px-3">Garzón</th>
                  <th className="py-3 px-3">Medio</th>
                  <th className="py-3 px-3">Propina Fudo</th>
                  <th className="py-3 px-3">Entregado</th>
                  <th className="py-3 px-3">Pendiente</th>
                  <th className="py-3 px-3">Comprobante</th>
                  <th className="py-3 px-3 text-center">Estado</th>
                  <th className="py-3 px-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {propinas.map((p) => {
                  const propinaTotal = Number(p.propina_cobrada || 0)
                  const entregado = Number(p.monto_entregado || 0)
                  const pendiente = propinaTotal - entregado
                  const pagada = pendiente <= 0
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-medium text-slate-800">{p.mes_cobro}</td>
                      <td className="py-3 px-3 text-slate-700">{p.nombre_garzon}</td>
                      <td className="py-3 px-3 text-slate-600">{p.medio_pago}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">${propinaTotal.toLocaleString('es-CL')}</td>
                      <td className="py-3 px-3 text-emerald-600 tabular-nums">${entregado.toLocaleString('es-CL')}</td>
                      <td className="py-3 px-3 font-bold text-amber-700 tabular-nums">${pendiente.toLocaleString('es-CL')}</td>
                      <td className="py-3 px-3 text-xs">
                        {p.comprobante ? (
                          <a href={p.comprobante} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-800 font-semibold underline">
                            Ver archivo
                          </a>
                        ) : (
                          <span className="text-slate-400">Sin archivo</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${pagada ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {pagada ? <CheckCircle size={12} /> : <Clock size={12} />} {pagada ? 'Pagada' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center flex items-center justify-center gap-2">
                        <button 
                          onClick={() => prepararEdicionPropina(p)} 
                          className="text-amber-600 hover:text-amber-800 p-1"
                          title="Editar propina"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => setItemAEliminar({ id: p.id, tipo: 'prop', titulo: `Propina de ${p.nombre_garzon} (${p.mes_cobro})` })} 
                          className="text-rose-500 hover:text-rose-700 p-1"
                          title="Eliminar propina"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {propinas.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-slate-400 text-sm">No hay registros de propinas mensuales.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}