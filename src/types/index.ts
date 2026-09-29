export type DocumentType = 'Excel' | 'PDF'

export interface DocumentRecord {
  id: string
  nombre: string
  nombre_archivo: string
  categoria: string
  tipo: DocumentType
  fecha_subida: string
  ruta_storage: string
  usuario_id: string
}
