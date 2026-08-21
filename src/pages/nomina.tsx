import React, { useState } from 'react';
import { 
  useEmpleados, 
  useRecibosPago, 
  crearEmpleado, 
  actualizarEmpleado, 
  eliminarEmpleado, 
  crearReciboPago, 
  eliminarReciboPago 
} from '@/lib/repo';
import { useFincaActual } from '@/lib/finca-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Users, Receipt, Trash2, Edit2, UserCheck, UserX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/hooks/use-confirm';

const empleadoSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  cargo: z.string().optional(),
  salarioBase: z.coerce.number().min(0, "Debe ser mayor o igual a 0"),
  moneda: z.string().default('USD'),
  activo: z.boolean().default(true),
});

const reciboSchema = z.object({
  empleadoId: z.string().min(1, "Seleccione un empleado"),
  periodoDesde: z.string().min(1, "Fecha requerida"),
  periodoHasta: z.string().min(1, "Fecha requerida"),
  salarioBase: z.coerce.number().min(0),
  bonificaciones: z.coerce.number().default(0),
  deducciones: z.coerce.number().default(0),
  observaciones: z.string().optional(),
});

type EmpleadoForm = z.infer<typeof empleadoSchema>;
type ReciboForm = z.infer<typeof reciboSchema>;

export default function Nomina() {
  const { fincaId } = useFincaActual();
  const empleados = useEmpleados(fincaId) || [];
  const recibos = useRecibosPago(fincaId) || [];
  const { toast } = useToast();
  const confirm = useConfirm();

  const [openEmpDialog, setOpenEmpDialog] = useState(false);
  const [openRecDialog, setOpenRecDialog] = useState(false);
  const [empleadoEditando, setEmpleadoEditando] = useState<string | null>(null);

  const formEmp = useForm<EmpleadoForm>({
    resolver: zodResolver(empleadoSchema),
    defaultValues: { nombre: '', cargo: '', salarioBase: 0, moneda: 'USD', activo: true }
  });

  const formRec = useForm<ReciboForm>({
    resolver: zodResolver(reciboSchema),
    defaultValues: { empleadoId: '', periodoDesde: '', periodoHasta: '', salarioBase: 0, bonificaciones: 0, deducciones: 0, observaciones: '' }
  });

  // Empleado auto-fill for Receipt
  const recEmpleadoId = formRec.watch('empleadoId');
  React.useEffect(() => {
    if (recEmpleadoId) {
      const emp = empleados.find(e => e.id === recEmpleadoId);
      if (emp) formRec.setValue('salarioBase', emp.salarioBase);
    }
  }, [recEmpleadoId, empleados, formRec]);

  // Recibo totalNeto preview
  const recBase = formRec.watch('salarioBase') || 0;
  const recBonif = formRec.watch('bonificaciones') || 0;
  const recDeduc = formRec.watch('deducciones') || 0;
  const totalNetoPrev = recBase + recBonif - recDeduc;

  const onSubmitEmpleado = async (data: EmpleadoForm) => {
    if (!fincaId) return;
    try {
      if (empleadoEditando) {
        await actualizarEmpleado(empleadoEditando, data);
        toast({ title: 'Empleado actualizado' });
      } else {
        await crearEmpleado({ fincaId, ...data });
        toast({ title: 'Empleado registrado' });
      }
      setOpenEmpDialog(false);
      formEmp.reset();
      setEmpleadoEditando(null);
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const onSubmitRecibo = async (data: ReciboForm) => {
    if (!fincaId) return;
    const emp = empleados.find(e => e.id === data.empleadoId);
    if (!emp) return;
    try {
      await crearReciboPago({
        fincaId,
        empleadoId: data.empleadoId,
        periodoDesde: data.periodoDesde,
        periodoHasta: data.periodoHasta,
        salarioBase: data.salarioBase,
        bonificaciones: data.bonificaciones,
        deducciones: data.deducciones,
        totalNeto: data.salarioBase + data.bonificaciones - data.deducciones,
        moneda: emp.moneda,
        observaciones: data.observaciones,
      });
      toast({ title: 'Recibo creado' });
      setOpenRecDialog(false);
      formRec.reset();
    } catch {
      toast({ title: 'Error al crear recibo', variant: 'destructive' });
    }
  };

  const handleEditEmpleado = (emp: any) => {
    setEmpleadoEditando(emp.id);
    formEmp.reset({ nombre: emp.nombre, cargo: emp.cargo || '', salarioBase: emp.salarioBase, moneda: emp.moneda, activo: emp.activo });
    setOpenEmpDialog(true);
  };

  const handleEliminarEmpleado = async (id: string) => {
    const ok = await confirm({
      title: '¿Eliminar este empleado?',
      description: 'Si no tiene recibos de pago generados, se borra su ficha. Si ya tiene recibos, en vez de borrarlo queda marcado como inactivo (para no perder el historial de pagos).',
      confirmLabel: 'Eliminar empleado',
      destructive: true,
    });
    if (ok) {
      await eliminarEmpleado(id);
      toast({ title: 'Empleado eliminado' });
    }
  };

  const handleEliminarRecibo = async (id: string) => {
    const ok = await confirm({
      title: '¿Eliminar este recibo?',
      description: 'El recibo de pago se borrará permanentemente.',
      confirmLabel: 'Eliminar recibo',
      destructive: true,
    });
    if (ok) {
      await eliminarReciboPago(id);
      toast({ title: 'Recibo eliminado' });
    }
  };

  return (
    <div className="field-shell p-4 md:p-8 space-y-6 field-rise">
      <div>
        <h1 className="text-3xl font-bold font-serif tracking-tight">Nómina y Personal</h1>
        <p className="text-muted-foreground">Gestión de empleados y recibos de pago</p>
      </div>

      <Tabs defaultValue="empleados" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-sm bg-muted">
          <TabsTrigger value="empleados" className="gap-2"><Users className="w-4 h-4"/> Empleados</TabsTrigger>
          <TabsTrigger value="recibos" className="gap-2"><Receipt className="w-4 h-4"/> Recibos de Pago</TabsTrigger>
        </TabsList>

        <TabsContent value="empleados" className="mt-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Personal</h2>
            <Dialog open={openEmpDialog} onOpenChange={o => { setOpenEmpDialog(o); if(!o) { formEmp.reset(); setEmpleadoEditando(null); } }}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4"/> Nuevo Empleado</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{empleadoEditando ? 'Editar' : 'Nuevo'} Empleado</DialogTitle></DialogHeader>
                <Form {...formEmp}>
                  <form onSubmit={formEmp.handleSubmit(onSubmitEmpleado)} className="space-y-4 pt-4">
                    <FormField control={formEmp.control} name="nombre" render={({ field }) => (
                      <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={formEmp.control} name="cargo" render={({ field }) => (
                      <FormItem><FormLabel>Cargo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={formEmp.control} name="salarioBase" render={({ field }) => (
                        <FormItem><FormLabel>Salario Base</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={formEmp.control} name="moneda" render={({ field }) => (
                        <FormItem><FormLabel>Moneda</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={formEmp.control} name="activo" render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormLabel className="font-normal">Empleado Activo</FormLabel>
                      </FormItem>
                    )} />
                    <Button type="submit" disabled={formEmp.formState.isSubmitting} className="w-full">{formEmp.formState.isSubmitting ? 'Guardando...' : 'Guardar'}</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {empleados.map(emp => (
              <Card key={emp.id} className={!emp.activo ? 'opacity-60 bg-muted/50' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{emp.nombre}</CardTitle>
                    {emp.activo ? <UserCheck className="w-5 h-5 text-green-600"/> : <UserX className="w-5 h-5 text-muted-foreground"/>}
                  </div>
                  <p className="text-sm text-muted-foreground">{emp.cargo || 'Sin cargo especificado'}</p>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${emp.salarioBase} <span className="text-sm font-normal text-muted-foreground">{emp.moneda}</span></div>
                </CardContent>
                <CardFooter className="pt-2 border-t mt-4 gap-2 flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => handleEditEmpleado(emp)}><Edit2 className="w-4 h-4 mr-2"/> Editar</Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleEliminarEmpleado(emp.id)}><Trash2 className="w-4 h-4"/></Button>
                </CardFooter>
              </Card>
            ))}
            {empleados.length === 0 && <div className="col-span-full py-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">No hay empleados registrados.</div>}
          </div>
        </TabsContent>

        <TabsContent value="recibos" className="mt-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Historial de Pagos</h2>
            <Dialog open={openRecDialog} onOpenChange={o => { setOpenRecDialog(o); if(!o) formRec.reset(); }}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4"/> Nuevo Recibo</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Crear Recibo de Pago</DialogTitle></DialogHeader>
                <Form {...formRec}>
                  <form onSubmit={formRec.handleSubmit(onSubmitRecibo)} className="space-y-4 pt-4">
                    <FormField control={formRec.control} name="empleadoId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Empleado</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Seleccione empleado" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {empleados.filter(e=>e.activo).map(e => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={formRec.control} name="periodoDesde" render={({ field }) => (
                        <FormItem><FormLabel>Desde</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={formRec.control} name="periodoHasta" render={({ field }) => (
                        <FormItem><FormLabel>Hasta</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    
                    <div className="bg-muted p-4 rounded-lg space-y-3 mt-4">
                      <FormField control={formRec.control} name="salarioBase" render={({ field }) => (
                        <FormItem className="flex items-center justify-between space-y-0">
                          <FormLabel>Salario Base</FormLabel>
                          <FormControl><Input type="number" className="w-32 h-8 text-right" {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={formRec.control} name="bonificaciones" render={({ field }) => (
                        <FormItem className="flex items-center justify-between space-y-0">
                          <FormLabel>Bonificaciones (+)</FormLabel>
                          <FormControl><Input type="number" className="w-32 h-8 text-right text-green-600" {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={formRec.control} name="deducciones" render={({ field }) => (
                        <FormItem className="flex items-center justify-between space-y-0">
                          <FormLabel>Deducciones (-)</FormLabel>
                          <FormControl><Input type="number" className="w-32 h-8 text-right text-red-600" {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <div className="pt-2 mt-2 border-t border-border flex justify-between items-center font-bold">
                        <span>Total Neto:</span>
                        <span className="text-lg">${totalNetoPrev.toFixed(2)}</span>
                      </div>
                    </div>

                    <FormField control={formRec.control} name="observaciones" render={({ field }) => (
                      <FormItem><FormLabel>Observaciones</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                    
                    <Button type="submit" disabled={formRec.formState.isSubmitting} className="w-full">{formRec.formState.isSubmitting ? 'Guardando...' : 'Guardar Recibo'}</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha / Período</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead className="text-right">Salario</TableHead>
                    <TableHead className="text-right text-green-600">Bonif.</TableHead>
                    <TableHead className="text-right text-red-600">Deduc.</TableHead>
                    <TableHead className="text-right font-bold">Total Neto</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...recibos].sort((a,b)=>b.periodoHasta.localeCompare(a.periodoHasta)).map(r => {
                    const emp = empleados.find(e => e.id === r.empleadoId);
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{r.periodoDesde}</div>
                          <div className="text-xs text-muted-foreground">al {r.periodoHasta}</div>
                        </TableCell>
                        <TableCell className="font-medium">{emp?.nombre || 'Desconocido'}</TableCell>
                        <TableCell className="text-right">${r.salarioBase}</TableCell>
                        <TableCell className="text-right text-green-600">${r.bonificaciones}</TableCell>
                        <TableCell className="text-right text-red-600">${r.deducciones}</TableCell>
                        <TableCell className="text-right font-bold">${r.totalNeto} {r.moneda}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleEliminarRecibo(r.id)}>
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {recibos.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No hay recibos de pago.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
