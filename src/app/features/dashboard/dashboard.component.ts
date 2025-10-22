import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../auth/auth';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, AfterViewInit {
  currentUser: any;
  profileMenuOpen = false; // 🔹 Control del menú de perfil

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    
    // Si no hay usuario, redirigir al login
    if (!this.currentUser) {
      this.router.navigate(['/auth/login']);
    }
  }

  ngAfterViewInit(): void {
    const container = document.querySelector('.particles-container') as HTMLElement;
    if (!container) return;

    const totalParticles = 50; // 🔹 Cambia la cantidad de partículas si quieres
    for (let i = 0; i < totalParticles; i++) {
      const particle = document.createElement('div');
      particle.classList.add('particle');

      // Tamaño aleatorio
      const size = Math.random() * 4 + 1;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;

      // Posición inicial aleatoria
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.left = `${Math.random() * 100}%`;

      // Duración y retraso aleatorios
      particle.style.animationDuration = `${Math.random() * 30 + 20}s`;
      particle.style.animationDelay = `${Math.random() * 10}s`;

      container.appendChild(particle);
    }
  }

  // 🔹 Toggle del menú de perfil
  toggleProfileMenu(): void {
    this.profileMenuOpen = !this.profileMenuOpen;
  }

  // 🔹 Redirigir a cambio de contraseña
  changePassword(): void {
    this.router.navigate(['/auth/change-password']);
  }

  // 🔹 Cerrar sesión
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
