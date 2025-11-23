// src/app/core/models/cotizacion.model.ts
import { Article } from './article.model';
import { PartidaPresupuestal } from './partida.model';
import { project } from './proyecto.model';

export interface Cotizacion {
  id: string;
  proyectoId: string;
  proyecto?: project;
  partidaCodigo: string;
  fuente: 'FEDERAL' | 'ESTATAL';
  items: CotizacionItem[];
  subtotal: number; // ✅ AGREGADO
  iva: number; // ✅ AGREGADO
  total: number;
  estado: 'BORRADOR' | 'EN_REVISION' | 'APROBADO' | 'RECHAZADO';
  createdAt: Date;
  updatedAt: Date;
  
  // Propiedades para mostrar información de partida
  partidaPresupuestal?: PartidaPresupuestal;
  nombrePartida?: string;
  saldoPartida?: number;
  
  // Nueva propiedad: Información de presupuesto por fuente
  presupuestoFederal?: number;
  presupuestoEstatal?: number;
  saldoFederal?: number;
  saldoEstatal?: number;
}

export interface CotizacionItem {
  id: string;
  articuloId: string;
  articulo: Article;
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

export interface CotizacionEnriquecida extends Cotizacion {
  proyecto?: project;
  partidaPresupuestal?: PartidaPresupuestal;
  nombrePartida?: string;
  saldoPartida?: number;
}