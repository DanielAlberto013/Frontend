import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Articulo } from '../../core/models/articulo.model';
import { Proyecto } from '../../core/models/proyecto.model';
import { PartidaPresupuestal } from '../../core/models/partida.model';
import { CotizacionItem } from '../../core/models/cotizacion.model';
import { ArticulosService } from '../../core/services/articulos.service';
import { ProyectosService } from '../../core/services/proyectos.service';
import { PartidasService } from '../../core/services/partidas.service';
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
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  cargarDatosIniciales(): void {
    this.loading = true;
    
    // Por ahora simulamos datos ya que no hay backend
    this.simularCargaDatos();
  }

  private simularCargaDatos(): void {
    setTimeout(() => {
      // Proyectos de ejemplo
      this.proyectos = [
        {
          id: '1',
          nombre: 'Desarrollo de Material Biodegradable',
          descripcion: 'Investigación sobre materiales alternativos al plástico',
          docenteId: '1',
          docente: {
            id: '1',
            nombre: 'Juan Pérez',
            email: 'juan@email.com',
            role: 'DOCENTE',
            createdAt: new Date()
          },
          presupuestoTotal: 100000,
          presupuestoFederal: 50000,
          presupuestoEstatal: 50000,
          edicion: '2025',
          estado: 'EN_REVISION',
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-20')
        }
      ];

      // Partidas de ejemplo
      this.partidas = [
        {
          id: '1',
          codigo: '21.1',
          nombre: 'Materiales de Papelería',
          descripcion: 'Papelería y útiles de oficina',
          importeAsignado: 20000,
          proyectoId: '1',
          saldoDisponible: 20000,
          createdAt: new Date()
        },
        {
          id: '2',
          codigo: '25.1',
          nombre: 'Productos Químicos',
          descripcion: 'Reactivos y productos químicos para laboratorio',
          importeAsignado: 30000,
          proyectoId: '1',
          saldoDisponible: 30000,
          createdAt: new Date()
        }
      ];

      // Artículos de ejemplo
      this.articulos = [
        {
          id: '1',
          nombre: 'Hojas Blancas A4',
          descripcion: 'Paquete de 500 hojas tamaño carta',
          partidaCodigo: '21.1',
          precioReferencia: 120.50,
          activo: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          nombre: 'Lápices Mirado No. 2',
          descripcion: 'Caja con 12 lápices',
          partidaCodigo: '21.1',
          precioReferencia: 45.00,
          activo: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '3',
          nombre: 'Reactivo Etileno',
          descripcion: 'Reactivo para laboratorio químico',
          partidaCodigo: '25.1',
          precioReferencia: 280.75,
          activo: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      this.loading = false;
    }, 1000);
  }

  // Métodos corregidos para los selects
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
    this.carrito = []; // Limpiar carrito al cambiar proyecto
  }

  onPartidaChange(partida: PartidaPresupuestal): void {
    this.partidaSeleccionada = partida;
    this.carrito = []; // Limpiar carrito al cambiar partida
  }

  // ✅ NUEVO MÉTODO: Verificar si se puede agregar un artículo
  puedeAgregarArticulo(articulo: Articulo): boolean {
    if (!this.partidaSeleccionada) return false;
    
    // Verificar que el artículo pertenezca a la partida seleccionada
    if (articulo.partidaCodigo !== this.partidaSeleccionada.codigo) {
      return false;
    }

    const itemExistente = this.carrito.find(item => item.articuloId === articulo.id);
    let costoAdicional = articulo.precioReferencia;
    
    if (itemExistente) {
      costoAdicional = itemExistente.precioUnitario; // Costo de una unidad adicional
    }
    
    return this.totalCarrito + costoAdicional <= this.saldoDisponible;
  }

  agregarAlCarrito(articulo: Articulo): void {
    if (!this.partidaSeleccionada) {
      alert('Primero selecciona una partida presupuestal');
      return;
    }

    // ✅ VALIDACIÓN CRÍTICA: Verificar que el artículo pertenezca a la partida seleccionada
    if (articulo.partidaCodigo !== this.partidaSeleccionada.codigo) {
      alert(`❌ No puedes agregar este artículo a la partida ${this.partidaSeleccionada.codigo}\n\nEl artículo "${articulo.nombre}" pertenece a la partida ${articulo.partidaCodigo} y solo puede ser agregado en cotizaciones de esa partida.`);
      return;
    }

    // ✅ VALIDACIÓN DE PRESUPUESTO: Verificar que no se exceda el saldo
    const subtotalItem = articulo.precioReferencia;
    
    // Calcular el nuevo total si agregamos este artículo
    let nuevoTotal = this.totalCarrito;
    const itemExistente = this.carrito.find(item => item.articuloId === articulo.id);
    
    if (itemExistente) {
      // Si ya existe, calcular el nuevo subtotal
      nuevoTotal = this.totalCarrito - itemExistente.subtotal + (itemExistente.cantidad + 1) * itemExistente.precioUnitario;
    } else {
      // Si es nuevo, sumar el subtotal
      nuevoTotal = this.totalCarrito + subtotalItem;
    }

    // ✅ BLOQUEO: No permitir agregar si excede el presupuesto
    if (nuevoTotal > this.saldoDisponible) {
      const saldoRestante = this.saldoDisponible - this.totalCarrito;
      alert(`🚫 PRESUPUESTO INSUFICIENTE\n\nNo puedes agregar "${articulo.nombre}"\n\n💰 Saldo disponible en ${this.partidaSeleccionada.codigo}: $${this.saldoDisponible}\n🛒 Total actual del carrito: $${this.totalCarrito}\n💵 Saldo restante: $${saldoRestante}\n\nEste artículo costaría: $${subtotalItem}\n\n⚠️ Ajusta tu carrito o selecciona artículos más económicos.`);
      return;
    }

    // Si pasa todas las validaciones, agregar al carrito
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

  eliminarDelCarrito(item: CotizacionItem): void {
    this.carrito = this.carrito.filter(i => i.id !== item.id);
    this.actualizarCarrito();
  }

  actualizarCantidad(item: CotizacionItem, nuevaCantidad: number): void {
    if (nuevaCantidad < 1) {
      this.eliminarDelCarrito(item);
      return;
    }

    // ✅ VALIDAR PRESUPUESTO ANTES DE ACTUALIZAR
    const nuevoSubtotal = nuevaCantidad * item.precioUnitario;
    const totalSinEsteItem = this.totalCarrito - item.subtotal;
    const nuevoTotal = totalSinEsteItem + nuevoSubtotal;

    if (nuevoTotal > this.saldoDisponible) {
      alert(`❌ No puedes aumentar la cantidad. Excederías el presupuesto disponible.\n\nSaldo disponible: $${this.saldoDisponible}\nNuevo total: $${nuevoTotal}`);
      return;
    }

    item.cantidad = nuevaCantidad;
    item.subtotal = nuevoSubtotal;
    this.actualizarCarrito();
  }

  actualizarPrecio(item: CotizacionItem, nuevoPrecio: number): void {
    if (nuevoPrecio < 0) return;
    
    // ✅ VALIDAR PRESUPUESTO ANTES DE ACTUALIZAR
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
    // Forzar actualización de la vista
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
    
    // Primero filtrar por partida seleccionada
    if (this.partidaSeleccionada) {
      articulosFiltrados = articulosFiltrados.filter(articulo => 
        articulo.activo && articulo.partidaCodigo === this.partidaSeleccionada?.codigo
      );
    }
    
    // Luego aplicar búsqueda si existe
    if (this.searchTerm) {
      articulosFiltrados = articulosFiltrados.filter(articulo => 
        articulo.nombre.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        articulo.descripcion.toLowerCase().includes(this.searchTerm.toLowerCase())
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

    // Mostrar resumen de la cotización
    const resumen = `
      📋 RESUMEN DE COTIZACIÓN

      Proyecto: ${this.proyectoSeleccionado.nombre}
      Partida: ${this.partidaSeleccionada.codigo} - ${this.partidaSeleccionada.nombre}
      Fuente: ${this.fuenteSeleccionada}

      Artículos (${this.carrito.length}):
      ${this.carrito.map(item => 
        `• ${item.articulo.nombre} - ${item.cantidad} x $${item.precioUnitario} = $${item.subtotal}`
      ).join('\n')}

      💰 TOTAL: $${this.totalCarrito}
      📊 Saldo disponible: $${this.saldoDisponible}
      💵 Saldo restante: $${this.saldoRestante}

      ✅ Cotización lista para enviar a revisión
    `;

    alert(resumen);
  }

  buscarArticulos(): void {
    // Simulación de búsqueda
    console.log('Buscando:', this.searchTerm);
  }
}