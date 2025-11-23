import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { project } from '../../core/models/proyecto.model';
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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-proyectos-list',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    FormsModule,
    // Angular Material modules
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatMenuModule,
    MatSnackBarModule
  ],
  templateUrl: './proyectos-list.component.html',
  styleUrls: ['./proyectos-list.component.css']
})
export class ProyectosListComponent implements OnInit, OnDestroy {
  proyectos: project[] = [];
  proyectosFiltrados: project[] = [];
  loading = true;
  error: string | null = null;

  // Filtros para admin
  filtroEstado: string = '';
  searchTerm: string = '';

  private destroy$ = new Subject<void>();

  constructor(
    private proyectosService: ProyectosService,
    public authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargarProyectos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarProyectos(): void {
    this.loading = true;
    this.error = null;
    
    const proyectosObservable = this.authService.isDocente() 
      ? this.proyectosService.getMisProyectos() 
      : this.proyectosService.getProyectos();

    proyectosObservable
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.procesarProyectos(response);
        },
        error: (error) => {
          this.error = this.authService.isDocente() 
            ? 'Error al cargar tus proyectos' 
            : 'Error al cargar proyectos';
          this.loading = false;
          console.error('Error:', error);
          this.mostrarError(this.error);
        }
      });
  }

  private procesarProyectos(response: any): void {
    if (response.success && response.data) {
      this.proyectos = response.data;
      this.aplicarFiltros();
    } else {
      this.error = 'No se pudieron cargar los proyectos';
      this.mostrarError(this.error);
    }
    this.loading = false;
  }

  // ✅ Aplicar filtros para admin
  aplicarFiltros(): void {
    this.proyectosFiltrados = this.proyectos.filter(proyecto => {
      const coincideEstado = !this.filtroEstado || proyecto.estado === this.filtroEstado;
      
      if (!this.searchTerm) {
        return coincideEstado;
      }

      const term = this.searchTerm.toLowerCase();
      const coincideNombre = proyecto.nombre.toLowerCase().includes(term);
      const coincideDocente = proyecto.docente?.nombre?.toLowerCase().includes(term);
      const coincideDescripcion = proyecto.descripcion?.toLowerCase().includes(term);
      
      return coincideEstado && (coincideNombre || coincideDocente || coincideDescripcion);
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

  getTotalProyectos(): number {
    return this.proyectos.length;
  }

  getProyectosMostrados(): number {
    return this.proyectosFiltrados.length;
  }

  crearNuevoProyecto(): void {
    this.router.navigate(['/proyectos/nuevo']);
  }

  verDetalle(proyecto: project): void {
    // ✅ CORREGIDO: Solo verificación básica de autenticación
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth/login']);
      return;
    }
    
    // ✅ Redirigir correctamente a la vista
    this.router.navigate(['/proyectos', proyecto.id]);
  }

  editarProyecto(proyecto: project): void {
    // ✅ VERIFICAR que el usuario esté autenticado y pueda editar
    console.log('🔍 Intentando editar proyecto:', proyecto);
    console.log('🔍 Usuario autenticado:', this.authService.isLoggedIn());
    console.log('🔍 Es docente:', this.authService.isDocente());
    console.log('🔍 Estado del proyecto:', proyecto.estado);
    console.log('🔍 Puede editar:', this.puedeEditar(proyecto));

    if (!this.authService.isLoggedIn()) {
      console.log('❌ Usuario no autenticado, redirigiendo a login');
      this.mostrarError('Debes iniciar sesión para editar proyectos');
      this.router.navigate(['/auth/login']);
      return;
    }

    if (!this.puedeEditar(proyecto)) {
      console.log('❌ No tiene permisos para editar este proyecto');
      this.mostrarError('No puedes editar este proyecto. Solo los proyectos en estado "Borrador" pueden ser editados.');
      return;
    }

    console.log('✅ Redirigiendo a edición del proyecto:', proyecto.id);
    this.router.navigate(['/proyectos/editar', proyecto.id]);
  }

  // ✅ Enviar proyecto a revisión (docente)
  enviarARevision(proyecto: project): void {
    const confirmacion = confirm(`¿Estás seguro de enviar el proyecto "${proyecto.nombre}" a revisión?\n\nUna vez enviado, no podrás editarlo hasta que sea revisado.`);
    
    if (confirmacion) {
      this.proyectosService.enviarARevision(proyecto.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.mostrarExito('Proyecto enviado a revisión exitosamente');
              this.cargarProyectos();
            } else {
              this.mostrarError('Error al enviar el proyecto: ' + response.message);
            }
          },
          error: (error) => {
            this.mostrarError('Error al enviar el proyecto');
            console.error('Error:', error);
          }
        });
    }
  }

  // ✅ Eliminar proyecto
  eliminarProyecto(proyecto: project): void {
    const confirmacion = confirm(`¿Estás seguro de que quieres eliminar el proyecto "${proyecto.nombre}"?\n\nEsta acción no se puede deshacer.`);
    
    if (confirmacion) {
      this.proyectosService.deleteProyecto(proyecto.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.mostrarExito('Proyecto eliminado exitosamente');
              this.cargarProyectos();
            } else {
              this.mostrarError('Error al eliminar el proyecto: ' + response.message);
            }
          },
          error: (error) => {
            this.mostrarError('Error al eliminar el proyecto');
            console.error('Error:', error);
          }
        });
    }
  }

  // ✅ Aprobar proyecto (admin/revisor)
  aprobarProyecto(proyecto: project): void {
    const confirmacion = confirm(`¿Estás seguro de aprobar el proyecto "${proyecto.nombre}"?\n\nUna vez aprobado, el docente podrá realizar cotizaciones.`);
    
    if (confirmacion) {
      this.proyectosService.aprobarProyecto(proyecto.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.mostrarExito('Proyecto aprobado exitosamente');
              this.cargarProyectos();
            } else {
              this.mostrarError('Error al aprobar el proyecto: ' + response.message);
            }
          },
          error: (error) => {
            this.mostrarError('Error al aprobar el proyecto');
            console.error('Error:', error);
          }
        });
    }
  }

  // ✅ Rechazar proyecto (admin/revisor)
  rechazarProyecto(proyecto: project): void {
    const confirmacion = confirm(`¿Estás seguro de rechazar el proyecto "${proyecto.nombre}"?\n\nEl docente deberá contactarte para más información.`);
    
    if (confirmacion) {
      this.proyectosService.rechazarProyecto(proyecto.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.mostrarExito('Proyecto rechazado exitosamente');
              this.cargarProyectos();
            } else {
              this.mostrarError('Error al rechazar el proyecto: ' + response.message);
            }
          },
          error: (error) => {
            this.mostrarError('Error al rechazar el proyecto');
            console.error('Error:', error);
          }
        });
    }
  }

  // ✅ Verificar si se puede editar (solo borradores)
  puedeEditar(proyecto: project): boolean {
    return this.authService.isDocente() && proyecto.estado === 'BORRADOR';
  }

  // ✅ Verificar si se puede enviar a revisión (solo borradores)
  puedeEnviarARevision(proyecto: project): boolean {
    return this.authService.isDocente() && proyecto.estado === 'BORRADOR';
  }

  // ✅ Verificar si se puede usar en cotizaciones (solo aprobados)
  puedeUsarEnCotizaciones(proyecto: project): boolean {
    return proyecto.estado === 'APROBADO';
  }

  // ✅ Obtener mensaje informativo según el estado
  getMensajeEstado(proyecto: project): string {
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

  // ✅ Obtener clase CSS para el mensaje de estado
  getMensajeEstadoClass(proyecto: project): string {
    switch (proyecto.estado) {
      case 'BORRADOR': return 'mensaje-borrador';
      case 'EN_REVISION': return 'mensaje-revision';
      case 'APROBADO': return 'mensaje-aprobado';
      case 'RECHAZADO': return 'mensaje-rechazado';
      default: return '';
    }
  }

  // ✅ Verificar si es admin
  esAdmin(): boolean {
    return this.authService.isAdmin() || this.authService.isRevisor();
  }

  // ✅ Métodos auxiliares para notificaciones
  private mostrarExito(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 5000,
      panelClass: ['snackbar-success']
    });
  }

  private mostrarError(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 5000,
      panelClass: ['snackbar-error']
    });
  }

  // ✅ Método para obtener icono según estado
  getEstadoIcon(estado: string): string {
    switch (estado) {
      case 'APROBADO': return 'check_circle';
      case 'EN_REVISION': return 'schedule';
      case 'RECHAZADO': return 'cancel';
      default: return 'edit';
    }
  }

  // ✅ Método para formatear fecha
  formatearFecha(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    
    const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return date.toLocaleDateString('es-MX');
  }

  // ✅ Método para obtener información del docente de forma segura
  getNombreDocente(proyecto: project): string {
    return proyecto.docente?.nombre || 'N/A';
  }

  getEmailDocente(proyecto: project): string {
    return proyecto.docente?.email || 'N/A';
  }
}