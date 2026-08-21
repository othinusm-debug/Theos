import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Upload, Database, HardDrive, FileJson, FileText, Search, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/hooks/use-confirm';
import { descargarBackup, restaurarDesdeArchivo, listarMetadatosBackup, formatearTamanio } from '@/lib/backup';
import { ejecutarDiagnostico, type ResultadoDiagnostico } from '@/lib/diagnostico';
import { Input } from '@/components/ui/input';
import { useFincaActual } from '@/lib/finca-context';
import { useAnimales, usePotreros, useEventosSaludDeFinca, useMovimientosFinancieros, obtenerEstadisticasDB, type EstadisticasDB } from '@/lib/repo';

export default function Datos() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const metadatos = listarMetadatosBackup();
  const [stats, setStats] = React.useState<EstadisticasDB | null>(null);
  const [generandoReporte, setGenerandoReporte] = React.useState(false);
  const [diagnostico, setDiagnostico] = React.useState<ResultadoDiagnostico | null>(null);
  const [analizando, setAnalizando] = React.useState(false);

  const { finca, fincaId } = useFincaActual();
  const animales = useAnimales(fincaId);
  const potreros = usePotreros(fincaId);
  const animalIds = React.useMemo(() => (animales ?? []).map(a => a.id), [animales]);
  const eventosSalud = useEventosSaludDeFinca(animalIds);
  const movimientos = useMovimientosFinancieros(fincaId);

  React.useEffect(() => {
    obtenerEstadisticasDB().then(setStats);
  }, []);

  const handleDownload = async () => {
    try {
      const entrada = await descargarBackup();
      toast({ title: 'Respaldo generado y verificado', description: `${entrada.totalRegistros ?? '—'} registros exportados. El archivo se ha descargado en tu dispositivo.` });
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'No se pudo generar el respaldo.';
      toast({ title: 'Error', description: mensaje, variant: 'destructive' });
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ok = await confirm({
      title: '¿Restaurar este respaldo?',
      description: (
        <div className="space-y-2 text-sm">
          <p>Vas a reemplazar TODOS los datos que hay ahora mismo en el dispositivo por los del archivo:</p>
          {stats && (
            <ul className="list-disc space-y-0.5 pl-5">
              <li>{stats.fincas} finca{stats.fincas === 1 ? '' : 's'}</li>
              <li>{stats.animales} animal{stats.animales === 1 ? '' : 'es'}</li>
              <li>{stats.potreros} potrero{stats.potreros === 1 ? '' : 's'}</li>
              <li>Y el resto de los registros (salud, pesajes, finanzas, etc.)</li>
            </ul>
          )}
          <p className="font-medium">Esta acción es irreversible.</p>
        </div>
      ),
      confirmLabel: 'Restaurar y reemplazar',
      destructive: true,
    });

    if (ok) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const { totalRegistros } = await restaurarDesdeArchivo(content);
          toast({ title: 'Datos restaurados y verificados', description: `Se restauraron ${totalRegistros} registros en total. Recargando...`, duration: 5000 });
          setTimeout(() => window.location.reload(), 2000);
        } catch (err: any) {
          toast({ title: 'Error al restaurar', description: err.message, variant: 'destructive' });
        }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const handleReportePDF = async () => {
    if (!finca || !animales || !potreros || !eventosSalud || !movimientos) return;
    setGenerandoReporte(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { ReporteFincaDocument } = await import('@/components/ReporteFincaPDF');
      const blob = await pdf(
        <ReporteFincaDocument finca={finca} animales={animales} potreros={potreros} eventosSalud={eventosSalud} movimientos={movimientos} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_${finca.nombre.replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({ title: 'Error', description: 'No se pudo generar el reporte.', variant: 'destructive' });
    } finally {
      setGenerandoReporte(false);
    }
  };

  const handleAnalizar = async () => {
    setAnalizando(true);
    try {
      const resultado = await ejecutarDiagnostico();
      setDiagnostico(resultado);
    } catch (e) {
      toast({ title: 'Error', description: 'No se pudo completar el análisis.', variant: 'destructive' });
    } finally {
      setAnalizando(false);
    }
  };

  return (
    <div className="field-shell p-4 md:p-8 space-y-6 field-rise">
      <div>
        <h1 className="text-3xl font-bold font-serif">Datos y Respaldo</h1>
        <p className="text-muted-foreground">THEOS es 100% offline. Tus datos viven en este dispositivo. Respaldarlos es tu responsabilidad.</p>
      </div>

      <Tabs defaultValue="backup" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="backup">Respaldo (Backup)</TabsTrigger>
          <TabsTrigger value="reportes">Reportes</TabsTrigger>
          <TabsTrigger value="stats">Estadísticas de BD</TabsTrigger>
          <TabsTrigger value="diagnostico">Diagnóstico</TabsTrigger>
        </TabsList>

        <TabsContent value="backup" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-primary/50 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-primary" /> Descargar Respaldo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Genera un archivo JSON con absolutamente todos los datos de THEOS. Guárdalo en un pendrive, la nube o envíatelo por correo.
                </p>
                <Button size="lg" className="w-full gap-2" onClick={handleDownload}>
                  <HardDrive className="w-4 h-4" /> Generar y Descargar JSON
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Upload className="w-5 h-5" /> Restaurar Datos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Carga un archivo de respaldo previo. <strong className="text-foreground">Cuidado:</strong> esto sobrescribirá todos los datos actuales del dispositivo.
                </p>
                <div className="relative">
                  <Input type="file" accept=".json" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleUpload} />
                  <Button variant="outline" size="lg" className="w-full gap-2 border-destructive/50 text-destructive hover:bg-destructive/10">
                    <FileJson className="w-4 h-4" /> Seleccionar archivo .json
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Historial de Respaldos Recientes (Locales)</CardTitle></CardHeader>
            <CardContent>
              {metadatos.length > 0 ? (
                <div className="space-y-2">
                  {metadatos.slice().reverse().map(m => (
                    <div key={m.id} className="flex justify-between items-center p-3 border rounded-md">
                      <div>
                        <div className="font-medium">{m.etiqueta}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(m.fecha).toLocaleString()}
                          {m.totalRegistros !== undefined && ` · ${m.totalRegistros} registros`}
                          {m.appVersion && ` · v${m.appVersion}`}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">{formatearTamanio(m.tamanio)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground border border-dashed rounded-md">No hay respaldos registrados en este dispositivo.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reportes">
          <Card className="border-primary/50 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Reporte General de la Finca (PDF)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Genera un PDF con el inventario completo del rodeo, alertas sanitarias (vencidas y próximas) y
                el resumen financiero — listo para mostrarle a un veterinario, comprador o banco. Se genera en
                el dispositivo, no necesita internet.
              </p>
              {!finca ? (
                <p className="text-sm text-muted-foreground">Creá una finca primero para poder generar el reporte.</p>
              ) : (
                <Button size="lg" className="w-full gap-2" onClick={handleReportePDF} disabled={generandoReporte}>
                  <FileText className="w-4 h-4" /> {generandoReporte ? 'Generando...' : 'Generar y Descargar PDF'}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" /> Volumen de Datos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <div className="text-3xl font-bold">{stats.animales}</div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Animales</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <div className="text-3xl font-bold">{stats.pesajes}</div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Pesajes</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <div className="text-3xl font-bold">{stats.eventosSalud}</div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Ev. Salud</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <div className="text-3xl font-bold">{stats.montas}</div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Montas/Partos</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <div className="text-3xl font-bold">{stats.registrosLeche}</div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Reg. Leche</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <div className="text-3xl font-bold">{stats.ventas}</div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Ventas</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <div className="text-3xl font-bold">{stats.potreros}</div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Potreros</div>
                  </div>
                </div>
              ) : <div className="animate-pulse h-24 bg-muted rounded-lg w-full"></div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diagnostico" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" /> Analizar THEOS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Revisa toda la base de datos en busca de referencias rotas (padres, madres, potreros
                que ya no existen), códigos duplicados, y fechas que no son cronológicamente posibles
                (un parto antes que su monta, un animal muerto con eventos después de esa fecha, etc.).
                No modifica nada — solo diagnostica.
              </p>
              <Button size="lg" className="gap-2" onClick={handleAnalizar} disabled={analizando}>
                <Search className="w-4 h-4" /> {analizando ? 'Analizando...' : 'Analizar THEOS'}
              </Button>

              {diagnostico && (
                <div className="pt-4 space-y-4">
                  {diagnostico.problemas.length === 0 ? (
                    <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-md p-4">
                      <CheckCircle2 className="w-5 h-5" /> No se encontraron problemas de integridad.
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="p-3 bg-muted rounded-lg text-center">
                          <div className="text-2xl font-bold">{diagnostico.resumen.referenciasRotas}</div>
                          <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Ref. rotas</div>
                        </div>
                        <div className="p-3 bg-muted rounded-lg text-center">
                          <div className="text-2xl font-bold">{diagnostico.resumen.duplicados}</div>
                          <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Duplicados</div>
                        </div>
                        <div className="p-3 bg-muted rounded-lg text-center">
                          <div className="text-2xl font-bold">{diagnostico.resumen.cronologia}</div>
                          <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Cronología</div>
                        </div>
                        <div className="p-3 bg-muted rounded-lg text-center">
                          <div className="text-2xl font-bold">{diagnostico.resumen.huerfanos}</div>
                          <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Huérfanos</div>
                        </div>
                      </div>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {diagnostico.problemas.map((p, i) => (
                          <div key={i} className={`flex items-start gap-2 p-3 border rounded-md text-sm ${p.severidad === 'error' ? 'border-destructive/30 bg-destructive/5' : 'border-amber-300/50 bg-amber-50'}`}>
                            <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${p.severidad === 'error' ? 'text-destructive' : 'text-amber-600'}`} />
                            <span>{p.mensaje}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Análisis ejecutado el {new Date(diagnostico.ejecutadoEn).toLocaleString()}.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
