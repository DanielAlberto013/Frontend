// src/app/core/services/cotizaciones.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, switchMap, forkJoin, of } from 'rxjs';
import { Cotizacion, CreateCotizacionRequest, UpdateCotizacionRequest, CotizacionItem } from '../models/cotizacion.model';
import { ApiResponse } from '../models/user.model';
import { PartidasService } from './partidas.service';
import { ArticulosService } from './articulos.service';
import { Article } from '../models/article.model';

@Injectable({
  providedIn: 'root'
})
export class CotizacionesService {
  private apiUrl = 'http://localhost:3000/cotizaciones';
  private storageKey = 'cotizaciones_data';

  constructor(
    private http: HttpClient,
    private partidasService: PartidasService,
    private articulosService: ArticulosService
  ) {}

  private getCotizacionesFromStorage(): Cotizacion[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  private saveCotizacionesToStorage(cotizaciones: Cotizacion[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(cotizaciones));
  }

  private generateId(): string {
    return 'cot_' + Math.random().toString(36).substr(2, 9);
  }

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

  // ✅ NUEVO: Método para calcular saldos por fuente
  calcularSaldosPorFuente(proyectoId: string): Observable<{federal: number, estatal: number}> {
    const proyectos = JSON.parse(localStorage.getItem('proyectos_data') || '[]');
    const proyecto = proyectos.find((p: any) => p.id === proyectoId);
    
    if (!proyecto) {
      return of({ federal: 0, estatal: 0 });
    }

    const cotizaciones = this.getCotizacionesFromStorage();
    const cotizacionesProyecto = cotizaciones.filter(c => c.proyectoId === proyectoId);

    // Calcular total utilizado por cada fuente
    const totalFederalUtilizado = cotizacionesProyecto
      .filter(c => c.fuente === 'FEDERAL')
      .reduce((sum, c) => sum + c.total, 0);

    const totalEstatalUtilizado = cotizacionesProyecto
      .filter(c => c.fuente === 'ESTATAL')
      .reduce((sum, c) => sum + c.total, 0);

    // Calcular saldos disponibles
    const saldoFederal = Math.max(0, proyecto.presupuestoFederal - totalFederalUtilizado);
    const saldoEstatal = Math.max(0, proyecto.presupuestoEstatal - totalEstatalUtilizado);

    console.log('💰 Saldos calculados:', {
      proyecto: proyectoId,
      presupuestoFederal: proyecto.presupuestoFederal,
      presupuestoEstatal: proyecto.presupuestoEstatal,
      utilizadoFederal: totalFederalUtilizado,
      utilizadoEstatal: totalEstatalUtilizado,
      saldoFederal: saldoFederal,
      saldoEstatal: saldoEstatal
    });

    return of({ federal: saldoFederal, estatal: saldoEstatal });
  }

  createCotizacion(cotizacionData: CreateCotizacionRequest): Observable<ApiResponse<Cotizacion>> {
    return new Observable(observer => {
      try {
        const cotizaciones = this.getCotizacionesFromStorage();
        
        // ✅ VERIFICAR SI YA EXISTE CUALQUIER COTIZACIÓN PARA ESTA PARTIDA EN EL MISMO PROYECTO
        const cotizacionExistente = cotizaciones.find(c => 
          c.proyectoId === cotizacionData.proyectoId &&
          c.partidaCodigo === cotizacionData.partidaCodigo
        );
        
        if (cotizacionExistente) {
          observer.error({
            success: false,
            message: `Ya existe una cotización para la partida ${cotizacionData.partidaCodigo} en este proyecto. No puedes crear cotizaciones adicionales para esta partida.`
          });
          return;
        }

        // Obtener artículos para enriquecer los items
        this.articulosService.getArticulos().subscribe({
          next: (articulosResponse) => {
            if (articulosResponse.success && articulosResponse.data) {
              const articulos = articulosResponse.data;
              
              // Crear items enriquecidos con datos del artículo
              const itemsEnriquecidos: CotizacionItem[] = cotizacionData.items.map(item => {
                const articulo = articulos.find(a => a.id === item.articuloId);
                const subtotal = item.cantidad * item.precioUnitario;
                
                return {
                  id: this.generateId(),
                  articuloId: item.articuloId,
                  articulo: articulo || this.crearArticuloDefault(item.articuloId),
                  cantidad: item.cantidad,
                  precioUnitario: item.precioUnitario,
                  subtotal: subtotal
                };
              });

              // ✅ CALCULAR CON IVA EXACTO
              const subtotal = itemsEnriquecidos.reduce((sum, item) => sum + item.subtotal, 0);
              const iva = subtotal * 0.16; // IVA exacto 16%
              const total = subtotal + iva;

              console.log('🧮 Cálculos de cotización:', {
                subtotal: subtotal,
                iva: iva,
                total: total,
                ivaPorcentaje: '16%'
              });

              const nuevaCotizacion: Cotizacion = {
                id: this.generateId(),
                proyectoId: cotizacionData.proyectoId,
                partidaCodigo: cotizacionData.partidaCodigo,
                fuente: cotizacionData.fuente,
                items: itemsEnriquecidos,
                subtotal: subtotal,
                iva: iva,
                total: total,
                estado: 'BORRADOR',
                createdAt: new Date(),
                updatedAt: new Date()
              };

              cotizaciones.push(nuevaCotizacion);
              this.saveCotizacionesToStorage(cotizaciones);

              console.log('✅ Cotización creada:', {
                proyectoId: nuevaCotizacion.proyectoId,
                partida: nuevaCotizacion.partidaCodigo,
                fuente: nuevaCotizacion.fuente,
                subtotal: nuevaCotizacion.subtotal,
                iva: nuevaCotizacion.iva,
                total: nuevaCotizacion.total
              });

              // Enriquecer con datos de partida antes de retornar
              this.enriquecerCotizacionConPartida(nuevaCotizacion).subscribe(cotizacionEnriquecida => {
                observer.next({
                  success: true,
                  data: cotizacionEnriquecida,
                  message: 'Cotización creada exitosamente'
                });
                observer.complete();
              });

            } else {
              observer.error({
                success: false,
                message: 'Error al obtener artículos para la cotización'
              });
            }
          },
          error: (error) => {
            observer.error({
              success: false,
              message: 'Error al obtener artículos',
              error: error
            });
          }
        });

      } catch (error) {
        console.error('❌ Error al crear cotización:', error);
        observer.error({
          success: false,
          message: 'Error al crear cotización',
          error: error
        });
      }
    });
  }

  private crearArticuloDefault(articuloId: string): Article {
    return {
      id: articuloId,
      nombre: 'Artículo no encontrado',
      partidaCodigo: '00000',
      precioReferencia: 0,
      activo: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  getCotizaciones(): Observable<ApiResponse<Cotizacion[]>> {
    const cotizaciones = this.getCotizacionesFromStorage();
    
    console.log('📊 Todas las cotizaciones en sistema:', cotizaciones.map(c => ({
      id: c.id,
      proyecto: c.proyectoId,
      partida: c.partidaCodigo,
      fuente: c.fuente,
      estado: c.estado,
      subtotal: c.subtotal,
      iva: c.iva,
      total: c.total
    })));

    if (cotizaciones.length === 0) {
      return of({
        success: true,
        data: [],
        message: 'No hay cotizaciones en el sistema'
      });
    }

    const cotizacionesEnriquecidas$ = cotizaciones.map(cotizacion => 
      this.enriquecerCotizacionConPartida(cotizacion)
    );

    return forkJoin(cotizacionesEnriquecidas$).pipe(
      map(cotizacionesEnriquecidas => ({
        success: true,
        data: cotizacionesEnriquecidas,
        message: 'Cotizaciones obtenidas exitosamente'
      }))
    );
  }

  getMisCotizaciones(): Observable<ApiResponse<Cotizacion[]>> {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const proyectos = JSON.parse(localStorage.getItem('proyectos_data') || '[]');
    
    const misProyectosIds = proyectos
      .filter((p: any) => p.docenteId === currentUser.id)
      .map((p: any) => p.id);

    const cotizaciones = this.getCotizacionesFromStorage();
    const misCotizaciones = cotizaciones.filter(c => 
      misProyectosIds.includes(c.proyectoId)
    );

    console.log('👤 Cotizaciones del docente:', misCotizaciones.map(c => ({
      proyecto: c.proyectoId,
      partida: c.partidaCodigo,
      fuente: c.fuente,
      subtotal: c.subtotal,
      iva: c.iva,
      total: c.total
    })));

    if (misCotizaciones.length === 0) {
      return of({
        success: true,
        data: [],
        message: 'No tienes cotizaciones'
      });
    }

    const cotizacionesEnriquecidas$ = misCotizaciones.map(cotizacion => 
      this.enriquecerCotizacionConPartida(cotizacion)
    );

    return forkJoin(cotizacionesEnriquecidas$).pipe(
      map(cotizacionesEnriquecidas => ({
        success: true,
        data: cotizacionesEnriquecidas,
        message: 'Mis cotizaciones obtenidas exitosamente'
      }))
    );
  }

  getCotizacionesByProyecto(proyectoId: string): Observable<ApiResponse<Cotizacion[]>> {
    const cotizaciones = this.getCotizacionesFromStorage();
    const cotizacionesProyecto = cotizaciones.filter(c => c.proyectoId === proyectoId);

    console.log('📋 Cotizaciones del proyecto', proyectoId + ':', cotizacionesProyecto.map(c => ({
      partida: c.partidaCodigo,
      fuente: c.fuente,
      estado: c.estado,
      subtotal: c.subtotal,
      iva: c.iva,
      total: c.total
    })));

    if (cotizacionesProyecto.length === 0) {
      return of({
        success: true,
        data: [],
        message: 'No hay cotizaciones para este proyecto'
      });
    }

    const cotizacionesEnriquecidas$ = cotizacionesProyecto.map(cotizacion => 
      this.enriquecerCotizacionConPartida(cotizacion)
    );

    return forkJoin(cotizacionesEnriquecidas$).pipe(
      map(cotizacionesEnriquecidas => ({
        success: true,
        data: cotizacionesEnriquecidas,
        message: 'Cotizaciones del proyecto obtenidas exitosamente'
      }))
    );
  }

  // ✅ NUEVO: Obtener cotizaciones por partida en un proyecto específico
  getCotizacionesByPartida(proyectoId: string, partidaCodigo: string): Observable<ApiResponse<Cotizacion[]>> {
    const cotizaciones = this.getCotizacionesFromStorage();
    const cotizacionesFiltradas = cotizaciones.filter(c => 
      c.proyectoId === proyectoId && 
      c.partidaCodigo === partidaCodigo
    );

    console.log('🔍 Buscando cotizaciones para:', { 
      proyectoId, 
      partidaCodigo, 
      encontradas: cotizacionesFiltradas.length,
      detalles: cotizacionesFiltradas.map(c => ({ fuente: c.fuente, estado: c.estado }))
    });

    if (cotizacionesFiltradas.length === 0) {
      return of({
        success: true,
        data: [],
        message: 'No hay cotizaciones para esta partida en este proyecto'
      });
    }

    const cotizacionesEnriquecidas$ = cotizacionesFiltradas.map(cotizacion => 
      this.enriquecerCotizacionConPartida(cotizacion)
    );

    return forkJoin(cotizacionesEnriquecidas$).pipe(
      map(cotizacionesEnriquecidas => ({
        success: true,
        data: cotizacionesEnriquecidas,
        message: 'Cotizaciones obtenidas exitosamente'
      }))
    );
  }

  getCotizacionById(id: string): Observable<ApiResponse<Cotizacion>> {
    const cotizaciones = this.getCotizacionesFromStorage();
    const cotizacion = cotizaciones.find(c => c.id === id);
    
    if (cotizacion) {
      return this.enriquecerCotizacionConPartida(cotizacion).pipe(
        map(cotizacionEnriquecida => ({
          success: true,
          data: cotizacionEnriquecida,
          message: 'Cotización encontrada'
        }))
      );
    }
    
    return of({
      success: false,
      message: 'Cotización no encontrada'
    });
  }

  updateCotizacion(id: string, cotizacionData: UpdateCotizacionRequest): Observable<ApiResponse<Cotizacion>> {
    const cotizaciones = this.getCotizacionesFromStorage();
    const index = cotizaciones.findIndex(c => c.id === id);
    
    if (index !== -1) {
      cotizaciones[index] = { 
        ...cotizaciones[index], 
        ...cotizacionData,
        updatedAt: new Date()
      };
      this.saveCotizacionesToStorage(cotizaciones);
      
      console.log('✅ Cotización actualizada:', cotizaciones[index]);

      return this.enriquecerCotizacionConPartida(cotizaciones[index]).pipe(
        map(cotizacionEnriquecida => ({
          success: true,
          data: cotizacionEnriquecida,
          message: 'Cotización actualizada exitosamente'
        }))
      );
    }
    
    return of({
      success: false,
      message: 'Cotización no encontrada'
    });
  }

  // ✅ MANTENIDO: Obtener cotizaciones por partida y fuente (para otros usos)
  getCotizacionesByPartidaYFuente(proyectoId: string, partidaCodigo: string, fuente: 'FEDERAL' | 'ESTATAL'): Observable<ApiResponse<Cotizacion[]>> {
    const cotizaciones = this.getCotizacionesFromStorage();
    const cotizacionesFiltradas = cotizaciones.filter(c => 
      c.proyectoId === proyectoId && 
      c.partidaCodigo === partidaCodigo &&
      c.fuente === fuente
    );

    console.log('🔍 Buscando cotizaciones específicas:', { 
      proyectoId, 
      partidaCodigo, 
      fuente,
      encontradas: cotizacionesFiltradas.length 
    });

    if (cotizacionesFiltradas.length === 0) {
      return of({
        success: true,
        data: [],
        message: 'No hay cotizaciones para esta combinación'
      });
    }

    const cotizacionesEnriquecidas$ = cotizacionesFiltradas.map(cotizacion => 
      this.enriquecerCotizacionConPartida(cotizacion)
    );

    return forkJoin(cotizacionesEnriquecidas$).pipe(
      map(cotizacionesEnriquecidas => ({
        success: true,
        data: cotizacionesEnriquecidas,
        message: 'Cotizaciones obtenidas exitosamente'
      }))
    );
  }

  // ✅ NUEVO: Calcular total utilizado por partida en proyecto específico
  calcularTotalUtilizadoPorPartida(proyectoId: string, partidaCodigo: string): Observable<number> {
    const cotizaciones = this.getCotizacionesFromStorage();
    const cotizacionesFiltradas = cotizaciones.filter(c => 
      c.proyectoId === proyectoId && 
      c.partidaCodigo === partidaCodigo
    );

    const total = cotizacionesFiltradas.reduce((sum, cotizacion) => sum + cotizacion.total, 0);
    console.log('💰 Total utilizado por partida en proyecto:', { 
      proyectoId, 
      partidaCodigo, 
      total,
      cotizaciones: cotizacionesFiltradas.length 
    });
    return of(total);
  }

  // ✅ MANTENIDO: Calcular total utilizado por fuente
  calcularTotalUtilizadoPorFuente(proyectoId: string, partidaCodigo: string, fuente: 'FEDERAL' | 'ESTATAL'): Observable<number> {
    const cotizaciones = this.getCotizacionesFromStorage();
    const cotizacionesFiltradas = cotizaciones.filter(c => 
      c.proyectoId === proyectoId && 
      c.partidaCodigo === partidaCodigo &&
      c.fuente === fuente
    );

    const total = cotizacionesFiltradas.reduce((sum, cotizacion) => sum + cotizacion.total, 0);
    return of(total);
  }

  // ✅ NUEVO: Método para limpiar datos de prueba (solo desarrollo)
  limpiarDatosPrueba(): void {
    localStorage.removeItem(this.storageKey);
    console.log('🧹 Datos de cotizaciones limpiados');
  }

  generarPdf(id: string): Observable<Blob> {
    const blob = new Blob(['Simulación de PDF'], { type: 'application/pdf' });
    return of(blob);
  }

  generarExcel(id: string): Observable<Blob> {
    const blob = new Blob(['Simulación de Excel'], { type: 'application/vnd.ms-excel' });
    return of(blob);
  }

  aprobarCotizacion(id: string): Observable<ApiResponse<Cotizacion>> {
    return this.updateCotizacion(id, { estado: 'APROBADO' });
  }

  rechazarCotizacion(id: string): Observable<ApiResponse<Cotizacion>> {
    return this.updateCotizacion(id, { estado: 'RECHAZADO' });
  }

  enviarARevision(id: string): Observable<ApiResponse<Cotizacion>> {
    return this.updateCotizacion(id, { estado: 'EN_REVISION' });
  }
}