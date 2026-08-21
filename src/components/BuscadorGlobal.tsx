import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useAnimales } from '@/lib/repo';
import { useFincaActual } from '@/lib/finca-context';
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut,
} from '@/components/ui/command';
import { Beef } from 'lucide-react';

interface BuscadorGlobalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Buscador global de animales por código, nombre o apodo. Se abre con el
 * botón "Buscar" del menú, o con Ctrl/Cmd+K desde cualquier pantalla.
 */
export function BuscadorGlobal({ open, onOpenChange }: BuscadorGlobalProps) {
  const { fincaId } = useFincaActual();
  const animales = useAnimales(fincaId);
  const [, setLocation] = useLocation();

  // Atajo de teclado global (útil si se usa desde una computadora)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  const activos = useMemo(
    () => (animales ?? []).filter(a => !a.deletedAt),
    [animales],
  );

  function irA(animalId: string) {
    onOpenChange(false);
    setLocation(`/animales/${animalId}`);
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar por código, nombre o apodo..." />
      <CommandList>
        <CommandEmpty>No se encontró ningún animal.</CommandEmpty>
        <CommandGroup heading={`Animales${activos.length ? ` (${activos.length})` : ''}`}>
          {activos.map(a => (
            <CommandItem
              key={a.id}
              value={[a.codigo, a.nombre, a.apodo, a.especie, a.raza].filter(Boolean).join(' ')}
              onSelect={() => irA(a.id)}
            >
              <Beef className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono font-medium">{a.codigo}</span>
              {(a.nombre || a.apodo) && <span className="text-muted-foreground">{a.nombre || a.apodo}</span>}
              <CommandShortcut className="capitalize">{a.especie}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
