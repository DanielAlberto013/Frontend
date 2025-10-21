import { Component, OnInit } from '@angular/core';
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
export class DashboardComponent implements OnInit {
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
