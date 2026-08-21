import React, { useMemo } from 'react';
import { Link } from 'wouter';
import { useAnimales, useMontas, usePartosDeFinca } from '@/lib/repo';
import { useFincaActual } from '@/lib/finca-context';
import { fechaEsperadaParto } from '@/lib/catalogo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarHeart, Baby, Clock, AlertCircle } from 'lucide-react';

export default function Reproduccion() {
  const { fincaId, finca } = useFincaActual();
  const animales = useAnimales(fincaId);
  const hembras = useMemo(() => (animales ?? []).filter(a => a.sexo === 'hembra' && !a.deletedAt), [animales]);
  const hembrasIds = useMemo(() => hembras.map(a => a.id), [hembras]);
  const montas = useMontas(hembrasIds);
  const partos = usePartosDeFinca(hembrasIds);

  if (!finca) {
    return (
      <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg m-4 md:m-8">
        Primero creá una finca para poder registrar reproducción.
      </div>
    );
  }

  if (!montas || !partos) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Cargando reproducción...</div>;
  }

  const hoy = new Date();

  // Gestaciones activas, ordenadas por fecha de parto esperada (más próximas primero)
  const gestaciones = montas
    .filter(m => m.resultado === 'gestacion')
    .map(m => {
      const hembra = hembras.find(a => a.id === m.hembraId);
      if (!hembra) return null;
      const esperado = fechaEsperadaParto(m.fecha, hembra.especie);
      const diasRestantes = Math.ceil((esperado.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
      return { monta: m, hembra, esperado, diasRestantes };
    })
    .filter((g): g is NonNullable<typeof g> => g !== null)
    .sort((a, b) => a.esperado.getTime() - b.esperado.getTime());

  // Montas pendientes de confirmar resultado (más de 21 días sin diagnóstico es señal de revisar)
  const pendientes = montas
    .filter(m => m.resultado === 'pendiente')
    .map(m => ({ monta: m, hembra: hembras.find(a => a.id === m.hembraId) }))
    .filter((p): p is { monta: typeof p.monta; hembra: NonNullable<typeof p.hembra> } => !!p.hembra)
    .sort((a, b) => a.monta.fecha.localeCompare(b.monta.fecha));

  // Últimos partos registrados
  const ultimosPartos = [...partos]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 8)
    .map(p => ({ parto: p, madre: hembras.find(a => a.id === p.madreId) }));

  return (
    <div className="field-shell p-4 md:p-8 space-y-6 field-rise">
      <div>
        <h1 className="text-3xl font-bold font-serif">Reproducción</h1>
        <p className="text-muted-foreground">Calendario de gestación, montas y partos — {finca.nombre}.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><Baby className="w-4 h-4" /> En gestación</div>
            <div className="text-2xl font-bold">{gestaciones.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><Clock className="w-4 h-4" /> Pendientes de diagnóstico</div>
            <div className="text-2xl font-bold">{pendientes.length}</div>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><CalendarHeart className="w-4 h-4" /> Partos registrados</div>
            <div className="text-2xl font-bold">{partos.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CalendarHeart className="w-5 h-5 text-primary" /> Calendario de partos esperados</CardTitle></CardHeader>
        <CardContent>
          {gestaciones.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No hay gestaciones activas registradas.</p>
          ) : (
            <div className="space-y-2">
              {gestaciones.map(g => (
                <Link key={g.monta.id} href={`/animales/${g.hembra.id}`} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-medium">{g.hembra.codigo}</span>
                    {g.hembra.nombre && <span className="text-muted-foreground text-sm">{g.hembra.nombre}</span>}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{g.esperado.toLocaleDateString()}</div>
                    <Badge variant={g.diasRestantes <= 7 ? 'default' : 'secondary'} className="text-[10px]">
                      {g.diasRestantes < 0 ? `${Math.abs(g.diasRestantes)} días de atraso` : g.diasRestantes === 0 ? 'Hoy' : `en ${g.diasRestantes} días`}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {pendientes.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-primary" /> Montas sin diagnóstico</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendientes.map(p => (
                <Link key={p.monta.id} href={`/animales/${p.hembra.id}`} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-medium">{p.hembra.codigo}</span>
                    <span className="text-muted-foreground text-sm">Monta del {new Date(p.monta.fecha).toLocaleDateString()}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{p.monta.tipo}</Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Últimos partos</CardTitle></CardHeader>
        <CardContent>
          {ultimosPartos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Todavía no hay partos registrados.</p>
          ) : (
            <div className="space-y-2">
              {ultimosPartos.map(({ parto, madre }) => (
                <div key={parto.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-medium">{madre?.codigo ?? '—'}</span>
                    <span className="text-muted-foreground text-sm">{new Date(parto.fecha).toLocaleDateString()}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{parto.numCrias} cría{parto.numCrias !== 1 ? 's' : ''}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
