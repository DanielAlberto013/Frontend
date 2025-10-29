// src/app/core/models/documento-cotizacion.model.ts
import { Cotizacion } from './cotizacion.model';
import { PartidaDocumento } from './documento-final.model';

export interface DocumentoCotizacion {
  id: string;
  proyectoId: string;
  proyecto: any;
  cotizaciones: Cotizacion[];
  partidas: PartidaDocumento[];
  docenteNombre: string;
  fechaGeneracion: Date;
  totalGeneral: number;
  estado: 'BORRADOR' | 'GENERADO' | 'APROBADO';
}