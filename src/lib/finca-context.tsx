// THEOS — Finca activa compartida por toda la app.
// Antes, cada página elegía "la primera finca creada" por su cuenta (fincas?.[0]),
// lo que impedía trabajar con más de una finca y rompía páginas como
// Potreros y Papelera (que ni siquiera llegaban a usar ese atajo).
// Este contexto centraliza cuál es la finca activa y la persiste en el dispositivo.

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useFincas } from './repo';
import type { Finca } from './types';

const FINCA_ACTUAL_KEY = 'theos_finca_actual_id';

interface FincaContextValue {
  /** Todas las fincas registradas. */
  fincas: Finca[];
  /** La finca activa actualmente (puede ser undefined si no hay ninguna). */
  finca: Finca | undefined;
  fincaId: string | undefined;
  /** true mientras se cargan las fincas desde IndexedDB. */
  cargando: boolean;
  seleccionarFinca: (id: string) => void;
}

const FincaContext = createContext<FincaContextValue | undefined>(undefined);

function leerFincaGuardada(): string | undefined {
  try {
    return localStorage.getItem(FINCA_ACTUAL_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function guardarFincaSeleccionada(id: string | undefined): void {
  try {
    if (id) localStorage.setItem(FINCA_ACTUAL_KEY, id);
    else localStorage.removeItem(FINCA_ACTUAL_KEY);
  } catch {
    // localStorage puede fallar en modo privado; no es crítico.
  }
}

export function FincaProvider({ children }: { children: React.ReactNode }) {
  const fincas = useFincas() as Finca[] | undefined; // undefined mientras carga, [] o Finca[] una vez lista
  const [fincaIdSeleccionada, setFincaIdSeleccionada] = useState<string | undefined>(leerFincaGuardada);

  // Si la finca guardada ya no existe (fue eliminada) o todavía no hay ninguna
  // seleccionada, cae automáticamente a la primera finca disponible.
  useEffect(() => {
    if (!fincas) return;
    const existe = fincaIdSeleccionada && fincas.some(f => f.id === fincaIdSeleccionada);
    if (!existe) {
      const primeraId = fincas[0]?.id;
      setFincaIdSeleccionada(primeraId);
      guardarFincaSeleccionada(primeraId);
    }
  }, [fincas, fincaIdSeleccionada]);

  const seleccionarFinca = (id: string) => {
    setFincaIdSeleccionada(id);
    guardarFincaSeleccionada(id);
  };

  const finca = fincas?.find(f => f.id === fincaIdSeleccionada);

  const value = useMemo<FincaContextValue>(() => ({
    fincas: fincas ?? [],
    finca,
    fincaId: finca?.id,
    cargando: fincas === undefined,
    seleccionarFinca,
  }), [fincas, finca]);

  return <FincaContext.Provider value={value}>{children}</FincaContext.Provider>;
}

export function useFincaActual(): FincaContextValue {
  const ctx = useContext(FincaContext);
  if (!ctx) throw new Error('useFincaActual() debe usarse dentro de <FincaProvider>');
  return ctx;
}
