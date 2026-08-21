import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { db } from '@/lib/db';

export default function AcercaDe() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="text-center max-w-2xl mx-auto space-y-8">
        <h1 className="text-6xl font-black font-mono tracking-tighter text-primary">THEOS</h1>
        <div className="space-y-4 text-muted-foreground text-lg">
          <p className="font-serif italic text-2xl text-foreground">Sistema de Gestión Ganadera</p>
          <p>
            Aplicación de gestión ganadera offline-first para el campo venezolano y latinoamericano. 
            Diseñada para bovinos y bufalinos de doble propósito.
          </p>
        </div>

        <div className="mx-auto max-w-lg space-y-4 border-y border-primary/20 py-8">
          <p className="font-serif italic text-lg leading-relaxed text-foreground/90">
            THEOS nace de una palabra griega muy antigua: <span className="text-primary">Theotokos</span> — Θεοτόκος,
            "la que da a luz a Dios" — el título con que, desde los primeros siglos, se honra a la
            Virgen María.
          </p>
          <p className="text-sm leading-relaxed">
            Cuidar una finca es, en el fondo, cuidar vida que nace: un parto que se espera,
            una cría que se levanta por primera vez, un rebaño que crece generación tras
            generación. THEOS toma ese nombre para poner ese cuidado diario bajo el mismo
            cuidado de una Madre.
          </p>
          <p className="pt-2 text-sm">
            Esta aplicación está dedicada a Dios y a la Virgen María,<br />
            y hecha con cariño para quienes trabajan la tierra y cuidan lo que en ella nace.
          </p>
        </div>

        <Card className="bg-card/50 backdrop-blur border-primary/20 shadow-xl mt-12">
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm text-left">
              <div className="space-y-2">
                <p className="font-semibold uppercase tracking-wider text-muted-foreground text-xs">Desarrollo</p>
                <p>Leonardo Javier Toro Laya (Ltoro26)</p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold uppercase tracking-wider text-muted-foreground text-xs">Versión</p>
                <p className="font-mono">1.0.0 (Offline-First Core)</p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold uppercase tracking-wider text-muted-foreground text-xs">Tecnología</p>
                <p>React, Dexie.js (IndexedDB), Tailwind v4</p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold uppercase tracking-wider text-muted-foreground text-xs">Derechos</p>
                <p>© 2026 — Todos los derechos reservados<br/>Basado en SIGGAN v2</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
