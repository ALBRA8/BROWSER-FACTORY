// Servidor local de Browser Factory
// Sirve la interfaz web, gestiona perfiles, proxies guardados y lanzamiento de Chrome.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const PORT = 3300;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const SESIONES_DIR = path.join(DATA_DIR, "sesiones");
const PROFILES_FILE = path.join(DATA_DIR, "perfiles.json");
const PROXIES_FILE = path.join(DATA_DIR, "proxies.json");

// Asegurar directorios
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(SESIONES_DIR)) fs.mkdirSync(SESIONES_DIR, { recursive: true });

// Inicializar el catálogo vacío: las credenciales de proxy nunca deben quedar
// codificadas en el repositorio. Cada instalación agrega sus proxies localmente.
if (!fs.existsSync(PROXIES_FILE)) {
  fs.writeFileSync(PROXIES_FILE, JSON.stringify([], null, 2), "utf8");
}

// Pre-configurar perfiles
if (!fs.existsSync(PROFILES_FILE)) {
  fs.writeFileSync(
    PROFILES_FILE,
    JSON.stringify(
      [
        {
          id: "ejemplo-tiktok",
          nombre: "Canal Curiosidades",
          plataforma: "tiktok",
          etiquetas: ["Curiosidades", "Viral"],
          proxyId: "",
          videoPendiente: "curiosidades_espacio_01.mp4",
          historial: [],
          creado: new Date().toISOString(),
          ultimoInicio: null,
        },
        {
          id: "ejemplo-youtube",
          nombre: "Canal Finanzas Pro",
          plataforma: "youtube",
          etiquetas: ["Finanzas", "Shorts"],
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

// Detección de Google Chrome
function findChrome() {
  const candidates = {
    darwin: [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      path.join(os.homedir(), "Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ],
    win32: [
      path.join(process.env.PROGRAMFILES ?? "C:\\Program Files", "Google\\Chrome\\Application\\chrome.exe"),
      path.join(process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)", "Google\\Chrome\\Application\\chrome.exe"),
      path.join(process.env.LOCALAPPDATA ?? "", "Google\\Chrome\\Application\\chrome.exe"),
    ],
  }[process.platform];

  if (candidates) {
    const found = candidates.find((file) => fs.existsSync(file));
    if (found) return found;
  }
  return null;
}

const CHROME_PATH = findChrome();

function getProfiles() {
  try {
    return JSON.parse(fs.readFileSync(PROFILES_FILE, "utf8"));
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
          scheme: "${proxyConfig.protocolo || 'http'}",
          host: "${proxyConfig.host}",
          port: parseInt(${proxyConfig.port})
        },
        bypassList: ["localhost", "127.0.0.1"]
      }
    };

    chrome.proxy.settings.set({ value: config, scope: "regular" }, function() {});

    chrome.webRequest.onAuthRequired.addListener(
      function(details) {
        return {
          authCredentials: {
            username: "${proxyConfig.user || ''}",
            password: "${proxyConfig.pass || ''}"
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

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // APAGAR SERVIDOR
  if (pathname === "/api/shutdown" && req.method === "POST") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, message: "Apagando Browser Factory..." }));
    console.log("\n🛑 [Browser Factory] Apagando el servidor y liberando recursos...");
    setTimeout(() => {
      process.exit(0);
    }, 500);
    return;
  }

  // SYSTEM STATUS
  if (pathname === "/api/system" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        chromeAvailable: Boolean(CHROME_PATH),
        chromePath: CHROME_PATH,
        profilesCount: getProfiles().length,
        proxiesCount: getProxies().length,
      }),
    );
    return;
  }

  // PROXIES API
  if (pathname === "/api/proxies" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(getProxies()));
    return;
  }

  if (pathname === "/api/proxies" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
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
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, proxy: proxyRecord }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (pathname.startsWith("/api/proxies/") && req.method === "DELETE") {
    const id = pathname.replace("/api/proxies/", "");
    const proxies = getProxies().filter((p) => p.id !== id);
    saveProxies(proxies);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // PROFILES API
  if (pathname === "/api/profiles" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(getProfiles()));
    return;
  }

  if (pathname === "/api/profiles" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const profiles = getProfiles();
        const id = data.id || `perfil-${Date.now()}`;
        const existingIndex = profiles.findIndex((p) => p.id === id);

        const profileData = {
          id,
          nombre: data.nombre?.trim() || "Nuevo Canal",
          etiquetas: Array.isArray(data.etiquetas) ? data.etiquetas : (data.etiquetas || "").split(",").map((t) => t.trim()).filter(Boolean),
          proxyId: data.proxyId || "",
          videoPendiente: data.videoPendiente || "",
          historial: existingIndex >= 0 ? profiles[existingIndex].historial || [] : [],
          creado: existingIndex >= 0 ? profiles[existingIndex].creado : new Date().toISOString(),
          ultimoInicio: existingIndex >= 0 ? profiles[existingIndex].ultimoInicio : null,
        };

        if (existingIndex >= 0) {
          profiles[existingIndex] = { ...profiles[existingIndex], ...profileData };
        } else {
          profiles.unshift(profileData);
        }

        saveProfiles(profiles);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, profile: profileData }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (pathname.startsWith("/api/profiles/") && req.method === "DELETE") {
    const id = pathname.replace("/api/profiles/", "");
    const profiles = getProfiles().filter((p) => p.id !== id);
    saveProfiles(profiles);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // ASIGNAR VIDEO
  if (pathname.endsWith("/assign-video") && req.method === "POST") {
    const id = pathname.split("/")[3];
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { video } = JSON.parse(body);
        const profiles = getProfiles();
        const profile = profiles.find((p) => p.id === id);
        if (profile) {
          profile.videoPendiente = video || "";
          saveProfiles(profiles);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, profile }));
        } else {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Perfil no encontrado" }));
        }
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // MARCAR COMO PUBLICADO
  if (pathname.endsWith("/mark-published") && req.method === "POST") {
    const id = pathname.split("/")[3];
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
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, profile }));
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Perfil no encontrado" }));
    }
    return;
  }

  // LANZAR NAVEGADOR AISLADO CON PROXY
  if (pathname.endsWith("/launch") && req.method === "POST") {
    const id = pathname.split("/")[3];
    const profiles = getProfiles();
    const profile = profiles.find((p) => p.id === id);

    if (!profile) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Canal no encontrado" }));
      return;
    }

    if (!CHROME_PATH) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Google Chrome no está instalado en las rutas estándar" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      let target = "all";
      try {
        if (body) {
          const parsed = JSON.parse(body);
          if (parsed.target) target = parsed.target;
        }
      } catch {}

      const profileDataDir = path.join(SESIONES_DIR, id);
      if (!fs.existsSync(profileDataDir)) {
        fs.mkdirSync(profileDataDir, { recursive: true });
      }

      // Determinar URLs y configuración según el botón pulsado
      const targetUrls = [];
      const isMobile = target === "mobile";

      if (target === "tiktok") {
        targetUrls.push("https://www.tiktok.com/upload?lang=es");
      } else if (target === "youtube") {
        targetUrls.push("https://studio.youtube.com");
      } else if (target === "instagram") {
        targetUrls.push("https://www.instagram.com");
      } else if (target === "mobile") {
        targetUrls.push("https://www.tiktok.com");
        targetUrls.push("https://www.instagram.com");
      } else {
        // "all": abre TikTok, YouTube Studio e Instagram juntos
        targetUrls.push("https://www.tiktok.com/upload?lang=es");
        targetUrls.push("https://studio.youtube.com");
        targetUrls.push("https://www.instagram.com");
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

      if (proxyConfig && proxyConfig.host) {
        if (proxyConfig.user && proxyConfig.pass) {
          // Inyectar extensión de proxy con credenciales automáticas
          const extPath = setupProxyExtension(profileDataDir, proxyConfig);
          chromeArgs.push(`--load-extension=${extPath}`);
        } else {
          // Proxy directo por IP sin autenticación
          chromeArgs.push(`--proxy-server=${proxyConfig.protocolo || 'http'}://${proxyConfig.host}:${proxyConfig.port}`);
        }
      }

      for (const url of targetUrls) {
        chromeArgs.push(url);
      }

      try {
        const child = spawn(CHROME_PATH, chromeArgs, {
          detached: true,
          stdio: "ignore",
        });
        child.unref();

        profile.ultimoInicio = new Date().toISOString();
        saveProfiles(profiles);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            ok: true,
            message: "Navegador iniciado correctamente",
            target,
            proxyUsado: proxyConfig ? proxyConfig.nombre : "Directo",
          }),
        );
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: `Error lanzando Chrome: ${err.message}` }));
      }
    });
    return;
  }

  // ARCHIVOS ESTÁTICOS
  let filePath = path.join(__dirname, pathname === "/" ? "index.html" : pathname);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, "index.html");
  }

  const ext = path.extname(filePath);
  const mimeType = MIME_TYPES[ext] || "text/plain";

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end(`Error leyendo archivo: ${err.code}`);
      return;
    }
    res.writeHead(200, { "Content-Type": mimeType });
    res.end(content);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`\n🚀 [Browser Factory] Servidor activo en http://127.0.0.1:${PORT}`);
  console.log(`🧭 Chrome detectado: ${CHROME_PATH || "No detectado"}`);
  console.log(`📂 Almacenamiento local de perfiles en: ${DATA_DIR}\n`);
});
