// src/app/core/services/articulos.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay } from 'rxjs';
import { Articulo, CreateArticuloRequest, UpdateArticuloRequest } from '../models/articulo.model';
import { ApiResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class ArticulosService {
  private apiUrl = 'http://localhost:3000/articulos';
  private storageKey = 'articulos_data';

  constructor(private http: HttpClient) {}

  // 🔥 SIMULACIÓN - Obtener artículos del localStorage
  private getArticulosFromStorage(): Articulo[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : this.articulosPredefinidos;
  }

  private saveArticulosToStorage(articulos: Articulo[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(articulos));
  }

  private generateId(): string {
    return 'art_' + Math.random().toString(36).substr(2, 9);
  }

  // 🔥 NUEVO: Obtener todas las partidas disponibles
  getPartidas(): Observable<ApiResponse<string[]>> {
    const articulos = this.getArticulosFromStorage();
    const partidasUnicas = [...new Set(articulos.map(a => a.partidaCodigo))].sort();
    
    return of({
      success: true,
      data: partidasUnicas,
      message: 'Partidas obtenidas exitosamente'
    }).pipe(delay(300));
  }

  // 🔥 NUEVO: Obtener nombre descriptivo de partidas
  getNombrePartida(codigo: string): string {
    const nombresPartidas: { [key: string]: string } = {
      '21101': 'Papelería y Útiles de Oficina',
      '21201': 'Tintas y Consumibles para Impresión',
      '21401': 'Equipo de Cómputo y Accesorios',
      '23101': 'Semillas y Material Vegetal',
      '23701': 'Filamentos para Impresión 3D',
      '24601': 'Componentes Eléctricos y Electrónicos',
      '25101': 'Reactivos y Material para Laboratorio',
      '25201': 'Insumos Agrícolas y Fertilizantes',
      '25501': 'Material de Vidriería y Laboratorio',
      '29101': 'Herramientas y Equipo Manual',
      '29401': 'Equipo de Cómputo y Tecnología',
      '33601': 'Servicios de Traducción',
      '35301': 'Servicios de Mantenimiento'
    };
    
    return nombresPartidas[codigo] || `Partida ${codigo}`;
  }

  // 🔥 TODOS LOS ARTÍCULOS DEL EXCEL (SIN DESCRIPCIÓN)
  private articulosPredefinidos: Articulo[] = [
    // PARTIDA 21101 - Papelería y Útiles
    { id: 'art_1', partidaCodigo: '21101', nombre: 'Charola artículada tamaño carta, 3 niveles, gris humo', precioReferencia: 450.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_2', partidaCodigo: '21101', nombre: 'Sobres coin con solapa engomada kraft amarillo (paq. 50 piezas)', precioReferencia: 120.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_3', partidaCodigo: '21101', nombre: 'Lapiz bicolor (lapiz-rojo) duo triangular (paq. 3 piezas)', precioReferencia: 45.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_4', partidaCodigo: '21101', nombre: 'Lápiz bicolor (azul-rojo) hexagonal grueso (paq. 4 piezas)', precioReferencia: 60.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_5', partidaCodigo: '21101', nombre: 'Clip estandar No. 2 (paq. 100 piezas)', precioReferencia: 25.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_6', partidaCodigo: '21101', nombre: 'Pines bola neón (paq. 80 piezas)', precioReferencia: 85.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_7', partidaCodigo: '21101', nombre: 'Dispensador de clips', precioReferencia: 150.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_8', partidaCodigo: '21101', nombre: 'Libreta pocket para negocios Bbook carbonio, hojas blancas', precioReferencia: 180.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_9', partidaCodigo: '21101', nombre: 'Cinchos de plastico (blanco) 4.6 x 200 mm (paq. 100 piezas)', precioReferencia: 75.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_10', partidaCodigo: '21101', nombre: 'Cuaderno cosido profesional cuadro grande (100 hojas)', precioReferencia: 95.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_11', partidaCodigo: '21101', nombre: 'Caja de papel duplicador tamaño carta, 99% blancura (paq. 5000 hojas)', precioReferencia: 850.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_12', partidaCodigo: '21101', nombre: 'Lápiz Adhesivo Morado 6 gr (1pza)', precioReferencia: 15.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_13', partidaCodigo: '21101', nombre: 'Calculadora Científica FX991LA PLUS', precioReferencia: 650.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_14', partidaCodigo: '21101', nombre: 'Hojas blancas t/carta 5000 hojas', precioReferencia: 780.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_15', partidaCodigo: '21101', nombre: 'Plumas Negra Pinpoint punto fino 12 pzas', precioReferencia: 120.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_16', partidaCodigo: '21101', nombre: 'Plumas Rojas Pinpoint punto fino 12 pzas', precioReferencia: 120.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_17', partidaCodigo: '21101', nombre: 'Plumas Azul Pinpoint punto fino 12 pzas', precioReferencia: 120.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_18', partidaCodigo: '21101', nombre: 'Lápiz triangular Graphite No 2. 72 piezas', precioReferencia: 180.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_19', partidaCodigo: '21101', nombre: 'Lápiz Hexagonal No 2. 72 piezas', precioReferencia: 160.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_20', partidaCodigo: '21101', nombre: 'Marcador permanente negro, punto fino 14 piezas', precioReferencia: 95.00, activo: true, createdAt: new Date(), updatedAt: new Date() },

    // PARTIDA 21201 - Tintas y Consumibles
    { id: 'art_21', partidaCodigo: '21201', nombre: 'Kit de tinta T664 70 ml, 4 botellas Negro/Cian/Magenta/Amarillo original', precioReferencia: 1200.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_22', partidaCodigo: '21201', nombre: 'Kit de tinta T544 65 ml, 4 botellas Negro/Cian/Magenta/Amarillo original', precioReferencia: 1100.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_23', partidaCodigo: '21201', nombre: 'Cartucho de tinta para impresora HP 667 negro compatible con 2775', precioReferencia: 350.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_24', partidaCodigo: '21201', nombre: 'Cartucho de tinta para impresora HP 667 tricolor compatible con 2775', precioReferencia: 420.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_25', partidaCodigo: '21201', nombre: 'Juego de 3 tintas para impresora EPSON de colores para L3210 (Cian, Magenta y Amarillo)', precioReferencia: 680.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_26', partidaCodigo: '21201', nombre: 'Juego de 3 tintas para impresora EPSON para L3210 (Negro)', precioReferencia: 320.00, activo: true, createdAt: new Date(), updatedAt: new Date() },

    // PARTIDA 21401 - Tecnología y Electrónicos
    { id: 'art_27', partidaCodigo: '21401', nombre: 'Disco duro estado solido, 1 TB', precioReferencia: 1200.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_28', partidaCodigo: '21401', nombre: 'Disco duro estado solido, 4 TB', precioReferencia: 3500.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_29', partidaCodigo: '21401', nombre: 'Memoria micro SD, 128 GB, clase 10, con adaptador', precioReferencia: 450.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_30', partidaCodigo: '21401', nombre: 'Memoria USB, 32 GB, 3.2', precioReferencia: 180.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_31', partidaCodigo: '21401', nombre: 'Aire comprimido, removedor de polvo, 300 gr', precioReferencia: 85.00, activo: true, createdAt: new Date(), updatedAt: new Date() },

    // PARTIDA 23101 - Semillas
    { id: 'art_32', partidaCodigo: '23101', nombre: 'Semilla certificada de Calabaza Itaniala Grey Zuchini: variedad Chabela F1 ó Adelita', precioReferencia: 250.00, activo: true, createdAt: new Date(), updatedAt: new Date() },

    // PARTIDA 23701 - Filamentos 3D
    { id: 'art_33', partidaCodigo: '23701', nombre: 'Filamento 3D PLA-madera, 1.75 mm', precioReferencia: 450.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_34', partidaCodigo: '23701', nombre: 'Filamento fibra de carbon-nylon, 1.75 mm', precioReferencia: 680.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_35', partidaCodigo: '23701', nombre: 'Filamento 3d PLA, cristal, 1.75mm', precioReferencia: 320.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_36', partidaCodigo: '23701', nombre: 'Filamento 3d PLA, blanco, 1.75mm', precioReferencia: 280.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_37', partidaCodigo: '23701', nombre: 'Filamento 3D PLA, negro, 1.75 mm', precioReferencia: 280.00, activo: true, createdAt: new Date(), updatedAt: new Date() },

    // PARTIDA 24601 - Componentes Eléctricos
    { id: 'art_38', partidaCodigo: '24601', nombre: 'Batería P20000QCD, 20000mAh, Negro', precioReferencia: 650.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_39', partidaCodigo: '24601', nombre: 'Batería P20000QCD, 20000mAh, Azul', precioReferencia: 650.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_40', partidaCodigo: '24601', nombre: 'Juego de Cables Dupont Jumpers Multicolor de 10 cm para Protoboard, 3 Piezas de 40 Cables c/u', precioReferencia: 120.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_41', partidaCodigo: '24601', nombre: 'Sensor de Humedad de tierra Analógico', precioReferencia: 85.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_42', partidaCodigo: '24601', nombre: 'Sensor de Humedad Capacitivo', precioReferencia: 150.00, activo: true, createdAt: new Date(), updatedAt: new Date() },

    // PARTIDA 25101 - Reactivos Químicos
    { id: 'art_43', partidaCodigo: '25101', nombre: 'Gelred DNA stained 10,000X', precioReferencia: 2800.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_44', partidaCodigo: '25101', nombre: 'Precisión plus protein ladder Dual Color Standards 500 microlitros (10 a 250 kDa)', precioReferencia: 3500.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_45', partidaCodigo: '25101', nombre: '1 ml kb Plus DNA Ladder (0,5 μg/μL) (100 bp a 15.000 bp)', precioReferencia: 1800.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_46', partidaCodigo: '25101', nombre: 'PureLink RNA Mini Kit', precioReferencia: 4200.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_47', partidaCodigo: '25101', nombre: '1 kit para sintesis de cDNA (Transcriptasa inversa SuperScript III) (25 reacciones)', precioReferencia: 3800.00, activo: true, createdAt: new Date(), updatedAt: new Date() },

    // PARTIDA 25201 - Insumos Agrícolas
    { id: 'art_48', partidaCodigo: '25201', nombre: 'Miel de abeja apis', precioReferencia: 180.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_49', partidaCodigo: '25201', nombre: 'Metarhizium, Beauveria Y Paecilomyces (esporomax) 300 gramos', precioReferencia: 450.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_50', partidaCodigo: '25201', nombre: 'Muralla Max Insecticida Gusano Mosca Blanca PuLGón 500 Ml', precioReferencia: 320.00, activo: true, createdAt: new Date(), updatedAt: new Date() },

    // PARTIDA 25501 - Material de Laboratorio
    { id: 'art_51', partidaCodigo: '25501', nombre: 'Matraz Erlenmeyer de 250 ml', precioReferencia: 85.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_52', partidaCodigo: '25501', nombre: 'Matraz esmerilado fondo redondo 500 ml', precioReferencia: 120.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_53', partidaCodigo: '25501', nombre: 'Filtro de jeringa con poro 0,45 µm, material PTFE/HYDROFOBICO, 13 mm', precioReferencia: 450.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_54', partidaCodigo: '25501', nombre: 'Matraz erlenmeyer 500 mL con tapon roscado', precioReferencia: 150.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_55', partidaCodigo: '25501', nombre: 'Pipeta volumetrica de 10 mL', precioReferencia: 65.00, activo: true, createdAt: new Date(), updatedAt: new Date() },

    // PARTIDA 29101 - Herramientas
    { id: 'art_56', partidaCodigo: '29101', nombre: 'Pinza punta y corte 7", mango comfort grip T203-7X', precioReferencia: 280.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_57', partidaCodigo: '29101', nombre: 'Pinza punta y corte 5", mango comfort grip PM-PU4', precioReferencia: 220.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_58', partidaCodigo: '29101', nombre: 'Pinza corte diagonal 8", mango comfort grip T202-8X', precioReferencia: 320.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_59', partidaCodigo: '29101', nombre: 'Pinza de electricista 9", mango comfort grip T211-9X', precioReferencia: 380.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_60', partidaCodigo: '29101', nombre: 'Cautín digital con estación WE1010NA, 120V, 70W', precioReferencia: 1500.00, activo: true, createdAt: new Date(), updatedAt: new Date() },

    // PARTIDA 29401 - Equipo de Cómputo
    { id: 'art_61', partidaCodigo: '29401', nombre: 'Disco duro estado sólido SSD Externo, Extreme SDSSDE61-2T00-625', precioReferencia: 2800.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_62', partidaCodigo: '29401', nombre: 'Transmisor Hdmi Inalámbrico Con Kits De Receptor Adaptador', precioReferencia: 850.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_63', partidaCodigo: '29401', nombre: 'Monitor gamer curvo C32R500 led 32" dark blue gray 100V/240V', precioReferencia: 4500.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_64', partidaCodigo: '29401', nombre: 'Bocina Clip 4 Portátil Con Bluetooth Waterproof Red', precioReferencia: 680.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_65', partidaCodigo: '29401', nombre: 'Escáner Portátil de Documentos Workforce ES-50', precioReferencia: 3200.00, activo: true, createdAt: new Date(), updatedAt: new Date() },

    // PARTIDA 33601 - Servicios de Traducción
    { id: 'art_66', partidaCodigo: '33601', nombre: 'Traducción de Artículo de Investigación para su publicación como producto académico', precioReferencia: 2500.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_67', partidaCodigo: '33601', nombre: 'Traducción de articulos relacionados con temas de robótica de rehabilitación, fisioterapia y anatomía del cuerpo', precioReferencia: 2800.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_68', partidaCodigo: '33601', nombre: 'Servicio de traducción de articulo', precioReferencia: 1800.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_69', partidaCodigo: '33601', nombre: 'Traducción de un artuículo cientifico de 4000 palabras en español con experiencia en el área de quimica computacional', precioReferencia: 3500.00, activo: true, createdAt: new Date(), updatedAt: new Date() },

    // PARTIDA 35301 - Servicios de Mantenimiento
    { id: 'art_70', partidaCodigo: '35301', nombre: 'Mantenimiento de mi Mac Pro 13"', precioReferencia: 800.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_71', partidaCodigo: '35301', nombre: 'Matenimiento lap top windows cambio de pantalla', precioReferencia: 1200.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_72', partidaCodigo: '35301', nombre: 'Mantenimiento Preventivo -Correctivo y Actualizacion de Software - Laptop Lenovo Ideapad 520', precioReferencia: 650.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_73', partidaCodigo: '35301', nombre: 'Mantenimiento Preventivo -Correctivo y Actualizacion de Software - Laptop Lenovo Ideapad 330s', precioReferencia: 600.00, activo: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'art_74', partidaCodigo: '35301', nombre: 'Mantenimiento Preventivo -Correctivo y Actualizacion de Software - Mantenimiento Laptop Dell', precioReferencia: 700.00, activo: true, createdAt: new Date(), updatedAt: new Date() }
  ];

  // Obtener todos los artículos activos
  getArticulos(): Observable<ApiResponse<Articulo[]>> {
    const articulos = this.getArticulosFromStorage();
    const articulosActivos = articulos.filter(a => a.activo);
    
    return of({
      success: true,
      data: articulosActivos,
      message: 'Artículos obtenidos exitosamente'
    }).pipe(delay(500));
  }

  // Obtener artículos por partida
  getArticulosPorPartida(partidaCodigo: string): Observable<ApiResponse<Articulo[]>> {
    const articulos = this.getArticulosFromStorage();
    const articulosFiltrados = articulos.filter(a => a.partidaCodigo === partidaCodigo && a.activo);
    
    return of({
      success: true,
      data: articulosFiltrados,
      message: `Artículos de partida ${partidaCodigo} obtenidos exitosamente`
    }).pipe(delay(300));
  }

  // Buscar artículos por nombre
  buscarArticulos(termino: string): Observable<ApiResponse<Articulo[]>> {
    const articulos = this.getArticulosFromStorage();
    const articulosFiltrados = articulos.filter(a => 
      a.nombre.toLowerCase().includes(termino.toLowerCase()) && a.activo
    );
    
    return of({
      success: true,
      data: articulosFiltrados,
      message: 'Búsqueda completada exitosamente'
    }).pipe(delay(400));
  }

  // Crear nuevo artículo (solo admin/revisor)
  createArticulo(articuloData: CreateArticuloRequest): Observable<ApiResponse<Articulo>> {
    return new Observable(observer => {
      try {
        const articulos = this.getArticulosFromStorage();
        
        const nuevoArticulo: Articulo = {
          id: this.generateId(),
          ...articuloData,
          activo: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        articulos.push(nuevoArticulo);
        this.saveArticulosToStorage(articulos);

        setTimeout(() => {
          observer.next({
            success: true,
            data: nuevoArticulo,
            message: 'Artículo creado exitosamente'
          });
          observer.complete();
        }, 1000);

      } catch (error) {
        observer.error({
          success: false,
          message: 'Error al crear artículo',
          error: error
        });
      }
    });
  }

  // Actualizar artículo (solo admin/revisor)
  updateArticulo(id: string, articulo: UpdateArticuloRequest): Observable<ApiResponse<Articulo>> {
    const articulos = this.getArticulosFromStorage();
    const index = articulos.findIndex(a => a.id === id);
    
    if (index !== -1) {
      articulos[index] = { 
        ...articulos[index], 
        ...articulo, 
        updatedAt: new Date() 
      };
      this.saveArticulosToStorage(articulos);
      
      return of({
        success: true,
        data: articulos[index],
        message: 'Artículo actualizado exitosamente'
      });
    }
    
    return of({
      success: false,
      message: 'Artículo no encontrado'
    });
  }

  // Desactivar artículo (solo admin/revisor)
  desactivarArticulo(id: string): Observable<ApiResponse<Articulo>> {
    const articulos = this.getArticulosFromStorage();
    const index = articulos.findIndex(a => a.id === id);
    
    if (index !== -1) {
      articulos[index] = { 
        ...articulos[index], 
        activo: false,
        updatedAt: new Date() 
      };
      this.saveArticulosToStorage(articulos);
      
      return of({
        success: true,
        data: articulos[index],
        message: 'Artículo desactivado exitosamente'
      });
    }
    
    return of({
      success: false,
      message: 'Artículo no encontrado'
    });
  }
}