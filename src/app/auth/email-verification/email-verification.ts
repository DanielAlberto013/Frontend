import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-email-verification',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './email-verification.html',
  styleUrls: ['./email-verification.css']
})
export class EmailVerificationComponent {
  isLoading = true;
  isSuccess = false;
  isResending = false;
  message = '';
  resendMessage = '';

  constructor(public route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParams['token'];

    if (token) {
      // Simula la verificación de token
      setTimeout(() => {
        this.isLoading = false;
        this.isSuccess = true;
        this.message = 'Correo verificado correctamente 🎉';
      }, 1500);
    } else {
      this.isLoading = false;
      this.isSuccess = false;
      this.message = 'Token no encontrado ❌';
    }
  }

  resendVerificationEmail(): void {
    this.isResending = true;
    this.resendMessage = '';
    setTimeout(() => {
      this.resendMessage = 'Correo de verificación reenviado ✅';
      this.isResending = false;
    }, 1500);
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}