import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SugerenciaArticulo, ReviewSugerenciaRequest, Article } from '../../core/models/article.model';
import { ArticulosService } from '../../core/services/articulos.service';
import { AuthService } from '../../auth/auth';

@Component({
  selector: 'app-revision-sugerencias',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './revision-sugerencias.component.html',
  styleUrls: ['./revision-sugerencias.component.css']
})
export class RevisionSugerenciasComponent implements OnInit {
  sugerencias: SugerenciaArticulo[] = [];
  loading = true;
  error: string | null = null;

  // Modal
  sugerenciaSeleccionada: SugerenciaArticulo | null = null;
  comentarios: string = '';
  revisando = false;

  // 🔥 NUEVO: Propiedades para edición
  editandoArticulo = false;
  articuloEditado: Partial<Article> = {
    nombre: '',
    precioReferencia: 0,
    partidaCodigo: ''
  };
  partidas: {codigo: string, nombre: string}[] = [];

  constructor(
    public articulosService: ArticulosService,
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarSugerencias();
    this.cargarPartidas();
  }

  cargarSugerencias(): void {
    this.loading = true;
    this.articulosService.getSugerenciasPendientes().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.sugerencias = response.data;
        } else {
          this.error = 'Error al cargar las sugerencias';
        }
        this.loading = false;
      },
      error: (error: any) => {
        this.error = 'Error al cargar las sugerencias';
        this.loading = false;
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

  verDetalles(sugerencia: SugerenciaArticulo): void {
    this.sugerenciaSeleccionada = { ...sugerencia }; // 🔥 CAMBIO: Crear copia
    this.comentarios = '';
    this.editandoArticulo = false;
    
    // 🔥 NUEVO: Inicializar datos del artículo para edición
    this.articuloEditado = {
      nombre: sugerencia.nombre,
      precioReferencia: sugerencia.precioReferencia,
      partidaCodigo: sugerencia.partidaCodigo
    };
  }

  // 🔥 NUEVO: Activar modo edición
  activarEdicion(): void {
    this.editandoArticulo = true;
  }

  // 🔥 NUEVO: Cancelar edición
  cancelarEdicion(): void {
    this.editandoArticulo = false;
    // Restaurar valores originales
    if (this.sugerenciaSeleccionada) {
      this.articuloEditado = {
        nombre: this.sugerenciaSeleccionada.nombre,
        precioReferencia: this.sugerenciaSeleccionada.precioReferencia,
        partidaCodigo: this.sugerenciaSeleccionada.partidaCodigo
      };
    }
  }

  // 🔥 CORREGIDO: Guardar cambios de edición
  guardarCambios(): void {
    if (!this.sugerenciaSeleccionada) return;

    // Validar campos requeridos
    if (!this.articuloEditado.nombre?.trim()) {
      this.error = 'El nombre del artículo es requerido';
      return;
    }

    if (!this.articuloEditado.partidaCodigo) {
      this.error = 'La partida presupuestal es requerida';
      return;
    }

    if (!this.articuloEditado.precioReferencia || this.articuloEditado.precioReferencia <= 0) {
      this.error = 'El precio de referencia debe ser mayor a 0';
      return;
    }

    // 🔥 CORRECCIÓN: Actualizar la sugerencia seleccionada con los datos editados
    this.sugerenciaSeleccionada = {
      ...this.sugerenciaSeleccionada,
      nombre: this.articuloEditado.nombre!,
      precioReferencia: this.articuloEditado.precioReferencia!,
      partidaCodigo: this.articuloEditado.partidaCodigo!
    };

    console.log('💾 Cambios guardados en sugerencia:', this.sugerenciaSeleccionada);

    this.editandoArticulo = false;
    this.error = null;
  }

  cerrarModal(): void {
    this.sugerenciaSeleccionada = null;
    this.comentarios = '';
    this.revisando = false;
    this.editandoArticulo = false;
    this.articuloEditado = {
      nombre: '',
      precioReferencia: 0,
      partidaCodigo: ''
    };
  }

  aprobarSugerencia(): void {
    this.revisarSugerencia('APROBADA');
  }

  rechazarSugerencia(): void {
    this.revisarSugerencia('RECHAZADA');
  }

  private revisarSugerencia(estado: 'APROBADA' | 'RECHAZADA'): void {
    if (!this.sugerenciaSeleccionada) return;

    this.revisando = true;
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.error = 'Usuario no autenticado';
      this.revisando = false;
      return;
    }

    // 🔥 CORREGIDO: Usar los datos actualizados de la sugerencia seleccionada
    const reviewData: ReviewSugerenciaRequest = {
      estado: estado,
      adminRevisorId: currentUser.id,
      comentarios: this.comentarios.trim() || undefined,
      // 🔥 ENVIAR SIEMPRE los datos actualizados (editados o no)
      nombreEditado: this.sugerenciaSeleccionada.nombre,
      precioEditado: this.sugerenciaSeleccionada.precioReferencia,
      partidaEditada: this.sugerenciaSeleccionada.partidaCodigo
    };

    console.log('📤 Enviando datos al servicio:', {
      original: this.sugerencias.find(s => s.id === this.sugerenciaSeleccionada!.id),
      enviado: reviewData,
      hayCambios: this.hayCambiosPendientes()
    });

    this.articulosService.reviewSugerencia(this.sugerenciaSeleccionada.id, reviewData).subscribe({
      next: (response: any) => {
        if (response.success) {
          console.log('✅ Respuesta del servicio:', response.data);
          this.cerrarModal();
          this.cargarSugerencias(); // Recargar la lista
        } else {
          this.error = response.message || 'Error al revisar la sugerencia';
        }
        this.revisando = false;
      },
      error: (error: any) => {
        this.error = 'Error al revisar la sugerencia';
        this.revisando = false;
        console.error('Error:', error);
      }
    });
  }

  volverAlCatalogo(): void {
    this.router.navigate(['/catalogo']);
  }

  // 🔥 NUEVO: Verificar si hay cambios pendientes
  hayCambiosPendientes(): boolean {
    if (!this.sugerenciaSeleccionada) return false;
    
    // Comparar con la sugerencia original del array
    const sugerenciaOriginal = this.sugerencias.find(s => s.id === this.sugerenciaSeleccionada!.id);
    if (!sugerenciaOriginal) return false;
    
    return this.articuloEditado.nombre !== sugerenciaOriginal.nombre ||
           this.articuloEditado.precioReferencia !== sugerenciaOriginal.precioReferencia ||
           this.articuloEditado.partidaCodigo !== sugerenciaOriginal.partidaCodigo;
  }

  // 🔥 NUEVO: Formatear precio
  formatearPrecio(precio: number): string {
    return `$${precio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
  }

  // 🔥 NUEVO: Obtener texto para botón de aprobación
  getTextoAprobar(): string {
    return this.hayCambiosPendientes() ? 'Aprobar con Cambios' : 'Aprobar';
  }
}