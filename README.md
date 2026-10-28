# 🏭 Browser Factory

**Centro de mando local para la gestión de cuentas múltiples de TikTok y YouTube con perfiles aislados y despacho de videos.**

Inspirado en la comodidad de Dolphin Anty, pero:
- **Ilimitado:** sin límite de 5 cuentas, sin pagos mensuales ni suscripciones en la nube.
- **Control de videos:** asocia el video que le toca subir a cada cuenta para no mezclar contenido entre canales.
- **Historial de publicaciones:** marca qué videos ya se publicaron y cuándo.
- **100% privado y local:** tus sesiones y cookies se guardan en tu propio disco duro.

---

## ⚡ Cómo usarlo

1. Haz doble clic en `iniciar.bat` (o abre una terminal en `app/` y ejecuta `node server.mjs`).
2. Se abrirá tu navegador en **`http://127.0.0.1:3300`**.
3. Añade tus cuentas con el botón **`+ Nuevo Perfil`** (indicando si es TikTok o YouTube).
4. Pulsa **`▶ INICIAR`** en cualquier cuenta: se abrirá una ventana de Chrome aislada. Inicia sesión una sola vez y quedará guardada permanentemente.
5. Asigna el video que le toca subir a cada canal y pulsa **`✓ Publicado`** cuando lo hayas subido para archivarlo.
