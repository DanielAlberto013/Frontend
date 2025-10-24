// src/app/core/services/data-initializer.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DataInitializerService {
  private storageKey = 'proyectos_data';

  initializeData(): void {
    // Solo inicializar si no existe
    if (!localStorage.getItem(this.storageKey)) {
      localStorage.setItem(this.storageKey, JSON.stringify([]));
    }
  }
}