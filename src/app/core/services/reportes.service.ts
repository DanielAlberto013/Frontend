// src/app/core/services/reportes.service.ts
import { Injectable } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap, catchError } from 'rxjs';
import { ProyectosService } from './proyectos.service';
import { PartidasService } from './partidas.service';
import { CotizacionesService } from './cotizaciones.service';
import { DocumentoFinalService } from './documento-final.service';
import { project } from '../models/proyecto.model';
import { PartidaPresupuestal } from '../models/partida.model';
import { ApiResponse, User } from '../models/user.model';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as ExcelJS from 'exceljs';

export interface ReportePorPartida {
  partidaId: string;
  partidaCodigo: string;
  partidaNombre: string;
  totalPartida: number;
  proyectos: ProyectoReporte[];
  agrupadoPorDocente: DocenteAgrupado[];
}

export interface ProyectoReporte {
  proyectoId: string;
  proyectoNombre: string;
  docenteNombre: string;
  docenteId: string;
  presupuestoTotal: number;
  presupuestoFederal: number;
  presupuestoEstatal: number;
  tieneCotizaciones: boolean;
  totalCotizaciones: number;
}

export interface DocenteAgrupado {
  docenteId: string;
  docenteNombre: string;
  proyectos: ProyectoReporte[];
  totalProyectos: number;
}

export interface TicketDocente {
  docenteNombre: string;
  proyectos: any[];
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
    private cotizacionesService: CotizacionesService,
    private documentoFinalService: DocumentoFinalService
  ) {}

  // ✅ MÉTODO CORREGIDO: Reporte por partida SOLO con proyectos que tienen documentos finales
  getReportePorPartida(): Observable<ReportePorPartida[]> {
    return this.proyectosService.getProyectosPorEstado('APROBADO').pipe(
      switchMap((response: ApiResponse<project[]>) => {
        const proyectos = response.data || [];
        
        if (proyectos.length === 0) {
          return of([]);
        }

        // Para cada proyecto, obtener sus cotizaciones Y verificar si tiene documento final
        const proyectosConCotizaciones$ = proyectos.map(proyecto => 
          forkJoin({
            proyecto: of(proyecto),
            cotizaciones: this.cotizacionesService.getCotizacionesByProyecto(proyecto.id),
            documentoFinal: this.documentoFinalService.getDocumentoFinalDesdeCotizaciones(proyecto.id).pipe(
              catchError(() => of(null)) // Si no tiene documento final, retornar null
            )
          }).pipe(
            map(({ proyecto, cotizaciones, documentoFinal }) => ({
              proyecto,
              cotizaciones: cotizaciones.success && cotizaciones.data ? cotizaciones.data : [],
              tieneDocumentoFinal: documentoFinal !== null && 
                                  documentoFinal.partidas && 
                                  documentoFinal.partidas.length > 0
            }))
          )
        );

        return forkJoin(proyectosConCotizaciones$).pipe(
          map(proyectosConInfo => {
            // Filtrar solo proyectos que tienen documento final
            const proyectosConDocumentoFinal = proyectosConInfo.filter(
              item => item.tieneDocumentoFinal
            );

            console.log(`📊 Proyectos con documento final: ${proyectosConDocumentoFinal.length} de ${proyectos.length}`);

            // Si no hay proyectos con documento final, retornar array vacío
            if (proyectosConDocumentoFinal.length === 0) {
              console.log('ℹ️ No hay proyectos con documentos finales generados');
              return [];
            }

            // Agrupar por partida
            const partidasMap = new Map<string, ReportePorPartida>();

            proyectosConDocumentoFinal.forEach(({ proyecto, cotizaciones }) => {
              // Procesar proyectos con cotizaciones
              if (cotizaciones && cotizaciones.length > 0) {
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
                    const docenteNombre = this.obtenerNombreDocente(proyecto);
                    const docenteId = proyecto.docente?.id || 'default';
                    
                    partida.proyectos.push({
                      proyectoId: proyecto.id,
                      proyectoNombre: proyecto.nombre,
                      docenteNombre: docenteNombre,
                      docenteId: docenteId,
                      presupuestoTotal: proyecto.presupuestoTotal,
                      presupuestoFederal: proyecto.presupuestoFederal,
                      presupuestoEstatal: proyecto.presupuestoEstatal,
                      tieneCotizaciones: true,
                      totalCotizaciones: cotizacion.total || 0
                    });
                  }

                  // Sumar el total de la cotización al total de la partida
                  partida.totalPartida += cotizacion.total || 0;
                });
              }
            });

            // Calcular agrupado por docente para cada partida
            Array.from(partidasMap.values()).forEach(partida => {
              partida.agrupadoPorDocente = this.agruparPorDocente(partida.proyectos);
            });

            const partidasResult = Array.from(partidasMap.values());
            console.log(`📈 Partidas con documentos finales: ${partidasResult.length}`);
            
            partidasResult.forEach(partida => {
              console.log(`   📋 ${partida.partidaCodigo}: ${partida.proyectos.length} proyectos, ${partida.agrupadoPorDocente.length} docentes`);
            });

            return partidasResult;
          })
        );
      })
    );
  }

  // ✅ MÉTODO AUXILIAR: Agrupar proyectos por docente
  private agruparPorDocente(proyectos: ProyectoReporte[]): DocenteAgrupado[] {
    const docentesMap = new Map<string, DocenteAgrupado>();
    
    proyectos.forEach(proyecto => {
      if (!docentesMap.has(proyecto.docenteId)) {
        docentesMap.set(proyecto.docenteId, {
          docenteId: proyecto.docenteId,
          docenteNombre: proyecto.docenteNombre,
          proyectos: [],
          totalProyectos: 0
        });
      }
      
      const docente = docentesMap.get(proyecto.docenteId)!;
      docente.proyectos.push(proyecto);
      docente.totalProyectos = docente.proyectos.length;
    });
    
    return Array.from(docentesMap.values());
  }

  // ✅ MÉTODO AUXILIAR: Obtener nombre del docente
  private obtenerNombreDocente(proyecto: project): string {
    return proyecto.docente?.nombre || 'Docente no asignado';
  }

  // ✅ MÉTODO CORREGIDO: Generar Excel consolidado por partidas con IVA y Monto Autorizado
  async generarExcelConsolidadoPorPartidas(): Promise<void> {
    try {
      const reportes = await this.getReportePorPartida().toPromise();
      if (!reportes || reportes.length === 0) {
        alert('No hay datos para generar el reporte consolidado');
        return;
      }

      const workbook = new ExcelJS.Workbook();
      
      // Procesar cada partida (excluyendo "SIN-COTIZACION")
      const partidasConDatos = reportes.filter(partida => 
        partida.partidaCodigo !== 'SIN-COTIZACION' && partida.agrupadoPorDocente.length > 0
      );
      
      // Si no hay partidas con datos, mostrar mensaje
      if (partidasConDatos.length === 0) {
        alert('No hay partidas con docentes y cotizaciones para generar el reporte');
        return;
      }

      for (const partida of partidasConDatos) {
        const worksheet = workbook.addWorksheet(`${partida.partidaCodigo}`.substring(0, 31));

        // ========== CONFIGURACIÓN INICIAL ==========
        worksheet.properties.defaultRowHeight = 25;

        // ========== ENCABEZADO INSTITUCIONAL ==========
        worksheet.mergeCells('A1:K2');
        worksheet.getCell('A1').value = 'INSTITUTO TECNOLÓGICO SUPERIOR DE CALKINÍ EN EL ESTADO DE CAMPECHE';
        worksheet.getCell('A1').font = { bold: true, size: 14, name: 'Arial' };
        worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getCell('A1').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2F5496' }
        };
        worksheet.getCell('A1').font = { color: { argb: 'FFFFFFFF' }, bold: true };

        // Título del documento
        worksheet.mergeCells('A3:K3');
        worksheet.getCell('A3').value = `REPORTE CONSOLIDADO - PARTIDA ${partida.partidaCodigo}`;
        worksheet.getCell('A3').font = { bold: true, size: 16, name: 'Arial' };
        worksheet.getCell('A3').alignment = { horizontal: 'center' };
        worksheet.getCell('A3').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFBFBFBF' }
        };

        // Información de la partida
        worksheet.mergeCells('A4:K4');
        worksheet.getCell('A4').value = partida.partidaNombre;
        worksheet.getCell('A4').font = { bold: true, name: 'Arial', size: 12 };
        worksheet.getCell('A4').alignment = { horizontal: 'center' };

        worksheet.mergeCells('A5:K5');
        worksheet.getCell('A5').value = `Total Partida: $${partida.totalPartida.toLocaleString('es-MX', { minimumFractionDigits: 2 })} | Docentes: ${partida.agrupadoPorDocente.length} | Proyectos: ${partida.proyectos.length}`;
        worksheet.getCell('A5').font = { bold: true, name: 'Arial', size: 11, color: { argb: 'FF2F5496' } };
        worksheet.getCell('A5').alignment = { horizontal: 'center' };

        worksheet.mergeCells('A6:K6');
        worksheet.getCell('A6').value = `Fecha de generación: ${new Date().toLocaleDateString('es-MX')}`;
        worksheet.getCell('A6').font = { name: 'Arial', size: 9 };
        worksheet.getCell('A6').alignment = { horizontal: 'center' };

        // Espacio
        worksheet.getRow(7).height = 10;

        let currentRow = 8;
        let totalArticulosPartida = 0;
        let totalSubtotalPartida = 0;
        let totalIvaPartida = 0;
        let totalGeneralPartida = 0;

        // ✅ CORRECCIÓN: Procesar TODOS los docentes en esta partida
        for (const docente of partida.agrupadoPorDocente) {
          console.log(`📊 Procesando docente: ${docente.docenteNombre} en partida ${partida.partidaCodigo} con ${docente.proyectos.length} proyectos`);
          
          // Encabezado del docente
          worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
          worksheet.getCell(`A${currentRow}`).value = `👨‍🏫 DOCENTE: ${docente.docenteNombre}`;
          worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 12, name: 'Arial', color: { argb: 'FF2F5496' } };
          worksheet.getCell(`A${currentRow}`).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE7E6E6' }
          };
          currentRow++;

          let totalDocente = 0;
          let subtotalDocente = 0;
          let ivaDocente = 0;
          let tieneProyectosConArticulos = false;

          // ✅ CORRECCIÓN: Procesar TODOS los proyectos del docente
          for (const proyecto of docente.proyectos) {
            console.log(`   📄 Procesando proyecto: ${proyecto.proyectoNombre} del docente ${docente.docenteNombre}`);
            
            // Obtener datos reales del proyecto y sus cotizaciones
            const proyectoDetalle = await this.obtenerProyectoConCotizaciones(proyecto.proyectoId);
            
            if (proyectoDetalle && proyectoDetalle.cotizaciones) {
              // Buscar cotizaciones de esta partida en el proyecto
              const cotizacionesPartida = proyectoDetalle.cotizaciones.filter(
                (cot: any) => cot.partidaCodigo === partida.partidaCodigo
              );

              if (cotizacionesPartida.length > 0) {
                tieneProyectosConArticulos = true;

                // Encabezado del proyecto
                worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
                worksheet.getCell(`A${currentRow}`).value = `📋 PROYECTO: ${proyecto.proyectoNombre}`;
                worksheet.getCell(`A${currentRow}`).font = { bold: true, name: 'Arial', size: 11 };
                worksheet.getCell(`A${currentRow}`).fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFF2F2F2' }
                };
                currentRow++;

                // ✅ NUEVO: Obtener monto autorizado del proyecto para esta partida
                const montoAutorizadoProyecto = await this.obtenerMontoAutorizadoProyecto(proyecto.proyectoId, partida.partidaCodigo);

                // Encabezados de la tabla de artículos (CON IVA Y MONTO AUTORIZADO)
                const headers = ['No.', 'CANTIDAD', 'DESCRIPCIÓN DEL ARTÍCULO', '', 'PRECIO UNITARIO', 'SUBTOTAL', 'IVA 16%', 'TOTAL'];
                
                headers.forEach((header, colIndex) => {
                  const cell = worksheet.getCell(currentRow, colIndex + 1);
                  cell.value = header;
                  cell.font = { 
                    bold: true, 
                    color: { argb: 'FFFFFFFF' },
                    name: 'Arial',
                    size: 9
                  };
                  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                  cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF2F5496' }
                  };
                  cell.border = this.getBordeFormal();
                });
                currentRow++;

                let itemNumber = 1;
                let subtotalProyecto = 0;
                let ivaProyecto = 0;
                let totalProyecto = 0;

                // Procesar artículos de cada cotización
                for (const cotizacion of cotizacionesPartida) {
                  if (cotizacion.items && cotizacion.items.length > 0) {
                    for (const item of cotizacion.items) {
                      // Fila de artículo
                      const rowFillStyle = {
                        type: 'pattern' as const,
                        pattern: 'solid' as const,
                        fgColor: { argb: itemNumber % 2 === 0 ? 'FFFFFFFF' : 'FFF2F2F2' }
                      };

                      // Calcular IVA y total para cada artículo
                      const subtotalItem = item.subtotal || 0;
                      const ivaItem = subtotalItem * 0.16;
                      const totalItem = subtotalItem + ivaItem;

                      // No.
                      worksheet.getCell(`A${currentRow}`).value = itemNumber;
                      worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
                      worksheet.getCell(`A${currentRow}`).border = this.getBordeFormal();
                      worksheet.getCell(`A${currentRow}`).font = { name: 'Arial', size: 9 };
                      worksheet.getCell(`A${currentRow}`).fill = rowFillStyle;

                      // CANTIDAD
                      worksheet.getCell(`B${currentRow}`).value = item.cantidad || 0;
                      worksheet.getCell(`B${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
                      worksheet.getCell(`B${currentRow}`).border = this.getBordeFormal();
                      worksheet.getCell(`B${currentRow}`).font = { name: 'Arial', size: 9 };
                      worksheet.getCell(`B${currentRow}`).fill = rowFillStyle;

                      // DESCRIPCIÓN DEL ARTÍCULO
                      worksheet.mergeCells(`C${currentRow}:D${currentRow}`);
                      const descripcion = item.articulo?.nombre || item.descripcion || 'Artículo no especificado';
                      worksheet.getCell(`C${currentRow}`).value = descripcion;
                      worksheet.getCell(`C${currentRow}`).border = this.getBordeFormal();
                      worksheet.getCell(`C${currentRow}`).alignment = { wrapText: true, vertical: 'middle' };
                      worksheet.getCell(`C${currentRow}`).font = { name: 'Arial', size: 9 };
                      worksheet.getCell(`C${currentRow}`).fill = rowFillStyle;

                      // PRECIO UNITARIO
                      worksheet.getCell(`E${currentRow}`).value = item.precioUnitario || 0;
                      worksheet.getCell(`E${currentRow}`).numFmt = '"$"#,##0.00';
                      worksheet.getCell(`E${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
                      worksheet.getCell(`E${currentRow}`).border = this.getBordeFormal();
                      worksheet.getCell(`E${currentRow}`).font = { name: 'Arial', size: 9 };
                      worksheet.getCell(`E${currentRow}`).fill = rowFillStyle;

                      // SUBTOTAL
                      worksheet.getCell(`F${currentRow}`).value = subtotalItem;
                      worksheet.getCell(`F${currentRow}`).numFmt = '"$"#,##0.00';
                      worksheet.getCell(`F${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
                      worksheet.getCell(`F${currentRow}`).border = this.getBordeFormal();
                      worksheet.getCell(`F${currentRow}`).font = { name: 'Arial', size: 9 };
                      worksheet.getCell(`F${currentRow}`).fill = rowFillStyle;

                      // ✅ NUEVO: IVA 16%
                      worksheet.getCell(`G${currentRow}`).value = ivaItem;
                      worksheet.getCell(`G${currentRow}`).numFmt = '"$"#,##0.00';
                      worksheet.getCell(`G${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
                      worksheet.getCell(`G${currentRow}`).border = this.getBordeFormal();
                      worksheet.getCell(`G${currentRow}`).font = { name: 'Arial', size: 9 };
                      worksheet.getCell(`G${currentRow}`).fill = rowFillStyle;

                      // ✅ NUEVO: TOTAL (CON IVA)
                      worksheet.getCell(`H${currentRow}`).value = totalItem;
                      worksheet.getCell(`H${currentRow}`).numFmt = '"$"#,##0.00';
                      worksheet.getCell(`H${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
                      worksheet.getCell(`H${currentRow}`).border = this.getBordeFormal();
                      worksheet.getCell(`H${currentRow}`).font = { name: 'Arial', size: 9 };
                      worksheet.getCell(`H${currentRow}`).fill = rowFillStyle;

                      subtotalProyecto += subtotalItem;
                      ivaProyecto += ivaItem;
                      totalProyecto += totalItem;
                      totalArticulosPartida++;
                      currentRow++;
                      itemNumber++;
                    }
                  }
                }

                // ✅ NUEVO: SECCIÓN DE TOTALES DEL PROYECTO CON IVA
                worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
                worksheet.getCell(`A${currentRow}`).value = `SUBTOTAL PROYECTO ${proyecto.proyectoNombre}:`;
                worksheet.getCell(`A${currentRow}`).font = { bold: true, name: 'Arial', size: 10 };
                worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
                worksheet.getCell(`A${currentRow}`).border = this.getBordeFormal();

                worksheet.getCell(`F${currentRow}`).value = subtotalProyecto;
                worksheet.getCell(`F${currentRow}`).numFmt = '"$"#,##0.00';
                worksheet.getCell(`F${currentRow}`).font = { bold: true, name: 'Arial', size: 10 };
                worksheet.getCell(`F${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
                worksheet.getCell(`F${currentRow}`).border = this.getBordeFormal();
                worksheet.getCell(`F${currentRow}`).fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFE7E6E6' }
                };

                // IVA del proyecto
                worksheet.getCell(`G${currentRow}`).value = ivaProyecto;
                worksheet.getCell(`G${currentRow}`).numFmt = '"$"#,##0.00';
                worksheet.getCell(`G${currentRow}`).font = { bold: true, name: 'Arial', size: 10 };
                worksheet.getCell(`G${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
                worksheet.getCell(`G${currentRow}`).border = this.getBordeFormal();
                worksheet.getCell(`G${currentRow}`).fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFE7E6E6' }
                };

                // Total del proyecto
                worksheet.getCell(`H${currentRow}`).value = totalProyecto;
                worksheet.getCell(`H${currentRow}`).numFmt = '"$"#,##0.00';
                worksheet.getCell(`H${currentRow}`).font = { bold: true, name: 'Arial', size: 10 };
                worksheet.getCell(`H${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
                worksheet.getCell(`H${currentRow}`).border = this.getBordeFormal();
                worksheet.getCell(`H${currentRow}`).fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFE7E6E6' }
                };

                // ✅ NUEVO: MONTO AUTORIZADO DEL PROYECTO
                currentRow++;
                worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
                worksheet.getCell(`A${currentRow}`).value = `MONTO AUTORIZADO PROYECTO ${proyecto.proyectoNombre}:`;
                worksheet.getCell(`A${currentRow}`).font = { bold: true, name: 'Arial', size: 10, color: { argb: 'FF2F5496' } };
                worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
                worksheet.getCell(`A${currentRow}`).border = this.getBordeFormal();

                worksheet.mergeCells(`F${currentRow}:H${currentRow}`);
                worksheet.getCell(`F${currentRow}`).value = montoAutorizadoProyecto;
                worksheet.getCell(`F${currentRow}`).numFmt = '"$"#,##0.00';
                worksheet.getCell(`F${currentRow}`).font = { bold: true, name: 'Arial', size: 10, color: { argb: 'FF2F5496' } };
                worksheet.getCell(`F${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
                worksheet.getCell(`F${currentRow}`).border = this.getBordeFormal();
                worksheet.getCell(`F${currentRow}`).fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFE7E6E6' }
                };

                // ✅ NUEVO: CÁLCULO DE SOBRANTE DEL PROYECTO
                const sobranteProyecto = montoAutorizadoProyecto - totalProyecto;
                currentRow++;
                worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
                worksheet.getCell(`A${currentRow}`).value = `SOBRANTE PROYECTO ${proyecto.proyectoNombre}:`;
                worksheet.getCell(`A${currentRow}`).font = { 
                  bold: true, 
                  name: 'Arial', 
                  size: 10, 
                  color: { argb: sobranteProyecto >= 0 ? 'FF008000' : 'FFFF0000' } 
                };
                worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
                worksheet.getCell(`A${currentRow}`).border = this.getBordeFormal();

                worksheet.mergeCells(`F${currentRow}:H${currentRow}`);
                worksheet.getCell(`F${currentRow}`).value = sobranteProyecto;
                worksheet.getCell(`F${currentRow}`).numFmt = sobranteProyecto >= 0 ? '"$"#,##0.00' : '"$"#,##0.00;[Red]-"$"#,##0.00';
                worksheet.getCell(`F${currentRow}`).font = { 
                  bold: true, 
                  name: 'Arial', 
                  size: 10, 
                  color: { argb: sobranteProyecto >= 0 ? 'FF008000' : 'FFFF0000' } 
                };
                worksheet.getCell(`F${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
                worksheet.getCell(`F${currentRow}`).border = this.getBordeFormal();
                worksheet.getCell(`F${currentRow}`).fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFE7E6E6' }
                };

                subtotalDocente += subtotalProyecto;
                ivaDocente += ivaProyecto;
                totalDocente += totalProyecto;
                currentRow++;
                currentRow++; // Espacio adicional

              } else {
                // Mensaje si no hay artículos en esta partida para este proyecto
                worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
                worksheet.getCell(`A${currentRow}`).value = `📋 PROYECTO: ${proyecto.proyectoNombre} - No hay artículos registrados en la partida ${partida.partidaCodigo}`;
                worksheet.getCell(`A${currentRow}`).font = { italic: true, name: 'Arial', size: 9, color: { argb: 'FF666666' } };
                worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };
                currentRow++;
              }
            }
          }

          // Mostrar subtotal del docente solo si tiene artículos
          if (tieneProyectosConArticulos) {
            // ✅ NUEVO: TOTALES DEL DOCENTE CON IVA
            worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
            worksheet.getCell(`A${currentRow}`).value = `SUBTOTAL DOCENTE ${docente.docenteNombre}:`;
            worksheet.getCell(`A${currentRow}`).font = { bold: true, name: 'Arial', size: 11, color: { argb: 'FF2F5496' } };
            worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
            worksheet.getCell(`A${currentRow}`).border = this.getBordeFormal();

            worksheet.getCell(`F${currentRow}`).value = subtotalDocente;
            worksheet.getCell(`F${currentRow}`).numFmt = '"$"#,##0.00';
            worksheet.getCell(`F${currentRow}`).font = { bold: true, name: 'Arial', size: 11, color: { argb: 'FF2F5496' } };
            worksheet.getCell(`F${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
            worksheet.getCell(`F${currentRow}`).border = this.getBordeFormal();
            worksheet.getCell(`F${currentRow}`).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFE7E6E6' }
            };

            // IVA del docente
            worksheet.getCell(`G${currentRow}`).value = ivaDocente;
            worksheet.getCell(`G${currentRow}`).numFmt = '"$"#,##0.00';
            worksheet.getCell(`G${currentRow}`).font = { bold: true, name: 'Arial', size: 11, color: { argb: 'FF2F5496' } };
            worksheet.getCell(`G${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
            worksheet.getCell(`G${currentRow}`).border = this.getBordeFormal();
            worksheet.getCell(`G${currentRow}`).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFE7E6E6' }
            };

            // Total del docente
            worksheet.getCell(`H${currentRow}`).value = totalDocente;
            worksheet.getCell(`H${currentRow}`).numFmt = '"$"#,##0.00';
            worksheet.getCell(`H${currentRow}`).font = { bold: true, name: 'Arial', size: 11, color: { argb: 'FF2F5496' } };
            worksheet.getCell(`H${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
            worksheet.getCell(`H${currentRow}`).border = this.getBordeFormal();
            worksheet.getCell(`H${currentRow}`).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFE7E6E6' }
            };

            totalSubtotalPartida += subtotalDocente;
            totalIvaPartida += ivaDocente;
            totalGeneralPartida += totalDocente;
            currentRow += 2;
          } else {
            // Mensaje si el docente no tiene artículos en esta partida
            worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
            worksheet.getCell(`A${currentRow}`).value = `👨‍🏫 DOCENTE: ${docente.docenteNombre} - No tiene artículos en la partida ${partida.partidaCodigo}`;
            worksheet.getCell(`A${currentRow}`).font = { italic: true, name: 'Arial', size: 9, color: { argb: 'FF999999' } };
            worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };
            currentRow += 2;
          }
        }

        // ✅ NUEVO: TOTALES DE LA PARTIDA CON IVA
        worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = 'SUBTOTAL PARTIDA:';
        worksheet.getCell(`A${currentRow}`).font = { bold: true, name: 'Arial', size: 12, color: { argb: 'FFFFFFFF' } };
        worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
        worksheet.getCell(`A${currentRow}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2F5496' }
        };
        worksheet.getCell(`A${currentRow}`).border = this.getBordeFormal();

        worksheet.getCell(`F${currentRow}`).value = totalSubtotalPartida;
        worksheet.getCell(`F${currentRow}`).numFmt = '"$"#,##0.00';
        worksheet.getCell(`F${currentRow}`).font = { bold: true, name: 'Arial', size: 12, color: { argb: 'FFFFFFFF' } };
        worksheet.getCell(`F${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
        worksheet.getCell(`F${currentRow}`).border = this.getBordeFormal();
        worksheet.getCell(`F${currentRow}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2F5496' }
        };

        // IVA de la partida
        worksheet.getCell(`G${currentRow}`).value = totalIvaPartida;
        worksheet.getCell(`G${currentRow}`).numFmt = '"$"#,##0.00';
        worksheet.getCell(`G${currentRow}`).font = { bold: true, name: 'Arial', size: 12, color: { argb: 'FFFFFFFF' } };
        worksheet.getCell(`G${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
        worksheet.getCell(`G${currentRow}`).border = this.getBordeFormal();
        worksheet.getCell(`G${currentRow}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2F5496' }
        };

        // Total de la partida
        worksheet.getCell(`H${currentRow}`).value = totalGeneralPartida;
        worksheet.getCell(`H${currentRow}`).numFmt = '"$"#,##0.00';
        worksheet.getCell(`H${currentRow}`).font = { bold: true, name: 'Arial', size: 12, color: { argb: 'FFFFFFFF' } };
        worksheet.getCell(`H${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
        worksheet.getCell(`H${currentRow}`).border = this.getBordeFormal();
        worksheet.getCell(`H${currentRow}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2F5496' }
        };

        // ========== AJUSTAR ANCHOS DE COLUMNAS ==========
        worksheet.getColumn(1).width = 6;   // A: No.
        worksheet.getColumn(2).width = 10;  // B: CANTIDAD
        worksheet.getColumn(3).width = 30;  // C: DESCRIPCIÓN
        worksheet.getColumn(4).width = 30;  // D: (merge con C)
        worksheet.getColumn(5).width = 15;  // E: PRECIO UNITARIO
        worksheet.getColumn(6).width = 15;  // F: SUBTOTAL
        worksheet.getColumn(7).width = 15;  // G: IVA 16%
        worksheet.getColumn(8).width = 15;  // H: TOTAL

        // Guardar los totales para el resumen
        (partida as any).totalArticulos = totalArticulosPartida;
        (partida as any).totalSubtotal = totalSubtotalPartida;
        (partida as any).totalIva = totalIvaPartida;
        (partida as any).totalGeneral = totalGeneralPartida;
      }

      // Crear hoja de resumen general actualizada
      await this.crearHojaResumenGeneral(workbook, partidasConDatos);

      // Guardar archivo
      const buffer = await workbook.xlsx.writeBuffer();
      this.descargarArchivoExcel(buffer, `reporte-consolidado-partidas-${new Date().toISOString().split('T')[0]}.xlsx`);
      
      alert('📊 Reporte consolidado exportado exitosamente en formato Excel profesional con IVA y montos autorizados');
      
    } catch (error) {
      console.error('Error generando Excel consolidado:', error);
      alert('Error al generar reporte Excel consolidado');
    }
  }

  // ✅ MÉTODO AUXILIAR ACTUALIZADO: Crear hoja de resumen general con IVA
  private async crearHojaResumenGeneral(workbook: ExcelJS.Workbook, partidasConDatos: any[]): Promise<void> {
    const resumenWorksheet = workbook.addWorksheet('RESUMEN GENERAL');
    
    // Encabezado del resumen
    resumenWorksheet.mergeCells('A1:H1');
    resumenWorksheet.getCell('A1').value = 'RESUMEN GENERAL - DOCUMENTOS FINALES POR PARTIDAS';
    resumenWorksheet.getCell('A1').font = { bold: true, size: 16, name: 'Arial' };
    resumenWorksheet.getCell('A1').alignment = { horizontal: 'center' };

    resumenWorksheet.mergeCells('A2:H2');
    resumenWorksheet.getCell('A2').value = `Fecha de generación: ${new Date().toLocaleDateString('es-MX')}`;
    resumenWorksheet.getCell('A2').font = { name: 'Arial', size: 10 };
    resumenWorksheet.getCell('A2').alignment = { horizontal: 'center' };

    // Nota informativa
    resumenWorksheet.mergeCells('A3:H3');
    resumenWorksheet.getCell('A3').value = '⚠️ NOTA: Solo se incluyen proyectos con documentos finales generados';
    resumenWorksheet.getCell('A3').font = { italic: true, name: 'Arial', size: 9, color: { argb: 'FF666666' } };
    resumenWorksheet.getCell('A3').alignment = { horizontal: 'center' };

    // Encabezados actualizados con IVA
    const resumenHeaders = ['PARTIDA', 'NOMBRE PARTIDA', 'DOCENTES CON DOC. FINAL', 'PROYECTOS CON DOC. FINAL', 'TOTAL ARTÍCULOS', 'SUBTOTAL', 'IVA 16%', 'TOTAL PARTIDA'];
    resumenHeaders.forEach((header, index) => {
      const cell = resumenWorksheet.getCell(5, index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2F5496' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = this.getBordeFormal();
    });

    // Datos del resumen
    let filaResumen = 6;
    let totalGeneral = 0;
    let totalDocentesConDocumento = 0;
    let totalProyectosConDocumento = 0;
    let totalArticulos = 0;
    let totalSubtotalGeneral = 0;
    let totalIvaGeneral = 0;

    partidasConDatos.forEach(partida => {
      const totalArticulosPartida = (partida as any).totalArticulos || 0;
      const subtotalPartida = (partida as any).totalSubtotal || 0;
      const ivaPartida = (partida as any).totalIva || 0;
      const totalPartida = (partida as any).totalGeneral || 0;

      // ✅ CORRECCIÓN: Usar solo docentes y proyectos que tienen documentos finales
      const docentesConDocumento = partida.agrupadoPorDocente.length;
      const proyectosConDocumento = partida.proyectos.length;

      resumenWorksheet.getCell(`A${filaResumen}`).value = partida.partidaCodigo;
      resumenWorksheet.getCell(`B${filaResumen}`).value = partida.partidaNombre;
      resumenWorksheet.getCell(`C${filaResumen}`).value = docentesConDocumento;
      resumenWorksheet.getCell(`D${filaResumen}`).value = proyectosConDocumento;
      resumenWorksheet.getCell(`E${filaResumen}`).value = totalArticulosPartida;
      resumenWorksheet.getCell(`F${filaResumen}`).value = subtotalPartida;
      resumenWorksheet.getCell(`F${filaResumen}`).numFmt = '"$"#,##0.00';
      resumenWorksheet.getCell(`G${filaResumen}`).value = ivaPartida;
      resumenWorksheet.getCell(`G${filaResumen}`).numFmt = '"$"#,##0.00';
      resumenWorksheet.getCell(`H${filaResumen}`).value = totalPartida;
      resumenWorksheet.getCell(`H${filaResumen}`).numFmt = '"$"#,##0.00';

      // Aplicar estilos alternados
      const fillColor = filaResumen % 2 === 0 ? 'FFFFFFFF' : 'FFF2F2F2';
      for (let i = 1; i <= 8; i++) {
        const cell = resumenWorksheet.getCell(filaResumen, i);
        cell.border = this.getBordeFormal();
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillColor }
        };
      }

      totalGeneral += totalPartida;
      totalDocentesConDocumento += docentesConDocumento;
      totalProyectosConDocumento += proyectosConDocumento;
      totalArticulos += totalArticulosPartida;
      totalSubtotalGeneral += subtotalPartida;
      totalIvaGeneral += ivaPartida;
      filaResumen++;
    });

    // Totales generales
    resumenWorksheet.mergeCells(`A${filaResumen}:E${filaResumen}`);
    resumenWorksheet.getCell(`A${filaResumen}`).value = 'TOTAL GENERAL:';
    resumenWorksheet.getCell(`A${filaResumen}`).font = { bold: true, name: 'Arial', size: 12, color: { argb: 'FFFFFFFF' } };
    resumenWorksheet.getCell(`A${filaResumen}`).alignment = { horizontal: 'right', vertical: 'middle' };
    resumenWorksheet.getCell(`A${filaResumen}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2F5496' }
    };

    resumenWorksheet.getCell(`F${filaResumen}`).value = totalSubtotalGeneral;
    resumenWorksheet.getCell(`F${filaResumen}`).numFmt = '"$"#,##0.00';
    resumenWorksheet.getCell(`F${filaResumen}`).font = { bold: true, name: 'Arial', size: 12, color: { argb: 'FFFFFFFF' } };
    resumenWorksheet.getCell(`F${filaResumen}`).alignment = { horizontal: 'right', vertical: 'middle' };
    resumenWorksheet.getCell(`F${filaResumen}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2F5496' }
    };

    resumenWorksheet.getCell(`G${filaResumen}`).value = totalIvaGeneral;
    resumenWorksheet.getCell(`G${filaResumen}`).numFmt = '"$"#,##0.00';
    resumenWorksheet.getCell(`G${filaResumen}`).font = { bold: true, name: 'Arial', size: 12, color: { argb: 'FFFFFFFF' } };
    resumenWorksheet.getCell(`G${filaResumen}`).alignment = { horizontal: 'right', vertical: 'middle' };
    resumenWorksheet.getCell(`G${filaResumen}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2F5496' }
    };

    resumenWorksheet.getCell(`H${filaResumen}`).value = totalGeneral;
    resumenWorksheet.getCell(`H${filaResumen}`).numFmt = '"$"#,##0.00';
    resumenWorksheet.getCell(`H${filaResumen}`).font = { bold: true, name: 'Arial', size: 12, color: { argb: 'FFFFFFFF' } };
    resumenWorksheet.getCell(`H${filaResumen}`).alignment = { horizontal: 'right', vertical: 'middle' };
    resumenWorksheet.getCell(`H${filaResumen}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2F5496' }
    };

    // Resumen estadístico
    filaResumen += 2;
    resumenWorksheet.mergeCells(`A${filaResumen}:H${filaResumen}`);
    resumenWorksheet.getCell(`A${filaResumen}`).value = 'RESUMEN ESTADÍSTICO - DOCUMENTOS FINALES';
    resumenWorksheet.getCell(`A${filaResumen}`).font = { bold: true, name: 'Arial', size: 14, color: { argb: 'FF2F5496' } };
    resumenWorksheet.getCell(`A${filaResumen}`).alignment = { horizontal: 'center' };
    filaResumen++;

    const estadisticas = [
      ['Total de Partidas con Documentos:', partidasConDatos.length],
      ['Total de Docentes con Documentos Finales:', totalDocentesConDocumento],
      ['Total de Proyectos con Documentos Finales:', totalProyectosConDocumento],
      ['Total de Artículos en Documentos:', totalArticulos],
      ['Subtotal General:', `$${totalSubtotalGeneral.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`],
      ['IVA General (16%):', `$${totalIvaGeneral.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`],
      ['Presupuesto Total con Documentos:', `$${totalGeneral.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`]
    ];

    estadisticas.forEach(([label, value], index) => {
      resumenWorksheet.mergeCells(`A${filaResumen + index}:D${filaResumen + index}`);
      resumenWorksheet.getCell(`A${filaResumen + index}`).value = label;
      resumenWorksheet.getCell(`A${filaResumen + index}`).font = { bold: true, name: 'Arial', size: 11 };
      
      resumenWorksheet.mergeCells(`E${filaResumen + index}:H${filaResumen + index}`);
      resumenWorksheet.getCell(`E${filaResumen + index}`).value = value;
      resumenWorksheet.getCell(`E${filaResumen + index}`).font = { name: 'Arial', size: 11 };
      resumenWorksheet.getCell(`E${filaResumen + index}`).alignment = { horizontal: 'right' };
    });

    // Ajustar anchos de columnas del resumen
    resumenWorksheet.getColumn(1).width = 12;
    resumenWorksheet.getColumn(2).width = 40;
    resumenWorksheet.getColumn(3).width = 20;
    resumenWorksheet.getColumn(4).width = 20;
    resumenWorksheet.getColumn(5).width = 15;
    resumenWorksheet.getColumn(6).width = 15;
    resumenWorksheet.getColumn(7).width = 15;
    resumenWorksheet.getColumn(8).width = 15;
  }

  // ✅ MÉTODO CORREGIDO: Obtener monto autorizado del proyecto para una partida específica
  private async obtenerMontoAutorizadoProyecto(proyectoId: string, partidaCodigo: string): Promise<number> {
    return new Promise((resolve) => {
      forkJoin({
        proyecto: this.proyectosService.getProyectoById(proyectoId),
        partidas: this.partidasService.getPartidasByProyecto(proyectoId)
      }).pipe(
        map(({ proyecto, partidas }) => {
          if (proyecto.success && proyecto.data && partidas.success && partidas.data) {
            // Buscar la partida específica en las partidas del proyecto
            const partidaProyecto = partidas.data.find((p: any) => p.codigo === partidaCodigo);
            
            if (partidaProyecto) {
              // ✅ CORRECCIÓN: Usar importeAsignado que es la propiedad correcta según tu modelo
              const monto = partidaProyecto.importeAsignado || 0;
              console.log(`💰 Monto autorizado para partida ${partidaCodigo}: $${monto}`);
              return monto;
            } else {
              console.log(`❌ Partida ${partidaCodigo} no encontrada en el proyecto`);
            }
          } else {
            console.log(`❌ No se pudo cargar datos del proyecto ${proyectoId}`);
          }
          
          return 0;
        })
      ).subscribe(resolve);
    });
  }

  // ✅ MÉTODO AUXILIAR: Obtener proyecto con cotizaciones
  private async obtenerProyectoConCotizaciones(proyectoId: string): Promise<any> {
    return new Promise((resolve) => {
      forkJoin({
        proyecto: this.proyectosService.getProyectoById(proyectoId),
        cotizaciones: this.cotizacionesService.getCotizacionesByProyecto(proyectoId)
      }).pipe(
        map(({ proyecto, cotizaciones }) => {
          if (proyecto.success && proyecto.data && cotizaciones.success) {
            return {
              proyecto: proyecto.data,
              cotizaciones: cotizaciones.data || []
            };
          }
          return null;
        })
      ).subscribe(resolve);
    });
  }

  // ✅ MÉTODO AUXILIAR: Obtener borde formal
  private getBordeFormal(): any {
    return {
      top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
      left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
      bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
      right: { style: 'thin', color: { argb: 'FFBFBFBF' } }
    };
  }

  // ✅ MÉTODO AUXILIAR: Descargar archivo Excel
  private descargarArchivoExcel(data: any, filename: string): void {
    const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // ========== MÉTODOS EXISTENTES COMPLETOS ==========

  // ✅ MÉTODO: Generar reporte general en Excel
  generarReporteExcel(reportes: ReportePorPartida[]): void {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Reporte General');

      // Configuración inicial
      worksheet.properties.defaultRowHeight = 25;

      // Encabezado
      worksheet.mergeCells('A1:G1');
      worksheet.getCell('A1').value = 'REPORTE GENERAL DE PROYECTOS POR PARTIDA';
      worksheet.getCell('A1').font = { bold: true, size: 16, name: 'Arial' };
      worksheet.getCell('A1').alignment = { horizontal: 'center' };

      // Fecha
      worksheet.mergeCells('A2:G2');
      worksheet.getCell('A2').value = `Fecha de generación: ${new Date().toLocaleDateString('es-MX')}`;
      worksheet.getCell('A2').font = { name: 'Arial', size: 10 };
      worksheet.getCell('A2').alignment = { horizontal: 'center' };

      // Encabezados de la tabla
      const headers = ['Partida', 'Nombre Partida', 'Total Partida', 'Docentes', 'Proyectos', 'Con Cotizaciones', 'Total Cotizaciones'];
      headers.forEach((header, index) => {
        const cell = worksheet.getCell(4, index + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2F5496' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      // Datos
      let currentRow = 5;
      reportes.forEach(partida => {
        const proyectosConCotizaciones = partida.proyectos.filter(p => p.tieneCotizaciones).length;
        const totalCotizaciones = partida.proyectos.reduce((sum, p) => sum + p.totalCotizaciones, 0);

        worksheet.getCell(`A${currentRow}`).value = partida.partidaCodigo;
        worksheet.getCell(`B${currentRow}`).value = partida.partidaNombre;
        worksheet.getCell(`C${currentRow}`).value = partida.totalPartida;
        worksheet.getCell(`C${currentRow}`).numFmt = '"$"#,##0.00';
        worksheet.getCell(`D${currentRow}`).value = partida.agrupadoPorDocente.length;
        worksheet.getCell(`E${currentRow}`).value = partida.proyectos.length;
        worksheet.getCell(`F${currentRow}`).value = proyectosConCotizaciones;
        worksheet.getCell(`G${currentRow}`).value = totalCotizaciones;

        currentRow++;
      });

      // Totales
      const totalRow = currentRow;
      worksheet.getCell(`A${totalRow}`).value = 'TOTALES:';
      worksheet.getCell(`A${totalRow}`).font = { bold: true };
      
      const totalPartida = reportes.reduce((sum, p) => sum + p.totalPartida, 0);
      worksheet.getCell(`C${totalRow}`).value = totalPartida;
      worksheet.getCell(`C${totalRow}`).numFmt = '"$"#,##0.00';
      worksheet.getCell(`C${totalRow}`).font = { bold: true };

      const totalDocentes = reportes.reduce((sum, p) => sum + p.agrupadoPorDocente.length, 0);
      worksheet.getCell(`D${totalRow}`).value = totalDocentes;
      worksheet.getCell(`D${totalRow}`).font = { bold: true };

      const totalProyectos = reportes.reduce((sum, p) => sum + p.proyectos.length, 0);
      worksheet.getCell(`E${totalRow}`).value = totalProyectos;
      worksheet.getCell(`E${totalRow}`).font = { bold: true };

      // Ajustar anchos
      worksheet.getColumn(1).width = 12;
      worksheet.getColumn(2).width = 40;
      worksheet.getColumn(3).width = 15;
      worksheet.getColumn(4).width = 10;
      worksheet.getColumn(5).width = 10;
      worksheet.getColumn(6).width = 15;
      worksheet.getColumn(7).width = 15;

      // Guardar
      workbook.xlsx.writeBuffer().then(buffer => {
        this.descargarArchivoExcel(buffer, `reporte-general-${new Date().toISOString().split('T')[0]}.xlsx`);
        alert('📊 Reporte general exportado exitosamente');
      });

    } catch (error) {
      console.error('Error generando reporte Excel:', error);
      alert('Error al generar reporte Excel');
    }
  }

  // ✅ MÉTODO: Generar reporte general en PDF
  generarReportePDF(proyectos: any[]): void {
    try {
      const doc = new jsPDF();
      let yPosition = 20;

      // Encabezado
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('REPORTE GENERAL DE PROYECTOS', 105, yPosition, { align: 'center' });
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-MX')}`, 105, yPosition, { align: 'center' });
      yPosition += 20;

      // Tabla
      const headers = [['Proyecto', 'Docente', 'Presupuesto', 'Partida', 'Cotizaciones']];
      const data = proyectos.map(proyecto => [
        proyecto.proyectoNombre.substring(0, 30),
        proyecto.docenteNombre.substring(0, 25),
        `$${proyecto.presupuestoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        proyecto.partidaCodigo,
        proyecto.tieneCotizaciones ? 'Sí' : 'No'
      ]);

      (doc as any).autoTable({
        head: headers,
        body: data,
        startY: yPosition,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [47, 84, 150] }
      });

      // Guardar
      doc.save(`reporte-general-${new Date().toISOString().split('T')[0]}.pdf`);
      alert('📄 Reporte general en PDF generado exitosamente');

    } catch (error) {
      console.error('Error generando reporte PDF:', error);
      alert('Error al generar reporte PDF');
    }
  }

  // ✅ MÉTODO: Obtener ticket del docente
  getTicketDocente(): Observable<TicketDocente> {
    return this.documentoFinalService.getDocumentoFinalDocente().pipe(
      map(documentoDocente => ({
        docenteNombre: documentoDocente.docenteNombre,
        proyectos: documentoDocente.proyectos,
        totalGeneral: documentoDocente.totalGeneral,
        fechaGeneracion: documentoDocente.fechaGeneracion
      }))
    );
  }

  // ✅ MÉTODO: Generar ticket del docente en PDF
  generarTicketPDF(ticket: TicketDocente): void {
    try {
      const doc = new jsPDF();
      let yPosition = 20;

      // Encabezado
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('TICKET DE DOCENTE - RESUMEN', 105, yPosition, { align: 'center' });
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Docente: ${ticket.docenteNombre}`, 20, yPosition);
      yPosition += 8;

      doc.text(`Fecha: ${ticket.fechaGeneracion.toLocaleDateString('es-MX')}`, 20, yPosition);
      yPosition += 8;

      doc.text(`Total General: $${ticket.totalGeneral.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 20, yPosition);
      yPosition += 15;

      // Proyectos
      if (ticket.proyectos && ticket.proyectos.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('PROYECTOS:', 20, yPosition);
        yPosition += 8;

        doc.setFont('helvetica', 'normal');
        ticket.proyectos.forEach((proyecto: any, index: number) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }

          doc.text(`${index + 1}. ${proyecto.nombreProyecto} - $${proyecto.total?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}`, 25, yPosition);
          yPosition += 6;
        });
      }

      // Guardar
      doc.save(`ticket-${ticket.docenteNombre.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
      alert('🎫 Ticket del docente generado exitosamente');

    } catch (error) {
      console.error('Error generando ticket PDF:', error);
      alert('Error al generar ticket PDF');
    }
  }

  // ✅ MÉTODO AUXILIAR: Descargar archivo genérico
  private descargarArchivo(data: any, filename: string, type: string): void {
    const blob = new Blob([data], { type });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}