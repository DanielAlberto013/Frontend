// src/app/core/models/cotizacion.model.ts
import { Articulo } from './articulo.model';
import { PartidaPresupuestal } from './partida.model';
import { Proyecto } from './proyecto.model'; // ✅ AGREGAR

export interface Cotizacion {
  id: string;
  proyectoId: string;
  proyecto?: Proyecto; // ✅ AGREGAR esta propiedad
  partidaCodigo: string;
  fuente: 'FEDERAL' | 'ESTATAL';
  items: CotizacionItem[];
  total: number;
  estado: 'BORRADOR' | 'EN_REVISION' | 'APROBADO' | 'RECHAZADO';
  createdAt: Date;
  updatedAt: Date;
  
  // ✅ PROPIEDADES PARA MOSTRAR INFORMACIÓN DE PARTIDA
  partidaPresupuestal?: PartidaPresupuestal;
  nombrePartida?: string;
  saldoPartida?: number;
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

// ✅ INTERFAZ PARA COTIZACIONES ENRIQUECIDAS
export interface CotizacionEnriquecida extends Cotizacion {
  proyecto?: Proyecto;
  partidaPresupuestal?: PartidaPresupuestal;
  nombrePartida?: string;
  saldoPartida?: number;
}