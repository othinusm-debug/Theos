import React from 'react';
import { useAnimalesEliminados, restaurarAnimal, eliminarAnimalDefinitivamente, resumenBorradoAnimal } from '@/lib/repo';
import { useFincaActual } from '@/lib/finca-context';
import { useConfirm } from '@/hooks/use-confirm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Papelera() {
  const { fincaId } = useFincaActual();
  const eliminados = useAnimalesEliminados(fincaId);
  const { toast } = useToast();
  const confirm = useConfirm();

  if (!eliminados) return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;

  const handleRestore = async (id: string, codigo: string) => {
    await restaurarAnimal(id);
    toast({ title: 'Animal restaurado', description: `El animal ${codigo} ha vuelto al inventario activo.` });
  };

  const handlePermanentDelete = async (id: string, codigo: string) => {
    const resumen = await resumenBorradoAnimal(id);
    const items: [number, string][] = [
      [resumen.pesajes, 'pesaje'], [resumen.eventosSalud, 'evento de salud'],
      [resumen.leche, 'registro de producción de leche'], [resumen.montas, 'monta'],
      [resumen.partos, 'parto'], [resumen.ventas, 'venta'], [resumen.muertes, 'registro de muerte'],
      [resumen.movimientos, 'movimiento de potrero'], [resumen.fotos, 'fotografía'],
    ].filter(([n]) => n > 0);
    const ok = await confirm({
      title: `¿Eliminar a ${codigo} permanentemente?`,
      description: (
        <div className="space-y-2 text-sm">
          <p>Esto lo borra a él y todo su historial, sin poder deshacerse:</p>
          {items.length > 0 ? (
            <ul className="list-disc space-y-0.5 pl-5">
              {items.map(([n, label]) => <li key={label}>{n} {label}{n === 1 ? '' : 's'}</li>)}
            </ul>
          ) : (
            <p className="text-muted-foreground">No tiene registros asociados todavía.</p>
          )}
        </div>
      ),
      confirmLabel: 'Eliminar definitivamente',
      destructive: true,
    });
    if (ok) {
      await eliminarAnimalDefinitivamente(id);
      toast({ title: 'Animal eliminado', description: 'Los datos fueron borrados permanentemente.' });
    }
  };

  return (
    <div className="field-shell p-4 md:p-8 space-y-6 field-rise">
      <div>
        <h1 className="text-3xl font-bold font-serif text-destructive">Papelera</h1>
        <p className="text-muted-foreground">Animales descartados. Puede restaurarlos o eliminarlos definitivamente para liberar espacio.</p>
      </div>

      <div className="space-y-4">
        {eliminados.length > 0 ? eliminados.map(a => (
          <Card key={a.id} className="border-destructive/20">
            <CardContent className="flex flex-col sm:flex-row justify-between items-center p-4 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-lg">{a.codigo}</span>
                  <span className="text-muted-foreground">{a.nombre || a.apodo}</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Eliminado el: {a.deletedAt ? new Date(a.deletedAt).toLocaleDateString() : 'Desconocido'}
                  {a.deletedReason && ` — Motivo: ${a.deletedReason}`}
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => handleRestore(a.id, a.codigo)}>
                  <RotateCcw className="w-4 h-4 mr-2" /> Restaurar
                </Button>
                <Button variant="destructive" className="flex-1 sm:flex-none" onClick={() => handlePermanentDelete(a.id, a.codigo)}>
                  <Trash2 className="w-4 h-4 mr-2" /> Borrar
                </Button>
              </div>
            </CardContent>
          </Card>
        )) : (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-card/50">
            <Trash2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg">La papelera está vacía</p>
          </div>
        )}
      </div>
    </div>
  );
}
