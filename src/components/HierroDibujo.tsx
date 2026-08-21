// THEOS — Editor de dibujo del hierro (marca de fuego)
// Canvas táctil para dibujar el hierro a mano, con herramientas básicas.
// Guardado como PNG en base64 → FotoAnimal(tipo='hierro_dibujo').

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { agregarFoto } from '@/lib/repo';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Eraser, Pencil, RotateCcw, Save, Trash2 } from 'lucide-react';

interface HierroDibujoProps {
  animalId: string;
  onGuardado?: () => void;
}

type Herramienta = 'lapiz' | 'borrador';

const COLORES_RAPIDOS = ['#1a1814', '#8B4513', '#D4621A', '#E19022', '#FFFFFF'];

// Resolución "lógica" del dibujo (independiente de la pantalla). El tamaño
// real del canvas se multiplica por devicePixelRatio para que el trazo se
// vea nítido en pantallas de alta densidad (la mayoría de los celulares),
// en vez de pixelado.
const DISP_W = 600;
const DISP_H = 400;

export function HierroDibujo({ animalId, onGuardado }: HierroDibujoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const [herramienta, setHerramienta] = useState<Herramienta>('lapiz');
  const [color, setColor] = useState('#1a1814');
  const [grosor, setGrosor] = useState(4);
  const [dibujando, setDibujando] = useState(false);
  const [historial, setHistorial] = useState<ImageData[]>([]);
  const ultimoPunto = useRef<{ x: number; y: number } | null>(null);

  // Inicializar canvas con fondo blanco, a la resolución real de la pantalla
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = DISP_W * dpr;
    canvas.height = DISP_H * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#FAFAF8';
    ctx.fillRect(0, 0, DISP_W, DISP_H);
    guardarEstado();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function guardarEstado() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    setHistorial(h => [...h.slice(-20), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  }

  function deshacer() {
    const canvas = canvasRef.current;
    if (!canvas || historial.length < 2) return;
    const ctx = canvas.getContext('2d')!;
    const anterior = historial[historial.length - 2];
    ctx.putImageData(anterior, 0, 0);
    setHistorial(h => h.slice(0, -1));
  }

  function limpiar() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#FAFAF8';
    ctx.fillRect(0, 0, DISP_W, DISP_H);
    guardarEstado();
  }

  function getPunto(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = DISP_W / rect.width;
    const scaleY = DISP_H / rect.height;
    if ('touches' in e) {
      const t = e.touches[0];
      if (!t) return null;
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function iniciarDibujo(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const punto = getPunto(e);
    if (!punto) return;
    setDibujando(true);
    ultimoPunto.current = punto;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.beginPath();
    ctx.arc(punto.x, punto.y, grosor / 2, 0, Math.PI * 2);
    ctx.fillStyle = herramienta === 'borrador' ? '#FAFAF8' : color;
    ctx.fill();
  }

  const dibujar = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!dibujando) return;
    const punto = getPunto(e);
    if (!punto || !ultimoPunto.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.beginPath();
    ctx.moveTo(ultimoPunto.current.x, ultimoPunto.current.y);
    ctx.lineTo(punto.x, punto.y);
    ctx.strokeStyle = herramienta === 'borrador' ? '#FAFAF8' : color;
    ctx.lineWidth = herramienta === 'borrador' ? grosor * 3 : grosor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ultimoPunto.current = punto;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dibujando, color, grosor, herramienta]);

  function terminarDibujo(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    if (!dibujando) return;
    setDibujando(false);
    ultimoPunto.current = null;
    guardarEstado();
  }

  async function guardar() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const datos = canvas.toDataURL('image/png');
      await agregarFoto({ animalId, tipo: 'hierro_dibujo', datos, descripcion: 'Hierro dibujado' });
      toast({ title: 'Dibujo del hierro guardado' });
      onGuardado?.();
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-4">
      {/* Barra de herramientas */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex border border-border rounded-lg overflow-hidden">
          <Button
            type="button"
            variant={herramienta === 'lapiz' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none gap-1.5"
            onClick={() => setHerramienta('lapiz')}
          >
            <Pencil className="w-3.5 h-3.5" />
            Lápiz
          </Button>
          <Button
            type="button"
            variant={herramienta === 'borrador' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none gap-1.5 border-l border-border"
            onClick={() => setHerramienta('borrador')}
          >
            <Eraser className="w-3.5 h-3.5" />
            Borrador
          </Button>
        </div>

        {/* Colores rápidos */}
        <div className="flex gap-1.5">
          {COLORES_RAPIDOS.map(c => (
            <button
              key={c}
              type="button"
              className={`w-7 h-7 rounded-full border-2 transition-transform ${color === c ? 'border-primary scale-110' : 'border-border'}`}
              style={{ backgroundColor: c }}
              onClick={() => { setColor(c); setHerramienta('lapiz'); }}
            />
          ))}
          <input
            type="color"
            value={color}
            className="w-7 h-7 rounded-full border-2 border-border cursor-pointer p-0 overflow-hidden"
            title="Color personalizado"
            onChange={e => { setColor(e.target.value); setHerramienta('lapiz'); }}
          />
        </div>

        {/* Grosor */}
        <div className="flex items-center gap-2 min-w-[100px]">
          <span className="text-xs text-muted-foreground">{grosor}px</span>
          <Slider
            min={1} max={20} step={1}
            value={[grosor]}
            onValueChange={([v]) => setGrosor(v)}
            className="w-20"
          />
        </div>

        <div className="flex gap-2 ml-auto">
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={deshacer} disabled={historial.length < 2}>
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={limpiar}>
            <Trash2 className="w-3.5 h-3.5" />
            Limpiar
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="border-2 border-border rounded-xl overflow-hidden bg-[#FAFAF8] touch-none select-none" style={{ cursor: herramienta === 'borrador' ? 'cell' : 'crosshair' }}>
        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          className="w-full"
          onMouseDown={iniciarDibujo}
          onMouseMove={dibujar}
          onMouseUp={terminarDibujo}
          onMouseLeave={terminarDibujo}
          onTouchStart={iniciarDibujo}
          onTouchMove={dibujar}
          onTouchEnd={terminarDibujo}
        />
      </div>

      <Button type="button" className="w-full gap-2" onClick={guardar}>
        <Save className="w-4 h-4" />
        Guardar dibujo del hierro
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Dibuja el hierro de identificación del animal. Compatible con pantallas táctiles.
      </p>
    </div>
  );
}
