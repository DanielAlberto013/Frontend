import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Article, SugerenciaArticulo, CreateSugerenciaRequest } from '../../core/models/article.model';
import { ArticulosService } from '../../core/services/articulos.service';
import { AuthService } from '../../auth/auth';

@Component({
  selector: 'app-sugerencia-articulo-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sugerencia-articulo-form.component.html',
  styleUrls: ['./sugerencia-articulo-form.component.css']
})
export class SugerenciaArticuloFormComponent implements OnInit {
  // 🔥 PROPIEDADES PARA EL FORMULARIO
  articulo: Partial<Article> = {
    nombre: '',
    precioReferencia: 0,
    partidaCodigo: ''
  };
  
  // 🔥 PROPIEDADES PARA EL HISTORIAL Y NOTIFICACIONES
  sugerencias: SugerenciaArticulo[] = [];
  loadingSugerencias = false;
  mensajesNuevos: number = 0;
  vaciandoHistorial = false;
  
  loading = false;
  error: string | null = null;
  success: string | null = null;
  articulosExistentes: Article[] = [];
  partidas: {codigo: string, nombre: string}[] = [];

  constructor(
    public articulosService: ArticulosService,
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarPartidas();
    this.cargarMisSugerencias();
  }

  // 🔥 Cargar sugerencias del docente
  cargarMisSugerencias(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;
    
    this.loadingSugerencias = true;
    this.articulosService.getSugerenciasByDocente(currentUser.id).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.sugerencias = response.data;
          this.calcularMensajesNuevos();
        }
        this.loadingSugerencias = false;
      },
      error: (error: any) => {
        console.error('Error al cargar sugerencias:', error);
        this.loadingSugerencias = false;
      }
    });
  }

  // 🔥 Calcular mensajes nuevos
  calcularMensajesNuevos(): void {
    this.mensajesNuevos = this.sugerencias.filter(sugerencia => 
      sugerencia.comentarios && 
      sugerencia.comentarios.trim() !== '' &&
      this.esReciente(sugerencia.fechaRevision)
    ).length;
  }

  // 🔥 Verificar si una fecha es reciente
  esReciente(fecha: Date | undefined): boolean {
    if (!fecha) return false;
    
    try {
      const fechaRevision = new Date(fecha);
      const hoy = new Date();
      const diferenciaDias = Math.floor((hoy.getTime() - fechaRevision.getTime()) / (1000 * 60 * 60 * 24));
      
      return diferenciaDias <= 7; // Mensajes de los últimos 7 días
    } catch (error) {
      return false;
    }
  }

  // 🔥 Marcar mensajes como leídos
  marcarComoLeido(): void {
    this.mensajesNuevos = 0;
    localStorage.setItem('sugerencias_leidas', new Date().toISOString());
  }

  // 🔥 VACIAR HISTORIAL COMPLETO (elimina permanentemente)
  vaciarHistorial(): void {
    if (this.sugerencias.length === 0) {
      this.error = 'No hay sugerencias para eliminar';
      return;
    }

    if (!confirm('¿Estás seguro de que quieres vaciar el historial de sugerencias?\n\n✅ Esta acción eliminará PERMANENTEMENTE todas tus sugerencias del sistema.\n❌ No se podrán recuperar.')) {
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.error = 'Usuario no autenticado';
      return;
    }

    this.vaciandoHistorial = true;
    
    this.articulosService.deleteSugerenciasByDocente(currentUser.id).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.sugerencias = [];
          this.mensajesNuevos = 0;
          this.success = '✅ Historial de sugerencias vaciado permanentemente';
          
          setTimeout(() => {
            this.success = null;
          }, 3000);
        } else {
          this.error = response.message || 'Error al vaciar el historial';
        }
        this.vaciandoHistorial = false;
      },
      error: (error: any) => {
        this.error = 'Error al vaciar el historial';
        this.vaciandoHistorial = false;
        console.error('Error:', error);
      }
    });
  }

  // 🔥 VACIAR SOLO SUGERENCIAS PROCESADAS (elimina permanentemente)
  vaciarSugerenciasProcesadas(): void {
    const sugerenciasProcesadas = this.sugerencias.filter(
      sug => sug.estado === 'APROBADA' || sug.estado === 'RECHAZADA'
    );

    if (sugerenciasProcesadas.length === 0) {
      this.error = 'No hay sugerencias procesadas para eliminar';
      return;
    }

    if (!confirm(`¿Estás seguro de que quieres eliminar PERMANENTEMENTE ${sugerenciasProcesadas.length} sugerencias procesadas?\n\n✅ Se eliminarán solo las sugerencias aprobadas y rechazadas.\n✅ Se mantendrán las sugerencias pendientes.\n❌ No se podrán recuperar.`)) {
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.error = 'Usuario no autenticado';
      return;
    }

    this.vaciandoHistorial = true;
    
    this.articulosService.deleteSugerenciasProcesadasByDocente(currentUser.id).subscribe({
      next: (response: any) => {
        if (response.success) {
          // Recargar las sugerencias desde el almacenamiento actualizado
          this.cargarMisSugerencias();
          this.success = `✅ Se eliminaron permanentemente ${sugerenciasProcesadas.length} sugerencias procesadas`;
          
          setTimeout(() => {
            this.success = null;
          }, 3000);
        } else {
          this.error = response.message || 'Error al eliminar sugerencias procesadas';
        }
        this.vaciandoHistorial = false;
      },
      error: (error: any) => {
        this.error = 'Error al eliminar sugerencias procesadas';
        this.vaciandoHistorial = false;
        console.error('Error:', error);
      }
    });
  }

  cargarPartidas(): void {
    this.articulosService.getPartidas().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.partidas = response.data.map((codigo: string) => ({
            codigo: codigo,
            nombre: this.articulosService.getNombrePartida(codigo)
          }));
        }
      },
      error: (error: any) => {
        console.error('Error al cargar partidas:', error);
      }
    });
  }

  verificarArticulosExistentes(): void {
    if (!this.articulo.nombre?.trim()) {
      this.articulosExistentes = [];
      return;
    }

    this.articulosService.buscarArticulos(this.articulo.nombre).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.articulosExistentes = response.data;
        } else {
          this.articulosExistentes = [];
        }
      },
      error: (error: any) => {
        console.error('Error al verificar artículos:', error);
        this.articulosExistentes = [];
      }
    });
  }

  onSubmit(): void {
    if (this.articulosExistentes.length > 0) {
      this.error = 'Ya existen artículos con nombres similares. Verifica la lista abajo.';
      return;
    }

    this.loading = true;
    this.error = null;
    this.success = null;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.error = 'Usuario no autenticado';
      this.loading = false;
      return;
    }

    const docenteNombre = currentUser.nombre || currentUser.email || 'Docente';

    const sugerenciaData: CreateSugerenciaRequest = {
      nombre: this.articulo.nombre!,
      precioReferencia: this.articulo.precioReferencia!,
      partidaCodigo: this.articulo.partidaCodigo!,
      docenteId: currentUser.id,
      docenteNombre: docenteNombre
    };

    this.articulosService.createSugerencia(sugerenciaData).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.success = '✅ Sugerencia enviada exitosamente. Estará en revisión por los administradores.';
          this.articulo = {
            nombre: '',
            precioReferencia: 0,
            partidaCodigo: ''
          };
          this.cargarMisSugerencias();
        } else {
          this.error = response.message || 'Error al enviar la sugerencia';
        }
        this.loading = false;
      },
      error: (error: any) => {
        this.error = 'Error al enviar la sugerencia';
        this.loading = false;
        console.error('Error:', error);
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/catalogo']);
  }

  // 🔥 Métodos auxiliares para el historial
  getTextoEstado(estado: string): string {
    switch (estado) {
      case 'APROBADA': return '✅ Aprobada';
      case 'RECHAZADA': return '❌ Rechazada';
      case 'PENDIENTE': return '⏳ Pendiente';
      default: return 'Desconocido';
    }
  }

  getClaseEstado(estado: string): string {
    switch (estado) {
      case 'APROBADA': return 'bg-success';
      case 'RECHAZADA': return 'bg-danger';
      case 'PENDIENTE': return 'bg-warning';
      default: return 'bg-secondary';
    }
  }

  tieneSugerenciasPendientes(): boolean {
    return this.sugerencias.some(sug => sug.estado === 'PENDIENTE');
  }

  tieneSugerenciasProcesadas(): boolean {
    return this.sugerencias.some(sug => sug.estado === 'APROBADA' || sug.estado === 'RECHAZADA');
  }

  getContadorPorEstado(estado: string): number {
    return this.sugerencias.filter(sug => sug.estado === estado).length;
  }

  getTotalSugerenciasProcesadas(): number {
    return this.sugerencias.filter(sug => sug.estado === 'APROBADA' || sug.estado === 'RECHAZADA').length;
  }

  formatearPrecio(precio: number): string {
    return `$${precio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
  }
}