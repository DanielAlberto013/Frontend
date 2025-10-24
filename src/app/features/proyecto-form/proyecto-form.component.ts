import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs'; // ✅ AGREGAR ESTE IMPORT
import { Proyecto, CreateProyectoRequest } from '../../core/models/proyecto.model';
import { PartidaPresupuestal } from '../../core/models/partida.model';
import { ProyectosService } from '../../core/services/proyectos.service';
import { PartidasService } from '../../core/services/partidas.service';
import { ArticulosService } from '../../core/services/articulos.service';
import { AuthService } from '../../auth/auth';

@Component({
  selector: 'app-proyecto-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './proyecto-form.component.html',
  styleUrls: ['./proyecto-form.component.css']
})
export class ProyectoFormComponent implements OnInit {
  proyectoForm: FormGroup;
  loading = false;
  error: string | null = null;
  partidasDisponibles: PartidaPresupuestal[] = [];
  esEdicion = false;
  proyectoId: string | null = null;

  // Partidas dinámicas desde el servicio de artículos
  partidasReales: {codigo: string, nombre: string, descripcion: string}[] = [];

  constructor(
    private fb: FormBuilder,
    private proyectosService: ProyectosService,
    private partidasService: PartidasService,
    private articulosService: ArticulosService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.proyectoForm = this.createForm();
  }

  ngOnInit(): void {
    this.proyectoId = this.route.snapshot.paramMap.get('id');
    this.esEdicion = !!this.proyectoId;
    
    // Cargar partidas reales del sistema
    this.cargarPartidasReales();
    
    if (this.esEdicion) {
      this.cargarProyectoParaEditar();
    } else {
      this.agregarPartidaInicial();
    }
  }

  cargarPartidasReales(): void {
    this.articulosService.getPartidas().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Mapear las partidas con sus nombres descriptivos
          this.partidasReales = response.data.map(codigo => ({
            codigo: codigo,
            nombre: this.articulosService.getNombrePartida(codigo),
            descripcion: `Partida presupuestal ${codigo} - ${this.articulosService.getNombrePartida(codigo)}`
          }));
        }
      },
      error: (error) => {
        console.error('Error al cargar partidas:', error);
        // En caso de error, usar partidas básicas como fallback
        this.partidasReales = this.getPartidasBasicas();
      }
    });
  }

  getPartidasBasicas(): {codigo: string, nombre: string, descripcion: string}[] {
    return [
      { codigo: '21101', nombre: 'Papelería y Útiles de Oficina', descripcion: 'Papelería y útiles de oficina' },
      { codigo: '21201', nombre: 'Tintas y Consumibles para Impresión', descripcion: 'Tintas y consumibles para impresión' },
      { codigo: '21401', nombre: 'Equipo de Cómputo y Accesorios', descripcion: 'Equipo de cómputo y accesorios' },
      { codigo: '23101', nombre: 'Semillas y Material Vegetal', descripcion: 'Semillas y material vegetal' },
      { codigo: '23701', nombre: 'Filamentos para Impresión 3D', descripcion: 'Filamentos para impresión 3D' },
      { codigo: '24601', nombre: 'Componentes Eléctricos y Electrónicos', descripcion: 'Componentes eléctricos y electrónicos' },
      { codigo: '25101', nombre: 'Reactivos y Material para Laboratorio', descripcion: 'Reactivos y material para laboratorio' },
      { codigo: '25201', nombre: 'Insumos Agrícolas y Fertilizantes', descripcion: 'Insumos agrícolas y fertilizantes' },
      { codigo: '25501', nombre: 'Material de Vidriería y Laboratorio', descripcion: 'Material de vidriería y laboratorio' },
      { codigo: '29101', nombre: 'Herramientas y Equipo Manual', descripcion: 'Herramientas y equipo manual' },
      { codigo: '29401', nombre: 'Equipo de Cómputo y Tecnología', descripcion: 'Equipo de cómputo y tecnología' },
      { codigo: '33601', nombre: 'Servicios de Traducción', descripcion: 'Servicios de traducción' },
      { codigo: '35301', nombre: 'Servicios de Mantenimiento', descripcion: 'Servicios de mantenimiento' }
    ];
  }

  createForm(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(5)]],
      descripcion: ['', [Validators.required, Validators.minLength(10)]],
      edicion: ['2025', [Validators.required]],
      presupuestoTotal: [0, [Validators.required, Validators.min(1000)]],
      presupuestoFederal: [0, [Validators.required, Validators.min(0)]],
      presupuestoEstatal: [0, [Validators.required, Validators.min(0)]],
      partidas: this.fb.array([])
    });
  }

  get partidasFormArray(): FormArray {
    return this.proyectoForm.get('partidas') as FormArray;
  }

  crearPartidaFormGroup(): FormGroup {
    return this.fb.group({
      codigo: ['', Validators.required],
      nombre: ['', Validators.required],
      descripcion: ['', Validators.required],
      importeAsignado: [0, [Validators.required, Validators.min(1)]]
    });
  }

  agregarPartidaInicial(): void {
    this.partidasFormArray.push(this.crearPartidaFormGroup());
  }

  agregarPartida(): void {
    this.partidasFormArray.push(this.crearPartidaFormGroup());
  }

  eliminarPartida(index: number): void {
    if (this.partidasFormArray.length > 1) {
      this.partidasFormArray.removeAt(index);
    }
  }

  onPartidaSeleccionada(event: any, index: number): void {
    const codigoSeleccionado = event.target.value;
    const partida = this.partidasReales.find(p => p.codigo === codigoSeleccionado);
    
    if (partida) {
      const partidaGroup = this.partidasFormArray.at(index);
      partidaGroup.patchValue({
        nombre: partida.nombre,
        descripcion: partida.descripcion
      });
    }
  }

  onPresupuestoTotalChange(): void {
    this.actualizarDistribucionFederalEstatal();
  }

  actualizarDistribucionFederalEstatal(): void {
    const presupuestoTotal = this.proyectoForm.get('presupuestoTotal')?.value || 0;
    const federal = Math.round(presupuestoTotal * 0.5);
    const estatal = presupuestoTotal - federal;

    this.proyectoForm.patchValue({
      presupuestoFederal: federal,
      presupuestoEstatal: estatal
    });
  }

  getTotalPartidas(): number {
    return this.partidasFormArray.controls.reduce((total, control) => {
      return total + (control.get('importeAsignado')?.value || 0);
    }, 0);
  }

  getDiferenciaPresupuesto(): number {
    const presupuestoTotal = this.proyectoForm.get('presupuestoTotal')?.value || 0;
    return presupuestoTotal - this.getTotalPartidas();
  }

  getPresupuestoUtilizado(): number {
    const presupuestoTotal = this.proyectoForm.get('presupuestoTotal')?.value || 0;
    const totalPartidas = this.getTotalPartidas();
    return presupuestoTotal > 0 ? (totalPartidas / presupuestoTotal) * 100 : 0;
  }

  validarFormulario(): boolean {
    const totalPartidas = this.getTotalPartidas();
    const presupuestoTotal = this.proyectoForm.get('presupuestoTotal')?.value || 0;
    const diferencia = presupuestoTotal - totalPartidas;
    
    if (diferencia !== 0) {
      this.error = `El total de las partidas ($${totalPartidas}) no coincide con el presupuesto total ($${presupuestoTotal}). Diferencia: $${diferencia}`;
      return false;
    }

    if (this.partidasFormArray.length === 0) {
      this.error = 'Debe agregar al menos una partida presupuestal';
      return false;
    }

    this.error = null;
    return true;
  }

  cargarProyectoParaEditar(): void {
    if (!this.proyectoId) return;
    
    this.loading = true;
    this.proyectosService.getProyectoById(this.proyectoId).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success && response.data) {
          this.cargarDatosEnFormulario(response.data);
        } else {
          this.error = 'Proyecto no encontrado';
          this.router.navigate(['/proyectos']);
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = 'Error al cargar proyecto para editar';
        console.error('Error:', error);
      }
    });
  }

  cargarDatosEnFormulario(proyecto: Proyecto): void {
    this.proyectoForm.patchValue({
      nombre: proyecto.nombre,
      descripcion: proyecto.descripcion,
      edicion: proyecto.edicion,
      presupuestoTotal: proyecto.presupuestoTotal,
      presupuestoFederal: proyecto.presupuestoFederal,
      presupuestoEstatal: proyecto.presupuestoEstatal
    });

    // ✅ CARGAR PARTIDAS EXISTENTES DEL PROYECTO
    this.cargarPartidasExistentes(proyecto.id);
  }

  // ✅ NUEVO MÉTODO: Cargar partidas existentes del proyecto
  private cargarPartidasExistentes(proyectoId: string): void {
    this.partidasService.getPartidasByProyecto(proyectoId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Limpiar el array de partidas
          while (this.partidasFormArray.length !== 0) {
            this.partidasFormArray.removeAt(0);
          }
          
          // Agregar las partidas existentes
          response.data.forEach(partida => {
            const partidaGroup = this.crearPartidaFormGroup();
            partidaGroup.patchValue({
              codigo: partida.codigo,
              nombre: partida.nombre,
              descripcion: partida.descripcion,
              importeAsignado: partida.importeAsignado
            });
            this.partidasFormArray.push(partidaGroup);
          });
          
          // Si no hay partidas, agregar una inicial
          if (this.partidasFormArray.length === 0) {
            this.agregarPartidaInicial();
          }
        }
      },
      error: (error) => {
        console.error('Error al cargar partidas existentes:', error);
        this.agregarPartidaInicial();
      }
    });
  }

  onSubmit(): void {
    if (this.proyectoForm.invalid) {
      this.marcarControlesComoSucios();
      this.error = 'Por favor, completa todos los campos requeridos correctamente';
      return;
    }

    if (!this.validarFormulario()) {
      return;
    }

    this.loading = true;
    this.error = null;

    // ✅ DATOS DEL PROYECTO
    const proyectoData: CreateProyectoRequest = {
      nombre: this.proyectoForm.value.nombre,
      descripcion: this.proyectoForm.value.descripcion,
      presupuestoTotal: this.proyectoForm.value.presupuestoTotal,
      presupuestoFederal: this.proyectoForm.value.presupuestoFederal,
      presupuestoEstatal: this.proyectoForm.value.presupuestoEstatal,
      edicion: this.proyectoForm.value.edicion
    };

    // ✅ DATOS DE LAS PARTIDAS
    const partidasData = this.partidasFormArray.controls.map(control => ({
      codigo: control.get('codigo')?.value,
      nombre: control.get('nombre')?.value,
      descripcion: control.get('descripcion')?.value,
      importeAsignado: control.get('importeAsignado')?.value
    }));

    if (this.esEdicion && this.proyectoId) {
      // Modo edición - Actualizar proyecto
      this.proyectosService.updateProyecto(this.proyectoId, proyectoData).subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            alert('✅ Proyecto actualizado exitosamente');
            this.router.navigate(['/proyectos', this.proyectoId]);
          } else {
            this.error = response.message || 'Error al actualizar el proyecto';
          }
        },
        error: (error) => {
          this.loading = false;
          this.error = 'Error al actualizar el proyecto';
          console.error('Error:', error);
        }
      });
    } else {
      // Modo creación - Crear proyecto y luego sus partidas
      this.proyectosService.createProyecto(proyectoData).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const proyectoId = response.data.id;
            
            // ✅ CREAR PARTIDAS PARA EL PROYECTO
            this.crearPartidasParaProyecto(proyectoId, partidasData);
          } else {
            this.loading = false;
            this.error = response.message || 'Error al crear el proyecto';
          }
        },
        error: (error) => {
          this.loading = false;
          this.error = 'Error al crear el proyecto';
          console.error('Error:', error);
        }
      });
    }
  }

  // ✅ NUEVO MÉTODO: Crear partidas para el proyecto
  private crearPartidasParaProyecto(proyectoId: string, partidasData: any[]): void {
    const partidasRequests = partidasData.map(partida => 
      this.partidasService.createPartida({
        ...partida,
        proyectoId: proyectoId
      })
    );

    // Ejecutar todas las creaciones de partidas
    forkJoin(partidasRequests).subscribe({
      next: (responses) => {
        this.loading = false;
        const todasExitosas = responses.every(r => r.success);
        
        if (todasExitosas) {
          alert('✅ Proyecto creado exitosamente con todas las partidas. Será enviado a revisión.');
          this.router.navigate(['/proyectos']);
        } else {
          alert('⚠️ Proyecto creado, pero algunas partidas no se pudieron guardar correctamente.');
          this.router.navigate(['/proyectos']);
        }
      },
      error: (error) => {
        this.loading = false;
        alert('⚠️ Proyecto creado, pero hubo un error al guardar las partidas.');
        this.router.navigate(['/proyectos']);
        console.error('Error creando partidas:', error);
      }
    });
  }

  get tituloFormulario(): string {
    return this.esEdicion ? '✏️ Editar Proyecto' : '🚀 Crear Nuevo Proyecto';
  }

  marcarControlesComoSucios(): void {
    Object.keys(this.proyectoForm.controls).forEach(key => {
      const control = this.proyectoForm.get(key);
      if (control) {
        control.markAsDirty();
        control.markAsTouched();
      }
    });
  }

  cancelar(): void {
    if (confirm('¿Estás seguro de cancelar? Se perderán los datos no guardados.')) {
      if (this.esEdicion && this.proyectoId) {
        this.router.navigate(['/proyectos', this.proyectoId]);
      } else {
        this.router.navigate(['/proyectos']);
      }
    }
  }
}