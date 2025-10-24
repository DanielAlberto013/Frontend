// src/app/features/reportes/reportes.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../auth/auth';
import { ReportesService, ReportePorPartida, TicketDocente } from '../../core/services/reportes.service';

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
  ticketDocente: TicketDocente | null = null;
  
  // Estados
  loading = true;
  error: string | null = null;

  constructor(
    public authService: AuthService,
    private reportesService: ReportesService,
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
    } else if (this.authService.isDocente()) {
      this.cargarTicketDocente();
    } else {
      this.loading = false;
    }
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

  private cargarTicketDocente(): void {
    this.reportesService.getTicketDocente().subscribe({
      next: (ticket: TicketDocente) => {
        this.ticketDocente = ticket;
        this.loading = false;
      },
      error: (error: any) => {
        this.error = 'Error al cargar el ticket';
        this.loading = false;
        console.error('Error:', error);
      }
    });
  }

  // ✅ NUEVO MÉTODO: Regresar al dashboard
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

  generarTicketPDF(): void {
    if (this.ticketDocente) {
      this.reportesService.generarTicketPDF(this.ticketDocente);
    } else {
      alert('No hay datos para generar el ticket');
    }
  }

  imprimirTicket(): void {
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