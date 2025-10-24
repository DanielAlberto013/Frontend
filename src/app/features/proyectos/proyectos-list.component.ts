import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ✅ AGREGAR ESTA LÍNEA
import { RouterModule, Router } from '@angular/router';
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
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-proyectos-list',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    FormsModule, // ✅ AGREGAR ESTA LÍNEA
    // Angular Material modules
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatMenuModule
  ],
  templateUrl: './proyectos-list.component.html',
  styleUrls: ['./proyectos-list.component.css']
})
export class ProyectosListComponent implements OnInit {
  proyectos: Proyecto[] = [];
  proyectosFiltrados: Proyecto[] = [];
  loading = true;
  error: string | null = null;

  // Filtros para admin
  filtroEstado: string = '';
  searchTerm: string = '';

  constructor(
    private proyectosService: ProyectosService,
    public authService: AuthService,
    private router: Router
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
          this.procesarProyectos(response);
        },
        error: (error) => {
          this.error = 'Error al cargar tus proyectos';
          this.loading = false;
          console.error('Error:', error);
        }
      });
    } else {
      // Admin y revisor ven todos los proyectos
      this.proyectosService.getProyectos().subscribe({
        next: (response) => {
          this.procesarProyectos(response);
        },
        error: (error) => {
          this.error = 'Error al cargar proyectos';
          this.loading = false;
          console.error('Error:', error);
        }
      });
    }
  }

  private procesarProyectos(response: any): void {
    if (response.success && response.data) {
      this.proyectos = response.data;
      this.aplicarFiltros();
    } else {
      this.error = 'No se pudieron cargar los proyectos';
    }
    this.loading = false;
  }

  // ✅ NUEVO: Aplicar filtros para admin
  aplicarFiltros(): void {
    this.proyectosFiltrados = this.proyectos.filter(proyecto => {
      const coincideEstado = !this.filtroEstado || proyecto.estado === this.filtroEstado;
      const coincideBusqueda = !this.searchTerm || 
        proyecto.nombre.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        proyecto.docente.nombre.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      return coincideEstado && coincideBusqueda;
    });
  }

  onFiltroChange(): void {
    this.aplicarFiltros();
  }

  onSearchChange(): void {
    this.aplicarFiltros();
  }

  limpiarFiltros(): void {
    this.filtroEstado = '';
    this.searchTerm = '';
    this.aplicarFiltros();
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

  getProyectosCount(estado: string): number {
    return this.proyectos.filter(p => p.estado === estado).length;
  }

  crearNuevoProyecto(): void {
    this.router.navigate(['/proyectos/nuevo']);
  }

  verDetalle(proyecto: Proyecto): void {
    this.router.navigate(['/proyectos', proyecto.id]);
  }

  editarProyecto(proyecto: Proyecto): void {
    this.router.navigate(['/proyectos/editar', proyecto.id]);
  }

  // 🔥 NUEVO: Enviar proyecto a revisión (docente)
  enviarARevision(proyecto: Proyecto): void {
    const confirmacion = confirm(`¿Estás seguro de enviar el proyecto "${proyecto.nombre}" a revisión?\n\nUna vez enviado, no podrás editarlo hasta que sea revisado.`);
    
    if (confirmacion) {
      this.proyectosService.enviarARevision(proyecto.id).subscribe({
        next: (response) => {
          if (response.success) {
            alert('✅ Proyecto enviado a revisión exitosamente');
            this.cargarProyectos();
          } else {
            alert('❌ Error al enviar el proyecto: ' + response.message);
          }
        },
        error: (error) => {
          alert('❌ Error al enviar el proyecto');
          console.error('Error:', error);
        }
      });
    }
  }

  // 🔥 NUEVO: Eliminar proyecto
  eliminarProyecto(proyecto: Proyecto): void {
    const confirmacion = confirm(`¿Estás seguro de que quieres eliminar el proyecto "${proyecto.nombre}"?\n\nEsta acción no se puede deshacer.`);
    
    if (confirmacion) {
      this.proyectosService.deleteProyecto(proyecto.id).subscribe({
        next: (response) => {
          if (response.success) {
            alert('✅ Proyecto eliminado exitosamente');
            this.cargarProyectos();
          } else {
            alert('❌ Error al eliminar el proyecto: ' + response.message);
          }
        },
        error: (error) => {
          alert('❌ Error al eliminar el proyecto');
          console.error('Error:', error);
        }
      });
    }
  }

  // 🔥 NUEVO: Aprobar proyecto (admin/revisor)
  aprobarProyecto(proyecto: Proyecto): void {
    const confirmacion = confirm(`¿Estás seguro de aprobar el proyecto "${proyecto.nombre}"?\n\nUna vez aprobado, el docente podrá realizar cotizaciones.`);
    
    if (confirmacion) {
      this.proyectosService.aprobarProyecto(proyecto.id).subscribe({
        next: (response) => {
          if (response.success) {
            alert('✅ Proyecto aprobado exitosamente');
            this.cargarProyectos();
          } else {
            alert('❌ Error al aprobar el proyecto: ' + response.message);
          }
        },
        error: (error) => {
          alert('❌ Error al aprobar el proyecto');
          console.error('Error:', error);
        }
      });
    }
  }

  // 🔥 NUEVO: Rechazar proyecto (admin/revisor)
  rechazarProyecto(proyecto: Proyecto): void {
    const confirmacion = confirm(`¿Estás seguro de rechazar el proyecto "${proyecto.nombre}"?\n\nEl docente deberá contactarte para más información.`);
    
    if (confirmacion) {
      this.proyectosService.rechazarProyecto(proyecto.id).subscribe({
        next: (response) => {
          if (response.success) {
            alert('✅ Proyecto rechazado exitosamente');
            this.cargarProyectos();
          } else {
            alert('❌ Error al rechazar el proyecto: ' + response.message);
          }
        },
        error: (error) => {
          alert('❌ Error al rechazar el proyecto');
          console.error('Error:', error);
        }
      });
    }
  }

  // 🔥 NUEVO: Verificar si se puede editar (solo borradores)
  puedeEditar(proyecto: Proyecto): boolean {
    return proyecto.estado === 'BORRADOR';
  }

  // 🔥 NUEVO: Verificar si se puede enviar a revisión (solo borradores)
  puedeEnviarARevision(proyecto: Proyecto): boolean {
    return proyecto.estado === 'BORRADOR';
  }

  // 🔥 NUEVO: Verificar si se puede usar en cotizaciones (solo aprobados)
  puedeUsarEnCotizaciones(proyecto: Proyecto): boolean {
    return proyecto.estado === 'APROBADO';
  }

  // 🔥 NUEVO: Obtener mensaje informativo según el estado
  getMensajeEstado(proyecto: Proyecto): string {
    switch (proyecto.estado) {
      case 'BORRADOR':
        return 'Puedes editar y enviar a revisión';
      case 'EN_REVISION':
        return 'Esperando aprobación del administrador';
      case 'APROBADO':
        return 'Listo para realizar cotizaciones';
      case 'RECHAZADO':
        return 'Contacta al administrador para más información';
      default:
        return '';
    }
  }

  // 🔥 NUEVO: Obtener clase CSS para el mensaje de estado
  getMensajeEstadoClass(proyecto: Proyecto): string {
    switch (proyecto.estado) {
      case 'BORRADOR': return 'mensaje-borrador';
      case 'EN_REVISION': return 'mensaje-revision';
      case 'APROBADO': return 'mensaje-aprobado';
      case 'RECHAZADO': return 'mensaje-rechazado';
      default: return '';
    }
  }

  // 🔥 NUEVO: Verificar si es admin
  esAdmin(): boolean {
    return this.authService.isAdmin() || this.authService.isRevisor();
  }
}