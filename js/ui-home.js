const UIHome = {
  render() {
    const view = document.getElementById("view");
    const batches = Storage.getBatches();
    const active = batches.filter((b) => b.status !== "archived");
    const settings = Storage.getSettings();

    const totalLeft = active.reduce((s, b) => s + b.servingsRemaining, 0);
    const frozenValue = active.reduce((s, b) => s + b.perServing.cost * b.servingsRemaining, 0);
    const lowStock = totalLeft <= settings.lowStockThreshold;
    const avgScore = active.length ? Math.round(active.reduce((s, b) => s + b.score.total, 0) / active.length) : null;

    const lowest = [...active].sort((a, b) => a.servingsRemaining - b.servingsRemaining)[0];

    view.innerHTML = `
      <div class="hero">
        <div class="flex-between">
          <span class="hero-label">Porciones congeladas</span>
          <button class="icon-btn" id="settingsBtn" style="background:rgba(244,237,225,0.14);">⚙</button>
        </div>
        <div class="hero-number">${totalLeft}</div>
        <div class="hero-sub">en ${active.length} lote${active.length === 1 ? "" : "s"} activo${active.length === 1 ? "" : "s"} · valor congelado ₲${Nutrition.round0(frozenValue).toLocaleString("es-PY")}</div>
        ${lowStock ? `<div class="hero-warning">⚠ Quedan pocas porciones (umbral: ${settings.lowStockThreshold}). Conviene preparar un lote nuevo pronto.</div>` : ""}
      </div>

      <div class="stat-grid">
        <div class="stat-box"><div class="num">${active.length}</div><div class="lbl">lotes activos</div></div>
        <div class="stat-box"><div class="num">${avgScore !== null ? avgScore : "—"}</div><div class="lbl">puntaje promedio</div></div>
      </div>

      ${lowest ? `
      <div class="section-title"><h2>Se está por terminar</h2></div>
      <div class="card">
        <div class="card-row">
          <div>
            <div style="font-weight:600;">${lowest.name}</div>
            <div class="muted">${lowest.servingsRemaining} de ${lowest.servings} porciones</div>
          </div>
          <span class="score-badge ${Score.label(lowest.score.total).cls}">${lowest.score.total}</span>
        </div>
      </div>` : `
      <div class="empty"><span class="glyph">◐</span>Creá tu primer lote desde la pestaña Lotes para empezar a llevar el registro.</div>
      `}

      <div class="section-title"><h2>Esta semana consumimos</h2></div>
      <div class="card">
        <div class="muted">${this.weekSummary(batches)}</div>
      </div>
    `;

    document.getElementById("settingsBtn").addEventListener("click", () => this.openSettings());
  },

  weekSummary(batches) {
    const allLogs = [];
    batches.forEach((b) => (b.consumptionLog || []).forEach((l) => allLogs.push(l)));
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recent = allLogs.filter((l) => new Date(l.date) >= weekAgo);
    const total = recent.reduce((s, l) => s + l.count, 0);
    if (total === 0) return "Todavía no marcaste porciones comidas esta semana.";
    return `${total} porciones marcadas como comidas en los últimos 7 días.`;
  },

  openSettings() {
    const settings = Storage.getSettings();
    openModal(`
      <div class="modal-header">
        <h3>Configuración</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <label>Avisar cuando queden menos de (porciones)</label>
      <input id="s-threshold" type="number" min="0" step="1" value="${settings.lowStockThreshold}">
      <label>Porciones que comen por día (referencia)</label>
      <input id="s-people" type="number" min="1" step="1" value="${settings.peoplePerDay}">

      <div class="divider"></div>
      <div style="font-weight:600; font-size:13.5px; margin-bottom:8px;">Respaldo</div>
      <p class="muted" style="margin-top:0;">Se genera un respaldo automático la primera vez que abrís la app cada día. También podés exportar o importar manualmente.</p>
      <div class="flex-between" style="gap:10px;">
        <button class="btn btn-secondary btn-sm btn-block" id="exportNowBtn">Exportar ahora</button>
        <button class="btn btn-secondary btn-sm btn-block" id="importBtn">Importar</button>
      </div>
      <input type="file" id="importFile" accept="application/json" style="display:none;">

      <button class="btn btn-primary btn-block" id="saveSettingsBtn" style="margin-top:18px;">Guardar</button>
    `);

    document.getElementById("saveSettingsBtn").addEventListener("click", () => {
      const updated = {
        lowStockThreshold: parseInt(document.getElementById("s-threshold").value, 10) || 0,
        peoplePerDay: parseInt(document.getElementById("s-people").value, 10) || 1,
      };
      Storage.saveSettings(updated);
      closeModal();
      toast("Configuración guardada ✓");
      render();
    });
    document.getElementById("exportNowBtn").addEventListener("click", () => {
      Backup.manualExport();
      toast("Respaldo exportado ✓");
    });
    document.getElementById("importBtn").addEventListener("click", () => document.getElementById("importFile").click());
    document.getElementById("importFile").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!confirm("Importar reemplazará los datos actuales de ingredientes, lotes y configuración. ¿Continuar?")) return;
      try {
        await Backup.importFromFile(file);
        closeModal();
        toast("Datos importados ✓");
        render();
      } catch (err) {
        toast("No se pudo leer el archivo de respaldo");
      }
    });
  },
};
