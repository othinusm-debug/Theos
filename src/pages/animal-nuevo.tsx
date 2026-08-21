import React from 'react';
import { useAnimal, useAnimales, usePotreros, crearAnimal } from '@/lib/repo';
import { useFincaActual } from '@/lib/finca-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { ESPECIES, RAZAS_POR_ESPECIE } from '@/lib/catalogo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generarCodigo } from '@/lib/numeracion';

const animalSchema = z.object({
  codigo: z.string().min(1, "El código es requerido"),
  nombre: z.string().optional(),
  apodo: z.string().optional(),
  especie: z.enum(['bovino', 'bufalino', 'equino', 'asnal', 'mular', 'porcino', 'ovino', 'caprino']),
  raza: z.string().optional(),
  subraza: z.string().optional(),
  sexo: z.enum(['macho', 'hembra']),
  fechaNacimiento: z.string().optional(),
  fechaNacimientoEstimada: z.boolean().default(false),
  color: z.string().optional(),
  hierro: z.string().optional(),
  pesoNacimientoKg: z.coerce.number().optional(),
  padreId: z.string().optional(),
  madreId: z.string().optional(),
  potreroActualId: z.string().optional(),
  observaciones: z.string().optional(),
});

type AnimalFormValues = z.infer<typeof animalSchema>;

export default function AnimalNuevo() {
  const [_, setLocation] = useLocation();
  const { finca } = useFincaActual();
  const animales = useAnimales(finca?.id);
  const potreros = usePotreros(finca?.id);
  const { toast } = useToast();

  const form = useForm<AnimalFormValues>({
    resolver: zodResolver(animalSchema),
    defaultValues: {
      codigo: '',
      especie: 'bovino',
      sexo: 'hembra',
      fechaNacimientoEstimada: false,
    }
  });

  const especieWatch = form.watch('especie');
  const razas = RAZAS_POR_ESPECIE[especieWatch as keyof typeof RAZAS_POR_ESPECIE] || [];
  
  const machos = animales?.filter(a => a.sexo === 'macho' && a.especie === especieWatch) || [];
  const hembras = animales?.filter(a => a.sexo === 'hembra' && a.especie === especieWatch) || [];

  const handleGenerateCode = () => {
    if (!finca?.esquemaNumeracion) return;
    const code = generarCodigo(finca.esquemaNumeracion, { especie: especieWatch });
    if (code) form.setValue('codigo', code);
  };

  const onSubmit = async (data: AnimalFormValues) => {
    if (!finca) return;

    try {
      const nuevo = await crearAnimal({
        ...data,
        padreId: data.padreId === 'none' ? undefined : data.padreId,
        madreId: data.madreId === 'none' ? undefined : data.madreId,
        potreroActualId: data.potreroActualId === 'none' ? undefined : data.potreroActualId,
        fincaId: finca.id,
        estado: 'vivo',
        estadoReproductivoHembra: data.sexo === 'hembra' ? 'vacia' : undefined,
        estadoReproductivoMacho: data.sexo === 'macho' ? 'entero' : undefined,
      });
      toast({ title: 'Animal registrado', description: `El animal ${nuevo.codigo} ha sido registrado.` });
      setLocation(`/animales/${nuevo.id}`);
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'No se pudo registrar el animal.';
      if (mensaje.toLowerCase().includes('código')) form.setError('codigo', { type: 'manual', message: mensaje });
      toast({ title: 'No se pudo registrar', description: mensaje, variant: 'destructive' });
    }
  };

  return (
    <div className="field-shell p-4 md:p-8 space-y-6 field-rise">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation('/animales')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">Nuevo Animal</h1>
          <p className="text-muted-foreground">Ingresar un nuevo individuo al rebaño</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader><CardTitle>Identificación</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="codigo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Código (Arete/Chapeta) *</FormLabel>
                  <div className="flex gap-2">
                    <FormControl><Input {...field} className="font-mono uppercase" /></FormControl>
                    <Button type="button" variant="secondary" onClick={handleGenerateCode}>Auto</Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="nombre" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Oficial</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="apodo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apodo</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Características</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="especie" render={({ field }) => (
                <FormItem>
                  <FormLabel>Especie *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {ESPECIES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="sexo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sexo *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="hembra">Hembra</SelectItem>
                      <SelectItem value="macho">Macho</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="raza" render={({ field }) => (
                <FormItem>
                  <FormLabel>Raza</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccione o escriba" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">-- Ninguna --</SelectItem>
                      {razas.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="color" render={({ field }) => (
                <FormItem>
                  <FormLabel>Color / Pelaje</FormLabel>
                  <FormControl><Input {...field} placeholder="Ej. Barcino, Hosco, Negro" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Nacimiento y Origen</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <FormField control={form.control} name="fechaNacimiento" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Nacimiento</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="fechaNacimientoEstimada" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Edad estimada</FormLabel>
                      <FormDescription>Marque si no conoce la fecha exacta de nacimiento</FormDescription>
                    </div>
                  </FormItem>
                )} />
              </div>

              <div className="space-y-4">
                <FormField control={form.control} name="pesoNacimientoKg" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peso al nacer (kg)</FormLabel>
                    <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="padreId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Padre</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Ninguno" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">-- Ninguno --</SelectItem>
                          {machos.map(m => <SelectItem key={m.id} value={m.id}>{m.codigo} - {m.nombre || m.apodo}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="madreId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Madre</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Ninguna" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">-- Ninguna --</SelectItem>
                          {hembras.map(m => <SelectItem key={m.id} value={m.id}>{m.codigo} - {m.nombre || m.apodo}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Ubicación y Otros</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="potreroActualId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Potrero Actual</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un potrero" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">-- Sin potrero --</SelectItem>
                      {potreros?.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="hierro" render={({ field }) => (
                <FormItem>
                  <FormLabel>Hierro (Marca)</FormLabel>
                  <FormControl><Input {...field} placeholder="Describa el hierro..." /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="observaciones" render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Observaciones adicionales</FormLabel>
                  <FormControl><Textarea {...field} className="min-h-[100px]" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => setLocation('/animales')}>Cancelar</Button>
            <Button type="submit" disabled={form.formState.isSubmitting} className="gap-2"><Save className="w-4 h-4" /> {form.formState.isSubmitting ? 'Guardando...' : 'Guardar Animal'}</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
