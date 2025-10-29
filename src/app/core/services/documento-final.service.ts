// src/app/core/services/documento-final.service.ts
import { Injectable } from '@angular/core';
import { Observable, map, forkJoin, switchMap, of } from 'rxjs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { utils, write } from 'xlsx';
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
    '21401': 'Materiales, útiles y equipos menores de tecnologías de la información y comunicaciones. Asignaciones destinadas a la adquisición insumos y equipos menores utilizados en el procesamiento, grabación e impresión de datos, como son: USB, CD, DVD, blu-ray, entre otros, así como los materiales para la limpieza y protección de los equipos, tales como: medios ópticos y magnéticos, adaptadores para equipo de cómputo, administradores de cables, apuntadores, cables para transmisión de datos, protectores de vídeo, fundas, solventes, cartuchos de tinta, cintas y tóner para impresoras, así como recargas de cartuchos y tóner para impresora, entre otros.',
    '23101': 'Productos alimenticios, agropecuarios y forestales adquiridos como materia prima. Asignaciones destinadas a la adquisición de productos alimenticios como materias primas en estado natural, transformadas o semi-transformadas, de naturaleza vegetal y animal que se utilizan en los procesos productivos, diferentes a las contenidas en las demás partidas de este Clasificador.',
    '23701': 'Productos de cuero, piel, plástico y hule adquiridos como materia prima. Asignaciones destinadas a la adquisición de cuero, piel, plástico y hule como materias primas en estado natural, transformadas o semi-transformadas, que se utilizan en los procesos productivos, diferentes a las contenidas en las demás partidas de este Clasificador.',
    '24601': 'Material eléctrico y electrónico. Asignaciones destinadas a la adquisición de todo tipo de material eléctrico y electrónico, tales como: cables, interruptores, tubos fluorescentes, focos, aislantes, electrodos, transistores, alambres, lámpara, baterías o pilas, entre otros, que requieran las líneas de transmisión telegráfica, telefónica y de telecomunicaciones, sean aéreas, subterráneas o submarinas; igualmente para la adquisición de materiales necesarios en las instalaciones radiofónicas, radiotelegráficas, entre otras.',
    '25101': 'Productos químicos básicos. Asignaciones destinadas a la adquisición de productos químicos básicos: petroquímicos como benceno, tolueno, xileno, etileno, propileno, estireno a partir del gas natural, del gas licuado del petróleo y de destilados y otras fracciones posteriores a la refinación del petróleo; reactivos, fluoruros, fosfatos, nitratos, óxidos, alquinos, marcadores genéticos, entre otros.',
    '25201': 'Fertilizantes, pesticidas y otros agroquímicos. Asignaciones destinadas a la adquisición de este tipo de productos cuyo estado de fabricación se encuentre terminado, tales como: fertilizantes complejos e inorgánicos, fertilizantes nitrogenados, fosfatados, biológicos procesados o de otro tipo, mezclas, fungicidas, herbicidas, plaguicidas, raticidas, antigerminantes, reguladores del crecimiento de las plantas y nutrientes de suelos, entre otros. Incluye los abonos que se comercializan en estado natural.',
    '25501': 'Materiales, accesorios y suministros de laboratorio. Asignaciones destinadas a la adquisición de toda clase de materiales y suministros utilizados en los laboratorios médicos, químicos, de investigación, fotográficos, cinematográficos, audio-visión, entre otros, tales como: cilindros graduados, matraces, probetas, mecheros, campanas de cultivo, cápsulas de porcelana, embudos de vidrio o de polietileno, tubos de cultivo, vidrio de cobalto, tanques de revelado, materiales para radiografía, electrocardiografía, medicina nuclear; artículos para el revelado e impresión de fotografías. Esta partida incluye animales para experimentación.',
    '29101': 'Herramientas menores. Asignaciones destinadas a la adquisición de herramientas auxiliares de trabajo, utilizadas en carpintería, silvicultura, horticultura, ganadería, agricultura y otras industrias, tales como: desarmadores, martillos, llaves para tuercas, carretillas de mano, cuchillos, navajas, tijeras de mano, sierras de mano, alicates, hojas para seguetas, micrómetros, cintas métricas, pinzas, prensas, berbiquíes, garlopas, taladros, zapapicos, escaleras, detectores de metales manuales y demás bienes de consumo similares.',
    '29401': 'Refacciones y accesorios menores para equipo de cómputo y telecomunicaciones. Asignaciones destinadas a la adquisición de componentes y dispositivos internos o externos que se integran al equipo de cómputo y/o telecomunicaciones, con el objeto de conservar o recuperar su funcionalidad y que son de difícil control de inventarios, tales como: tarjetas electrónicas, unidades de discos internos (Duros, CD, DVD y Blueray), batería para laptop, puertos USB, puertos HDMI, circuitos, bocinas, pantallas, ratones, teclados, cámaras, entre otros.',
    '33601': 'Servicios de apoyo administrativo, traducción, fotocopiado e impresión. Asignaciones destinadas a cubrir el costo de la contratación de servicios de fotocopiado y preparación de documentos; digitalización de documentos oficiales, fax, engargolado, enmicado, encuadernación, corte de papel, recepción de correspondencia y otros afines. Incluye servicios de apoyo secretarial, servicios de estenografía en los tribunales, transcripción simultánea de diálogos para la televisión, reuniones y conferencias; servicios comerciales no previstos en las demás partidas anteriores. Incluye servicios de impresión de documentos oficiales necesarios tales como: pasaportes, certificados especiales, títulos de crédito, formas fiscales y formas valoradas, y demás documentos para la identificación, trámites oficiales y servicios a la población; servicios de impresión y elaboración de material informativo, tales como: padrones de beneficiarios, reglas de operación, programas sectoriales, regionales, especiales; informes de labores, manuales de organización, de procedimientos y de servicios al público; decretos, convenios, acuerdos, instructivos, proyectos editoriales (libros, revistas y gacetas periódicas), folletos, trípticos, dípticos, carteles, mantas, rótulos, y demás servicios de impresión y elaboración de material informativo. Incluye gastos como: avisos, precisiones, convocatorias, edictos, bases, licitaciones, concursos y aclaraciones, y demás información en medios masivos. Excluye las inserciones derivadas de campañas publicitarias y de comunicación social, las cuales se deberán registrar en las partidas correspondientes al concepto 3600 Servicios de Comunicación Social y Publicidad.',
    '35301': 'Instalación, reparación y mantenimiento de equipo de cómputo y tecnologías de la información. Asignaciones destinadas a cubrir los gastos por servicios que se contraten con terceros para la instalación, reparación y mantenimiento de equipos de cómputo y tecnologías de la información, tales como: computadoras, impresoras, dispositivos de seguridad, reguladores, fuentes de potencia ininterrumpida, servidores de información, drones, entre otros, así como el mantenimiento en general. Incluye el pago de deducibles de seguros.'
  };

  constructor(
    private proyectosService: ProyectosService,
    private partidasService: PartidasService,
    private articulosService: ArticulosService,
    private cotizacionesService: CotizacionesService,
    private authService: AuthService
  ) {}

  // ✅ NUEVO MÉTODO: Obtener documento final desde cotizaciones reales
  getDocumentoFinalDesdeCotizaciones(proyectoId: string): Observable<DocumentoFinal> {
    return this.cotizacionesService.getCotizacionesByProyecto(proyectoId).pipe(
      switchMap(cotizacionesResponse => {
        if (!cotizacionesResponse.success || !cotizacionesResponse.data || cotizacionesResponse.data.length === 0) {
          // Si no hay cotizaciones, retornar documento vacío
          return this.proyectosService.getProyectoById(proyectoId).pipe(
            map(proyectoResponse => {
              if (proyectoResponse.success && proyectoResponse.data) {
                return this.crearDocumentoVacio(proyectoResponse.data);
              }
              throw new Error('Proyecto no encontrado');
            })
          );
        }

        const cotizaciones = cotizacionesResponse.data;
        
        // Obtener el proyecto para información adicional
        return this.proyectosService.getProyectoById(proyectoId).pipe(
          map(proyectoResponse => {
            if (!proyectoResponse.success || !proyectoResponse.data) {
              throw new Error('Proyecto no encontrado');
            }

            const proyecto = proyectoResponse.data;
            return this.crearDocumentoDesdeCotizaciones(proyecto, cotizaciones);
          })
        );
      })
    );
  }

  // ✅ NUEVO MÉTODO: Crear documento final desde cotizaciones reales
  private crearDocumentoDesdeCotizaciones(proyecto: any, cotizaciones: any[]): DocumentoFinal {
    // Agrupar cotizaciones por partida
    const partidasMap = new Map<string, PartidaDocumento>();
    
   // ✅ CORREGIDO: Verificar que cotizaciones existe
  if (cotizaciones && cotizaciones.length > 0) {
    cotizaciones.forEach(cotizacion => {
      const partidaCodigo = cotizacion.partidaCodigo;
      
      if (!partidasMap.has(partidaCodigo)) {
        partidasMap.set(partidaCodigo, {
          partidaCodigo: partidaCodigo,
          partidaNombre: cotizacion.nombrePartida || this.getNombrePartida(partidaCodigo),
          partidaDescripcion: this.descripcionesPartidas[partidaCodigo] || `Partida presupuestal ${partidaCodigo}`,
          montoAutorizado: cotizacion.saldoPartida || 0,
          productos: [],
          subtotal: 0,
          iva: 0,
          total: 0
        });
      }
      
      const partida = partidasMap.get(partidaCodigo)!;
      
      // ✅ CORREGIDO: Verificar que items existe
      if (cotizacion.items && cotizacion.items.length > 0) {
        // Agregar items de la cotización como productos
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

    // Calcular totales por partida
    const partidas = Array.from(partidasMap.values()).map(partida => {
      partida.iva = partida.subtotal * 0.16;
      partida.total = partida.subtotal + partida.iva;
      return partida;
    });

    // Calcular totales generales
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

  // ✅ NUEVO MÉTODO: Crear documento vacío (cuando no hay cotizaciones)
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

  // ✅ MODIFICAR: getDocumentosFinalesAdmin para usar datos reales
  getDocumentosFinalesAdmin(): Observable<DocumentoFinal[]> {
    return this.proyectosService.getProyectosPorEstado('APROBADO').pipe(
      switchMap(proyectosResponse => {
        if (!proyectosResponse.success || !proyectosResponse.data) {
          return of([]);
        }

        const proyectos = proyectosResponse.data;
        
        // Para cada proyecto, obtener su documento final desde cotizaciones
        const documentos$ = proyectos.map(proyecto => 
          this.getDocumentoFinalDesdeCotizaciones(proyecto.id)
        );

        return forkJoin(documentos$);
      })
    );
  }

  // ✅ MODIFICAR: getDocumentoFinalDocente para usar datos reales
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
        
        // Para cada proyecto aprobado, obtener su documento final
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
              proyectos: documentos, // Ahora son documentos finales completos
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

  // ✅ GENERAR DOCUMENTO FINAL EN PDF (Método existente mejorado)
  generarPDFDocumentoFinal(documento: DocumentoFinal): void {
    const doc = new jsPDF();
    
    // Configuración inicial
    doc.setFont('helvetica');
    doc.setFontSize(10);

    let yPosition = 20;

    // Encabezado
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TIPO DE CONVOCATORIA:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(documento.tipoConvocatoria, 70, yPosition);
    yPosition += 10;

    doc.setFont('helvetica', 'bold');
    doc.text('NOMBRE DEL PROYECTO:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(documento.nombreProyecto, 70, yPosition);
    yPosition += 10;

    doc.setFont('helvetica', 'bold');
    doc.text('CLAVE DE PROYECTO:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(documento.claveProyecto, 70, yPosition);
    yPosition += 10;

    doc.setFont('helvetica', 'bold');
    doc.text('VIGENCIA DEL PROYECTO:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(documento.vigenciaProyecto, 70, yPosition);
    yPosition += 10;

    doc.setFont('helvetica', 'bold');
    doc.text('TIPO DE FONDO:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(documento.tipoFondo, 70, yPosition);
    yPosition += 15;

    // Tabla de partidas
    documento.partidas.forEach((partida, index) => {
      if (index > 0) {
        doc.addPage();
        yPosition = 20;
      }

      // Información de la partida
      doc.setFont('helvetica', 'bold');
      doc.text(`PARTIDA: ${partida.partidaCodigo} - ${partida.partidaNombre}`, 20, yPosition);
      yPosition += 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const descripcionLines = doc.splitTextToSize(partida.partidaDescripcion, 170);
      doc.text(descripcionLines, 20, yPosition);
      yPosition += (descripcionLines.length * 3) + 10;

      // Tabla de productos
      const tableData = partida.productos.map(producto => [
        producto.cantidad.toString(),
        producto.descripcion,
        `$${producto.precioUnitario.toFixed(2)}`,
        `$${producto.total.toFixed(2)}`
      ]);

      // Agregar subtotal, IVA y total
      tableData.push(['', 'Subtotal', '', `$${partida.subtotal.toFixed(2)}`]);
      tableData.push(['', 'IVA 16%', '', `$${partida.iva.toFixed(2)}`]);
      tableData.push(['', 'TOTAL', '', `$${partida.total.toFixed(2)}`]);

      (doc as any).autoTable({
        startY: yPosition,
        head: [['CANTIDAD', 'DESCRIPCIÓN DE PRODUCTOS', 'PRECIO UNITARIO', 'TOTAL']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [58, 83, 155],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8
        },
        styles: {
          fontSize: 7,
          cellPadding: 2
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 90 },
          2: { cellWidth: 30 },
          3: { cellWidth: 30 }
        }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    });

    // Totales generales
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTALES GENERALES:', 20, yPosition + 10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Subtotal: $${documento.subtotal.toFixed(2)}`, 20, yPosition + 17);
    doc.text(`IVA (16%): $${documento.iva.toFixed(2)}`, 20, yPosition + 24);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: $${documento.total.toFixed(2)}`, 20, yPosition + 31);
    doc.text(`Monto Aprobado: $${documento.montoAprobado.toFixed(2)}`, 20, yPosition + 38);

    // Firma
    doc.setFontSize(10);
    doc.text(`${documento.docenteNombre}`, 20, yPosition + 55);
    doc.text('LÍDER DE PROYECTO', 20, yPosition + 60);
    doc.text('SUBDIRECTOR ACADEMICO DEL ITESCAM', 20, yPosition + 65);

    // Guardar PDF
    doc.save(`documento-final-${documento.claveProyecto}-${new Date().toISOString().split('T')[0]}.pdf`);
  }

  // ✅ GENERAR DOCUMENTO FINAL EN EXCEL (Método existente)
  generarExcelDocumentoFinal(documento: DocumentoFinal): void {
    // Crear workbook
    const workbook = utils.book_new();
    
    // Hoja de información general
    const infoData = [
      ['DOCUMENTO FINAL - PROYECTO APROBADO'],
      [],
      ['TIPO DE CONVOCATORIA:', documento.tipoConvocatoria],
      ['NOMBRE DEL PROYECTO:', documento.nombreProyecto],
      ['CLAVE DE PROYECTO:', documento.claveProyecto],
      ['VIGENCIA DEL PROYECTO:', documento.vigenciaProyecto],
      ['TIPO DE FONDO:', documento.tipoFondo],
      ['DOCENTE:', documento.docenteNombre],
      ['FECHA DE GENERACIÓN:', documento.fechaGeneracion.toLocaleDateString('es-MX')],
      [],
      ['RESUMEN FINANCIERO'],
      ['Subtotal:', `$${documento.subtotal.toFixed(2)}`],
      ['IVA (16%):', `$${documento.iva.toFixed(2)}`],
      ['TOTAL:', `$${documento.total.toFixed(2)}`],
      ['MONTO APROBADO:', `$${documento.montoAprobado.toFixed(2)}`],
      []
    ];

    const infoWorksheet = utils.aoa_to_sheet(infoData);
    utils.book_append_sheet(workbook, infoWorksheet, 'Información General');

    // Hoja para cada partida
    documento.partidas.forEach((partida, index) => {
      const partidaData = [
        [`PARTIDA ${partida.partidaCodigo} - ${partida.partidaNombre}`],
        ['Descripción:', partida.partidaDescripcion],
        ['Monto Autorizado:', `$${partida.montoAutorizado.toFixed(2)}`],
        [],
        ['DETALLE DE PRODUCTOS'],
        ['Cantidad', 'Descripción', 'Precio Unitario', 'Total']
      ];

      // Agregar productos
      partida.productos.forEach(producto => {
        partidaData.push([
          producto.cantidad.toString(),
          producto.descripcion,
          `$${producto.precioUnitario.toFixed(2)}`,
          `$${producto.total.toFixed(2)}`
        ]);
      });

      // Agregar totales de partida
      partidaData.push([]);
      partidaData.push(['', '', 'Subtotal:', `$${partida.subtotal.toFixed(2)}`]);
      partidaData.push(['', '', 'IVA 16%:', `$${partida.iva.toFixed(2)}`]);
      partidaData.push(['', '', 'TOTAL:', `$${partida.total.toFixed(2)}`]);

      const partidaWorksheet = utils.aoa_to_sheet(partidaData);
      utils.book_append_sheet(workbook, partidaWorksheet, `Partida ${partida.partidaCodigo}`);
    });

    // Hoja de firmas
    const firmasData = [
      ['FIRMAS Y AUTORIZACIONES'],
      [],
      ['LÍDER DE PROYECTO'],
      [documento.docenteNombre],
      [],
      ['SUBDIRECTOR ACADEMICO'],
      ['ITESCAM'],
      [],
      ['FECHA DE APROBACIÓN:', new Date().toLocaleDateString('es-MX')]
    ];

    const firmasWorksheet = utils.aoa_to_sheet(firmasData);
    utils.book_append_sheet(workbook, firmasWorksheet, 'Firmas');

    // Generar archivo Excel
    const excelBuffer = write(workbook, { bookType: 'xlsx', type: 'array' });
    this.descargarArchivo(excelBuffer, `documento-final-${documento.claveProyecto}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    alert('📊 Documento final exportado exitosamente en formato Excel');
  }

  // ✅ GENERAR EXCEL CON MÚLTIPLES DOCUMENTOS (Método existente)
  generarExcelMultiplesDocumentos(documentos: DocumentoFinal[]): void {
    if (documentos.length === 0) {
      alert('No hay documentos para exportar');
      return;
    }

    const workbook = utils.book_new();

    // Hoja resumen de todos los proyectos
    const resumenData = [
      ['RESUMEN GENERAL DE DOCUMENTOS FINALES'],
      ['Fecha de generación:', new Date().toLocaleDateString('es-MX')],
      [],
      ['Proyecto', 'Clave', 'Docente', 'Tipo Fondo', 'Monto Aprobado', 'Total', 'Partidas']
    ];

    documentos.forEach(documento => {
      resumenData.push([
        documento.nombreProyecto,
        documento.claveProyecto,
        documento.docenteNombre,
        documento.tipoFondo,
        `$${documento.montoAprobado.toFixed(2)}`,
        `$${documento.total.toFixed(2)}`,
        documento.partidas.length.toString()
      ]);
    });

    // Agregar totales al resumen
    const totalMonto = documentos.reduce((sum, doc) => sum + doc.montoAprobado, 0);
    const totalGeneral = documentos.reduce((sum, doc) => sum + doc.total, 0);
    
    resumenData.push([]);
    resumenData.push(['TOTALES GENERALES', '', '', '', `$${totalMonto.toFixed(2)}`, `$${totalGeneral.toFixed(2)}`, '']);

    const resumenWorksheet = utils.aoa_to_sheet(resumenData);
    utils.book_append_sheet(workbook, resumenWorksheet, 'Resumen General');

    // Hoja para cada documento
    documentos.forEach((documento, docIndex) => {
      const docData = [
        [`DOCUMENTO FINAL - ${documento.nombreProyecto}`],
        ['Clave:', documento.claveProyecto],
        ['Docente:', documento.docenteNombre],
        ['Tipo Fondo:', documento.tipoFondo],
        ['Monto Aprobado:', `$${documento.montoAprobado.toFixed(2)}`],
        [],
        ['PARTIDAS Y PRODUCTOS']
      ];

      documento.partidas.forEach(partida => {
        docData.push([]);
        docData.push([`PARTIDA ${partida.partidaCodigo} - ${partida.partidaNombre}`]);
        docData.push(['Monto Autorizado:', `$${partida.montoAutorizado.toFixed(2)}`]);
        docData.push(['Cantidad', 'Producto', 'Precio Unitario', 'Total']);

        partida.productos.forEach(producto => {
          docData.push([
            producto.cantidad.toString(),
            producto.descripcion,
            `$${producto.precioUnitario.toFixed(2)}`,
            `$${producto.total.toFixed(2)}`
          ]);
        });

        docData.push(['', '', 'Subtotal:', `$${partida.subtotal.toFixed(2)}`]);
        docData.push(['', '', 'IVA 16%:', `$${partida.iva.toFixed(2)}`]);
        docData.push(['', '', 'TOTAL PARTIDA:', `$${partida.total.toFixed(2)}`]);
      });

      docData.push([]);
      docData.push(['TOTALES GENERALES']);
      docData.push(['Subtotal General:', `$${documento.subtotal.toFixed(2)}`]);
      docData.push(['IVA General:', `$${documento.iva.toFixed(2)}`]);
      docData.push(['TOTAL GENERAL:', `$${documento.total.toFixed(2)}`]);

      const docWorksheet = utils.aoa_to_sheet(docData);
      utils.book_append_sheet(workbook, docWorksheet, `Proyecto ${docIndex + 1}`);
    });

    const excelBuffer = write(workbook, { bookType: 'xlsx', type: 'array' });
    this.descargarArchivo(excelBuffer, `documentos-finales-${new Date().toISOString().split('T')[0]}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    alert(`📊 ${documentos.length} documentos finales exportados exitosamente en formato Excel`);
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
}