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
      this.cargarReportesAdmin();
      this.cargarDocumentosFinalesAdmin();
    } else if (this.authService.isDocente()) {
      this.cargarDocumentoFinalDocente();
      this.cargarDocumentosFinalesDocente();
    } else {
      this.loading = false;
    }
  }

  private cargarDocumentosFinalesAdmin(): void {
    this.documentoFinalService.getDocumentosFinalesAdmin().subscribe({
      next: (documentos: DocumentoFinal[]) => {
        this.documentosFinales = documentos;
      },
      error: (error: any) => {
        console.error('Error al cargar documentos finales:', error);
      }
    });
  }

  private cargarDocumentosFinalesDocente(): void {
    this.documentoFinalService.getDocumentosFinalesAdmin().subscribe({
      next: (documentos: DocumentoFinal[]) => {
        this.documentosFinales = documentos;
      },
      error: (error: any) => {
        console.error('Error al cargar documentos finales:', error);
      }
    });
  }

  private cargarDocumentoFinalDocente(): void {
    this.documentoFinalService.getDocumentoFinalDocente().subscribe({
      next: (documento: DocumentoFinalDocente) => {
        this.documentoFinalDocente = documento;
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
    this.documentoFinalService.generarExcelDocumentoFinal(documento);
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
      
      this.documentoFinalService.generarExcelDocumentoFinal(documentoBasico);
    }
  }

  // ✅ MÉTODO: Generar todos los documentos finales en Excel
  generarDocumentosFinalesExcel(): void {
    if (this.documentosFinales.length > 0) {
      this.documentoFinalService.generarExcelMultiplesDocumentos(this.documentosFinales);
    } else {
      alert('No hay documentos finales para exportar');
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
}