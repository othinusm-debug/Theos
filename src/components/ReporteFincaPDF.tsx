import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Animal, Potrero, EventoSalud, MovimientoFinanciero, Finca } from '@/lib/types';
import { calcularEdad } from '@/lib/edad';
import { categoriaAnimal } from '@/lib/catalogo';

// Igual que en AnimalPDF: usamos 'Helvetica' (fuente estándar incluida) para
// que el PDF se genere siempre, sin depender de internet.
const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', fontSize: 9, color: '#1a1814' },
  header: { marginBottom: 16, borderBottom: '2 solid #E28C12', paddingBottom: 10 },
  titulo: { fontSize: 18, fontWeight: 700, marginBottom: 2 },
  subtitulo: { fontSize: 10, color: '#6b6558' },
  seccion: { marginTop: 16, marginBottom: 8 },
  seccionTitulo: { fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#E28C12' },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  kpiBox: { flex: 1, backgroundColor: '#F5F0E8', padding: 8, borderRadius: 4 },
  kpiValor: { fontSize: 14, fontWeight: 700 },
  kpiLabel: { fontSize: 8, color: '#6b6558', marginTop: 2 },
  tabla: { marginTop: 4 },
  filaHeader: { flexDirection: 'row', backgroundColor: '#2f3e24', paddingVertical: 4, paddingHorizontal: 4 },
  filaHeaderTexto: { color: '#FFFFFF', fontSize: 8, fontWeight: 700 },
  fila: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 4, borderBottom: '0.5 solid #E5E0D5' },
  filaAlt: { backgroundColor: '#FAFAF5' },
  celda: { fontSize: 8 },
  colCodigo: { width: '14%' },
  colNombre: { width: '20%' },
  colEspecie: { width: '14%' },
  colCategoria: { width: '18%' },
  colEdad: { width: '14%' },
  colPotrero: { width: '20%' },
  alertaFila: { flexDirection: 'row', paddingVertical: 3, borderBottom: '0.5 solid #E5E0D5' },
  footer: { position: 'absolute', bottom: 20, left: 36, right: 36, fontSize: 7, color: '#9b9585', textAlign: 'center', borderTop: '0.5 solid #E5E0D5', paddingTop: 6 },
});

interface ReporteFincaProps {
  finca: Finca;
  animales: Animal[];
  potreros: Potrero[];
  eventosSalud: EventoSalud[];
  movimientos: MovimientoFinanciero[];
}

export function ReporteFincaDocument({ finca, animales, potreros, eventosSalud, movimientos }: ReporteFincaProps) {
  const activos = animales.filter(a => !a.deletedAt);
  const hembras = activos.filter(a => a.sexo === 'hembra');
  const machos = activos.filter(a => a.sexo === 'macho');
  const potreroPorId = new Map(potreros.map(p => [p.id, p.nombre]));

  const hoy = new Date();
  const vencidos = eventosSalud.filter(e => e.proximaFecha && new Date(e.proximaFecha) < hoy);
  const proximos30 = eventosSalud.filter(e => {
    if (!e.proximaFecha) return false;
    const f = new Date(e.proximaFecha);
    const en30 = new Date();
    en30.setDate(en30.getDate() + 30);
    return f >= hoy && f <= en30;
  });

  const ingresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
  const egresos = movimientos.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0);

  const animalIdParaEvento = (animalId: string) => activos.find(a => a.id === animalId);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.titulo}>Reporte General de Finca</Text>
          <Text style={styles.subtitulo}>{finca.nombre} — Generado el {hoy.toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
        </View>

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Resumen General</Text>
          <View style={styles.kpiRow}>
            <View style={styles.kpiBox}><Text style={styles.kpiValor}>{activos.length}</Text><Text style={styles.kpiLabel}>Total animales</Text></View>
            <View style={styles.kpiBox}><Text style={styles.kpiValor}>{hembras.length}</Text><Text style={styles.kpiLabel}>Hembras</Text></View>
            <View style={styles.kpiBox}><Text style={styles.kpiValor}>{machos.length}</Text><Text style={styles.kpiLabel}>Machos</Text></View>
            <View style={styles.kpiBox}><Text style={styles.kpiValor}>{potreros.length}</Text><Text style={styles.kpiLabel}>Potreros</Text></View>
          </View>
        </View>

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Inventario de Animales ({activos.length})</Text>
          <View style={styles.tabla}>
            <View style={styles.filaHeader}>
              <Text style={[styles.filaHeaderTexto, styles.colCodigo]}>Código</Text>
              <Text style={[styles.filaHeaderTexto, styles.colNombre]}>Nombre</Text>
              <Text style={[styles.filaHeaderTexto, styles.colEspecie]}>Especie</Text>
              <Text style={[styles.filaHeaderTexto, styles.colCategoria]}>Categoría</Text>
              <Text style={[styles.filaHeaderTexto, styles.colEdad]}>Edad</Text>
              <Text style={[styles.filaHeaderTexto, styles.colPotrero]}>Potrero</Text>
            </View>
            {activos.map((a, i) => {
              const edad = calcularEdad(a.fechaNacimiento);
              const cat = categoriaAnimal(a.especie, a.sexo, edad?.totalMeses ?? null);
              return (
                <View key={a.id} style={[styles.fila, i % 2 === 1 ? styles.filaAlt : {}]} wrap={false}>
                  <Text style={[styles.celda, styles.colCodigo]}>{a.codigo}</Text>
                  <Text style={[styles.celda, styles.colNombre]}>{a.nombre || a.apodo || '-'}</Text>
                  <Text style={[styles.celda, styles.colEspecie]}>{a.especie}</Text>
                  <Text style={[styles.celda, styles.colCategoria]}>{cat}</Text>
                  <Text style={[styles.celda, styles.colEdad]}>{edad?.texto ?? '-'}</Text>
                  <Text style={[styles.celda, styles.colPotrero]}>{a.potreroActualId ? potreroPorId.get(a.potreroActualId) ?? '-' : '-'}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <Text style={styles.footer} render={({ pageNumber, totalPages }) => `THEOS — Reporte generado en el dispositivo, sin conexión — Página ${pageNumber} de ${totalPages}`} fixed />
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Estado Sanitario</Text>
          <View style={styles.kpiRow}>
            <View style={styles.kpiBox}><Text style={styles.kpiValor}>{vencidos.length}</Text><Text style={styles.kpiLabel}>Eventos vencidos</Text></View>
            <View style={styles.kpiBox}><Text style={styles.kpiValor}>{proximos30.length}</Text><Text style={styles.kpiLabel}>Próximos 30 días</Text></View>
            <View style={styles.kpiBox}><Text style={styles.kpiValor}>{eventosSalud.length}</Text><Text style={styles.kpiLabel}>Total histórico</Text></View>
          </View>

          {vencidos.length > 0 && (
            <>
              <Text style={{ fontSize: 9, fontWeight: 700, marginTop: 10, marginBottom: 4, color: '#B23A2E' }}>Vencidos — requieren atención</Text>
              {vencidos.map(e => {
                const a = animalIdParaEvento(e.animalId);
                return (
                  <View key={e.id} style={styles.alertaFila}>
                    <Text style={[styles.celda, { width: '20%' }]}>{a?.codigo ?? '-'}</Text>
                    <Text style={[styles.celda, { width: '40%' }]}>{e.tipo}{e.producto ? ` — ${e.producto}` : ''}</Text>
                    <Text style={[styles.celda, { width: '40%' }]}>Vencía: {e.proximaFecha ? new Date(e.proximaFecha).toLocaleDateString() : '-'}</Text>
                  </View>
                );
              })}
            </>
          )}

          {proximos30.length > 0 && (
            <>
              <Text style={{ fontSize: 9, fontWeight: 700, marginTop: 10, marginBottom: 4 }}>Próximos 30 días</Text>
              {proximos30.map(e => {
                const a = animalIdParaEvento(e.animalId);
                return (
                  <View key={e.id} style={styles.alertaFila}>
                    <Text style={[styles.celda, { width: '20%' }]}>{a?.codigo ?? '-'}</Text>
                    <Text style={[styles.celda, { width: '40%' }]}>{e.tipo}{e.producto ? ` — ${e.producto}` : ''}</Text>
                    <Text style={[styles.celda, { width: '40%' }]}>{e.proximaFecha ? new Date(e.proximaFecha).toLocaleDateString() : '-'}</Text>
                  </View>
                );
              })}
            </>
          )}
        </View>

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Resumen Financiero</Text>
          <View style={styles.kpiRow}>
            <View style={styles.kpiBox}><Text style={styles.kpiValor}>{ingresos.toFixed(2)}</Text><Text style={styles.kpiLabel}>Ingresos totales</Text></View>
            <View style={styles.kpiBox}><Text style={styles.kpiValor}>{egresos.toFixed(2)}</Text><Text style={styles.kpiLabel}>Egresos totales</Text></View>
            <View style={styles.kpiBox}><Text style={styles.kpiValor}>{(ingresos - egresos).toFixed(2)}</Text><Text style={styles.kpiLabel}>Balance</Text></View>
          </View>
          {movimientos.length === 0 && <Text style={{ fontSize: 8, color: '#6b6558', marginTop: 6 }}>Sin movimientos financieros registrados.</Text>}
        </View>

        <Text style={styles.footer} render={({ pageNumber, totalPages }) => `THEOS — Reporte generado en el dispositivo, sin conexión — Página ${pageNumber} de ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}
