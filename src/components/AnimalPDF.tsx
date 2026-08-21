import React from 'react';
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type {
  Animal, EventoSalud, FotoAnimal, Monta, MovimientoPotrero, Parto, Pesaje,
  RegistroLeche, Venta, Muerte,
} from '@/lib/types';
import { calcularEdad } from '@/lib/edad';
import { categoriaAnimal } from '@/lib/catalogo';

const c = { ink: '#20312b', green: '#2f6f4e', gold: '#c58a32', line: '#d9e0da', soft: '#f4f6f2', muted: '#66756d' };
const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 42, paddingHorizontal: 38, fontFamily: 'Helvetica', fontSize: 9, color: c.ink },
  header: { position: 'absolute', top: 22, left: 38, right: 38, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `2px solid ${c.green}`, paddingBottom: 7 },
  brand: { fontSize: 15, fontWeight: 700, color: c.green, letterSpacing: 2 },
  headerMeta: { fontSize: 8, color: c.muted },
  footer: { position: 'absolute', bottom: 20, left: 38, right: 38, flexDirection: 'row', justifyContent: 'space-between', borderTop: `1px solid ${c.line}`, paddingTop: 6, fontSize: 7, color: c.muted },
  title: { fontSize: 20, fontWeight: 700, color: c.ink, marginBottom: 3 },
  subtitle: { fontSize: 9, color: c.muted },
  section: { marginTop: 14, marginBottom: 5 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: c.green, borderBottom: `1px solid ${c.line}`, paddingBottom: 4, marginBottom: 6, textTransform: 'uppercase', letterSpacing: .7 },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 100, fontWeight: 700, color: c.muted },
  value: { flex: 1 },
  photo: { width: 138, height: 108, backgroundColor: c.soft, objectFit: 'cover' },
  markPhoto: { width: 118, height: 88, backgroundColor: c.soft, objectFit: 'contain' },
  topContent: { flexDirection: 'row', gap: 16, marginBottom: 2 },
  dataCol: { flex: 1, paddingTop: 2 },
  photoStack: { width: 138 },
  photoCaption: { fontSize: 7, color: c.muted, textAlign: 'center', marginTop: 4 },
  marks: { flexDirection: 'row', gap: 12, marginTop: 7 },
  mark: { width: 128, alignItems: 'center' },
  card: { border: `1px solid ${c.line}`, backgroundColor: c.soft, padding: 8, marginBottom: 7 },
  highlights: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 4 },
  highlightBox: { flex: 1, border: `1px solid ${c.line}`, backgroundColor: c.soft, padding: 7 },
  highlightLabel: { fontSize: 7, color: c.muted, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 3 },
  highlightValue: { fontSize: 11, fontWeight: 700, color: c.ink },
  highlightSub: { fontSize: 7, color: c.muted, marginTop: 1 },
  table: { width: '100%', marginTop: 2 },
  tableRow: { flexDirection: 'row', borderBottom: `1px solid ${c.line}`, paddingVertical: 4 },
  tableHeader: { fontWeight: 700, color: c.green, backgroundColor: c.soft, paddingVertical: 5 },
  empty: { color: c.muted, fontStyle: 'italic', paddingVertical: 3 },
});

const fmtDate = (value?: string) => value ? new Date(value).toLocaleDateString('es-VE') : '—';
const text = (value?: string | number | null) => value === undefined || value === null || value === '' ? '—' : String(value);

function Table({ headers, rows, widths }: { headers: string[]; rows: string[][]; widths: string[] }) {
  return (
    <View style={styles.table} wrap>
      <View style={styles.tableRow}>
        {headers.map((header, index) => <Text key={header} style={[styles.tableHeader, { width: widths[index] }]}>{header}</Text>)}
      </View>
      {rows.length ? rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.tableRow} wrap={false}>
          {row.map((cell, index) => <Text key={index} style={{ width: widths[index] }}>{cell}</Text>)}
        </View>
      )) : <Text style={styles.empty}>Sin registros.</Text>}
    </View>
  );
}

export const AnimalDocument = ({
  animal, fincaNombre, pesajes, eventosSalud, fotos = [], leche = [], montas = [],
  partos = [], movimientos = [], ventas = [], muertes = [], padre, madre, potreroNombre,
}: {
  animal: Animal;
  fincaNombre: string;
  pesajes: Pesaje[];
  eventosSalud: EventoSalud[];
  fotos?: FotoAnimal[];
  leche?: RegistroLeche[];
  montas?: Monta[];
  partos?: Parto[];
  movimientos?: MovimientoPotrero[];
  ventas?: Venta[];
  muertes?: Muerte[];
  /** Animal completo del padre/madre (no solo el ID) para mostrar su código y
   *  nombre en la ficha — si no se pasa, se muestra el ID crudo como respaldo. */
  padre?: Animal;
  madre?: Animal;
  potreroNombre?: string;
}) => {
  const edad = calcularEdad(animal.fechaNacimiento);
  const cat = categoriaAnimal(animal.especie, animal.sexo, edad?.totalMeses ?? null);
  const fotoPrincipal = fotos.find(f => f.tipo === 'animal')?.datos || animal.fotoUrl;
  const fotoHierro = fotos.find(f => f.tipo === 'hierro_foto')?.datos;
  const dibujoHierro = fotos.find(f => f.tipo === 'hierro_dibujo')?.datos;
  const ultimoPesaje = pesajes.length
    ? [...pesajes].sort((a, b) => a.fecha.localeCompare(b.fecha))[pesajes.length - 1]
    : undefined;
  const infoReproductiva = animal.sexo === 'hembra'
    ? `${partos.length} parto${partos.length === 1 ? '' : 's'}${animal.estadoReproductivoHembra ? ` · ${animal.estadoReproductivoHembra}` : ''}`
    : (animal.estadoReproductivoMacho || 'Sin datos');
  const nombrePadre = padre ? `${padre.codigo}${padre.nombre ? ` · ${padre.nombre}` : ''}` : text(animal.padreId);
  const nombreMadre = madre ? `${madre.codigo}${madre.nombre ? ` · ${madre.nombre}` : ''}` : text(animal.madreId);
  const historial = [
    ...eventosSalud.map(e => [e.fecha, 'Salud', e.producto || e.diagnostico || e.tipo]),
    ...pesajes.map(p => [p.fecha, 'Pesaje', `${p.pesoKg} kg${p.observaciones ? ` · ${p.observaciones}` : ''}`]),
    ...leche.map(r => [r.fecha, 'Producción', `${((r.litrosManana ?? 0) + (r.litrosTarde ?? 0)).toFixed(1)} L`]),
    ...montas.map(m => [m.fecha, 'Monta', `${m.tipo} · ${m.resultado}`]),
    ...partos.map(p => [p.fecha, 'Parto', `${p.numCrias} cría(s)`]),
    ...movimientos.map(m => [m.fecha, 'Movimiento', m.observaciones || 'Cambio de potrero']),
    ...ventas.map(v => [v.fecha, 'Venta', v.comprador || 'Venta registrada']),
    ...muertes.map(m => [m.fecha, 'Muerte', m.causa || 'Causa no especificada']),
  ].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View fixed style={styles.header}><Text style={styles.brand}>THEOS</Text><Text style={styles.headerMeta}>GESTIÓN GANADERA · FICHA INDIVIDUAL</Text></View>
        <View fixed style={styles.footer}><Text>{fincaNombre || 'Finca sin nombre'} · Documento generado sin conexión</Text><Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} /></View>
        <Text style={styles.title}>Ficha de animal · {animal.codigo}</Text>
        <Text style={styles.subtitle}>{fincaNombre || 'Finca sin nombre'} · Generada el {fmtDate(new Date().toISOString())}</Text>

        <View style={styles.highlights}>
          <View style={styles.highlightBox}>
            <Text style={styles.highlightLabel}>Estado</Text>
            <Text style={styles.highlightValue}>{animal.estado.toUpperCase()}</Text>
          </View>
          <View style={styles.highlightBox}>
            <Text style={styles.highlightLabel}>Potrero</Text>
            <Text style={styles.highlightValue}>{potreroNombre || 'Sin asignar'}</Text>
          </View>
          <View style={styles.highlightBox}>
            <Text style={styles.highlightLabel}>Peso actual</Text>
            <Text style={styles.highlightValue}>{ultimoPesaje ? `${ultimoPesaje.pesoKg} kg` : '—'}</Text>
            {ultimoPesaje && <Text style={styles.highlightSub}>Pesado el {fmtDate(ultimoPesaje.fecha)}</Text>}
          </View>
          <View style={styles.highlightBox}>
            <Text style={styles.highlightLabel}>Reproductivo</Text>
            <Text style={styles.highlightValue}>{infoReproductiva}</Text>
          </View>
        </View>

        <View style={styles.topContent}>
          <View style={styles.photoStack}>
            {fotoPrincipal ? <Image src={fotoPrincipal} style={styles.photo} /> : <View style={styles.photo} />}
            <Text style={styles.photoCaption}>{fotoPrincipal ? 'Fotografía principal' : 'Sin fotografía principal'}</Text>
          </View>
          <View style={styles.dataCol}>
            {[
              ['Nombre / apodo', text(animal.nombre || animal.apodo)],
              ['Especie / sexo', `${animal.especie} / ${animal.sexo}`],
              ['Categoría', cat],
              ['Raza', `${text(animal.raza)}${animal.subraza ? ` · ${animal.subraza}` : ''}`],
              ['Edad', edad?.texto || 'Desconocida'],
              ['Nacimiento', `${fmtDate(animal.fechaNacimiento)}${animal.fechaNacimientoEstimada ? ' · estimada' : ''}`],
              ['Estado', animal.estado.toUpperCase()],
            ].map(([label, value]) => <View style={styles.row} key={label}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>)}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Identificación y ubicación</Text>
          <View style={styles.card}>
            <View style={styles.row}><Text style={styles.label}>Color / pelaje</Text><Text style={styles.value}>{text(animal.color)}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Hierro</Text><Text style={styles.value}>{text(animal.hierro)}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Reproductivo</Text><Text style={styles.value}>{text(animal.sexo === 'hembra' ? animal.estadoReproductivoHembra : animal.estadoReproductivoMacho)}</Text></View>
            {animal.observaciones && <View style={styles.row}><Text style={styles.label}>Observaciones</Text><Text style={styles.value}>{animal.observaciones}</Text></View>}
          </View>
          {(fotoHierro || dibujoHierro) && <View style={styles.marks}>
            {fotoHierro && <View style={styles.mark}><Image src={fotoHierro} style={styles.markPhoto} /><Text style={styles.photoCaption}>Fotografía del hierro</Text></View>}
            {dibujoHierro && <View style={styles.mark}><Image src={dibujoHierro} style={styles.markPhoto} /><Text style={styles.photoCaption}>Dibujo del hierro</Text></View>}
          </View>}
        </View>

        <View style={styles.section}><Text style={styles.sectionTitle}>Genealogía</Text><View style={styles.card}>
          <View style={styles.row}><Text style={styles.label}>Padre</Text><Text style={styles.value}>{nombrePadre}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Madre</Text><Text style={styles.value}>{nombreMadre}</Text></View>
        </View></View>
        <View style={styles.section}><Text style={styles.sectionTitle}>Salud</Text><Table headers={['Fecha', 'Evento', 'Detalle']} widths={['19%', '23%', '58%']} rows={eventosSalud.slice(0, 8).map(e => [fmtDate(e.fecha), e.tipo, e.producto || e.diagnostico || e.observaciones || '—'])} /></View>
        <View style={styles.section}><Text style={styles.sectionTitle}>Producción y pesajes</Text><Table headers={['Fecha', 'Registro', 'Detalle']} widths={['19%', '23%', '58%']} rows={[...pesajes.slice(0, 6).map(p => [fmtDate(p.fecha), 'Peso', `${p.pesoKg} kg${p.observaciones ? ` · ${p.observaciones}` : ''}`]), ...leche.slice(0, 6).map(r => [fmtDate(r.fecha), 'Leche', `${((r.litrosManana ?? 0) + (r.litrosTarde ?? 0)).toFixed(1)} L`])]} /></View>
        <View style={styles.section}><Text style={styles.sectionTitle}>Reproducción</Text><Table headers={['Fecha', 'Evento', 'Detalle']} widths={['19%', '23%', '58%']} rows={[...montas.slice(0, 6).map(m => [fmtDate(m.fecha), 'Monta', `${m.tipo} · ${m.resultado}`]), ...partos.slice(0, 6).map(p => [fmtDate(p.fecha), 'Parto', `${p.numCrias} cría(s)`])]} /></View>
        <View style={styles.section}><Text style={styles.sectionTitle}>Movimientos e historial</Text><Table headers={['Fecha', 'Evento', 'Detalle']} widths={['19%', '23%', '58%']} rows={historial.slice(0, 14).map(([date, type, detail]) => [fmtDate(date), type, detail])} /></View>
      </Page>
    </Document>
  );
};