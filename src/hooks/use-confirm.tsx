// THEOS — Diálogo de confirmación propio.
//
// Reemplaza window.confirm()/confirm(): esos diálogos nativos del navegador
// no se pueden estilizar, no muestran bien texto largo en móvil, y en una
// PWA instalada (standalone, sin barra del navegador) se ven fuera de lugar.
// Este hook da la misma forma de uso (esperar sí/no antes de continuar) pero
// con el AlertDialog de THEOS.
//
// Uso:
//   const confirm = useConfirm();
//   const ok = await confirm({
//     title: '¿Eliminar potrero?',
//     description: 'Los animales asignados quedarán sin potrero.',
//     confirmLabel: 'Eliminar',
//     destructive: true,
//   });
//   if (ok) { ... }

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface ConfirmOptions {
  title: string;
  /** Puede ser texto simple o una lista de elementos para detallar qué se borra. */
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Pinta el botón de confirmar en rojo — para eliminaciones y otras acciones irreversibles. */
  destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const cerrar = (resultado: boolean) => {
    resolverRef.current?.(resultado);
    resolverRef.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={options !== null} onOpenChange={(open) => { if (!open) cerrar(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{options?.title}</AlertDialogTitle>
            {options?.description && (
              <AlertDialogDescription asChild>
                <div>{options.description}</div>
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => cerrar(false)}>
              {options?.cancelLabel || 'Cancelar'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cerrar(true)}
              className={options?.destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
            >
              {options?.confirmLabel || 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>.');
  return ctx;
}
