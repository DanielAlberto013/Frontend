import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Articulo } from '../../core/models/articulo.model';
import { Proyecto } from '../../core/models/proyecto.model';
import { PartidaPresupuestal } from '../../core/models/partida.model';
import { CotizacionItem } from '../../core/models/cotizacion.model';
import { ArticulosService } from '../../core/services/articulos.service';
import { ProyectosService } from '../../core/services/proyectos.service';
import { PartidasService } from '../../core/services/partidas.service';
import { CotizacionesService } from '../../core/services/cotizaciones.service';
import { AuthService } from '../../auth/auth';

@Component({
  selector: 'app-cotizaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './cotizaciones.component.html',
  styleUrls: ['./cotizaciones.component.css']
})
export class CotizacionesComponent implements OnInit {
  // Datos del sistema
  articulos: Articulo[] = [];
  proyectos: Proyecto[] = [];
  partidas: PartidaPresupuestal[] = [];
  
  // Selecciones del usuario
  proyectoSeleccionado: Proyecto | null = null;
  partidaSeleccionada: PartidaPresupuestal | null = null;
  fuenteSeleccionada: 'FEDERAL' | 'ESTATAL' = 'FEDERAL';
  
  // Carrito de compras
  carrito: CotizacionItem[] = [];
  
  // Estados
  loading = true;
  error: string | null = null;
  searchTerm: string = '';

  constructor(
    private articulosService: ArticulosService,
    private proyectosService: ProyectosService,
    private partidasService: PartidasService,
    private cotizacionesService: CotizacionesService,
    private router: Router,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  cargarDatosIniciales(): void {
    this.loading = true;
    this.cargarProyectosUsuario();
  }

  private cargarProyectosUsuario(): void {
    if (this.authService.isAdmin() || this.authService.isRevisor()) {
      this.proyectosService.getProyectosPorEstado('APROBADO').subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.proyectos = response.data;
            this.cargarArticulos();
          } else {
            this.error = 'No se pudieron cargar los proyectos aprobados';
            this.loading = false;
          }
        },
        error: (error) => {
          this.error = 'Error al cargar proyectos aprobados';
          this.loading = false;
          console.error('Error:', error);
        }
      });
    } else if (this.authService.isDocente()) {
      this.proyectosService.getMisProyectos().subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.proyectos = response.data.filter(p => p.estado === 'APROBADO');
            if (this.proyectos.length === 0) {
              this.error = 'No tienes proyectos aprobados para realizar cotizaciones. Contacta al administrador.';
            }
            this.cargarArticulos();
          } else {
            this.error = 'No se pudieron cargar tus proyectos';
            this.loading = false;
          }
        },
        error: (error) => {
          this.error = 'Error al cargar tus proyectos';
          this.loading = false;
          console.error('Error:', error);
        }
      });
    } else {
      this.loading = false;
    }
  }

  private cargarArticulos(): void {
    this.articulosService.getArticulos().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.articulos = response.data;
          this.loading = false;
        } else {
          this.error = 'No se pudieron cargar los artículos';
          this.loading = false;
        }
      },
      error: (error) => {
        this.error = 'Error al cargar artículos';
        this.loading = false;
        console.error('Error:', error);
      }
    });
  }

  onProyectoChangeSeleccionado(event: any): void {
    const proyectoId = event.target.value;
    const proyecto = this.proyectos.find(p => p.id === proyectoId);
    if (proyecto) {
      this.onProyectoChange(proyecto);
    }
  }

  onPartidaChangeSeleccionado(event: any): void {
    const partidaId = event.target.value;
    const partida = this.partidas.find(p => p.id === partidaId);
    if (partida) {
      this.onPartidaChange(partida);
    }
  }

  onProyectoChange(proyecto: Proyecto): void {
    this.proyectoSeleccionado = proyecto;
    this.partidaSeleccionada = null;
    this.carrito = [];
    this.cargarPartidasProyecto(proyecto.id);
  }

  private cargarPartidasProyecto(proyectoId: string): void {
    this.partidasService.getPartidasByProyecto(proyectoId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.partidas = response.data;
        } else {
          this.partidas = [];
          console.warn('No se encontraron partidas para este proyecto');
        }
      },
      error: (error) => {
        console.error('Error al cargar partidas:', error);
        this.partidas = [];
      }
    });
  }

  onPartidaChange(partida: PartidaPresupuestal): void {
    this.partidaSeleccionada = partida;
    this.carrito = [];
  }

  getNombrePartida(codigo: string): string {
    return this.articulosService.getNombrePartida(codigo);
  }

  puedeAgregarArticulo(articulo: Articulo): boolean {
    if (!this.partidaSeleccionada) return false;
    
    if (articulo.partidaCodigo !== this.partidaSeleccionada.codigo) {
      return false;
    }

    const itemExistente = this.carrito.find(item => item.articuloId === articulo.id);
    let costoAdicional = articulo.precioReferencia;
    
    if (itemExistente) {
      costoAdicional = itemExistente.precioUnitario;
    }
    
    return this.totalCarrito + costoAdicional <= this.saldoDisponible;
  }

  agregarAlCarrito(articulo: Articulo): void {
    if (!this.partidaSeleccionada) {
      alert('Primero selecciona una partida presupuestal');
      return;
    }

    if (articulo.partidaCodigo !== this.partidaSeleccionada.codigo) {
      alert(`❌ No puedes agregar este artículo a la partida ${this.partidaSeleccionada.codigo}\n\nEl artículo "${articulo.nombre}" pertenece a la partida ${articulo.partidaCodigo} y solo puede ser agregado en cotizaciones de esa partida.`);
      return;
    }

    const subtotalItem = articulo.precioReferencia;
    let nuevoTotal = this.totalCarrito;
    const itemExistente = this.carrito.find(item => item.articuloId === articulo.id);
    
    if (itemExistente) {
      nuevoTotal = this.totalCarrito - itemExistente.subtotal + (itemExistente.cantidad + 1) * itemExistente.precioUnitario;
    } else {
      nuevoTotal = this.totalCarrito + subtotalItem;
    }

    if (nuevoTotal > this.saldoDisponible) {
      const saldoRestante = this.saldoDisponible - this.totalCarrito;
      alert(`🚫 PRESUPUESTO INSUFICIENTE\n\nNo puedes agregar "${articulo.nombre}"\n\n💰 Saldo disponible en ${this.partidaSeleccionada.codigo}: $${this.saldoDisponible}\n🛒 Total actual del carrito: $${this.totalCarrito}\n💵 Saldo restante: $${saldoRestante}\n\nEste artículo costaría: $${subtotalItem}\n\n⚠️ Ajusta tu carrito o selecciona artículos más económicos.`);
      return;
    }

    if (itemExistente) {
      itemExistente.cantidad += 1;
      itemExistente.subtotal = itemExistente.cantidad * itemExistente.precioUnitario;
    } else {
      const nuevoItem: CotizacionItem = {
        id: Date.now().toString(),
        articuloId: articulo.id,
        articulo: articulo,
        cantidad: 1,
        precioUnitario: articulo.precioReferencia,
        subtotal: articulo.precioReferencia
      };
      this.carrito.push(nuevoItem);
    }

    this.actualizarCarrito();
  }

  // ✅ NUEVO MÉTODO: Disminuir cantidad en 1
  disminuirCantidad(item: CotizacionItem): void {
    if (item.cantidad > 1) {
      this.actualizarCantidad(item, item.cantidad - 1);
    }
  }

  // ✅ NUEVO MÉTODO: Aumentar cantidad en 1
  aumentarCantidad(item: CotizacionItem): void {
    if (this.puedeAumentarCantidad(item)) {
      this.actualizarCantidad(item, item.cantidad + 1);
    }
  }

  // ✅ NUEVO MÉTODO: Verificar si se puede aumentar la cantidad
  puedeAumentarCantidad(item: CotizacionItem): boolean {
    if (!this.partidaSeleccionada) return false;
    
    const nuevoSubtotal = (item.cantidad + 1) * item.precioUnitario;
    const totalSinEsteItem = this.totalCarrito - item.subtotal;
    const nuevoTotal = totalSinEsteItem + nuevoSubtotal;
    
    return nuevoTotal <= this.saldoDisponible;
  }

  eliminarDelCarrito(item: CotizacionItem): void {
    this.carrito = this.carrito.filter(i => i.id !== item.id);
    this.actualizarCarrito();
  }

  actualizarCantidad(item: CotizacionItem, nuevaCantidad: number): void {
    if (nuevaCantidad < 1) {
      this.eliminarDelCarrito(item);
      return;
    }

    const nuevoSubtotal = nuevaCantidad * item.precioUnitario;
    const totalSinEsteItem = this.totalCarrito - item.subtotal;
    const nuevoTotal = totalSinEsteItem + nuevoSubtotal;

    if (nuevoTotal > this.saldoDisponible) {
      const saldoRestante = this.saldoDisponible - totalSinEsteItem;
      const maximoPermitido = Math.floor(saldoRestante / item.precioUnitario);
      
      alert(`❌ No puedes aumentar la cantidad. Excederías el presupuesto disponible.\n\nSaldo disponible: $${this.saldoDisponible}\nMáximo permitido: ${maximoPermitido} unidades\nNuevo total: $${nuevoTotal}`);
      return;
    }

    item.cantidad = nuevaCantidad;
    item.subtotal = nuevoSubtotal;
    this.actualizarCarrito();
  }

  actualizarPrecio(item: CotizacionItem, nuevoPrecio: number): void {
    if (nuevoPrecio < 0) return;
    
    const nuevoSubtotal = item.cantidad * nuevoPrecio;
    const totalSinEsteItem = this.totalCarrito - item.subtotal;
    const nuevoTotal = totalSinEsteItem + nuevoSubtotal;

    if (nuevoTotal > this.saldoDisponible) {
      alert(`❌ No puedes aumentar el precio. Excederías el presupuesto disponible.\n\nSaldo disponible: $${this.saldoDisponible}\nNuevo total: $${nuevoTotal}`);
      return;
    }

    item.precioUnitario = nuevoPrecio;
    item.subtotal = nuevoSubtotal;
    this.actualizarCarrito();
  }

  actualizarCarrito(): void {
    this.carrito = [...this.carrito];
  }

  get totalCarrito(): number {
    return this.carrito.reduce((total, item) => total + item.subtotal, 0);
  }

  get saldoDisponible(): number {
    return this.partidaSeleccionada ? this.partidaSeleccionada.saldoDisponible : 0;
  }

  get saldoRestante(): number {
    return this.saldoDisponible - this.totalCarrito;
  }

  get haExcedidoPresupuesto(): boolean {
    return this.saldoRestante < 0;
  }

  get articulosFiltrados(): Articulo[] {
    let articulosFiltrados = this.articulos;
    
    if (this.partidaSeleccionada) {
      articulosFiltrados = articulosFiltrados.filter(articulo => 
        articulo.activo && articulo.partidaCodigo === this.partidaSeleccionada?.codigo
      );
    }
    
    if (this.searchTerm) {
      articulosFiltrados = articulosFiltrados.filter(articulo => 
        articulo.nombre.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
    
    return articulosFiltrados;
  }

  limpiarCarrito(): void {
    if (this.carrito.length > 0 && confirm('¿Estás seguro de limpiar el carrito?')) {
      this.carrito = [];
    }
  }

  generarCotizacion(): void {
    if (!this.proyectoSeleccionado || !this.partidaSeleccionada) {
      alert('Selecciona un proyecto y una partida antes de generar la cotización');
      return;
    }

    if (this.carrito.length === 0) {
      alert('Agrega artículos al carrito antes de generar la cotización');
      return;
    }

    if (this.haExcedidoPresupuesto) {
      alert('Has excedido el presupuesto disponible. Ajusta tu cotización.');
      return;
    }

    const confirmacion = confirm(`¿Estás seguro de crear la cotización?\n\n📋 Resumen:\n• Proyecto: ${this.proyectoSeleccionado.nombre}\n• Partida: ${this.partidaSeleccionada.codigo}\n• Total: $${this.totalCarrito.toFixed(2)}\n• Artículos: ${this.carrito.length}\n\nEsta acción no se puede deshacer.`);
    
    if (!confirmacion) {
      return;
    }

    const cotizacionData = {
      proyectoId: this.proyectoSeleccionado.id,
      partidaCodigo: this.partidaSeleccionada.codigo,
      fuente: this.fuenteSeleccionada,
      items: this.carrito.map(item => ({
        articuloId: item.articuloId,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario
      }))
    };

    this.loading = true;
    
    this.cotizacionesService.createCotizacion(cotizacionData).subscribe({
      next: (response) => {
        if (response.success) {
          this.partidasService.actualizarSaldoPartida(
            this.partidaSeleccionada!.id, 
            this.totalCarrito
          ).subscribe({
            next: (saldoResponse) => {
              this.loading = false;
              if (saldoResponse.success) {
                alert('✅ Cotización creada exitosamente y enviada a revisión\n\n💰 Saldo actualizado: $' + 
                      (saldoResponse.data?.saldoDisponible || 0).toFixed(2));
                this.carrito = [];
                this.cargarPartidasProyecto(this.proyectoSeleccionado!.id);
              } else {
                alert('⚠️ Cotización creada, pero no se pudo actualizar el saldo: ' + saldoResponse.message);
                this.carrito = [];
              }
            },
            error: (saldoError) => {
              this.loading = false;
              alert('⚠️ Cotización creada, pero hubo un error al actualizar el saldo');
              console.error('Error actualizando saldo:', saldoError);
              this.carrito = [];
            }
          });
        } else {
          this.loading = false;
          alert('❌ Error al crear la cotización: ' + response.message);
        }
      },
      error: (error) => {
        this.loading = false;
        alert('❌ Error al crear la cotización');
        console.error('Error:', error);
      }
    });
  }

  buscarArticulos(): void {
    // La búsqueda se aplica automáticamente
  }

  get hayProyectosDisponibles(): boolean {
    return this.proyectos.length > 0;
  }

  get mensajeProyectos(): string {
    if (this.authService.isDocente()) {
      return this.hayProyectosDisponibles ? 
        'Selecciona uno de tus proyectos aprobados para comenzar' : 
        'No tienes proyectos aprobados. Contacta al administrador.';
    } else {
      return this.hayProyectosDisponibles ? 
        'Selecciona un proyecto aprobado para gestionar cotizaciones' : 
        'No hay proyectos aprobados en el sistema.';
    }
  }
}