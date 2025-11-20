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

// 🔥 NUEVOS MODELOS PARA SUGERENCIAS
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
}