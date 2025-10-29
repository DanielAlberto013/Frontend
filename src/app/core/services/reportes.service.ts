// src/app/core/services/reportes.service.ts
import { Injectable } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { ProyectosService } from './proyectos.service';
import { PartidasService } from './partidas.service';
import { CotizacionesService } from './cotizaciones.service';
import { Proyecto } from '../models/proyecto.model';
import { PartidaPresupuestal } from '../models/partida.model';
import { ApiResponse, User } from '../models/user.model';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface ReportePorPartida {
  partidaId: string;
  partidaCodigo: string;
  partidaNombre: string;
  totalPartida: number;
  proyectos: {
    proyectoId: string;
    proyectoNombre: string;
    docenteNombre: string;
    presupuestoTotal: number;
    presupuestoFederal: number;
    presupuestoEstatal: number;
    tieneCotizaciones: boolean;
    totalCotizaciones: number;
  }[];
  agrupadoPorDocente: {
    docenteId: string;
    docenteNombre: string;
    proyectos: {
      proyectoId: string;
      proyectoNombre: string;
      presupuestoTotal: number;
      tieneCotizaciones: boolean;
    }[];
    totalDocente: number;
  }[];
}

export interface TicketDocente {
  docenteNombre: string;
  proyectos: Proyecto[];
  totalGeneral: number;
  fechaGeneracion: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ReportesService {
  constructor(
    private proyectosService: ProyectosService,
    private partidasService: PartidasService,
    private cotizacionesService: CotizacionesService
  ) {}

  // ✅ MÉTODO MEJORADO: Reporte por partida con información de cotizaciones - CORREGIDO
  getReportePorPartida(): Observable<ReportePorPartida[]> {
    return this.proyectosService.getProyectosPorEstado('APROBADO').pipe(
      switchMap((response: ApiResponse<Proyecto[]>) => {
        const proyectos = response.data || [];
        
        if (proyectos.length === 0) {
          return of([]);
        }

        // Para cada proyecto, obtener sus cotizaciones
        const proyectosConCotizaciones$ = proyectos.map(proyecto => 
          this.cotizacionesService.getCotizacionesByProyecto(proyecto.id).pipe(
            map(cotizacionesResponse => ({
              proyecto,
              cotizaciones: cotizacionesResponse.success && cotizacionesResponse.data ? 
                cotizacionesResponse.data : []
            }))
          )
        );

        return forkJoin(proyectosConCotizaciones$).pipe(
          map(proyectosConCotizaciones => {
            // Agrupar por partida
            const partidasMap = new Map<string, ReportePorPartida>();

            proyectosConCotizaciones.forEach(({ proyecto, cotizaciones }) => {
              // ✅ CORREGIDO: Verificar que cotizaciones existe antes de usarlo
              if (cotizaciones && cotizaciones.length > 0) {
                // Procesar cada cotización del proyecto
                cotizaciones.forEach((cotizacion: any) => {
                  const partidaCodigo = cotizacion.partidaCodigo;
                  
                  if (!partidasMap.has(partidaCodigo)) {
                    partidasMap.set(partidaCodigo, {
                      partidaId: partidaCodigo,
                      partidaCodigo: partidaCodigo,
                      partidaNombre: cotizacion.nombrePartida || `Partida ${partidaCodigo}`,
                      totalPartida: 0,
                      proyectos: [],
                      agrupadoPorDocente: []
                    });
                  }

                  const partida = partidasMap.get(partidaCodigo)!;
                  
                  // Verificar si el proyecto ya está en esta partida
                  const proyectoExistente = partida.proyectos.find(p => p.proyectoId === proyecto.id);
                  
                  if (!proyectoExistente) {
                    partida.proyectos.push({
                      proyectoId: proyecto.id,
                      proyectoNombre: proyecto.nombre,
                      docenteNombre: this.obtenerNombreDocente(proyecto),
                      presupuestoTotal: proyecto.presupuestoTotal,
                      presupuestoFederal: proyecto.presupuestoFederal,
                      presupuestoEstatal: proyecto.presupuestoEstatal,
                      tieneCotizaciones: cotizaciones.length > 0,
                      totalCotizaciones: cotizaciones.reduce((sum: number, cot: any) => sum + (cot.total || 0), 0)
                    });
                  }

                  // Sumar el total de la cotización al total de la partida
                  partida.totalPartida += cotizacion.total || 0;
                });
              }

              // ✅ CORREGIDO: Verificar que cotizaciones existe antes de verificar length
              if (!cotizaciones || cotizaciones.length === 0) {
                const partidaGeneral = 'SIN-COTIZACION';
                if (!partidasMap.has(partidaGeneral)) {
                  partidasMap.set(partidaGeneral, {
                    partidaId: partidaGeneral,
                    partidaCodigo: partidaGeneral,
                    partidaNombre: 'Proyectos sin cotizaciones',
                    totalPartida: 0,
                    proyectos: [],
                    agrupadoPorDocente: []
                  });
                }

                const partida = partidasMap.get(partidaGeneral)!;
                partida.proyectos.push({
                  proyectoId: proyecto.id,
                  proyectoNombre: proyecto.nombre,
                  docenteNombre: this.obtenerNombreDocente(proyecto),
                  presupuestoTotal: proyecto.presupuestoTotal,
                  presupuestoFederal: proyecto.presupuestoFederal,
                  presupuestoEstatal: proyecto.presupuestoEstatal,
                  tieneCotizaciones: false,
                  totalCotizaciones: 0
                });
              }
            });

            // Calcular agrupado por docente
            Array.from(partidasMap.values()).forEach(partida => {
              partida.agrupadoPorDocente = this.agruparPorDocente(partida.proyectos);
            });

            return Array.from(partidasMap.values());
          })
        );
      })
    );
  }

  // ✅ MÉTODO AUXILIAR: Agrupar proyectos por docente - MEJORADO
  private agruparPorDocente(proyectos: any[]): any[] {
    const docentesMap = new Map();
    
    proyectos.forEach(proyecto => {
      const docenteId = proyecto.docenteId || 'default';
      const docenteNombre = proyecto.docenteNombre;
      
      if (!docentesMap.has(docenteId)) {
        docentesMap.set(docenteId, {
          docenteId: docenteId,
          docenteNombre: docenteNombre,
          proyectos: [],
          totalDocente: 0
        });
      }
      
      const docente = docentesMap.get(docenteId);
      docente.proyectos.push({
        proyectoId: proyecto.proyectoId,
        proyectoNombre: proyecto.proyectoNombre,
        presupuestoTotal: proyecto.presupuestoTotal,
        tieneCotizaciones: proyecto.tieneCotizaciones
      });
      docente.totalDocente += proyecto.presupuestoTotal;
    });
    
    return Array.from(docentesMap.values());
  }

   // ✅ MÉTODO PARA TICKET DEL DOCENTE - CORREGIDO
   getTicketDocente(): Observable<TicketDocente> {
    return this.proyectosService.getProyectosPorEstado('APROBADO').pipe(
      switchMap((response: ApiResponse<Proyecto[]>) => {
        const proyectos = response.data || [];
        
        // En una implementación real, aquí filtrarías por el docente logueado
        const proyectosDocente = proyectos; // proyectos.filter(p => p.docenteId === docenteIdLogueado);
        
        // Para cada proyecto, obtener información de cotizaciones
        const proyectosConInfo$ = proyectosDocente.map(proyecto => 
          this.cotizacionesService.getCotizacionesByProyecto(proyecto.id).pipe(
            map(cotizacionesResponse => ({
              ...proyecto,
              // ✅ CORREGIDO: Verificar que data existe
              tieneCotizaciones: cotizacionesResponse.success && cotizacionesResponse.data && cotizacionesResponse.data.length > 0,
              totalCotizaciones: cotizacionesResponse.success && cotizacionesResponse.data ? 
                cotizacionesResponse.data.reduce((sum: number, cot: any) => sum + (cot.total || 0), 0) : 0
            }))
          )
        );

        return forkJoin(proyectosConInfo$).pipe(
          map(proyectosConInfo => {
            const totalGeneral = proyectosConInfo.reduce((sum: number, proyecto: any) => 
              sum + proyecto.presupuestoTotal, 0
            );
            
            // Obtener nombre del primer docente como demo
            const docenteNombre = proyectosConInfo.length > 0 
              ? this.obtenerNombreDocente(proyectosConInfo[0])
              : 'Docente Demo';
            
            return {
              docenteNombre: docenteNombre,
              proyectos: proyectosConInfo,
              totalGeneral: totalGeneral,
              fechaGeneracion: new Date()
            };
          })
        );
      })
    );
  }

  // ✅ MÉTODO AUXILIAR: Obtener nombre del docente
  private obtenerNombreDocente(proyecto: Proyecto): string {
    if (proyecto.docente && proyecto.docente.nombre) {
      return proyecto.docente.nombre;
    }
    return 'Docente no asignado';
  }

  // ✅ MÉTODO PARA REPORTE EXCEL - MEJORADO
  generarReporteExcel(reportes: ReportePorPartida[]): void {
    if (reportes.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    try {
      // Preparar datos para Excel
      const datosExcel: any[] = [];
      
      // Encabezado mejorado
      datosExcel.push({
        'Partida': 'PARTIDA',
        'Proyecto': 'PROYECTO', 
        'Docente': 'DOCENTE',
        'Estado Cotizaciones': 'ESTADO COTIZACIONES',
        'Total Cotizaciones': 'TOTAL COTIZACIONES',
        'Presupuesto Total': 'PRESUPUESTO TOTAL',
        'Federal': 'FEDERAL',
        'Estatal': 'ESTATAL'
      });
      
      reportes.forEach(partida => {
        // Fila de partida con total
        datosExcel.push({
          'Partida': `${partida.partidaCodigo} - ${partida.partidaNombre}`,
          'Proyecto': 'TOTAL PARTIDA:',
          'Docente': '',
          'Estado Cotizaciones': '',
          'Total Cotizaciones': `$${partida.totalPartida.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
          'Presupuesto Total': '',
          'Federal': '',
          'Estatal': ''
        });
        
        // Proyectos de la partida
        partida.proyectos.forEach(proyecto => {
          datosExcel.push({
            'Partida': '',
            'Proyecto': proyecto.proyectoNombre,
            'Docente': proyecto.docenteNombre,
            'Estado Cotizaciones': proyecto.tieneCotizaciones ? '✅ CON COTIZACIONES' : '❌ SIN COTIZACIONES',
            'Total Cotizaciones': `$${proyecto.totalCotizaciones.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
            'Presupuesto Total': `$${proyecto.presupuestoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
            'Federal': `$${proyecto.presupuestoFederal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
            'Estatal': `$${proyecto.presupuestoEstatal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
          });
        });
        
        // Línea separadora
        datosExcel.push({
          'Partida': '', 'Proyecto': '', 'Docente': '', 'Estado Cotizaciones': '', 'Total Cotizaciones': '', 'Presupuesto Total': '', 'Federal': '', 'Estatal': ''
        });
      });

      // Calcular total general
      const totalGeneral = reportes.reduce((sum, partida) => sum + partida.totalPartida, 0);
      const totalPresupuesto = reportes.reduce((sum, partida) => 
        sum + partida.proyectos.reduce((projSum, proj) => projSum + proj.presupuestoTotal, 0), 0
      );

      datosExcel.push({
        'Partida': 'TOTAL GENERAL',
        'Proyecto': '',
        'Docente': '', 
        'Estado Cotizaciones': '',
        'Total Cotizaciones': `$${totalGeneral.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        'Presupuesto Total': `$${totalPresupuesto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        'Federal': '',
        'Estatal': ''
      });

      // Simular descarga de Excel
      this.descargarComoExcel(datosExcel, `reporte-proyectos-${new Date().toISOString().split('T')[0]}`);
      
    } catch (error) {
      console.error('Error generando Excel:', error);
      alert('Error al generar reporte Excel');
    }
  }

  // ✅ MÉTODO AUXILIAR: Simular descarga de Excel
  private descargarComoExcel(datos: any[], nombreArchivo: string): void {
    const csvContent = this.convertirACSV(datos);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${nombreArchivo}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert('📊 Reporte exportado como CSV');
  }

  // ✅ MÉTODO AUXILIAR: Convertir datos a CSV
  private convertirACSV(datos: any[]): string {
    const headers = Object.keys(datos[0]);
    const csvRows = [];
    
    // Encabezados
    csvRows.push(headers.join(','));
    
    // Datos
    for (const row of datos) {
      const values = headers.map(header => {
        const value = row[header] || '';
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }

  // ✅ MÉTODO OPTIMIZADO: Generar reporte en PDF - MEJORADO
  generarReportePDF(proyectos: any[]): void {
    if (proyectos.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    try {
      const doc = new jsPDF('landscape');
      
      // Título
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text('REPORTE DE PROYECTOS APROBADOS CON COTIZACIONES', 148, 20, { align: 'center' });
      
      // Información de la institución
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('ITESCAM - Sistema de Finanzas', 148, 27, { align: 'center' });
      doc.text(`Generado el: ${new Date().toLocaleDateString('es-MX')}`, 148, 32, { align: 'center' });

      // Estadísticas
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.text(`Total de Proyectos: ${proyectos.length}`, 20, 45);
      const totalPresupuesto = proyectos.reduce((sum: number, p: any) => sum + p.presupuestoTotal, 0);
      doc.text(`Presupuesto Total: $${totalPresupuesto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 20, 50);
      
      const proyectosConCotizaciones = proyectos.filter((p: any) => p.tieneCotizaciones).length;
      doc.text(`Proyectos con Cotizaciones: ${proyectosConCotizaciones}/${proyectos.length}`, 20, 55);

      // Preparar datos para la tabla
      const tableData = proyectos.map((proyecto: any) => [
        this.truncarTexto(proyecto.proyectoNombre, 30),
        this.truncarTexto(proyecto.docenteNombre, 20),
        proyecto.partidaCodigo || 'N/A',
        proyecto.tieneCotizaciones ? '✅' : '❌',
        `$${(proyecto.totalCotizaciones || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        `$${proyecto.presupuestoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        `$${proyecto.presupuestoFederal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        `$${proyecto.presupuestoEstatal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
      ]);

      // Crear tabla
      (doc as any).autoTable({
        startY: 60,
        head: [['Proyecto', 'Docente', 'Partida', 'Cotiz.', 'Total Cotiz.', 'Total', 'Federal', 'Estatal']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [58, 83, 155],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8
        },
        styles: {
          fontSize: 7,
          cellPadding: 2,
          overflow: 'linebreak'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        margin: { top: 60 }
      });

      // Guardar PDF
      doc.save(`reporte-proyectos-${new Date().toISOString().split('T')[0]}.pdf`);
      
      alert('📄 Reporte PDF generado exitosamente');
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      this.generarReporteSimple(proyectos);
    }
  }

  // ✅ MÉTODO OPTIMIZADO: Generar ticket en PDF - MEJORADO
  generarTicketPDF(ticket: TicketDocente): void {
    if (ticket.proyectos.length === 0) {
      alert('No hay proyectos aprobados para generar el ticket');
      return;
    }

    try {
      const doc = new jsPDF();
      
      // Encabezado
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text('TICKET DE PROYECTOS APROBADOS', 105, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('ITESCAM - Sistema de Finanzas', 105, 27, { align: 'center' });

      // Información del docente
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.text(`Docente: ${ticket.docenteNombre}`, 20, 40);
      doc.text(`Fecha: ${ticket.fechaGeneracion.toLocaleDateString('es-MX')}`, 20, 46);
      doc.text(`Total de Proyectos: ${ticket.proyectos.length}`, 20, 52);
      
      const proyectosConCotizaciones = ticket.proyectos.filter((p: any) => p.tieneCotizaciones).length;
      doc.text(`Proyectos con Cotizaciones: ${proyectosConCotizaciones}`, 20, 58);

      // Proyectos en tabla
      const tableData = ticket.proyectos.map((proyecto: Proyecto, index: number) => [
        (index + 1).toString(),
        this.truncarTexto(proyecto.nombre, 25),
        this.truncarTexto(proyecto.descripcion, 35),
        proyecto.edicion,
        (proyecto as any).tieneCotizaciones ? '✅' : '❌',
        `$${(proyecto as any).totalCotizaciones?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}`,
        `$${proyecto.presupuestoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
      ]);

      (doc as any).autoTable({
        startY: 65,
        head: [['#', 'Proyecto', 'Descripción', 'Edición', 'Cotiz.', 'Total Cotiz.', 'Presupuesto']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [58, 83, 155],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 7
        },
        styles: {
          fontSize: 6,
          cellPadding: 2
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        }
      });

      // Obtener la posición final después de la tabla
      const finalY = (doc as any).lastAutoTable.finalY + 10;

      // Total general
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'bold');
      doc.text(`TOTAL GENERAL: $${ticket.totalGeneral.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 20, finalY);

      // Pie de página
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text('Documento generado automáticamente por el Sistema de Finanzas ITESCAM', 105, 280, { align: 'center' });

      // Guardar PDF
      doc.save(`ticket-${this.limpiarNombreArchivo(ticket.docenteNombre)}-${new Date().toISOString().split('T')[0]}.pdf`);
      
      alert('🎫 Ticket PDF generado exitosamente');
      
    } catch (error) {
      console.error('Error generando ticket PDF:', error);
      this.generarTicketSimple(ticket);
    }
  }

  // ✅ MÉTODOS DE RESPALDO (por si falla jsPDF)
  private generarReporteSimple(proyectos: any[]): void {
    let contenido = 'REPORTE DE PROYECTOS APROBADOS CON COTIZACIONES\n';
    contenido += 'ITESCAM - Sistema de Finanzas\n';
    contenido += `Generado el: ${new Date().toLocaleDateString('es-MX')}\n\n`;
    
    proyectos.forEach((proyecto: any, index: number) => {
      contenido += `${index + 1}. ${proyecto.proyectoNombre}\n`;
      contenido += `   Docente: ${proyecto.docenteNombre}\n`;
      contenido += `   Partida: ${proyecto.partidaCodigo || 'N/A'}\n`;
      contenido += `   Cotizaciones: ${proyecto.tieneCotizaciones ? '✅ CON COTIZACIONES' : '❌ SIN COTIZACIONES'}\n`;
      contenido += `   Total Cotizaciones: $${(proyecto.totalCotizaciones || 0).toLocaleString('es-MX')}\n`;
      contenido += `   Total: $${proyecto.presupuestoTotal.toLocaleString('es-MX')}\n\n`;
    });

    this.descargarArchivo(contenido, `reporte-proyectos-${new Date().toISOString().split('T')[0]}.txt`, 'text/plain');
    alert('📄 Reporte descargado (archivo .txt)');
  }

  private generarTicketSimple(ticket: TicketDocente): void {
    let contenido = 'TICKET DE PROYECTOS APROBADOS\n';
    contenido += 'ITESCAM - Sistema de Finanzas\n\n';
    contenido += `Docente: ${ticket.docenteNombre}\n`;
    contenido += `Fecha: ${ticket.fechaGeneracion.toLocaleDateString('es-MX')}\n\n`;
    
    ticket.proyectos.forEach((proyecto: Proyecto, index: number) => {
      contenido += `${index + 1}. ${proyecto.nombre}\n`;
      contenido += `   Cotizaciones: ${(proyecto as any).tieneCotizaciones ? '✅' : '❌'}\n`;
      contenido += `   Total Cotizaciones: $${((proyecto as any).totalCotizaciones || 0).toLocaleString('es-MX')}\n`;
      contenido += `   Presupuesto: $${proyecto.presupuestoTotal.toLocaleString('es-MX')}\n\n`;
    });

    contenido += `TOTAL: $${ticket.totalGeneral.toLocaleString('es-MX')}`;

    this.descargarArchivo(contenido, `ticket-${this.limpiarNombreArchivo(ticket.docenteNombre)}-${new Date().toISOString().split('T')[0]}.txt`, 'text/plain');
    alert('🎫 Ticket descargado (archivo .txt)');
  }

  private descargarArchivo(contenido: string, nombre: string, tipo: string): void {
    const blob = new Blob([contenido], { type: `${tipo};charset=utf-8` });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombre;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private truncarTexto(texto: string, maxLength: number): string {
    return texto.length > maxLength ? texto.substring(0, maxLength - 3) + '...' : texto;
  }

  private limpiarNombreArchivo(nombre: string): string {
    return nombre.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  }
}