import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Articulo } from '../../core/models/articulo.model';
import { CreateSugerenciaRequest } from '../../core/models/articulo.model';
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
  articulo: Partial<Articulo> = {
    nombre: '',
    precioReferencia: 0,
    partidaCodigo: ''
  };
  
  loading = false;
  error: string | null = null;
  success: string | null = null;
  articulosExistentes: Articulo[] = [];
  partidas: {codigo: string, nombre: string}[] = [];

  constructor(
    private articulosService: ArticulosService,
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarPartidas();
  }

  cargarPartidas(): void {
    this.articulosService.getPartidas().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.partidas = response.data.map(codigo => ({
            codigo: codigo,
            nombre: this.articulosService.getNombrePartida(codigo)
          }));
        }
      },
      error: (error) => {
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
      next: (response) => {
        if (response.success && response.data) {
          this.articulosExistentes = response.data;
        } else {
          this.articulosExistentes = [];
        }
      },
      error: (error) => {
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

    // 🔥 CORRECCIÓN: Usar solo el nombre o email si no hay apellido
    const docenteNombre = currentUser.nombre || currentUser.email || 'Docente';

    const sugerenciaData: CreateSugerenciaRequest = {
      nombre: this.articulo.nombre!,
      precioReferencia: this.articulo.precioReferencia!,
      partidaCodigo: this.articulo.partidaCodigo!,
      docenteId: currentUser.id,
      docenteNombre: docenteNombre
    };

    this.articulosService.createSugerencia(sugerenciaData).subscribe({
      next: (response) => {
        if (response.success) {
          this.success = '✅ Sugerencia enviada exitosamente. Estará en revisión por los administradores.';
          setTimeout(() => {
            this.router.navigate(['/catalogo']);
          }, 2000);
        } else {
          this.error = response.message || 'Error al enviar la sugerencia';
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Error al enviar la sugerencia';
        this.loading = false;
        console.error('Error:', error);
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/catalogo']);
  }
}