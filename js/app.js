// Controlador principal: navegación entre pestañas, modal, toast, arranque
let currentTab = "hoy";

const RENDERERS = {
  hoy: () => UIHome.render(),
  lotes: () => UIBatches.render(),
  congelador: () => UIFreezer.render(),
  ingredientes: () => UIIngredients.render(),
  stats: () => UIStats.render(),
};

function render() {
  const view = document.getElementById("view");
  view.innerHTML = "";
  RENDERERS[currentTab]();
}

function setTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  render();
}

document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => setTab(btn.dataset.tab));
});

// ---------- Modal ----------
function openModal(innerHTML) {
  const root = document.getElementById("modalRoot");
  root.innerHTML = `
    <div class="modal-backdrop" id="modalBackdrop">
      <div class="modal-sheet" id="modalSheet">${innerHTML}</div>
    </div>`;
  document.getElementById("modalBackdrop").addEventListener("click", (e) => {
    if (e.target.id === "modalBackdrop") closeModal();
  });
}
function closeModal() {
  document.getElementById("modalRoot").innerHTML = "";
}

// ---------- Toast ----------
let toastTimer = null;
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
}

// ---------- Backup button ----------
document.getElementById("backupBtn").addEventListener("click", () => {
  Backup.manualExport();
  toast("Respaldo exportado ✓");
});

// ---------- Service worker ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

// ---------- Init ----------
(function init() {
  render();
  // dispara el respaldo automático del día si corresponde, sin bloquear el primer render
  setTimeout(() => {
    const did = Backup.runAutoBackupIfNeeded();
    if (did) toast("Respaldo automático del día guardado ✓");
  }, 900);
})();
