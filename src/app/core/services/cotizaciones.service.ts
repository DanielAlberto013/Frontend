// src/app/core/services/cotizaciones.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Cotizacion, CreateCotizacionRequest, UpdateCotizacionRequest } from '../models/cotizacion.model';
import { ApiResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class CotizacionesService {
  private apiUrl = 'http://localhost:3000/cotizaciones';

  constructor(private http: HttpClient) {}

  // Obtener todas las cotizaciones (revisor/admin)
  getCotizaciones(): Observable<ApiResponse<Cotizacion[]>> {
    return this.http.get<ApiResponse<Cotizacion[]>>(this.apiUrl);
  }

  // Obtener cotizaciones del docente actual
  getMisCotizaciones(): Observable<ApiResponse<Cotizacion[]>> {
    return this.http.get<ApiResponse<Cotizacion[]>>(`${this.apiUrl}/mis-cotizaciones`);
  }

  // Obtener cotizaciones por proyecto
  getCotizacionesByProyecto(proyectoId: string): Observable<ApiResponse<Cotizacion[]>> {
    return this.http.get<ApiResponse<Cotizacion[]>>(`${this.apiUrl}/proyecto/${proyectoId}`);
  }

  // Obtener cotización por ID
  getCotizacionById(id: string): Observable<ApiResponse<Cotizacion>> {
    return this.http.get<ApiResponse<Cotizacion>>(`${this.apiUrl}/${id}`);
  }

  // Crear nueva cotización
  createCotizacion(cotizacion: CreateCotizacionRequest): Observable<ApiResponse<Cotizacion>> {
    return this.http.post<ApiResponse<Cotizacion>>(this.apiUrl, cotizacion);
  }

  // Actualizar estado de cotización (aprobación/rechazo)
  updateCotizacion(id: string, cotizacion: UpdateCotizacionRequest): Observable<ApiResponse<Cotizacion>> {
    return this.http.patch<ApiResponse<Cotizacion>>(`${this.apiUrl}/${id}`, cotizacion);
  }

  // Generar PDF de cotización
  generarPdf(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/pdf`, { responseType: 'blob' });
  }

  // Generar Excel de cotización
  generarExcel(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/excel`, { responseType: 'blob' });
  }
}