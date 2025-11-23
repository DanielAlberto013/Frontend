// src/app/components/reportes/reportes.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../auth/auth';
import { ReportesService, ReportePorPartida } from '../../core/services/reportes.service';
import { DocumentoFinalService } from '../../core/services/documento-final.service';
import { DocumentoFinal, DocumentoFinalDocente } from '../../core/models/documento-final.model';

interface ProyectoReporte {
  proyectoId: string;
  proyectoNombre: string;
  docenteNombre: string;
  presupuestoTotal: number;
  presupuestoFederal: number;
  presupuestoEstatal: number;
  partidaCodigo: string;
  partidaNombre: string;
  tieneCotizaciones: boolean;
  totalCotizaciones: number;
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.css']
})
export class ReportesComponent implements OnInit {
  // Datos para admin
  reportesPorPartida: ReportePorPartida[] = [];
  proyectosUnicos: ProyectoReporte[] = [];
  
  // Datos para docente
  documentoFinalDocente: DocumentoFinalDocente | null = null;
  
  // Documentos finales
  documentosFinales: DocumentoFinal[] = [];
  documentoSeleccionado: DocumentoFinal | null = null;

  // Estados
  loading = true;
  error: string | null = null;

  constructor(
    public authService: AuthService,
    private reportesService: ReportesService,
    private documentoFinalService: DocumentoFinalService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading = true;
    this.error = null;

    if (this.authService.isAdmin() || this.authService.isRevisor()) {
      this.cargarDocumentosFinalesReales();
      this.cargarReportesAdmin();
    } else if (this.authService.isDocente()) {
      this.cargarDocumentosFinalesRealesDocente();
    } else {
      this.loading = false;
    }
  }

  // ✅ MÉTODO: Cargar documentos finales reales para admin
  private cargarDocumentosFinalesReales(): void {
    this.documentoFinalService.getDocumentosFinalesAdmin().subscribe({
      next: (documentos: DocumentoFinal[]) => {
        this.documentosFinales = documentos;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error al cargar documentos finales:', error);
        this.error = 'Error al cargar documentos finales';
        this.loading = false;
      }
    });
  }

  // ✅ MÉTODO: Cargar documentos finales reales para docente
  private cargarDocumentosFinalesRealesDocente(): void {
    this.documentoFinalService.getDocumentoFinalDocente().subscribe({
      next: (documentoDocente: DocumentoFinalDocente) => {
        this.documentoFinalDocente = documentoDocente;
        // Los documentos finales del docente ahora están en documentoDocente.proyectos
        this.documentosFinales = documentoDocente.proyectos as DocumentoFinal[];
        this.loading = false;
      },
      error: (error: any) => {
        this.error = 'Error al cargar el documento final';
        this.loading = false;
        console.error('Error:', error);
      }
    });
  }

  private cargarReportesAdmin(): void {
    this.reportesService.getReportePorPartida().subscribe({
      next: (reportes: ReportePorPartida[]) => {
        this.reportesPorPartida = reportes;
        this.proyectosUnicos = this.obtenerProyectosUnicos(reportes);
        this.loading = false;
      },
      error: (error: any) => {
        this.error = 'Error al cargar los reportes';
        this.loading = false;
        console.error('Error:', error);
      }
    });
  }

  private obtenerProyectosUnicos(reportes: ReportePorPartida[]): ProyectoReporte[] {
    const proyectosMap = new Map<string, ProyectoReporte>();
    
    reportes.forEach(partida => {
      partida.proyectos.forEach(proyecto => {
        if (!proyectosMap.has(proyecto.proyectoId)) {
          proyectosMap.set(proyecto.proyectoId, {
            ...proyecto,
            partidaCodigo: partida.partidaCodigo,
            partidaNombre: partida.partidaNombre
          });
        }
      });
    });
    
    return Array.from(proyectosMap.values());
  }

  // ✅ MÉTODO: Generar documento final en PDF
  generarDocumentoFinalPDF(documento: DocumentoFinal): void {
    this.documentoFinalService.generarPDFDocumentoFinal(documento);
  }

  // ✅ MÉTODO: Generar documento final en Excel
  generarDocumentoFinalExcel(documento: DocumentoFinal): void {
    this.documentoFinalService.generarExcelDocumentoFinal(documento).catch(error => {
      console.error('Error al generar Excel:', error);
      alert('❌ Error al generar el documento Excel');
    });
  }

  // ✅ MÉTODO: Generar documento del docente en PDF
  generarDocumentoDocentePDF(): void {
    if (this.documentoFinalDocente) {
      // Crear un documento final básico para el docente
      const documentoBasico: DocumentoFinal = {
        tipoConvocatoria: 'Convocatoria 2025: PROYECTOS DE INVESTIGACIÓN CIENTÍFICA, DESARROLLO TECNOLÓGICO E INNOVACIÓN',
        nombreProyecto: 'Resumen de Proyectos Aprobados',
        claveProyecto: 'DOC-' + new Date().getFullYear(),
        vigenciaProyecto: '01 de enero al 31 de diciembre de 2025',
        tipoFondo: 'FEDERAL',
        partidas: [],
        docenteNombre: this.documentoFinalDocente.docenteNombre,
        fechaGeneracion: new Date(),
        subtotal: this.documentoFinalDocente.totalGeneral,
        iva: this.documentoFinalDocente.totalGeneral * 0.16,
        total: this.documentoFinalDocente.totalGeneral * 1.16,
        montoAprobado: this.documentoFinalDocente.totalGeneral
      };
      
      this.documentoFinalService.generarPDFDocumentoFinal(documentoBasico);
    }
  }

  // ✅ MÉTODO: Generar documento del docente en Excel
  generarDocumentoDocenteExcel(): void {
    if (this.documentoFinalDocente) {
      // Crear un documento final básico para el docente
      const documentoBasico: DocumentoFinal = {
        tipoConvocatoria: 'Convocatoria 2025: PROYECTOS DE INVESTIGACIÓN CIENTÍFICA, DESARROLLO TECNOLÓGICO E INNOVACIÓN',
        nombreProyecto: 'Resumen de Proyectos Aprobados',
        claveProyecto: 'DOC-' + new Date().getFullYear(),
        vigenciaProyecto: '01 de enero al 31 de diciembre de 2025',
        tipoFondo: 'FEDERAL',
        partidas: [],
        docenteNombre: this.documentoFinalDocente.docenteNombre,
        fechaGeneracion: new Date(),
        subtotal: this.documentoFinalDocente.totalGeneral,
        iva: this.documentoFinalDocente.totalGeneral * 0.16,
        total: this.documentoFinalDocente.totalGeneral * 1.16,
        montoAprobado: this.documentoFinalDocente.totalGeneral
      };
      
      this.documentoFinalService.generarExcelDocumentoFinal(documentoBasico).catch(error => {
        console.error('Error al generar Excel del docente:', error);
        alert('❌ Error al generar el documento Excel del docente');
      });
    }
  }

  // ✅ MÉTODO MODIFICADO: Generar todos los documentos finales en Excel
  async generarDocumentosFinalesExcel(): Promise<void> {
    if (this.authService.isAdmin() || this.authService.isRevisor()) {
      // Para admin/revisor: generar reporte consolidado por partidas
      try {
        await this.reportesService.generarExcelConsolidadoPorPartidas();
      } catch (error) {
        console.error('Error al generar reporte consolidado:', error);
        alert('Error al generar el reporte consolidado');
      }
    } else if (this.authService.isDocente()) {
      // Para docente: comportamiento original
      if (this.documentosFinales.length > 0) {
        this.documentoFinalService.generarExcelMultiplesDocumentos(this.documentosFinales);
      } else {
        alert('No hay documentos finales para exportar');
      }
    }
  }

  // ✅ MÉTODO: Seleccionar documento para ver detalles
  seleccionarDocumento(documento: DocumentoFinal): void {
    this.documentoSeleccionado = documento;
  }

  // ✅ MÉTODO: Regresar a la lista de documentos
  regresarAListaDocumentos(): void {
    this.documentoSeleccionado = null;
  }

  // Métodos existentes...
  regresarAlDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  generarReporteExcel(): void {
    if (this.proyectosUnicos.length > 0) {
      this.reportesService.generarReporteExcel(this.reportesPorPartida);
    } else {
      alert('No hay datos para generar el reporte');
    }
  }

  generarReportePDF(): void {
    if (this.proyectosUnicos.length > 0) {
      this.reportesService.generarReportePDF(this.proyectosUnicos);
    } else {
      alert('No hay datos para generar el reporte');
    }
  }

  imprimirDocumento(): void {
    setTimeout(() => {
      window.print();
    }, 500);
  }

  getTotalGeneral(): number {
    return this.proyectosUnicos.reduce((total, proyecto) => total + proyecto.presupuestoTotal, 0);
  }

  getTotalProyectos(): number {
    return this.proyectosUnicos.length;
  }

  // ✅ MÉTODO: Obtener proyectos con cotizaciones
  getProyectosConCotizaciones(): number {
    return this.proyectosUnicos.filter(p => p.tieneCotizaciones).length;
  }

  // ✅ MÉTODO: Obtener total de cotizaciones
  getTotalCotizaciones(): number {
    return this.proyectosUnicos.reduce((total, proyecto) => total + proyecto.totalCotizaciones, 0);
  }

  // ✅ MÉTODOS AUXILIARES PARA EL HTML - AGREGADOS
  getTotalDocumentosConPartidas(): number {
    return this.documentosFinales.filter(doc => doc.partidas && doc.partidas.length > 0).length;
  }

  getTotalDocumentos(): number {
    return this.documentosFinales.reduce((total, doc) => total + (doc.total || 0), 0);
  }

  getTotalProductos(documento: DocumentoFinal): number {
    if (!documento.partidas) return 0;
    return documento.partidas.reduce((total, partida) => total + (partida.productos ? partida.productos.length : 0), 0);
  }

  getTotalProductosProyecto(proyecto: any): number {
    if (!proyecto.partidas) return 0;
    return proyecto.partidas.reduce((total: number, partida: any) => 
      total + (partida.productos ? partida.productos.length : 0), 0);
  }
}