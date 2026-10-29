# 🏭 Browser Factory v1.0

**Centro de mando local para la gestión de canales múltiples de Facebook, Instagram, WhatsApp (familia Meta), TikTok, YouTube, X (Twitter) y Telegram, con sesiones aisladas de navegador, proxies y despacho de videos.**

Inspirado en la comodidad de Dolphin Anty, pero:
- **Ilimitado:** sin límite de cuentas, sin pagos mensuales ni suscripciones en la nube.
- **Multired de verdad:** cada canal puede activar o desactivar Facebook, Instagram, WhatsApp, TikTok, YouTube, X y Telegram por separado.
- **Control de videos:** asocia el video que le toca subir a cada canal desde una galería visual con miniaturas, para no mezclar contenido entre canales.
- **Historial de publicaciones:** marca qué videos ya se publicaron y cuándo.
- **Sesiones en vivo:** mira qué canales tienen un navegador abierto ahora mismo y ciérralos desde el panel.
- **100% privado y local:** tus sesiones y cookies se guardan en tu propio disco duro.

---

## ⚡ Cómo usarlo

1. Haz doble clic en `iniciar.bat` (o abre una terminal en `app/` y ejecuta `node server.mjs`).
2. Se abrirá tu navegador en **`http://127.0.0.1:3300`**.
3. Añade tus canales con el botón **`+ Nuevo Canal`**: elige el nombre, el nicho y **qué redes sociales usa** (Facebook, Instagram, WhatsApp, TikTok, YouTube, X, Telegram).
4. Configura tu **carpeta de videos** (donde tu fábrica de contenido guarda los .mp4): el selector los escaneará y mostrará con miniaturas.
5. Asigna a cada canal el video que le toca subir desde el modal **`+ Asignar Video`** (galería visual, buscador o explorador de Windows nativo).
6. Pulsa el botón de la red que quieras (o **`🚀 Abrir Todo`**): se abrirá una ventana aislada del navegador con la sesión de ese canal. Inicia sesión una sola vez y quedará guardada permanentemente.
7. Cuando subas el video, pulsa **`✓ Publicado`** para archivarlo en el historial con fecha y hora.

### 🔐 Forma correcta de hacer los login por red social

Cada canal guarda sus sesiones en una carpeta propia de Chrome aislada, así que el login se hace **una sola vez por canal y por red**:

1. Con el canal recién creado, pulsa el botón **`🔐 Login`**: se abrirá una ventana de Chrome con la **página de inicio de sesión de cada red activa** del canal (Facebook → login, Instagram → login, TikTok → login con email, X → flow de login, YouTube Studio → login de Google, WhatsApp/Telegram → código QR).
2. Inicia sesión en cada pestaña. Si el canal usa proxy, la ventana ya sale por ese proxy (misma IP para todas las redes del canal).
3. Cierra la ventana (o pulsa el botón de detener en el panel). **Las cookies quedan guardadas en disco** para ese canal.
4. A partir de ahí, usa los botones normales de cada red o **`🚀 Abrir Todo`**: entrarán directamente sin volver a pedir login.

> Si una sesión se dessynchroniza (p. ej. cambió la contraseña o el proxy), vuelve a pulsar **`🔐 Login`** de ese canal y refresca la sesión.

---

## 🧩 Funciones de la versión 1.0

| # | Función | Qué hace |
|---|---------|----------|
| 1 | **Canales ilimitados** | Crear, editar y borrar canales con nombre, nicho/etiquetas, notas y proxy opcional. |
| 2 | **Redes sociales configurables** | Cada canal decide qué redes usa: Facebook, Instagram, WhatsApp (Meta), TikTok, YouTube, X y Telegram. Las redes desactivadas no muestran botones ni se abren con "Abrir Todo". |
| 3 | **Lanzador aislado en 1 clic** | Abre Chrome/Edge/Brave con la sesión de ese canal (`--user-data-dir` propio). Las cookies y contraseñas quedan guardadas. |
| 4 | **Modo Celular** | Abre el canal en formato smartphone vertical (Android) con user-agent móvil. |
| 5 | **Selector de videos con miniaturas** | Escanea tu carpeta de videos y muestra una galería con miniatura, tamaño y fecha. Si tienes `ffmpeg` instalado, genera las miniaturas automáticamente. |
| 6 | **Explorador nativo de Windows** | Botones "Elegir carpeta" y "Examinar archivo" que abren el diálogo real de Windows (PowerShell + WinForms, sin dependencias). |
| 7 | **Historial y control de publicación** | "✓ Publicado" archiva el video en el historial del canal con fecha y hora para no repetir contenido. |
| 8 | **Sesiones activas en vivo** | El panel muestra una insignia verde "Activo" en los canales con navegador abierto y permite cerrarlos desde el panel. |
| 9 | **Proxies con auto-login** | Guarda proxies en formato Dolphin Anty (`http://ip:puerto:usuario:clave:nombre`) y los aplica por canal, con extensión temporal que inyecta las credenciales sin alertas. |
| 10 | **Seguridad local reforzada** | Bloqueo de path traversal, límite de 1 MB por petición, validación de IDs, cabeceras `nosniff` y CSP, sin CORS hacia webs externas. |

---

## 📋 Requisitos

- **Node.js 18 o superior** (sin ninguna dependencia de npm: solo módulos nativos).
- **Windows** recomendado (el diálogo nativo de archivos es exclusivo de Windows; en Mac/Linux funciona todo lo demás salvo ese diálogo).
- Navegador basado en Chromium: **Chrome** (preferido), Edge, Brave o Chromium — se detectan automáticamente.
- *Opcional:* **ffmpeg** en el PATH del sistema para generar miniaturas de los videos. Sin ffmpeg, el selector funciona igual mostrando un marcador visual.

---

## 🗂️ Estructura del proyecto

```
browser-factory/
├── iniciar.bat              # Arranque con doble clic en Windows
├── package.json             # Metadatos y scripts (start / test)
├── app/
│   ├── server.mjs           # Servidor local (API + estáticos + lanzador + miniaturas)
│   ├── index.html           # Interfaz del panel
│   ├── app.js               # Lógica del cliente
│   └── style.css            # Estilos (modo oscuro)
├── data/
│   ├── perfiles.json        # Canales guardados (se crea solo)
│   ├── proxies.json         # Proxies guardados (se crea solo, nunca se sube al repo)
│   ├── config.json          # Configuración global (carpeta de videos)
│   ├── sesiones/            # Perfiles aislados del navegador por canal
│   └── thumbs/              # Miniaturas generadas (caché)
└── test/                    # Tests con node --test
```

---

## 🧪 Tests

```
npm test
```

Ejecuta las pruebas de humo del servidor y las regresiones de seguridad con el runner nativo de Node.

---

## 🔮 Para más adelante

- Rotación automática de User-Agents y fingerprints avanzados.
- Extensión puente para auto-llenar el formulario de subida en TikTok/YouTube.
- Calendario de publicación y estadísticas por canal.
