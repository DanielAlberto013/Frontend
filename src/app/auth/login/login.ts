import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth';

// 🟢 Importaciones de Angular Material
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.error = null;

    console.log('📤 Enviando login:', this.loginForm.value);

    this.authService.login(this.loginForm.value).subscribe({
      next: (response) => {
        console.log('✅ Login exitoso - Respuesta completa:', response);
        console.log('✅ Token recibido:', response.accessToken);
        console.log('✅ User recibido:', response.user);
        
        this.loading = false;
        
        // Verificar que realmente se guardó
        setTimeout(() => {
          console.log('✅ Token en localStorage después de login:', localStorage.getItem('token'));
          console.log('✅ User en localStorage después de login:', localStorage.getItem('currentUser'));
          
          // Debug del auth service
          this.authService.debugAuth();
          
          // Redirigir al dashboard
          this.router.navigate(['/dashboard']);
        }, 200);
      },
      error: (error) => {
        console.log('❌ Error en login:', error);
        this.loading = false;
        this.error = error.error?.message || 'Error al iniciar sesión. Verifica tus credenciales.';
      }
    });
  }
}