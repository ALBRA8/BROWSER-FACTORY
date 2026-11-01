// Servidor local de Browser Factory v1.0
// Sirve la interfaz web, gestiona canales, proxies, redes sociales (familia Meta:
// Facebook, Instagram y WhatsApp; más TikTok, YouTube, Google/Gmail, X y Telegram),
// el selector de videos con miniaturas y el lanzamiento
// de Chrome aislado por canal.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { spawn, execFile } from "node:child_process";
import { fileURLToPath } from "node:url";

const VERSION = "1.2.0";
const PORT = Number(process.env.PUERTO || process.env.PORT || 3300);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const SESIONES_DIR = path.join(DATA_DIR, "sesiones");
const THUMBS_DIR = path.join(DATA_DIR, "thumbs");
const PROFILES_FILE = path.join(DATA_DIR, "perfiles.json");
const PROXIES_FILE = path.join(DATA_DIR, "proxies.json");
// Credenciales de auto-login por canal. NUNCA se suben al repositorio
// ni se devuelven en claro al navegador: solo rellenan el formulario.
const CRED_FILE = path.join(DATA_DIR, "credenciales.json");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");

// Tamaño máximo permitido para el cuerpo de peticiones (protección contra abuso local)
const MAX_BODY_BYTES = 1024 * 1024; // 1 MB

// Orígenes adicionales permitidos (modo despliegue/preview detrás de un proxy).
// Lista separada por comas; un patrón que termina en "*" acepta cualquier origen
// que empiece con ese prefijo. Por defecto (vacío) solo se permiten orígenes locales.
const ORIGENES_EXTRA = (process.env.ORIGENES_EXTRA || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function origenPermitido(origin) {
  if (origin === `http://127.0.0.1:${PORT}` || origin === `http://localhost:${PORT}`) return true;
  return ORIGENES_EXTRA.some((pat) => {
    if (!pat.includes("*")) return origin === pat;
    // Comodines tipo glob ("https://*.space-z.ai") convertidos a regex segura
    const rx = new RegExp(
      "^" +
        pat
          .split("*")
          .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join(".*") +
        "$"
    );
    return rx.test(origin);
  });
}

// Redes sociales soportadas por canal (agrupadas por familia: Meta primero)
const REDES = ["facebook", "instagram", "whatsapp", "tiktok", "youtube", "google", "x", "telegram"];

// Extensiones de video reconocidas por el selector de videos
const VIDEO_EXTS = new Set([".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v"]);

// URLs de destino por red social (familia Meta primero)
const TARGET_URLS = {
  facebook: ["https://www.facebook.com"],
  instagram: ["https://www.instagram.com"],
  whatsapp: ["https://web.whatsapp.com"],
  tiktok: ["https://www.tiktok.com/upload?lang=es"],
  youtube: ["https://studio.youtube.com"],
  google: ["https://mail.google.com"],
  x: ["https://x.com/compose/post"],
  telegram: ["https://web.telegram.org/a/"],
  mobile: ["https://www.tiktok.com", "https://www.instagram.com"],
};

// URLs de PRIMER LOGIN por red social (páginas explícitas de inicio de sesión)
// — son las que abre el botón «Login» de cada canal la primera vez
const LOGIN_URLS = {
  facebook: ["https://www.facebook.com/login"],
  instagram: ["https://www.instagram.com/accounts/login"],
  whatsapp: ["https://web.whatsapp.com"],
  tiktok: ["https://www.tiktok.com/login/phone-or-email/email"],
  youtube: ["https://studio.youtube.com"],
  google: ["https://accounts.google.com/ServiceLogin?continue=https://mail.google.com"],
  x: ["https://x.com/i/flow/login"],
  telegram: ["https://web.telegram.org/a/"],
};

// Asegurar directorios
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(SESIONES_DIR)) fs.mkdirSync(SESIONES_DIR, { recursive: true });
if (!fs.existsSync(THUMBS_DIR)) fs.mkdirSync(THUMBS_DIR, { recursive: true });

// Inicializar el catálogo vacío: las credenciales de proxy nunca deben quedar
// codificadas en el repositorio. Cada instalación agrega sus proxies localmente.
if (!fs.existsSync(PROXIES_FILE)) {
  fs.writeFileSync(PROXIES_FILE, JSON.stringify([], null, 2), "utf8");
}

// Configuración global (carpeta de videos de la fábrica, etc.)
function getConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
}

if (!fs.existsSync(CONFIG_FILE)) {
  saveConfig({ carpetaVideos: "" });
}

// Pre-configurar perfiles de ejemplo
if (!fs.existsSync(PROFILES_FILE)) {
  fs.writeFileSync(
    PROFILES_FILE,
    JSON.stringify(
      [
        {
          id: "ejemplo-tiktok",
          nombre: "Canal Curiosidades",
          etiquetas: ["Curiosidades", "Viral"],
          redes: { facebook: true, instagram: true, whatsapp: true, tiktok: true, youtube: true, google: true, x: true, telegram: true },
          proxyId: "",
          videoPendiente: "curiosidades_espacio_01.mp4",
          historial: [],
          creado: new Date().toISOString(),
          ultimoInicio: null,
        },
        {
          id: "ejemplo-youtube",
          nombre: "Canal Finanzas Pro",
          etiquetas: ["Finanzas", "Shorts"],
          redes: { facebook: true, instagram: true, whatsapp: true, tiktok: true, youtube: true, google: true, x: true, telegram: true },
          proxyId: "",
          videoPendiente: "finanzas_regla_50_30.mp4",
          historial: [],
          creado: new Date().toISOString(),
          ultimoInicio: null,
        },
      ],
      null,
      2,
    ),
  );
}

// Detección de navegador Chromium (Chrome preferido; Edge/Brave/Chromium de respaldo)
function findBrowser() {
  const candidates = {
    win32: [
      path.join(process.env.PROGRAMFILES ?? "C:\\Program Files", "Google\\Chrome\\Application\\chrome.exe"),
      path.join(process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)", "Google\\Chrome\\Application\\chrome.exe"),
      path.join(process.env.LOCALAPPDATA ?? "", "Google\\Chrome\\Application\\chrome.exe"),
      path.join(process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)", "Microsoft\\Edge\\Application\\msedge.exe"),
      path.join(process.env.PROGRAMFILES ?? "C:\\Program Files", "Microsoft\\Edge\\Application\\msedge.exe"),
      path.join(process.env.LOCALAPPDATA ?? "", "Microsoft\\Edge\\Application\\msedge.exe"),
      path.join(process.env.LOCALAPPDATA ?? "", "BraveSoftware\\Brave-Browser\\Application\\brave.exe"),
      path.join(process.env.PROGRAMFILES ?? "C:\\Program Files", "BraveSoftware\\Brave-Browser\\Application\\brave.exe"),
      path.join(process.env.LOCALAPPDATA ?? "", "Chromium\\Application\\chrome.exe"),
    ],
    darwin: [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      path.join(os.homedir(), "Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ],
    linux: [
      "/usr/bin/google-chrome-stable",
      "/usr/bin/google-chrome",
      "/usr/bin/microsoft-edge-stable",
      "/usr/bin/brave-browser",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
    ],
  }[process.platform] ?? [];

  const found = candidates.find((file) => {
    try {
      return fs.existsSync(file);
    } catch {
      return false;
    }
  });
  return found || null;
}

function engineName(browserPath) {
  if (!browserPath) return "No detectado";
  const low = browserPath.toLowerCase();
  if (low.includes("msedge")) return "Edge";
  if (low.includes("brave")) return "Brave";
  if (low.includes("chromium")) return "Chromium";
  return "Chrome";
}

const BROWSER_PATH = findBrowser();
const ENGINE = engineName(BROWSER_PATH);

// Detección de ffmpeg para generar miniaturas de videos (opcional)
let FFMPEG_OK = false;
function detectFfmpeg() {
  execFile("ffmpeg", ["-version"], { timeout: 5000, windowsHide: true }, (err) => {
    FFMPEG_OK = !err;
  });
}
detectFfmpeg();

// Los IDs se usan como nombres de directorio: rechazar separadores y rutas.
function isSafeProfileId(id) {
  return typeof id === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(id);
}

function getProfiles() {
  try {
    const list = JSON.parse(fs.readFileSync(PROFILES_FILE, "utf8"));
    // Normalizar campo `redes` para perfiles creados antes de la v1.0
    return list.map((p) => ({
      ...p,
      redes: { facebook: true, instagram: true, whatsapp: true, tiktok: true, youtube: true, google: true, x: true, telegram: true, ...(p.redes || {}) },
      historial: Array.isArray(p.historial) ? p.historial : [],
    }));
  } catch {
    return [];
  }
}

function saveProfiles(profiles) {
  fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2), "utf8");
}

function getProxies() {
  try {
    return JSON.parse(fs.readFileSync(PROXIES_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveProxies(proxies) {
  fs.writeFileSync(PROXIES_FILE, JSON.stringify(proxies, null, 2), "utf8");
}

// Credenciales de auto-login por canal: { "<perfilId>": { "<red>": { usuario, clave } } }
// Archivo local en data/credenciales.json (excluido del repositorio por .gitignore).
// La API NUNCA devuelve las claves: solo usuario + indicador tieneClave.
function getCredenciales() {
  try {
    return JSON.parse(fs.readFileSync(CRED_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveCredenciales(data) {
  fs.writeFileSync(CRED_FILE, JSON.stringify(data, null, 2), "utf8");
}

function normalizeRedes(input) {
  const base = { facebook: false, instagram: false, whatsapp: false, tiktok: false, youtube: false, google: false, x: false, telegram: false };
  if (!input || typeof input !== "object") {
    return { facebook: true, instagram: true, whatsapp: true, tiktok: true, youtube: true, google: true, x: true, telegram: true };
  }
  for (const red of REDES) {
    if (red in input) base[red] = Boolean(input[red]);
  }
  // Si el cliente envía un array de redes activas, respetarlo
  return base;
}

// Parser inteligente de cadenas de proxy (como http://ip:port:user:pass:name o ip:port:user:pass)
function parseProxyString(raw, customName = "") {
  let text = raw.trim();
  let protocolo = "http";
  if (text.startsWith("http://")) {
    protocolo = "http";
    text = text.replace("http://", "");
  } else if (text.startsWith("https://")) {
    protocolo = "https";
    text = text.replace("https://", "");
  } else if (text.startsWith("socks5://")) {
    protocolo = "socks5";
    text = text.replace("socks5://", "");
  }

  const parts = text.split(":");
  let host = "";
  let port = "";
  let user = "";
  let pass = "";
  let tag = customName;

  if (parts.length >= 2) {
    host = parts[0];
    port = parts[1];
  }
  if (parts.length >= 4) {
    user = parts[2];
    pass = parts[3];
  }
  if (parts.length >= 5 && !tag) {
    tag = parts[4];
  }

  return {
    raw: raw.trim(),
    protocolo,
    host,
    port,
    user,
    pass,
    nombre: tag || customName || host,
  };
}

// Genera una extensión temporal de Chrome para autenticar proxy automáticamente sin alertas
function setupProxyExtension(profileDir, proxyConfig) {
  const extDir = path.join(profileDir, "proxy_auth_ext");
  if (!fs.existsSync(extDir)) fs.mkdirSync(extDir, { recursive: true });

  const manifest = {
    version: "1.0.0",
    manifest_version: 2,
    name: "Browser Factory Proxy Auth",
    permissions: [
      "proxy",
      "tabs",
      "unlimitedStorage",
      "storage",
      "<all_urls>",
      "webRequest",
      "webRequestBlocking",
    ],
    background: {
      scripts: ["background.js"],
    },
    minimum_chrome_version: "22.0.0",
  };

  const backgroundJs = `
    const config = {
      mode: "fixed_servers",
      rules: {
        singleProxy: {
          scheme: ${JSON.stringify(proxyConfig.protocolo || "http")},
          host: ${JSON.stringify(proxyConfig.host)},
          port: Number(${JSON.stringify(proxyConfig.port)})
        },
        bypassList: ["localhost", "127.0.0.1"]
      }
    };

    chrome.proxy.settings.set({ value: config, scope: "regular" }, function() {});

    chrome.webRequest.onAuthRequired.addListener(
      function(details) {
        return {
          authCredentials: {
            username: ${JSON.stringify(proxyConfig.user || "")},
            password: ${JSON.stringify(proxyConfig.pass || "")}
          }
        };
      },
      { urls: ["<all_urls>"] },
      ["blocking"]
    );
  `;

  fs.writeFileSync(path.join(extDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(extDir, "background.js"), backgroundJs);
  return extDir;
}

// Genera una extensión temporal (Manifest V3) de AUTO-LOGIN para un canal.
// Cuando Chrome abre una página de inicio de sesión de una red con claves
// guardadas, content.js rellena usuario/clave y envía el formulario solito.
// Devuelve la ruta de la extensión, o null si el canal no tiene claves usables.
function setupAutoLoginExtension(profileDataDir, credenciales) {
  const map = {};
  for (const red of ["facebook", "instagram", "tiktok", "google", "x"]) {
    const c = credenciales?.[red];
    if (c && c.usuario && c.clave) map[red] = { usuario: c.usuario, clave: c.clave };
  }
  // YouTube se accede con la cuenta de Google: reutiliza sus claves si no tiene propias
  const cy = credenciales?.youtube;
  if (cy && cy.usuario && cy.clave) map.youtube = { usuario: cy.usuario, clave: cy.clave };
  else if (map.google) map.youtube = { usuario: map.google.usuario, clave: map.google.clave };
  if (Object.keys(map).length === 0) return null;

  const extDir = path.join(profileDataDir, "auto_login_ext");
  if (!fs.existsSync(extDir)) fs.mkdirSync(extDir, { recursive: true });

  const manifest = {
    manifest_version: 3,
    name: "Browser Factory Auto Login",
    version: "1.2.0",
    description: "Rellena localmente los formularios de inicio de sesion de las redes del canal.",
    permissions: ["scripting"],
    host_permissions: ["<all_urls>"],
    background: { service_worker: "background.js" },
  };

  const backgroundJs = [
    "// Service worker: inyecta content.js en las paginas de login conocidas",
    "const LOGIN_HOSTS = /facebook\\.com|instagram\\.com|accounts\\.google\\.com|tiktok\\.com|x\\.com|twitter\\.com/;",
    "chrome.tabs.onUpdated.addListener((tabId, info, tab) => {",
    "  if (info.status !== \"complete\" || !tab || !tab.url) return;",
    "  if (!LOGIN_HOSTS.test(tab.url)) return;",
    "  chrome.scripting.executeScript({ target: { tabId }, files: [\"content.js\"] }).catch(() => {});",
    "});",
  ].join("\n");

  const contentJs = `// Relleno de formularios de login (solo redes con claves de este canal)
(function () {
  const BF_CRED = __BF_CREDENCIALES__;
  function redDeHost(h) {
    if (h.includes("facebook.com")) return "facebook";
    if (h.includes("instagram.com")) return "instagram";
    if (h.includes("accounts.google.com")) return "google";
    if (h.includes("tiktok.com")) return "tiktok";
    if (h.includes("x.com") || h.includes("twitter.com")) return "x";
    return null;
  }
  const red = redDeHost(location.hostname);
  if (!red || !BF_CRED[red] || !BF_CRED[red].clave) return;
  const cred = BF_CRED[red];
  const MAX = 3;
  function intentos() { try { return Number(sessionStorage.getItem("bf:" + red) || 0); } catch { return 0; } }
  function sumaIntento() { try { sessionStorage.setItem("bf:" + red, String(intentos() + 1)); } catch {} }
  function visible(el) { return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length)); }
  function setVal(input, val) {
    const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    desc.set.call(input, val);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function campoTexto() {
    const sels = ['input[autocomplete="username"]', "#identifierId", 'input[type="email"]', 'input[name="username"]', 'input[type="tel"]', 'input[type="text"]'];
    for (const s of sels) {
      for (const el of document.querySelectorAll(s)) {
        if (visible(el) && !el.value && !el.disabled && !el.readOnly) return el;
      }
    }
    return null;
  }
  function campoPass() {
    for (const el of document.querySelectorAll('input[type="password"]')) {
      if (visible(el) && !el.value && !el.disabled) return el;
    }
    return null;
  }
  function botonTexto(rx) {
    for (const b of document.querySelectorAll('button, div[role="button"], input[type="submit"]')) {
      if (visible(b) && rx.test((b.textContent || b.value || "").trim())) return b;
    }
    return null;
  }
  function enviar() {
    const especial = document.querySelector("#identifierNext button, #passwordNext button");
    if (especial && visible(especial)) { especial.click(); return true; }
    const submit = document.querySelector('button[type="submit"], input[type="submit"]');
    if (submit && visible(submit)) { submit.click(); return true; }
    const txt = botonTexto(/(log.?in|iniciar sesi|siguiente|next|entrar|acceder)/i);
    if (txt) { txt.click(); return true; }
    return false;
  }
  let usuarioListo = false;
  function paso() {
    if (intentos() >= MAX) return false;
    const pass = campoPass();
    const user = campoTexto();
    if (user && pass) {
      setVal(user, cred.usuario);
      setVal(pass, cred.clave);
      sumaIntento();
      setTimeout(() => {
        if (!enviar()) {
          const f = pass.closest("form");
          if (f) f.submit();
        }
      }, 600);
      return true;
    }
    if (pass && usuarioListo) {
      setVal(pass, cred.clave);
      sumaIntento();
      setTimeout(() => enviar(), 600);
      return true;
    }
    const soloUsuario = user && !pass && (user.id === "identifierId" || user.autocomplete === "username");
    if (soloUsuario) {
      setVal(user, cred.usuario);
      usuarioListo = true;
      sumaIntento();
      setTimeout(() => enviar(), 500);
      return true;
    }
    return false;
  }
  let corridas = 0;
  const t = setInterval(() => {
    corridas++;
    try {
      if (paso() || corridas >= 20) clearInterval(t);
    } catch {
      clearInterval(t);
    }
  }, 1500);
})();
`;
  fs.writeFileSync(path.join(extDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(extDir, "background.js"), backgroundJs);
  fs.writeFileSync(path.join(extDir, "content.js"), contentJs.replace("__BF_CREDENCIALES__", JSON.stringify(map)));
  return extDir;
}

// Control de sesiones activas: profileId -> Set de procesos de navegador lanzados
const RUNNING = new Map();

function markRunning(profileId, child) {
  if (!RUNNING.has(profileId)) RUNNING.set(profileId, new Set());
  RUNNING.get(profileId).add(child);
  child.on("exit", () => {
    const set = RUNNING.get(profileId);
    if (set) {
      set.delete(child);
      if (set.size === 0) RUNNING.delete(profileId);
    }
  });
}

function closeProfileSessions(profileId) {
  const set = RUNNING.get(profileId);
  if (!set) return 0;
  let killed = 0;
  for (const child of set) {
    try {
      if (child.pid && process.platform === "win32") {
        // En Windows se cierra el árbol completo de procesos del navegador
        spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
      } else {
        child.kill("SIGTERM");
      }
      killed += 1;
    } catch {}
  }
  RUNNING.delete(profileId);
  return killed;
}

// Lectura segura del cuerpo de la petición con límite de tamaño
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Cuerpo de la petición demasiado grande (máx 1 MB)"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendJson(res, status, payload, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders,
  });
  res.end(JSON.stringify(payload));
}

// Miniaturas de videos con ffmpeg (con caché en data/thumbs)
function thumbKeyFor(ruta) {
  try {
    const stat = fs.statSync(ruta);
    const hash = crypto
      .createHash("sha1")
      .update(`${path.resolve(ruta)}::${stat.size}::${stat.mtimeMs}`)
      .digest("hex")
      .slice(0, 16);
    return `${hash}.jpg`;
  } catch {
    return null;
  }
}

function generateThumb(ruta, outPath) {
  return new Promise((resolve) => {
    const args = [
      "-y",
      "-ss",
      "1",
      "-i",
      ruta,
      "-vframes",
      "1",
      "-vf",
      "scale=320:-2",
      "-q:v",
      "5",
      outPath,
    ];
    execFile("ffmpeg", args, { timeout: 20000, windowsHide: true }, (err) => {
      resolve(!err && fs.existsSync(outPath));
    });
  });
}

// Escaneo de la carpeta de videos configurada
function scanVideoFolder(carpeta) {
  const dir = String(carpeta || "").trim();
  if (!dir) {
    return { ok: false, error: "Sin carpeta de videos configurada", items: [] };
  }
  let stat;
  try {
    stat = fs.statSync(dir);
  } catch {
    return { ok: false, error: "La carpeta no existe o no es accesible", items: [] };
  }
  if (!stat.isDirectory()) {
    return { ok: false, error: "La ruta configurada no es una carpeta", items: [] };
  }

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return { ok: false, error: "No se pudo leer la carpeta", items: [] };
  }

  const items = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!VIDEO_EXTS.has(ext)) continue;
    const ruta = path.join(dir, entry.name);
    let size = 0;
    let modificado = null;
    try {
      const st = fs.statSync(ruta);
      size = st.size;
      modificado = st.mtime.toISOString();
    } catch {}
    items.push({ nombre: entry.name, ruta, tamano: size, modificado });
    if (items.length >= 500) break;
  }

  items.sort((a, b) => String(b.modificado || "").localeCompare(String(a.modificado || "")));
  return { ok: true, carpeta: dir, ffmpeg: FFMPEG_OK, items };
}

// Diálogo nativo de Windows para elegir archivo o carpeta (PowerShell + WinForms)
function openNativeDialog(mode) {
  return new Promise((resolve) => {
    if (process.platform !== "win32") {
      resolve({ ok: false, error: "El diálogo nativo solo está disponible en Windows" });
      return;
    }

    const script =
      mode === "folder"
        ? `Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = 'Selecciona la carpeta de videos de tu fabrica'; if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Write-Output $f.SelectedPath }`
        : `Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.OpenFileDialog; $f.Title = 'Selecciona el video a asignar'; $f.Filter = 'Videos (*.mp4;*.mov;*.mkv;*.webm;*.avi;*.m4v)|*.mp4;*.mov;*.mkv;*.webm;*.avi;*.m4v|Todos los archivos (*.*)|*.*'; if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Write-Output $f.FileName }`;

    let settled = false;
    const finish = (value) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };

    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-STA", "-ExecutionPolicy", "Bypass", "-Command", script],
      { windowsHide: true, stdio: ["ignore", "pipe", "ignore"] },
    );

    let out = "";
    child.stdout.on("data", (chunk) => (out += chunk.toString("utf8")));
    child.on("error", () => finish({ ok: false, error: "No se pudo abrir el diálogo de Windows" }));
    child.on("exit", (code) => {
      const ruta = out.trim().split(/\r?\n/)[0] || "";
      if (ruta) finish({ ok: true, ruta });
      else finish({ ok: false, cancelado: true, code });
    });

    // Si el usuario deja la ventana abierta demasiado tiempo, liberar el recurso
    setTimeout(() => {
      try {
        child.kill();
      } catch {}
      finish({ ok: false, cancelado: true, timeout: true });
    }, 300000);
  });
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

const CSP_HTML =
  "default-src 'self'; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "font-src https://fonts.gstatic.com; " +
  "img-src 'self' data:; " +
  "script-src 'self' 'unsafe-inline'; " +
  "connect-src 'self'";

const server = http.createServer(async (req, res) => {
  // La API solo debe aceptar peticiones iniciadas desde la propia interfaz local.
  // No se habilita CORS: una web externa no debe poder operar sobre el servicio local.
  const origin = req.headers.origin;
  if (origin && !origenPermitido(origin)) {
    sendJson(res, 403, { error: "Origen no permitido" });
    return;
  }

  if (req.method === "OPTIONS") {
    sendJson(res, 403, { error: "Preflight no permitido" });
    return;
  }

  let url;
  try {
    url = new URL(req.url, `http://localhost:${PORT}`);
  } catch {
    sendJson(res, 400, { error: "URL inválida" });
    return;
  }
  const pathname = url.pathname;

  try {
    // APAGAR SERVIDOR
    if (pathname === "/api/shutdown" && req.method === "POST") {
      sendJson(res, 200, { ok: true, message: "Apagando Browser Factory..." });
      console.log("\n🛑 [Browser Factory] Apagando el servidor y liberando recursos...");
      setTimeout(() => {
        process.exit(0);
      }, 500);
      return;
    }

    // SYSTEM STATUS (incluye sesiones activas y motor detectado)
    if (pathname === "/api/system" && req.method === "GET") {
      sendJson(res, 200, {
        version: VERSION,
        engine: ENGINE,
        chromeAvailable: Boolean(BROWSER_PATH),
        chromePath: BROWSER_PATH,
        ffmpeg: FFMPEG_OK,
        profilesCount: getProfiles().length,
        proxiesCount: getProxies().length,
        activos: Array.from(RUNNING.keys()),
        carpetaVideos: getConfig().carpetaVideos || "",
      });
      return;
    }

    // CONFIG GLOBAL (carpeta de videos)
    if (pathname === "/api/config" && req.method === "GET") {
      sendJson(res, 200, getConfig());
      return;
    }

    if (pathname === "/api/config" && req.method === "POST") {
      const body = JSON.parse((await readBody(req)) || "{}");
      const config = getConfig();
      if (typeof body.carpetaVideos === "string") {
        config.carpetaVideos = body.carpetaVideos.trim();
      }
      saveConfig(config);
      sendJson(res, 200, { ok: true, config });
      return;
    }

    // ESCANEAR CARPETA DE VIDEOS
    if (pathname === "/api/videos" && req.method === "GET") {
      const carpeta = url.searchParams.get("carpeta") || getConfig().carpetaVideos || "";
      const result = scanVideoFolder(carpeta);
      sendJson(res, 200, result);
      return;
    }

    // MINIATURA DE VIDEO (generada con ffmpeg bajo demanda y cacheada)
    if (pathname === "/api/thumb" && req.method === "GET") {
      if (!FFMPEG_OK) {
        sendJson(res, 404, { error: "ffmpeg no disponible para miniaturas" });
        return;
      }
      const src = url.searchParams.get("src") || "";
      const ext = path.extname(src).toLowerCase();
      if (!src || !VIDEO_EXTS.has(ext)) {
        sendJson(res, 400, { error: "Archivo de video inválido" });
        return;
      }
      let stat;
      try {
        stat = fs.statSync(src);
        if (!stat.isFile()) throw new Error("no-file");
      } catch {
        sendJson(res, 404, { error: "Video no encontrado" });
        return;
      }
      const key = thumbKeyFor(src);
      const thumbPath = path.join(THUMBS_DIR, key);
      if (!fs.existsSync(thumbPath)) {
        const generated = await generateThumb(src, thumbPath);
        if (!generated) {
          sendJson(res, 500, { error: "No se pudo generar la miniatura" });
          return;
        }
      }
      const content = fs.readFileSync(thumbPath);
      res.writeHead(200, {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(content);
      return;
    }

    // DIÁLOGO NATIVO DE WINDOWS (elegir archivo o carpeta)
    if (pathname === "/api/file-dialog" && req.method === "POST") {
      const body = JSON.parse((await readBody(req)) || "{}");
      const result = await openNativeDialog(body.mode === "folder" ? "folder" : "file");
      sendJson(res, 200, result);
      return;
    }

    // PROXIES API
    if (pathname === "/api/proxies" && req.method === "GET") {
      // Nunca devolver contraseñas ni cadenas de conexión completas al navegador.
      const safeProxies = getProxies().map(({ pass, raw, ...proxy }) => ({
        ...proxy,
        user: proxy.user ? "••••••" : "",
        tieneCredenciales: Boolean(pass),
      }));
      sendJson(res, 200, safeProxies);
      return;
    }

    if (pathname === "/api/proxies" && req.method === "POST") {
      const data = JSON.parse((await readBody(req)) || "{}");
      const parsed = parseProxyString(data.raw || "", data.nombre || "");
      const proxies = getProxies();
      const id = data.id || `proxy-${Date.now()}`;
      const existingIndex = proxies.findIndex((p) => p.id === id);

      const proxyRecord = {
        id,
        nombre: parsed.nombre || "Nuevo Proxy",
        raw: parsed.raw,
        protocolo: parsed.protocolo,
        host: parsed.host,
        port: parsed.port,
        user: parsed.user,
        pass: parsed.pass,
        ubicacion: data.ubicacion?.trim() || "Ubicación personalizada",
        creado: existingIndex >= 0 ? proxies[existingIndex].creado : new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        proxies[existingIndex] = { ...proxies[existingIndex], ...proxyRecord };
      } else {
        proxies.unshift(proxyRecord);
      }

      saveProxies(proxies);
      const { pass, raw, ...safeProxy } = proxyRecord;
      sendJson(res, 200, {
        ok: true,
        proxy: { ...safeProxy, user: safeProxy.user ? "••••••" : "", tieneCredenciales: Boolean(pass) },
      });
      return;
    }

    if (pathname.startsWith("/api/proxies/") && req.method === "DELETE") {
      const id = pathname.replace("/api/proxies/", "");
      const proxies = getProxies().filter((p) => p.id !== id);
      saveProxies(proxies);
      sendJson(res, 200, { ok: true });
      return;
    }

    // PROFILES API
    if (pathname === "/api/profiles" && req.method === "GET") {
      sendJson(res, 200, getProfiles());
      return;
    }

    if (pathname === "/api/profiles" && req.method === "POST") {
      const data = JSON.parse((await readBody(req)) || "{}");
      const profiles = getProfiles();
      const id = data.id || `perfil-${Date.now()}`;
      if (!isSafeProfileId(id)) {
        sendJson(res, 400, { error: "ID de perfil inválido" });
        return;
      }
      const existingIndex = profiles.findIndex((p) => p.id === id);

      const previous = existingIndex >= 0 ? profiles[existingIndex] : null;
      const profileData = {
        id,
        nombre: data.nombre?.trim() || "Nuevo Canal",
        etiquetas: Array.isArray(data.etiquetas)
          ? data.etiquetas
          : (data.etiquetas || "").split(",").map((t) => t.trim()).filter(Boolean),
        redes: normalizeRedes(data.redes ?? previous?.redes),
        proxyId: data.proxyId || "",
        videoPendiente: data.videoPendiente || "",
        historial: previous?.historial || [],
        creado: previous?.creado || new Date().toISOString(),
        ultimoInicio: previous?.ultimoInicio || null,
      };

      if (existingIndex >= 0) {
        profiles[existingIndex] = { ...profiles[existingIndex], ...profileData };
      } else {
        profiles.unshift(profileData);
      }

      saveProfiles(profiles);
      sendJson(res, 200, { ok: true, profile: profileData });
      return;
    }

    // CREDENCIALES DE AUTO-LOGIN (🔑) POR CANAL
    // GET devuelve solo usuario + tieneClave (NUNCA la clave en claro)
    const credMatch = pathname.match(/^\/api\/profiles\/([^/]+)\/credenciales$/);
    if (credMatch && req.method === "GET") {
      const id = decodeURIComponent(credMatch[1]);
      if (!isSafeProfileId(id)) {
        sendJson(res, 400, { error: "ID de perfil inválido" });
        return;
      }
      const todas = getCredenciales()[id] || {};
      const credSafe = {};
      for (const [red, c] of Object.entries(todas)) {
        credSafe[red] = { usuario: c.usuario || "", tieneClave: Boolean(c.clave) };
      }
      sendJson(res, 200, credSafe);
      return;
    }

    if (credMatch && req.method === "POST") {
      const id = decodeURIComponent(credMatch[1]);
      if (!isSafeProfileId(id)) {
        sendJson(res, 400, { error: "ID de perfil inválido" });
        return;
      }
      const body = JSON.parse((await readBody(req)) || "{}");
      const red = String(body.red || "");
      if (!REDES.includes(red)) {
        sendJson(res, 400, { error: "Red inválida" });
        return;
      }
      const todas = getCredenciales();
      const actual = todas[id] || {};
      const previa = actual[red] || {};
      const usuario = String(body.usuario || "").trim();
      // Clave vacía = conservar la ya guardada (permite actualizar solo el usuario)
      const clave = String(body.clave || "") || previa.clave || "";
      if (!usuario && !clave) {
        delete actual[red];
      } else {
        actual[red] = { usuario, clave };
      }
      if (Object.keys(actual).length === 0) delete todas[id];
      else todas[id] = actual;
      saveCredenciales(todas);
      sendJson(res, 200, { ok: true, tieneClave: Boolean(todas[id]?.[red]?.clave) });
      return;
    }

    const credDelMatch = pathname.match(/^\/api\/profiles\/([^/]+)\/credenciales\/([^/]+)$/);
    if (credDelMatch && req.method === "DELETE") {
      const id = decodeURIComponent(credDelMatch[1]);
      const red = decodeURIComponent(credDelMatch[2]);
      if (!isSafeProfileId(id) || !REDES.includes(red)) {
        sendJson(res, 400, { error: "Parámetros inválidos" });
        return;
      }
      const todas = getCredenciales();
      if (todas[id]) {
        delete todas[id][red];
        if (Object.keys(todas[id]).length === 0) delete todas[id];
        saveCredenciales(todas);
      }
      sendJson(res, 200, { ok: true });
      return;
    }

    if (pathname.startsWith("/api/profiles/") && req.method === "DELETE") {
      const id = pathname.replace("/api/profiles/", "");
      closeProfileSessions(id);
      const profiles = getProfiles().filter((p) => p.id !== id);
      saveProfiles(profiles);
      sendJson(res, 200, { ok: true });
      return;
    }

    // CERRAR SESIONES ACTIVAS DE UN CANAL
    const closeMatch = pathname.match(/^\/api\/profiles\/([^/]+)\/close$/);
    if (closeMatch && req.method === "POST") {
      const id = decodeURIComponent(closeMatch[1]);
      if (!isSafeProfileId(id)) {
        sendJson(res, 400, { error: "ID de perfil inválido" });
        return;
      }
      const killed = closeProfileSessions(id);
      sendJson(res, 200, { ok: true, cerradas: killed });
      return;
    }

    // ASIGNAR VIDEO (ruta completa o nombre)
    const assignMatch = pathname.match(/^\/api\/profiles\/([^/]+)\/assign-video$/);
    if (assignMatch && req.method === "POST") {
      const id = decodeURIComponent(assignMatch[1]);
      if (!isSafeProfileId(id)) {
        sendJson(res, 400, { error: "ID de perfil inválido" });
        return;
      }
      const { video } = JSON.parse((await readBody(req)) || "{}");
      const profiles = getProfiles();
      const profile = profiles.find((p) => p.id === id);
      if (profile) {
        profile.videoPendiente = video || "";
        saveProfiles(profiles);
        sendJson(res, 200, { ok: true, profile });
      } else {
        sendJson(res, 404, { error: "Perfil no encontrado" });
      }
      return;
    }

    // MARCAR COMO PUBLICADO
    const publishedMatch = pathname.match(/^\/api\/profiles\/([^/]+)\/mark-published$/);
    if (publishedMatch && req.method === "POST") {
      const id = decodeURIComponent(publishedMatch[1]);
      if (!isSafeProfileId(id)) {
        sendJson(res, 400, { error: "ID de perfil inválido" });
        return;
      }
      const profiles = getProfiles();
      const profile = profiles.find((p) => p.id === id);
      if (profile) {
        if (profile.videoPendiente) {
          profile.historial = profile.historial || [];
          profile.historial.unshift({
            video: profile.videoPendiente,
            publicadoEl: new Date().toISOString(),
          });
          profile.videoPendiente = "";
          saveProfiles(profiles);
        }
        sendJson(res, 200, { ok: true, profile });
      } else {
        sendJson(res, 404, { error: "Perfil no encontrado" });
      }
      return;
    }

    // LANZAR NAVEGADOR AISLADO CON PROXY
    const launchMatch = pathname.match(/^\/api\/profiles\/([^/]+)\/launch$/);
    if (launchMatch && req.method === "POST") {
      const id = decodeURIComponent(launchMatch[1]);
      if (!isSafeProfileId(id)) {
        sendJson(res, 400, { error: "ID de perfil inválido" });
        return;
      }
      const profiles = getProfiles();
      const profile = profiles.find((p) => p.id === id);

      if (!profile) {
        sendJson(res, 404, { error: "Canal no encontrado" });
        return;
      }

      if (!BROWSER_PATH) {
        sendJson(res, 500, { error: "No se encontró Chrome/Edge/Brave en las rutas estándar" });
        return;
      }

      const body = JSON.parse((await readBody(req)) || "{}");
      let target = body.target || "all";
      // "login:<red>" inicia sesión SOLO en esa red (botón 🔑 junto a cada lanzador)
      const validTargets = [...REDES, "mobile", "all", "login", ...REDES.map((r) => `login:${r}`)];
      if (!validTargets.includes(target)) target = "all";

      const profileDataDir = path.join(SESIONES_DIR, id);
      if (!fs.existsSync(profileDataDir)) {
        fs.mkdirSync(profileDataDir, { recursive: true });
      }

      // Determinar URLs según el botón pulsado y las redes activas del canal
      const isMobile = target === "mobile";
      const targetUrls = [];

      if (target === "all") {
        // Abrir todas las redes activadas para este canal
        const activas = REDES.filter((red) => profile.redes?.[red] !== false);
        for (const red of activas.length > 0 ? activas : REDES) {
          targetUrls.push(...TARGET_URLS[red]);
        }
      } else if (target === "login") {
        // Primer login: abrir la página de inicio de sesión de cada red activa.
        // El usuario inicia sesión una vez; las cookies quedan en --user-data-dir.
        const activas = REDES.filter((red) => profile.redes?.[red] !== false);
        const lista = activas.length > 0 ? activas : REDES;
        for (const red of lista) {
          targetUrls.push(...LOGIN_URLS[red]);
        }
      } else if (target.startsWith("login:")) {
        // Login individual (🔑): abrir SOLO la página de inicio de sesión de esa red,
        // sin abrir el resto. Las cookies quedan en --user-data-dir del canal.
        const red = target.slice("login:".length);
        if (profile.redes?.[red] === false) {
          sendJson(res, 400, { error: `La red ${red} no está activada en este canal` });
          return;
        }
        targetUrls.push(...LOGIN_URLS[red]);
      } else {
        targetUrls.push(...TARGET_URLS[target]);
      }

      const windowSize = isMobile ? "--window-size=412,915" : "--window-size=1280,800";

      const chromeArgs = [
        `--user-data-dir=${profileDataDir}`,
        "--no-first-run",
        "--no-default-browser-check",
        windowSize,
      ];

      if (isMobile) {
        // User agent móvil de Android (Google Pixel 8) y soporte táctil
        chromeArgs.push("--user-agent=Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.88 Mobile Safari/537.36");
        chromeArgs.push("--touch-events=enabled");
        chromeArgs.push("--enable-viewport");
      }

      // Resolver proxy guardado
      let proxyConfig = null;
      if (profile.proxyId) {
        const proxies = getProxies();
        proxyConfig = proxies.find((pr) => pr.id === profile.proxyId);
      }

      // Extensiones temporales del canal (se combinan en UN solo --load-extension)
      const extPaths = [];
      if (proxyConfig && proxyConfig.host) {
        if (proxyConfig.user && proxyConfig.pass) {
          // Inyectar extensión de proxy con credenciales automáticas
          extPaths.push(setupProxyExtension(profileDataDir, proxyConfig));
        } else {
          // Proxy directo por IP sin autenticación
          chromeArgs.push(`--proxy-server=${proxyConfig.protocolo || "http"}://${proxyConfig.host}:${proxyConfig.port}`);
        }
      }

      // Auto-login (🔑): si el canal tiene claves guardadas, la extensión temporal
      // rellena y envía los formularios de inicio de sesión sin intervención.
      let autoLoginActivo = false;
      const autoLoginExt = setupAutoLoginExtension(profileDataDir, getCredenciales()[id] || {});
      if (autoLoginExt) {
        extPaths.push(autoLoginExt);
        autoLoginActivo = true;
      }
      if (extPaths.length > 0) {
        chromeArgs.push(`--load-extension=${extPaths.join(",")}`);
      }

      for (const targetUrl of targetUrls) {
        chromeArgs.push(targetUrl);
      }

      try {
        const child = spawn(BROWSER_PATH, chromeArgs, {
          detached: true,
          stdio: "ignore",
        });
        child.unref();
        markRunning(id, child);

        profile.ultimoInicio = new Date().toISOString();
        saveProfiles(profiles);

        sendJson(res, 200, {
          ok: true,
          message: "Navegador iniciado correctamente",
          target,
          urlsAbiertas: targetUrls.length,
          proxyUsado: proxyConfig ? proxyConfig.nombre : "Directo",
          autoLogin: autoLoginActivo,
        });
      } catch (err) {
        sendJson(res, 500, { error: `Error lanzando el navegador: ${err.message}` });
      }
      return;
    }

    // ARCHIVOS ESTÁTICOS (con protección contra path traversal)
    let decodedPath;
    try {
      decodedPath = decodeURIComponent(pathname);
    } catch {
      sendJson(res, 400, { error: "Ruta inválida" });
      return;
    }

    const staticRoot = path.resolve(__dirname);
    const resolvedFile = path.resolve(staticRoot, decodedPath === "/" ? "index.html" : `.${decodedPath}`);

    // Bloquear cualquier ruta que escape del directorio de la aplicación
    if (resolvedFile !== staticRoot && !resolvedFile.startsWith(staticRoot + path.sep)) {
      sendJson(res, 403, { error: "Ruta no permitida" });
      return;
    }

    let filePath = resolvedFile;
    let fileStat = null;
    try {
      fileStat = fs.statSync(filePath);
    } catch {}
    if (!fileStat || fileStat.isDirectory()) {
      if (path.extname(decodedPath)) {
        // Petición de un archivo con extensión que no existe: sin fallback SPA
        sendJson(res, 404, { error: "Archivo no encontrado" });
        return;
      }
      // Fallback SPA: servir la interfaz principal
      filePath = path.join(staticRoot, "index.html");
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || "text/plain";

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500, { "X-Content-Type-Options": "nosniff" });
        res.end(`Error leyendo archivo: ${err.code}`);
        return;
      }
      const headers = {
        "Content-Type": mimeType,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-cache",
      };
      if (mimeType.startsWith("text/html")) {
        headers["Content-Security-Policy"] = CSP_HTML;
      }
      res.writeHead(200, headers);
      res.end(content);
    });
  } catch (err) {
    sendJson(res, err.message?.includes("demasiado grande") ? 413 : 400, { error: err.message || "Error interno" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`\n🚀 [Browser Factory v${VERSION}] Servidor activo en http://127.0.0.1:${PORT}`);
  console.log(`🧭 Motor detectado: ${ENGINE} (${BROWSER_PATH || "no encontrado"})`);
  console.log(`🎬 Miniaturas de videos: ${FFMPEG_OK ? "ffmpeg OK" : "ffmpeg no detectado (se usará marcador visual)"}`);
  console.log(`📂 Almacenamiento local de canales en: ${DATA_DIR}\n`);
});
