import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SugerenciaArticulo, ReviewSugerenciaRequest } from '../../core/models/articulo.model';
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

  constructor(
    public articulosService: ArticulosService, // 🔥 CAMBIAR de private a public
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarSugerencias();
  }

  cargarSugerencias(): void {
    this.loading = true;
    this.articulosService.getSugerenciasPendientes().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.sugerencias = response.data;
        } else {
          this.error = 'Error al cargar las sugerencias';
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Error al cargar las sugerencias';
        this.loading = false;
        console.error('Error:', error);
      }
    });
  }

  verDetalles(sugerencia: SugerenciaArticulo): void {
    this.sugerenciaSeleccionada = sugerencia;
    this.comentarios = '';
  }

  cerrarModal(): void {
    this.sugerenciaSeleccionada = null;
    this.comentarios = '';
    this.revisando = false;
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

    const reviewData: ReviewSugerenciaRequest = {
      estado: estado,
      adminRevisorId: currentUser.id,
      comentarios: this.comentarios.trim() || undefined
    };

    this.articulosService.reviewSugerencia(this.sugerenciaSeleccionada.id, reviewData).subscribe({
      next: (response) => {
        if (response.success) {
          this.cerrarModal();
          this.cargarSugerencias();
        } else {
          this.error = response.message || 'Error al revisar la sugerencia';
        }
        this.revisando = false;
      },
      error: (error) => {
        this.error = 'Error al revisar la sugerencia';
        this.revisando = false;
        console.error('Error:', error);
      }
    });
  }

  volverAlCatalogo(): void {
    this.router.navigate(['/catalogo']);
  }
}