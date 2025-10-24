import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Articulo } from '../../core/models/articulo.model';
import { ArticulosService } from '../../core/services/articulos.service';
import { AuthService } from '../../auth/auth';

// Angular Material imports
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterModule,
    // Angular Material modules
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './catalogo.component.html',
  styleUrls: ['./catalogo.component.css']
})
export class CatalogoComponent implements OnInit {
  articulos: Articulo[] = [];
  articulosFiltrados: Articulo[] = [];
  partidas: string[] = [];
  partidasConNombre: {codigo: string, nombre: string}[] = [];
  loading = true;
  error: string | null = null;
  
  // Filtros
  searchTerm: string = '';
  partidaFilter: string = '';

  constructor(
    private articulosService: ArticulosService,
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarPartidasYArticulos();
  }

  cargarPartidasYArticulos(): void {
    this.loading = true;
    
    // Cargar partidas primero
    this.articulosService.getPartidas().subscribe({
      next: (responsePartidas) => {
        if (responsePartidas.success && responsePartidas.data) {
          this.partidas = responsePartidas.data;
          // Crear array de partidas con nombre descriptivo
          this.partidasConNombre = responsePartidas.data.map(codigo => ({
            codigo: codigo,
            nombre: this.articulosService.getNombrePartida(codigo)
          }));
        }
        
        // Luego cargar artículos
        this.cargarArticulos();
      },
      error: (error) => {
        this.error = 'Error al cargar las partidas';
        this.loading = false;
        console.error('Error:', error);
      }
    });
  }

  cargarArticulos(): void {
    this.loading = true;
    this.error = null;
    
    this.articulosService.getArticulos().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.articulos = response.data;
          this.aplicarFiltros();
        } else {
          this.error = 'No se pudieron cargar los artículos';
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Error al cargar el catálogo';
        this.loading = false;
        console.error('Error:', error);
      }
    });
  }

  // 🔥 NUEVO: Obtener nombre descriptivo de partida
  getNombrePartida(codigo: string): string {
    return this.articulosService.getNombrePartida(codigo);
  }

  aplicarFiltros(): void {
    this.articulosFiltrados = this.articulos.filter(articulo => {
      const coincideBusqueda = !this.searchTerm || 
        articulo.nombre.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const coincidePartida = !this.partidaFilter || 
        articulo.partidaCodigo === this.partidaFilter;

      return coincideBusqueda && coincidePartida;
    });
  }

  onSearchChange(): void {
    this.aplicarFiltros();
  }

  onPartidaFilterChange(): void {
    this.aplicarFiltros();
  }

  limpiarFiltros(): void {
    this.searchTerm = '';
    this.partidaFilter = '';
    this.aplicarFiltros();
  }

  desactivarArticulo(articulo: Articulo): void {
    if (confirm(`¿Estás seguro de desactivar "${articulo.nombre}"?`)) {
      this.articulosService.desactivarArticulo(articulo.id).subscribe({
        next: () => {
          this.cargarPartidasYArticulos();
        },
        error: (error) => {
          alert('Error al desactivar artículo');
          console.error('Error:', error);
        }
      });
    }
  }

  // Métodos actualizados para navegación
  agregarNuevoArticulo(): void {
    this.router.navigate(['/articulo/nuevo']);
  }

  editarArticulo(articulo: Articulo): void {
    this.router.navigate(['/articulo/editar', articulo.id]);
  }

  agregarACotizacion(articulo: Articulo): void {
    alert(`Artículo "${articulo.nombre}" agregado a cotización (funcionalidad en desarrollo)`);
  }
}