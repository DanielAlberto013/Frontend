import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Proyecto, CreateProyectoRequest } from '../../core/models/proyecto.model';
import { PartidaPresupuestal } from '../../core/models/partida.model';
import { ProyectosService } from '../../core/services/proyectos.service';
import { PartidasService } from '../../core/services/partidas.service';
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

  // Partidas predefinidas según el documento fuente de Mariana
  partidasPredefinidas = [
    { codigo: '21.1', nombre: 'Materiales de Papelería y Útiles', descripcion: 'Papelería y útiles de oficina' },
    { codigo: '25.1', nombre: 'Productos Químicos para Laboratorio', descripcion: 'Reactivos y productos químicos' },
    { codigo: '25.9', nombre: 'Otros Productos Químicos', descripcion: 'Productos químicos diversos' },
    { codigo: '29.4', nombre: 'Material Didáctico y de Enseñanza', descripcion: 'Material educativo y de apoyo' },
    { codigo: '33.6', nombre: 'Mantenimiento de Equipo', descripcion: 'Mantenimiento y reparación de equipo' },
    { codigo: '26.3', nombre: 'Combustibles para Maquinaria', descripcion: 'Combustible para funcionamiento de maquinaria' }
  ];

  constructor(
    private fb: FormBuilder,
    private proyectosService: ProyectosService,
    private partidasService: PartidasService,
    private authService: AuthService,
    private router: Router
  ) {
    this.proyectoForm = this.createForm();
  }

  ngOnInit(): void {
    this.agregarPartidaInicial();
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
    const partida = this.partidasPredefinidas.find(p => p.codigo === codigoSeleccionado);
    
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

    const formData: CreateProyectoRequest = {
      nombre: this.proyectoForm.value.nombre,
      descripcion: this.proyectoForm.value.descripcion,
      presupuestoTotal: this.proyectoForm.value.presupuestoTotal,
      presupuestoFederal: this.proyectoForm.value.presupuestoFederal,
      presupuestoEstatal: this.proyectoForm.value.presupuestoEstatal,
      edicion: this.proyectoForm.value.edicion
    };

    // Simulamos el envío al backend
    setTimeout(() => {
      console.log('Proyecto a crear:', formData);
      console.log('Partidas:', this.proyectoForm.value.partidas);
      
      this.loading = false;
      alert('✅ Proyecto creado exitosamente. Será enviado a revisión.');
      this.router.navigate(['/proyectos']);
    }, 2000);
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
      this.router.navigate(['/proyectos']);
    }
  }
}