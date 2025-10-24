// src/app/core/services/proyectos.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay } from 'rxjs';
import { Proyecto, CreateProyectoRequest, UpdateProyectoRequest } from '../models/proyecto.model';
import { ApiResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class ProyectosService {
  private apiUrl = 'http://localhost:3000/proyectos';
  private storageKey = 'proyectos_data';

  constructor(private http: HttpClient) {}

  // 🔥 SIMULACIÓN - Obtener proyectos del localStorage
  private getProyectosFromStorage(): Proyecto[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  private saveProyectosToStorage(proyectos: Proyecto[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(proyectos));
  }

  private generateId(): string {
    return 'proj_' + Math.random().toString(36).substr(2, 9);
  }

  // Obtener todos los proyectos (para admin)
  getProyectos(): Observable<ApiResponse<Proyecto[]>> {
    const proyectos = this.getProyectosFromStorage();
    return of({
      success: true,
      data: proyectos,
      message: 'Proyectos obtenidos exitosamente'
    }).pipe(delay(500));
  }

  // Obtener proyectos del docente actual
  getMisProyectos(): Observable<ApiResponse<Proyecto[]>> {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const proyectos = this.getProyectosFromStorage();
    const misProyectos = proyectos.filter(p => p.docenteId === currentUser.id);
    
    return of({
      success: true,
      data: misProyectos,
      message: 'Mis proyectos obtenidos exitosamente'
    }).pipe(delay(500));
  }

  createProyecto(proyectoData: CreateProyectoRequest): Observable<ApiResponse<Proyecto>> {
    return new Observable(observer => {
      try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const proyectos = this.getProyectosFromStorage();
        
        const nuevoProyecto: Proyecto = {
          id: this.generateId(),
          ...proyectoData,
          docenteId: currentUser.id,
          docente: {
            id: currentUser.id,
            nombre: currentUser.nombre || 'Docente Demo',
            email: currentUser.email,
            role: currentUser.role,
            isActive: true,
            createdAt: new Date()
          },
          estado: 'BORRADOR',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        proyectos.push(nuevoProyecto);
        this.saveProyectosToStorage(proyectos);

        setTimeout(() => {
          observer.next({
            success: true,
            data: nuevoProyecto,
            message: 'Proyecto creado exitosamente'
          });
          observer.complete();
        }, 1000);

      } catch (error) {
        observer.error({
          success: false,
          message: 'Error al crear proyecto',
          error: error
        });
      }
    });
  }

  // Métodos adicionales
  getProyectoById(id: string): Observable<ApiResponse<Proyecto>> {
    const proyectos = this.getProyectosFromStorage();
    const proyecto = proyectos.find(p => p.id === id);
    return of({
      success: !!proyecto,
      data: proyecto,
      message: proyecto ? 'Proyecto encontrado' : 'Proyecto no encontrado'
    });
  }

  updateProyecto(id: string, proyecto: UpdateProyectoRequest): Observable<ApiResponse<Proyecto>> {
    const proyectos = this.getProyectosFromStorage();
    const index = proyectos.findIndex(p => p.id === id);
    
    if (index !== -1) {
      proyectos[index] = { 
        ...proyectos[index], 
        ...proyecto, 
        updatedAt: new Date()
      };
      this.saveProyectosToStorage(proyectos);
      
      return of({
        success: true,
        data: proyectos[index],
        message: 'Proyecto actualizado exitosamente'
      });
    }
    
    return of({
      success: false,
      message: 'Proyecto no encontrado'
    });
  }

  deleteProyecto(id: string): Observable<ApiResponse<void>> {
    const proyectos = this.getProyectosFromStorage();
    const filtered = proyectos.filter(p => p.id !== id);
    
    if (filtered.length < proyectos.length) {
      this.saveProyectosToStorage(filtered);
      return of({
        success: true,
        message: 'Proyecto eliminado exitosamente'
      });
    }
    
    return of({
      success: false,
      message: 'Proyecto no encontrado'
    });
  }

  // ✅ NUEVO: Enviar proyecto a revisión (docente)
  enviarARevision(proyectoId: string): Observable<ApiResponse<Proyecto>> {
    const proyectos = this.getProyectosFromStorage();
    const proyectoIndex = proyectos.findIndex(p => p.id === proyectoId);
    
    if (proyectoIndex !== -1) {
      proyectos[proyectoIndex] = {
        ...proyectos[proyectoIndex],
        estado: 'EN_REVISION',
        updatedAt: new Date()
      };
      this.saveProyectosToStorage(proyectos);
      
      return of({
        success: true,
        data: proyectos[proyectoIndex],
        message: 'Proyecto enviado a revisión exitosamente'
      }).pipe(delay(500));
    }
    
    return of({
      success: false,
      message: 'Proyecto no encontrado'
    });
  }

  // ✅ NUEVO: Aprobar proyecto (admin)
  aprobarProyecto(proyectoId: string): Observable<ApiResponse<Proyecto>> {
    const proyectos = this.getProyectosFromStorage();
    const proyectoIndex = proyectos.findIndex(p => p.id === proyectoId);
    
    if (proyectoIndex !== -1) {
      proyectos[proyectoIndex] = {
        ...proyectos[proyectoIndex],
        estado: 'APROBADO',
        updatedAt: new Date()
      };
      this.saveProyectosToStorage(proyectos);
      
      return of({
        success: true,
        data: proyectos[proyectoIndex],
        message: 'Proyecto aprobado exitosamente'
      }).pipe(delay(500));
    }
    
    return of({
      success: false,
      message: 'Proyecto no encontrado'
    });
  }

  // ✅ NUEVO: Rechazar proyecto (admin)
  rechazarProyecto(proyectoId: string): Observable<ApiResponse<Proyecto>> {
    const proyectos = this.getProyectosFromStorage();
    const proyectoIndex = proyectos.findIndex(p => p.id === proyectoId);
    
    if (proyectoIndex !== -1) {
      proyectos[proyectoIndex] = {
        ...proyectos[proyectoIndex],
        estado: 'RECHAZADO',
        updatedAt: new Date()
      };
      this.saveProyectosToStorage(proyectos);
      
      return of({
        success: true,
        data: proyectos[proyectoIndex],
        message: 'Proyecto rechazado exitosamente'
      }).pipe(delay(500));
    }
    
    return of({
      success: false,
      message: 'Proyecto no encontrado'
    });
  }

  // ✅ NUEVO: Obtener proyectos por estado
  getProyectosPorEstado(estado: string): Observable<ApiResponse<Proyecto[]>> {
    const proyectos = this.getProyectosFromStorage();
    const proyectosFiltrados = estado ? 
      proyectos.filter(p => p.estado === estado) : 
      proyectos;
    
    return of({
      success: true,
      data: proyectosFiltrados,
      message: 'Proyectos obtenidos exitosamente'
    }).pipe(delay(300));
  }
}