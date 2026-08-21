import React, { useState } from 'react';
import { 
  useMovimientosFinancieros, 
  registrarMovimientoFinanciero, 
  eliminarMovimientoFinanciero 
} from '@/lib/repo';
import { useFincaActual } from '@/lib/finca-context';
import { 
  Tabs, TabsContent, TabsList, TabsTrigger 
} from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Plus, Download, TrendingUp, TrendingDown, DollarSign, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/hooks/use-confirm';
import { format } from 'date-fns';

const movimientoSchema = z.object({
  tipo: z.enum(['ingreso', 'egreso']),
  categoria: z.string().min(1, "La categoría es requerida"),
  monto: z.coerce.number().positive("El monto debe ser positivo"),
  moneda: z.string().default('USD'),
  fecha: z.string().min(1, "La fecha es requerida"),
  descripcion: z.string().optional(),
});

type MovimientoFormValues = z.infer<typeof movimientoSchema>;

const CAT_INGRESO = ['venta_animal', 'venta_leche', 'subsidio', 'otro_ingreso'];
const CAT_EGRESO = ['salud', 'alimentacion', 'insumos', 'nomina', 'infraestructura', 'otro_egreso'];
const COLORES = ['#10b981', '#f43f5e', '#3b82f6', '#f59e0b', '#8b5cf6', '#8b5cf6'];

export default function Finanzas() {
  const { fincaId } = useFincaActual();
  const movimientos = useMovimientosFinancieros(fincaId) || [];
  const { toast } = useToast();
  const confirm = useConfirm();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroMes, setFiltroMes] = useState('todos');

  const form = useForm<MovimientoFormValues>({
    resolver: zodResolver(movimientoSchema),
    defaultValues: {
      tipo: 'egreso',
      categoria: '',
      monto: 0,
      moneda: 'USD',
      fecha: new Date().toISOString().slice(0, 10),
      descripcion: '',
    }
  });

  const watchTipo = form.watch('tipo');

  const onSubmit = async (data: MovimientoFormValues) => {
    if (!fincaId) return;
    try {
      await registrarMovimientoFinanciero({
        fincaId,
        tipo: data.tipo,
        categoria: data.categoria as any,
        monto: data.monto,
        moneda: data.moneda,
        fecha: data.fecha,
        descripcion: data.descripcion,
      });
      toast({ title: 'Movimiento registrado' });
      setIsDialogOpen(false);
      form.reset();
    } catch (e) {
      toast({ title: 'Error al registrar', variant: 'destructive' });
    }
  };

  const handleEliminar = async (id: string) => {
    const ok = await confirm({
      title: '¿Eliminar este movimiento?',
      description: 'El movimiento financiero se borrará permanentemente y saldrá de los totales y gráficos.',
      confirmLabel: 'Eliminar movimiento',
      destructive: true,
    });
    if (ok) {
      await eliminarMovimientoFinanciero(id);
      toast({ title: 'Movimiento eliminado' });
    }
  };

  const handleExportCSV = () => {
    const cabeceras = "Fecha,Tipo,Categoría,Descripción,Monto,Moneda\n";
    const filas = movimientos.map(m => 
      `${m.fecha},${m.tipo},${m.categoria},"${m.descripcion || ''}",${m.monto},${m.moneda}`
    ).join("\n");
    
    const blob = new Blob([cabeceras + filas], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finanzas_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // KPI calculations
  const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + m.monto, 0);
  const totalEgresos = movimientos.filter(m => m.tipo === 'egreso').reduce((acc, m) => acc + m.monto, 0);
  const balanceNeto = totalIngresos - totalEgresos;

  // Chart data
  const dataPorMes = movimientos.reduce((acc, m) => {
    const mes = m.fecha.slice(0, 7); // YYYY-MM
    if (!acc[mes]) acc[mes] = { name: mes, Ingresos: 0, Egresos: 0 };
    if (m.tipo === 'ingreso') acc[mes].Ingresos += m.monto;
    else acc[mes].Egresos += m.monto;
    return acc;
  }, {} as Record<string, any>);
  const chartBarData = Object.values(dataPorMes).sort((a, b) => a.name.localeCompare(b.name));

  const dataPorCategoria = movimientos.reduce((acc, m) => {
    if (!acc[m.categoria]) acc[m.categoria] = 0;
    acc[m.categoria] += m.monto;
    return acc;
  }, {} as Record<string, number>);
  const chartPieData = Object.entries(dataPorCategoria)
    .map(([name, value]) => ({ name: name.replace('_', ' '), value }))
    .sort((a, b) => b.value - a.value);

  // Filtered movements for table
  const movimientosFiltrados = movimientos.filter(m => {
    if (filtroTipo !== 'todos' && m.tipo !== filtroTipo) return false;
    if (filtroMes !== 'todos' && !m.fecha.startsWith(filtroMes)) return false;
    return true;
  }).sort((a, b) => b.fecha.localeCompare(a.fecha));

  const mesesDisponibles = Array.from(new Set(movimientos.map(m => m.fecha.slice(0, 7)))).sort().reverse();

  return (
    <div className="field-shell p-4 md:p-8 space-y-6 field-rise">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">Finanzas</h1>
          <p className="text-muted-foreground">Control de ingresos y egresos de la finca</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> Nuevo Movimiento</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar Movimiento</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="tipo" render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Tipo de Movimiento</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="ingreso" /></FormControl>
                            <FormLabel className="font-normal text-green-600">Ingreso</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="egreso" /></FormControl>
                            <FormLabel className="font-normal text-red-600">Egreso</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="categoria" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoría</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {(watchTipo === 'ingreso' ? CAT_INGRESO : CAT_EGRESO).map(c => (
                              <SelectItem key={c} value={c} className="capitalize">{c.replace('_', ' ')}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="fecha" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="monto" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monto</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="moneda" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Moneda</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="descripcion" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción (Opcional)</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Guardando...' : 'Guardar'}</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="resumen" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md bg-muted">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
          <TabsTrigger value="exportar">Exportar</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Totales</CardTitle>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">${totalIngresos.toLocaleString(undefined, {minimumFractionDigits:2})}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Egresos Totales</CardTitle>
                <TrendingDown className="w-4 h-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">${totalEgresos.toLocaleString(undefined, {minimumFractionDigits:2})}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Balance Neto</CardTitle>
                <DollarSign className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${balanceNeto >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  ${balanceNeto.toLocaleString(undefined, {minimumFractionDigits:2})}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Ingresos vs Egresos</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {chartBarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartBarData}>
                      <XAxis dataKey="name" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                      <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip formatter={(value) => `$${value}`} />
                      <Legend />
                      <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Egresos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">No hay datos</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gastos por Categoría</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {chartPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORES[index % COLORES.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `$${value}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">No hay datos</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="movimientos" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <CardTitle>Registro de Movimientos</CardTitle>
                <div className="flex gap-2">
                  <Select value={filtroMes} onValueChange={setFiltroMes}>
                    <SelectTrigger className="w-[140px] h-9">
                      <SelectValue placeholder="Mes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los meses</SelectItem>
                      {mesesDisponibles.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                    <SelectTrigger className="w-[140px] h-9">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="ingreso">Ingresos</SelectItem>
                      <SelectItem value="egreso">Egresos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimientosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No hay movimientos registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    movimientosFiltrados.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="whitespace-nowrap">{m.fecha}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={m.tipo === 'ingreso' ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200'}>
                            {m.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{m.categoria.replace('_', ' ')}</TableCell>
                        <TableCell>{m.descripcion || '-'}</TableCell>
                        <TableCell className={`text-right font-medium ${m.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                          {m.tipo === 'ingreso' ? '+' : '-'}${m.monto.toFixed(2)} {m.moneda}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleEliminar(m.id)}>
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exportar" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Exportar Datos</CardTitle>
              <CardDescription>
                Descargue un archivo CSV con el historial completo de movimientos financieros para importarlo en Excel u otros sistemas contables.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleExportCSV} className="gap-2">
                <Download className="w-4 h-4" />
                Descargar CSV
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
