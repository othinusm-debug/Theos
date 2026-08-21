import React, { useState } from 'react';
import { useAnimales, usePotreros, usePesajesDeFinca, moverAnimal } from '@/lib/repo';
import { useFincaActual } from '@/lib/finca-context';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Filter, MapPinned, X } from 'lucide-react';
import { categoriaAnimal } from '@/lib/catalogo';
import { calcularEdad } from '@/lib/edad';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { hoyISO } from '@/lib/utils';

export default function Animales() {
  const { fincaId } = useFincaActual();
  const animales = useAnimales(fincaId);
  const potreros = usePotreros(fincaId);
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [especieFilter, setEspecieFilter] = useState('todas');
  const [sexoFilter, setSexoFilter] = useState('todos');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [potreroFilter, setPotreroFilter] = useState('todos');

  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [dialogPotreroAbierto, setDialogPotreroAbierto] = useState(false);
  const [potreroDestinoLote, setPotreroDestinoLote] = useState('');
  const [fechaLote, setFechaLote] = useState(hoyISO());
  const [aplicandoLote, setAplicandoLote] = useState(false);

  const animalIds = animales?.map(a => a.id) || [];
  const todasPesajes = usePesajesDeFinca(animalIds);
  const ultimoPesajePorAnimal = React.useMemo(() => {
    const resultado = new Map<string, typeof todasPesajes[number]>();
    for (const pesaje of todasPesajes ?? []) {
      const anterior = resultado.get(pesaje.animalId);
      if (!anterior || pesaje.fecha > anterior.fecha) resultado.set(pesaje.animalId, pesaje);
    }
    return resultado;
  }, [todasPesajes]);

  if (!animales || !potreros || !todasPesajes) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Cargando inventario...</div>;
  }

  const filtered = animales.filter(a => {
    const matchesSearch = (a.codigo.toLowerCase().includes(search.toLowerCase()) || 
                          (a.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
                          (a.apodo || '').toLowerCase().includes(search.toLowerCase()));
    const matchesEspecie = especieFilter === 'todas' || a.especie === especieFilter;
    const matchesSexo = sexoFilter === 'todos' || a.sexo === sexoFilter;
    const matchesEstado = estadoFilter === 'todos' || a.estado === estadoFilter;
    const matchesPotrero = potreroFilter === 'todos' || 
                           (potreroFilter === 'sin_asignar' ? !a.potreroActualId : a.potreroActualId === potreroFilter);
                           
    return matchesSearch && matchesEspecie && matchesSexo && matchesEstado && matchesPotrero;
  });

  const idsFiltrados = filtered.map(a => a.id);
  const todosFiltradosSeleccionados = idsFiltrados.length > 0 && idsFiltrados.every(id => seleccionados.has(id));

  const toggleUno = (id: string) => {
    setSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    setSeleccionados(prev => {
      if (todosFiltradosSeleccionados) {
        const next = new Set(prev);
        idsFiltrados.forEach(id => next.delete(id));
        return next;
      }
      return new Set([...prev, ...idsFiltrados]);
    });
  };

  const handleAsignarPotreroLote = async () => {
    if (!potreroDestinoLote || seleccionados.size === 0 || aplicandoLote) return;
    setAplicandoLote(true);
    let exitos = 0;
    const errores: string[] = [];
    for (const id of seleccionados) {
      try {
        await moverAnimal(id, potreroDestinoLote, fechaLote);
        exitos++;
      } catch (e) {
        const animal = animales.find(a => a.id === id);
        errores.push(`${animal?.codigo ?? id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    setAplicandoLote(false);
    setDialogPotreroAbierto(false);
    setSeleccionados(new Set());
    if (errores.length === 0) {
      toast({ title: `${exitos} animales movidos` });
    } else {
      toast({
        title: `${exitos} movidos, ${errores.length} con error`,
        description: errores.slice(0, 3).join(' · '),
        variant: errores.length === seleccionados.size ? 'destructive' : 'default',
      });
    }
  };

  return (
    <div className="field-shell p-4 md:p-8 space-y-6 field-rise">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="field-kicker">Ganado / Animales</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Inventario del rodeo</h1>
          <p className="mt-1 text-sm text-muted-foreground">{filtered.length} de {animales.length} animales visibles · seleccioná para mover por lote</p>
        </div>
        <Link href="/animales/nuevo" className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90" data-testid="link-new-animal">
          <Plus className="h-4 w-4" />
          Registrar animal
        </Link>
      </div>

      <Card className="field-card p-4 flex flex-col xl:flex-row gap-4 bg-card">
        <div className="relative flex-1 w-full min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input data-testid="input-search-animals"
            placeholder="Buscar por código o nombre..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 w-full"
          />
        </div>
        
        <div className="flex flex-wrap lg:flex-nowrap gap-4 w-full xl:w-auto">
          <Select value={especieFilter} onValueChange={setEspecieFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Especie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Especies (Todas)</SelectItem>
              <SelectItem value="bovino">Bovino</SelectItem>
              <SelectItem value="bufalino">Bufalino</SelectItem>
              <SelectItem value="equino">Equino</SelectItem>
              <SelectItem value="asnal">Asnal</SelectItem>
              <SelectItem value="mular">Mular</SelectItem>
              <SelectItem value="porcino">Porcino</SelectItem>
              <SelectItem value="ovino">Ovino</SelectItem>
              <SelectItem value="caprino">Caprino</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sexoFilter} onValueChange={setSexoFilter}>
            <SelectTrigger className="w-full sm:w-[130px]">
              <SelectValue placeholder="Sexo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Sexos (Todos)</SelectItem>
              <SelectItem value="hembra">Hembras</SelectItem>
              <SelectItem value="macho">Machos</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={estadoFilter} onValueChange={setEstadoFilter}>
            <SelectTrigger className="w-full sm:w-[130px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Estados (Todos)</SelectItem>
              <SelectItem value="vivo">Vivo</SelectItem>
              <SelectItem value="vendido">Vendido</SelectItem>
              <SelectItem value="muerto">Muerto</SelectItem>
              <SelectItem value="prestado">Prestado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={potreroFilter} onValueChange={setPotreroFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Potrero" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Potreros (Todos)</SelectItem>
              <SelectItem value="sin_asignar">Sin asignar</SelectItem>
              {potreros.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {seleccionados.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-md">
          <span className="text-sm font-medium">{seleccionados.size} animal{seleccionados.size !== 1 ? 'es' : ''} seleccionado{seleccionados.size !== 1 ? 's' : ''}</span>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setDialogPotreroAbierto(true)}>
            <MapPinned className="w-4 h-4" /> Asignar potrero
          </Button>
          <Button size="sm" variant="ghost" className="gap-1 ml-auto" onClick={() => setSeleccionados(new Set())}>
            <X className="w-4 h-4" /> Deseleccionar
          </Button>
        </div>
      )}

      <div className="md:hidden space-y-3" data-testid="list-animals-mobile">
        {filtered.length === 0 ? (
          <Card className="field-card p-8 text-center text-muted-foreground">
            <Filter className="mx-auto mb-3 h-8 w-8 opacity-25" />
            No se encontraron animales con esos filtros.
          </Card>
        ) : filtered.map(animal => {
          const edad = calcularEdad(animal.fechaNacimiento);
          const potrero = potreros.find(p => p.id === animal.potreroActualId);
          const pesaje = ultimoPesajePorAnimal.get(animal.id);
          return (
            <Card key={animal.id} className="field-card overflow-hidden" data-testid={`card-animal-${animal.id}`}>
              <div className="flex items-start gap-3 p-4">
                <Checkbox checked={seleccionados.has(animal.id)} onCheckedChange={() => toggleUno(animal.id)} aria-label={`Seleccionar ${animal.codigo}`} data-testid={`checkbox-animal-${animal.id}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/animales/${animal.id}`} className="font-mono text-lg font-bold text-primary" data-testid={`link-animal-${animal.id}`}>{animal.codigo}</Link>
                      <p className="truncate text-sm font-medium">{animal.nombre || animal.apodo || <span className="font-normal italic text-muted-foreground">Sin nombre</span>}</p>
                    </div>
                    <Badge variant="outline" className={animal.estado === 'vivo' ? 'border-green-200 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}>{animal.estado}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-sm">
                    <div><span className="block text-xs text-muted-foreground">Edad</span><span>{edad?.texto || 'Desconocida'}</span></div>
                    <div><span className="block text-xs text-muted-foreground">Potrero</span><span className="truncate">{potrero?.nombre || 'Sin asignar'}</span></div>
                    <div><span className="block text-xs text-muted-foreground">Sexo / especie</span><span className="capitalize">{animal.sexo} · {animal.especie}</span></div>
                    <div><span className="block text-xs text-muted-foreground">Último peso</span><span className="font-semibold">{pesaje ? `${pesaje.pesoKg} kg` : 'Sin registro'}</span></div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-md border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={todosFiltradosSeleccionados} onCheckedChange={toggleTodos} aria-label="Seleccionar todos" />
              </TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Nombre / Apodo</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Edad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Potrero</TableHead>
              <TableHead className="text-right">Último Peso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <Filter className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  No se encontraron animales con esos filtros.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(animal => {
                const edad = calcularEdad(animal.fechaNacimiento);
                const potrero = potreros.find(p => p.id === animal.potreroActualId);
                const cat = categoriaAnimal(animal.especie, animal.sexo, edad?.totalMeses ?? null);
                
                // Get latest pesaje
                const pesaje = ultimoPesajePorAnimal.get(animal.id);
                
                return (
                  <TableRow key={animal.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <Checkbox checked={seleccionados.has(animal.id)} onCheckedChange={() => toggleUno(animal.id)} aria-label={`Seleccionar ${animal.codigo}`} />
                    </TableCell>
                    <TableCell>
                      <Link href={`/animales/${animal.id}`} className="font-mono font-bold text-primary hover:underline text-base">
                        {animal.codigo}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">
                      {animal.nombre || animal.apodo || <span className="text-muted-foreground italic text-sm">Sin nombre</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="capitalize">{cat}</span>
                        <span className="text-xs text-muted-foreground capitalize">{animal.especie}</span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{edad ? edad.texto : 'Desconocida'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`
                        ${animal.estado === 'vivo' ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400' : ''}
                        ${animal.estado === 'muerto' ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400' : ''}
                        ${animal.estado === 'vendido' ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                      `}>
                        {animal.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>{potrero?.nombre || '-'}</TableCell>
                    <TableCell className="text-right">
                      {pesaje ? (
                        <div className="flex flex-col items-end">
                          <span className="font-bold">{pesaje.pesoKg} kg</span>
                          <span className="text-xs text-muted-foreground">{new Date(pesaje.fecha).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogPotreroAbierto} onOpenChange={setDialogPotreroAbierto}>
        <DialogContent>
          <DialogHeader><DialogTitle>Asignar potrero a {seleccionados.size} animal{seleccionados.size !== 1 ? 'es' : ''}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Potrero de destino</Label>
              <Select value={potreroDestinoLote} onValueChange={setPotreroDestinoLote}>
                <SelectTrigger><SelectValue placeholder="Seleccione potrero" /></SelectTrigger>
                <SelectContent>
                  {potreros.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Fecha</Label><Input type="date" value={fechaLote} onChange={e => setFechaLote(e.target.value)} /></div>
            <p className="text-xs text-muted-foreground">
              Se registra como un movimiento individual por animal (queda en el historial de cada uno),
              igual que si lo movieras uno por uno desde su ficha.
            </p>
            <Button onClick={handleAsignarPotreroLote} disabled={!potreroDestinoLote || aplicandoLote} className="w-full">
              {aplicandoLote ? 'Aplicando...' : 'Confirmar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
