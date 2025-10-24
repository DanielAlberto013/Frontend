export interface User {
  id: string;
  nombre: string;
  email: string;
  isActive?: boolean; 
  role: 'DOCENTE' | 'REVISOR' | 'ADMIN';
  createdAt: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  nombre: string;
  email: string;
  password: string;
  confirmPassword?: string; // Solo para frontend, no se envía al backend
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

