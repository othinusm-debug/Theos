import React, { useState } from 'react';
import { useRoute, Link, useLocation } from 'wouter';
import { 
  useAnimal, useAnimales, usePesajes, useEventosSalud, 
  useMontasDeHembra, useRegistrosLeche, usePotreros, usePartosDeMadre, 
  useMovimientosDeAnimal, useVentasDeAnimal, useMuertesDeAnimal, useFotosAnimal,
  registrarPesaje, registrarEventoSalud, registrarMonta, registrarParto,
  registrarLeche, registrarVenta, moverAnimal, registrarMuerte, actualizarResultadoMonta, cambiarEstadoAnimal,
  ErrorConsanguinidad,
} from '@/lib/repo';
import { useFincaActual } from '@/lib/finca-context';
import { calcularEdad } from '@/lib/edad';
import { categoriaAnimal } from '@/lib/catalogo';
import { construirAncestros, hijosDe, hermanosDe } from '@/lib/genealogia';
import { calcularGDP } from '@/lib/repo';
import type { GananciaWeight } from '@/lib/types';
import { resumirProduccion } from '@/lib/produccion';
import { calcularIndicadoresReproductivos } from '@/lib/reproduccion';
import { hoyISO } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Download, Edit, Weight, Activity, Heart, Droplet, Share2, Plus, Clock, Camera, DollarSign, ArrowRightLeft, Skull, Beef } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/hooks/use-confirm';
import { GaleriaFotos } from '@/components/GaleriaFotos';
import { HierroDibujo } from '@/components/HierroDibujo';

export default function AnimalDetalle() {
  const [match, params] = useRoute('/animales/:id');
  const id = params?.id;
  const [, setLocation] = useLocation();
  
  const animal = useAnimal(id);
  const { finca } = useFincaActual();
  const todosAnimales = useAnimales(finca?.id) || [];
  const potreros = usePotreros(finca?.id);
  
  const pesajes = usePesajes(id) || [];
  const eventosSalud = useEventosSalud(id) || [];
  const montas = useMontasDeHembra(id) || [];
  const partos = usePartosDeMadre(id) || [];
  const leche = useRegistrosLeche(id) || [];
  const movimientos = useMovimientosDeAnimal(id) || [];
  const ventas = useVentasDeAnimal(id) || [];
  const muertes = useMuertesDeAnimal(id) || [];
  const fotos = useFotosAnimal(id) || [];
  const pesajesOrdenados = React.useMemo(
    () => [...pesajes].sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [pesajes],
  );
  const eventosSaludOrdenados = React.useMemo(
    () => [...eventosSalud].sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [eventosSalud],
  );
  
  const { toast } = useToast();
  const confirm = useConfirm();
  
  // States for dialogs
  const [pesoNuevo, setPesoNuevo] = useState('');
  const [pesoFecha, setPesoFecha] = useState(hoyISO());
  const [showDibujoHierro, setShowDibujoHierro] = useState(false);
  // Un solo flag para las 9 acciones de esta ficha: evita doble-toque/doble
  // envío en cualquiera de ellas (informe de auditoría externa, punto 3.3 /
  // punto 50 del plan). No hace falta un flag por acción — en la práctica
  // solo un diálogo está abierto/tocable a la vez.
  const [procesando, setProcesando] = useState(false);

  // Reproduccion states
  const [montaFecha, setMontaFecha] = useState(hoyISO());
  const [montaMachoId, setMontaMachoId] = useState('');
  const [montaTipo, setMontaTipo] = useState('natural');
  const [montaObs, setMontaObs] = useState('');

  const [partoFecha, setPartoFecha] = useState(hoyISO());
  const [partoCrias, setPartoCrias] = useState('1');
  const [partoObs, setPartoObs] = useState('');

  // Leche states
  const [lecheFecha, setLecheFecha] = useState(hoyISO());
  const [lecheManana, setLecheManana] = useState('');
  const [lecheTarde, setLecheTarde] = useState('');
  const [lecheObs, setLecheObs] = useState('');

  // Venta states
  const [ventaFecha, setVentaFecha] = useState(hoyISO());
  const [ventaComprador, setVentaComprador] = useState('');
  const [ventaPrecio, setVentaPrecio] = useState('');
  const [ventaMoneda, setVentaMoneda] = useState('USD');
  const [ventaObs, setVentaObs] = useState('');

  // Movimiento de potrero states
  const [movFecha, setMovFecha] = useState(hoyISO());
  const [movPotreroId, setMovPotreroId] = useState('');
  const [movObs, setMovObs] = useState('');

  // Muerte states
  const [muerteFecha, setMuerteFecha] = useState(hoyISO());
  const [muerteCausa, setMuerteCausa] = useState('');
  const [muerteObs, setMuerteObs] = useState('');

  if (!animal || !todosAnimales) return <div className="p-8 animate-pulse text-muted-foreground text-center">Cargando ficha...</div>;

  const edad = calcularEdad(animal.fechaNacimiento);
  const cat = categoriaAnimal(animal.especie, animal.sexo, edad?.totalMeses ?? null);
  const potrero = potreros?.find(p => p.id === animal.potreroActualId);
  
  // Genealogia
  const arbol = construirAncestros(animal, todosAnimales, 2);
  const abueloPat = arbol.padre?.padre?.animal;
  const abuelaPat = arbol.padre?.madre?.animal;
  const abueloMat = arbol.madre?.padre?.animal;
  const abuelaMat = arbol.madre?.madre?.animal;
  
  const padre = arbol.padre?.animal;
  const madre = arbol.madre?.animal;
  const hijos = hijosDe(animal, todosAnimales);
  const hermanos = hermanosDe(animal, todosAnimales);
  const machosDisponibles = todosAnimales.filter(a => a.sexo === 'macho' && a.id !== animal.id);

  const gdp = calcularGDP(pesajes);
  const lecheStats = resumirProduccion(leche);
  const indicadoresReproductivos = calcularIndicadoresReproductivos(animal, partos, montas);

  // Historial Timeline
  const historiaEventos = [
    ...ventas.map(v => ({ id: v.id, date: v.fecha, type: 'venta', color: 'bg-green-500', title: 'Venta', desc: `${v.comprador||'Comprador'} - $${v.precio||0} ${v.moneda||''}` })),
    ...muertes.map(m => ({ id: m.id, date: m.fecha, type: 'muerte', color: 'bg-red-500', title: 'Muerte', desc: m.causa || 'Causa no especificada' })),
    ...movimientos.map(m => ({ 
      id: m.id, date: m.fecha, type: 'movimiento', color: 'bg-blue-500', title: 'Cambio de Potrero', 
      desc: `De: ${potreros?.find(p=>p.id===m.potreroOrigenId)?.nombre||'Desconocido'} a ${potreros?.find(p=>p.id===m.potreroDestinoId)?.nombre||'Desconocido'}` 
    }))
  ].sort((a, b) => b.date.localeCompare(a.date));

  const handleExportPDF = async () => {
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { AnimalDocument } = await import('@/components/AnimalPDF');
      const blob = await pdf(
        <AnimalDocument
          animal={animal}
          fincaNombre={finca?.nombre || ''}
          pesajes={pesajes}
          eventosSalud={eventosSalud}
          fotos={fotos}
          leche={leche}
          montas={montas}
          partos={partos}
          movimientos={movimientos}
          ventas={ventas}
          muertes={muertes}
          padre={padre}
          madre={madre}
          potreroNombre={potrero?.nombre}
        />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ficha_${animal.codigo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({ title: 'Error', description: 'No se pudo generar el PDF', variant: 'destructive' });
    }
  };

  const handleAddPesaje = async () => {
    if (!pesoNuevo || isNaN(Number(pesoNuevo)) || procesando) return;
    setProcesando(true);
    try {
      await registrarPesaje({ animalId: animal.id, pesoKg: Number(pesoNuevo), fecha: pesoFecha });
      setPesoNuevo('');
      toast({ title: 'Pesaje registrado' });
    } catch (e) {
      toast({ title: 'No se pudo registrar', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setProcesando(false);
    }
  };

  const handleAddMonta = async (forzar = false) => {
    if (procesando) return;
    setProcesando(true);
    try {
      await registrarMonta({
        hembraId: animal.id,
        machoId: montaMachoId || undefined,
        fecha: montaFecha,
        tipo: montaTipo as any,
        resultado: 'pendiente',
        observaciones: montaObs,
      }, { confirmarConsanguinidad: forzar });
      toast({ title: 'Monta registrada' });
      setMontaObs('');
    } catch (e) {
      if (e instanceof ErrorConsanguinidad) {
        setProcesando(false);
        const ok = await confirm({
          title: 'Animales emparentados',
          description: e.message,
          confirmLabel: 'Registrar de todas formas',
          destructive: true,
        });
        if (ok) await handleAddMonta(true);
        return;
      }
      toast({ title: 'No se pudo registrar la monta', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setProcesando(false);
    }
  };

  const handleAddParto = async () => {
    if (procesando) return;
    setProcesando(true);
    try {
      await registrarParto({
        madreId: animal.id,
        fecha: partoFecha,
        numCrias: Number(partoCrias),
        criaIds: [],
        observaciones: partoObs,
      });
      toast({ title: 'Parto registrado' });
      setPartoObs('');
    } catch (e) {
      toast({ title: 'No se pudo registrar el parto', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setProcesando(false);
    }
  };

  const handleAddLeche = async () => {
    if ((!lecheManana && !lecheTarde) || procesando) return;
    setProcesando(true);
    try {
      await registrarLeche({
        animalId: animal.id,
        fecha: lecheFecha,
        litrosManana: lecheManana ? Number(lecheManana) : undefined,
        litrosTarde: lecheTarde ? Number(lecheTarde) : undefined,
        observaciones: lecheObs || undefined,
      });
      toast({ title: 'Producción de leche registrada' });
      setLecheManana(''); setLecheTarde(''); setLecheObs('');
    } catch (e) {
      toast({ title: 'No se pudo registrar', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setProcesando(false);
    }
  };

  const handleVender = async () => {
    if (procesando) return;
    setProcesando(true);
    try {
      await registrarVenta({
        animalId: animal.id,
        fecha: ventaFecha,
        comprador: ventaComprador || undefined,
        precio: ventaPrecio ? Number(ventaPrecio) : undefined,
        moneda: ventaMoneda,
        estado: 'completada',
        observaciones: ventaObs || undefined,
      });
      toast({ title: 'Venta registrada', description: ventaPrecio ? 'Se generó el ingreso correspondiente en Finanzas.' : undefined });
      setVentaComprador(''); setVentaPrecio(''); setVentaObs('');
    } catch (e) {
      toast({ title: 'No se pudo registrar la venta', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setProcesando(false);
    }
  };

  const handleMoverPotrero = async () => {
    if (!movPotreroId || procesando) return;
    setProcesando(true);
    try {
      await moverAnimal(animal.id, movPotreroId, movFecha, movObs || undefined);
      toast({ title: 'Movimiento registrado' });
      setMovPotreroId(''); setMovObs('');
    } catch (e) {
      toast({ title: 'No se pudo mover el animal', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setProcesando(false);
    }
  };

  const handleRegistrarMuerte = async () => {
    if (procesando) return;
    setProcesando(true);
    try {
      await registrarMuerte({
        animalId: animal.id,
        fecha: muerteFecha,
        causa: muerteCausa || undefined,
        observaciones: muerteObs || undefined,
      });
      toast({ title: 'Muerte registrada' });
      setMuerteCausa(''); setMuerteObs('');
    } catch (e) {
      toast({ title: 'No se pudo registrar', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setProcesando(false);
    }
  };

  const handleConfirmarMonta = async (montaId: string, resultado: 'gestacion' | 'vacia' | 'aborto') => {
    if (procesando) return;
    setProcesando(true);
    try {
      await actualizarResultadoMonta(montaId, resultado);
      toast({ title: resultado === 'gestacion' ? 'Preñez confirmada' : 'Resultado registrado' });
    } catch (e) {
      toast({ title: 'No se pudo registrar', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setProcesando(false);
    }
  };

  const handlePrestar = async () => {
    if (procesando) return;
    setProcesando(true);
    try {
      await cambiarEstadoAnimal(animal.id, 'prestado');
      toast({ title: `${animal.codigo} marcado como prestado` });
    } catch (e) {
      toast({ title: 'No se pudo registrar', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setProcesando(false);
    }
  };

  const handleDevolver = async () => {
    if (procesando) return;
    setProcesando(true);
    try {
      await cambiarEstadoAnimal(animal.id, 'vivo');
      toast({ title: `${animal.codigo} marcado como devuelto` });
    } catch (e) {
      toast({ title: 'No se pudo registrar', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="field-shell p-4 md:p-8 space-y-6 field-rise">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation('/animales')} data-testid="button-back-animals"><ArrowLeft className="w-4 h-4" /></Button>
          <div className="hidden h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-muted sm:block">
            {animal.fotoUrl ? <img src={animal.fotoUrl} alt={`Foto principal ${animal.codigo}`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Beef className="h-7 w-7 text-muted-foreground/50" /></div>}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold font-mono text-primary">{animal.codigo}</h1>
              <Badge variant={animal.estado === 'vivo' ? 'default' : 'secondary'} className={animal.estado === 'vivo' ? 'bg-green-600 hover:bg-green-700' : ''}>
                {animal.estado}
              </Badge>
            </div>
             <p className="text-muted-foreground text-lg">{animal.nombre || animal.apodo || 'Sin nombre asignado'}</p>
             <p className="mt-1 text-xs text-muted-foreground">Ficha individual · información registrada en THEOS</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExportPDF} disabled={procesando} className="gap-2" data-testid="button-export-animal-pdf"><Download className="w-4 h-4"/> PDF</Button>
          <Button variant="outline" onClick={() => setLocation(`/animales/${animal.id}/editar`)} className="gap-2" data-testid="button-edit-animal"><Edit className="w-4 h-4"/> Editar</Button>
          {animal.estado === 'vivo' && (
            <Button variant="outline" onClick={handlePrestar} disabled={procesando} className="gap-2"><ArrowRightLeft className="w-4 h-4"/> Prestar</Button>
          )}
          {animal.estado === 'prestado' && (
            <Button variant="outline" onClick={handleDevolver} disabled={procesando} className="gap-2 border-green-600/50 text-green-700 hover:bg-green-50"><ArrowRightLeft className="w-4 h-4"/> Marcar Devuelto</Button>
          )}
          {animal.estado === 'vivo' && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-green-600/50 text-green-700 hover:bg-green-50"><DollarSign className="w-4 h-4"/> Vender</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Registrar Venta de {animal.codigo}</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div><Label>Fecha</Label><Input type="date" value={ventaFecha} onChange={e=>setVentaFecha(e.target.value)} /></div>
                  <div><Label>Comprador</Label><Input value={ventaComprador} onChange={e=>setVentaComprador(e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Precio</Label><Input type="number" step="0.01" value={ventaPrecio} onChange={e=>setVentaPrecio(e.target.value)} /></div>
                    <div><Label>Moneda</Label><Input value={ventaMoneda} onChange={e=>setVentaMoneda(e.target.value)} /></div>
                  </div>
                  <div><Label>Observaciones</Label><Input value={ventaObs} onChange={e=>setVentaObs(e.target.value)} /></div>
                  <p className="text-xs text-muted-foreground">Si indicás un precio, se genera automáticamente el ingreso correspondiente en Finanzas.</p>
                  <Button onClick={handleVender} disabled={procesando} className="w-full">{procesando ? 'Guardando...' : 'Confirmar Venta'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {animal.estado === 'vivo' && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"><Skull className="w-4 h-4"/> Muerte</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Registrar Muerte de {animal.codigo}</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div><Label>Fecha</Label><Input type="date" value={muerteFecha} onChange={e=>setMuerteFecha(e.target.value)} /></div>
                  <div><Label>Causa</Label><Input value={muerteCausa} onChange={e=>setMuerteCausa(e.target.value)} /></div>
                  <div><Label>Observaciones</Label><Input value={muerteObs} onChange={e=>setMuerteObs(e.target.value)} /></div>
                  <Button onClick={handleRegistrarMuerte} disabled={procesando} variant="destructive" className="w-full">{procesando ? 'Guardando...' : 'Confirmar Muerte'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 sm:grid-cols-4 lg:grid-cols-7" data-testid="animal-critical-summary">
        <div className="rounded-lg bg-card/80 p-3"><p className="field-kicker">Especie / sexo</p><p className="mt-1 font-semibold capitalize">{animal.especie} · {animal.sexo}</p></div>
        <div className="rounded-lg bg-card/80 p-3"><p className="field-kicker">Edad</p><p className="mt-1 font-semibold">{edad?.texto || 'Desconocida'}</p></div>
        <div className="rounded-lg bg-card/80 p-3"><p className="field-kicker">Categoría</p><p className="mt-1 font-semibold capitalize">{cat}</p></div>
        <div className="rounded-lg bg-card/80 p-3"><p className="field-kicker">Potrero actual</p><p className="mt-1 truncate font-semibold">{potrero?.nombre || 'Sin asignar'}</p></div>
        <div className="rounded-lg bg-card/80 p-3"><p className="field-kicker">Reproducción</p><p className="mt-1 truncate font-semibold capitalize">{animal.sexo === 'hembra' ? (animal.estadoReproductivoHembra || 'Sin dato') : (animal.estadoReproductivoMacho || 'Sin dato')}</p></div>
        <div className="rounded-lg bg-card/80 p-3"><p className="field-kicker">Raza</p><p className="mt-1 truncate font-semibold">{animal.raza || 'Sin dato'}</p></div>
        <div className="col-span-2 rounded-lg bg-card/80 p-3 sm:col-span-1"><p className="field-kicker">Nacimiento</p><p className="mt-1 font-semibold">{animal.fechaNacimiento ? new Date(animal.fechaNacimiento).toLocaleDateString() : 'Sin dato'}</p></div>
      </div>

      <Tabs defaultValue="ficha" className="w-full">
        <TabsList className="flex flex-wrap h-auto justify-start w-full gap-1 p-1 bg-card border rounded-md">
          <TabsTrigger value="ficha" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Ficha</TabsTrigger>
          <TabsTrigger value="pesajes"><Weight className="w-4 h-4 mr-2"/> Pesajes</TabsTrigger>
          <TabsTrigger value="salud"><Activity className="w-4 h-4 mr-2"/> Salud</TabsTrigger>
          <TabsTrigger value="reproduccion"><Heart className="w-4 h-4 mr-2"/> Reproducción</TabsTrigger>
          {animal.sexo === 'hembra' && <TabsTrigger value="leche"><Droplet className="w-4 h-4 mr-2"/> Leche</TabsTrigger>}
          <TabsTrigger value="genealogia"><Share2 className="w-4 h-4 mr-2"/> Genealogía</TabsTrigger>
          <TabsTrigger value="historia"><Clock className="w-4 h-4 mr-2"/> Historia</TabsTrigger>
        </TabsList>

        <TabsContent value="ficha" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader><CardTitle>Datos Principales</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-y-4 gap-x-6">
                <div><div className="text-sm text-muted-foreground">Especie</div><div className="font-medium capitalize">{animal.especie}</div></div>
                <div><div className="text-sm text-muted-foreground">Categoría</div><div className="font-medium">{cat}</div></div>
                <div><div className="text-sm text-muted-foreground">Sexo</div><div className="font-medium capitalize">{animal.sexo}</div></div>
                <div><div className="text-sm text-muted-foreground">Raza</div><div className="font-medium">{animal.raza || '-'} {animal.subraza && `(${animal.subraza})`}</div></div>
                <div><div className="text-sm text-muted-foreground">Edad</div><div className="font-medium">{edad?.texto || 'Desconocida'}</div></div>
                <div><div className="text-sm text-muted-foreground">Nacimiento</div><div className="font-medium">{animal.fechaNacimiento ? new Date(animal.fechaNacimiento).toLocaleDateString() : '-'} {animal.fechaNacimientoEstimada && '(Estimada)'}</div></div>
                <div><div className="text-sm text-muted-foreground">Color/Pelaje</div><div className="font-medium">{animal.color || '-'}</div></div>
                <div><div className="text-sm text-muted-foreground">Potrero Actual</div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{potrero?.nombre || 'Sin asignar'}</span>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground">
                          <ArrowRightLeft className="w-3 h-3" /> Mover
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Mover {animal.codigo} de Potrero</DialogTitle></DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div>
                            <Label>Potrero de destino</Label>
                            <Select value={movPotreroId} onValueChange={setMovPotreroId}>
                              <SelectTrigger><SelectValue placeholder="Seleccione potrero" /></SelectTrigger>
                              <SelectContent>
                                {(potreros || []).filter(p => p.id !== animal.potreroActualId).map(p => (
                                  <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div><Label>Fecha</Label><Input type="date" value={movFecha} onChange={e=>setMovFecha(e.target.value)} /></div>
                          <div><Label>Observaciones</Label><Input value={movObs} onChange={e=>setMovObs(e.target.value)} /></div>
                          <Button onClick={handleMoverPotrero} disabled={procesando} className="w-full">{procesando ? 'Guardando...' : 'Confirmar Movimiento'}</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                <div><div className="text-sm text-muted-foreground">Estado Reproductivo</div><div className="font-medium capitalize">{animal.sexo === 'hembra' ? (animal.estadoReproductivoHembra||'-') : (animal.estadoReproductivoMacho||'-')}</div></div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Padres</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Padre</div>
                    {padre ? <Link href={`/animales/${padre.id}`} className="font-mono text-primary hover:underline">{padre.codigo} - {padre.nombre}</Link> : <div className="text-sm">Desconocido</div>}
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Madre</div>
                    {madre ? <Link href={`/animales/${madre.id}`} className="font-mono text-primary hover:underline">{madre.codigo} - {madre.nombre}</Link> : <div className="text-sm">Desconocida</div>}
                  </div>
                </CardContent>
              </Card>

              {animal.observaciones && (
                <Card>
                  <CardHeader><CardTitle>Observaciones</CardTitle></CardHeader>
                  <CardContent className="text-sm">{animal.observaciones}</CardContent>
                </Card>
              )}
            </div>
          </div>
          
          {/* Sección de fotos */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="field-card">
              <CardContent className="p-6">
                <GaleriaFotos animalId={animal.id} tipo="animal" titulo="Foto principal y otras fotos" conCamara />
              </CardContent>
            </Card>
            <Card className="field-card">
              <CardContent className="p-6 space-y-6">
                <GaleriaFotos animalId={animal.id} tipo="hierro_foto" titulo="Foto del hierro" conCamara maxFotos={6} />
                
                <div className="pt-4 border-t border-border">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Dibujos del Hierro</h3>
                    <Button variant="outline" size="sm" onClick={() => setShowDibujoHierro(!showDibujoHierro)}>
                      {showDibujoHierro ? 'Ocultar Lienzo' : 'Dibujar Hierro'}
                    </Button>
                  </div>
                  
                  {showDibujoHierro && (
                    <div className="mb-6 p-4 border rounded-xl bg-card">
                      <HierroDibujo animalId={animal.id} onGuardado={() => setShowDibujoHierro(false)} />
                    </div>
                  )}
                  
                   <GaleriaFotos animalId={animal.id} tipo="hierro_dibujo" titulo="Dibujo del hierro" maxFotos={8} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pesajes" className="mt-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Historial de Pesajes</h2>
            <Dialog>
              <DialogTrigger asChild><Button size="sm"><img src="/icons/balanza.png" alt="" className="w-4 h-4 mr-2 object-contain" /> Registrar Pesaje</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nuevo Pesaje</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Fecha</Label>
                    <Input type="date" value={pesoFecha} onChange={e => setPesoFecha(e.target.value)} />
                  </div>
                  <div>
                    <Label>Peso (kg)</Label>
                    <Input type="number" step="0.1" value={pesoNuevo} onChange={e => setPesoNuevo(e.target.value)} />
                  </div>
                  <Button onClick={handleAddPesaje} disabled={procesando} className="w-full">{procesando ? 'Guardando...' : 'Guardar'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Curva de Crecimiento</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                {pesajes.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={pesajesOrdenados}>
                      <XAxis dataKey="fecha" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <RechartsTooltip />
                      <Line type="monotone" dataKey="pesoKg" stroke="hsl(var(--primary))" strokeWidth={2} dot={{r:4}} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-muted-foreground">Sin datos suficientes</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Registro</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {[...pesajesOrdenados].reverse().map(p => (
                    <div key={p.id} className="flex justify-between p-2 border-b last:border-0">
                      <span>{new Date(p.fecha).toLocaleDateString()}</span>
                      <span className="font-bold">{p.pesoKg} kg</span>
                    </div>
                  ))}
                  {pesajes.length === 0 && <div className="text-muted-foreground text-center py-4">No hay pesajes</div>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="salud" className="mt-6">
          <Card>
            <CardContent className="pt-6">
               <div className="space-y-4">
                {eventosSaludOrdenados.map(e => (
                  <div key={e.id} className="flex flex-col sm:flex-row justify-between p-4 border rounded-lg gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="uppercase">{e.tipo}</Badge>
                        <span className="text-sm font-medium">{new Date(e.fecha).toLocaleDateString()}</span>
                      </div>
                      <p className="font-medium">{e.producto || e.diagnostico || 'Evento general'}</p>
                      {e.observaciones && <p className="text-sm text-muted-foreground mt-1">{e.observaciones}</p>}
                    </div>
                  </div>
                ))}
                {eventosSalud.length === 0 && <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">No hay eventos de salud registrados</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reproduccion" className="mt-6 space-y-6">
          {animal.sexo === 'hembra' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-muted rounded-lg text-center">
                <div className="text-2xl font-bold">{indicadoresReproductivos.numeroPartos}</div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Partos</div>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <div className="text-2xl font-bold">{indicadoresReproductivos.intervaloPromedioPartosDias ?? '—'}</div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Días entre partos</div>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <div className="text-2xl font-bold">{indicadoresReproductivos.edadPrimerPartoMeses ?? '—'}</div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Meses al 1er parto</div>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <div className="text-2xl font-bold">{indicadoresReproductivos.tasaExitoReproductivo !== null ? `${indicadoresReproductivos.tasaExitoReproductivo}%` : '—'}</div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Éxito reproductivo</div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Montas</CardTitle>
                  {animal.sexo === 'hembra' && (
                    <Dialog>
                      <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1"/> Monta</Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Registrar Monta</DialogTitle></DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div>
                            <Label>Macho</Label>
                            <Select value={montaMachoId} onValueChange={setMontaMachoId}>
                              <SelectTrigger><SelectValue placeholder="Seleccione Macho" /></SelectTrigger>
                              <SelectContent>
                                {machosDisponibles.map(m => <SelectItem key={m.id} value={m.id}>{m.codigo}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div><Label>Fecha</Label><Input type="date" value={montaFecha} onChange={e=>setMontaFecha(e.target.value)} /></div>
                          <div>
                            <Label>Tipo</Label>
                            <Select value={montaTipo} onValueChange={setMontaTipo}>
                              <SelectTrigger><SelectValue/></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="natural">Natural</SelectItem>
                                <SelectItem value="inseminacion">Inseminación</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div><Label>Observaciones</Label><Input value={montaObs} onChange={e=>setMontaObs(e.target.value)} /></div>
                          <Button onClick={() => handleAddMonta()} disabled={procesando} className="w-full">{procesando ? 'Guardando...' : 'Guardar'}</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {animal.sexo === 'hembra' ? (
                  <div className="space-y-3">
                    {montas.map(m => (
                      <div key={m.id} className="flex justify-between items-center p-3 border rounded-md">
                        <div>
                          <div className="font-medium">{new Date(m.fecha).toLocaleDateString()}</div>
                          <div className="text-sm text-muted-foreground capitalize">{m.tipo}</div>
                        </div>
                        {m.resultado === 'pendiente' ? (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-7 text-xs border-green-600/50 text-green-700 hover:bg-green-50" disabled={procesando} onClick={() => handleConfirmarMonta(m.id, 'gestacion')}>Preñada</Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" disabled={procesando} onClick={() => handleConfirmarMonta(m.id, 'vacia')}>Vacía</Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" disabled={procesando} onClick={() => handleConfirmarMonta(m.id, 'aborto')}>Aborto</Button>
                          </div>
                        ) : (
                          <Badge variant="outline" className="capitalize">{m.resultado}</Badge>
                        )}
                      </div>
                    ))}
                    {montas.length===0 && <div className="text-muted-foreground text-sm text-center py-4">No hay montas</div>}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">Las montas se registran en la ficha de la hembra.</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{animal.sexo === 'hembra' ? 'Partos' : 'Descendencia'}</CardTitle>
                  {animal.sexo === 'hembra' && (
                    <Dialog>
                      <DialogTrigger asChild><Button size="sm" variant="outline"><img src="/icons/calendario_parto.png" alt="" className="w-4 h-4 mr-1 object-contain" /> Parto</Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Registrar Parto</DialogTitle></DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div><Label>Fecha</Label><Input type="date" value={partoFecha} onChange={e=>setPartoFecha(e.target.value)} /></div>
                          <div><Label>Número de Crías</Label><Input type="number" min="1" value={partoCrias} onChange={e=>setPartoCrias(e.target.value)} /></div>
                          <div><Label>Observaciones</Label><Input value={partoObs} onChange={e=>setPartoObs(e.target.value)} /></div>
                          <Button onClick={handleAddParto} disabled={procesando} className="w-full">{procesando ? 'Guardando...' : 'Guardar'}</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {animal.sexo === 'hembra' ? (
                  <div className="space-y-3">
                    {partos.map(p => (
                      <div key={p.id} className="p-3 border rounded-md">
                        <div className="font-medium">{new Date(p.fecha).toLocaleDateString()}</div>
                        <div className="text-sm text-muted-foreground">{p.numCrias} cría(s) registradas</div>
                      </div>
                    ))}
                    {partos.length===0 && <div className="text-muted-foreground text-sm text-center py-4">No hay partos</div>}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-center text-xl font-bold mb-4">{hijos.length} hijos registrados</div>
                    {hijos.map(h => (
                      <div key={h.id} className="flex justify-between items-center p-2 border-b last:border-0">
                        <Link href={`/animales/${h.id}`} className="font-mono text-primary hover:underline">{h.codigo}</Link>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leche" className="mt-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Producción de Leche</h2>
            <Dialog>
              <DialogTrigger asChild><Button size="sm"><Droplet className="w-4 h-4 mr-2" /> Registrar Leche</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nuevo Registro de Leche</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div><Label>Fecha</Label><Input type="date" value={lecheFecha} onChange={e=>setLecheFecha(e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Litros mañana</Label><Input type="number" step="0.1" value={lecheManana} onChange={e=>setLecheManana(e.target.value)} /></div>
                    <div><Label>Litros tarde</Label><Input type="number" step="0.1" value={lecheTarde} onChange={e=>setLecheTarde(e.target.value)} /></div>
                  </div>
                  <div><Label>Observaciones</Label><Input value={lecheObs} onChange={e=>setLecheObs(e.target.value)} /></div>
                  <Button onClick={handleAddLeche} disabled={procesando} className="w-full">{procesando ? 'Guardando...' : 'Guardar'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-muted rounded-lg text-center">
              <div className="text-2xl font-bold">{lecheStats.totalLitros.toFixed(1)}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Litros totales</div>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <div className="text-2xl font-bold">{lecheStats.promedioDiario.toFixed(1)}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Promedio diario</div>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <div className="text-2xl font-bold">{lecheStats.maxDiario.toFixed(1)}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Máximo diario</div>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <div className="text-2xl font-bold">{lecheStats.totalRegistros}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Registros</div>
            </div>
          </div>

          <Card>
            <CardHeader><CardTitle>Registro</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {[...leche].sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(r => (
                  <div key={r.id} className="flex justify-between items-center p-2 border-b last:border-0">
                    <span>{new Date(r.fecha).toLocaleDateString()}</span>
                    <span className="text-sm text-muted-foreground">
                      {r.litrosManana !== undefined && `AM ${r.litrosManana}L`}
                      {r.litrosManana !== undefined && r.litrosTarde !== undefined && ' · '}
                      {r.litrosTarde !== undefined && `PM ${r.litrosTarde}L`}
                    </span>
                    <span className="font-bold">{((r.litrosManana ?? 0) + (r.litrosTarde ?? 0)).toFixed(1)} L</span>
                  </div>
                ))}
                {leche.length === 0 && <div className="text-muted-foreground text-center py-4">No hay registros de leche</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="genealogia" className="mt-6 space-y-6">
          <Card>
            <CardHeader><CardTitle>Árbol Genealógico</CardTitle></CardHeader>
            <CardContent className="flex justify-center p-8 overflow-x-auto">
              <div className="flex flex-col items-center gap-12 min-w-[600px]">
                <div className="flex gap-24 relative w-full justify-center">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1 uppercase">Abuelo Paterno</div>
                    {abueloPat ? <Link href={`/animales/${abueloPat.id}`} className="font-mono hover:underline">{abueloPat.codigo}</Link> : <span className="text-muted-foreground text-sm">Desconocido</span>}
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1 uppercase">Abuela Paterna</div>
                    {abuelaPat ? <Link href={`/animales/${abuelaPat.id}`} className="font-mono hover:underline">{abuelaPat.codigo}</Link> : <span className="text-muted-foreground text-sm">Desconocida</span>}
                  </div>
                  <div className="text-center ml-12">
                    <div className="text-xs text-muted-foreground mb-1 uppercase">Abuelo Materno</div>
                    {abueloMat ? <Link href={`/animales/${abueloMat.id}`} className="font-mono hover:underline">{abueloMat.codigo}</Link> : <span className="text-muted-foreground text-sm">Desconocido</span>}
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1 uppercase">Abuela Materna</div>
                    {abuelaMat ? <Link href={`/animales/${abuelaMat.id}`} className="font-mono hover:underline">{abuelaMat.codigo}</Link> : <span className="text-muted-foreground text-sm">Desconocida</span>}
                  </div>
                </div>
                
                <div className="flex gap-48 relative w-full justify-center">
                  <div className="absolute top-1/2 left-[25%] right-[25%] h-px bg-border -z-10" />
                  <div className="absolute top-1/2 left-1/2 w-px h-12 bg-border -z-10" />
                  
                  <div className="p-4 bg-card border-2 rounded-lg text-center w-[160px] bg-blue-50/50 dark:bg-blue-900/10">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Padre</div>
                    {padre ? <Link href={`/animales/${padre.id}`} className="font-mono font-bold text-primary hover:underline text-lg">{padre.codigo}</Link> : <span className="text-muted-foreground">Desconocido</span>}
                  </div>
                  
                  <div className="p-4 bg-card border-2 rounded-lg text-center w-[160px] bg-pink-50/50 dark:bg-pink-900/10">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Madre</div>
                    {madre ? <Link href={`/animales/${madre.id}`} className="font-mono font-bold text-primary hover:underline text-lg">{madre.codigo}</Link> : <span className="text-muted-foreground">Desconocida</span>}
                  </div>
                </div>
                
                <div className="p-4 bg-primary text-primary-foreground rounded-lg shadow-lg text-center min-w-[200px] relative">
                  <div className="absolute -top-12 left-1/2 w-px h-12 bg-border -z-10" />
                  <div className="text-xs opacity-80 uppercase tracking-wider mb-1">Este animal</div>
                  <div className="font-mono font-bold text-2xl">{animal.codigo}</div>
                  <div className="text-sm opacity-90 mt-1 capitalize">{animal.sexo}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {hermanos.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Hermanos ({hermanos.length})</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">Comparten al menos un padre o madre registrado con este animal.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {hermanos.map(h => (
                    <Link
                      key={h.id}
                      href={`/animales/${h.id}`}
                      className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted transition-colors"
                    >
                      <span className="font-mono text-sm font-medium">{h.codigo}</span>
                      {(h.nombre || h.apodo) && <span className="text-xs text-muted-foreground truncate">{h.nombre || h.apodo}</span>}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="historia" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Historia y Movimientos</CardTitle></CardHeader>
            <CardContent>
              <div className="relative border-l-2 border-muted ml-4 pl-6 space-y-8 py-4">
                {historiaEventos.map((ev, idx) => (
                  <div key={`${ev.id}-${idx}`} className="relative">
                    <div className={`absolute -left-[33px] top-1 w-4 h-4 rounded-full ${ev.color} border-4 border-background`} />
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
                      <h4 className="font-semibold text-lg">{ev.title}</h4>
                      <span className="text-sm font-mono text-muted-foreground">{ev.date}</span>
                    </div>
                    <p className="text-muted-foreground mt-1">{ev.desc}</p>
                  </div>
                ))}
                {historiaEventos.length === 0 && (
                  <div className="text-muted-foreground py-8">No hay eventos históricos registrados para este animal.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
