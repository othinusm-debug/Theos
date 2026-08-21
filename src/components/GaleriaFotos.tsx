// THEOS — Galería de fotos múltiples por animal
// Soporta: cargar desde archivo, tomar con cámara, visualizar, eliminar.

import React, { useRef, useState } from 'react';
import { useFotosAnimal, agregarFoto, eliminarFoto } from '@/lib/repo';
import type { FotoAnimal, TipoFoto } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Camera, Trash2, Upload, ZoomIn, X, ImagePlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GaleriaFotosProps {
  animalId: string;
  tipo: TipoFoto;
  titulo: string;
  /** Si true, muestra botón de cámara (útil para hierro) */
  conCamara?: boolean;
  /** Máximo número de fotos permitidas (default: sin límite) */
  maxFotos?: number;
}

export function GaleriaFotos({ animalId, tipo, titulo, conCamara = false, maxFotos }: GaleriaFotosProps) {
  const fotos = useFotosAnimal(animalId, tipo) ?? [];
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [visorFoto, setVisorFoto] = useState<FotoAnimal | null>(null);

  const puedeAgregar = maxFotos === undefined || fotos.length < maxFotos;
  const subtitulo = tipo === 'animal'
    ? 'La primera queda como foto principal. Las siguientes son otras fotos.'
    : tipo === 'hierro_foto'
      ? 'Capturas del hierro para identificarlo en el campo.'
      : 'Trazos del hierro guardados en este dispositivo.';

  function leerArchivo(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleArchivos(files: FileList | null) {
    if (!files) return;
    const limite = maxFotos ? maxFotos - fotos.length : files.length;
    const aCargar = Array.from(files).slice(0, limite);
    try {
      for (const file of aCargar) {
        if (!file.type.startsWith('image/')) continue;
        // Redimensionar para ahorrar espacio en IndexedDB
        const datos = await comprimirImagen(file, 1200);
        await agregarFoto({ animalId, tipo, datos, descripcion: file.name });
      }
      toast({ title: `${aCargar.length} foto${aCargar.length !== 1 ? 's' : ''} agregada${aCargar.length !== 1 ? 's' : ''}` });
    } catch {
      toast({ title: 'Error al cargar foto', variant: 'destructive' });
    }
    if (fileRef.current) fileRef.current.value = '';
    if (cameraRef.current) cameraRef.current.value = '';
  }

  async function handleEliminar(foto: FotoAnimal) {
    await eliminarFoto(foto.id);
    toast({ title: 'Foto eliminada' });
    if (visorFoto?.id === foto.id) setVisorFoto(null);
  }

  return (
    <div className="space-y-3" data-testid={`gallery-${tipo}-${animalId}`}>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-foreground">{titulo}</span>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitulo}</p>
        </div>
        <div className="flex gap-2">
          {puedeAgregar && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5" />
                Cargar
              </Button>
              {conCamara && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => cameraRef.current?.click()}
                >
                  <Camera className="w-3.5 h-3.5" />
                  Cámara
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Inputs ocultos */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple={!maxFotos || maxFotos > 1}
        className="hidden"
        onChange={e => handleArchivos(e.target.files)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => handleArchivos(e.target.files)}
      />

      {/* Grid de miniaturas */}
      {fotos.length === 0 ? (
        <div
          className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center py-8 gap-3 cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{tipo === 'animal' ? 'Sin foto principal. Toca para agregar.' : 'Sin registros todavía. Toca para agregar.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {fotos.map((foto, idx) => (
            <div
              key={foto.id}
              className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted cursor-pointer"
              onClick={() => setVisorFoto(foto)}
            >
              <img src={foto.datos} alt={foto.descripcion || `Foto ${idx + 1}`} className="w-full h-full object-cover" />
              {tipo === 'animal' && (
                <Badge className={`absolute top-1 left-1 text-[10px] px-1 py-0 ${idx === 0 ? 'bg-primary/90' : 'bg-secondary/90'}`}>{idx === 0 ? 'Principal' : 'Otra foto'}</Badge>
              )}
              <button
                type="button"
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive/90 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                onClick={e => { e.stopPropagation(); handleEliminar(foto); }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {puedeAgregar && (
            <div
              className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      {maxFotos && (
        <p className="text-xs text-muted-foreground text-right">{fotos.length}/{maxFotos} fotos</p>
      )}

      {/* Visor de foto ampliada */}
      <Dialog open={!!visorFoto} onOpenChange={o => !o && setVisorFoto(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black border-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Vista de foto</DialogTitle>
          </DialogHeader>
          {visorFoto && (
            <div className="relative">
              <img src={visorFoto.datos} alt={visorFoto.descripcion || 'Foto'} className="w-full max-h-[80vh] object-contain rounded" />
              <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
                {visorFoto.descripcion && (
                  <span className="text-white/80 text-xs bg-black/50 px-2 py-1 rounded">{visorFoto.descripcion}</span>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-1.5 ml-auto">
                      <Trash2 className="w-3.5 h-3.5" />
                      Eliminar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Eliminar foto</AlertDialogTitle>
                      <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleEliminar(visorFoto)}>Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Compresión de imagen ────────────────────────────────────────────────────

async function comprimirImagen(file: File, maxPx: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        if (width >= height) { height = Math.round((height * maxPx) / width); width = maxPx; }
        else { width = Math.round((width * maxPx) / height); height = maxPx; }
      }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = reject;
    img.src = url;
  });
}
