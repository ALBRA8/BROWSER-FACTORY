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
  tiktok: document.getElementById("red-tiktok"),
  youtube: document.getElementById("red-youtube"),
  instagram: document.getElementById("red-instagram"),
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

const NETWORK_META = {
  tiktok: { icon: "🎵", label: "TikTok", urlTitle: "Abrir TikTok Studio para subir video en este canal" },
  youtube: { icon: "🔴", label: "YouTube", urlTitle: "Abrir YouTube Studio para subir Short/Video" },
  instagram: { icon: "📸", label: "Instagram", urlTitle: "Abrir Instagram para subir Reel/Post" },
  x: { icon: "𝕏", label: "X", urlTitle: "Abrir X (Twitter) con el compositor de post" },
  telegram: { icon: "✈️", label: "Telegram", urlTitle: "Abrir Telegram Web para publicar en canales" },
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
    if (["tiktok", "youtube", "instagram", "x", "telegram"].includes(currentFilter)) {
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
          <td>
            <div class="launcher-group">
              ${launcherButtons}
              <button class="btn-network mobile" onclick="launchChannel('${p.id}', 'mobile', this)" title="Abrir en formato Celular (Smartphone vertical / Android) con huella táctil">
                📱 Celular
              </button>
              <button class="btn-network all" onclick="launchChannel('${p.id}', 'all', this)" title="Abrir todas las redes activadas de este canal a la vez">
                🚀 Abrir Todo
              </button>
            </div>
          </td>
          <td>${videoContent}</td>
          <td>${proxyHtml}</td>
          <td>
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
        tiktok: redChecks.tiktok.checked,
        youtube: redChecks.youtube.checked,
        instagram: redChecks.instagram.checked,
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
