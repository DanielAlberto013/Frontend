import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Article, CreateArticuloRequest, UpdateArticuloRequest } from '../../core/models/article.model';
import { ArticulosService } from '../../core/services/articulos.service';
import { AuthService } from '../../auth/auth';

@Component({
  selector: 'app-articulo-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './articulo-form.component.html',
  styleUrls: ['./articulo-form.component.css']
})
export class ArticuloFormComponent implements OnInit {
  articulo: Article = {
    id: '',
    nombre: '',
    precioReferencia: 0,
    partidaCodigo: '',
    activo: true
  };
  
  isEditMode = false;
  loading = false;
  error: string | null = null;
  articulosExistentes: Article[] = [];

  // Partidas dinámicas desde el servicio
  partidas: {codigo: string, nombre: string}[] = [];

  constructor(
    private articulosService: ArticulosService,
    public authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.cargarPartidas();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.cargarArticulo(id);
    }
  }

  cargarPartidas(): void {
    this.articulosService.getPartidas().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Mapear las partidas con sus nombres descriptivos
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

  cargarArticulo(id: string): void {
    this.loading = true;
    this.articulosService.getArticulos().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const articuloEncontrado = response.data.find(a => a.id === id);
          if (articuloEncontrado) {
            this.articulo = articuloEncontrado;
          } else {
            this.error = 'Artículo no encontrado';
          }
        } else {
          this.error = 'Error al cargar el artículo';
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Error al cargar el artículo';
        this.loading = false;
        console.error('Error:', error);
      }
    });
  }

  verificarArticulosExistentes(): void {
    if (!this.articulo.nombre.trim()) {
      this.articulosExistentes = [];
      return;
    }

    this.articulosService.buscarArticulos(this.articulo.nombre).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.articulosExistentes = response.data.filter(art => 
            this.isEditMode ? art.id !== this.articulo.id : true
          );
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
    if (this.articulosExistentes.length > 0 && !this.isEditMode) {
      this.error = 'Ya existen artículos con nombres similares. Verifica la lista abajo.';
      return;
    }

    this.loading = true;
    this.error = null;

    if (this.isEditMode) {
      this.actualizarArticulo();
    } else {
      this.crearArticulo();
    }
  }

  private crearArticulo(): void {
    const createData: CreateArticuloRequest = {
      nombre: this.articulo.nombre,
      precioReferencia: this.articulo.precioReferencia,
      partidaCodigo: this.articulo.partidaCodigo
    };

    this.articulosService.createArticulo(createData).subscribe({
      next: (response) => {
        if (response.success) {
          this.router.navigate(['/catalogo']);
        } else {
          this.error = response.message || 'Error al crear el artículo';
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Error al crear el artículo';
        this.loading = false;
        console.error('Error:', error);
      }
    });
  }

  private actualizarArticulo(): void {
    const updateData: UpdateArticuloRequest = {
      nombre: this.articulo.nombre,
      precioReferencia: this.articulo.precioReferencia,
      partidaCodigo: this.articulo.partidaCodigo,
      activo: this.articulo.activo
    };

    this.articulosService.updateArticulo(this.articulo.id, updateData).subscribe({
      next: (response) => {
        if (response.success) {
          this.router.navigate(['/catalogo']);
        } else {
          this.error = response.message || 'Error al actualizar el artículo';
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Error al actualizar el artículo';
        this.loading = false;
        console.error('Error:', error);
      }
    });
  }
  
  desactivarArticulo(): void {
    if (confirm(`¿Estás seguro de desactivar "${this.articulo.nombre}"? El artículo ya no estará disponible para cotizaciones.`)) {
      this.loading = true;
      this.articulosService.desactivarArticulo(this.articulo.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.router.navigate(['/catalogo']);
          } else {
            this.error = response.message || 'Error al desactivar el artículo';
          }
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Error al desactivar el artículo';
          this.loading = false;
          console.error('Error:', error);
        }
      });
    }
  }

  cancelar(): void {
    this.router.navigate(['/catalogo']);
  }

  tienePermisos(): boolean {
    return this.authService.isAdmin() || this.authService.isRevisor();
  }
}