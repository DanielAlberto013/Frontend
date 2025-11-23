export interface Article {
  id: string;
  nombre: string;
  precioReferencia: number;
  partidaCodigo: string;
  activo: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateArticuloRequest {
  nombre: string;
  precioReferencia: number;
  partidaCodigo: string;
}

export interface UpdateArticuloRequest {
  nombre?: string;
  precioReferencia?: number;
  partidaCodigo?: string;
  activo?: boolean;
}

// 🔥 NUEVOS MODELOS PARA SUGERENCIAS - ACTUALIZADOS
export interface SugerenciaArticulo {
  id: string;
  nombre: string;
  precioReferencia: number;
  partidaCodigo: string;
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  docenteId: string;
  docenteNombre: string;
  fechaCreacion: Date;
  fechaRevision?: Date;
  adminRevisorId?: string;
  comentarios?: string;
  articuloId?: string;
  // 🔥 NUEVO: Propiedades para tracking de cambios
  nombreFinal?: string;
  precioFinal?: number;
  partidaFinal?: string;
  datosEditados?: boolean;
}

export interface CreateSugerenciaRequest {
  nombre: string;
  precioReferencia: number;
  partidaCodigo: string;
  docenteId: string;
  docenteNombre: string;
}

export interface ReviewSugerenciaRequest {
  estado: 'APROBADA' | 'RECHAZADA';
  adminRevisorId: string;
  comentarios?: string;
  // 🔥 NUEVO: Propiedades para edición
  nombreEditado?: string;
  precioEditado?: number;
  partidaEditada?: string;
}