// src/app/core/services/partidas.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PartidaPresupuestal, CreatePartidaRequest, UpdatePartidaRequest } from '../models/partida.model';
import { ApiResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class PartidasService {
  private apiUrl = 'http://localhost:3000/partidas';

  constructor(private http: HttpClient) {}

  // Obtener partidas de un proyecto
  getPartidasByProyecto(proyectoId: string): Observable<ApiResponse<PartidaPresupuestal[]>> {
    return this.http.get<ApiResponse<PartidaPresupuestal[]>>(`${this.apiUrl}/proyecto/${proyectoId}`);
  }

  // Obtener partida específica
  getPartidaById(id: string): Observable<ApiResponse<PartidaPresupuestal>> {
    return this.http.get<ApiResponse<PartidaPresupuestal>>(`${this.apiUrl}/${id}`);
  }

  // Crear partida para proyecto
  createPartida(partida: CreatePartidaRequest): Observable<ApiResponse<PartidaPresupuestal>> {
    return this.http.post<ApiResponse<PartidaPresupuestal>>(this.apiUrl, partida);
  }

  // Actualizar partida (principalmente saldo)
  updatePartida(id: string, partida: UpdatePartidaRequest): Observable<ApiResponse<PartidaPresupuestal>> {
    return this.http.patch<ApiResponse<PartidaPresupuestal>>(`${this.apiUrl}/${id}`, partida);
  }

  // Validar si hay saldo suficiente en partida
  validarSaldo(partidaId: string, montoRequerido: number): Observable<ApiResponse<{ suficiente: boolean; saldoActual: number }>> {
    return this.http.get<ApiResponse<{ suficiente: boolean; saldoActual: number }>>(
      `${this.apiUrl}/${partidaId}/validar-saldo?monto=${montoRequerido}`
    );
  }
}