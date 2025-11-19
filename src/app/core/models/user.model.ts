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
  accessToken: string;  // ✅ CORREGIDO: accessToken en lugar de access_token
  user: User;
}

// ✅ ACTUALIZA ApiResponse agregando la propiedad error
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: any;
}