import { lazy, Suspense } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from 'next-themes';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';

import { FincaProvider } from '@/lib/finca-context';
import { ConfirmProvider } from '@/hooks/use-confirm';
import { ErrorBoundary } from '@/components/error-boundary';
import { Sidebar } from '@/components/layout/sidebar';

// Ninguna página queda como import estático: inicio.tsx también usa Recharts
// (igual que Finanzas y Producción), así que mantenerlo "eager" hubiera
// seguido metiendo Recharts en el bundle inicial de todos modos. Con
// Suspense, la primera pantalla igual aparece rápido (el fallback se ve al
// toque) mientras el chunk de Inicio + Recharts carga en paralelo.
const Inicio         = lazy(() => import('@/pages/inicio'));
const Animales       = lazy(() => import('@/pages/animales'));
const AnimalNuevo    = lazy(() => import('@/pages/animal-nuevo'));
const AnimalEditar   = lazy(() => import('@/pages/animal-editar'));
const AnimalDetalle  = lazy(() => import('@/pages/animal-detalle'));
const Produccion     = lazy(() => import('@/pages/produccion'));
const Reproduccion   = lazy(() => import('@/pages/reproduccion'));
const Salud          = lazy(() => import('@/pages/salud'));
const Potreros       = lazy(() => import('@/pages/potreros'));
const Fincas         = lazy(() => import('@/pages/fincas'));
const Finanzas       = lazy(() => import('@/pages/finanzas'));
const Nomina         = lazy(() => import('@/pages/nomina'));
const Datos          = lazy(() => import('@/pages/datos'));
const Papelera       = lazy(() => import('@/pages/papelera'));
const AcercaDe       = lazy(() => import('@/pages/acerca-de'));
const NotFound       = lazy(() => import('@/pages/not-found'));

function CargandoPagina() {
  return (
    <div className="field-shell min-h-[60vh] space-y-5 p-4 md:p-8" data-testid="state-page-loading">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="h-4 w-72 animate-pulse rounded-md bg-muted/70" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map(item => <div key={item} className="h-28 animate-pulse rounded-xl border bg-card/70" />)}
      </div>
      <div className="h-64 animate-pulse rounded-xl border bg-card/70" />
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 min-h-[100dvh] overflow-x-hidden pt-14 md:pt-0">
        <ErrorBoundary resetKey={location}>
          <Suspense fallback={<CargandoPagina />}>
            <Switch>
              <Route path="/"                component={Inicio} />
              <Route path="/animales"        component={Animales} />
              <Route path="/animales/nuevo"  component={AnimalNuevo} />
              <Route path="/animales/:id/editar" component={AnimalEditar} />
              <Route path="/animales/:id"    component={AnimalDetalle} />
              <Route path="/produccion"      component={Produccion} />
              <Route path="/reproduccion"    component={Reproduccion} />
              <Route path="/salud"           component={Salud} />
              <Route path="/potreros"        component={Potreros} />
              <Route path="/fincas"          component={Fincas} />
              <Route path="/finanzas"        component={Finanzas} />
              <Route path="/nomina"          component={Nomina} />
              <Route path="/datos"           component={Datos} />
              <Route path="/papelera"        component={Papelera} />
              <Route path="/acerca-de"       component={AcercaDe} />
              <Route component={NotFound} />
            </Switch>
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <FincaProvider>
        <TooltipProvider>
          <ConfirmProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <Router />
            </WouterRouter>
            <Toaster />
          </ConfirmProvider>
        </TooltipProvider>
      </FincaProvider>
    </ThemeProvider>
  );
}

export default App;
