import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useFincaActual } from '@/lib/finca-context';
import { Menu, X, Home, Beef, Map, Droplet, Heart, Activity, DollarSign, Users, Database, Trash2, Info, Building, Plus, Search, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BuscadorGlobal } from '@/components/BuscadorGlobal';
import { useOnlineStatus } from '@/lib/offline';

export function Sidebar() {
  const [location] = useLocation();
  const { fincas, finca: currentFinca, seleccionarFinca } = useFincaActual();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const online = useOnlineStatus();

  const NavItem = ({ href, icon: Icon, iconSrc, label }: { href: string; icon?: any; iconSrc?: string; label: string }) => {
    const isActive = location === href || (href !== '/' && location.startsWith(href));
      return (
      <Link href={href} data-testid={`link-nav-${label.toLowerCase().replace(/\s+/g, '-')}`} className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`} onClick={() => setMobileOpen(false)}>
        {iconSrc ? <img src={iconSrc} alt="" className="w-5 h-5 object-contain flex-shrink-0" /> : <Icon className="w-5 h-5" />}
        <span>{label}</span>
      </Link>
    );
  };

  const navContent = (
    <div className="flex flex-col min-h-full bg-sidebar border-r border-sidebar-border text-sidebar-foreground w-72 flex-shrink-0">
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold font-mono tracking-tighter text-sidebar-primary">THEOS</h1>
            <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-[.18em] mt-1">Gestión ganadera</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-sidebar-border bg-sidebar-accent/60 px-2 py-1 text-[10px] text-sidebar-foreground/70" title={online ? 'Con conexión de red; los datos siguen guardados localmente' : 'Sin conexión; los datos siguen disponibles localmente'}>
            {online ? <Wifi className="w-3 h-3 text-emerald-500" /> : <WifiOff className="w-3 h-3 text-sidebar-primary" />}
            <span>{online ? 'En línea' : 'Sin conexión'}</span>
          </div>
        </div>
      </div>
      
      {fincas.length === 0 ? (
        <Link
          href="/fincas"
          className="px-4 py-3 bg-sidebar-accent/50 border-b border-sidebar-border flex items-center gap-2 text-sm text-sidebar-foreground/80 hover:text-sidebar-foreground"
          onClick={() => setMobileOpen(false)}
        >
          <Plus className="w-4 h-4 text-sidebar-primary" />
          Crear tu primera finca
        </Link>
      ) : fincas.length === 1 ? (
        <div className="px-4 py-3 bg-sidebar-accent/50 border-b border-sidebar-border flex items-center gap-2">
          <Building className="w-4 h-4 text-sidebar-primary" />
          <span className="font-semibold text-sm truncate">{currentFinca?.nombre}</span>
        </div>
      ) : (
        <div className="px-4 py-3 bg-sidebar-accent/50 border-b border-sidebar-border flex items-center gap-2">
          <Building className="w-4 h-4 text-sidebar-primary flex-shrink-0" />
          <Select value={currentFinca?.id} onValueChange={seleccionarFinca}>
            <SelectTrigger className="h-8 border-none bg-transparent px-1 font-semibold text-sm shadow-none focus:ring-0 text-sidebar-foreground">
              <SelectValue placeholder="Finca activa" />
            </SelectTrigger>
            <SelectContent>
              {fincas.map(f => (
                <SelectItem key={f.id} value={f.id}>{f.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={() => { setBuscadorAbierto(true); setMobileOpen(false); }}
          data-testid="button-global-search"
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md border border-sidebar-border bg-sidebar-accent/25 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors text-sm"
        >
          <Search className="w-4 h-4" />
          Buscar animal...
          <kbd className="ml-auto text-[10px] border border-sidebar-border rounded px-1.5 py-0.5 hidden md:inline">Ctrl K</kbd>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-5 px-3">
        <div className="space-y-1">
          <NavItem href="/" icon={Home} label="Panel de control" />
        </div>
        
        <div>
          <div className="text-[10px] font-semibold text-sidebar-foreground/45 uppercase tracking-[.16em] mb-2 px-3">Ganado</div>
          <div className="space-y-1">
            <NavItem href="/animales" icon={Beef} label="Animales" />
            <NavItem href="/salud" icon={Activity} label="Salud" />
            <NavItem href="/reproduccion" icon={Heart} label="Reproducción" />
            <NavItem href="/produccion" icon={Droplet} label="Producción" />
          </div>
        </div>

        <div>
          <div className="text-[10px] font-semibold text-sidebar-foreground/45 uppercase tracking-[.16em] mb-2 px-3">Terreno</div>
          <div className="space-y-1">
            <NavItem href="/potreros" icon={Map} label="Potreros" />
          </div>
        </div>

        <div>
          <div className="text-[10px] font-semibold text-sidebar-foreground/45 uppercase tracking-[.16em] mb-2 px-3">Administración</div>
          <div className="space-y-1">
            <NavItem href="/finanzas" icon={DollarSign} label="Finanzas" />
            <NavItem href="/nomina" icon={Users} label="Nómina" />
          </div>
        </div>

        <div>
          <div className="text-[10px] font-semibold text-sidebar-foreground/45 uppercase tracking-[.16em] mb-2 px-3">Sistema</div>
          <div className="space-y-1">
            <NavItem href="/fincas" icon={Building} label="Fincas" />
            <NavItem href="/datos" icon={Database} label="Backup y datos" />
            <NavItem href="/papelera" icon={Trash2} label="Papelera" />
            <NavItem href="/acerca-de" icon={Info} label="Acerca de THEOS" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-sidebar border-b border-sidebar-border z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold font-mono tracking-tighter text-sidebar-primary text-xl">THEOS</span>
          <span className="h-5 w-px bg-sidebar-border flex-shrink-0" />
          <span className="max-w-[110px] truncate text-xs font-semibold text-sidebar-foreground/80">{currentFinca?.nombre || 'Sin finca activa'}</span>
          <span title={online ? 'Con conexión' : 'Sin conexión'} className="flex-shrink-0">
            {online ? <Wifi className="w-3.5 h-3.5 text-emerald-500" /> : <WifiOff className="w-3.5 h-3.5 text-sidebar-primary" />}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setBuscadorAbierto(true)} className="text-sidebar-foreground">
            <Search className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)} className="text-sidebar-foreground">
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={() => setMobileOpen(false)} />
      )}
      
      {/* Mobile Sidebar Content */}
      <div className={`md:hidden fixed inset-y-0 left-0 transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-200 ease-in-out z-50`}>
        {navContent}
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex min-h-[100dvh] sticky top-0">
        {navContent}
      </div>

      <BuscadorGlobal open={buscadorAbierto} onOpenChange={setBuscadorAbierto} />
    </>
  );
}
