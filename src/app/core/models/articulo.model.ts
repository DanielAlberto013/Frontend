export interface Articulo {
  id: string;
  nombre: string;
  descripcion: string;
  precioReferencia: number;
  partidaCodigo: string;
  activo: boolean;
  createdAt?: Date; // Agregar como opcional si es necesario
  updatedAt?: Date; // Agregar como opcional si es necesario
}

export interface CreateArticuloRequest {
  nombre: string;
  descripcion: string;
  precioReferencia: number;
  partidaCodigo: string;
}

export interface UpdateArticuloRequest {
  nombre?: string;
  descripcion?: string;
  precioReferencia?: number;
  partidaCodigo?: string;
  activo?: boolean;
}