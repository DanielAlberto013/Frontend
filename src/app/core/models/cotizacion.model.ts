// src/app/core/models/cotizacion.model.ts
import { Articulo } from './articulo.model';

export interface Cotizacion {
  id: string;
  proyectoId: string;
  partidaCodigo: string;
  fuente: 'FEDERAL' | 'ESTATAL';
  items: CotizacionItem[];
  total: number;
  estado: 'BORRADOR' | 'EN_REVISION' | 'APROBADO' | 'RECHAZADO';
  createdAt: Date;
  updatedAt: Date;
}

export interface CotizacionItem {
  id: string;
  articuloId: string;
  articulo: Articulo;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface CreateCotizacionRequest {
  proyectoId: string;
  partidaCodigo: string;
  fuente: 'FEDERAL' | 'ESTATAL';
  items: CreateCotizacionItemRequest[];
}

export interface CreateCotizacionItemRequest {
  articuloId: string;
  cantidad: number;
  precioUnitario: number;
}

export interface UpdateCotizacionRequest {
  estado?: 'BORRADOR' | 'EN_REVISION' | 'APROBADO' | 'RECHAZADO';
}