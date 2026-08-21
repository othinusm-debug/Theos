import React, { useState } from 'react';
import { usePotreros, crearPotrero, actualizarPotrero, eliminarPotrero, useAnimales } from '@/lib/repo';
import { useFincaActual } from '@/lib/finca-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Map, Plus, Trash2, Pencil, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/hooks/use-confirm';
import type { Potrero } from '@/lib/types';

export default function Potreros() {
  const { fincaId, finca } = useFincaActual();
  const potreros = usePotreros(fincaId);
  const { toast } = useToast();
  const confirm = useConfirm();
  const animales = useAnimales(fincaId);

  const [nuevoNombre, setNuevoNombre] = useState('');
  const [hectareas, setHectareas] = useState('');
  const [capacidad, setCapacidad] = useState('');

  const [editando, setEditando] = useState<Potrero | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editHectareas, setEditHectareas] = useState('');
  const [editCapacidad, setEditCapacidad] = useState('');

  const [procesando, setProcesando] = useState(false);

  if (!potreros) return <div className="p-8 text-center text-muted-foreground">Cargando potreros...</div>;

  if (!finca) {
    return (
      <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg m-4 md:m-8">
        Primero debes crear una finca en la sección "Fincas" para poder registrar potreros.
      </div>
    );
  }

  const handleCrear = async () => {
    if (!nuevoNombre || procesando) return;
    setProcesando(true);
    try {
      await crearPotrero({
        fincaId: finca.id,
        nombre: nuevoNombre,
        hectareas: Number(hectareas) || undefined,
        capacidad: Number(capacidad) || undefined,
      });
      setNuevoNombre(''); setHectareas(''); setCapacidad('');
      toast({ title: 'Potrero creado' });
    } catch {
      toast({ title: 'Error al crear', variant: 'destructive' });
    } finally {
      setProcesando(false);
    }
  };

  const abrirEdicion = (p: Potrero) => {
    setEditando(p);
    setEditNombre(p.nombre);
    setEditHectareas(p.hectareas?.toString() ?? '');
    setEditCapacidad(p.capacidad?.toString() ?? '');
  };

  const handleGuardarEdicion = async () => {
    if (!editando || !editNombre || procesando) return;
    setProcesando(true);
    try {
      await actualizarPotrero(editando.id, {
        nombre: editNombre,
        hectareas: Number(editHectareas) || undefined,
        capacidad: Number(editCapacidad) || undefined,
      });
      toast({ title: 'Potrero actualizado' });
      setEditando(null);
    } catch (e) {
      toast({ title: 'No se pudo guardar', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setProcesando(false);
    }
  };

  const handleDelete = async (id: string, nombre: string) => {
    const nAnimales = (animales || []).filter(a => a.potreroActualId === id).length;
    const ok = await confirm({
      title: `¿Eliminar el potrero "${nombre}"?`,
      description: nAnimales > 0
        ? `${nAnimales} animal${nAnimales === 1 ? '' : 'es'} está${nAnimales === 1 ? '' : 'n'} asignado${nAnimales === 1 ? '' : 's'} ahí y quedará${nAnimales === 1 ? '' : 'n'} sin potrero. El historial de movimientos no se borra.`
        : 'No hay animales asignados ahí en este momento.',
      confirmLabel: 'Eliminar potrero',
      destructive: true,
    });
    if (ok) {
      await eliminarPotrero(id);
      toast({ title: 'Potrero eliminado' });
    }
  };

  return (
    <div className="field-shell p-4 md:p-8 space-y-6 field-rise">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-serif">Potreros</h1>
          <p className="text-muted-foreground">Gestión de áreas de pastoreo</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2"/> Nuevo Potrero</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Crear Potrero</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Nombre / Identificador</Label>
                <Input value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} placeholder="Ej. Lote 4, Potrero Central..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Hectáreas (opcional)</Label>
                  <Input type="number" step="0.1" value={hectareas} onChange={e => setHectareas(e.target.value)} />
                </div>
                <div>
                  <Label>Capacidad — cabezas (opcional)</Label>
                  <Input type="number" step="1" value={capacidad} onChange={e => setCapacidad(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                La capacidad es la que vos conocés de tu campo — THEOS solo la usa para avisarte
                si un potrero queda con más animales de los que indicaste, no la calcula sola.
              </p>
              <Button onClick={handleCrear} className="w-full">Guardar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {potreros.map(p => {
          const ocupacion = animales?.filter(a => a.estado === 'vivo' && a.potreroActualId === p.id).length || 0;
          const sobrecargado = p.capacidad !== undefined && ocupacion > p.capacidad;
          return (
            <Card key={p.id} className={`hover-elevate ${sobrecargado ? 'border-destructive/50' : ''}`}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-secondary/10 rounded-lg text-secondary">
                    <Map className="w-6 h-6" />
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => abrirEdicion(p)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(p.id, p.nombre)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-1">{p.nombre}</h3>
                <div className="flex justify-between items-center text-sm text-muted-foreground mt-4 border-t pt-4">
                  <span>{p.hectareas ? `${p.hectareas} ha` : 'Superficie n/a'}</span>
                  <span className="font-medium text-foreground">
                    {ocupacion}{p.capacidad !== undefined ? ` / ${p.capacidad}` : ''} animales
                  </span>
                </div>
                {sobrecargado && (
                  <div className="flex items-center gap-1.5 text-xs text-destructive mt-2">
                    <AlertTriangle className="w-3.5 h-3.5" /> Por encima de la capacidad indicada
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {potreros.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            No hay potreros registrados en esta finca.
          </div>
        )}
      </div>

      <Dialog open={!!editando} onOpenChange={(open) => !open && setEditando(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Potrero</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Nombre / Identificador</Label>
              <Input value={editNombre} onChange={e => setEditNombre(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Hectáreas (opcional)</Label>
                <Input type="number" step="0.1" value={editHectareas} onChange={e => setEditHectareas(e.target.value)} />
              </div>
              <div>
                <Label>Capacidad — cabezas (opcional)</Label>
                <Input type="number" step="1" value={editCapacidad} onChange={e => setEditCapacidad(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleGuardarEdicion} className="w-full">Guardar Cambios</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
