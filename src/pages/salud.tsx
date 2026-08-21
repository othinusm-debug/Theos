import React, { useMemo } from 'react';
import { Link } from 'wouter';
import { useAnimales, useEventosSaludDeFinca } from '@/lib/repo';
import { useFincaActual } from '@/lib/finca-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Syringe, AlertTriangle, CalendarClock, ClipboardList } from 'lucide-react';

const ETIQUETAS_TIPO: Record<string, string> = {
  vacuna: 'Vacuna',
  desparasitacion: 'Desparasitación',
  vitamina: 'Vitamina',
  examen: 'Examen',
  enfermedad: 'Enfermedad',
  cirugia: 'Cirugía',
  tratamiento: 'Tratamiento',
  alergia: 'Alergia',
};

export default function Salud() {
  const { fincaId, finca } = useFincaActual();
  const animales = useAnimales(fincaId);
  const animalesVivos = useMemo(() => (animales ?? []).filter(a => !a.deletedAt), [animales]);
  const animalIds = useMemo(() => animalesVivos.map(a => a.id), [animalesVivos]);
  const eventos = useEventosSaludDeFinca(animalIds);

  if (!finca) {
    return (
      <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg m-4 md:m-8">
        Primero creá una finca para poder registrar salud.
      </div>
    );
  }

  if (!eventos) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Cargando salud...</div>;
  }

  const hoy = new Date();
  const en30dias = new Date();
  en30dias.setDate(en30dias.getDate() + 30);

  const conProxima = eventos
    .filter(e => e.proximaFecha)
    .map(e => ({ evento: e, animal: animalesVivos.find(a => a.id === e.animalId), fecha: new Date(e.proximaFecha!) }))
    .filter((x): x is { evento: typeof x.evento; animal: NonNullable<typeof x.animal>; fecha: Date } => !!x.animal);

  const vencidos = conProxima.filter(x => x.fecha < hoy).sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  const proximos = conProxima.filter(x => x.fecha >= hoy && x.fecha <= en30dias).sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

  const ultimosEventos = [...eventos]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 10)
    .map(e => ({ evento: e, animal: animalesVivos.find(a => a.id === e.animalId) }));

  return (
    <div className="field-shell p-4 md:p-8 space-y-6 field-rise">
      <div>
        <h1 className="text-3xl font-bold font-serif">Salud</h1>
        <p className="text-muted-foreground">Vacunas, tratamientos y alertas sanitarias — {finca.nombre}.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className={vencidos.length > 0 ? 'border-destructive/50' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><AlertTriangle className="w-4 h-4" /> Vencidos</div>
            <div className="text-2xl font-bold">{vencidos.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><CalendarClock className="w-4 h-4" /> Próximos 30 días</div>
            <div className="text-2xl font-bold">{proximos.length}</div>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><ClipboardList className="w-4 h-4" /> Eventos totales</div>
            <div className="text-2xl font-bold">{eventos.length}</div>
          </CardContent>
        </Card>
      </div>

      {vencidos.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="w-5 h-5" /> Vencidos — requieren atención</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {vencidos.map(x => (
                <Link key={x.evento.id} href={`/animales/${x.animal.id}`} className="flex items-center justify-between p-3 border border-destructive/30 rounded-md hover:bg-destructive/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-medium">{x.animal.codigo}</span>
                    <span className="text-sm">{ETIQUETAS_TIPO[x.evento.tipo] ?? x.evento.tipo}{x.evento.producto ? ` — ${x.evento.producto}` : ''}</span>
                  </div>
                  <Badge variant="destructive" className="text-[10px]">{x.fecha.toLocaleDateString()}</Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="w-5 h-5 text-primary" /> Próximos 30 días</CardTitle></CardHeader>
        <CardContent>
          {proximos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Sin eventos programados en los próximos 30 días.</p>
          ) : (
            <div className="space-y-2">
              {proximos.map(x => (
                <Link key={x.evento.id} href={`/animales/${x.animal.id}`} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-medium">{x.animal.codigo}</span>
                    <span className="text-sm">{ETIQUETAS_TIPO[x.evento.tipo] ?? x.evento.tipo}{x.evento.producto ? ` — ${x.evento.producto}` : ''}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{x.fecha.toLocaleDateString()}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Syringe className="w-5 h-5 text-primary" /> Historial reciente</CardTitle></CardHeader>
        <CardContent>
          {ultimosEventos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Todavía no hay eventos de salud registrados.</p>
          ) : (
            <div className="space-y-2">
              {ultimosEventos.map(({ evento, animal }) => (
                <div key={evento.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-medium">{animal?.codigo ?? '—'}</span>
                    <span className="text-sm text-muted-foreground">{ETIQUETAS_TIPO[evento.tipo] ?? evento.tipo}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(evento.fecha).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
