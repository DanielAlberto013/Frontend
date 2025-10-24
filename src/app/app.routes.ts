import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login';
import { RegisterComponent } from './auth/register/register';
import { EmailVerificationComponent } from './auth/email-verification/email-verification';
import { ChangePasswordComponent } from './auth/change-password/change-password';
import { DashboardComponent } from './features/dashboard/dashboard.component';

export const appRoutes: Routes = [
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },
  { 
    path: 'auth', 
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
      { path: 'email-verification', component: EmailVerificationComponent },
      { path: 'change-password', component: ChangePasswordComponent },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },
  { path: 'dashboard', component: DashboardComponent },
  { 
    path: 'catalogo', 
    loadComponent: () => import('./features/catalogo/catalogo.component').then(m => m.CatalogoComponent)
  },
  // Nuevas rutas para gestión de artículos
  { 
    path: 'articulo/nuevo', 
    loadComponent: () => import('./features/articulo-form/articulo-form.component').then(m => m.ArticuloFormComponent)
  },
  { 
    path: 'articulo/editar/:id', 
    loadComponent: () => import('./features/articulo-form/articulo-form.component').then(m => m.ArticuloFormComponent)
  },
  { 
    path: 'proyectos', 
    loadComponent: () => import('./features/proyectos/proyectos-list.component').then(m => m.ProyectosListComponent)
  },
  { 
    path: 'proyectos/nuevo', 
    loadComponent: () => import('./features/proyecto-form/proyecto-form.component').then(m => m.ProyectoFormComponent)
  },
  // 🔥 RUTAS NUEVAS PARA EDITAR Y VER DETALLES
  { 
    path: 'proyectos/editar/:id', 
    loadComponent: () => import('./features/proyecto-form/proyecto-form.component').then(m => m.ProyectoFormComponent)
  },
  
  { 
    path: 'cotizaciones', 
    loadComponent: () => import('./features/cotizaciones/cotizaciones.component').then(m => m.CotizacionesComponent)
  },
  { 
    path: 'reportes', 
    loadComponent: () => import('./features/reportes/reportes.component').then(m => m.ReportesComponent)
  },
  { path: '**', redirectTo: '/auth/login' }
];