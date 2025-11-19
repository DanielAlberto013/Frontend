// src/app/core/services/documento-final.service.ts
import { Injectable } from '@angular/core';
import { Observable, map, forkJoin, switchMap, of } from 'rxjs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as ExcelJS from 'exceljs';
import { DocumentoFinal, PartidaDocumento, ProductoDocumento, DocumentoFinalDocente } from '../models/documento-final.model';
import { ProyectosService } from './proyectos.service';
import { PartidasService } from './partidas.service';
import { ArticulosService } from './articulos.service';
import { CotizacionesService } from './cotizaciones.service';
import { AuthService } from '../../auth/auth';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

@Injectable({
  providedIn: 'root'
})
export class DocumentoFinalService {

  private descripcionesPartidas: { [key: string]: string } = {
    '21101': 'MATERIALES, ÚTILES Y EQUIPOS MENORES DE OFICINA. Asignaciones destinadas a la adquisición de materiales, artículos diversos y equipos menores propios para el uso de las oficinas tales como: papelería, formas, libretas, carpetas y cualquier tipo de papel, vasos y servilletas desechables, limpia-tipos; útiles de escritorio como engrapadoras, perforadoras manuales, sacapuntas; artículos de dibujo, correspondencia y archivo; cestos de basura y otros productos similares. Incluye la adquisición de artículos de envoltura, sacos y valijas, entre otros.',
    '21201': 'Materiales y útiles de impresión y reproducción. Asignaciones destinadas a la adquisición de materiales utilizados en la impresión, reproducción y encuadernación, tales como: fijadores, tintas, pastas para encuadernación, logotipos, acetatos, arillo para engargolar, cartuchos de tóner para fax, cartuchos de tóner para fotocopiadoras, cilindro para fotocopiadora, papel (bond para mimeógrafos, heliográficos, revelador, cartoncillo, fax, etc.), rollos fotográficos, sedas, entintadoras, tintas para serigrafía, tóner para reloj checador, entre otros, y demás materiales y útiles para el mismo fin.',
    '21401': 'Materiales, útiles y equipos menores de tecnologías de la información y comunicaciones. Asignaciones destinadas a la adquisición insumos y equipos menores utilizados en el procesamiento, grabación e impresión de datos, como son: USB, CD, DVD, blu-ray, entre otros, así como los materiales para la limpieza y protección de los equipos, tales como: medios ópticos y magnéticos, adaptadores para equipo de cómputo, administradores de cables, apuntadores, cables para transmision de datos, protectores de vídeo, fundas, solventes, cartuchos de tinta, cintas y tóner para impresoras, así como recargas de cartuchos y tóner para impresora, entre otros.',
    '23101': 'Productos alimenticios, agropecuarios y forestales adquiridos como materia prima. Asignaciones destinadas a la adquisición de productos alimenticios como materias primas en estado natural, transformadas o semi-transformadas, de naturaleza vegetal y animal que se utilizan en los procesos productivos, diferentes a las contenidas en las demás partidas de este Clasificador.',
    '23701': 'Productos de cuero, piel, plástico y hule adquiridos como materia prima. Asignaciones destinadas a la adquisición de cuero, piel, plástico y hule como materias primas en estado natural, transformadas o semi-transformadas, que se utilizan en los procesos productivos, diferentes a las contenidas en las demás partidas de this Clasificador.',
    '24601': 'Material eléctrico y electrónico. Asignaciones destinadas a la adquisición de todo tipo de material eléctrico y electrónico, tels como: cables, interruptores, tubos fluorescentes, focos, aislantes, electrodos, transistores, alambres, lámpara, baterías o pilas, entre otros, que requieran las líneas de transmision telegráfica, telefónica y de telecomunicaciones, sean aéreas, subterráneas o submarinas; igualmente para la adquisición de materiales necesarios en las instalaciones radiofónicas, radiotelegráficas, entre otras.',
    '25101': 'Productos químicos básicos. Asignaciones destinadas a la adquisición de productos químicos básicos: petroquímicos como benceno, tolueno, xileno, etileno, propileno, estireno a partir del gas natural, del gas licuado del petróleo y de destilados y otras fracciones posteriores a la refinación del petróleo; reactivos, fluoruros, fosfatos, nitratos, óxidos, alquinos, marcadores genéticos, entre otros.',
    '25201': 'Fertilizantes, pesticidas y otros agroquímicos. Asignaciones destinadas a la adquisición de este tipo de productos cuyo estado de fabricación se encuentre terminado, tels como: fertilizantes complejos e inorgánicos, fertilizantes nitrogenados, fosfatados, biológicos procesados o de otro tipo, mezclas, fungicidas, herbicidas, plaguicidas, raticidas, antigerminantes, reguladores del crecimiento de las plantas y nutrientes de suelos, entre otros. Incluye los abonos que se comercializan en estado natural.',
    '25501': 'Materiales, accesorios y suministros de laboratorio. Asignaciones destinadas a la adquisición de toda clase de materiales y suministros utilizados en los laboratorios médicos, químicos, de investigación, fotográficos, cinematográficos, audio-visión, entre otros, tels como: cilindros graduados, matraces, probetas, mecheros, campanas de cultivo, cápsulas de porcelana, embudos de vidrio o de polietileno, tubos de cultivo, vidrio de cobalto, tanques de revelado, materiales para radiografía, electrocardiografía, medicina nuclear; artículos para el revelado e impresión de fotografías. Esta partida incluye animales para experimentación.',
    '29101': 'Herramientas menores. Asignaciones destinadas a la adquisición de herramientas auxiliares de trabajo, utilizadas en carpintería, silvicultura, horticultura, ganadería, agricultura y otras industrias, tels como: desarmadores, martillos, llaves para tuercas, carretillas de mano, cuchillos, navajas, tijeras de mano, sierras de mano, alicates, hojas para seguetas, micrómetros, cintas métricas, pinzas, prensas, berbiquíes, garlopas, taladros, zapapicos, escaleras, detectores de metales manuales y demás bienes de consumo similares.',
    '29401': 'Refacciones y accesorios menores para equipo de cómputo y telecomunicaciones. Asignaciones destinadas a la adquisición de componentes y dispositivos internos o externos que se integran al equipo de cómputo y/o telecomunicaciones, con el objeto de conservar o recuperar su funcionalidad y que son de difícil control de inventarios, tels como: tarjetas electrónicas, unidades de discos internos (Duros, CD, DVD y Blueray), batería para laptop, puertos USB, puertos HDMI, circuitos, bocinas, pantallas, ratones, teclados, cámaras, entre otros.',
    '33601': 'Servicios de apoyo administrativo, traducción, fotocopiado e impresión. Asignaciones destinadas a cubrir el costo de la contratación de servicios de fotocopiado y preparación de documentos; digitalización de documentos oficiales, fax, engargolado, enmicado, encuadernación, corte de papel, recepción de correspondencia y otros afines. Incluye servicios de apoyo secretarial, servicios de estenografía en los tribunals, transcripción simultánea de diálogos para la televisión, reuniones y conferencias; servicios comerciales no previstos en las demás partidas anteriores. Incluye servicios de impresión de documentos oficiales necesarios tels como: pasaportes, certificados especiales, títulos de crédito, formas fiscales y formas valoradas, y demás documentos para la identificación, trámites oficiales y servicios a la población; servicios de impresión y elaboración de material informativo, tels como: padrones de beneficiarios, reglas de operación, programas sectoriales, regionales, especiales; informes de labores, manuales de organización, de procedimientos y de servicios al público; decretos, convenios, acuerdos, instructivos, proyectos editoriales (libros, revistas y gacetas periódicas), folletos, trípticos, dípticos, carteles, mantas, rótulos, y demás servicios de impresión y elaboración de material informativo. Incluye gastos como: avisos, precisiones, convocatorias, edictos, bases, licitaciones, concursos y aclaraciones, y demás información en medios masivos. Excluye las inserciones derivadas de campañas publicitarias y de comunicación social, las cuales se deberán registrar en las partidas correspondientes al concepto 3600 Servicios de Comunicación Social y Publicidad.',
    '35301': 'Instalación, reparación y mantenimiento de equipo de cómputo y tecnologías de la información. Asignaciones destinadas a cubrir los gastos por servicios que se contraten con tercers para la instalación, reparación y mantenimiento de equipos de cómputo y tecnologías de la información, tels como: computadoras, impresoras, dispositivos de seguridad, reguladores, fuentes de potencia ininterrumpida, servidores de información, drones, entre otros, así como el mantenimiento en general. Incluye el pago de deducibles de seguros.'
  };

  constructor(
    private proyectosService: ProyectosService,
    private partidasService: PartidasService,
    private articulosService: ArticulosService,
    private cotizacionesService: CotizacionesService,
    private authService: AuthService
  ) {}

  // ✅ MÉTODO MEJORADO: Obtener documento final desde cotizaciones reales con partidas
  getDocumentoFinalDesdeCotizaciones(proyectoId: string): Observable<DocumentoFinal> {
    return forkJoin({
      cotizaciones: this.cotizacionesService.getCotizacionesByProyecto(proyectoId),
      proyecto: this.proyectosService.getProyectoById(proyectoId),
      partidas: this.partidasService.getPartidasByProyecto(proyectoId)
    }).pipe(
      map(({ cotizaciones, proyecto, partidas }) => {
        if (!cotizaciones.success || !cotizaciones.data || cotizaciones.data.length === 0) {
          // Si no hay cotizaciones, retornar documento vacío
          if (proyecto.success && proyecto.data) {
            return this.crearDocumentoVacio(proyecto.data);
          }
          throw new Error('Proyecto no encontrado');
        }

        const cotizacionesData = cotizaciones.data;
        const proyectoData = proyecto.success ? proyecto.data : null;
        const partidasData = partidas.success && partidas.data ? partidas.data : [];

        if (!proyectoData) {
          throw new Error('Proyecto no encontrado');
        }

        return this.crearDocumentoDesdeCotizaciones(proyectoData, cotizacionesData, partidasData);
      })
    );
  }

  // ✅ MÉTODO MEJORADO: Crear documento final desde cotizaciones reales con montos originales
  private crearDocumentoDesdeCotizaciones(proyecto: any, cotizaciones: any[], partidasProyecto: any[]): DocumentoFinal {
    const partidasMap = new Map<string, PartidaDocumento>();
    
    if (cotizaciones && cotizaciones.length > 0) {
      cotizaciones.forEach(cotizacion => {
        const partidaCodigo = cotizacion.partidaCodigo;
        
        if (!partidasMap.has(partidaCodigo)) {
          const montoOriginal = this.obtenerMontoOriginalPartida(partidasProyecto, partidaCodigo);
          
          partidasMap.set(partidaCodigo, {
            partidaCodigo: partidaCodigo,
            partidaNombre: cotizacion.nombrePartida || this.getNombrePartida(partidaCodigo),
            partidaDescripcion: this.descripcionesPartidas[partidaCodigo] || `Partida presupuestal ${partidaCodigo}`,
            montoAutorizado: montoOriginal,
            productos: [],
            subtotal: 0,
            iva: 0,
            total: 0
          });
        }
        
        const partida = partidasMap.get(partidaCodigo)!;
        
        if (cotizacion.items && cotizacion.items.length > 0) {
          cotizacion.items.forEach((item: any) => {
            partida.productos.push({
              cantidad: item.cantidad || 0,
              descripcion: item.articulo?.nombre || 'Artículo no especificado',
              precioUnitario: item.precioUnitario || 0,
              total: item.subtotal || 0
            });
            
            partida.subtotal += item.subtotal || 0;
          });
        }
      });
    }

    const partidas = Array.from(partidasMap.values()).map(partida => {
      partida.iva = partida.subtotal * 0.16;
      partida.total = partida.subtotal + partida.iva;
      return partida;
    });

    const subtotal = partidas.reduce((sum, partida) => sum + partida.subtotal, 0);
    const iva = subtotal * 0.16;
    const total = subtotal + iva;

    return {
      tipoConvocatoria: 'Convocatoria 2025: PROYECTOS DE INVESTIGACIÓN CIENTÍFICA, DESARROLLO TECNOLÓGICO E INNOVACIÓN',
      nombreProyecto: proyecto.nombre,
      claveProyecto: this.generarClaveProyecto(proyecto),
      vigenciaProyecto: '01 de enero al 31 de diciembre de 2025',
      tipoFondo: this.determinarTipoFondo(proyecto),
      partidas: partidas,
      docenteNombre: proyecto.docente?.nombre || 'Docente no asignado',
      fechaGeneracion: new Date(),
      subtotal: subtotal,
      iva: iva,
      total: total,
      montoAprobado: proyecto.presupuestoTotal,
      proyecto: proyecto
    };
  }

  // ✅ NUEVO MÉTODO: Obtener monto original de la partida del proyecto
  private obtenerMontoOriginalPartida(partidasProyecto: any[], partidaCodigo: string): number {
    if (partidasProyecto && Array.isArray(partidasProyecto)) {
      const partida = partidasProyecto.find((p: any) => p.codigo === partidaCodigo);
      
      if (partida) {
        const monto = partida.importeAsignado || partida.montoInicial || partida.presupuestoInicial || partida.saldoDisponible || 0;
        return monto;
      }
    }
    
    return 0;
  }

  // ✅ MÉTODO: Crear documento vacío (cuando no hay cotizaciones)
  private crearDocumentoVacio(proyecto: any): DocumentoFinal {
    return {
      tipoConvocatoria: 'Convocatoria 2025: PROYECTOS DE INVESTIGACIÓN CIENTÍFICA, DESARROLLO TECNOLÓGICO E INNOVACIÓN',
      nombreProyecto: proyecto.nombre,
      claveProyecto: this.generarClaveProyecto(proyecto),
      vigenciaProyecto: '01 de enero al 31 de diciembre de 2025',
      tipoFondo: this.determinarTipoFondo(proyecto),
      partidas: [],
      docenteNombre: proyecto.docente?.nombre || 'Docente no asignado',
      fechaGeneracion: new Date(),
      subtotal: 0,
      iva: 0,
      total: 0,
      montoAprobado: proyecto.presupuestoTotal,
      proyecto: proyecto
    };
  }

  // ✅ MÉTODO MEJORADO: getDocumentosFinalesAdmin para usar datos reales con montos originales
  getDocumentosFinalesAdmin(): Observable<DocumentoFinal[]> {
    return this.proyectosService.getProyectosPorEstado('APROBADO').pipe(
      switchMap(proyectosResponse => {
        if (!proyectosResponse.success || !proyectosResponse.data) {
          return of([]);
        }

        const proyectos = proyectosResponse.data;
        
        const documentos$ = proyectos.map(proyecto => 
          this.getDocumentoFinalDesdeCotizaciones(proyecto.id)
        );

        return forkJoin(documentos$);
      })
    );
  }

  // ✅ MÉTODO MEJORADO: getDocumentoFinalDocente para usar datos reales con montos originales
  getDocumentoFinalDocente(): Observable<DocumentoFinalDocente> {
    return this.proyectosService.getMisProyectos().pipe(
      switchMap(response => {
        if (!response.success || !response.data) {
          return of({
            docenteNombre: 'Docente Demo',
            proyectos: [],
            totalGeneral: 0,
            fechaGeneracion: new Date()
          });
        }

        const proyectosAprobados = response.data.filter((p: any) => p.estado === 'APROBADO');
        
        const documentos$ = proyectosAprobados.map((proyecto: any) => 
          this.getDocumentoFinalDesdeCotizaciones(proyecto.id)
        );

        return forkJoin(documentos$).pipe(
          map(documentos => {
            const docenteNombre = proyectosAprobados.length > 0 
              ? proyectosAprobados[0].docente?.nombre || 'Docente Demo'
              : 'Docente Demo';
            
            const totalGeneral = documentos.reduce((sum, doc) => sum + doc.total, 0);

            return {
              docenteNombre: docenteNombre,
              proyectos: documentos,
              totalGeneral: totalGeneral,
              fechaGeneracion: new Date()
            };
          })
        );
      })
    );
  }

  // ✅ MÉTODO AUXILIAR: Obtener nombre de partida
  private getNombrePartida(codigo: string): string {
    return this.articulosService.getNombrePartida(codigo);
  }

  // ✅ MÉTODO AUXILIAR: Generar clave de proyecto
  private generarClaveProyecto(proyecto: any): string {
    const año = new Date().getFullYear();
    const idCorto = proyecto.id.slice(-4);
    return `${idCorto}.${año.toString().slice(-2)}-PD`;
  }

  // ✅ MÉTODO AUXILIAR: Determinar tipo de fondo
  private determinarTipoFondo(proyecto: any): 'FEDERAL' | 'ESTATAL' {
    return proyecto.presupuestoFederal >= proyecto.presupuestoEstatal ? 'FEDERAL' : 'ESTATAL';
  }

  // ✅ GENERAR DOCUMENTO FINAL EN PDF CON FORMATO CHECKLIST SIMPLE Y SOBRANTE
  generarPDFDocumentoFinal(documento: DocumentoFinal): void {
    const doc = new jsPDF();
    
    // Configuración inicial
    doc.setFont('helvetica');
    let yPosition = 20;

    // ========== ENCABEZADO INSTITUCIONAL ==========
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(47, 84, 150); // Azul ITESCAM
    doc.text('INSTITUTO TECNOLÓGICO SUPERIOR DE CALKINÍ', 105, yPosition, { align: 'center' });
    yPosition += 7;
    doc.text('EN EL ESTADO DE CAMPECHE', 105, yPosition, { align: 'center' });
    yPosition += 15;

    // ========== TÍTULO DEL DOCUMENTO ==========
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('DOCUMENTO FINAL DE PROYECTO APROBADO', 105, yPosition, { align: 'center' });
    yPosition += 20;

    // ========== INFORMACIÓN BÁSICA ==========
    doc.setFontSize(10);
    
    // Docente
    doc.setFont('helvetica', 'bold');
    doc.text('DOCENTE:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(documento.docenteNombre, 50, yPosition);
    yPosition += 8;

    // Nombre del Proyecto
    doc.setFont('helvetica', 'bold');
    doc.text('PROYECTO:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    const proyectoLines = doc.splitTextToSize(documento.nombreProyecto, 140);
    doc.text(proyectoLines, 50, yPosition);
    yPosition += (proyectoLines.length * 5) + 5;

    // Clave y Presupuesto
    doc.setFont('helvetica', 'bold');
    doc.text('CLAVE:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(documento.claveProyecto, 50, yPosition);
    
    doc.setFont('helvetica', 'bold');
    doc.text('PRESUPUESTO:', 100, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(`$${documento.montoAprobado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 135, yPosition);
    yPosition += 15;

    // Línea separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;

    // ========== LISTA DE ARTÍCULOS - FORMATO CHECKLIST ==========
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(47, 84, 150);
    doc.text('LISTA DE ARTÍCULOS Y PRODUCTOS', 20, yPosition);
    yPosition += 10;

    let itemNumber = 1;

    // Recorrer todas las partidas y productos
    documento.partidas.forEach(partida => {
      // Título de la partida
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(`› ${partida.partidaCodigo} - ${partida.partidaNombre}`, 20, yPosition);
      yPosition += 6;

      // Productos de la partida
      partida.productos.forEach(producto => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }

        // Número de item
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`${itemNumber}.`, 20, yPosition);

        // Cantidad
        doc.text(`${producto.cantidad}`, 30, yPosition);

        // Descripción del producto
        doc.setTextColor(0, 0, 0);
        const descLines = doc.splitTextToSize(producto.descripcion, 90);
        doc.text(descLines, 45, yPosition);

        // Precio unitario
        doc.setTextColor(80, 80, 80);
        doc.text(`$${producto.precioUnitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 140, yPosition);

        // Total del producto
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`$${producto.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 170, yPosition);

        yPosition += (descLines.length * 4) + 4;
        itemNumber++;
      });

      yPosition += 5;
    });

    // ========== TOTALES ==========
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    // Línea separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;

    // Subtotal
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('SUBTOTAL:', 120, yPosition);
    doc.text(`$${documento.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 170, yPosition);
    yPosition += 7;

    // IVA
    doc.text('IVA (16%):', 120, yPosition);
    doc.text(`$${documento.iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 170, yPosition);
    yPosition += 7;

    // Total General
    doc.setFontSize(11);
    doc.setTextColor(47, 84, 150);
    doc.text('TOTAL GENERAL:', 120, yPosition);
    doc.text(`$${documento.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 170, yPosition);
    yPosition += 15;

    // ========== ✅ NUEVA SECCIÓN: SOBRANTE O DINERO RESTANTE ==========
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;

    // Calcular sobrante
    const sobrante = documento.montoAprobado - documento.total;
    const porcentajeUtilizado = (documento.total / documento.montoAprobado) * 100;
    const porcentajeSobrante = 100 - porcentajeUtilizado;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('RESUMEN FINANCIERO DEL PROYECTO', 20, yPosition);
    yPosition += 10;

    // Monto Aprobado
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('MONTO APROBADO TOTAL:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(`$${documento.montoAprobado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 170, yPosition);
    yPosition += 7;

    // Total Utilizado
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL UTILIZADO:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(`$${documento.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 170, yPosition);
    yPosition += 7;

    // Porcentaje Utilizado
    doc.setFont('helvetica', 'bold');
    doc.text('PORCENTAJE UTILIZADO:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(`${porcentajeUtilizado.toFixed(1)}%`, 170, yPosition);
    yPosition += 7;

    // ✅ SOBRANTE / DINERO RESTANTE
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    if (sobrante > 0) {
      doc.setTextColor(0, 128, 0); // Verde para sobrante positivo
      doc.text('SOBRANTE DISPONIBLE:', 20, yPosition);
      doc.text(`$${sobrante.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 170, yPosition);
      yPosition += 7;
      
      doc.setFontSize(10);
      doc.setTextColor(0, 100, 0);
      doc.text(`(${porcentajeSobrante.toFixed(1)}% del presupuesto disponible)`, 20, yPosition);
    } else if (sobrante === 0) {
      doc.setTextColor(47, 84, 150); // Azul para presupuesto exacto
      doc.text('PRESUPUESTO COMPLETAMENTE UTILIZADO:', 20, yPosition);
      doc.text(`$${sobrante.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 170, yPosition);
      yPosition += 7;
      
      doc.setFontSize(10);
      doc.setTextColor(47, 84, 150);
      doc.text('(No hay sobrante - Presupuesto agotado)', 20, yPosition);
    } else {
      doc.setTextColor(255, 0, 0); // Rojo para déficit
      doc.text('DÉFICIT / EXCEDENTE:', 20, yPosition);
      doc.text(`-$${Math.abs(sobrante).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 170, yPosition);
      yPosition += 7;
      
      doc.setFontSize(10);
      doc.setTextColor(255, 0, 0);
      doc.text('(El proyecto excedió el presupuesto aprobado)', 20, yPosition);
    }
    yPosition += 15;

    // ========== FIRMAS ==========
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    // Firma del docente
    doc.text('_________________________', 40, yPosition);
    doc.text(documento.docenteNombre, 40, yPosition + 6);
    doc.setFont('helvetica', 'normal');
    doc.text('LÍDER DEL PROYECTO', 40, yPosition + 12);

    // Firma del subdirector
    doc.text('_________________________', 120, yPosition);
    doc.setFont('helvetica', 'bold');
    doc.text('SUBDIRECTOR ACADÉMICO', 120, yPosition + 6);
    doc.setFont('helvetica', 'normal');
    doc.text('ITESCAM', 120, yPosition + 12);

    // ========== PIE DE PÁGINA ==========
    yPosition = 280;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Documento generado electrónicamente - Sistema de Gestión de Proyectos ITESCAM', 105, yPosition, { align: 'center' });
    doc.text(`Generado el: ${new Date().toLocaleDateString('es-MX')}`, 105, yPosition + 5, { align: 'center' });

    // Guardar el PDF
    doc.save(`DocumentoFinal-${documento.claveProyecto}.pdf`);
  }

  // ✅ GENERAR DOCUMENTO FINAL EN EXCEL CON DISEÑO FORMAL Y PROFESIONAL
  async generarExcelDocumentoFinal(documento: DocumentoFinal): Promise<void> {
    try {
      const workbook = new ExcelJS.Workbook();
      
      // Para cada partida, crear una hoja
      for (const partida of documento.partidas) {
        const worksheet = workbook.addWorksheet(`${partida.partidaCodigo}${documento.tipoFondo.substring(0, 3)}`.substring(0, 31));

        // ========== CONFIGURACIÓN INICIAL ==========
        worksheet.properties.defaultRowHeight = 25;

        // ========== ENCABEZADO INSTITUCIONAL ==========
        // Logo y título institucional
        worksheet.mergeCells('A1:J2');
        worksheet.getCell('A1').value = 'INSTITUTO TECNOLÓGICO SUPERIOR DE CALKINÍ EN EL ESTADO DE CAMPECHE';
        worksheet.getCell('A1').font = { bold: true, size: 14, name: 'Arial' };
        worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getCell('A1').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2F5496' }
        };
        worksheet.getCell('A1').font = { color: { argb: 'FFFFFFFF' }, bold: true };

        // Título del documento
        worksheet.mergeCells('A3:J3');
        worksheet.getCell('A3').value = 'DOCUMENTO FINAL DE PROYECTO APROBADO';
        worksheet.getCell('A3').font = { bold: true, size: 16, name: 'Arial' };
        worksheet.getCell('A3').alignment = { horizontal: 'center' };
        worksheet.getCell('A3').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFBFBFBF' }
        };

        // ========== INFORMACIÓN GENERAL DEL PROYECTO ==========
        const infoStyle: Partial<ExcelJS.Style> = {
          font: { name: 'Arial', size: 10 },
          alignment: { vertical: 'middle' }
        };

        // TIPO DE CONVOCATORIA
        worksheet.mergeCells('A4:C4');
        worksheet.getCell('A4').value = 'TIPO DE CONVOCATORIA:';
        worksheet.getCell('A4').font = { bold: true, name: 'Arial', size: 10 };
        worksheet.mergeCells('D4:J4');
        worksheet.getCell('D4').value = documento.tipoConvocatoria;
        Object.assign(worksheet.getCell('D4').style, infoStyle);

        // NOMBRE DEL PROYECTO
        worksheet.mergeCells('A5:C5');
        worksheet.getCell('A5').value = 'NOMBRE DEL PROYECTO:';
        worksheet.getCell('A5').font = { bold: true, name: 'Arial', size: 10 };
        worksheet.mergeCells('D5:J5');
        worksheet.getCell('D5').value = documento.nombreProyecto;
        Object.assign(worksheet.getCell('D5').style, infoStyle);

        // CLAVE DE PROYECTO
        worksheet.mergeCells('A6:C6');
        worksheet.getCell('A6').value = 'CLAVE DE PROYECTO:';
        worksheet.getCell('A6').font = { bold: true, name: 'Arial', size: 10 };
        worksheet.mergeCells('D6:J6');
        worksheet.getCell('D6').value = documento.claveProyecto;
        Object.assign(worksheet.getCell('D6').style, infoStyle);

        // VIGENCIA DEL PROYECTO
        worksheet.mergeCells('A7:C7');
        worksheet.getCell('A7').value = 'VIGENCIA DEL PROYECTO:';
        worksheet.getCell('A7').font = { bold: true, name: 'Arial', size: 10 };
        worksheet.mergeCells('D7:J7');
        worksheet.getCell('D7').value = documento.vigenciaProyecto;
        Object.assign(worksheet.getCell('D7').style, infoStyle);

        // TIPO DE FONDO
        worksheet.mergeCells('A8:C8');
        worksheet.getCell('A8').value = 'TIPO DE FONDO:';
        worksheet.getCell('A8').font = { bold: true, name: 'Arial', size: 10 };
        worksheet.mergeCells('D8:J8');
        worksheet.getCell('D8').value = documento.tipoFondo;
        Object.assign(worksheet.getCell('D8').style, infoStyle);

        // DOCENTE RESPONSABLE
        worksheet.mergeCells('A9:C9');
        worksheet.getCell('A9').value = 'DOCENTE RESPONSABLE:';
        worksheet.getCell('A9').font = { bold: true, name: 'Arial', size: 10 };
        worksheet.mergeCells('D9:J9');
        worksheet.getCell('D9').value = documento.docenteNombre;
        Object.assign(worksheet.getCell('D9').style, infoStyle);

        // FECHA DE GENERACIÓN
        worksheet.mergeCells('A10:C10');
        worksheet.getCell('A10').value = 'FECHA DE GENERACIÓN:';
        worksheet.getCell('A10').font = { bold: true, name: 'Arial', size: 10 };
        worksheet.mergeCells('D10:J10');
        worksheet.getCell('D10').value = documento.fechaGeneracion.toLocaleDateString('es-MX', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        Object.assign(worksheet.getCell('D10').style, infoStyle);

        // Espacio
        worksheet.getRow(11).height = 15;

        // ========== TABLA PRINCIPAL - DETALLE DE PARTIDA ==========
        const startRow = 12;

        // Encabezados de la tabla principal
        const headers = [
          'No. DE PARTIDA', 
          'DESCRIPCIÓN DE LA PARTIDA', 
          '', 
          'MONTO AUTORIZADO', 
          'CANTIDAD', 
          'DESCRIPCIÓN DE PRODUCTOS', 
          '', 
          'PRECIO UNITARIO', 
          'TOTAL'
        ];
        
        // Aplicar estilo formal a los encabezados
        headers.forEach((header, colIndex) => {
          const cell = worksheet.getCell(startRow, colIndex + 1);
          cell.value = header;
          cell.font = { 
            bold: true, 
            color: { argb: 'FFFFFFFF' },
            name: 'Arial',
            size: 9
          };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF2F5496' }
          };
          cell.border = this.getBordeFormal();
        });

        // Fila de partida (primera fila de datos)
        const partidaRow = startRow + 1;
        
        // No. DE PARTIDA
        worksheet.mergeCells(`A${partidaRow}:B${partidaRow}`);
        const cellPartida = worksheet.getCell(`A${partidaRow}`);
        cellPartida.value = partida.partidaCodigo;
        cellPartida.font = { bold: true, name: 'Arial', size: 10 };
        cellPartida.alignment = { horizontal: 'center', vertical: 'middle' };
        cellPartida.border = this.getBordeFormal();
        cellPartida.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE7E6E6' }
        };

        // DESCRIPCIÓN
        const cellDescripcion = worksheet.getCell(`C${partidaRow}`);
        cellDescripcion.value = partida.partidaDescripcion;
        cellDescripcion.border = this.getBordeFormal();
        cellDescripcion.alignment = { wrapText: true, vertical: 'top' };
        cellDescripcion.font = { name: 'Arial', size: 8 };
        cellDescripcion.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE7E6E6' }
        };

        // Columna vacía
        worksheet.getCell(`D${partidaRow}`).value = '';
        worksheet.getCell(`D${partidaRow}`).border = this.getBordeFormal();
        worksheet.getCell(`D${partidaRow}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE7E6E6' }
        };

        // MONTO AUTORIZADO
        const cellMonto = worksheet.getCell(`E${partidaRow}`);
        cellMonto.value = partida.montoAutorizado;
        cellMonto.numFmt = '"$"#,##0.00';
        cellMonto.font = { bold: true, name: 'Arial', size: 10 };
        cellMonto.alignment = { horizontal: 'center', vertical: 'middle' };
        cellMonto.border = this.getBordeFormal();
        cellMonto.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE7E6E6' }
        };

        // CANTIDAD (vacía en fila de partida)
        worksheet.getCell(`F${partidaRow}`).value = '';
        worksheet.getCell(`F${partidaRow}`).border = this.getBordeFormal();
        worksheet.getCell(`F${partidaRow}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE7E6E6' }
        };

        // DESCRIPCIÓN DE PRODUCTOS (vacía en fila de partida)
        worksheet.getCell(`G${partidaRow}`).value = '';
        worksheet.getCell(`G${partidaRow}`).border = this.getBordeFormal();
        worksheet.getCell(`G${partidaRow}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE7E6E6' }
        };

        // Columna vacía
        worksheet.getCell(`H${partidaRow}`).value = '';
        worksheet.getCell(`H${partidaRow}`).border = this.getBordeFormal();
        worksheet.getCell(`H${partidaRow}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE7E6E6' }
        };

        // PRECIO UNITARIO (vacío en fila de partida)
        worksheet.getCell(`I${partidaRow}`).value = '';
        worksheet.getCell(`I${partidaRow}`).border = this.getBordeFormal();
        worksheet.getCell(`I${partidaRow}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE7E6E6' }
        };

        // TOTAL (vacío en fila de partida)
        worksheet.getCell(`J${partidaRow}`).value = '';
        worksheet.getCell(`J${partidaRow}`).border = this.getBordeFormal();
        worksheet.getCell(`J${partidaRow}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE7E6E6' }
        };

        // ========== DETALLE DE PRODUCTOS ==========
        let currentRow = partidaRow + 1;
        partida.productos.forEach((producto, index) => {
          // Definir estilos para filas alternadas
          const rowFillStyle = {
            type: 'pattern' as const,
            pattern: 'solid' as const,
            fgColor: { argb: index % 2 === 0 ? 'FFFFFFFF' : 'FFF2F2F2' }
          };

          // No. DE PARTIDA (vacío para productos)
          worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
          worksheet.getCell(`A${currentRow}`).value = '';
          worksheet.getCell(`A${currentRow}`).border = this.getBordeFormal();
          worksheet.getCell(`A${currentRow}`).fill = rowFillStyle;

          // DESCRIPCIÓN (vacío para productos)
          worksheet.getCell(`C${currentRow}`).value = '';
          worksheet.getCell(`C${currentRow}`).border = this.getBordeFormal();
          worksheet.getCell(`C${currentRow}`).fill = rowFillStyle;

          // Columna vacía
          worksheet.getCell(`D${currentRow}`).value = '';
          worksheet.getCell(`D${currentRow}`).border = this.getBordeFormal();
          worksheet.getCell(`D${currentRow}`).fill = rowFillStyle;

          // MONTO AUTORIZADO (vacío para productos)
          worksheet.getCell(`E${currentRow}`).value = '';
          worksheet.getCell(`E${currentRow}`).border = this.getBordeFormal();
          worksheet.getCell(`E${currentRow}`).fill = rowFillStyle;

          // CANTIDAD
          const cellCantidad = worksheet.getCell(`F${currentRow}`);
          cellCantidad.value = producto.cantidad;
          cellCantidad.alignment = { horizontal: 'center', vertical: 'middle' };
          cellCantidad.border = this.getBordeFormal();
          cellCantidad.font = { name: 'Arial', size: 9 };
          cellCantidad.fill = rowFillStyle;

          // DESCRIPCIÓN DE PRODUCTOS
          const cellProducto = worksheet.getCell(`G${currentRow}`);
          cellProducto.value = producto.descripcion;
          cellProducto.border = this.getBordeFormal();
          cellProducto.alignment = { wrapText: true, vertical: 'middle' };
          cellProducto.font = { name: 'Arial', size: 9 };
          cellProducto.fill = rowFillStyle;

          // Columna vacía
          worksheet.getCell(`H${currentRow}`).value = '';
          worksheet.getCell(`H${currentRow}`).border = this.getBordeFormal();
          worksheet.getCell(`H${currentRow}`).fill = rowFillStyle;

          // PRECIO UNITARIO
          const cellPrecio = worksheet.getCell(`I${currentRow}`);
          cellPrecio.value = producto.precioUnitario;
          cellPrecio.numFmt = '"$"#,##0.00';
          cellPrecio.alignment = { horizontal: 'right', vertical: 'middle' };
          cellPrecio.border = this.getBordeFormal();
          cellPrecio.font = { name: 'Arial', size: 9 };
          cellPrecio.fill = rowFillStyle;

          // TOTAL
          const cellTotal = worksheet.getCell(`J${currentRow}`);
          cellTotal.value = producto.total;
          cellTotal.numFmt = '"$"#,##0.00';
          cellTotal.alignment = { horizontal: 'right', vertical: 'middle' };
          cellTotal.border = this.getBordeFormal();
          cellTotal.font = { name: 'Arial', size: 9 };
          cellTotal.fill = rowFillStyle;

          currentRow++;
        });

        // ========== SECCIÓN DE TOTALES ==========
        const subtotal = partida.productos.reduce((sum, prod) => sum + prod.total, 0);
        const iva = subtotal * 0.16;
        const total = subtotal + iva;

        // Línea separadora
        const separatorRow = currentRow;
        worksheet.mergeCells(`A${separatorRow}:J${separatorRow}`);
        worksheet.getCell(`A${separatorRow}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2F5496' }
        };
        worksheet.getCell(`A${separatorRow}`).border = {
          top: { style: 'medium', color: { argb: 'FF2F5496' } }
        };
        currentRow++;

        // Subtotal
        const subtotalRow = currentRow;
        this.agregarFilaTotalFormal(worksheet, subtotalRow, 
          '', '', '', '', 'SUBTOTAL:', '', '', subtotal);
        currentRow++;

        // IVA
        const ivaRow = currentRow;
        this.agregarFilaTotalFormal(worksheet, ivaRow, 
          '', '', '', 'MONTO AUTORIZADO:', `$${partida.montoAutorizado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, '', 'IVA 16%:', iva);
        currentRow++;

        // Total
        const totalRow = currentRow;
        this.agregarFilaTotalFormal(worksheet, totalRow, 
          '', '', '', '', '', '', 'TOTAL:', total, true);
        
        // ========== ✅ NUEVA SECCIÓN: SOBRANTE DEL PROYECTO ==========
        const sobranteStartRow = totalRow + 3;
        const sobrante = documento.montoAprobado - documento.total;
        const porcentajeUtilizado = (documento.total / documento.montoAprobado) * 100;
        const porcentajeSobrante = 100 - porcentajeUtilizado;

        // Título de la sección
        worksheet.mergeCells(`A${sobranteStartRow}:J${sobranteStartRow}`);
        worksheet.getCell(`A${sobranteStartRow}`).value = 'RESUMEN FINANCIERO - SOBRANTE DEL PROYECTO';
        worksheet.getCell(`A${sobranteStartRow}`).font = { bold: true, size: 12, name: 'Arial', color: { argb: 'FF2F5496' } };
        worksheet.getCell(`A${sobranteStartRow}`).alignment = { horizontal: 'center' };
        worksheet.getCell(`A${sobranteStartRow}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F0F0' }
        };

        // Monto Aprobado
        worksheet.mergeCells(`A${sobranteStartRow + 2}:H${sobranteStartRow + 2}`);
        worksheet.getCell(`A${sobranteStartRow + 2}`).value = 'MONTO APROBADO TOTAL:';
        worksheet.getCell(`A${sobranteStartRow + 2}`).font = { bold: true, name: 'Arial', size: 10 };
        worksheet.mergeCells(`I${sobranteStartRow + 2}:J${sobranteStartRow + 2}`);
        worksheet.getCell(`I${sobranteStartRow + 2}`).value = documento.montoAprobado;
        worksheet.getCell(`I${sobranteStartRow + 2}`).numFmt = '"$"#,##0.00';
        worksheet.getCell(`I${sobranteStartRow + 2}`).font = { name: 'Arial', size: 10 };

        // Total Utilizado
        worksheet.mergeCells(`A${sobranteStartRow + 3}:H${sobranteStartRow + 3}`);
        worksheet.getCell(`A${sobranteStartRow + 3}`).value = 'TOTAL UTILIZADO:';
        worksheet.getCell(`A${sobranteStartRow + 3}`).font = { bold: true, name: 'Arial', size: 10 };
        worksheet.mergeCells(`I${sobranteStartRow + 3}:J${sobranteStartRow + 3}`);
        worksheet.getCell(`I${sobranteStartRow + 3}`).value = documento.total;
        worksheet.getCell(`I${sobranteStartRow + 3}`).numFmt = '"$"#,##0.00';
        worksheet.getCell(`I${sobranteStartRow + 3}`).font = { name: 'Arial', size: 10 };

        // Porcentaje Utilizado
        worksheet.mergeCells(`A${sobranteStartRow + 4}:H${sobranteStartRow + 4}`);
        worksheet.getCell(`A${sobranteStartRow + 4}`).value = 'PORCENTAJE UTILIZADO:';
        worksheet.getCell(`A${sobranteStartRow + 4}`).font = { bold: true, name: 'Arial', size: 10 };
        worksheet.mergeCells(`I${sobranteStartRow + 4}:J${sobranteStartRow + 4}`);
        worksheet.getCell(`I${sobranteStartRow + 4}`).value = porcentajeUtilizado / 100;
        worksheet.getCell(`I${sobranteStartRow + 4}`).numFmt = '0.0%';
        worksheet.getCell(`I${sobranteStartRow + 4}`).font = { name: 'Arial', size: 10 };

        // ✅ SOBRANTE
        worksheet.mergeCells(`A${sobranteStartRow + 5}:H${sobranteStartRow + 5}`);
        const cellSobranteLabel = worksheet.getCell(`A${sobranteStartRow + 5}`);
        cellSobranteLabel.value = sobrante > 0 ? 'SOBRANTE DISPONIBLE:' : 
                                sobrante === 0 ? 'PRESUPUESTO COMPLETAMENTE UTILIZADO:' : 
                                'DÉFICIT / EXCEDENTE:';
        cellSobranteLabel.font = { bold: true, name: 'Arial', size: 11 };

        worksheet.mergeCells(`I${sobranteStartRow + 5}:J${sobranteStartRow + 5}`);
        const cellSobrante = worksheet.getCell(`I${sobranteStartRow + 5}`);
        cellSobrante.value = sobrante;
        cellSobrante.numFmt = sobrante >= 0 ? '"$"#,##0.00' : '"$"#,##0.00;[Red]-"$"#,##0.00';
        cellSobrante.font = { 
          bold: true, 
          name: 'Arial', 
          size: 11,
          color: { argb: sobrante > 0 ? 'FF008000' : sobrante === 0 ? 'FF2F5496' : 'FFFF0000' }
        };

        // Porcentaje Sobrante (solo si hay sobrante positivo)
        if (sobrante > 0) {
          worksheet.mergeCells(`A${sobranteStartRow + 6}:J${sobranteStartRow + 6}`);
          worksheet.getCell(`A${sobranteStartRow + 6}`).value = `(${porcentajeSobrante.toFixed(1)}% del presupuesto disponible - Saldo a favor)`;
          worksheet.getCell(`A${sobranteStartRow + 6}`).font = { 
            italic: true, 
            name: 'Arial', 
            size: 9,
            color: { argb: 'FF008000' }
          };
          worksheet.getCell(`A${sobranteStartRow + 6}`).alignment = { horizontal: 'center' };
        }

        // Línea final
        const finalSeparatorRow = sobranteStartRow + 8;
        worksheet.mergeCells(`A${finalSeparatorRow}:J${finalSeparatorRow}`);
        worksheet.getCell(`A${finalSeparatorRow}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2F5496' }
        };
        worksheet.getCell(`A${finalSeparatorRow}`).border = {
          top: { style: 'medium', color: { argb: 'FF2F5496' } }
        };

        // ========== SECCIÓN DE FIRMAS ==========
        const firmaStartRow = finalSeparatorRow + 3;
        
        // Firma del líder de proyecto (izquierda)
        worksheet.mergeCells(`A${firmaStartRow}:E${firmaStartRow}`);
        const cellFirmaDocente = worksheet.getCell(`A${firmaStartRow}`);
        cellFirmaDocente.value = documento.docenteNombre.toUpperCase();
        cellFirmaDocente.font = { bold: true, name: 'Arial', size: 11 };
        cellFirmaDocente.alignment = { horizontal: 'center' };

        // Firma del subdirector (derecha)
        worksheet.mergeCells(`F${firmaStartRow}:J${firmaStartRow}`);
        const cellFirmaSubdirector = worksheet.getCell(`F${firmaStartRow}`);
        cellFirmaSubdirector.value = 'SUBDIRECTOR ACADÉMICO DEL ITESCAM';
        cellFirmaSubdirector.font = { bold: true, name: 'Arial', size: 11 };
        cellFirmaSubdirector.alignment = { horizontal: 'center' };

        // Líneas de firma
        const lineaFirmaRow = firmaStartRow + 1;
        worksheet.mergeCells(`A${lineaFirmaRow}:E${lineaFirmaRow}`);
        worksheet.getCell(`A${lineaFirmaRow}`).value = '_________________________';
        worksheet.getCell(`A${lineaFirmaRow}`).alignment = { horizontal: 'center' };
        
        worksheet.mergeCells(`F${lineaFirmaRow}:J${lineaFirmaRow}`);
        worksheet.getCell(`F${lineaFirmaRow}`).value = '_________________________';
        worksheet.getCell(`F${lineaFirmaRow}`).alignment = { horizontal: 'center' };

        // Cargos
        const cargoRow = lineaFirmaRow + 1;
        worksheet.mergeCells(`A${cargoRow}:E${cargoRow}`);
        worksheet.getCell(`A${cargoRow}`).value = 'LÍDER DEL PROYECTO';
        worksheet.getCell(`A${cargoRow}`).font = { name: 'Arial', size: 10 };
        worksheet.getCell(`A${cargoRow}`).alignment = { horizontal: 'center' };
        
        worksheet.mergeCells(`F${cargoRow}:J${cargoRow}`);
        worksheet.getCell(`F${cargoRow}`).value = 'SUBDIRECTOR ACADÉMICO';
        worksheet.getCell(`F${cargoRow}`).font = { name: 'Arial', size: 10 };
        worksheet.getCell(`F${cargoRow}`).alignment = { horizontal: 'center' };

        // ========== PIE DE PÁGINA ==========
        const piePaginaRow = cargoRow + 3;
        worksheet.mergeCells(`A${piePaginaRow}:J${piePaginaRow}`);
        worksheet.getCell(`A${piePaginaRow}`).value = 'Documento generado electrónicamente por el Sistema de Gestión de Proyectos del ITESCAM';
        worksheet.getCell(`A${piePaginaRow}`).font = { 
          italic: true, 
          name: 'Arial', 
          size: 8,
          color: { argb: 'FF666666' }
        };
        worksheet.getCell(`A${piePaginaRow}`).alignment = { horizontal: 'center' };

        // ========== AJUSTAR ANCHOS DE COLUMNAS ==========
        worksheet.getColumn(1).width = 8;  // A
        worksheet.getColumn(2).width = 8;  // B
        worksheet.getColumn(3).width = 45; // C: DESCRIPCIÓN
        worksheet.getColumn(4).width = 2;  // D: Vacía
        worksheet.getColumn(5).width = 15; // E: MONTO AUTORIZADO
        worksheet.getColumn(6).width = 10; // F: CANTIDAD
        worksheet.getColumn(7).width = 45; // G: DESCRIPCIÓN DE PRODUCTOS
        worksheet.getColumn(8).width = 2;  // H: Vacía
        worksheet.getColumn(9).width = 15; // I: PRECIO UNITARIO
        worksheet.getColumn(10).width = 15; // J: TOTAL
      }

      // Si no hay partidas, crear hoja informativa
      if (documento.partidas.length === 0) {
        const emptyWorksheet = workbook.addWorksheet('INFORMACIÓN GENERAL');
        emptyWorksheet.mergeCells('A1:J1');
        emptyWorksheet.getCell('A1').value = 'INSTITUTO TECNOLÓGICO SUPERIOR DE CALKINÍ EN EL ESTADO DE CAMPECHE';
        emptyWorksheet.getCell('A1').font = { bold: true, size: 14, name: 'Arial' };
        emptyWorksheet.getCell('A1').alignment = { horizontal: 'center' };
        
        emptyWorksheet.mergeCells('A2:J2');
        emptyWorksheet.getCell('A2').value = 'PROYECTO SIN PARTIDAS REGISTRADAS';
        emptyWorksheet.getCell('A2').font = { bold: true, size: 16, name: 'Arial' };
        emptyWorksheet.getCell('A2').alignment = { horizontal: 'center' };
        
        emptyWorksheet.mergeCells('A4:J4');
        emptyWorksheet.getCell('A4').value = 'El proyecto no cuenta con partidas presupuestales registradas.';
        emptyWorksheet.getCell('A4').font = { name: 'Arial', size: 12 };
        emptyWorksheet.getCell('A4').alignment = { horizontal: 'center' };
        
        emptyWorksheet.mergeCells('A5:J5');
        emptyWorksheet.getCell('A5').value = 'El documento se generará automáticamente cuando se creen cotizaciones para las partidas.';
        emptyWorksheet.getCell('A5').font = { name: 'Arial', size: 10, italic: true };
        emptyWorksheet.getCell('A5').alignment = { horizontal: 'center' };
      }

      // ========== GUARDAR ARCHIVO ==========
      const buffer = await workbook.xlsx.writeBuffer();
      this.descargarArchivo(buffer, `DOCUMENTO-FINAL-${documento.claveProyecto}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      alert('📋 Documento final exportado exitosamente en formato Excel con diseño formal');
    } catch (error) {
      console.error('Error al generar Excel:', error);
      throw error;
    }
  }

  // ✅ MÉTODO AUXILIAR: Agregar fila de totales con estilo formal
  private agregarFilaTotalFormal(worksheet: any, rowNumber: number, 
    a: string, b: string, c: string, d: string, e: string, f: string, g: string, h: number | string, 
    isTotal: boolean = false): void {
    
    const values = [a, b, c, d, e, f, g, h];
    const totalFillStyle = {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: isTotal ? 'FFE7E6E6' : 'FFFFFFFF' }
    };
    
    const totalFontStyle = { 
      name: 'Arial', 
      size: isTotal ? 11 : 10,
      bold: isTotal
    };
    
    // Columnas A-H
    for (let i = 0; i < 7; i++) {
      const cell = worksheet.getCell(rowNumber, i + 1);
      cell.value = values[i];
      cell.border = this.getBordeFormal();
      cell.fill = totalFillStyle;
      cell.font = totalFontStyle;
      
      if (i === 5 && values[i] !== '') { // Columna F para "Monto autorizado"
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
      if (i === 6 && values[i] !== '') { // Columna G para "Iva 16%" y "Total"
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
    }
    
    // Columnas I-J (PRECIO UNITARIO y TOTAL)
    for (let i = 7; i < 9; i++) {
      const col = i + 1;
      const cell = worksheet.getCell(rowNumber, col);
      
      if (i === 7) { // Columna I (PRECIO UNITARIO)
        cell.value = values[i];
        cell.border = this.getBordeFormal();
        cell.fill = totalFillStyle;
        cell.font = totalFontStyle;
        if (values[i] !== '') {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
      } else { // Columna J (TOTAL)
        if (typeof h === 'number') {
          cell.value = h;
          cell.numFmt = '"$"#,##0.00';
        } else {
          cell.value = h;
        }
        cell.border = this.getBordeFormal();
        cell.fill = totalFillStyle;
        cell.font = totalFontStyle;
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
    }
  }

  // ✅ MÉTODO AUXILIAR: Obtener borde formal
  private getBordeFormal(): any {
    return {
      top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
      left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
      bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
      right: { style: 'thin', color: { argb: 'FFBFBFBF' } }
    };
  }

  // ✅ MÉTODO AUXILIAR PARA DESCARGAR ARCHIVOS
  private descargarArchivo(data: any, filename: string, type: string): void {
    const blob = new Blob([data], { type });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // ✅ GENERAR EXCEL CON MÚLTIPLES DOCUMENTOS CON TABLAS ESTRUCTURADAS
  generarExcelMultiplesDocumentos(documentos: DocumentoFinal[]): void {
    if (documentos.length === 0) {
      alert('No hay documentos para exportar');
      return;
    }

    const workbook = new ExcelJS.Workbook();

    // Hoja resumen
    const resumenWorksheet = workbook.addWorksheet('Resumen General');
    
    // Datos del resumen
    resumenWorksheet.addRow(['RESUMEN GENERAL DE DOCUMENTOS FINALES']);
    resumenWorksheet.addRow(['Fecha de generación:', new Date().toLocaleDateString('es-MX')]);
    resumenWorksheet.addRow([]);
    resumenWorksheet.addRow(['Proyecto', 'Clave', 'Docente', 'Tipo Fondo', 'Monto Aprobado', 'Total', 'Partidas']);

    documentos.forEach(documento => {
      resumenWorksheet.addRow([
        documento.nombreProyecto,
        documento.claveProyecto,
        documento.docenteNombre,
        documento.tipoFondo,
        documento.montoAprobado,
        documento.total,
        documento.partidas.length
      ]);
    });

    const totalMonto = documentos.reduce((sum, doc) => sum + doc.montoAprobado, 0);
    const totalGeneral = documentos.reduce((sum, doc) => sum + doc.total, 0);
    
    resumenWorksheet.addRow([]);
    resumenWorksheet.addRow([
      'TOTALES GENERALES', 
      '', 
      '', 
      '', 
      totalMonto,
      totalGeneral,
      ''
    ]);

    // Aplicar estilos al resumen
    resumenWorksheet.getColumn(1).width = 30;
    resumenWorksheet.getColumn(2).width = 15;
    resumenWorksheet.getColumn(3).width = 25;
    resumenWorksheet.getColumn(4).width = 12;
    resumenWorksheet.getColumn(5).width = 15;
    resumenWorksheet.getColumn(6).width = 15;
    resumenWorksheet.getColumn(7).width = 10;

    // Hojas individuales para cada documento
    documentos.forEach((documento, docIndex) => {
      documento.partidas.forEach((partida, partidaIndex) => {
        const worksheet = workbook.addWorksheet(`${partida.partidaCodigo}-${docIndex + 1}`.substring(0, 31));

        // ========== CONFIGURACIÓN INICIAL ==========
        worksheet.properties.defaultRowHeight = 25;

        // ========== ENCABEZADO DEL DOCUMENTO (FUERA DE TABLA) ==========
        worksheet.mergeCells('A1:J1');
        worksheet.getCell('A1').value = 'DOCUMENTO FINAL - PROYECTO APROBADO';
        worksheet.getCell('A1').font = { bold: true, size: 16, name: 'Arial' };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };

        // Información del proyecto (fuera de tabla)
        this.agregarFilaInformacion(worksheet, 2, 'TIPO DE CONVOCATORIA:', documento.tipoConvocatoria);
        this.agregarFilaInformacion(worksheet, 3, 'NOMBRE DEL PROYECTO:', documento.nombreProyecto);
        this.agregarFilaInformacion(worksheet, 4, 'CLAVE DE PROYECTO:', documento.claveProyecto);
        this.agregarFilaInformacion(worksheet, 5, 'VIGENCIA DEL PROYECTO:', documento.vigenciaProyecto);
        this.agregarFilaInformacion(worksheet, 6, 'TIPO DE FONDO:', documento.tipoFondo);

        // Espacio
        worksheet.getRow(7).height = 10;

        // ========== TABLA PRINCIPAL ==========
        const startRow = 8;

        // Encabezados de la tabla principal
        const headers = ['No. DE PARTIDA', 'DESCRIPCION', '', 'MONTO AUTORIZADO', 'CANTIDAD', 'DESCRIPCION DE PRODUCTOS', '', 'PRECIO UNITARIO', 'TOTAL'];
        
        // Aplicar estilo a los encabezados
        headers.forEach((header, colIndex) => {
          const cell = worksheet.getCell(startRow, colIndex + 1);
          cell.value = header;
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF366092' }
          };
          cell.border = this.getBordeCompleto();
        });

        // Fila de partida (primera fila de datos)
        const partidaRow = startRow + 1;
        
        // No. DE PARTIDA
        worksheet.mergeCells(`A${partidaRow}:B${partidaRow}`);
        worksheet.getCell(`A${partidaRow}`).value = partida.partidaCodigo;
        worksheet.getCell(`A${partidaRow}`).font = { bold: true };
        worksheet.getCell(`A${partidaRow}`).border = this.getBordeCompleto();

        // DESCRIPCION
        worksheet.getCell(`C${partidaRow}`).value = partida.partidaDescripcion;
        worksheet.getCell(`C${partidaRow}`).border = this.getBordeCompleto();
        worksheet.getCell(`C${partidaRow}`).alignment = { wrapText: true, vertical: 'top' };

        // Columna vacía
        worksheet.getCell(`D${partidaRow}`).value = '';
        worksheet.getCell(`D${partidaRow}`).border = this.getBordeCompleto();

        // MONTO AUTORIZADO
        worksheet.getCell(`E${partidaRow}`).value = partida.montoAutorizado;
        worksheet.getCell(`E${partidaRow}`).numFmt = '"$"#,##0.00';
        worksheet.getCell(`E${partidaRow}`).font = { bold: true };
        worksheet.getCell(`E${partidaRow}`).border = this.getBordeCompleto();

        // CANTIDAD (vacía en fila de partida)
        worksheet.getCell(`F${partidaRow}`).value = '';
        worksheet.getCell(`F${partidaRow}`).border = this.getBordeCompleto();

        // DESCRIPCION DE PRODUCTOS (vacía en fila de partida)
        worksheet.getCell(`G${partidaRow}`).value = '';
        worksheet.getCell(`G${partidaRow}`).border = this.getBordeCompleto();

        // Columna vacía
        worksheet.getCell(`H${partidaRow}`).value = '';
        worksheet.getCell(`H${partidaRow}`).border = this.getBordeCompleto();

        // PRECIO UNITARIO (vacío en fila de partida)
        worksheet.getCell(`I${partidaRow}`).value = '';
        worksheet.getCell(`I${partidaRow}`).border = this.getBordeCompleto();

        // TOTAL (vacío en fila de partida)
        worksheet.getCell(`J${partidaRow}`).value = '';
        worksheet.getCell(`J${partidaRow}`).border = this.getBordeCompleto();

        // ========== PRODUCTOS ==========
        let currentRow = partidaRow + 1;
        partida.productos.forEach((producto, index) => {
          // No. DE PARTIDA (vacío para productos)
          worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
          worksheet.getCell(`A${currentRow}`).value = '';
          worksheet.getCell(`A${currentRow}`).border = this.getBordeCompleto();

          // DESCRIPCION (vacío para productos)
          worksheet.getCell(`C${currentRow}`).value = '';
          worksheet.getCell(`C${currentRow}`).border = this.getBordeCompleto();

          // Columna vacía
          worksheet.getCell(`D${currentRow}`).value = '';
          worksheet.getCell(`D${currentRow}`).border = this.getBordeCompleto();

          // MONTO AUTORIZADO (vacío para productos)
          worksheet.getCell(`E${currentRow}`).value = '';
          worksheet.getCell(`E${currentRow}`).border = this.getBordeCompleto();

          // CANTIDAD
          worksheet.getCell(`F${currentRow}`).value = producto.cantidad;
          worksheet.getCell(`F${currentRow}`).alignment = { horizontal: 'center' };
          worksheet.getCell(`F${currentRow}`).border = this.getBordeCompleto();

          // DESCRIPCION DE PRODUCTOS
          worksheet.getCell(`G${currentRow}`).value = producto.descripcion;
          worksheet.getCell(`G${currentRow}`).border = this.getBordeCompleto();
          worksheet.getCell(`G${currentRow}`).alignment = { wrapText: true };

          // Columna vacía
          worksheet.getCell(`H${currentRow}`).value = '';
          worksheet.getCell(`H${currentRow}`).border = this.getBordeCompleto();

          // PRECIO UNITARIO
          worksheet.getCell(`I${currentRow}`).value = producto.precioUnitario;
          worksheet.getCell(`I${currentRow}`).numFmt = '"$"#,##0.00';
          worksheet.getCell(`I${currentRow}`).border = this.getBordeCompleto();

          // TOTAL
          worksheet.getCell(`J${currentRow}`).value = producto.total;
          worksheet.getCell(`J${currentRow}`).numFmt = '"$"#,##0.00';
          worksheet.getCell(`J${currentRow}`).border = this.getBordeCompleto();

          currentRow++;
        });

        // ========== FILA VACÍA ==========
        const emptyRow = currentRow;
        ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].forEach(col => {
          worksheet.getCell(`${col}${emptyRow}`).value = '';
          worksheet.getCell(`${col}${emptyRow}`).border = this.getBordeCompleto();
        });
        currentRow++;

        // ========== TOTALES ==========
        const subtotal = partida.productos.reduce((sum, prod) => sum + prod.total, 0);
        const iva = subtotal * 0.16;
        const total = subtotal + iva;

        // Subtotal
        const subtotalRow = currentRow;
        this.agregarFilaTotal(worksheet, subtotalRow, '', '', '', '', 'Subtotal', '', '', subtotal);
        currentRow++;

        // Monto total aprobado e IVA
        const ivaRow = currentRow;
        this.agregarFilaTotal(worksheet, ivaRow, '', '', '', 'Monto total aprobado', `$${partida.montoAutorizado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, '', 'Iva 16%', iva);
        currentRow++;

        // Total
        const totalRow = currentRow;
        this.agregarFilaTotal(worksheet, totalRow, '', '', '', '', '', '', 'Total', total);
        
        // Aplicar estilo especial a la fila de total
        worksheet.getCell(`J${totalRow}`).font = { bold: true, size: 12 };
        worksheet.getCell(`I${totalRow}`).font = { bold: true, size: 12 };

        // ========== FIRMAS (FUERA DE LA TABLA) ==========
        const firmaStartRow = totalRow + 4; // Espacio después de la tabla
        
        // Firma del líder de proyecto (izquierda)
        worksheet.mergeCells(`A${firmaStartRow}:E${firmaStartRow}`);
        worksheet.getCell(`A${firmaStartRow}`).value = documento.docenteNombre;
        worksheet.getCell(`A${firmaStartRow}`).font = { bold: true };
        worksheet.getCell(`A${firmaStartRow}`).alignment = { horizontal: 'left' };

        // Firma del subdirector (derecha)
        worksheet.mergeCells(`F${firmaStartRow}:J${firmaStartRow}`);
        worksheet.getCell(`F${firmaStartRow}`).value = 'SUBDIRECTOR ACADEMICO DEL ITESCAM';
        worksheet.getCell(`F${firmaStartRow}`).font = { bold: true };
        worksheet.getCell(`F${firmaStartRow}`).alignment = { horizontal: 'right' };

        // Cargo del líder de proyecto (izquierda)
        const cargoRow = firmaStartRow + 1;
        worksheet.mergeCells(`A${cargoRow}:E${cargoRow}`);
        worksheet.getCell(`A${cargoRow}`).value = 'LÍDER DE PROYECTO';
        worksheet.getCell(`A${cargoRow}`).alignment = { horizontal: 'left' };

        // ========== AJUSTAR ANCHOS DE COLUMNAS ==========
        worksheet.getColumn(1).width = 8;  // A
        worksheet.getColumn(2).width = 8;  // B
        worksheet.getColumn(3).width = 40; // C: DESCRIPCION
        worksheet.getColumn(4).width = 3;  // D: Vacía
        worksheet.getColumn(5).width = 15; // E: MONTO AUTORIZADO
        worksheet.getColumn(6).width = 10; // F: CANTIDAD
        worksheet.getColumn(7).width = 40; // G: DESCRIPCION DE PRODUCTOS
        worksheet.getColumn(8).width = 3;  // H: Vacía
        worksheet.getColumn(9).width = 15; // I: PRECIO UNITARIO
        worksheet.getColumn(10).width = 15; // J: TOTAL
      });
    });

    // Guardar el archivo
    workbook.xlsx.writeBuffer().then(buffer => {
      this.descargarArchivo(buffer, `documentos-finales-${new Date().toISOString().split('T')[0]}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      alert(`📊 ${documentos.length} documentos finales exportados exitosamente en formato Excel oficial`);
    });
  }

  // ✅ MÉTODO AUXILIAR: Agregar fila de información (fuera de tabla)
  private agregarFilaInformacion(worksheet: any, rowNumber: number, label: string, value: string): void {
    worksheet.mergeCells(`A${rowNumber}:C${rowNumber}`);
    worksheet.getCell(`A${rowNumber}`).value = label;
    worksheet.getCell(`A${rowNumber}`).font = { bold: true };
    
    worksheet.mergeCells(`D${rowNumber}:J${rowNumber}`);
    worksheet.getCell(`D${rowNumber}`).value = value;
  }

  // ✅ MÉTODO AUXILIAR: Agregar fila de totales (dentro de tabla)
  private agregarFilaTotal(worksheet: any, rowNumber: number, 
    a: string, b: string, c: string, d: string, e: string, f: string, g: string, h: number | string): void {
    
    const values = [a, b, c, d, e, f, g, h];
    
    // Columnas A-H
    for (let i = 0; i < 7; i++) {
      const cell = worksheet.getCell(rowNumber, i + 1);
      cell.value = values[i];
      cell.border = this.getBordeCompleto();
      if (i === 5 && values[i] !== '') { // Columna F para "Monto total aprobado"
        cell.alignment = { horizontal: 'right' };
      }
      if (i === 6 && values[i] !== '') { // Columna G para "Iva 16%" y "Total"
        cell.alignment = { horizontal: 'right' };
        cell.font = { bold: true };
      }
    }
    
    // Columnas I-J (PRECIO UNITARIO y TOTAL)
    for (let i = 7; i < 9; i++) {
      const col = i + 1;
      const cell = worksheet.getCell(rowNumber, col);
      
      if (i === 7) { // Columna I (PRECIO UNITARIO)
        cell.value = values[i];
        cell.border = this.getBordeCompleto();
        if (values[i] !== '') {
          cell.alignment = { horizontal: 'right' };
          cell.font = { bold: true };
        }
      } else { // Columna J (TOTAL)
        if (typeof h === 'number') {
          cell.value = h;
          cell.numFmt = '"$"#,##0.00';
        } else {
          cell.value = h;
        }
        cell.border = this.getBordeCompleto();
        cell.font = { bold: true };
      }
    }
  }

  // ✅ MÉTODO AUXILIAR: Obtener borde completo
  private getBordeCompleto(): any {
    return {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  }
}