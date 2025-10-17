import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent {
  registerForm: FormGroup;
  loading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(group: FormGroup) {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
    this.error = null;
    if (this.registerForm.invalid) {
      this.error = 'Por favor corrige los errores en el formulario.';
      return;
    }
  
    this.loading = true;
    
    this.authService.register(this.registerForm.value).subscribe({
      next: () => {
        this.loading = false;
        // CAMBIO: En lugar de ir al dashboard, mostrar mensaje y redirigir al login
        alert('✅ Registro exitoso. Ahora puedes iniciar sesión.');
        this.router.navigate(['/auth/login']);
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.message || 'Error al registrar usuario. El correo puede estar en uso.';
      }
    });
  }
  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}