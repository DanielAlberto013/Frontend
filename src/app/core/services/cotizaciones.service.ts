// src/app/core/services/cotizaciones.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, switchMap, forkJoin } from 'rxjs';
import { Cotizacion, CreateCotizacionRequest, UpdateCotizacionRequest } from '../models/cotizacion.model';
import { ApiResponse } from '../models/user.model';
import { PartidasService } from './partidas.service'; // ✅ AGREGAR
import { ArticulosService } from './articulos.service'; // ✅ AGREGAR

@Injectable({
  providedIn: 'root'
})
export class CotizacionesService {
  private apiUrl = 'http://localhost:3000/cotizaciones';

  constructor(
    private http: HttpClient,
    private partidasService: PartidasService, // ✅ INYECTAR
    private articulosService: ArticulosService // ✅ INYECTAR
  ) {}

  // ✅ NUEVO MÉTODO: Enriquecer cotización con datos de partida
  private enriquecerCotizacionConPartida(cotizacion: Cotizacion): Observable<Cotizacion> {
    return this.partidasService.getPartidasByProyecto(cotizacion.proyectoId).pipe(
      map(response => {
        if (response.success && response.data) {
          const partida = response.data.find(p => p.codigo === cotizacion.partidaCodigo);
          if (partida) {
            return {
              ...cotizacion,
              partidaPresupuestal: partida,
              nombrePartida: this.articulosService.getNombrePartida(cotizacion.partidaCodigo),
              saldoPartida: partida.saldoDisponible
            };
          }
        }
        return {
          ...cotizacion,
          nombrePartida: this.articulosService.getNombrePartida(cotizacion.partidaCodigo)
        };
      })
    );
  }

  // ✅ ACTUALIZAR MÉTODOS EXISTENTES para incluir datos de partida

  // Obtener todas las cotizaciones (revisor/admin)
  getCotizaciones(): Observable<ApiResponse<Cotizacion[]>> {
    return this.http.get<ApiResponse<Cotizacion[]>>(this.apiUrl).pipe(
      switchMap(response => {
        if (response.success && response.data) {
          const cotizacionesEnriquecidas$ = response.data.map(cotizacion => 
            this.enriquecerCotizacionConPartida(cotizacion)
          );
          return forkJoin(cotizacionesEnriquecidas$).pipe(
            map(cotizaciones => ({
              ...response,
              data: cotizaciones
            }))
          );
        }
        return [response];
      })
    );
  }

  // Obtener cotizaciones del docente actual
  getMisCotizaciones(): Observable<ApiResponse<Cotizacion[]>> {
    return this.http.get<ApiResponse<Cotizacion[]>>(`${this.apiUrl}/mis-cotizaciones`).pipe(
      switchMap(response => {
        if (response.success && response.data) {
          const cotizacionesEnriquecidas$ = response.data.map(cotizacion => 
            this.enriquecerCotizacionConPartida(cotizacion)
          );
          return forkJoin(cotizacionesEnriquecidas$).pipe(
            map(cotizaciones => ({
              ...response,
              data: cotizaciones
            }))
          );
        }
        return [response];
      })
    );
  }

  // Obtener cotizaciones por proyecto
  getCotizacionesByProyecto(proyectoId: string): Observable<ApiResponse<Cotizacion[]>> {
    return this.http.get<ApiResponse<Cotizacion[]>>(`${this.apiUrl}/proyecto/${proyectoId}`).pipe(
      switchMap(response => {
        if (response.success && response.data) {
          const cotizacionesEnriquecidas$ = response.data.map(cotizacion => 
            this.enriquecerCotizacionConPartida(cotizacion)
          );
          return forkJoin(cotizacionesEnriquecidas$).pipe(
            map(cotizaciones => ({
              ...response,
              data: cotizaciones
            }))
          );
        }
        return [response];
      })
    );
  }

  // Obtener cotización por ID
  getCotizacionById(id: string): Observable<ApiResponse<Cotizacion>> {
    return this.http.get<ApiResponse<Cotizacion>>(`${this.apiUrl}/${id}`).pipe(
      switchMap(response => {
        if (response.success && response.data) {
          return this.enriquecerCotizacionConPartida(response.data).pipe(
            map(cotizacionEnriquecida => ({
              ...response,
              data: cotizacionEnriquecida
            }))
          );
        }
        return [response];
      })
    );
  }

  // Los demás métodos permanecen igual...
  createCotizacion(cotizacion: CreateCotizacionRequest): Observable<ApiResponse<Cotizacion>> {
    return this.http.post<ApiResponse<Cotizacion>>(this.apiUrl, cotizacion);
  }

  updateCotizacion(id: string, cotizacion: UpdateCotizacionRequest): Observable<ApiResponse<Cotizacion>> {
    return this.http.patch<ApiResponse<Cotizacion>>(`${this.apiUrl}/${id}`, cotizacion);
  }

  generarPdf(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/pdf`, { responseType: 'blob' });
  }

  generarExcel(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/excel`, { responseType: 'blob' });
  }
}