import {
  Building2,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  Edit2,
  ExternalLink,
  FileSearch,
  FileImage,
  LoaderCircle,
  Plus,
  Search,
  Upload,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { importIngresosCsv } from '../services/importIngresosCsv.ts'
import { getEmpresaContratos, uploadEmpresaContrato, type EmpresaContrato } from '../services/empresaContratos'
import {
  deleteVoucher,
  deleteVoucherByPublicUrl,
  empresaService,
  getSignedContractUrl,
  getSignedVoucherUrl,
  uploadVoucher,
} from '../services/supabaseStorage.ts'

type FrecuenciaPago = 'Mensual' | 'Trimestral' | 'Semestral' | 'Anual'

interface Pago {
  id?: string | number
  fecha_pago?: string
  forma_pago?: string
  bruto?: number
  neto?: number
  iva?: number
  monto_liquido?: number | null
  comision_tarjeta?: number | null
  proximo_pago?: string
  voucher_url?: string | null
}

type CsvExportOption = 'completo' | 'empresas' | 'pagos'

interface Empresa {
  id?: string | number
  rut: string
  nombre: string
  direccion: string
  representante_legal: string
  rut_representante: string
  contacto: string
  frecuencia: FrecuenciaPago | string
  estado: string | boolean | null
  contrato_url?: string | null
  pagos?: Pago[]
}

interface EmpresaFormData {
  rut: string
  nombre: string
  direccion: string
  representante_legal: string
  rut_representante: string
  contacto: string
  frecuencia: FrecuenciaPago
  estado: string
}

interface PagoFormData {
  fecha_pago: string
  forma_pago: string
  bruto: string
  monto_liquido: string
  proximo_pago: string
}

interface PagoEditFormData {
  fecha_pago: string
  forma_pago: string
  bruto: string
  monto_liquido: string
}

const FRECUENCIAS: FrecuenciaPago[] = ['Mensual', 'Trimestral', 'Semestral', 'Anual']

const EMPTY_EMPRESA: EmpresaFormData = {
  rut: '',
  nombre: '',
  direccion: '',
  representante_legal: '',
  rut_representante: '',
  contacto: '',
  frecuencia: 'Mensual',
  estado: 'VIGENTE',
}

const EMPTY_PAGO: PagoFormData = {
  fecha_pago: new Date().toISOString().slice(0, 10),
  forma_pago: 'Transferencia',
  bruto: '',
  monto_liquido: '',
  proximo_pago: '',
}

function formatDate(value?: string): string {
  if (!value) return '—'
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function getNextPaymentDate(frequency: string, startDate: string): string {
  if (!startDate) return ''
  const [year, month, day] = startDate.split('-').map(Number)
  if (!year || !month || !day) return ''

  const normalizedFrequency = frequency.trim().toLocaleLowerCase('es-CL')
  if (normalizedFrequency === 'mensual') {
    return new Date(Date.UTC(year, month, 5)).toISOString().slice(0, 10)
  }
  if (normalizedFrequency === 'anual') {
    const nextYear = year + 1
    const lastDayOfMonth = new Date(Date.UTC(nextYear, month, 0)).getUTCDate()
    return new Date(Date.UTC(nextYear, month - 1, Math.min(day, lastDayOfMonth))).toISOString().slice(0, 10)
  }
  return ''
}

function getLatestNextPayment(payments: Pago[] = []): string | undefined {
  return payments
    .filter((payment) => Boolean(payment.proximo_pago))
    .sort((first, second) => (second.fecha_pago ?? '').localeCompare(first.fecha_pago ?? ''))[0]
    ?.proximo_pago
}

function getPaymentDueStatus(nextPaymentDate?: string): {
  color: 'green' | 'yellow' | 'red' | 'neutral'
  label: string
} {
  if (!nextPaymentDate) return { color: 'neutral', label: 'Sin fecha' }

  const [year, month, day] = nextPaymentDate.slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return { color: 'neutral', label: 'Sin fecha' }

  const today = new Date()
  const todayTimestamp = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const dueTimestamp = Date.UTC(year, month - 1, day)
  const daysUntilDue = Math.round((dueTimestamp - todayTimestamp) / 86_400_000)

  if (daysUntilDue < 0) {
    const overdueDays = Math.abs(daysUntilDue)
    return { color: 'red', label: `Atrasado por ${overdueDays} ${overdueDays === 1 ? 'día' : 'días'}` }
  }
  if (daysUntilDue <= 5) {
    if (daysUntilDue === 0) return { color: 'yellow', label: 'Vence hoy' }
    return { color: 'yellow', label: `Por vencer en ${daysUntilDue} ${daysUntilDue === 1 ? 'día' : 'días'}` }
  }
  return { color: 'green', label: `Al día · ${formatDate(nextPaymentDate)}` }
}

function formatExactDate(value: string): string {
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value))
}

function formatMoney(value?: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 2,
  }).format(value)
}

function isVigente(estado: Empresa['estado']): boolean {
  if (estado === null || estado === undefined || estado === '') return true
  if (typeof estado === 'boolean') return estado
  const value = estado?.trim().toLocaleLowerCase('es-CL') ?? ''
  return ['vigente', 'activo', 'activa', 'true', 'al día', 'al dia'].includes(value)
}

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const csv = `\uFEFF${[headers, ...rows]
    .map((row) => row.map((value) => escapeCsv(String(value ?? ''))).join(';'))
    .join('\r\n')}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function TextField({
  id,
  label,
  value,
  onChange,
  required = true,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
      />
    </div>
  )
}

export default function Empresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingEmpresa, setIsSavingEmpresa] = useState(false)
  const [isSavingPago, setIsSavingPago] = useState(false)
  const [isImportingCsv, setIsImportingCsv] = useState(false)
  const importCsvInputRef = useRef<HTMLInputElement>(null)
  const voucherInputRef = useRef<HTMLInputElement>(null)
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [isEmpresaModalOpen, setIsEmpresaModalOpen] = useState(false)
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null)
  const [empresaForm, setEmpresaForm] = useState<EmpresaFormData>(EMPTY_EMPRESA)
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [contractHistory, setContractHistory] = useState<EmpresaContrato[]>([])
  const [isLoadingContractHistory, setIsLoadingContractHistory] = useState(false)
  const contractInputRef = useRef<HTMLInputElement>(null)
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null)
  const [editingPago, setEditingPago] = useState<Pago | null>(null)
  const [pagoEditForm, setPagoEditForm] = useState<PagoEditFormData>({ fecha_pago: '', forma_pago: 'Transferencia', bruto: '', monto_liquido: '' })
  const [voucherEditFile, setVoucherEditFile] = useState<File | null>(null)
  const voucherEditInputRef = useRef<HTMLInputElement>(null)
  const [pagoForm, setPagoForm] = useState<PagoFormData>(EMPTY_PAGO)
  const [voucherFile, setVoucherFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadEmpresas = useCallback(async () => {
    try {
      const data = await empresaService.getEmpresas()
      setEmpresas(data as Empresa[])
    } catch (loadError) {
      console.error('No se pudieron cargar las empresas:', loadError)
      setError('No fue posible cargar las empresas. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    empresaService.getEmpresas()
      .then((data) => {
        if (isMounted) setEmpresas(data as Empresa[])
      })
      .catch((loadError: unknown) => {
        console.error('No se pudieron cargar las empresas:', loadError)
        if (isMounted) setError('No fue posible cargar las empresas. Intenta nuevamente.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const companyId = editingEmpresa?.id
    if (companyId === undefined) return

    let active = true
    getEmpresaContratos(companyId)
      .then((history) => { if (active) setContractHistory(history) })
      .catch((historyError: unknown) => {
        if (active) setError(historyError instanceof Error ? historyError.message : 'No se pudo cargar el historial de contratos.')
      })
      .finally(() => { if (active) setIsLoadingContractHistory(false) })
    return () => { active = false }
  }, [editingEmpresa?.id])

  const filteredEmpresas = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es-CL')
    if (!query) return empresas
    return empresas.filter((empresa) =>
      [
        empresa.rut,
        empresa.nombre,
        empresa.direccion,
        empresa.representante_legal,
        empresa.rut_representante,
        empresa.contacto,
        empresa.frecuencia,
        String(empresa.estado ?? ''),
      ]
        .join(' ')
        .toLocaleLowerCase('es-CL')
        .includes(query),
    )
  }, [empresas, search])

  function handleExportCsv(option: CsvExportOption) {
    const date = new Date().toISOString().slice(0, 10)
    const companyHeaders = [
      'Empresa',
      'RUT',
      'Dirección',
      'Representante Legal',
      'RUT Representante',
      'Contacto',
      'Frecuencia de pago',
      'Estado',
    ]
    const paymentHeaders = [
      'ID pago',
      'Empresa',
      'RUT empresa',
      'Fecha de pago',
      'Forma de pago',
      'Bruto',
      'Neto',
      'IVA',
      'Próximo pago',
    ]
    const companyRow = (empresa: Empresa) => [
      empresa.nombre,
      empresa.rut,
      empresa.direccion,
      empresa.representante_legal,
      empresa.rut_representante,
      empresa.contacto,
      (empresa.frecuencia ?? '').toLocaleUpperCase('es-CL'),
      isVigente(empresa.estado) ? 'VIGENTE' : 'NO VIGENTE',
    ]
    const payments = empresas.flatMap((empresa) =>
      (empresa.pagos ?? []).map((pago) => ({ empresa, pago })),
    )

    if (option === 'empresas') {
      downloadCsv(`empresas_${date}.csv`, companyHeaders, empresas.map(companyRow))
    } else if (option === 'pagos') {
      downloadCsv(
        `pagos_${date}.csv`,
        paymentHeaders,
        payments.map(({ empresa, pago }) => [
          pago.id,
          empresa.nombre,
          empresa.rut,
          pago.fecha_pago,
          pago.forma_pago,
          pago.bruto,
          pago.neto,
          pago.iva,
          pago.proximo_pago,
        ]),
      )
    } else {
      const fullHeaders = [...companyHeaders, ...paymentHeaders]
      const fullRows = empresas.flatMap((empresa) => {
        const company = companyRow(empresa)
        const companyPayments = empresa.pagos ?? []
        if (companyPayments.length === 0) return [[...company, '', '', '', '', '', '', '', '', '']]

        return companyPayments.map((pago) => [
          ...company,
          pago.id,
          empresa.nombre,
          empresa.rut,
          pago.fecha_pago,
          pago.forma_pago,
          pago.bruto,
          pago.neto,
          pago.iva,
          pago.proximo_pago,
        ])
      })
      downloadCsv(`reporte_empresas_pagos_${date}.csv`, fullHeaders, fullRows)
    }

    setIsExportMenuOpen(false)
  }

  function openCreateEmpresa() {
    setEditingEmpresa(null)
    setContractHistory([])
    setIsLoadingContractHistory(false)
    setEmpresaForm(EMPTY_EMPRESA)
    setContractFile(null)
    if (contractInputRef.current) contractInputRef.current.value = ''
    setError('')
    setIsEmpresaModalOpen(true)
  }

  function openEditEmpresa(empresa: Empresa) {
    setEditingEmpresa(empresa)
    setContractHistory([])
    setIsLoadingContractHistory(true)
    setContractFile(null)
    if (contractInputRef.current) contractInputRef.current.value = ''
    setEmpresaForm({
      rut: empresa.rut,
      nombre: empresa.nombre,
      direccion: empresa.direccion,
      representante_legal: empresa.representante_legal,
      rut_representante: empresa.rut_representante,
      contacto: empresa.contacto,
      frecuencia: FRECUENCIAS.find((frecuencia) => frecuencia.toLocaleLowerCase('es-CL') === empresa.frecuencia.toLocaleLowerCase('es-CL')) ?? 'Mensual',
      estado: isVigente(empresa.estado) ? 'VIGENTE' : 'NO VIGENTE',
    })
    setError('')
    setIsEmpresaModalOpen(true)
  }

  async function handleSaveEmpresa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setIsSavingEmpresa(true)
    let persistedCompany: Empresa | null = null
    try {
      const hasValidRut = Boolean(empresaForm.rut.trim())
      if (!editingEmpresa && !hasValidRut) throw new Error('Ingresa el RUT antes de adjuntar el contrato.')

      const empresaData = {
        nombre: empresaForm.nombre.trim(),
        rut: empresaForm.rut.trim(),
        direccion: empresaForm.direccion.trim(),
        representante_legal: empresaForm.representante_legal.trim(),
        rut_representante: empresaForm.rut_representante.trim(),
        contacto: empresaForm.contacto.trim(),
        frecuencia: empresaForm.frecuencia,
        estado: empresaForm.estado,
        contrato_url: editingEmpresa?.contrato_url ?? null,
      }
      const isEditing = editingEmpresa !== null
      let createdCompany: Empresa | null = null
      if (editingEmpresa?.id === undefined) {
        const createdRows = await empresaService.createEmpresa(empresaData)
        createdCompany = (createdRows?.[0] as Empresa | undefined) ?? null
        if (!createdCompany) throw new Error('La empresa se guardó, pero no se pudo recuperar su registro.')
        persistedCompany = createdCompany
      } else {
        persistedCompany = await empresaService.updateEmpresa(editingEmpresa.id, empresaData) as Empresa
      }

      if (contractFile) {
        if (persistedCompany.id === undefined) throw new Error('No se pudo identificar la empresa para guardar su contrato.')
        const historyEntry = await uploadEmpresaContrato(
          persistedCompany.id,
          contractFile,
          persistedCompany.contrato_url ?? null,
        )
        persistedCompany = { ...persistedCompany, contrato_url: historyEntry.contrato_url }
        setContractHistory((current) => [historyEntry, ...current])
      }
      setEmpresaForm(EMPTY_EMPRESA)
      setEditingEmpresa(null)
      setContractFile(null)
      if (contractInputRef.current) contractInputRef.current.value = ''
      setIsEmpresaModalOpen(false)
      setSuccess(isEditing ? 'Empresa actualizada correctamente.' : 'Empresa registrada correctamente.')
      if (!isEditing && createdCompany?.id !== undefined) {
        setPagoForm({
          ...EMPTY_PAGO,
          proximo_pago: getNextPaymentDate(createdCompany.frecuencia, EMPTY_PAGO.fecha_pago),
        })
        setSelectedEmpresa({ ...persistedCompany, id: createdCompany.id, pagos: [] })
        setSuccess('Empresa registrada. Registra ahora el pago inicial o la mensualidad.')
      }
      await loadEmpresas()
    } catch (createError) {
      if (persistedCompany && !editingEmpresa) setEditingEmpresa(persistedCompany)
      console.error('No se pudo registrar la empresa:', createError)
      setError(createError instanceof Error ? createError.message : 'No fue posible registrar la empresa.')
    } finally {
      setIsSavingEmpresa(false)
    }
  }

  async function handleImportCsv(file: File) {
    setError('')
    setSuccess('')
    setIsImportingCsv(true)
    try {
      const result = await importIngresosCsv(file)
      await loadEmpresas()

      const summary = `Importación finalizada: ${result.importedPayments} de ${result.totalRows} registros procesados con éxito; ${result.createdCompanies} empresas nuevas y ${result.existingCompanies} ya existentes.`
      if (result.errors.length > 0) {
        const details = result.errors
          .slice(0, 3)
          .map((rowError) => `Fila ${rowError.row}: ${rowError.message}`)
          .join(' ')
        setError(`${summary} ${result.errors.length} filas con errores. ${details}`)
      } else {
        setSuccess(summary)
      }
    } catch (importError) {
      console.error('No se pudo importar el historial CSV:', importError)
      setError(importError instanceof Error ? importError.message : 'No fue posible importar el archivo CSV.')
    } finally {
      setIsImportingCsv(false)
      if (importCsvInputRef.current) importCsvInputRef.current.value = ''
    }
  }

  async function handleCreatePago(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedEmpresa) return
    const montoLiquido = pagoForm.monto_liquido.trim() === '' ? bruto : Number(pagoForm.monto_liquido)
    if (!Number.isFinite(montoLiquido) || montoLiquido < 0 || montoLiquido > bruto) {
      setError('El monto líquido debe ser igual o menor al monto bruto.')
      return
    }
    const comisionTarjeta = Math.round((bruto - montoLiquido) * 100) / 100
    setError('')
    setSuccess('')
    setIsSavingPago(true)
    let uploadedVoucherPath: string | null = null
    try {
      const empresaId = selectedEmpresa.id ?? selectedEmpresa.rut
      let voucherUrl: string | null = null
      if (voucherFile) {
        const uploadedVoucher = await uploadVoucher(voucherFile, empresaId)
        voucherUrl = uploadedVoucher.url
        uploadedVoucherPath = uploadedVoucher.path
      }
      await empresaService.createPago({
        empresa_id: String(empresaId),
        fecha_pago: pagoForm.fecha_pago,
        forma_pago: pagoForm.forma_pago,
        bruto,
        neto: netoCalculado,
        iva: ivaCalculado,
        monto_liquido: montoLiquido,
        comision_tarjeta: comisionTarjeta,
        proximo_pago: pagoForm.proximo_pago,
        voucher_url: voucherUrl,
      })
      setPagoForm(EMPTY_PAGO)
      setVoucherFile(null)
      if (voucherInputRef.current) voucherInputRef.current.value = ''
      setSuccess(`Pago registrado para ${selectedEmpresa.nombre}.`)
      await loadEmpresas()
      const refreshedCompanies = await empresaService.getEmpresas() as Empresa[]
      const refreshedSelected = refreshedCompanies.find((empresa) => empresa.rut === selectedEmpresa.rut)
      if (refreshedSelected) setSelectedEmpresa(refreshedSelected)
      else setSelectedEmpresa({ ...selectedEmpresa, pagos: [...(selectedEmpresa.pagos ?? []), { ...pagoForm, bruto, neto: netoCalculado, iva: ivaCalculado, monto_liquido: montoLiquido, comision_tarjeta: comisionTarjeta }] })
    } catch (paymentError) {
      if (uploadedVoucherPath) await deleteVoucher(uploadedVoucherPath)
      console.error('No se pudo registrar el pago:', paymentError)
      setError(paymentError instanceof Error ? paymentError.message : 'No fue posible registrar el pago.')
    } finally {
      setIsSavingPago(false)
    }
  }

  function openEditPago(pago: Pago) {
    if (pago.id === undefined) {
      setError('No se puede editar este pago porque no tiene un ID válido.')
      return
    }
    setEditingPago(pago)
    setPagoEditForm({
      fecha_pago: pago.fecha_pago?.slice(0, 10) ?? '',
      forma_pago: pago.forma_pago ?? 'Transferencia',
      bruto: String(pago.bruto ?? ''),
      monto_liquido: pago.monto_liquido === null || pago.monto_liquido === undefined
        ? String(pago.bruto ?? '')
        : String(pago.monto_liquido),
    })
    setVoucherEditFile(null)
    setError('')
  }

  async function handleUpdatePago(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (editingPago?.id === undefined) return
    const brutoEditado = Number(pagoEditForm.bruto)
    if (!Number.isFinite(brutoEditado) || brutoEditado < 0) {
      setError('Ingresa un monto bruto válido.')
      return
    }

    const montoLiquidoEditado = pagoEditForm.monto_liquido.trim() === ''
      ? brutoEditado
      : Number(pagoEditForm.monto_liquido)
    if (!Number.isFinite(montoLiquidoEditado) || montoLiquidoEditado < 0 || montoLiquidoEditado > brutoEditado) {
      setError('El monto líquido debe ser igual o menor al monto bruto.')
      return
    }
    const comisionTarjetaEditada = Math.round((brutoEditado - montoLiquidoEditado) * 100) / 100

    const netoEditado = Math.round((brutoEditado / 1.19) * 100) / 100
    const ivaEditado = Math.round((brutoEditado - netoEditado) * 100) / 100
    setIsSavingPago(true)
    setError('')
    setSuccess('')
    let uploadedVoucherPath: string | null = null
    try {
      let voucherUrl = editingPago.voucher_url ?? null
      if (voucherEditFile) {
        const companyId = selectedEmpresa?.id ?? selectedEmpresa?.rut ?? 'empresa'
        const uploadedVoucher = await uploadVoucher(voucherEditFile, companyId)
        voucherUrl = uploadedVoucher.url
        uploadedVoucherPath = uploadedVoucher.path
      }

      await empresaService.updatePago(editingPago.id, {
        fecha_pago: pagoEditForm.fecha_pago,
        forma_pago: pagoEditForm.forma_pago,
        bruto: brutoEditado,
        neto: netoEditado,
        iva: ivaEditado,
        monto_liquido: montoLiquidoEditado,
        comision_tarjeta: comisionTarjetaEditada,
        voucher_url: voucherUrl,
      })
      if (voucherEditFile && editingPago.voucher_url) {
        await deleteVoucherByPublicUrl(editingPago.voucher_url)
      }
      const updatedPayments = (selectedEmpresa?.pagos ?? []).map((pago) =>
        pago.id === editingPago.id
          ? { ...pago, fecha_pago: pagoEditForm.fecha_pago, forma_pago: pagoEditForm.forma_pago, bruto: brutoEditado, neto: netoEditado, iva: ivaEditado, monto_liquido: montoLiquidoEditado, comision_tarjeta: comisionTarjetaEditada, voucher_url: voucherUrl }
          : pago,
      )
      if (selectedEmpresa) setSelectedEmpresa({ ...selectedEmpresa, pagos: updatedPayments })
      setEditingPago(null)
      setVoucherEditFile(null)
      if (voucherEditInputRef.current) voucherEditInputRef.current.value = ''
      setSuccess('Pago actualizado correctamente.')
      await loadEmpresas()
    } catch (updateError) {
      if (uploadedVoucherPath) await deleteVoucher(uploadedVoucherPath)
      console.error('No se pudo actualizar el pago:', updateError)
      setError(updateError instanceof Error ? updateError.message : 'No fue posible actualizar el pago.')
    } finally {
      setIsSavingPago(false)
    }
  }

  const updateEmpresaField = (field: keyof EmpresaFormData, value: string) => {
    setEmpresaForm((current) => ({ ...current, [field]: value }))
  }

  const updatePagoField = (field: keyof PagoFormData, value: string) => {
    setPagoForm((current) => {
      const updatedForm = { ...current, [field]: value }
      if (field === 'fecha_pago' && selectedEmpresa) {
        updatedForm.proximo_pago = getNextPaymentDate(selectedEmpresa.frecuencia, value)
      }
      return updatedForm
    })
  }

  async function openPrivateFile(reference: string, getSignedUrl: (value: string) => Promise<string>) {
    setError('')
    const previewWindow = window.open('about:blank', '_blank')
    if (previewWindow) previewWindow.opener = null
    try {
      const signedUrl = await getSignedUrl(reference)
      if (previewWindow) previewWindow.location.replace(signedUrl)
      else window.location.assign(signedUrl)
    } catch (fileError) {
      previewWindow?.close()
      console.error('No se pudo abrir el archivo privado:', fileError)
      setError(fileError instanceof Error ? fileError.message : 'No se pudo abrir el archivo.')
    }
  }

  async function downloadContractFile(contract: EmpresaContrato) {
    try {
      const signedUrl = await getSignedContractUrl(contract.contrato_url)
      const response = await fetch(signedUrl)
      if (!response.ok) throw new Error('No se pudo descargar el contrato.')
      const fileUrl = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = fileUrl
      link.download = contract.nombre_archivo
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 0)
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'No se pudo descargar el contrato.')
    }
  }

  const bruto = Number(pagoForm.bruto) || 0
  const netoCalculado = Math.round((bruto / 1.19) * 100) / 100
  const ivaCalculado = Math.round((bruto - netoCalculado) * 100) / 100
  const montoLiquidoForm = pagoForm.monto_liquido.trim() === '' ? bruto : Number(pagoForm.monto_liquido) || 0
  const comisionTarjetaForm = Math.max(0, Math.round((bruto - montoLiquidoForm) * 100) / 100)
  const brutoEditadoPreview = Number(pagoEditForm.bruto) || 0
  const montoLiquidoEditPreview = pagoEditForm.monto_liquido.trim() === '' ? brutoEditadoPreview : Number(pagoEditForm.monto_liquido) || 0
  const comisionTarjetaEditPreview = Math.max(0, Math.round((brutoEditadoPreview - montoLiquidoEditPreview) * 100) / 100)

  function handleEmpresaPagoChange(rut: string) {
    const empresa = empresas.find((item) => item.rut === rut)
    if (empresa) {
      setSelectedEmpresa(empresa)
      setPagoForm((current) => ({
        ...current,
        proximo_pago: getNextPaymentDate(empresa.frecuencia, current.fecha_pago),
      }))
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold text-primary-600">Administración comercial</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Empresas</h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Centraliza los datos de tus empresas y consulta su control de pagos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          <input
            ref={importCsvInputRef}
            type="file"
            accept=".csv,text/csv"
            aria-label="Seleccionar historial CSV"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleImportCsv(file)
            }}
          />
          <button
            type="button"
            onClick={() => importCsvInputRef.current?.click()}
            disabled={isImportingCsv || isLoading}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
          >
            {isImportingCsv ? <LoaderCircle size={17} className="animate-spin" /> : <Upload size={17} />}
            {isImportingCsv ? 'Importando...' : 'Importar Historial CSV'}
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportMenuOpen((open) => !open)}
              disabled={isLoading || empresas.length === 0}
              aria-haspopup="menu"
              aria-expanded={isExportMenuOpen}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={17} />
              Exportar
            </button>
            {isExportMenuOpen && (
              <div role="menu" aria-label="Opciones de exportación" className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleExportCsv('completo')}
                  className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-primary-50 focus:bg-primary-50 focus:outline-none"
                >
                  <FileSearch size={18} className="mt-0.5 shrink-0 text-primary-600" />
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">Reporte Completo (Empresas y Pagos)</span>
                    <span className="mt-0.5 block text-xs text-slate-500">Une datos de empresas con sus transacciones</span>
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleExportCsv('empresas')}
                  className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-primary-50 focus:bg-primary-50 focus:outline-none"
                >
                  <Building2 size={18} className="mt-0.5 shrink-0 text-primary-600" />
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">Solo Empresas</span>
                    <span className="mt-0.5 block text-xs text-slate-500">Directorio, datos de contacto y estado</span>
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleExportCsv('pagos')}
                  className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-primary-50 focus:bg-primary-50 focus:outline-none"
                >
                  <CreditCard size={18} className="mt-0.5 shrink-0 text-primary-600" />
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">Solo Pagos</span>
                    <span className="mt-0.5 block text-xs text-slate-500">Historial de transacciones, montos y fechas</span>
                  </span>
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={openCreateEmpresa}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white shadow-sm shadow-primary-600/20 transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <Plus size={18} />
            Ingreso Nuevo
          </button>
        </div>
      </section>

      {(error || success) && (
        <div
          role={error ? 'alert' : 'status'}
          className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}
        >
          <span>{error || success}</span>
          {error && (
            <button
              type="button"
              onClick={() => {
                setError('')
                void loadEmpresas()
              }}
              className="shrink-0 font-semibold underline"
            >
              Reintentar
            </button>
          )}
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.02]">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:px-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Directorio de empresas</h2>
            <p className="mt-1 text-sm text-slate-500">{empresas.length} empresas registradas</p>
          </div>
          <label className="relative block min-w-0 flex-1 sm:ml-auto sm:max-w-sm">
            <Search size={17} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre, RUT o representante..."
              aria-label="Buscar empresas"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </label>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-slate-500">
            <LoaderCircle size={18} className="animate-spin text-primary-600" />
            Cargando empresas...
          </div>
        ) : filteredEmpresas.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1300px] text-left">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-5 py-3 sm:px-6">Empresa / RUT</th>
                  <th scope="col" className="px-4 py-3">Dirección</th>
                  <th scope="col" className="px-4 py-3">Representante legal / RUT</th>
                  <th scope="col" className="px-4 py-3">Contacto</th>
                  <th scope="col" className="px-4 py-3">Frecuencia</th>
                  <th scope="col" className="px-4 py-3">Próximo pago</th>
                  <th scope="col" className="px-4 py-3">Vigencia</th>
                  <th scope="col" className="px-5 py-3 text-right sm:px-6">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmpresas.map((empresa) => {
                  const vigente = isVigente(empresa.estado)
                  const nextPaymentDate = getLatestNextPayment(empresa.pagos)
                  const paymentDueStatus = getPaymentDueStatus(nextPaymentDate)
                  const dueStatusClasses = {
                    green: 'bg-emerald-50 text-emerald-700',
                    yellow: 'bg-amber-50 text-amber-700',
                    red: 'bg-rose-50 text-rose-700',
                    neutral: 'bg-slate-100 text-slate-500',
                  }[paymentDueStatus.color]
                  const dueDotClasses = {
                    green: 'bg-emerald-500',
                    yellow: 'bg-amber-500',
                    red: 'bg-rose-500',
                    neutral: 'bg-slate-400',
                  }[paymentDueStatus.color]
                  return (
                    <tr key={String(empresa.id ?? empresa.rut)} className="transition-colors hover:bg-slate-50/70">
                      <td className="px-5 py-4 sm:px-6">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                            <Building2 size={19} />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-800">{empresa.nombre}</span>
                            <span className="mt-0.5 block text-xs text-slate-500">RUT {empresa.rut}</span>
                          </span>
                        </div>
                      </td>
                      <td className="max-w-56 px-4 py-4 text-sm text-slate-600">{empresa.direccion}</td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-medium text-slate-700">{empresa.representante_legal}</p>
                        <p className="mt-0.5 text-xs text-slate-500">RUT {empresa.rut_representante}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{empresa.contacto}</td>
                      <td className="px-4 py-4">
                        <span className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {empresa.frecuencia ? empresa.frecuencia.toLocaleUpperCase('es-CL') : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${dueStatusClasses}`}>
                          <span className={`size-1.5 rounded-full ${dueDotClasses}`} />
                          {paymentDueStatus.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${vigente ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          <span className={`size-1.5 rounded-full ${vigente ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {vigente ? 'VIGENTE' : 'NO VIGENTE'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right sm:px-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditEmpresa(empresa)}
                            className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                            aria-label={`Editar ${empresa.nombre}`}
                            title="Editar empresa"
                          >
                            <Edit2 size={16} />
                          </button>
                          {empresa.contrato_url ? (
                            <button
                              type="button"
                              onClick={() => void openPrivateFile(empresa.contrato_url!, getSignedContractUrl)}
                              className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                              aria-label={`Ver contrato de ${empresa.nombre}`}
                              title="Ver contrato"
                            >
                              <ExternalLink size={14} />
                              Contrato
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-100 px-2.5 text-xs font-medium text-slate-400"
                              title="Esta empresa no tiene contrato adjunto"
                            >
                              <ExternalLink size={14} />
                              Sin contrato
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEmpresa(empresa)
                              setPagoForm({
                                ...EMPTY_PAGO,
                                proximo_pago: getNextPaymentDate(empresa.frecuencia, EMPTY_PAGO.fecha_pago),
                              })
                              setError('')
                            }}
                            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-primary-200 px-3 py-2 text-xs font-semibold text-primary-700 transition hover:border-primary-300 hover:bg-primary-50"
                          >
                            <CreditCard size={15} />
                            Ver / registrar pagos
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <FileSearch size={22} />
            </div>
            <h2 className="mt-4 text-sm font-semibold text-slate-800">No encontramos empresas</h2>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              {search ? 'Prueba con otro nombre, RUT o representante.' : 'Registra una empresa para comenzar a organizar sus pagos.'}
            </p>
          </div>
        )}
      </section>

      {isEmpresaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/45 p-4 backdrop-blur-[2px]">
          <section role="dialog" aria-modal="true" aria-labelledby="new-company-title" className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-950/20">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5 sm:px-7">
              <div>
                <h2 id="new-company-title" className="text-lg font-semibold text-slate-900">{editingEmpresa ? 'Editar empresa' : 'Ingreso Nuevo'}</h2>
                <p className="mt-1 text-sm text-slate-500">{editingEmpresa ? 'Actualiza los datos de la empresa.' : 'Completa los datos de la empresa y su representante legal.'}</p>
              </div>
              <button type="button" onClick={() => setIsEmpresaModalOpen(false)} disabled={isSavingEmpresa} aria-label="Cerrar ventana" className="flex size-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50">
                <X size={19} />
              </button>
            </div>
            <form onSubmit={handleSaveEmpresa} className="space-y-5 px-6 py-6 sm:px-7">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField id="empresa-rut" label="RUT de la empresa" value={empresaForm.rut} onChange={(value) => updateEmpresaField('rut', value)} placeholder="76.123.456-7" />
                <TextField id="empresa-nombre" label="Nombre / razón social" value={empresaForm.nombre} onChange={(value) => updateEmpresaField('nombre', value)} />
                <div className="sm:col-span-2">
                  <TextField id="empresa-direccion" label="Dirección" value={empresaForm.direccion} onChange={(value) => updateEmpresaField('direccion', value)} />
                </div>
                <TextField id="empresa-representante" label="Representante legal" value={empresaForm.representante_legal} onChange={(value) => updateEmpresaField('representante_legal', value)} />
                <TextField id="empresa-rut-representante" label="RUT del representante" value={empresaForm.rut_representante} onChange={(value) => updateEmpresaField('rut_representante', value)} placeholder="12.345.678-9" />
                <TextField id="empresa-contacto" label="Contacto (correo o teléfono)" value={empresaForm.contacto} onChange={(value) => updateEmpresaField('contacto', value)} placeholder="contacto@empresa.cl" />
                <div>
                  <label htmlFor="empresa-frecuencia" className="mb-1.5 block text-sm font-medium text-slate-700">Frecuencia de pago</label>
                  <select id="empresa-frecuencia" value={empresaForm.frecuencia} onChange={(event) => updateEmpresaField('frecuencia', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100">
                    {FRECUENCIAS.map((frecuencia) => <option key={frecuencia} value={frecuencia}>{frecuencia}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="empresa-estado" className="mb-1.5 block text-sm font-medium text-slate-700">Estado</label>
                  <select id="empresa-estado" value={empresaForm.estado} onChange={(event) => updateEmpresaField('estado', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100">
                    <option value="VIGENTE">VIGENTE</option>
                    <option value="NO VIGENTE">NO VIGENTE</option>
                  </select>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <label htmlFor="empresa-contrato" className="mb-1.5 block text-sm font-medium text-slate-700">Contrato (PDF, JPG o PNG)</label>
                {editingEmpresa?.contrato_url && (
                  <button
                    type="button"
                    onClick={() => void openPrivateFile(editingEmpresa.contrato_url!, getSignedContractUrl)}
                    className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700"
                  >
                    <ExternalLink size={15} />
                    Ver contrato actual
                  </button>
                )}
                <input
                  ref={contractInputRef}
                  id="empresa-contrato"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                  disabled={isSavingEmpresa}
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null
                    if (!file) {
                      setContractFile(null)
                      return
                    }
                    const extension = file.name.split('.').pop()?.toLocaleLowerCase()
                    const isPdf = file.type === 'application/pdf' || extension === 'pdf'
                    const isImage = ['image/jpeg', 'image/png'].includes(file.type) || ['png', 'jpg', 'jpeg'].includes(extension ?? '')
                    if (!isPdf && !isImage) {
                      setContractFile(null)
                      setError('Selecciona un contrato PDF, JPG o PNG.')
                      event.target.value = ''
                      return
                    }
                    if (file.size > 20 * 1024 * 1024) {
                      setContractFile(null)
                      setError('El contrato no puede superar 20 MB.')
                      event.target.value = ''
                      return
                    }
                    setError('')
                    setContractFile(file)
                  }}
                  className="block w-full rounded-lg border border-slate-200 bg-white text-sm text-slate-600 file:mr-3 file:h-10 file:border-0 file:bg-slate-100 file:px-4 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-primary-50"
                />
                {contractFile ? (
                  <p className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                    <FileImage size={15} className="shrink-0 text-primary-600" />
                    <span className="truncate">{contractFile.name}</span>
                    <span className="shrink-0">({(contractFile.size / 1024).toFixed(0)} KB)</span>
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">
                    {editingEmpresa?.contrato_url ? 'Adjunta otro archivo para agregarlo al historial de contratos.' : 'Adjunta un contrato para registrarlo en el historial de la empresa.'}
                  </p>
                )}
                {editingEmpresa?.id !== undefined && (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <h3 className="text-sm font-semibold text-slate-800">Historial de contratos subidos</h3>
                    {isLoadingContractHistory ? (
                      <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><LoaderCircle size={14} className="animate-spin" /> Cargando historial...</p>
                    ) : contractHistory.length === 0 ? (
                      <p className="mt-2 text-xs text-slate-500">Aún no hay contratos en el historial.</p>
                    ) : (
                      <ul className="mt-3 divide-y divide-slate-200">
                        {contractHistory.map((contract) => (
                          <li key={contract.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-700">{contract.nombre_archivo}</p>
                              <time dateTime={contract.created_at} className="mt-1 block text-xs text-slate-500">{formatExactDate(contract.created_at)}</time>
                            </div>
                            <div className="flex shrink-0 gap-2">
                              <button type="button" onClick={() => void openPrivateFile(contract.contrato_url, getSignedContractUrl)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"><ExternalLink size={14} />Ver</button>
                              <button type="button" onClick={() => void downloadContractFile(contract)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"><Download size={14} />Descargar</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setIsEmpresaModalOpen(false)} disabled={isSavingEmpresa} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={isSavingEmpresa} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white shadow-sm shadow-primary-600/20 transition hover:bg-primary-700 disabled:cursor-wait disabled:opacity-70">
                  {isSavingEmpresa ? <LoaderCircle size={16} className="animate-spin" /> : editingEmpresa ? <Edit2 size={16} /> : <Plus size={16} />}
                  {isSavingEmpresa ? 'Guardando...' : editingEmpresa ? 'Guardar cambios' : 'Registrar empresa'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {selectedEmpresa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/45 p-4 backdrop-blur-[2px]">
          <section role="dialog" aria-modal="true" aria-labelledby="payments-title" className="my-auto w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-950/20">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5 sm:px-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Control de pagos</p>
                <h2 id="payments-title" className="mt-1 text-lg font-semibold text-slate-900">Registrar pago</h2>
                <p className="mt-1 text-sm text-slate-500">Selecciona la empresa y registra los datos del pago.</p>
              </div>
              <button type="button" onClick={() => setSelectedEmpresa(null)} disabled={isSavingPago} aria-label="Cerrar pagos" className="flex size-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50">
                <X size={19} />
              </button>
            </div>

            <div className="max-h-[75vh] space-y-6 overflow-y-auto px-6 py-6 sm:px-7">
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <Clock3 size={17} className="text-slate-500" />
                  <h3 className="text-sm font-semibold text-slate-800">Pagos registrados</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{selectedEmpresa.pagos?.length ?? 0}</span>
                </div>
                {selectedEmpresa.pagos && selectedEmpresa.pagos.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full min-w-[600px] text-left">
                      <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Fecha</th>
                          <th className="px-4 py-3">Forma de pago</th>
                          <th className="px-4 py-3">Bruto</th>
                          <th className="px-4 py-3">Neto</th>
                          <th className="px-4 py-3">Líquido</th>
                          <th className="px-4 py-3">Comisión</th>
                          <th className="px-4 py-3">Próximo pago</th>
                          <th className="px-4 py-3">Comprobante</th>
                          <th className="px-4 py-3 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                        {selectedEmpresa.pagos.map((pago, index) => (
                          <tr key={String(pago.id ?? `${pago.fecha_pago}-${index}`)}>
                            <td className="px-4 py-3">{formatDate(pago.fecha_pago)}</td>
                            <td className="px-4 py-3">{pago.forma_pago || '—'}</td>
                            <td className="px-4 py-3">{formatMoney(pago.bruto)}</td>
                            <td className="px-4 py-3">{formatMoney(pago.neto)}</td>
                            <td className="px-4 py-3">{formatMoney(pago.monto_liquido ?? pago.bruto)}</td>
                            <td className="px-4 py-3">{formatMoney(pago.comision_tarjeta ?? 0)}</td>
                            <td className="px-4 py-3">{formatDate(pago.proximo_pago)}</td>
                            <td className="px-4 py-3">
                              {pago.voucher_url ? (
                                <button type="button" onClick={() => void openPrivateFile(pago.voucher_url!, getSignedVoucherUrl)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700">
                                  <ExternalLink size={14} /> Ver
                                </button>
                              ) : <span className="text-xs text-slate-400">—</span>}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => openEditPago(pago)}
                                aria-label={`Editar pago del ${formatDate(pago.fecha_pago)}`}
                                title="Editar pago"
                                className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                              >
                                <Edit2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">Aún no hay pagos registrados para esta empresa.</p>
                )}
              </section>

              <form onSubmit={handleCreatePago} className="space-y-4 border-t border-slate-100 pt-5">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Datos del pago</h3>
                </div>
                <div>
                  <label htmlFor="pago-empresa" className="mb-1.5 block text-sm font-medium text-slate-700">Empresa</label>
                  <select
                    id="pago-empresa"
                    required
                    value={selectedEmpresa.rut}
                    onChange={(event) => handleEmpresaPagoChange(event.target.value)}
                    disabled={isSavingPago || empresas.length === 0}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-50"
                  >
                    {empresas.length === 0 ? (
                      <option value="">No hay empresas registradas</option>
                    ) : (
                      empresas.map((empresa) => (
                        <option key={String(empresa.id ?? empresa.rut)} value={empresa.rut}>
                          {empresa.nombre} · RUT {empresa.rut}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label htmlFor="pago-fecha" className="mb-1.5 block text-sm font-medium text-slate-700">Fecha de pago</label>
                    <input id="pago-fecha" type="date" required value={pagoForm.fecha_pago} onChange={(event) => updatePagoField('fecha_pago', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
                  </div>
                  <div>
                    <label htmlFor="pago-forma" className="mb-1.5 block text-sm font-medium text-slate-700">Forma de pago</label>
                    <select id="pago-forma" value={pagoForm.forma_pago} onChange={(event) => updatePagoField('forma_pago', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100">
                      <option>Transferencia</option><option>Débito</option><option>Crédito</option><option>Efectivo</option><option>Otro</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="pago-bruto" className="mb-1.5 block text-sm font-medium text-slate-700">Monto bruto</label>
                    <input id="pago-bruto" type="number" min="0" step="1" required value={pagoForm.bruto} onChange={(event) => updatePagoField('bruto', event.target.value)} placeholder="Ingresa el monto bruto" className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
                  </div>
                  <div>
                    <label htmlFor="pago-liquido" className="mb-1.5 block text-sm font-medium text-slate-700">Monto líquido recibido (opcional)</label>
                    <input id="pago-liquido" type="number" min="0" max={bruto || undefined} step="0.01" value={pagoForm.monto_liquido} onChange={(event) => updatePagoField('monto_liquido', event.target.value)} placeholder="Vacío = igual al bruto" className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
                  </div>
                  <div>
                    <label htmlFor="pago-proximo" className="mb-1.5 block text-sm font-medium text-slate-700">Próximo pago</label>
                    <input id="pago-proximo" type="date" required value={pagoForm.proximo_pago} onChange={(event) => updatePagoField('proximo_pago', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
                    <p className="mt-1 text-xs text-slate-500">Se calcula según la frecuencia y puedes ajustarlo manualmente.</p>
                  </div>
                </div>
                <div>
                  <label htmlFor="pago-voucher" className="mb-1.5 block text-sm font-medium text-slate-700">Comprobante de pago (opcional)</label>
                  <input
                    ref={voucherInputRef}
                    id="pago-voucher"
                    type="file"
                    accept="image/png,image/jpeg,application/pdf,.png,.jpg,.jpeg,.pdf"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null
                      if (!file) {
                        setVoucherFile(null)
                        return
                      }
                      const extension = file.name.split('.').pop()?.toLocaleLowerCase()
                      const validType = ['image/png', 'image/jpeg', 'application/pdf'].includes(file.type) ||
                        ['png', 'jpg', 'jpeg', 'pdf'].includes(extension ?? '')
                      if (!validType) {
                        setVoucherFile(null)
                        setError('Selecciona un comprobante PNG, JPG o PDF.')
                        event.target.value = ''
                        return
                      }
                      if (file.size > 10 * 1024 * 1024) {
                        setVoucherFile(null)
                        setError('El comprobante no puede superar 10 MB.')
                        event.target.value = ''
                        return
                      }
                      setError('')
                      setVoucherFile(file)
                    }}
                    disabled={isSavingPago}
                    className="block w-full rounded-lg border border-slate-200 bg-white text-sm text-slate-600 file:mr-3 file:h-10 file:border-0 file:bg-slate-50 file:px-4 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-primary-50"
                  />
                  {voucherFile && (
                    <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <FileImage size={15} className="text-primary-600" />
                      <span className="truncate">{voucherFile.name}</span>
                      <span className="shrink-0">({(voucherFile.size / 1024).toFixed(0)} KB)</span>
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">Formatos permitidos: PNG, JPG o PDF.</p>
                </div>
                <div className="grid gap-3 rounded-xl border border-primary-100 bg-primary-50/60 p-4 sm:grid-cols-5">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Monto bruto</p>
                    <p className="mt-1 text-base font-semibold text-slate-800">{formatMoney(bruto)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Neto calculado</p>
                    <p className="mt-1 text-base font-semibold text-slate-800">{formatMoney(netoCalculado)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">IVA incluido (19%)</p>
                    <p className="mt-1 text-base font-bold text-primary-700">{formatMoney(ivaCalculado)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Líquido recibido</p>
                    <p className="mt-1 text-base font-semibold text-slate-800">{formatMoney(montoLiquidoForm)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Comisión tarjeta</p>
                    <p className="mt-1 text-base font-semibold text-slate-800">{formatMoney(comisionTarjetaForm)}</p>
                  </div>
                </div>
                {montoLiquidoForm > bruto && <p role="alert" className="text-sm text-rose-600">El monto líquido no puede superar el bruto.</p>}
                {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
                <div className="flex justify-end">
                  <button type="submit" disabled={isSavingPago} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white shadow-sm shadow-primary-600/20 transition hover:bg-primary-700 disabled:cursor-wait disabled:opacity-70">
                    {isSavingPago ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    {isSavingPago ? 'Guardando pago...' : 'Registrar pago'}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      )}

      {editingPago && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-900/45 p-4 backdrop-blur-[2px]">
          <section role="dialog" aria-modal="true" aria-labelledby="edit-payment-title" className="my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-950/20">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 id="edit-payment-title" className="text-lg font-semibold text-slate-900">Editar pago</h2>
                <p className="mt-1 text-sm text-slate-500">Al cambiar el monto bruto se recalculan neto e IVA.</p>
              </div>
              <button type="button" onClick={() => setEditingPago(null)} disabled={isSavingPago} aria-label="Cerrar edición de pago" className="flex size-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50">
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleUpdatePago} className="space-y-5 px-6 py-6">
              <div>
                <label htmlFor="edit-pago-fecha" className="mb-1.5 block text-sm font-medium text-slate-700">Fecha de pago</label>
                <input id="edit-pago-fecha" type="date" required value={pagoEditForm.fecha_pago} onChange={(event) => setPagoEditForm((current) => ({ ...current, fecha_pago: event.target.value }))} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
              </div>
              <div>
                <label htmlFor="edit-pago-forma" className="mb-1.5 block text-sm font-medium text-slate-700">Forma de pago</label>
                <select id="edit-pago-forma" value={pagoEditForm.forma_pago} onChange={(event) => setPagoEditForm((current) => ({ ...current, forma_pago: event.target.value }))} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100">
                  <option>Transferencia</option><option>Débito</option><option>Crédito</option><option>Efectivo</option><option>Otro</option>
                </select>
              </div>
              <div>
                <label htmlFor="edit-pago-bruto" className="mb-1.5 block text-sm font-medium text-slate-700">Monto bruto</label>
                <input id="edit-pago-bruto" type="number" min="0" step="1" required value={pagoEditForm.bruto} onChange={(event) => setPagoEditForm((current) => ({ ...current, bruto: event.target.value }))} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
              </div>
              <div>
                <label htmlFor="edit-pago-liquido" className="mb-1.5 block text-sm font-medium text-slate-700">Monto líquido recibido (opcional)</label>
                <input id="edit-pago-liquido" type="number" min="0" max={brutoEditadoPreview || undefined} step="0.01" value={pagoEditForm.monto_liquido} onChange={(event) => setPagoEditForm((current) => ({ ...current, monto_liquido: event.target.value }))} placeholder="Vacío = igual al bruto" className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
              </div>
              <div className="space-y-2">
                <p className="block text-sm font-medium text-slate-700">Comprobante de pago</p>
                {editingPago.voucher_url ? (
                  <button
                    type="button"
                    onClick={() => void openPrivateFile(editingPago.voucher_url!, getSignedVoucherUrl)}
                    className="inline-flex items-center gap-2 rounded-lg border border-primary-100 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-100"
                  >
                    <ExternalLink size={16} />
                    Ver comprobante actual
                  </button>
                ) : (
                  <p className="text-xs text-slate-500">Este pago aún no tiene un comprobante adjunto.</p>
                )}
                <input
                  ref={voucherEditInputRef}
                  id="edit-pago-voucher"
                  type="file"
                  accept="image/png,image/jpeg,application/pdf,.png,.jpg,.jpeg,.pdf"
                  disabled={isSavingPago}
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null
                    if (!file) {
                      setVoucherEditFile(null)
                      return
                    }
                    const extension = file.name.split('.').pop()?.toLocaleLowerCase()
                    const validType = ['image/png', 'image/jpeg', 'application/pdf'].includes(file.type) ||
                      ['png', 'jpg', 'jpeg', 'pdf'].includes(extension ?? '')
                    if (!validType) {
                      setVoucherEditFile(null)
                      setError('Selecciona un comprobante PNG, JPG o PDF.')
                      event.target.value = ''
                      return
                    }
                    if (file.size > 10 * 1024 * 1024) {
                      setVoucherEditFile(null)
                      setError('El comprobante no puede superar 10 MB.')
                      event.target.value = ''
                      return
                    }
                    setError('')
                    setVoucherEditFile(file)
                  }}
                  className="block w-full rounded-lg border border-slate-200 bg-white text-sm text-slate-600 file:mr-3 file:h-10 file:border-0 file:bg-slate-50 file:px-4 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-primary-50"
                />
                {voucherEditFile && (
                  <p className="flex items-center gap-2 text-xs text-slate-500">
                    <FileImage size={15} className="shrink-0 text-primary-600" />
                    <span className="truncate">Reemplazar por: {voucherEditFile.name}</span>
                    <span className="shrink-0">({(voucherEditFile.size / 1024).toFixed(0)} KB)</span>
                  </p>
                )}
                <p className="text-xs text-slate-400">Deja el selector vacío para conservar el comprobante actual. Máximo 10 MB.</p>
              </div>
              {(() => {
                const editBruto = Number(pagoEditForm.bruto) || 0
                const editNeto = Math.round((editBruto / 1.19) * 100) / 100
                const editIva = Math.round((editBruto - editNeto) * 100) / 100
                return (
                  <div className="grid grid-cols-2 gap-3 rounded-xl border border-primary-100 bg-primary-50/60 p-4 sm:grid-cols-5">
                    <div><p className="text-xs text-slate-500">Bruto</p><p className="mt-1 text-sm font-semibold text-slate-800">{formatMoney(editBruto)}</p></div>
                    <div><p className="text-xs text-slate-500">Neto</p><p className="mt-1 text-sm font-semibold text-slate-800">{formatMoney(editNeto)}</p></div>
                    <div><p className="text-xs text-slate-500">IVA (19%)</p><p className="mt-1 text-sm font-bold text-primary-700">{formatMoney(editIva)}</p></div>
                    <div><p className="text-xs text-slate-500">Líquido</p><p className="mt-1 text-sm font-semibold text-slate-800">{formatMoney(montoLiquidoEditPreview)}</p></div>
                    <div><p className="text-xs text-slate-500">Comisión tarjeta</p><p className="mt-1 text-sm font-semibold text-slate-800">{formatMoney(comisionTarjetaEditPreview)}</p></div>
                  </div>
                )
              })()}
              {montoLiquidoEditPreview > brutoEditadoPreview && <p role="alert" className="text-sm text-rose-600">El monto líquido no puede superar el bruto.</p>}
              {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button type="button" onClick={() => setEditingPago(null)} disabled={isSavingPago} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={isSavingPago} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white shadow-sm shadow-primary-600/20 transition hover:bg-primary-700 disabled:cursor-wait disabled:opacity-70">
                  {isSavingPago ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  {isSavingPago ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
