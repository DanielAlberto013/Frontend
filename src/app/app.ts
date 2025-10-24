// src/app/app.component.ts
import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DataInitializerService } from './core/services/data-initializer.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <router-outlet></router-outlet>
  `,
  styleUrls: ['./app.css']
})
export class AppComponent implements OnInit {
  title = 'Sistema de Finanzas - Intescam';

  constructor(private dataInitializer: DataInitializerService) {}

  ngOnInit(): void {
    // Inicializar datos cuando la aplicación comience
    this.dataInitializer.initializeData();
  }
}