import React from 'react';
import { useAnimales, useRegistrosLechesDeFinca, useProximosEventosSalud, useMontasGestacion } from '@/lib/repo';
import { useFincaActual } from '@/lib/finca-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Beef, AlertTriangle, Droplet, CalendarHeart, Building, Plus, ArrowUpRight, ClipboardList, MapPinned, Database } from 'lucide-react';
import { categoriaAnimal, fechaEsperadaParto } from '@/lib/catalogo';
import { calcularEdad } from '@/lib/edad';
import { diasDesdeUltimoBackup, INTERVALO_DIAS_BACKUP } from '@/lib/backup';
import { Link } from 'wouter';

export default function Inicio() {
  const { finca, fincaId, cargando: cargandoFincas } = useFincaActual();

  const animales = useAnimales(fincaId);
  const animalIds = animales ? animales.map(a => a.id) : [];
  
  const registrosLeche = useRegistrosLechesDeFinca(animalIds);
  const alertasSalud = useProximosEventosSalud(animalIds);
  const hembrasIds = animales ? animales.filter(a => a.sexo === 'hembra').map(a => a.id) : [];
  const montasGestacion = useMontasGestacion(hembrasIds);

  if (cargandoFincas || !animales) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Cargando datos de la finca...</div>;
  }

  if (!finca) {
    return (
      <div className="p-4 md:p-8 max-w-lg mx-auto mt-12 text-center space-y-4">
        <Building className="w-12 h-12 mx-auto text-muted-foreground opacity-40" />
        <h1 className="text-2xl font-bold font-serif">Bienvenido a THEOS</h1>
        <p className="text-muted-foreground">Todavía no has creado ninguna finca. Crea la primera para empezar a registrar animales, potreros y producción.</p>
        <Link href="/fincas" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90" data-testid="link-create-first-farm"><Plus className="w-4 h-4" /> Crear mi primera finca</Link>
      </div>
    );
  }

  // KPIs
  const totalAnimales = animales.length;
  const totalHembras = animales.filter(a => a.sexo === 'hembra').length;
  const totalMachos = animales.filter(a => a.sexo === 'macho').length;
  const hembrasGestantes = animales.filter(a => a.estado === 'vivo' && a.estadoReproductivoHembra === 'gestante').length;
  const diasBackup = diasDesdeUltimoBackup();

  // Milk Production Last 30 Days
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentMilk = (registrosLeche || []).filter(r => new Date(r.fecha) >= thirtyDaysAgo);
  const milkByDate = recentMilk.reduce((acc, r) => {
    const total = (r.litrosManana || 0) + (r.litrosTarde || 0);
    acc[r.fecha] = (acc[r.fecha] || 0) + total;
    return acc;
  }, {} as Record<string, number>);

  const milkChartData = Object.entries(milkByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, total]) => ({
      fecha: date,
      litros: total
    }));

  const last7DaysMilk = recentMilk
    .filter(r => new Date(r.fecha) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    .reduce((sum, r) => sum + (r.litrosManana || 0) + (r.litrosTarde || 0), 0);

  // Category Distribution
  const categoryCounts = animales.reduce((acc, a) => {
    const edadMeses = calcularEdad(a.fechaNacimiento)?.totalMeses ?? null;
    const cat = categoriaAnimal(a.especie, a.sexo, edadMeses);
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryChartData = Object.entries(categoryCounts).map(([cat, count]) => ({
    categoria: cat,
    cantidad: count
  }));

  // Upcoming Health Alerts
  const upcomingAlerts = (alertasSalud || [])
    .filter(e => e.proximaFecha && new Date(e.proximaFecha) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
    .sort((a, b) => new Date(a.proximaFecha!).getTime() - new Date(b.proximaFecha!).getTime());

  // Gestations
  const upcomingBirths = (montasGestacion || [])
    .map(m => {
      const hembra = animales.find(a => a.id === m.hembraId);
      const expected = fechaEsperadaParto(m.fecha, hembra?.especie || 'bovino');
      return { monta: m, hembra, expected };
    })
    .sort((a, b) => a.expected.getTime() - b.expected.getTime())
    .slice(0, 5);

  return (
    <div className="field-shell p-4 md:p-8 space-y-7 field-rise">
      <div className="relative overflow-hidden rounded-2xl border border-secondary/25 bg-secondary px-5 py-6 text-secondary-foreground md:px-8 md:py-7">
        <div className="absolute -right-14 -top-20 h-52 w-52 rounded-full border-[22px] border-primary/20" />
        <div className="absolute -bottom-24 right-24 h-44 w-44 rounded-full border border-primary/20" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Jornada de campo
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Panel de control</h1>
            {finca && <p className="mt-2 text-sm text-secondary-foreground/75">Operando en <span className="font-semibold text-secondary-foreground">{finca.nombre}</span> · datos guardados en este dispositivo</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/animales/nuevo" className="inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90" data-testid="link-dashboard-new-animal">
              <Plus className="h-4 w-4" /> Registrar animal
            </Link>
            <Link href="/datos" className="inline-flex items-center gap-2 rounded-md border border-secondary-foreground/20 bg-secondary-foreground/10 px-3.5 py-2.5 text-sm font-semibold text-secondary-foreground hover:bg-secondary-foreground/15" data-testid="link-dashboard-backup">
              <Database className="h-4 w-4" /> Respaldar datos
            </Link>
          </div>
        </div>
      </div>

      {totalAnimales > 0 && (diasBackup === null || diasBackup >= INTERVALO_DIAS_BACKUP) && (
        <Link href="/datos">
          <Card className="border-amber-500/50 bg-amber-500/5 hover:bg-amber-500/10 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {diasBackup === null ? 'Todavía no hiciste ningún respaldo' : `Hace ${diasBackup} días que no hacés un respaldo`}
                </p>
                <p className="text-xs text-muted-foreground">Todos los datos viven solo en este dispositivo. Tocá para respaldar ahora.</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="flex items-center justify-between">
        <div>
          <p className="field-kicker">Lecturas rápidas</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight">Estado del rodeo</h2>
        </div>
        <Link href="/animales" className="hidden items-center gap-1 text-sm font-semibold text-primary hover:underline sm:inline-flex" data-testid="link-dashboard-herd">Ver inventario <ArrowUpRight className="h-4 w-4" /></Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="field-card border-l-4 border-l-primary hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Animales</CardTitle>
            <Beef className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAnimales}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalHembras} hembras, {totalMachos} machos
            </p>
          </CardContent>
        </Card>
        
        <Card className="field-card border-l-4 border-l-accent hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hembras Gestantes</CardTitle>
            <CalendarHeart className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hembrasGestantes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Esperando crías
            </p>
          </CardContent>
        </Card>

        <Card className="field-card border-l-4 border-l-secondary hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Producción (7 días)</CardTitle>
            <Droplet className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{last7DaysMilk.toFixed(1)} L</div>
            <p className="text-xs text-muted-foreground mt-1">
              Leche ordeñada recientemente
            </p>
          </CardContent>
        </Card>

        <Card className="field-card border-l-4 border-l-destructive hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertas de Salud</CardTitle>
            <AlertTriangle className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingAlerts.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Próximos 7 días
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_.65fr]">
        <Card className="field-card">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="field-kicker">Producción</p>
                <CardTitle className="mt-1 text-lg font-medium">Litros de leche · 30 días</CardTitle>
              </div>
              <Link href="/produccion" className="text-muted-foreground hover:text-primary" aria-label="Ver producción" data-testid="link-dashboard-production"><ArrowUpRight className="h-4 w-4" /></Link>
            </div>
          </CardHeader>
          <CardContent className="h-[300px]">
            {milkChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={milkChartData}>
                  <XAxis dataKey="fecha" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Line type="monotone" dataKey="litros" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--primary))' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No hay datos de producción recientes
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="field-card">
          <CardHeader>
            <div>
              <p className="field-kicker">Inventario</p>
              <CardTitle className="mt-1 text-lg font-medium">Distribución del rebaño</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="h-[300px]">
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData}>
                  <XAxis dataKey="categoria" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="cantidad" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No hay animales registrados
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="field-card">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="field-kicker">Atención requerida</p>
                <CardTitle className="mt-1 text-lg font-medium">Alertas sanitarias · 7 días</CardTitle>
              </div>
              <Link href="/salud" className="text-muted-foreground hover:text-primary" aria-label="Ver salud" data-testid="link-dashboard-health"><ClipboardList className="h-4 w-4" /></Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingAlerts.length > 0 ? (
              <div className="space-y-4">
                {upcomingAlerts.map(alerta => {
                  const animal = animales.find(a => a.id === alerta.animalId);
                  return (
                    <div key={alerta.id} className="flex justify-between items-center p-3 border rounded-md">
                      <div>
                        <div className="font-medium">{alerta.tipo.toUpperCase()}</div>
                        <div className="text-sm text-muted-foreground">
                          {animal ? <Link href={`/animales/${animal.id}`} className="hover:underline font-mono">{animal.codigo} - {animal.nombre || animal.apodo}</Link> : 'Animal no encontrado'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-destructive">{new Date(alerta.proximaFecha!).toLocaleDateString()}</div>
                        <div className="text-xs text-muted-foreground">{alerta.producto || alerta.diagnostico}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-6 text-muted-foreground border border-dashed rounded-md">
                No hay alertas sanitarias próximas.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="field-card">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="field-kicker">Calendario</p>
                <CardTitle className="mt-1 text-lg font-medium">Próximos partos</CardTitle>
              </div>
              <Link href="/reproduccion" className="text-muted-foreground hover:text-primary" aria-label="Ver reproducción" data-testid="link-dashboard-reproduction"><MapPinned className="h-4 w-4" /></Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingBirths.length > 0 ? (
              <div className="space-y-4">
                {upcomingBirths.map((b, i) => (
                  <div key={i} className="flex justify-between items-center p-3 border rounded-md">
                    <div>
                      <div className="font-medium">
                        {b.hembra ? <Link href={`/animales/${b.hembra.id}`} className="hover:underline font-mono">{b.hembra.codigo} - {b.hembra.nombre || b.hembra.apodo}</Link> : 'Animal no encontrado'}
                      </div>
                      <div className="text-sm text-muted-foreground capitalize">
                        Monta: {new Date(b.monta.fecha).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-accent">Estimado: {b.expected.toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-6 text-muted-foreground border border-dashed rounded-md">
                No hay partos próximos registrados.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
