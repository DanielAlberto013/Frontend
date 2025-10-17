// src/app/core/services/articulos.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Articulo, CreateArticuloRequest, UpdateArticuloRequest } from '../models/articulo.model';
import { ApiResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class ArticulosService {
  private apiUrl = 'http://localhost:3000/articulos';

  constructor(private http: HttpClient) {}

  // Obtener todos los artículos activos
  getArticulos(): Observable<ApiResponse<Articulo[]>> {
    return this.http.get<ApiResponse<Articulo[]>>(this.apiUrl);
  }

  // Obtener artículos por partida
  getArticulosPorPartida(partidaCodigo: string): Observable<ApiResponse<Articulo[]>> {
    return this.http.get<ApiResponse<Articulo[]>>(`${this.apiUrl}/partida/${partidaCodigo}`);
  }

  // Buscar artículos por nombre
  buscarArticulos(termino: string): Observable<ApiResponse<Articulo[]>> {
    return this.http.get<ApiResponse<Articulo[]>>(`${this.apiUrl}/buscar?q=${termino}`);
  }

  // Crear nuevo artículo (solo admin/revisor)
  createArticulo(articulo: CreateArticuloRequest): Observable<ApiResponse<Articulo>> {
    return this.http.post<ApiResponse<Articulo>>(this.apiUrl, articulo);
  }

  // Actualizar artículo (solo admin/revisor)
  updateArticulo(id: string, articulo: UpdateArticuloRequest): Observable<ApiResponse<Articulo>> {
    return this.http.patch<ApiResponse<Articulo>>(`${this.apiUrl}/${id}`, articulo);
  }

  // Desactivar artículo (solo admin/revisor)
  desactivarArticulo(id: string): Observable<ApiResponse<Articulo>> {
    return this.http.patch<ApiResponse<Articulo>>(`${this.apiUrl}/${id}/desactivar`, {});
  }
}