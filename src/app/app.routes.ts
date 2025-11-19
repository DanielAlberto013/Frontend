import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login';
import { RegisterComponent } from './auth/register/register';
import { EmailVerificationComponent } from './auth/email-verification/email-verification';
import { ChangePasswordComponent } from './auth/change-password/change-password';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { AuthGuard } from './auth/auth-guard';

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
  { 
    path: 'dashboard', 
    component: DashboardComponent,
    canActivate: [AuthGuard] // ✅ Proteger dashboard
  },
  { 
    path: 'catalogo', 
    loadComponent: () => import('./features/catalogo/catalogo.component').then(m => m.CatalogoComponent),
    canActivate: [AuthGuard] // ✅ PROTEGER CATÁLOGO
  },
  { 
    path: 'articulo/nuevo', 
    loadComponent: () => import('./features/articulo-form/articulo-form.component').then(m => m.ArticuloFormComponent),
    canActivate: [AuthGuard]
  },
  { 
    path: 'articulo/editar/:id', 
    loadComponent: () => import('./features/articulo-form/articulo-form.component').then(m => m.ArticuloFormComponent),
    canActivate: [AuthGuard]
  },
  { 
    path: 'proyectos', 
    loadComponent: () => import('./features/proyectos/proyectos-list.component').then(m => m.ProyectosListComponent),
    canActivate: [AuthGuard]
  },
  { 
    path: 'proyectos/nuevo', 
    loadComponent: () => import('./features/proyecto-form/proyecto-form.component').then(m => m.ProyectoFormComponent),
    canActivate: [AuthGuard]
  },
  { 
    path: 'proyectos/editar/:id', 
    loadComponent: () => import('./features/proyecto-form/proyecto-form.component').then(m => m.ProyectoFormComponent),
    canActivate: [AuthGuard]
  },
  { 
    path: 'proyectos/:id', 
    loadComponent: () => import('./features/proyecto-form/proyecto-form.component').then(m => m.ProyectoFormComponent),
    canActivate: [AuthGuard]
  },
  { 
    path: 'reportes', 
    loadComponent: () => import('./features/reportes/reportes.component').then(m => m.ReportesComponent),
    canActivate: [AuthGuard]
  },
  { 
    path: 'cotizaciones', 
    loadComponent: () => import('./features/cotizaciones/cotizaciones.component').then(m => m.CotizacionesComponent),
    canActivate: [AuthGuard]
  },
  // 🔥 NUEVAS RUTAS PARA SUGERENCIAS
  { 
    path: 'sugerencia/nueva', 
    loadComponent: () => import('./features/sugerencia-articulo-form/sugerencia-articulo-form.component').then(m => m.SugerenciaArticuloFormComponent),
    canActivate: [AuthGuard]
  },
  { 
    path: 'revision-sugerencias', 
    loadComponent: () => import('./features/revision-sugerencias/revision-sugerencias.component').then(m => m.RevisionSugerenciasComponent),
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: '/auth/login' }
];