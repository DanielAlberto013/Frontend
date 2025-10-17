import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
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
  
    console.log('📤 Enviando login:', this.loginForm.value); // ← Agrega este log
  
    this.authService.login(this.loginForm.value).subscribe({
      next: (response) => {
        console.log('✅ Login exitoso:', response); // ← Agrega este log
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        console.log('❌ Error en login:', error); // ← Agrega este log
        this.loading = false;
        this.error = error.error?.message || 'Error al iniciar sesión. Verifica tus credenciales.';
      }
    });
  }
}