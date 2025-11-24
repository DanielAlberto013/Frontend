// src/app/core/models/documento-final.model.ts
export interface DocumentoFinal {
  tipoConvocatoria: string;
  nombreProyecto: string;
  claveProyecto: string;
  vigenciaProyecto: string;
  tipoFondo: 'FEDERAL' | 'ESTATAL';
  partidas: PartidaDocumento[];
  docenteNombre: string;
  fechaGeneracion: Date;
  subtotal: number;
  iva: number;
  total: number;
  montoAprobado: number;
  proyecto?: any;
}

export interface PartidaDocumento {
  partidaCodigo: string;
  partidaNombre: string;
  partidaDescripcion: string;
  montoAutorizado: number;
  fuentePresupuesto: 'FEDERAL' | 'ESTATAL'; // ✅ NUEVO
  productos: ProductoDocumento[];
  subtotal: number;
  iva: number;
  total: number;
}

export interface ProductoDocumento {
  cantidad: number;
  descripcion: string;
  precioUnitario: number;
  total: number;
}

export interface DocumentoFinalDocente {
  docenteNombre: string;
  proyectos: any[];
  totalGeneral: number;
  fechaGeneracion: Date;
}