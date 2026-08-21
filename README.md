# THEOS — Gestión ganadera offline

THEOS es una aplicación independiente y reproducible para gestionar fincas,
animales, potreros, salud, reproducción, producción, finanzas y respaldos
locales. Los datos viven en IndexedDB del dispositivo y la aplicación funciona
sin conexión.

## Qué se corrigió y qué se agregó

**Bugs corregidos** (la app venía con estos problemas reales):
- Estructura de carpetas rota que impedía compilar.
- Los backups no incluían las fotos, y podían quedar a medio restaurar si algo fallaba.
- **Potreros** y **Papelera** estaban directamente rotas: siempre se veían vacías.
- El botón "Auto" para generar código de animal siempre repetía el mismo número.
- El PDF de cada animal dependía de internet para la tipografía — rompía la promesa "100% offline".
- El dibujo del hierro se borraba solo al guardar, y se veía pixelado en celulares modernos.
- No existía forma de trabajar con más de una finca (todo asumía "la primera creada").
- No se validaba que el código de un animal no estuviera repetido.

**Funciones completadas** (existían a medias o directamente no estaban):
- Selector de finca activa, en el menú.
- Páginas de **Producción**, **Reproducción** y **Salud** generales (antes decían "en construcción").
- Buscador global de animales (botón "Buscar" o Ctrl/Cmd+K).
- Aviso en el panel de inicio si hace mucho que no hacés un respaldo.
- Hermanos visibles en el árbol genealógico de cada animal.
- **Reporte PDF general de la finca** (Datos → Reportes): inventario completo, alertas sanitarias y resumen financiero, todo en un solo PDF para mostrar a un veterinario, comprador o banco.
- La app ahora es instalable como PWA (ícono propio, funciona sin conexión) y se puede convertir en APK (ver Paso 3 más abajo).
- Íconos propios (balanza, calendario de parto) en los botones principales de la ficha del animal.

---

## Versión 1.0 — pulido final

Última pasada antes de congelar la app:
- **Offline real:** el Service Worker ahora precachea toda la app al instalarse (antes solo guardaba lo que ibas visitando) — funciona sin conexión desde el primer arranque, en cualquier ruta.
- **PDF de cada animal:** primera página con datos destacados (peso actual, potrero, estado, info reproductiva) y la genealogía muestra código/nombre del padre y madre, no solo su ID interno.
- **Diálogos propios:** las confirmaciones de eliminar finca, animal, potrero, empleado, recibo y movimiento ya no son el cuadro genérico del navegador — son diálogos de THEOS que además detallan qué se va a borrar (cuántos animales, registros, etc.) antes de confirmar.
- **Validaciones reforzadas:** fechas y montos (ventas, muertes, movimientos financieros, hectáreas, capacidad de potreros) ahora se validan contra valores imposibles (negativos, `Infinity`, fechas sin sentido) antes de guardarse.
- **Limpieza:** se sacaron 30 componentes de interfaz, 22 dependencias y 6 imágenes que no se usaban en ningún lado, y las últimas referencias a la plataforma donde se armó el proyecto.

---

Quiero ser honesto sobre algo antes de empezar: **ninguna app hecha con código
como esta (React) puede abrirse "tal cual" con solo tocarla** — necesita un
paso de compilación, igual que cualquier app de tu celular necesitó ser
compilada por sus programadores antes de llegar a la Play Store. Eso no lo
puedo evitar. Lo que sí hice fue dejar el proyecto lo más simple posible y
armar un camino donde **vos nunca tenés que instalar nada ni tocar una
terminal** — ese paso lo hace un servicio gratuito, una sola vez.

Importante: "publicar" la app en el Paso 1 **no es "tener un servidor"**. No
hay nada que mantener prendido, no administrás nada, no te van a pedir plata,
y no volvés a tocarlo nunca más salvo que quieras actualizar la app.

## Paso 1 — Publicar la app (una sola vez, 5-10 minutos)

Necesitás usar una computadora una única vez (prestada está perfecto). Solo
navegador, cero instalaciones.

1. Creá una cuenta gratis en **[github.com](https://github.com)**.
2. Botón verde **"New"** → nombre `theos` → **"Create repository"**.
3. Dentro del repo, **"uploading an existing file"** → arrastrá TODO el
   contenido de esta carpeta (no el .zip, lo de adentro) → **"Commit changes"**.
4. Andá a **[netlify.com](https://netlify.com)** → entrá con tu cuenta de
   GitHub → **"Add new site" → "Import an existing project"** → elegí el repo
   `theos`.
   - Build command: `npm run build`
    - Publish directory: `dist/public`
5. **"Deploy"**. En 1-2 minutos te da un link, por ejemplo
   `https://theos-tuapellido.netlify.app`. Guardalo, es tu app.

## Paso 2 — Instalarla en el celular como una app de verdad

Abrí ese link desde Chrome en tu Android. Va a aparecer un aviso (o el menú
⋮ → **"Instalar app" / "Agregar a pantalla de inicio"**). Al instalarla:
- Te queda un ícono como cualquier otra app.
- Abre a pantalla completa, sin barra del navegador.
- **Funciona sin internet** (los datos ya vivían offline en el dispositivo;
  ahora la app misma también carga sin conexión).

Para la mayoría de los casos, esto ya reemplaza a un APK: es indistinguible
de una app instalada.

## Paso 3 — El APK descargable de verdad

Si igual querés el archivo .apk (por ejemplo para instalarlo en otro celular
sin pasar por el link):

1. Andá a **[pwabuilder.com](https://www.pwabuilder.com)** desde cualquier
   navegador (celular o computadora).
2. Pegá el link de tu app (el de Netlify del Paso 1) y dale **"Start"**.
3. Cuando termine de analizarla, elegí **"Android"** → **"Generate Package"**.
4. Te descarga un .zip con un archivo **.apk** adentro (listo para instalar)
   y un **.aab** (por si algún día lo querés subir a Google Play).

Esto lo hace PWABuilder en la nube usando Android SDK — no necesitás Android
Studio ni nada instalado en tu celular ni en ninguna computadora.

*Nota: al instalar el .apk directamente (fuera de Google Play), Android va a
avisar "no reconozco esta app" o similar — es normal en apps que no vienen de
la Play Store, no significa que tenga un problema. Solo tocá "instalar de
todas formas".*

## Si en algún momento tenés Node.js en una computadora

```
npm install
npm run typecheck  # revisa tipos de TypeScript, no genera archivos
npm test           # corre los tests de la lógica de negocio (src/lib)
npm run build      # genera dist/public/, la app ya compilada y lista para hospedar donde quieras
npm run serve      # para probarla localmente antes de publicar
```

`npm run build` genera automáticamente `dist/public/precache-manifest.json`
(paso `postbuild`, ver `scripts/generate-sw-manifest.mjs`) — es la lista de
archivos que el Service Worker necesita para que la app funcione sin
conexión desde el primer arranque. No hace falta correrlo a mano.

### Cómo comprobar que funciona sin conexión

1. Publicá la app (Paso 1) o corré `npm run build && npm run serve` local.
2. Abrí la app en el navegador **con conexión** al menos una vez — así el
   Service Worker se instala y precachea el App Shell completo.
3. Cerrá la pestaña o la app.
4. Activá modo avión (o, en Chrome DevTools → pestaña Network → "Offline").
5. Volvé a abrir la app. Debería cargar igual, y las rutas principales
   (Animales, ficha de un animal, Salud, Producción, etc.) deberían navegar
   sin pantalla en blanco ni error, aunque nunca las hubieras visitado antes
   estando online.

## Sobre tus datos

THEOS guarda todo en el dispositivo (offline, IndexedDB) — no en ningún
servidor ni en la nube. Hacé respaldos seguido desde "Datos y Respaldo"
dentro de la app y guardalos en un lugar seguro (correo, nube, pendrive). Si
alguna vez desinstalás la app o cambiás de celular, sin ese respaldo se
pierden los datos.
