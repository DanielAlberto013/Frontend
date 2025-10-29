// src/app/core/services/partidas.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay } from 'rxjs';
import { PartidaPresupuestal, CreatePartidaRequest, UpdatePartidaRequest } from '../models/partida.model';
import { ApiResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class PartidasService {
  private storageKey = 'partidas_data';

  constructor(private http: HttpClient) {}

  // 🔥 MÉTODOS PARA LOCALSTORAGE
  private getPartidasFromStorage(): PartidaPresupuestal[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  private savePartidasToStorage(partidas: PartidaPresupuestal[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(partidas));
  }

  private generateId(): string {
    return 'part_' + Math.random().toString(36).substr(2, 9);
  }

  // Obtener partidas de un proyecto
  getPartidasByProyecto(proyectoId: string): Observable<ApiResponse<PartidaPresupuestal[]>> {
    const partidas = this.getPartidasFromStorage();
    const partidasProyecto = partidas.filter(p => p.proyectoId === proyectoId);
    
    return of({
      success: true,
      data: partidasProyecto,
      message: 'Partidas obtenidas exitosamente'
    }).pipe(delay(500));
  }

  // Obtener partida específica
  getPartidaById(id: string): Observable<ApiResponse<PartidaPresupuestal>> {
    const partidas = this.getPartidasFromStorage();
    const partida = partidas.find(p => p.id === id);
    
    return of({
      success: !!partida,
      data: partida,
      message: partida ? 'Partida encontrada' : 'Partida no encontrada'
    });
  }

  // Crear partida para proyecto
  createPartida(partida: CreatePartidaRequest): Observable<ApiResponse<PartidaPresupuestal>> {
    return new Observable(observer => {
      try {
        const partidas = this.getPartidasFromStorage();
        
        const nuevaPartida: PartidaPresupuestal = {
          id: this.generateId(),
          ...partida,
          saldoDisponible: partida.importeAsignado, // ✅ Saldo inicial igual al importe asignado
          createdAt: new Date(),
          updatedAt: new Date()
        };

        partidas.push(nuevaPartida);
        this.savePartidasToStorage(partidas);

        setTimeout(() => {
          observer.next({
            success: true,
            data: nuevaPartida,
            message: 'Partida creada exitosamente'
          });
          observer.complete();
        }, 500);

      } catch (error) {
        observer.error({
          success: false,
          message: 'Error al crear partida',
          error: error
        });
      }
    });
  }

  // Actualizar partida (principalmente saldo)
  updatePartida(id: string, partida: UpdatePartidaRequest): Observable<ApiResponse<PartidaPresupuestal>> {
    const partidas = this.getPartidasFromStorage();
    const index = partidas.findIndex(p => p.id === id);
    
    if (index !== -1) {
      partidas[index] = { 
        ...partidas[index], 
        ...partida,
        updatedAt: new Date()
      };
      this.savePartidasToStorage(partidas);
      
      return of({
        success: true,
        data: partidas[index],
        message: 'Partida actualizada exitosamente'
      });
    }
    
    return of({
      success: false,
      message: 'Partida no encontrada'
    });
  }

  // Validar si hay saldo suficiente en partida
  validarSaldo(partidaId: string, montoRequerido: number): Observable<ApiResponse<{ suficiente: boolean; saldoActual: number }>> {
    const partidas = this.getPartidasFromStorage();
    const partida = partidas.find(p => p.id === partidaId);
    
    if (partida) {
      const suficiente = partida.saldoDisponible >= montoRequerido;
      
      return of({
        success: true,
        data: {
          suficiente: suficiente,
          saldoActual: partida.saldoDisponible
        },
        message: suficiente ? 'Saldo suficiente' : 'Saldo insuficiente'
      });
    }
    
    return of({
      success: false,
      message: 'Partida no encontrada'
    });
  }

  // ✅ MÉTODO: Actualizar saldo después de crear cotización
  actualizarSaldoPartida(partidaId: string, montoUtilizado: number): Observable<ApiResponse<PartidaPresupuestal>> {
    const partidas = this.getPartidasFromStorage();
    const index = partidas.findIndex(p => p.id === partidaId);
    
    if (index !== -1) {
      const nuevoSaldo = partidas[index].saldoDisponible - montoUtilizado;
      
      if (nuevoSaldo >= 0) {
        partidas[index].saldoDisponible = nuevoSaldo;
        partidas[index].updatedAt = new Date();
        this.savePartidasToStorage(partidas);
        
        return of({
          success: true,
          data: partidas[index],
          message: 'Saldo actualizado exitosamente'
        });
      } else {
        return of({
          success: false,
          message: 'Saldo insuficiente para realizar la operación'
        });
      }
    }
    
    return of({
      success: false,
      message: 'Partida no encontrada'
    });
  }

  // ✅ MÉTODO: Obtener partida por código y proyecto
  getPartidaByCodigo(proyectoId: string, codigo: string): Observable<ApiResponse<PartidaPresupuestal>> {
    const partidas = this.getPartidasFromStorage();
    const partida = partidas.find(p => p.proyectoId === proyectoId && p.codigo === codigo);
    
    return of({
      success: !!partida,
      data: partida,
      message: partida ? 'Partida encontrada' : 'Partida no encontrada'
    });
  }

  // ✅ MÉTODO: Eliminar partidas de un proyecto (para cuando se elimine el proyecto)
  eliminarPartidasDeProyecto(proyectoId: string): Observable<ApiResponse<void>> {
    const partidas = this.getPartidasFromStorage();
    const partidasFiltradas = partidas.filter(p => p.proyectoId !== proyectoId);
    
    if (partidasFiltradas.length < partidas.length) {
      this.savePartidasToStorage(partidasFiltradas);
      return of({
        success: true,
        message: 'Partidas eliminadas exitosamente'
      });
    }
    
    return of({
      success: false,
      message: 'No se encontraron partidas para eliminar'
    });
  }

  // ✅ MÉTODO CORREGIDO: Eliminar partidas por proyecto (para actualización)
  deletePartidasByProyecto(proyectoId: string): Observable<ApiResponse<void>> {
    try {
      const partidas = this.getPartidasFromStorage();
      const partidasFiltradas = partidas.filter(p => p.proyectoId !== proyectoId);
      
      // Si se eliminaron partidas, guardar los cambios
      if (partidasFiltradas.length < partidas.length) {
        this.savePartidasToStorage(partidasFiltradas);
        return of({
          success: true,
          message: 'Partidas eliminadas exitosamente'
        }).pipe(delay(500));
      } else {
        // No había partidas para eliminar, pero se considera éxito
        return of({
          success: true,
          message: 'No se encontraron partidas para eliminar'
        });
      }
    } catch (error) {
      return of({
        success: false,
        message: 'Error al eliminar partidas'
      });
    }
  }

  // ✅ MÉTODO NUEVO: Eliminar partida específica
  deletePartida(id: string): Observable<ApiResponse<void>> {
    const partidas = this.getPartidasFromStorage();
    const partidasFiltradas = partidas.filter(p => p.id !== id);
    
    if (partidasFiltradas.length < partidas.length) {
      this.savePartidasToStorage(partidasFiltradas);
      return of({
        success: true,
        message: 'Partida eliminada exitosamente'
      });
    }
    
    return of({
      success: false,
      message: 'Partida no encontrada'
    });
  }

  // ✅ MÉTODO NUEVO: Obtener todas las partidas (para admin)
  getAllPartidas(): Observable<ApiResponse<PartidaPresupuestal[]>> {
    const partidas = this.getPartidasFromStorage();
    return of({
      success: true,
      data: partidas,
      message: 'Partidas obtenidas exitosamente'
    });
  }

  // ✅ MÉTODO NUEVO: Obtener resumen de partidas por proyecto
  getResumenPartidasByProyecto(proyectoId: string): Observable<ApiResponse<{
    totalAsignado: number;
    totalUtilizado: number;
    saldoTotal: number;
    partidas: PartidaPresupuestal[];
  }>> {
    const partidas = this.getPartidasFromStorage();
    const partidasProyecto = partidas.filter(p => p.proyectoId === proyectoId);
    
    const totalAsignado = partidasProyecto.reduce((sum, partida) => sum + partida.importeAsignado, 0);
    const totalUtilizado = partidasProyecto.reduce((sum, partida) => sum + (partida.importeAsignado - partida.saldoDisponible), 0);
    const saldoTotal = partidasProyecto.reduce((sum, partida) => sum + partida.saldoDisponible, 0);
    
    return of({
      success: true,
      data: {
        totalAsignado,
        totalUtilizado,
        saldoTotal,
        partidas: partidasProyecto
      },
      message: 'Resumen de partidas obtenido exitosamente'
    });
  }
}