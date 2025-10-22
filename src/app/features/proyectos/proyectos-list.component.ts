import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Proyecto } from '../../core/models/proyecto.model';
import { ProyectosService } from '../../core/services/proyectos.service';
import { AuthService } from '../../auth/auth';

// Angular Material imports
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-proyectos-list',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    // Angular Material modules
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatChipsModule
  ],
  templateUrl: './proyectos-list.component.html',
  styleUrls: ['./proyectos-list.component.css']
})
export class ProyectosListComponent implements OnInit {
  proyectos: Proyecto[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private proyectosService: ProyectosService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarProyectos();
  }

  cargarProyectos(): void {
    this.loading = true;
    
    if (this.authService.isDocente()) {
      // Docente ve solo sus proyectos
      this.proyectosService.getMisProyectos().subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.proyectos = response.data;
          }
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Error al cargar proyectos';
          this.loading = false;
          console.error('Error:', error);
        }
      });
    } else {
      // Revisor/Admin ve todos los proyectos
      this.proyectosService.getProyectos().subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.proyectos = response.data;
          }
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Error al cargar proyectos';
          this.loading = false;
          console.error('Error:', error);
        }
      });
    }
  }

  getEstadoBadgeClass(estado: string): string {
    switch (estado) {
      case 'APROBADO': return 'estado-aprobado';
      case 'EN_REVISION': return 'estado-revision';
      case 'RECHAZADO': return 'estado-rechazado';
      default: return 'estado-borrador';
    }
  }

  getEstadoText(estado: string): string {
    switch (estado) {
      case 'APROBADO': return 'Aprobado';
      case 'EN_REVISION': return 'En Revisión';
      case 'RECHAZADO': return 'Rechazado';
      default: return 'Borrador';
    }
  }

  getEstadoIcon(estado: string): string {
    switch (estado) {
      case 'APROBADO': return 'check_circle';
      case 'EN_REVISION': return 'pending';
      case 'RECHAZADO': return 'cancel';
      default: return 'draft';
    }
  }

  getProyectosCount(estado: string): number {
    return this.proyectos.filter(p => p.estado === estado).length;
  }

  crearNuevoProyecto(): void {
    alert('Funcionalidad de crear proyecto en desarrollo');
  }

  verDetalle(proyecto: Proyecto): void {
    alert(`Viendo detalle de: ${proyecto.nombre} (funcionalidad en desarrollo)`);
  }

  editarProyecto(proyecto: Proyecto): void {
    alert(`Editando proyecto: ${proyecto.nombre} (funcionalidad en desarrollo)`);
  }

  // Solo para revisores/admin
  cambiarEstado(proyecto: Proyecto, nuevoEstado: string): void {
    alert(`Cambiando estado de ${proyecto.nombre} a ${nuevoEstado} (funcionalidad en desarrollo)`);
  }
}