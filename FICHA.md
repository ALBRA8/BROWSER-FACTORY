# Ficha: Browser Factory

> Inspirada en: Dolphin Anty (solo como referencia de interfaz de perfiles de navegador; no se copia nada de código ni recursos)
> Autor: Johan & Antigravity · Fecha: Octubre 2026

Esta ficha es la especificación para construir la herramienta **Browser Factory**.

---

## 1. En una frase

Un centro de mando local para gestionar múltiples cuentas (TikTok, YouTube, etc.) con perfiles de navegador aislados de un clic, asociando a cada cuenta el video que le toca publicar para no mezclar contenido ni sufrir límites de pago.

---

## 2. Para quién y para qué

Para creadores de contenido y administradores de múltiples canales que necesitan operar decenas de cuentas sin tener que iniciar y cerrar sesión constantemente, sin abrir 20 ventanas desordenadas y sin equivocarse al subir videos al canal incorrecto.

---

## 3. Funciones de la primera versión (MVP)

| # | Función | Qué hace, con tus palabras | Cómo se hará técnicamente |
|---|---|---|---|
| 1 | **Gestión ilimitada de perfiles** | Crear, editar y borrar perfiles de cuentas (nombre, red social: TikTok / YouTube, nicho/etiquetas, notas y proxy opcional). | Archivo local `perfiles.json` en disco, sin límites ni cuentas en la nube. |
| 2 | **Lanzador aislado en 1 clic** | Botón para abrir Chrome con la sesión de esa cuenta. Las cookies y contraseñas quedan guardadas permanentemente. | Lanza Chrome con `--user-data-dir="data/perfiles/<id>"`. |
| 3 | **Asignador de video por cuenta** | Cada cuenta muestra el archivo de video pendiente de publicar (nombre, ruta y miniatura/estado). | Selector de archivo local y guardado del estado en el perfil. |
| 4 | **Historial y control de publicación** | Botón "Marcar como publicado" para archivar el video en el historial de esa cuenta y evitar subir el mismo video dos veces. | Array `historial` en el JSON con fecha y nombre de archivo. |
| 5 | **Panel visual tipo Dolphin Anty** | Interfaz oscura, limpia, rápida, con filtros por plataforma (Todas, TikTok, YouTube) y buscador. | HTML5, CSS moderno con variables oscuras y JavaScript nativo sin dependencias pesadas. |

---

## 4. Pantallas

### Pantalla principal (Dashboard)

- **Cabecera:** Logo/Título "Browser Factory", estado del sistema (Chrome detectado), buscador rápido de cuentas y botón `+ Nuevo Perfil`.
- **Filtros rápidos:** Pestañas: `Todas`, `TikTok`, `YouTube`, `Con videos pendientes`.
- **Tabla de perfiles (estilo Dolphin Anty):**
  - **Cuenta:** Nombre del canal/cuenta (`@MiCanal`) + Icono de la red.
  - **Nicho / Etiquetas:** Tags visuales (ej: *Finanzas*, *Misterio*).
  - **Video Asignado:** Nombre del archivo `.mp4` pendiente, botón para asignar/cambiar video y botón verde `✓ Publicado`.
  - **Última sesión:** Fecha y estado (Activo / Detenido).
  - **Acciones:** Botón grande `▶ INICIAR` (abre Chrome con esa sesión aislada), botón de editar y borrar.
- **Modal de Creación/Edición:**
  - Formulario: Nombre del perfil, Plataforma (TikTok / YouTube), Etiquetas, Proxy (opcional, formato `ip:puerto:usuario:pass`), Notas.

---

## 5. Flujos paso a paso

### Flujo 1: Crear una cuenta y dejar la sesión iniciada
1. El usuario pulsa `+ Nuevo Perfil`.
2. Escribe el nombre (`@curiosidades_espacio`) y elige `TikTok`.
3. Pulsa `Guardar`. La cuenta aparece en la tabla.
4. Pulsa `▶ INICIAR`.
5. Se abre una ventana limpia de Chrome exclusiva para esa cuenta. El usuario inicia sesión en TikTok una sola vez.
6. Cierra la ventana. La próxima vez que pulse `INICIAR`, ya estará dentro de su cuenta sin tener que volver a escribir contraseña ni verificar 2FA.

### Flujo 2: Despachar un video sin equivocarse
1. El usuario ve en la tabla la fila de `@curiosidades_espacio`.
2. Asigna el archivo del video (ej: `video_104_marte.mp4` que generó su fábrica de videos).
3. Pulsa `▶ INICIAR`: se le abre TikTok en la cuenta correcta.
4. Sube el video asignado.
5. Vuelve al panel y pulsa `✓ Publicado`: el video se archiva en el historial de esa cuenta con fecha y hora.

---

## 6. Datos

- **Qué guarda:** La lista de perfiles, configuración de cada uno, ruta del video actual e historial de videos subidos.
- **Dónde:** En `data/perfiles.json` y las sesiones de Chrome en `data/sesiones/<id>/` en el disco local.
- **Datos personales:** Ninguno enviado a servidores externos. Todo 100% privado en la máquina local.

---

## 7. Para más adelante (versión 2.0)

- Detección automática de videos generados en la carpeta de la fábrica `YOUTUBE AUTOMATION`.
- Soporte para rotación automática de User-Agents y fingerprints avanzados.
- Extensión puente para auto-llenar el formulario de subida en TikTok/YouTube.

---

## 8. Identidad propia

- **Nombre:** Browser Factory
- **Estilo:** Modo oscuro elegante (grises oscuros `#121316`, acentos violeta/azul `#6366f1` y verde neón `#10b981`).
- **Idioma:** Español.
