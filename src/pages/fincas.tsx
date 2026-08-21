import React, { useState } from 'react';
import { crearFinca, eliminarFinca, resumenBorradoFinca } from '@/lib/repo';
import { useFincaActual } from '@/lib/finca-context';
import { useConfirm } from '@/hooks/use-confirm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Building, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function Fincas() {
  const { fincas, fincaId: fincaActivaId, seleccionarFinca } = useFincaActual();
  const { toast } = useToast();
  const confirm = useConfirm();
  
  const [nombre, setNombre] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [hectareas, setHectareas] = useState('');
  const [tipoEsquema, setTipoEsquema] = useState('consecutivo');
  const [procesando, setProcesando] = useState(false);

  const handleCrear = async () => {
    if (!nombre || procesando) return;
    setProcesando(true);
    try {
      await crearFinca({
        nombre, ubicacion, hectareasTotales: Number(hectareas) || undefined,
        esquemaNumeracion: { tipo: tipoEsquema as any, siguienteConsecutivo: 1 }
      });
      toast({ title: 'Finca creada exitosamente' });
      setNombre(''); setUbicacion(''); setHectareas('');
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setProcesando(false);
    }
  };

  const handleDelete = async (id: string, nombre: string) => {
    const resumen = await resumenBorradoFinca(id);
    const ok = await confirm({
      title: `¿Eliminar la finca "${nombre}"?`,
      description: (
        <div className="space-y-2 text-sm">
          <p>Esto borra permanentemente y no se puede deshacer:</p>
          <ul className="list-disc space-y-0.5 pl-5">
            <li>{resumen.animales} animal{resumen.animales === 1 ? '' : 'es'} y todos sus registros (pesos, salud, reproducción, fotos)</li>
            <li>{resumen.potreros} potrero{resumen.potreros === 1 ? '' : 's'}</li>
            <li>{resumen.empleados} empleado{resumen.empleados === 1 ? '' : 's'} y sus recibos de pago</li>
            <li>{resumen.movimientosFinancieros} movimiento{resumen.movimientosFinancieros === 1 ? '' : 's'} financiero{resumen.movimientosFinancieros === 1 ? '' : 's'}</li>
          </ul>
        </div>
      ),
      confirmLabel: 'Eliminar finca',
      destructive: true,
    });
    if (ok) {
      await eliminarFinca(id);
      toast({ title: 'Finca eliminada' });
    }
  };

  return (
    <div className="field-shell p-4 md:p-8 space-y-6 field-rise">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-serif">Fincas</h1>
          <p className="text-muted-foreground">Unidades de producción y configuración</p>
        </div>
        <Dialog>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2"/> Nueva Finca</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Finca</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div><label className="text-sm font-medium">Nombre</label><Input value={nombre} onChange={e=>setNombre(e.target.value)} /></div>
              <div><label className="text-sm font-medium">Ubicación</label><Input value={ubicacion} onChange={e=>setUbicacion(e.target.value)} /></div>
              <div><label className="text-sm font-medium">Hectáreas</label><Input type="number" value={hectareas} onChange={e=>setHectareas(e.target.value)} /></div>
              <div>
                <label className="text-sm font-medium">Esquema de Numeración (Aretes)</label>
                <Select value={tipoEsquema} onValueChange={setTipoEsquema}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consecutivo">Consecutivo simple (0001, 0002...)</SelectItem>
                    <SelectItem value="por_anio">Por Año (26-001...)</SelectItem>
                    <SelectItem value="prefijo_especie">Prefijo Especie (BOV-001...)</SelectItem>
                    <SelectItem value="basado_en_madre">Basado en Madre</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleCrear} disabled={procesando}>{procesando ? 'Guardando...' : 'Guardar'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {fincas.map(f => {
          const esActiva = f.id === fincaActivaId;
          return (
            <Card key={f.id} className={`relative overflow-hidden ${esActiva ? 'ring-2 ring-primary' : ''}`}>
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Building className="w-32 h-32" />
              </div>
              <CardHeader className="flex flex-row justify-between items-start z-10 relative">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-2xl font-serif text-primary">{f.nombre}</CardTitle>
                    {esActiva && (
                      <Badge className="gap-1"><CheckCircle2 className="w-3 h-3" /> Activa</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-1">{f.ubicacion || 'Sin ubicación registrada'}</p>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(f.id, f.nombre)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="z-10 relative space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted p-3 rounded-md">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Extensión</div>
                    <div className="font-medium">{f.hectareasTotales ? `${f.hectareasTotales} ha` : '-'}</div>
                  </div>
                  <div className="bg-muted p-3 rounded-md">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Numeración</div>
                    <div className="font-medium capitalize">{f.esquemaNumeracion.tipo.replace(/_/g, ' ')}</div>
                  </div>
                </div>
                {!esActiva && (
                  <Button variant="outline" className="w-full" onClick={() => seleccionarFinca(f.id)}>
                    Usar esta finca
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
