import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../auth/auth';
import { ProyectosService } from '../../core/services/proyectos.service';
import { CotizacionesService } from '../../core/services/cotizaciones.service';
import { Proyecto } from '../../core/models/proyecto.model';
import { Cotizacion } from '../../core/models/cotizacion.model';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.css']
})
export class ReportesComponent implements OnInit {
  // Datos
  proyectos: Proyecto[] = [];
  proyectosAprobados: Proyecto[] = [];
  cotizaciones: Cotizacion[] = [];
  misCotizaciones: Cotizacion[] = [];
  todosLosUsuarios: any[] = [];
  
  // Filtros para admin
  fechaInicio: string = '';
  fechaFin: string = '';
  proyectoFiltro: string = '';
  estadoFiltro: string = 'APROBADO';
  
  // Estadísticas
  estadisticas = {
    totalProyectos: 0,
    proyectosAprobados: 0,
    proyectosPendientes: 0,
    totalCotizaciones: 0,
    cotizacionesAprobadas: 0,
    presupuestoTotal: 0,
    presupuestoUtilizado: 0,
    totalUsuarios: 0,
    docentesActivos: 0
  };

  // Estados
  loading = true;
  error: string | null = null;
  cotizacionSeleccionada: Cotizacion | null = null;
  today: Date = new Date();

  constructor(
    public authService: AuthService,
    private proyectosService: ProyectosService,
    private cotizacionesService: CotizacionesService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading = true;

    if (this.authService.isAdmin() || this.authService.isRevisor()) {
      this.cargarDatosAdmin();
    } else if (this.authService.isDocente()) {
      this.cargarDatosDocente();
    } else {
      this.loading = false;
    }
  }

  private cargarDatosAdmin(): void {
    // Simular carga de datos para admin
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
          estado: 'APROBADO',
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-20')
        },
        {
          id: '2',
          nombre: 'Sistema de Riego Automatizado',
          descripcion: 'Implementación de sistema IoT para optimizar riego',
          docenteId: '2',
          docente: {
            id: '2',
            nombre: 'María García',
            email: 'maria@email.com',
            role: 'DOCENTE',
            createdAt: new Date()
          },
          presupuestoTotal: 150000,
          presupuestoFederal: 75000,
          presupuestoEstatal: 75000,
          edicion: '2025',
          estado: 'EN_REVISION',
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-18')
        },
        {
          id: '3',
          nombre: 'Análisis de Suelos Agrícolas',
          descripcion: 'Estudio de composición química de suelos',
          docenteId: '3',
          docente: {
            id: '3',
            nombre: 'Carlos López',
            email: 'carlos@email.com',
            role: 'DOCENTE',
            createdAt: new Date()
          },
          presupuestoTotal: 80000,
          presupuestoFederal: 40000,
          presupuestoEstatal: 40000,
          edicion: '2025',
          estado: 'APROBADO',
          createdAt: new Date('2024-02-05'),
          updatedAt: new Date('2024-02-10')
        }
      ];

      // Cotizaciones de ejemplo
      this.cotizaciones = [
        {
          id: '1',
          proyectoId: '1',
          partidaCodigo: '21.1',
          fuente: 'FEDERAL',
          items: [
            {
              id: '1',
              articuloId: '1',
              articulo: {
                id: '1',
                nombre: 'Hojas Blancas A4',
                descripcion: 'Paquete de 500 hojas tamaño carta',
                partidaCodigo: '21.1',
                precioReferencia: 120.50,
                activo: true,
                createdAt: new Date(),
                updatedAt: new Date()
              },
              cantidad: 5,
              precioUnitario: 120.50,
              subtotal: 602.50
            },
            {
              id: '2',
              articuloId: '2',
              articulo: {
                id: '2',
                nombre: 'Lápices Mirado No. 2',
                descripcion: 'Caja con 12 lápices',
                partidaCodigo: '21.1',
                precioReferencia: 45.00,
                activo: true,
                createdAt: new Date(),
                updatedAt: new Date()
              },
              cantidad: 3,
              precioUnitario: 45.00,
              subtotal: 135.00
            }
          ],
          total: 737.50,
          estado: 'APROBADO',
          createdAt: new Date('2024-01-25'),
          updatedAt: new Date('2024-01-26')
        }
      ];

      // Usuarios de ejemplo
      this.todosLosUsuarios = [
        {
          id: '1',
          nombre: 'Juan Pérez',
          email: 'juan@email.com',
          role: 'DOCENTE',
          createdAt: new Date('2024-01-01'),
          proyectos: 2,
          estado: 'Activo'
        },
        {
          id: '2',
          nombre: 'María García',
          email: 'maria@email.com',
          role: 'DOCENTE',
          createdAt: new Date('2024-01-05'),
          proyectos: 1,
          estado: 'Activo'
        },
        {
          id: '3',
          nombre: 'Carlos López',
          email: 'carlos@email.com',
          role: 'DOCENTE',
          createdAt: new Date('2024-01-10'),
          proyectos: 1,
          estado: 'Activo'
        },
        {
          id: '4',
          nombre: 'Mariana Brito',
          email: 'mariana@email.com',
          role: 'REVISOR',
          createdAt: new Date('2024-01-01'),
          proyectos: 0,
          estado: 'Activo'
        },
        {
          id: '5',
          nombre: 'Admin Sistema',
          email: 'admin@email.com',
          role: 'ADMIN',
          createdAt: new Date('2024-01-01'),
          proyectos: 0,
          estado: 'Activo'
        }
      ];

      // Calcular estadísticas
      this.calcularEstadisticas();
      this.proyectosAprobados = this.proyectos.filter(p => p.estado === 'APROBADO');
      
      this.loading = false;
    }, 1000);
  }

  private cargarDatosDocente(): void {
    // Simular carga de datos para docente
    setTimeout(() => {
      this.misCotizaciones = [
        {
          id: '1',
          proyectoId: '1',
          partidaCodigo: '21.1',
          fuente: 'FEDERAL',
          items: [
            {
              id: '1',
              articuloId: '1',
              articulo: {
                id: '1',
                nombre: 'Hojas Blancas A4',
                descripcion: 'Paquete de 500 hojas tamaño carta',
                partidaCodigo: '21.1',
                precioReferencia: 120.50,
                activo: true,
                createdAt: new Date(),
                updatedAt: new Date()
              },
              cantidad: 5,
              precioUnitario: 120.50,
              subtotal: 602.50
            },
            {
              id: '2',
              articuloId: '2',
              articulo: {
                id: '2',
                nombre: 'Lápices Mirado No. 2',
                descripcion: 'Caja con 12 lápices',
                partidaCodigo: '21.1',
                precioReferencia: 45.00,
                activo: true,
                createdAt: new Date(),
                updatedAt: new Date()
              },
              cantidad: 3,
              precioUnitario: 45.00,
              subtotal: 135.00
            }
          ],
          total: 737.50,
          estado: 'APROBADO',
          createdAt: new Date('2024-01-25'),
          updatedAt: new Date('2024-01-26')
        }
      ];
      
      this.loading = false;
    }, 1000);
  }

  private calcularEstadisticas(): void {
    this.estadisticas.totalProyectos = this.proyectos.length;
    this.estadisticas.proyectosAprobados = this.proyectos.filter(p => p.estado === 'APROBADO').length;
    this.estadisticas.proyectosPendientes = this.proyectos.filter(p => p.estado === 'EN_REVISION').length;
    this.estadisticas.totalCotizaciones = this.cotizaciones.length;
    this.estadisticas.cotizacionesAprobadas = this.cotizaciones.filter(c => c.estado === 'APROBADO').length;
    this.estadisticas.presupuestoTotal = this.proyectos.reduce((total, p) => total + p.presupuestoTotal, 0);
    this.estadisticas.presupuestoUtilizado = this.cotizaciones.reduce((total, c) => total + c.total, 0);
    this.estadisticas.totalUsuarios = this.todosLosUsuarios.length;
    this.estadisticas.docentesActivos = this.todosLosUsuarios.filter(u => u.role === 'DOCENTE').length;
  }

  // Métodos para generar reportes
  generarReporteProyectosAprobados(): void {
    alert('📊 Generando reporte de proyectos aprobados en PDF...');
    // Aquí iría la lógica para generar PDF
  }

  generarReporteExcel(): void {
    alert('📈 Generando reporte en Excel...');
    // Aquí iría la lógica para generar Excel
  }

  generarReporteEstadisticas(): void {
    alert('📋 Generando reporte de estadísticas...');
    // Aquí iría la lógica para generar reporte de estadísticas
  }

  generarTicketCompra(cotizacion: Cotizacion): void {
    this.cotizacionSeleccionada = cotizacion;
    alert('🧾 Generando ticket de compra...\n\nPuedes imprimir esta página para obtener tu ticket.');
    
    // Esperar un momento para que Angular actualice la vista
    setTimeout(() => {
      window.print();
    }, 500);
  }

  filtrarProyectos(): void {
    // Lógica de filtrado para admin
    console.log('Aplicando filtros...');
  }

  limpiarFiltros(): void {
    this.fechaInicio = '';
    this.fechaFin = '';
    this.proyectoFiltro = '';
    this.estadoFiltro = 'APROBADO';
  }

  getProyectosFiltrados(): Proyecto[] {
    let proyectos = this.proyectosAprobados;

    if (this.fechaInicio) {
      proyectos = proyectos.filter(p => 
        new Date(p.createdAt) >= new Date(this.fechaInicio)
      );
    }

    if (this.fechaFin) {
      proyectos = proyectos.filter(p => 
        new Date(p.createdAt) <= new Date(this.fechaFin)
      );
    }

    if (this.proyectoFiltro) {
      proyectos = proyectos.filter(p => 
        p.nombre.toLowerCase().includes(this.proyectoFiltro.toLowerCase()) ||
        p.docente.nombre.toLowerCase().includes(this.proyectoFiltro.toLowerCase())
      );
    }

    return proyectos;
  }
}