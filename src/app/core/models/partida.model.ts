// src/app/core/models/partida.model.ts
export interface PartidaPresupuestal {
     id: string;
     codigo: string; // "21.1", "25.1", "29.4"
     nombre: string;
     descripcion: string;
     importeAsignado: number;
     proyectoId: string;
     saldoDisponible: number;
     createdAt: Date;
   }
   
   export interface CreatePartidaRequest {
     codigo: string;
     nombre: string;
     descripcion: string;
     importeAsignado: number;
     proyectoId: string;
   }
   
   export interface UpdatePartidaRequest {
     importeAsignado?: number;
     saldoDisponible?: number;
   }