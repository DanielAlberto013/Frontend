export interface Articulo {
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