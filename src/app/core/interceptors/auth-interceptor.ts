// src/app/core/interceptors/auth-interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../../auth/auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  console.log('🔐 AuthInterceptor - Token presente:', !!token);
  console.log('🔐 AuthInterceptor - URL:', req.url);

  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('🔐 AuthInterceptor - Header Authorization agregado');
    return next(cloned);
  }

  console.log('🔐 AuthInterceptor - Sin token');
  return next(req);
};