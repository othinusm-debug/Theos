import React, { useMemo } from 'react';
import { Link } from 'wouter';
import { useAnimales, useRegistrosLechesDeFinca } from '@/lib/repo';
import { useFincaActual } from '@/lib/finca-context';
import { resumirProduccion, litrosDia } from '@/lib/produccion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Droplet, TrendingUp, Trophy } from 'lucide-react';

export default function Produccion() {
  const { fincaId, finca } = useFincaActual();
  const animales = useAnimales(fincaId);
  const hembras = useMemo(() => (animales ?? []).filter(a => a.sexo === 'hembra' && !a.deletedAt), [animales]);
  const hembrasIds = useMemo(() => hembras.map(a => a.id), [hembras]);
  const registros = useRegistrosLechesDeFinca(hembrasIds);

  if (!finca) {
    return (
      <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg m-4 md:m-8">
        Primero creá una finca para poder registrar producción.
      </div>
    );
  }

  if (!registros) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Cargando producción...</div>;
  }

  const resumen = resumirProduccion(registros);

  const hace30 = new Date();
  hace30.setDate(hace30.getDate() - 30);
  const porDiaMap = new Map<string, number>();
  for (const r of registros) {
    if (new Date(r.fecha) < hace30) continue;
    porDiaMap.set(r.fecha, (porDiaMap.get(r.fecha) ?? 0) + litrosDia(r));
  }
  const serieDiaria = Array.from(porDiaMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, litros]) => ({ fecha: fecha.slice(5), litros: Number(litros.toFixed(1)) }));

  const litrosPorAnimal = new Map<string, number>();
  for (const r of registros) {
    litrosPorAnimal.set(r.animalId, (litrosPorAnimal.get(r.animalId) ?? 0) + litrosDia(r));
  }
  const ranking = Array.from(litrosPorAnimal.entries())
    .map(([animalId, litros]) => ({ animal: hembras.find(a => a.id === animalId), litros }))
    .filter(r => r.animal)
    .sort((a, b) => b.litros - a.litros)
    .slice(0, 5);

  return (
    <div className="field-shell p-4 md:p-8 space-y-6 field-rise">
      <div>
        <h1 className="text-3xl font-bold font-serif">Producción Láctea</h1>
        <p className="text-muted-foreground">Resumen de ordeño de todo el rodeo — {finca.nombre}.</p>
      </div>

      {registros.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            Todavía no hay registros de leche. Cargalos desde la pestaña "Leche" en la ficha de cada vaca.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><Droplet className="w-4 h-4" /> Promedio diario</div>
                <div className="text-2xl font-bold">{resumen.promedioDiario.toFixed(1)} L</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><TrendingUp className="w-4 h-4" /> Promedio semanal</div>
                <div className="text-2xl font-bold">{resumen.promedioSemanal.toFixed(0)} L</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-muted-foreground text-sm mb-1">Máximo en un día</div>
                <div className="text-2xl font-bold">{resumen.maxDiario.toFixed(1)} L</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-muted-foreground text-sm mb-1">Total histórico</div>
                <div className="text-2xl font-bold">{resumen.totalLitros.toFixed(0)} L</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Últimos 30 días (litros/día, todo el rodeo)</CardTitle></CardHeader>
            <CardContent className="h-64">
              {serieDiaria.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={serieDiaria}>
                    <XAxis dataKey="fecha" fontSize={12} />
                    <YAxis fontSize={12} />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="litros" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Sin registros en los últimos 30 días.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-primary" /> Mejores productoras (histórico)</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {ranking.map((r, i) => (
                  <Link key={r.animal!.id} href={`/animales/${r.animal!.id}`} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{i + 1}</span>
                      <span className="font-mono font-medium">{r.animal!.codigo}</span>
                      {r.animal!.nombre && <span className="text-muted-foreground text-sm">{r.animal!.nombre}</span>}
                    </div>
                    <span className="font-semibold">{r.litros.toFixed(1)} L</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
