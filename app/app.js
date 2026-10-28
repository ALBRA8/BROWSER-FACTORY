// Lógica del cliente de Browser Factory (Gestor Multicanal Todo-en-Uno)

let allProfiles = [];
let allProxies = [];
let currentFilter = "all";
let searchQuery = "";

const profilesBody = document.getElementById("profiles-body");
const emptyState = document.getElementById("empty-state");
const statTotal = document.getElementById("stat-total");
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

async function init() {
  await checkSystem();
  await loadProxies();
  await loadProfiles();
  setupEvents();
}

async function checkSystem() {
  try {
    const res = await fetch("/api/system");
    const data = await res.json();
    if (data.chromeAvailable) {
      statChrome.textContent = "Chrome OK";
      statChrome.className = "stat-val online";
    } else {
      statChrome.textContent = "Chrome no hallado";
      statChrome.className = "stat-val warning";
    }
    statProxies.textContent = data.proxiesCount || 0;
  } catch (err) {
    statChrome.textContent = "Modo Local";
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

function render() {
  const filtered = allProfiles.filter((p) => {
    if (currentFilter === "pending" && !p.videoPendiente) return false;

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
      const tagsHtml = (p.etiquetas || [])
        .map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`)
        .join("");

      const videoContent = p.videoPendiente
        ? `
          <div class="video-cell">
            <span class="video-name" title="${escapeHtml(p.videoPendiente)}">🎬 ${escapeHtml(p.videoPendiente)}</span>
            <button class="btn-publish" onclick="markPublished('${p.id}')" title="Marcar como subido para archivar en el historial">✓ Publicado</button>
          </div>
        `
        : `
          <div class="video-cell">
            <span class="video-empty">Sin video asignado</span>
            <button class="btn-publish" style="border-style:dashed;" onclick="promptAssignVideo('${p.id}')">+ Asignar</button>
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

      return `
        <tr>
          <td>
            <div class="account-cell" style="font-size:15px;">${escapeHtml(p.nombre)}</div>
            <div style="margin-top:4px;">${tagsHtml || '<span class="video-empty">—</span>'}</div>
            ${p.ultimoInicio ? `<div class="account-sub" style="margin-top:4px;">Último uso: ${new Date(p.ultimoInicio).toLocaleTimeString()}</div>` : ""}
          </td>
          <td>
            <div class="launcher-group">
              <button class="btn-network tiktok" onclick="launchChannel('${p.id}', 'tiktok', this)" title="Abrir TikTok Studio para subir video en este canal">
                🎵 TikTok
              </button>
              <button class="btn-network youtube" onclick="launchChannel('${p.id}', 'youtube', this)" title="Abrir YouTube Studio para subir Short/Video">
                🔴 YouTube
              </button>
              <button class="btn-network instagram" onclick="launchChannel('${p.id}', 'instagram', this)" title="Abrir Instagram para subir Reel/Post">
                📸 Instagram
              </button>
              <button class="btn-network mobile" onclick="launchChannel('${p.id}', 'mobile', this)" title="Abrir en formato Celular (Smartphone vertical / Android) con huella táctil">
                📱 Celular
              </button>
              <button class="btn-network all" onclick="launchChannel('${p.id}', 'all', this)" title="Abrir las 3 redes juntas (TikTok + YouTube + Instagram) de este canal">
                🚀 Abrir Todo
              </button>
            </div>
          </td>
          <td>${videoContent}</td>
          <td>${proxyHtml}</td>
          <td>
            <div class="actions-cell">
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
    renderProxyDropdown();
    modalProfile.classList.remove("hidden");
    profileNameInput.focus();
  });

  document.getElementById("btn-close-modal").addEventListener("click", () => modalProfile.classList.add("hidden"));
  document.getElementById("btn-cancel-modal").addEventListener("click", () => modalProfile.classList.add("hidden"));

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

// Lanzar red o celular para un canal
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
        mobile: "📱 Celular Android (Smartphone)",
        all: "Ecosistema Completo (TikTok + YT + IG)",
      };
      showToast(`🚀 Abriendo ${targetLabels[target] || target} para ${channel?.nombre}`);
      await loadProfiles();
    } else {
      alert("Error lanzando Chrome: " + data.error);
    }
  } catch (err) {
    alert("Error de conexión: " + err.message);
  } finally {
    buttonEl.disabled = false;
    buttonEl.innerHTML = originalText;
  }
};

// Asignar video a canal
window.promptAssignVideo = async function (id) {
  const current = allProfiles.find((p) => p.id === id);
  const video = prompt("Escribe el nombre o ruta del video a publicar para este canal:", current?.videoPendiente || "");
  if (video === null) return;

  try {
    const res = await fetch(`/api/profiles/${id}/assign-video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ video: video.trim() }),
    });
    const data = await res.json();
    if (data.ok) {
      showToast("Video asignado correctamente");
      await loadProfiles();
    }
  } catch (err) {
    alert("Error al asignar: " + err.message);
  }
};

// Marcar como publicado
window.markPublished = async function (id) {
  const profile = allProfiles.find((p) => p.id === id);
  if (!profile || !profile.videoPendiente) return;

  if (!confirm(`¿Confirmas que el video "${profile.videoPendiente}" ya fue publicado en ${profile.nombre}?`)) {
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

  modalTitle.textContent = "Editar Canal";
  profileIdInput.value = profile.id;
  profileNameInput.value = profile.nombre;
  profileTagsInput.value = (profile.etiquetas || []).join(", ");
  profileVideoInput.value = profile.videoPendiente || "";
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
