import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '../core/models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    try {
      const user = localStorage.getItem('currentUser');
      const token = localStorage.getItem('token');
      
      // Verificar que user no sea null, undefined o string vacío antes de parsear
      if (user && user !== 'undefined' && user !== 'null' && user.trim() !== '') {
        const parsedUser = JSON.parse(user);
        if (parsedUser && token) {
          this.currentUserSubject.next(parsedUser);
        }
      } else {
        // Limpiar si hay datos inválidos
        this.clearInvalidStorage();
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
      this.clearInvalidStorage();
    }
  }

  private clearInvalidStorage(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    this.currentUserSubject.next(null);
  }

  // Login real con el backend
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials)
      .pipe(
        tap(response => {
          this.setUserAndToken(response.user, response.access_token);
        })
      );
  }

  // Registro real con el backend
  register(userData: RegisterRequest): Observable<AuthResponse> {
    const { confirmPassword, ...registerData } = userData;
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, registerData)
      .pipe(
        tap(response => {
          this.setUserAndToken(response.user, response.access_token);
        })
      );
  }

  // Obtener información del usuario actual
  getCurrentUserInfo(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/auth/me`);
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    this.currentUserSubject.next(null);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken() && !!this.getCurrentUser();
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user ? user.role === role : false;
  }

  isAdmin(): boolean {
    return this.hasRole('ADMIN');
  }

  isDocente(): boolean {
    return this.hasRole('DOCENTE');
  }

  isRevisor(): boolean {
    return this.hasRole('REVISOR');
  }

  private setUserAndToken(user: User, token: string): void {
    try {
      localStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.setItem('token', token);
      this.currentUserSubject.next(user);
    } catch (error) {
      console.error('Error saving user to storage:', error);
    }
  }

  updateLocalUser(updatedUser: User): void {
    try {
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      this.currentUserSubject.next(updatedUser);
    } catch (error) {
      console.error('Error updating user in storage:', error);
    }
  }

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/change-password`, {
      currentPassword,
      newPassword
    });
  }
}