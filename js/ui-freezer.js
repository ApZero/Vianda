const UIFreezer = {
  render() {
    const view = document.getElementById("view");
    const batches = Storage.getBatches()
      .filter((b) => b.status !== "archived" && b.servingsRemaining > 0)
      .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));

    const totalLeft = batches.reduce((sum, b) => sum + b.servingsRemaining, 0);

    const card = (b) => {
      const pct = Math.round((b.servingsRemaining / b.servings) * 100);
      return `
      <div class="card">
        <div class="card-row">
          <div>
            <div style="font-weight:600;">${b.name}</div>
            <div class="muted" style="margin-top:2px;">${b.servingsRemaining} de ${b.servings} porciones restantes</div>
          </div>
          <span class="pill">${Nutrition.round0(b.perServing.kcal)} kcal</span>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%;"></div></div>
        <div class="flex-between" style="margin-top:12px; gap:8px;">
          <button class="btn btn-secondary btn-sm" data-eat="${b.id}" data-n="1">Comí 1 porción</button>
          <button class="btn btn-secondary btn-sm" data-eat="${b.id}" data-n="2">Comimos 2</button>
        </div>
      </div>`;
    };

    view.innerHTML = `
      <div class="eyebrow">Inventario congelado</div>
      <h2 style="font-size:22px; margin-top:2px;">Freezer</h2>
      <div class="stat-box" style="margin-bottom:14px;">
        <div class="num">${totalLeft}</div>
        <div class="lbl">porciones congeladas en total</div>
      </div>
      ${batches.map(card).join("") || `<div class="empty"><span class="glyph">❄</span>No hay porciones congeladas activas.<br>Creá un lote nuevo desde la pestaña Lotes.</div>`}
    `;

    view.querySelectorAll("[data-eat]").forEach((btn) => {
      btn.addEventListener("click", () => this.markEaten(btn.dataset.eat, parseInt(btn.dataset.n, 10)));
    });
  },

  markEaten(batchId, n) {
    const batches = Storage.getBatches();
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) return;
    const eaten = Math.min(n, batch.servingsRemaining);
    batch.servingsRemaining -= eaten;
    batch.consumptionLog = batch.consumptionLog || [];
    batch.consumptionLog.push({ date: new Date().toISOString(), count: eaten });
    if (batch.servingsRemaining <= 0) {
      batch.servingsRemaining = 0;
      batch.status = "archived";
      batch.archivedAt = new Date().toISOString();
    }
    Storage.upsertBatch(batch);
    toast(batch.status === "archived" ? `"${batch.name}" terminado — archivado` : `Anotado: ${eaten} porción(es) de "${batch.name}"`);
    render();
  },
};
