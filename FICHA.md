# Ficha: Browser Factory v1.0

> Inspirada en: Dolphin Anty (solo como referencia de interfaz de perfiles de navegador; no se copia nada de código ni recursos)
> Autor: Johan & Antigravity · Fecha: Octubre 2026
> Estado: **Versión 1.0 implementada**

Esta ficha es la especificación de la herramienta **Browser Factory** y refleja el producto en su primera versión oficial.

---

## 1. En una frase

Un centro de mando local para gestionar múltiples canales (TikTok, YouTube, Instagram, X y Telegram) con sesiones de navegador aisladas de un clic, asociando a cada canal el video que le toca publicar desde una galería visual, para no mezclar contenido ni sufrir límites de pago.

---

## 2. Para quién y para qué

Para creadores de contenido y administradores de múltiples canales que necesitan operar decenas de cuentas sin tener que iniciar y cerrar sesión constantemente, sin abrir 20 ventanas desordenadas y sin equivocarse al subir videos al canal incorrecto.

---

## 3. Funciones de la versión 1.0

| # | Función | Qué hace | Cómo se hace técnicamente |
|---|---------|----------|---------------------------|
| 1 | **Gestión ilimitada de canales** | Crear, editar y borrar canales (nombre, nicho/etiquetas, proxy opcional). | Archivo local `data/perfiles.json`, sin límites ni nube. |
| 2 | **Redes sociales por canal** | Cada canal activa/desactiva TikTok, YouTube, Instagram, X y Telegram. | Campo `redes` en el perfil; el panel y "Abrir Todo" respetan la configuración. |
| 3 | **Lanzador aislado en 1 clic** | Botón por red social que abre el navegador con la sesión de ese canal guardada permanentemente. | Lanza Chrome/Edge/Brave con `--user-data-dir="data/sesiones/<id>"`. |
| 4 | **Modo Celular** | Abre el canal como si fuera un smartphone Android vertical. | `--user-agent` móvil de Pixel 8 + ventana 412x915 + eventos táctiles. |
| 5 | **Selector de videos con miniaturas** | Escanea la carpeta de videos del usuario y asigna el video de cada canal desde una galería con miniatura, tamaño y fecha. | `GET /api/videos` escanea la carpeta de `data/config.json`; miniaturas con ffmpeg (opcional) cacheadas en `data/thumbs/`. |
| 6 | **Explorador nativo de Windows** | Elegir carpeta o archivo con el diálogo real de Windows. | Endpoint `POST /api/file-dialog` que usa PowerShell + WinForms (FolderBrowserDialog / OpenFileDialog). |
| 7 | **Historial y control de publicación** | "✓ Publicado" archiva el video en el historial del canal con fecha y hora. | Array `historial` en el JSON con `video` y `publicadoEl`. |
| 8 | **Sesiones activas en vivo** | Insignia "Activo" en los canales con navegador abierto + botón para cerrarlos. | Mapa de procesos en memoria (`RUNNING`) + polling de `/api/system` cada 6 s; cierre con `taskkill /T /F` en Windows. |
| 9 | **Panel visual tipo Dolphin Anty** | Interfaz oscura, limpia y rápida, con filtros por red, buscador y estadísticas en la cabecera. | HTML5, CSS con variables oscuras y JavaScript nativo sin dependencias. |
| 10 | **Seguridad local** | El panel no puede ser operado por webs externas ni leer archivos fuera de la app. | Rechazo de orígenes externos, bloqueo de path traversal, límite de 1 MB por body, validación de IDs, `nosniff` + CSP. |

---

## 4. Pantalla principal (Dashboard)

- **Cabecera:** logo "Browser Factory v1.0", estado del motor (Chrome/Edge/Brave), canales totales, canales activos ahora, videos pendientes y proxies guardados. Botones `Proxies`, `+ Nuevo Canal` y `Apagar`.
- **Filtros rápidos:** `Todos`, `Con Video Pendiente`, `TikTok`, `YouTube`, `Instagram`, `X`, `Telegram`.
- **Tabla de canales:**
  - **Canal:** nombre + insignia verde "Activo" (sesión abierta) + etiquetas de nicho + último uso.
  - **Lanzadores:** un botón por cada red activada del canal + `📱 Celular` + `🚀 Abrir Todo`.
  - **Video asignado:** miniatura + nombre + ruta, botón de cambiar video y botón verde `✓ Publicado`.
  - **Proxy:** nombre y host del proxy aplicado, o "Directo".
  - **Acciones:** cerrar sesión (si está activo), historial, editar y borrar.
- **Modal Canal:** nombre, checkboxes de redes (TikTok, YouTube, Instagram, X, Telegram), etiquetas, video pendiente manual y proxy.
- **Modal Selector de Video:** barra con la carpeta configurada, botones "Elegir carpeta" y "Examinar archivo" (diálogo nativo), buscador y galería de tarjetas con miniatura; doble clic asigna directamente.

---

## 5. Flujos paso a paso

### Flujo 1: Crear un canal y dejar las sesiones iniciadas
1. El usuario pulsa `+ Nuevo Canal`, escribe `@curiosidades_espacio` y activa las redes que usa (p. ej. TikTok + YouTube, sin Instagram).
2. Pulsa `Guardar`: el canal aparece en la tabla solo con los botones de las redes activadas.
3. Pulsa `🎵 TikTok`: se abre una ventana aislada del navegador. Inicia sesión una vez y queda guardada para siempre.
4. La fila muestra la insignia verde **Activo** mientras el navegador esté abierto; puede cerrarlo desde el botón ⏹ sin perder la sesión.

### Flujo 2: Despachar un video sin equivocarse
1. El usuario pulsa `+ Asignar Video` en la fila del canal.
2. La primera vez elige su carpeta de videos (p. ej. la salida de su fábrica de contenido) con el explorador de Windows.
3. La galería muestra todos los videos con miniatura; selecciona `video_104_marte.mp4` y pulsa `Asignar Video`.
4. Pulsa `🎵 TikTok`, sube el video asignado y vuelve al panel.
5. Pulsa `✓ Publicado`: el video se archiva en el historial del canal con fecha y hora, y la celda queda lista para el siguiente video.

---

## 6. Datos

- **Qué guarda:** canales con sus redes activas, proxy y video pendiente; historial de publicaciones; carpeta de videos; proxies; miniaturas en caché.
- **Dónde:** `data/perfiles.json`, `data/proxies.json`, `data/config.json`, `data/thumbs/` y las sesiones del navegador en `data/sesiones/<id>/`.
- **Privacidad:** nada sale de la máquina. Las contraseñas de proxy nunca se devuelven al navegador ni se suben al repositorio.

---

## 7. Para más adelante

- Rotación automática de User-Agents y fingerprints avanzados.
- Extensión puente para auto-llenar el formulario de subida en TikTok/YouTube.
- Calendario de publicación programada y estadísticas por canal.

---

## 8. Identidad propia

- **Nombre:** Browser Factory
- **Versión:** 1.0 (primera versión oficial del producto)
- **Estilo:** Modo oscuro elegante (grises oscuros `#121316`, acentos violeta/azul `#6366f1` y verde neón `#10b981`).
- **Idioma:** Español.
