// src/app/core/services/proyectos.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Proyecto, CreateProyectoRequest, UpdateProyectoRequest } from '../models/proyecto.model';
import { ApiResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class ProyectosService {
  private apiUrl = 'http://localhost:3000/proyectos';

  constructor(private http: HttpClient) {}

  // Obtener todos los proyectos (para revisores y admin)
  getProyectos(): Observable<ApiResponse<Proyecto[]>> {
    return this.http.get<ApiResponse<Proyecto[]>>(this.apiUrl);
  }

  // Obtener proyectos del docente actual
  getMisProyectos(): Observable<ApiResponse<Proyecto[]>> {
    return this.http.get<ApiResponse<Proyecto[]>>(`${this.apiUrl}/mis-proyectos`);
  }

  // Obtener un proyecto por ID
  getProyectoById(id: string): Observable<ApiResponse<Proyecto>> {
    return this.http.get<ApiResponse<Proyecto>>(`${this.apiUrl}/${id}`);
  }

  // Crear nuevo proyecto
  createProyecto(proyecto: CreateProyectoRequest): Observable<ApiResponse<Proyecto>> {
    return this.http.post<ApiResponse<Proyecto>>(this.apiUrl, proyecto);
  }

  // Actualizar proyecto
  updateProyecto(id: string, proyecto: UpdateProyectoRequest): Observable<ApiResponse<Proyecto>> {
    return this.http.patch<ApiResponse<Proyecto>>(`${this.apiUrl}/${id}`, proyecto);
  }

  // Eliminar proyecto (solo admin)
  deleteProyecto(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }
}