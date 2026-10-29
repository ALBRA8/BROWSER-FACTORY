// Lógica del cliente de Browser Factory v1.0
// Gestor Multicanal Todo-en-Uno: TikTok, YouTube, Instagram, X y Telegram.

let allProfiles = [];
let allProxies = [];
let systemInfo = {};
let currentFilter = "all";
let searchQuery = "";

// Estado del selector de videos
let videoTargetId = null;
let videoItems = [];
let videoSearch = "";
let selectedVideoPath = "";

const profilesBody = document.getElementById("profiles-body");
const emptyState = document.getElementById("empty-state");
const statTotal = document.getElementById("stat-total");
const statActivos = document.getElementById("stat-activos");
const statPending = document.getElementById("stat-pending");
const statProxies = document.getElementById("stat-proxies");
const statChrome = document.getElementById("stat-chrome");

// Modales Canal
const modalProfile = document.getElementById("modal-profile");
const formProfile = document.getElementById("form-profile");
const modalTitle = document.getElementById("modal-title");
const profileIdInput = document.getElementById("profile-id");
const profileNameInput = document.getElementById("profile-name");
const profileTagsInput = document.getElementById("profile-tags");
const profileVideoInput = document.getElementById("profile-video");
const profileProxySelect = document.getElementById("profile-proxy-select");
const redChecks = {
  facebook: document.getElementById("red-facebook"),
  instagram: document.getElementById("red-instagram"),
  whatsapp: document.getElementById("red-whatsapp"),
  tiktok: document.getElementById("red-tiktok"),
  youtube: document.getElementById("red-youtube"),
  x: document.getElementById("red-x"),
  telegram: document.getElementById("red-telegram"),
};

// Modal Selector de Video
const modalVideo = document.getElementById("modal-video");
const videoModalTitle = document.getElementById("video-modal-title");
const videoFolderPath = document.getElementById("video-folder-path");
const videoGrid = document.getElementById("video-grid");
const inputVideoSearch = document.getElementById("input-video-search");
const selectedFileLabel = document.getElementById("selected-file-label");
const btnConfirmVideo = document.getElementById("btn-confirm-video");

// Modales Proxies
const modalProxies = document.getElementById("modal-proxies");
const btnGestionarProxies = document.getElementById("btn-gestionar-proxies");
const btnCloseProxies = document.getElementById("btn-close-proxies");
const btnDismissProxies = document.getElementById("btn-dismiss-proxies");
const formNewProxy = document.getElementById("form-new-proxy");
const inputRawProxy = document.getElementById("input-raw-proxy");
const inputProxyLocation = document.getElementById("input-proxy-location");
const proxiesListEl = document.getElementById("proxies-list");

// Modales Historial
const modalHistory = document.getElementById("modal-history");
const historyTitle = document.getElementById("history-title");
const historyProfileName = document.getElementById("history-profile-name");
const historyItems = document.getElementById("history-items");

const inputSearch = document.getElementById("input-search");
const tabButtons = document.querySelectorAll(".tab-btn");
const toastEl = document.getElementById("toast");

// Iconos SVG de marca (24x24, Simple Icons) — heredan color via currentColor
const ICON_SVG = {
  // Familia Meta
  facebook: '<svg class="ic ic-facebook" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
  instagram: '<svg class="ic ic-instagram" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/></svg>',
  whatsapp: '<svg class="ic ic-whatsapp" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>',
  // Otras familias
  tiktok: '<svg class="ic ic-tiktok" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.1 1.59-2.87 2.65-4.77 2.81-1.12.09-2.27-.03-3.32-.51-.83-.37-1.6-.9-2.24-1.56-1.55-1.55-2.34-3.81-2.02-5.98.26-1.85 1.25-3.54 2.68-4.7 1.5-1.21 3.48-1.77 5.4-1.55.02 1.34-.01 2.68-.02 4.02-.87-.28-1.82-.25-2.66.06-.87.31-1.61.9-2.1 1.67-.43.66-.66 1.45-.63 2.24.02 1.06.5 2.1 1.3 2.79.76.67 1.81.99 2.82.86 1.02-.13 1.95-.72 2.53-1.56.29-.42.5-.9.61-1.4.09-.42.11-.86.11-1.29.01-4.65-.01-9.31.01-13.96z"/></svg>',
  youtube: '<svg class="ic ic-youtube" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
  x: '<svg class="ic ic-x" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>',
  telegram: '<svg class="ic ic-telegram" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
};

// Iconos de utilidad (estilo trazo, como el resto de botones de acción)
const ICON_MOBILE =
  '<svg class="ic ic-mobile" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>';
const ICON_ROCKET =
  '<svg class="ic ic-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg>';
const ICON_LOCK =
  '<svg class="ic ic-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';

// Rellenar los marcadores <span data-ic="..."> de la interfaz estática
document.querySelectorAll("[data-ic]").forEach((el) => {
  el.innerHTML = ICON_SVG[el.dataset.ic] || "";
});

const NETWORK_META = {
  // Familia Meta primero
  facebook: { icon: ICON_SVG.facebook, label: "Facebook", urlTitle: "Abrir Facebook para publicar en la página o canal" },
  instagram: { icon: ICON_SVG.instagram, label: "Instagram", urlTitle: "Abrir Instagram para subir Reel/Post" },
  whatsapp: { icon: ICON_SVG.whatsapp, label: "WhatsApp", urlTitle: "Abrir WhatsApp Web para publicar en canales y estados" },
  // Otras familias
  tiktok: { icon: ICON_SVG.tiktok, label: "TikTok", urlTitle: "Abrir TikTok Studio para subir video en este canal" },
  youtube: { icon: ICON_SVG.youtube, label: "YouTube", urlTitle: "Abrir YouTube Studio para subir Short/Video" },
  x: { icon: ICON_SVG.x, label: "X", urlTitle: "Abrir X (Twitter) con el compositor de post" },
  telegram: { icon: ICON_SVG.telegram, label: "Telegram", urlTitle: "Abrir Telegram Web para publicar en canales" },
};

async function init() {
  setupEvents();
  await refreshSystem();
  await loadProxies();
  await loadProfiles();
  await loadConfig();
  // Vigilar sesiones activas y estado del motor cada 6 segundos
  setInterval(async () => {
    await refreshSystem();
  }, 6000);
}

async function refreshSystem() {
  try {
    const res = await fetch("/api/system");
    systemInfo = await res.json();
    if (statChrome) {
      if (systemInfo.chromeAvailable) {
        statChrome.textContent = systemInfo.engine || "Chrome OK";
        statChrome.className = "stat-val online";
      } else {
        statChrome.textContent = "Motor no hallado";
        statChrome.className = "stat-val warning";
      }
    }
    statProxies.textContent = systemInfo.proxiesCount || 0;
    statActivos.textContent = (systemInfo.activos || []).length;
    render();
  } catch (err) {
    if (statChrome) statChrome.textContent = "Modo Local";
  }
}

async function loadConfig() {
  try {
    const res = await fetch("/api/config");
    const config = await res.json();
    if (config.carpetaVideos) {
      videoFolderPath.textContent = config.carpetaVideos;
      await scanVideos();
    }
  } catch (err) {
    console.error("Error cargando configuración:", err);
  }
}

async function loadProxies() {
  try {
    const res = await fetch("/api/proxies");
    allProxies = await res.json();
    statProxies.textContent = allProxies.length;
    renderProxyDropdown();
    renderProxiesModalList();
  } catch (err) {
    console.error("Error cargando proxies:", err);
  }
}

function renderProxyDropdown(selectedId = "") {
  profileProxySelect.innerHTML = `<option value="">Directo (Sin proxy)</option>` +
    allProxies.map((pr) => `
      <option value="${pr.id}" ${pr.id === selectedId ? "selected" : ""}>
        🛡️ ${escapeHtml(pr.nombre)} (${escapeHtml(pr.host)} - ${escapeHtml(pr.ubicacion)})
      </option>
    `).join("");
}

function renderProxiesModalList() {
  if (allProxies.length === 0) {
    proxiesListEl.innerHTML = `<div style="padding:16px; text-align:center; color:var(--text-muted); font-size:13px;">No hay proxies guardados aún.</div>`;
    return;
  }

  proxiesListEl.innerHTML = allProxies.map((pr) => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; border-bottom:1px solid #1e232d;">
      <div>
        <div style="font-weight:600; color:#fff; display:flex; align-items:center; gap:6px;">
          <span>🟢 ${escapeHtml(pr.nombre)}</span>
          <span style="font-size:11px; background:#242933; padding:1px 6px; border-radius:4px; color:#9ca3af;">${pr.protocolo.toUpperCase()}</span>
        </div>
        <div style="font-family:monospace; font-size:12px; color:#cbd5e1; margin-top:2px;">
          ${escapeHtml(pr.host)}:${pr.port} ${pr.user ? `(auth: ${escapeHtml(pr.user)})` : ''}
        </div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:1px;">
          📍 ${escapeHtml(pr.ubicacion || 'Sin ubicación')}
        </div>
      </div>
      <div>
        <button class="btn-icon delete" onclick="deleteProxy('${pr.id}')" title="Eliminar proxy">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    </div>
  `).join("");
}

async function loadProfiles() {
  try {
    const res = await fetch("/api/profiles");
    allProfiles = await res.json();
    render();
  } catch (err) {
    showToast("Error cargando canales locales: " + err.message);
  }
}

function profileRedes(p) {
  const base = { tiktok: true, youtube: true, instagram: true, x: true, telegram: true };
  return { ...base, ...(p.redes || {}) };
}

function render() {
  const activos = systemInfo.activos || [];

  const filtered = allProfiles.filter((p) => {
    const redes = profileRedes(p);
    if (currentFilter === "pending" && !p.videoPendiente) return false;
    if (["facebook", "instagram", "whatsapp", "tiktok", "youtube", "x", "telegram"].includes(currentFilter)) {
      if (!redes[currentFilter]) return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const inName = p.nombre.toLowerCase().includes(q);
      const inTags = (p.etiquetas || []).some((t) => t.toLowerCase().includes(q));
      const inVideo = (p.videoPendiente || "").toLowerCase().includes(q);
      return inName || inTags || inVideo;
    }
    return true;
  });

  statTotal.textContent = allProfiles.length;
  statPending.textContent = allProfiles.filter((p) => Boolean(p.videoPendiente)).length;

  if (filtered.length === 0) {
    profilesBody.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  profilesBody.innerHTML = filtered
    .map((p) => {
      const redes = profileRedes(p);
      const isActive = activos.includes(p.id);

      const tagsHtml = (p.etiquetas || [])
        .map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`)
        .join("");

      // Miniatura del video asignado (solo si ffmpeg está disponible y hay ruta real)
      let miniThumb = "";
      if (p.videoPendiente && systemInfo.ffmpeg && (p.videoPendiente.includes("\\") || p.videoPendiente.includes("/"))) {
        miniThumb = `<img class="mini-thumb" src="/api/thumb?src=${encodeURIComponent(p.videoPendiente)}" alt="" onerror="this.classList.add('thumb-missing')">`;
      }

      const videoContent = p.videoPendiente
        ? `
          <div class="video-cell">
            ${miniThumb}
            <div class="video-meta">
              <span class="video-name" title="${escapeHtml(p.videoPendiente)}">🎬 ${escapeHtml(baseName(p.videoPendiente))}</span>
              <span class="video-sub">${escapeHtml(shortPath(p.videoPendiente))}</span>
            </div>
            <div class="video-btns">
              <button class="btn-publish dashed" onclick="openVideoModal('${p.id}')" title="Elegir otro video de tu carpeta">⟳</button>
              <button class="btn-publish" onclick="markPublished('${p.id}')" title="Marcar como subido para archivar en el historial">✓ Publicado</button>
            </div>
          </div>
        `
        : `
          <div class="video-cell">
            <span class="video-empty">Sin video asignado</span>
            <button class="btn-publish dashed wide" onclick="openVideoModal('${p.id}')" title="Elegir un video de tu carpeta">+ Asignar Video</button>
          </div>
        `;

      // Resolver proxy
      const proxyObj = allProxies.find((pr) => pr.id === p.proxyId);
      const proxyHtml = proxyObj
        ? `
          <div style="font-size:12px;">
            <div style="color:#10b981; font-weight:600;">🛡️ ${escapeHtml(proxyObj.nombre)}</div>
            <div style="font-family:monospace; color:var(--text-muted); font-size:11px;">${escapeHtml(proxyObj.host)}</div>
          </div>
        `
        : `<span class="video-empty">Directo</span>`;

      // Lanzadores según las redes activadas del canal
      const launcherButtons = Object.entries(NETWORK_META)
        .filter(([key]) => redes[key])
        .map(([key, meta]) => `
          <button class="btn-network ${key}" onclick="launchChannel('${p.id}', '${key}', this)" title="${meta.urlTitle}">
            ${meta.icon} ${meta.label}
          </button>
        `)
        .join("");

      return `
        <tr>
          <td>
            <div class="account-cell" style="font-size:15px;">${escapeHtml(p.nombre)}
              ${isActive ? `<span class="badge-activo" title="Este canal tiene un navegador abierto ahora"><span class="dot"></span>Activo</span>` : ""}
            </div>
            <div style="margin-top:4px;">${tagsHtml || '<span class="video-empty">—</span>'}</div>
            ${p.ultimoInicio ? `<div class="account-sub" style="margin-top:4px;">Último uso: ${fmtFecha(p.ultimoInicio)}</div>` : ""}
          </td>
          <td data-label="Redes & Lanzadores">
            <div class="launcher-group">
              ${launcherButtons}
              <button class="btn-network mobile" onclick="launchChannel('${p.id}', 'mobile', this)" title="Abrir en formato Celular (Smartphone vertical / Android) con huella táctil">
                ${ICON_MOBILE} Celular
              </button>
              <button class="btn-network all" onclick="launchChannel('${p.id}', 'all', this)" title="Abrir todas las redes activadas de este canal a la vez">
                ${ICON_ROCKET} Abrir Todo
              </button>
              <button class="btn-network login" onclick="launchChannel('${p.id}', 'login', this)" title="Primer login: abre la página de inicio de sesión de cada red activa. Inicia sesión una vez, cierra la ventana y la sesión queda guardada">
                ${ICON_LOCK} Login
              </button>
            </div>
          </td>
          <td data-label="Video asignado">${videoContent}</td>
          <td data-label="Proxy">${proxyHtml}</td>
          <td data-label="Acciones">
            <div class="actions-cell">
              ${isActive ? `
              <button class="btn-icon stop" onclick="closeSessions('${p.id}')" title="Cerrar el navegador abierto de este canal">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="5" width="14" height="14" rx="2"></rect></svg>
              </button>` : ""}
              <button class="btn-icon" onclick="viewHistory('${p.id}')" title="Ver historial de publicaciones de este canal">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </button>
              <button class="btn-icon" onclick="editProfile('${p.id}')" title="Editar canal">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button class="btn-icon delete" onclick="deleteProfile('${p.id}')" title="Eliminar canal">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

/* ===================== SELECTOR DE VIDEOS ===================== */

function baseName(ruta) {
  return String(ruta || "").split(/[\\/]/).pop() || ruta;
}

function shortPath(ruta) {
  const s = String(ruta || "");
  if (s.length <= 42) return s;
  return "…" + s.slice(-41);
}

function fmtBytes(n) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function fmtFecha(iso) {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

window.openVideoModal = function (id) {
  const profile = allProfiles.find((p) => p.id === id);
  if (!profile) return;

  videoTargetId = id;
  selectedVideoPath = profile.videoPendiente || "";
  videoSearch = "";
  inputVideoSearch.value = "";

  videoModalTitle.textContent = `🎬 Asignar Video · ${profile.nombre}`;
  updateSelectedLabel();

  modalVideo.classList.remove("hidden");

  if (systemInfo.carpetaVideos) {
    videoFolderPath.textContent = systemInfo.carpetaVideos;
    scanVideos();
  } else {
    videoFolderPath.textContent = "Sin configurar";
    videoGrid.innerHTML = `<div class="video-grid-placeholder">Configura tu carpeta de videos arriba y pulsa «Escanear».</div>`;
  }
};

function updateSelectedLabel() {
  if (selectedVideoPath) {
    selectedFileLabel.innerHTML = `<span class="selected-chip" title="${escapeHtml(selectedVideoPath)}">✅ ${escapeHtml(baseName(selectedVideoPath))}</span>`;
    btnConfirmVideo.disabled = false;
  } else {
    selectedFileLabel.innerHTML = "";
    btnConfirmVideo.disabled = true;
  }
}

async function scanVideos() {
  videoGrid.innerHTML = `<div class="video-grid-placeholder">🔄 Escaneando carpeta…</div>`;
  try {
    const res = await fetch("/api/videos");
    const data = await res.json();
    if (!data.ok) {
      videoGrid.innerHTML = `<div class="video-grid-placeholder">⚠️ ${escapeHtml(data.error || "No se pudo escanear la carpeta")}</div>`;
      return;
    }
    videoItems = data.items || [];
    if (!systemInfo.ffmpeg) {
      videoItems = videoItems.map((v) => ({ ...v, thumb: null }));
    }
    renderVideoGrid();
    if (data.ffmpeg === false) {
      showToast("ℹ️ ffmpeg no detectado: las miniaturas se muestran como marcador visual");
    }
  } catch (err) {
    videoGrid.innerHTML = `<div class="video-grid-placeholder">Error escaneando: ${escapeHtml(err.message)}</div>`;
  }
}

function renderVideoGrid() {
  const q = videoSearch.toLowerCase();
  const list = q
    ? videoItems.filter((v) => v.nombre.toLowerCase().includes(q))
    : videoItems;

  if (list.length === 0) {
    videoGrid.innerHTML = `<div class="video-grid-placeholder">${videoItems.length === 0 ? "No hay videos (.mp4, .mov, .mkv…) en la carpeta configurada." : "Ningún video coincide con el filtro."}</div>`;
    return;
  }

  videoGrid.innerHTML = list
    .map((v) => {
      const isSelected = selectedVideoPath === v.ruta;
      const thumbHtml = v.thumb
        ? `<img class="video-thumb" loading="lazy" src="/api/thumb?src=${encodeURIComponent(v.ruta)}" alt="" onerror="this.outerHTML='<div class=\\'video-thumb placeholder\\'>🎬</div>'">`
        : `<div class="video-thumb placeholder">🎬</div>`;

      return `
        <div class="video-card ${isSelected ? "selected" : ""}" data-ruta="${escapeHtml(v.ruta)}" onclick="pickVideoCard(this)" ondblclick="pickVideoCard(this); confirmAssignVideo()">
          ${thumbHtml}
          <div class="video-card-name" title="${escapeHtml(v.nombre)}">${escapeHtml(v.nombre)}</div>
          <div class="video-card-meta">${fmtBytes(v.tamano)}${v.modificado ? ` · ${new Date(v.modificado).toLocaleDateString()}` : ""}</div>
        </div>
      `;
    })
    .join("");
}

window.pickVideoCard = function (cardEl) {
  selectedVideoPath = cardEl.dataset.ruta || "";
  videoGrid.querySelectorAll(".video-card").forEach((el) => el.classList.remove("selected"));
  cardEl.classList.add("selected");
  updateSelectedLabel();
};

async function nativeDialog(mode, buttonEl) {
  const original = buttonEl.innerHTML;
  buttonEl.disabled = true;
  buttonEl.innerHTML = "⏳ Abriendo…";
  try {
    const res = await fetch("/api/file-dialog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    const data = await res.json();
    if (data.ok && data.ruta) return data.ruta;
    if (data.cancelado) return null;
    showToast("⚠️ " + (data.error || "No se pudo abrir el diálogo de Windows"));
    return null;
  } catch (err) {
    showToast("Error con el diálogo nativo: " + err.message);
    return null;
  } finally {
    buttonEl.disabled = false;
    buttonEl.innerHTML = original;
  }
}

window.confirmAssignVideo = async function () {
  if (!videoTargetId || !selectedVideoPath) return;

  try {
    const res = await fetch(`/api/profiles/${videoTargetId}/assign-video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ video: selectedVideoPath }),
    });
    const data = await res.json();
    if (data.ok) {
      showToast("🎬 Video asignado correctamente");
      modalVideo.classList.add("hidden");
      await loadProfiles();
    } else {
      alert("Error al asignar: " + data.error);
    }
  } catch (err) {
    alert("Error al asignar: " + err.message);
  }
};

/* ===================== EVENTOS ===================== */

function setupEvents() {
  // Tema claro/oscuro (sol y luna)
  const btnTheme = document.getElementById("btn-theme");
  if (btnTheme) {
    btnTheme.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem("bf-theme", next); } catch {}
      showToast(next === "light" ? "☀️ Modo claro activado" : "🌙 Modo oscuro activado");
    });
  }

  // Guía de primer login: ocultar de forma permanente al cerrar
  const loginGuide = document.getElementById("login-guide");
  const btnCloseGuide = document.getElementById("btn-close-guide");
  if (loginGuide && btnCloseGuide) {
    let ocultada = false;
    try { ocultada = localStorage.getItem("bf-guide-login") === "off"; } catch {}
    if (ocultada) loginGuide.classList.add("hidden");
    btnCloseGuide.addEventListener("click", () => {
      loginGuide.classList.add("hidden");
      try { localStorage.setItem("bf-guide-login", "off"); } catch {}
    });
  }

  inputSearch.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    render();
  });

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      render();
    });
  });

  // Modal Nuevo Canal
  document.getElementById("btn-nuevo-perfil").addEventListener("click", () => {
    modalTitle.textContent = "Nuevo Canal / Marca";
    profileIdInput.value = "";
    profileNameInput.value = "";
    profileTagsInput.value = "";
    profileVideoInput.value = "";
    Object.values(redChecks).forEach((chk) => (chk.checked = true));
    renderProxyDropdown();
    modalProfile.classList.remove("hidden");
    profileNameInput.focus();
  });

  document.getElementById("btn-close-modal").addEventListener("click", () => modalProfile.classList.add("hidden"));
  document.getElementById("btn-cancel-modal").addEventListener("click", () => modalProfile.classList.add("hidden"));

  // Modal Selector de Video
  document.getElementById("btn-close-video").addEventListener("click", () => modalVideo.classList.add("hidden"));
  document.getElementById("btn-cancel-video").addEventListener("click", () => modalVideo.classList.add("hidden"));
  document.getElementById("btn-escanear").addEventListener("click", scanVideos);
  btnConfirmVideo.addEventListener("click", confirmAssignVideo);

  inputVideoSearch.addEventListener("input", (e) => {
    videoSearch = e.target.value.trim();
    renderVideoGrid();
  });

  document.getElementById("btn-elegir-carpeta").addEventListener("click", async (e) => {
    const ruta = await nativeDialog("folder", e.currentTarget);
    if (!ruta) return;
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carpetaVideos: ruta }),
      });
      systemInfo.carpetaVideos = ruta;
      videoFolderPath.textContent = ruta;
      showToast("📂 Carpeta de videos configurada");
      await scanVideos();
    } catch (err) {
      alert("Error guardando la carpeta: " + err.message);
    }
  });

  document.getElementById("btn-examinar-archivo").addEventListener("click", async (e) => {
    const ruta = await nativeDialog("file", e.currentTarget);
    if (!ruta) return;
    selectedVideoPath = ruta;
    updateSelectedLabel();
    renderVideoGrid();
  });

  // Modal Proxies
  btnGestionarProxies.addEventListener("click", () => {
    renderProxiesModalList();
    modalProxies.classList.remove("hidden");
  });
  btnCloseProxies.addEventListener("click", () => modalProxies.classList.add("hidden"));
  btnDismissProxies.addEventListener("click", () => modalProxies.classList.add("hidden"));

  // Guardar Nuevo Proxy
  formNewProxy.addEventListener("submit", async (e) => {
    e.preventDefault();
    const raw = inputRawProxy.value.trim();
    const ubicacion = inputProxyLocation.value.trim() || "Ubicación personalizada";

    try {
      const res = await fetch("/api/proxies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw, ubicacion }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast("Proxy guardado con éxito");
        inputRawProxy.value = "";
        inputProxyLocation.value = "";
        await loadProxies();
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      alert("Error guardando proxy: " + err.message);
    }
  });

  // Modal Historial
  document.getElementById("btn-close-history").addEventListener("click", () => modalHistory.classList.add("hidden"));
  document.getElementById("btn-dismiss-history").addEventListener("click", () => modalHistory.classList.add("hidden"));

  // Guardar Canal
  formProfile.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      id: profileIdInput.value || undefined,
      nombre: profileNameInput.value,
      etiquetas: profileTagsInput.value,
      videoPendiente: profileVideoInput.value,
      proxyId: profileProxySelect.value,
      redes: {
        facebook: redChecks.facebook.checked,
        instagram: redChecks.instagram.checked,
        whatsapp: redChecks.whatsapp.checked,
        tiktok: redChecks.tiktok.checked,
        youtube: redChecks.youtube.checked,
        x: redChecks.x.checked,
        telegram: redChecks.telegram.checked,
      },
    };

    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        showToast("Canal guardado con éxito");
        modalProfile.classList.add("hidden");
        await loadProfiles();
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      alert("Error al guardar: " + err.message);
    }
  });

  // Apagar Sistema y liberar recursos
  const btnShutdown = document.getElementById("btn-shutdown");
  if (btnShutdown) {
    btnShutdown.addEventListener("click", async () => {
      if (!confirm("¿Deseas apagar Browser Factory por completo y liberar los recursos del PC?")) {
        return;
      }
      try {
        await fetch("/api/shutdown", { method: "POST" });
        document.body.innerHTML = `
          <div style="display:flex; height:100vh; align-items:center; justify-content:center; flex-direction:column; background:#0d0f12; color:#fff; font-family:'Inter',sans-serif; text-align:center; padding:20px;">
            <div style="font-size:54px; margin-bottom:18px;">🛑</div>
            <h1 style="font-size:24px; font-weight:700; margin-bottom:8px;">Browser Factory se ha apagado</h1>
            <p style="color:#9ca3af; font-size:14px; max-width:420px; line-height:1.6;">
              El servidor se detuvo, el puerto 3300 quedó libre y tu PC ya no consume memoria por este software.
            </p>
            <p style="color:#6b7280; font-size:12px; margin-top:24px;">Ya puedes cerrar esta pestaña con tranquilidad.</p>
          </div>
        `;
      } catch (err) {
        document.body.innerHTML = `
          <div style="display:flex; height:100vh; align-items:center; justify-content:center; flex-direction:column; background:#0d0f12; color:#fff; font-family:'Inter',sans-serif; text-align:center; padding:20px;">
            <div style="font-size:54px; margin-bottom:18px;">🛑</div>
            <h1 style="font-size:24px; font-weight:700; margin-bottom:8px;">Browser Factory se ha apagado</h1>
            <p style="color:#9ca3af; font-size:14px;">El servidor se detuvo y los recursos del PC quedaron liberados.</p>
          </div>
        `;
      }
    });
  }
}

// Eliminar proxy
window.deleteProxy = async function (id) {
  const proxy = allProxies.find((p) => p.id === id);
  if (!confirm(`¿Estás seguro de eliminar el proxy "${proxy?.nombre}"?`)) return;

  try {
    const res = await fetch(`/api/proxies/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.ok) {
      showToast("Proxy eliminado");
      await loadProxies();
      render();
    }
  } catch (err) {
    alert("Error eliminando: " + err.message);
  }
};

// Lanzar red, celular o ecosistema completo para un canal
window.launchChannel = async function (id, target, buttonEl) {
  const originalText = buttonEl.innerHTML;
  buttonEl.disabled = true;
  buttonEl.innerHTML = `<span>⏳</span>`;

  try {
    const res = await fetch(`/api/profiles/${id}/launch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target }),
    });
    const data = await res.json();
    if (data.ok) {
      const channel = allProfiles.find((p) => p.id === id);
      const targetLabels = {
        tiktok: "TikTok",
        youtube: "YouTube Studio",
        instagram: "Instagram",
        x: "X (Twitter)",
        telegram: "Telegram Web",
        mobile: "📱 Celular Android (Smartphone)",
        all: "Ecosistema Completo (redes activadas)",
      };
      showToast(`🚀 Abriendo ${targetLabels[target] || target} para ${channel?.nombre}`);
      await refreshSystem();
      await loadProfiles();
    } else {
      alert("Error lanzando el navegador: " + data.error);
    }
  } catch (err) {
    alert("Error de conexión: " + err.message);
  } finally {
    buttonEl.disabled = false;
    buttonEl.innerHTML = originalText;
  }
};

// Cerrar las sesiones (navegador) abiertas de un canal
window.closeSessions = async function (id) {
  const profile = allProfiles.find((p) => p.id === id);
  if (!confirm(`¿Cerrar el navegador abierto de "${profile?.nombre}"? Las sesiones guardadas NO se borran.`)) {
    return;
  }
  try {
    const res = await fetch(`/api/profiles/${id}/close`, { method: "POST" });
    const data = await res.json();
    if (data.ok) {
      showToast(`🛑 Navegador cerrado (${data.cerradas})`);
      await refreshSystem();
    }
  } catch (err) {
    alert("Error cerrando: " + err.message);
  }
};

// Marcar como publicado
window.markPublished = async function (id) {
  const profile = allProfiles.find((p) => p.id === id);
  if (!profile || !profile.videoPendiente) return;

  if (!confirm(`¿Confirmas que el video "${baseName(profile.videoPendiente)}" ya fue publicado en ${profile.nombre}?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/profiles/${id}/mark-published`, { method: "POST" });
    const data = await res.json();
    if (data.ok) {
      showToast(`✅ Video archivado en el historial de ${profile.nombre}`);
      await loadProfiles();
    }
  } catch (err) {
    alert("Error: " + err.message);
  }
};

// Ver historial
window.viewHistory = function (id) {
  const profile = allProfiles.find((p) => p.id === id);
  if (!profile) return;

  historyProfileName.textContent = `Canal: ${profile.nombre}`;
  const list = profile.historial || [];

  if (list.length === 0) {
    historyItems.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px;">Aún no se ha marcado ningún video como publicado en este canal.</div>`;
  } else {
    historyItems.innerHTML = list
      .map(
        (h) => `
        <div class="history-item">
          <span style="font-family: monospace;">🎬 ${escapeHtml(h.video)}</span>
          <span class="history-date">${new Date(h.publicadoEl).toLocaleDateString()} ${new Date(h.publicadoEl).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      `,
      )
      .join("");
  }

  modalHistory.classList.remove("hidden");
};

// Editar canal
window.editProfile = function (id) {
  const profile = allProfiles.find((p) => p.id === id);
  if (!profile) return;

  const redes = profileRedes(profile);

  modalTitle.textContent = "Editar Canal";
  profileIdInput.value = profile.id;
  profileNameInput.value = profile.nombre;
  profileTagsInput.value = (profile.etiquetas || []).join(", ");
  profileVideoInput.value = profile.videoPendiente || "";
  Object.entries(redChecks).forEach(([key, chk]) => (chk.checked = Boolean(redes[key])));
  renderProxyDropdown(profile.proxyId);

  modalProfile.classList.remove("hidden");
};

// Eliminar canal
window.deleteProfile = async function (id) {
  const profile = allProfiles.find((p) => p.id === id);
  if (!confirm(`¿Estás seguro de eliminar el canal "${profile?.nombre}"? Las sesiones de Chrome guardadas no se borrarán del disco.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/profiles/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.ok) {
      showToast("Canal eliminado");
      await refreshSystem();
      await loadProfiles();
    }
  } catch (err) {
    alert("Error eliminando: " + err.message);
  }
};

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  setTimeout(() => toastEl.classList.add("hidden"), 3500);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

init();
