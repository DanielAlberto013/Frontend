import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay } from 'rxjs';
import { Articulo, CreateArticuloRequest, UpdateArticuloRequest, SugerenciaArticulo, CreateSugerenciaRequest, ReviewSugerenciaRequest } from '../models/articulo.model';
import { ApiResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class ArticulosService {
  private apiUrl = 'http://localhost:3000/articulos';
  private storageKey = 'articulos_data';

  constructor(private http: HttpClient) {}

  // 🔥 SIMULACIÓN - Obtener artículos del localStorage
  private getArticulosFromStorage(): Articulo[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : this.articulosPredefinidos;
  }

  private saveArticulosToStorage(articulos: Articulo[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(articulos));
  }

  private generateId(): string {
    return 'art_' + Math.random().toString(36).substr(2, 9);
  }

  // 🔥 NUEVO: Obtener todas las partidas disponibles
  getPartidas(): Observable<ApiResponse<string[]>> {
    const articulos = this.getArticulosFromStorage();
    const partidasUnicas = [...new Set(articulos.map(a => a.partidaCodigo))].sort();
    
    return of({
      success: true,
      data: partidasUnicas,
      message: 'Partidas obtenidas exitosamente'
    }).pipe(delay(300));
  }

  // 🔥 NUEVO: Obtener nombre descriptivo de partidas
  getNombrePartida(codigo: string): string {
    const nombresPartidas: { [key: string]: string } = {
      '21101': 'Papelería y Útiles de Oficina',
      '21201': 'Tintas y Consumibles para Impresión',
      '21401': 'Equipo de Cómputo y Accesorios',
      '23101': 'Semillas y Material Vegetal',
      '23701': 'Filamentos para Impresión 3D',
      '24601': 'Componentes Eléctricos y Electrónicos',
      '25101': 'Reactivos y Material para Laboratorio',
      '25201': 'Insumos Agrícolas y Fertilizantes',
      '25501': 'Material de Vidriería y Laboratorio',
      '29101': 'Herramientas y Equipo Manual',
      '29401': 'Equipo de Cómputo y Tecnología',
      '33601': 'Servicios de Traducción',
      '35301': 'Servicios de Mantenimiento'
    };
    
    return nombresPartidas[codigo] || `Partida ${codigo}`;
  }

  // 🔥 TODOS LOS ARTÍCULOS DEL EXCEL
  private articulosPredefinidos: Articulo[] = [
    // PARTIDA 21101 - Papelería y Útiles
    { id: 'art_1', partidaCodigo: '21101', nombre: 'Charola artículada tamaño carta, 3 niveles, gris humo', precioReferencia: 450.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_2', partidaCodigo: '21101', nombre: 'Sobres coin con solapa engomada kraft amarillo (paq. 50 piezas)', precioReferencia: 120.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    // ... (todos los demás artículos)
    { id: 'art_74', partidaCodigo: '35301', nombre: 'Mantenimiento Preventivo -Correctivo y Actualizacion de Software - Mantenimiento Laptop Dell', precioReferencia: 700.00, activo: true, createdAt: new Date(), updatedAt: new Date() }
  ];

  // Obtener todos los artículos activos
  getArticulos(): Observable<ApiResponse<Articulo[]>> {
    const articulos = this.getArticulosFromStorage();
    const articulosActivos = articulos.filter(a => a.activo);
    
    return of({
      success: true,
      data: articulosActivos,
      message: 'Artículos obtenidos exitosamente'
    }).pipe(delay(500));
  }

  // Obtener artículos por partida
  getArticulosPorPartida(partidaCodigo: string): Observable<ApiResponse<Articulo[]>> {
    const articulos = this.getArticulosFromStorage();
    const articulosFiltrados = articulos.filter(a => a.partidaCodigo === partidaCodigo && a.activo);
    
    return of({
      success: true,
      data: articulosFiltrados,
      message: `Artículos de partida ${partidaCodigo} obtenidos exitosamente`
    }).pipe(delay(300));
  }

  // Buscar artículos por nombre
  buscarArticulos(termino: string): Observable<ApiResponse<Articulo[]>> {
    const articulos = this.getArticulosFromStorage();
    const articulosFiltrados = articulos.filter(a => 
      a.nombre.toLowerCase().includes(termino.toLowerCase()) && a.activo
    );
    
    return of({
      success: true,
      data: articulosFiltrados,
      message: 'Búsqueda completada exitosamente'
    }).pipe(delay(400));
  }

  // Crear nuevo artículo (solo admin/revisor)
  createArticulo(articuloData: CreateArticuloRequest): Observable<ApiResponse<Articulo>> {
    return new Observable(observer => {
      try {
        const articulos = this.getArticulosFromStorage();
        
        const nuevoArticulo: Articulo = {
          id: this.generateId(),
          ...articuloData,
          activo: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        articulos.push(nuevoArticulo);
        this.saveArticulosToStorage(articulos);

        setTimeout(() => {
          observer.next({
            success: true,
            data: nuevoArticulo,
            message: 'Artículo creado exitosamente'
          });
          observer.complete();
        }, 1000);

      } catch (error) {
        observer.error({
          success: false,
          message: 'Error al crear artículo',
          error: error
        });
      }
    });
  }

  // Actualizar artículo (solo admin/revisor)
  updateArticulo(id: string, articulo: UpdateArticuloRequest): Observable<ApiResponse<Articulo>> {
    const articulos = this.getArticulosFromStorage();
    const index = articulos.findIndex(a => a.id === id);
    
    if (index !== -1) {
      articulos[index] = { 
        ...articulos[index], 
        ...articulo, 
        updatedAt: new Date() 
      };
      this.saveArticulosToStorage(articulos);
      
      return of({
        success: true,
        data: articulos[index],
        message: 'Artículo actualizado exitosamente'
      });
    }
    
    return of({
      success: false,
      message: 'Artículo no encontrado'
    });
  }

  // Desactivar artículo (solo admin/revisor)
  desactivarArticulo(id: string): Observable<ApiResponse<Articulo>> {
    const articulos = this.getArticulosFromStorage();
    const index = articulos.findIndex(a => a.id === id);
    
    if (index !== -1) {
      articulos[index] = { 
        ...articulos[index], 
        activo: false,
        updatedAt: new Date() 
      };
      this.saveArticulosToStorage(articulos);
      
      return of({
        success: true,
        data: articulos[index],
        message: 'Artículo desactivado exitosamente'
      });
    }
    
    return of({
      success: false,
      message: 'Artículo no encontrado'
    });
  }

  // 🔥 MÉTODOS PARA SUGERENCIAS
  private getSugerenciasStorageKey(): string {
    return 'sugerencias_articulos_data';
  }

  private getSugerenciasFromStorage(): SugerenciaArticulo[] {
    const data = localStorage.getItem(this.getSugerenciasStorageKey());
    return data ? JSON.parse(data) : [];
  }

  private saveSugerenciasToStorage(sugerencias: SugerenciaArticulo[]): void {
    localStorage.setItem(this.getSugerenciasStorageKey(), JSON.stringify(sugerencias));
  }

  private generateSugerenciaId(): string {
    return 'sug_' + Math.random().toString(36).substr(2, 9);
  }

  // Crear nueva sugerencia
  createSugerencia(sugerenciaData: CreateSugerenciaRequest): Observable<ApiResponse<SugerenciaArticulo>> {
    return new Observable(observer => {
      try {
        const sugerencias = this.getSugerenciasFromStorage();
        
        const nuevaSugerencia: SugerenciaArticulo = {
          id: this.generateSugerenciaId(),
          ...sugerenciaData,
          estado: 'PENDIENTE',
          fechaCreacion: new Date()
        };

        sugerencias.push(nuevaSugerencia);
        this.saveSugerenciasToStorage(sugerencias);

        setTimeout(() => {
          observer.next({
            success: true,
            data: nuevaSugerencia,
            message: 'Sugerencia enviada exitosamente'
          });
          observer.complete();
        }, 1000);

      } catch (error) {
        observer.error({
          success: false,
          message: 'Error al crear sugerencia',
          error: error
        });
      }
    });
  }

  // Obtener sugerencias pendientes (para admin)
  getSugerenciasPendientes(): Observable<ApiResponse<SugerenciaArticulo[]>> {
    const sugerencias = this.getSugerenciasFromStorage();
    const sugerenciasPendientes = sugerencias.filter(s => s.estado === 'PENDIENTE');
    
    return of({
      success: true,
      data: sugerenciasPendientes,
      message: 'Sugerencias pendientes obtenidas exitosamente'
    }).pipe(delay(300));
  }

  // Obtener sugerencias por docente
  getSugerenciasByDocente(docenteId: string): Observable<ApiResponse<SugerenciaArticulo[]>> {
    const sugerencias = this.getSugerenciasFromStorage();
    const sugerenciasDocente = sugerencias.filter(s => s.docenteId === docenteId);
    
    return of({
      success: true,
      data: sugerenciasDocente,
      message: 'Sugerencias obtenidas exitosamente'
    }).pipe(delay(300));
  }

  // Revisar sugerencia (para admin)
  reviewSugerencia(id: string, reviewData: ReviewSugerenciaRequest): Observable<ApiResponse<SugerenciaArticulo>> {
    return new Observable(observer => {
      try {
        const sugerencias = this.getSugerenciasFromStorage();
        const index = sugerencias.findIndex(s => s.id === id);
        
        if (index === -1) {
          observer.next({
            success: false,
            message: 'Sugerencia no encontrada'
          });
          observer.complete();
          return;
        }

        const sugerencia = sugerencias[index];
        
        // Si se aprueba, crear el artículo automáticamente
        if (reviewData.estado === 'APROBADA') {
          const nuevoArticulo: Articulo = {
            id: this.generateId(),
            nombre: sugerencia.nombre,
            precioReferencia: sugerencia.precioReferencia,
            partidaCodigo: sugerencia.partidaCodigo,
            activo: true,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Guardar el artículo
          const articulos = this.getArticulosFromStorage();
          articulos.push(nuevoArticulo);
          this.saveArticulosToStorage(articulos);

          // Actualizar la sugerencia con el ID del artículo creado
          sugerencias[index] = {
            ...sugerencia,
            ...reviewData,
            fechaRevision: new Date(),
            articuloId: nuevoArticulo.id
          };
        } else {
          // Solo actualizar estado si es rechazada
          sugerencias[index] = {
            ...sugerencia,
            ...reviewData,
            fechaRevision: new Date()
          };
        }

        this.saveSugerenciasToStorage(sugerencias);

        setTimeout(() => {
          observer.next({
            success: true,
            data: sugerencias[index],
            message: `Sugerencia ${reviewData.estado === 'APROBADA' ? 'aprobada' : 'rechazada'} exitosamente`
          });
          observer.complete();
        }, 1000);

      } catch (error) {
        observer.error({
          success: false,
          message: 'Error al revisar sugerencia',
          error: error
        });
      }
    });
  }
}