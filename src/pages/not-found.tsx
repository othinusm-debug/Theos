import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[80vh] p-4">
      <Card className="max-w-md w-full border-dashed border-2">
        <CardContent className="flex flex-col items-center text-center p-8 space-y-4">
          <div className="p-4 bg-muted rounded-full">
            <AlertCircle className="w-12 h-12 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold font-serif">Página no encontrada</h1>
          <p className="text-muted-foreground">La sección a la que intentas acceder no existe o fue movida en THEOS.</p>
          <Link href="/" className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90" data-testid="link-not-found-home">Volver al panel</Link>
        </CardContent>
      </Card>
    </div>
  );
}
