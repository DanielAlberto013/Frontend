// src/app/core/models/proyecto.model.ts
import { User } from './user.model';

export interface Proyecto {
  id: string;
  nombre: string;
  descripcion: string;
  docenteId: string;
  docente: User;
  presupuestoTotal: number;
  presupuestoFederal: number;
  presupuestoEstatal: number;
  edicion: string; // "2025", "2026"
  estado: 'BORRADOR' | 'EN_REVISION' | 'APROBADO' | 'RECHAZADO';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProyectoRequest {
  nombre: string;
  descripcion: string;
  presupuestoTotal: number;
  presupuestoFederal: number;
  presupuestoEstatal: number;
  edicion: string;
}

export interface UpdateProyectoRequest {
  nombre?: string;
  descripcion?: string;
  estado?: 'BORRADOR' | 'EN_REVISION' | 'APROBADO' | 'RECHAZADO';
}