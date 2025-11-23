// src/app/cotizaciones/cotizaciones.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Article } from '../../core/models/article.model';
import { project } from '../../core/models/proyecto.model';
import { PartidaPresupuestal } from '../../core/models/partida.model';
import { CotizacionItem, Cotizacion } from '../../core/models/cotizacion.model';
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
  articulos: Article[] = [];
  proyectos: project[] = [];
  partidas: PartidaPresupuestal[] = [];
  cotizacionesExistentes: Cotizacion[] = [];
  
  // Selecciones del usuario
  proyectoSeleccionado: project | null = null;
  partidaSeleccionada: PartidaPresupuestal | null = null;
  fuenteSeleccionada: 'FEDERAL' | 'ESTATAL' = 'FEDERAL';
  
  // Carrito de compras
  carrito: CotizacionItem[] = [];
  
  // Estados
  loading = true;
  error: string | null = null;
  searchTerm: string = '';

  // PROPIEDADES PARA CONTROL DE FUENTE (SALDOS DEL PROYECTO)
  saldoFederalDisponible: number = 0;
  saldoEstatalDisponible: number = 0;

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

  // ✅ VERIFICAR SI YA EXISTE CUALQUIER COTIZACIÓN PARA ESTA PARTIDA
  get partidaTieneCotizacion(): boolean {
    if (!this.proyectoSeleccionado || !this.partidaSeleccionada) {
      return false;
    }
    
    // ✅ VERIFICAR SOLO EN EL PROYECTO SELECCIONADO
    return this.cotizacionesExistentes.some(cotizacion => 
      cotizacion.proyectoId === this.proyectoSeleccionado!.id && 
      cotizacion.partidaCodigo === this.partidaSeleccionada!.codigo
    );
  }

  // ✅ OBTENER INFORMACIÓN DE LA COTIZACIÓN EXISTENTE
  get infoCotizacionExistente(): string {
    if (!this.partidaTieneCotizacion) return '';
    
    const cotizacionesPartida = this.cotizacionesExistentes.filter(c => 
      c.proyectoId === this.proyectoSeleccionado!.id && 
      c.partidaCodigo === this.partidaSeleccionada!.codigo
    );
    
    if (cotizacionesPartida.length > 0) {
      const primeraCotizacion = cotizacionesPartida[0];
      return `Ya existe una cotización para esta partida (${primeraCotizacion.fuente} - Estado: ${primeraCotizacion.estado})`;
    }
    
    return 'Ya existe una cotización para esta partida';
  }

  // ✅ CALCULAR SALDOS DEL PROYECTO
  calcularSaldosPorFuente(): void {
    if (!this.proyectoSeleccionado || !this.partidaSeleccionada) {
      this.saldoFederalDisponible = 0;
      this.saldoEstatalDisponible = 0;
      return;
    }

    // OBTENER SALDOS DEL PROYECTO
    const presupuestoFederalProyecto = this.proyectoSeleccionado.presupuestoFederal;
    const presupuestoEstatalProyecto = this.proyectoSeleccionado.presupuestoEstatal;

    // Obtener TODAS las cotizaciones del proyecto
    const cotizacionesProyecto = this.cotizacionesExistentes.filter(
      c => c.proyectoId === this.proyectoSeleccionado!.id
    );

    // Calcular total utilizado por cada fuente en TODO el proyecto
    const totalFederalUtilizado = cotizacionesProyecto
      .filter(c => c.fuente === 'FEDERAL')
      .reduce((sum, c) => sum + c.total, 0);

    const totalEstatalUtilizado = cotizacionesProyecto
      .filter(c => c.fuente === 'ESTATAL')
      .reduce((sum, c) => sum + c.total, 0);

    // CALCULAR SALDOS DISPONIBLES DEL PROYECTO
    this.saldoFederalDisponible = Math.max(0, presupuestoFederalProyecto - totalFederalUtilizado);
    this.saldoEstatalDisponible = Math.max(0, presupuestoEstatalProyecto - totalEstatalUtilizado);
  }

  // ✅ OBTENER SALDO DISPONIBLE SEGÚN LA FUENTE SELECCIONADA
  get saldoDisponiblePorFuente(): number {
    return this.fuenteSeleccionada === 'FEDERAL' 
      ? this.saldoFederalDisponible 
      : this.saldoEstatalDisponible;
  }

  // ✅ CALCULAR EL LÍMITE REAL (MÍNIMO ENTRE PARTIDA Y FUENTE)
  calcularLimiteReal(): number {
    if (!this.partidaSeleccionada) return 0;
    
    const limitePartida = this.partidaSeleccionada.saldoDisponible;
    const limiteFuente = this.saldoDisponiblePorFuente;
    
    // Retornar el menor de los dos límites
    return Math.min(limitePartida, limiteFuente);
  }

  // ✅ CALCULAR IVA EXACTO (16% sobre el subtotal)
  calcularIVAExacto(subtotal: number = this.totalCarrito): number {
    return subtotal * 0.16;
  }

  // ✅ CALCULAR TOTAL CON IVA EXACTO
  calcularTotalConIVA(subtotal: number = this.totalCarrito): number {
    return subtotal + this.calcularIVAExacto(subtotal);
  }

  // ✅ CALCULAR SUBTOTAL MÁXIMO BASADO EN EL LÍMITE REAL
  calcularSubtotalMaximoExacto(): number {
    const limiteReal = this.calcularLimiteReal();
    // Para que el total con IVA no exceda el límite: subtotal + (subtotal * 0.16) = límite
    // subtotal * 1.16 = límite
    // subtotal = límite / 1.16
    const subtotalMaximo = limiteReal / 1.16;
    return subtotalMaximo;
  }

  // ✅ CALCULAR IVA MÁXIMO BASADO EN EL LÍMITE REAL
  calcularIVAMaximo(): number {
    const subtotalMaximo = this.calcularSubtotalMaximoExacto();
    return this.calcularIVAExacto(subtotalMaximo);
  }

  // ✅ CAMBIAR FUENTE DE PRESUPUESTO
  onFuenteChange(fuente: 'FEDERAL' | 'ESTATAL'): void {
    this.fuenteSeleccionada = fuente;
    this.carrito = []; // Limpiar carrito al cambiar fuente
    this.calcularSaldosPorFuente();
    
    // MOSTRAR ALERTA SI LA PARTIDA YA TIENE COTIZACIÓN
    if (this.partidaTieneCotizacion) {
      setTimeout(() => {
        alert(`⚠️ ATENCIÓN\n\nYa existe una cotización para la partida ${this.partidaSeleccionada?.codigo}.\n\nNo puedes crear ninguna cotización adicional para esta partida.`);
      }, 100);
    }
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

  onProyectoChange(proyecto: project): void {
    this.proyectoSeleccionado = proyecto;
    this.partidaSeleccionada = null;
    this.carrito = [];
    this.fuenteSeleccionada = 'FEDERAL'; // Resetear a federal por defecto
    this.cargarPartidasProyecto(proyecto.id);
    this.cargarCotizacionesProyecto(proyecto.id);
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

  private cargarCotizacionesProyecto(proyectoId: string): void {
    this.cotizacionesService.getCotizacionesByProyecto(proyectoId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.cotizacionesExistentes = response.data;
          this.calcularSaldosPorFuente();
          console.log('📋 Cotizaciones cargadas para proyecto:', {
            proyectoId,
            cotizaciones: this.cotizacionesExistentes.map(c => ({
              partida: c.partidaCodigo,
              fuente: c.fuente,
              estado: c.estado
            }))
          });
        } else {
          this.cotizacionesExistentes = [];
          this.calcularSaldosPorFuente();
        }
      },
      error: (error) => {
        console.error('Error al cargar cotizaciones:', error);
        this.cotizacionesExistentes = [];
        this.calcularSaldosPorFuente();
      }
    });
  }

  onPartidaChange(partida: PartidaPresupuestal): void {
    this.partidaSeleccionada = partida;
    this.carrito = [];
    this.fuenteSeleccionada = 'FEDERAL'; // Resetear a federal por defecto
    this.calcularSaldosPorFuente();
    
    // MOSTRAR ALERTA SI LA PARTIDA YA TIENE COTIZACIÓN
    if (this.partidaTieneCotizacion) {
      setTimeout(() => {
        alert(`⚠️ ATENCIÓN\n\nYa existe una cotización para la partida ${partida.codigo}.\n\nNo puedes crear ninguna cotización adicional para esta partida.`);
      }, 100);
    }
  }

  getNombrePartida(codigo: string): string {
    return this.articulosService.getNombrePartida(codigo);
  }

  // ✅ VERIFICAR SI EL CARRITO EXCEDE EL SUBTOTAL MÁXIMO
  get haExcedidoSubtotalMaximo(): boolean {
    return this.totalCarrito > this.calcularSubtotalMaximoExacto();
  }

  // ✅ VERIFICAR SI PUEDE AGREGAR ARTÍCULO
  puedeAgregarArticulo(articulo: Article): boolean {
    if (!this.partidaSeleccionada) return false;
    
    if (articulo.partidaCodigo !== this.partidaSeleccionada.codigo) {
      return false;
    }

    const itemExistente = this.carrito.find(item => item.articuloId === articulo.id);
    let costoAdicional = articulo.precioReferencia;
    
    if (itemExistente) {
      costoAdicional = itemExistente.precioUnitario;
    }
    
    const nuevoSubtotal = this.totalCarrito + costoAdicional;
    const limiteReal = this.calcularLimiteReal();
    const subtotalMaximo = this.calcularSubtotalMaximoExacto();
    
    // ✅ USAR MÉTODOS CONSISTENTES PARA CÁLCULOS
    const totalConIVANuevo = this.calcularTotalConIVA(nuevoSubtotal);
    const dentroLimiteReal = totalConIVANuevo <= limiteReal;
    const dentroSubtotalMaximo = nuevoSubtotal <= subtotalMaximo;
    
    return dentroLimiteReal && dentroSubtotalMaximo && !this.partidaTieneCotizacion;
  }

  agregarAlCarrito(articulo: Article): void {
    if (!this.partidaSeleccionada) {
      alert('Primero selecciona una partida presupuestal');
      return;
    }

    // VERIFICAR SI LA PARTIDA YA TIENE COTIZACIÓN
    if (this.partidaTieneCotizacion) {
      alert(`❌ NO PUEDES AGREGAR ARTÍCULOS\n\nYa existe una cotización para la partida ${this.partidaSeleccionada.codigo}.\n\nNo puedes modificar o crear una nueva cotización para esta partida.`);
      return;
    }

    if (articulo.partidaCodigo !== this.partidaSeleccionada.codigo) {
      alert(`❌ No puedes agregar este artículo a la partida ${this.partidaSeleccionada.codigo}\n\nEl artículo "${articulo.nombre}" pertenece a la partida ${articulo.partidaCodigo} y solo puede ser agregado en cotizaciones de esa partida.`);
      return;
    }

    const subtotalItem = articulo.precioReferencia;
    let nuevoSubtotal = this.totalCarrito;
    const itemExistente = this.carrito.find(item => item.articuloId === articulo.id);
    
    if (itemExistente) {
      nuevoSubtotal = this.totalCarrito - itemExistente.subtotal + (itemExistente.cantidad + 1) * itemExistente.precioUnitario;
    } else {
      nuevoSubtotal = this.totalCarrito + subtotalItem;
    }

    // ✅ USAR MÉTODOS CONSISTENTES PARA CÁLCULOS
    const limiteReal = this.calcularLimiteReal();
    const totalConIVANuevo = this.calcularTotalConIVA(nuevoSubtotal);
    
    if (totalConIVANuevo > limiteReal) {
      const saldoRestante = limiteReal - this.calcularTotalConIVA();
      alert(`🚫 PRESUPUESTO INSUFICIENTE\n\nNo puedes agregar "${articulo.nombre}"\n\n💰 Límite disponible: $${limiteReal.toFixed(2)}\n🛒 Total actual con IVA: $${this.calcularTotalConIVA().toFixed(2)}\n💵 Saldo restante: $${saldoRestante.toFixed(2)}\n\nEste artículo costaría con IVA: $${this.calcularTotalConIVA(subtotalItem).toFixed(2)}\n\n⚠️ Ajusta tu carrito o selecciona artículos más económicos.`);
      return;
    }

    // ✅ VERIFICAR SUBTOTAL MÁXIMO EXACTO
    const subtotalMaximo = this.calcularSubtotalMaximoExacto();
    if (nuevoSubtotal > subtotalMaximo) {
      const espacioDisponible = subtotalMaximo - this.totalCarrito;
      alert(`🚫 EXCEDE EL SUBTOTAL MÁXIMO\n\nNo puedes agregar "${articulo.nombre}"\n\n📊 Subtotal máximo permitido (sin IVA): $${subtotalMaximo.toFixed(2)}\n🛒 Subtotal actual del carrito: $${this.totalCarrito.toFixed(2)}\n💵 Espacio disponible: $${espacioDisponible.toFixed(2)}\n\nEste artículo costaría: $${subtotalItem.toFixed(2)}\n\n💡 Recuerda: El IVA (16%) se agrega al subtotal.`);
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

  // DISMINUIR CANTIDAD EN 1
  disminuirCantidad(item: CotizacionItem): void {
    if (item.cantidad > 1) {
      this.actualizarCantidad(item, item.cantidad - 1);
    }
  }

  // AUMENTAR CANTIDAD EN 1
  aumentarCantidad(item: CotizacionItem): void {
    if (this.puedeAumentarCantidad(item)) {
      this.actualizarCantidad(item, item.cantidad + 1);
    }
  }

  // VERIFICAR SI SE PUEDE AUMENTAR LA CANTIDAD
  puedeAumentarCantidad(item: CotizacionItem): boolean {
    if (!this.partidaSeleccionada) return false;
    
    const nuevoSubtotal = (item.cantidad + 1) * item.precioUnitario;
    const totalSinEsteItem = this.totalCarrito - item.subtotal;
    const nuevoTotal = totalSinEsteItem + nuevoSubtotal;
    
    const limiteReal = this.calcularLimiteReal();
    const subtotalMaximo = this.calcularSubtotalMaximoExacto();
    
    // ✅ USAR MÉTODOS CONSISTENTES PARA CÁLCULOS
    const totalConIVANuevo = this.calcularTotalConIVA(nuevoTotal);
    const presupuestoValido = totalConIVANuevo <= limiteReal;
    const subtotalValido = nuevoTotal <= subtotalMaximo;
    
    return presupuestoValido && subtotalValido && !this.partidaTieneCotizacion;
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

    // ✅ USAR MÉTODOS CONSISTENTES PARA CÁLCULOS
    const limiteReal = this.calcularLimiteReal();
    const totalConIVANuevo = this.calcularTotalConIVA(nuevoTotal);
    
    if (totalConIVANuevo > limiteReal) {
      const saldoRestante = limiteReal - this.calcularTotalConIVA(totalSinEsteItem);
      const maximoPermitido = Math.floor(saldoRestante / this.calcularTotalConIVA(item.precioUnitario));
      
      alert(`❌ No puedes aumentar la cantidad. Excederías el límite disponible.\n\nLímite disponible: $${limiteReal.toFixed(2)}\nMáximo permitido: ${maximoPermitido} unidades\nNuevo total con IVA: $${totalConIVANuevo.toFixed(2)}`);
      return;
    }

    // ✅ VERIFICAR SUBTOTAL MÁXIMO EXACTO
    const subtotalMaximo = this.calcularSubtotalMaximoExacto();
    if (nuevoTotal > subtotalMaximo) {
      const espacioDisponible = subtotalMaximo - totalSinEsteItem;
      const maximoPermitido = Math.floor(espacioDisponible / item.precioUnitario);
      
      alert(`❌ No puedes aumentar la cantidad. Excederías el subtotal máximo permitido.\n\nSubtotal máximo: $${subtotalMaximo.toFixed(2)}\nMáximo permitido: ${maximoPermitido} unidades\nNuevo subtotal: $${nuevoTotal.toFixed(2)}`);
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

    // ✅ USAR MÉTODOS CONSISTENTES PARA CÁLCULOS
    const limiteReal = this.calcularLimiteReal();
    const totalConIVANuevo = this.calcularTotalConIVA(nuevoTotal);
    
    if (totalConIVANuevo > limiteReal) {
      alert(`❌ No puedes aumentar el precio. Excederías el límite disponible.\n\nLímite disponible: $${limiteReal.toFixed(2)}\nNuevo total con IVA: $${totalConIVANuevo.toFixed(2)}`);
      return;
    }

    // ✅ VERIFICAR SUBTOTAL MÁXIMO EXACTO
    const subtotalMaximo = this.calcularSubtotalMaximoExacto();
    if (nuevoTotal > subtotalMaximo) {
      alert(`❌ No puedes aumentar el precio. Excederías el subtotal máximo permitido.\n\nSubtotal máximo: $${subtotalMaximo.toFixed(2)}\nNuevo subtotal: $${nuevoTotal.toFixed(2)}`);
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

  // ✅ CALCULAR SALDO RESTANTE CONSIDERANDO IVA
  get saldoRestante(): number {
    const limiteReal = this.calcularLimiteReal();
    const totalConIVA = this.calcularTotalConIVA();
    return limiteReal - totalConIVA;
  }

  get haExcedidoPresupuesto(): boolean {
    return this.saldoRestante < 0;
  }

  get articulosFiltrados(): Article[] {
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

    // VERIFICAR SI LA PARTIDA YA TIENE COTIZACIÓN
    if (this.partidaTieneCotizacion) {
      alert(`❌ NO PUEDES GENERAR COTIZACIÓN\n\nYa existe una cotización para la partida ${this.partidaSeleccionada.codigo}.\n\nNo puedes crear ninguna cotización adicional para esta partida.`);
      return;
    }

    if (this.carrito.length === 0) {
      alert('Agrega artículos al carrito antes de generar la cotización');
      return;
    }

    if (this.haExcedidoPresupuesto) {
      alert('Has excedido el límite disponible. Ajusta tu cotización.');
      return;
    }

    // VERIFICAR SUBTOTAL MÁXIMO EXACTO
    const subtotalMaximo = this.calcularSubtotalMaximoExacto();
    if (this.totalCarrito > subtotalMaximo) {
      alert(`🚫 EXCEDE EL SUBTOTAL MÁXIMO\n\nTu carrito excede el subtotal máximo permitido.\n\n📊 Subtotal máximo permitido (sin IVA): $${subtotalMaximo.toFixed(2)}\n🛒 Subtotal actual del carrito: $${this.totalCarrito.toFixed(2)}\n\n💡 Recuerda: El IVA (16%) se agrega al subtotal.\n\nAjusta tu carrito para no exceder el límite.`);
      return;
    }

    const confirmacion = confirm(`¿Estás seguro de crear la cotización?\n\n📋 Resumen:\n• Proyecto: ${this.proyectoSeleccionado.nombre}\n• Partida: ${this.partidaSeleccionada.codigo}\n• Fuente: ${this.fuenteSeleccionada}\n• Subtotal: $${this.totalCarrito.toFixed(2)}\n• IVA (16%): $${this.calcularIVAExacto().toFixed(2)}\n• Total: $${this.calcularTotalConIVA().toFixed(2)}\n• Artículos: ${this.carrito.length}\n\n⚠️ ATENCIÓN: Una vez generada, NO podrás crear ninguna cotización adicional para esta partida.\n\n¿Continuar?`);
    
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
          // ✅ ACTUALIZAR SALDO DE LA PARTIDA CON TOTAL CON IVA
          this.partidasService.actualizarSaldoPartida(
            this.partidaSeleccionada!.id, 
            this.calcularTotalConIVA() // Usar total con IVA para actualizar saldo
          ).subscribe({
            next: (saldoResponse) => {
              this.loading = false;
              if (saldoResponse.success) {
                alert(`✅ Cotización ${this.fuenteSeleccionada.toLowerCase()} creada exitosamente y enviada a revisión\n\n💰 Saldo de partida actualizado: $${(saldoResponse.data?.saldoDisponible || 0).toFixed(2)}\n\n⚠️ IMPORTANTE: Ya no podrás crear ninguna cotización adicional para la partida ${this.partidaSeleccionada!.codigo}`);
                this.carrito = [];
                this.cargarPartidasProyecto(this.proyectoSeleccionado!.id);
                this.cargarCotizacionesProyecto(this.proyectoSeleccionado!.id);
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
        alert('❌ Error al crear la cotización: ' + (error.message || 'Error desconocido'));
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

  // ✅ MÉTODO PARA VERIFICAR CÁLCULOS (DEPURACIÓN)
  verificarCalculos(): void {
    if (!this.partidaSeleccionada) return;
    
    const limiteReal = this.calcularLimiteReal();
    const subtotalMaximo = this.calcularSubtotalMaximoExacto();
    const ivaMaximo = this.calcularIVAMaximo();
    const totalCalculado = subtotalMaximo + ivaMaximo;
    
    console.log('🔍 VERIFICACIÓN DE CÁLCULOS:');
    console.log('Límite real:', limiteReal);
    console.log('Subtotal máximo:', subtotalMaximo);
    console.log('IVA máximo (16%):', ivaMaximo);
    console.log('Total calculado:', totalCalculado);
    console.log('¿Coinciden?', Math.abs(totalCalculado - limiteReal) < 0.01);
    
    // Ejemplo con $30,000
    const ejemploLimite = 30000;
    const ejemploSubtotal = ejemploLimite / 1.16;
    const ejemploIva = ejemploSubtotal * 0.16;
    const ejemploTotal = ejemploSubtotal + ejemploIva;
    
    console.log('📐 EJEMPLO CON $30,000:');
    console.log('Subtotal:', ejemploSubtotal);
    console.log('IVA (16%):', ejemploIva);
    console.log('Total:', ejemploTotal);
  }
}