const FROZEN_UNIT_LABELS = { kg: "kg", unidad: "un.", ml: "ml" };

const UIFreezer = {
  render() {
    const view = document.getElementById("view");
    const batches = Storage.getBatches()
      .filter((b) => b.status !== "archived" && b.servingsRemaining > 0)
      .sort((a, b) => (a.number || 0) - (b.number || 0));
    const totalLeft = batches.reduce((sum, b) => sum + b.servingsRemaining, 0);

    const frozenItems = Storage.getFrozenItems().sort((a, b) => {
      if (!a.useByDate && !b.useByDate) return 0;
      if (!a.useByDate) return 1;
      if (!b.useByDate) return -1;
      return a.useByDate.localeCompare(b.useByDate);
    });
    const settings = Storage.getSettings();

    const batchCard = (b) => {
      const pct = Math.round((b.servingsRemaining / b.servings) * 100);
      return `
      <div class="card">
        <div class="card-row">
          <div>
            <div style="font-weight:600;"><span class="pill mono" style="margin-right:6px;">#${b.number}</span>${b.name}</div>
            <div class="muted" style="margin-top:2px;">${b.servingsRemaining} de ${b.servings} porciones restantes</div>
          </div>
          <span class="pill">${Nutrition.round0(b.perServing.kcal)} kcal</span>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%;"></div></div>
        <div class="flex-between" style="margin-top:12px; gap:8px;">
          <button class="btn btn-ghost btn-sm" data-history="${b.id}">Historial</button>
          <button class="btn btn-secondary btn-sm" data-quickadd="${b.id}" style="width:38px; padding:7px 0; font-size:16px;">+</button>
        </div>
      </div>`;
    };

    const frozenCard = (item) => {
      const status = this.expiryStatus(item, settings);
      return `
      <div class="card card-tap" data-fitem="${item.id}">
        <div class="card-row">
          <div>
            <div style="font-weight:600;">${item.name}</div>
            <div class="muted" style="margin-top:2px;">
              ${item.quantity} ${FROZEN_UNIT_LABELS[item.unit] || item.unit}
              ${item.frozenDate ? ` · congelado ${this.formatDate(item.frozenDate)}` : ""}
            </div>
          </div>
          ${status ? `<span class="pill" style="${status.style}">${status.label}</span>` : ""}
        </div>
      </div>`;
    };

    view.innerHTML = `
      <div class="eyebrow">Inventario congelado</div>
      <h2 style="font-size:22px; margin-top:2px;">Freezer</h2>

      <div class="stat-box" style="margin-bottom:14px;">
        <div class="num">${totalLeft}</div>
        <div class="lbl">porciones de lotes congeladas</div>
      </div>

      <div class="section-title"><h2>Lotes</h2></div>
      ${batches.map(batchCard).join("") || `<div class="empty"><span class="glyph">❄</span>No hay porciones de lotes activas.</div>`}

      <div class="section-title"><h2>Otros congelados</h2></div>
      <p class="muted" style="margin-top:-4px;">Cosas sueltas que fuiste guardando: carnes, verduras, panes, etc.</p>
      ${frozenItems.map(frozenCard).join("") || `<div class="empty"><span class="glyph">▫</span>No registraste otros congelados todavía.</div>`}

      <button class="fab" id="addFrozenBtn">+</button>
    `;

    view.querySelectorAll("[data-quickadd]").forEach((btn) => {
      btn.addEventListener("click", () => this.openQuickAdd(btn.dataset.quickadd));
    });
    view.querySelectorAll("[data-history]").forEach((btn) => {
      btn.addEventListener("click", () => this.openHistory(btn.dataset.history));
    });
    view.querySelectorAll("[data-fitem]").forEach((el) => {
      el.addEventListener("click", () => this.openFrozenForm(el.dataset.fitem));
    });
    document.getElementById("addFrozenBtn").addEventListener("click", () => this.openFrozenForm(null));
  },

  formatDate(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y.slice(2)}`;
  },

  expiryStatus(item, settings) {
    if (!item.useByDate) return null;
    const today = todayISODate();
    const diffDays = Math.round((new Date(item.useByDate) - new Date(today)) / 86400000);
    if (diffDays < 0) return { label: `Vencido hace ${Math.abs(diffDays)}d`, style: "background:#F6E2DD; color:var(--bad); border-color:transparent;" };
    if (diffDays === 0) return { label: "Vence hoy", style: "background:#F6E2DD; color:var(--bad); border-color:transparent;" };
    if (diffDays <= settings.expiryWarningDays) return { label: `Vence en ${diffDays}d`, style: "background:#F7EAD2; color:var(--ok); border-color:transparent;" };
    return { label: `Para el ${this.formatDate(item.useByDate)}`, style: "" };
  },

  // ---------- Lotes: marcar comido + historial editable ----------
  openQuickAdd(batchId) {
    const batch = Storage.getBatches().find((b) => b.id === batchId);
    if (!batch) return;
    const settings = Storage.getSettings();

    openModal(`
      <div class="modal-header">
        <h3>Registrar consumo</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <p class="muted" style="margin-top:0;">#${batch.number} ${batch.name}</p>
      <div class="field-row">
        <div><label>Fecha</label><input id="qa-date" type="date" value="${todayISODate()}"></div>
        <div><label>Porciones</label><input id="qa-count" type="number" min="1" step="1" value="${settings.peoplePerDay || 2}"></div>
      </div>
      <button class="btn btn-primary btn-block" id="qaSaveBtn" style="margin-top:18px;">Guardar</button>
    `);

    document.getElementById("qaSaveBtn").addEventListener("click", () => {
      const date = document.getElementById("qa-date").value || todayISODate();
      const count = parseFloat(document.getElementById("qa-count").value) || 0;
      if (count <= 0) { toast("Poné una cantidad"); return; }
      batch.consumptionLog = batch.consumptionLog || [];
      batch.consumptionLog.push({ id: uid(), date: new Date(date).toISOString(), count });
      Storage.recomputeBatchRemaining(batch);
      Storage.upsertBatch(batch);
      closeModal();
      toast(batch.status === "archived" ? `"${batch.name}" terminado — archivado` : `Anotado: ${count} porción(es) de "${batch.name}"`);
      render();
    });
  },

  openHistory(batchId) {
    const batch = Storage.getBatches().find((b) => b.id === batchId);
    if (!batch) return;
    batch.consumptionLog = batch.consumptionLog || [];

    const draw = () => {
      const entries = [...batch.consumptionLog].sort((a, b) => b.date.localeCompare(a.date));
      openModal(`
        <div class="modal-header">
          <h3>Historial — #${batch.number} ${batch.name}</h3>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <p class="muted">Editá o borrá un registro si te equivocaste, o agregá uno de un día que te olvidaste de anotar.</p>
        <div id="historyRows">
          ${entries.length === 0 ? `<p class="muted">Todavía no hay registros para este lote.</p>` : entries.map((e) => `
            <div class="hist-row" data-eid="${e.id}">
              <input class="hist-date" type="date" value="${e.date.slice(0, 10)}">
              <div class="hist-count-wrap">
                <input class="hist-count" type="number" min="0" step="1" value="${e.count}">
                <span class="hist-count-label">porc.</span>
              </div>
              <button class="rm" data-rmhist="${e.id}">✕</button>
            </div>
          `).join("")}
        </div>
        <button class="btn btn-secondary btn-sm" id="addHistBtn" style="margin-top:10px;">+ Agregar registro</button>
        <div class="divider"></div>
        <div class="muted">Porciones restantes recalculadas: <span class="mono" id="histRemainingPreview"></span></div>
        <button class="btn btn-primary btn-block" id="saveHistBtn" style="margin-top:16px;">Guardar historial</button>
      `);

      document.getElementById("addHistBtn").addEventListener("click", () => {
        batch.consumptionLog.push({ id: uid(), date: new Date().toISOString(), count: 1 });
        draw();
      });
      document.querySelectorAll("[data-rmhist]").forEach((btn) => {
        btn.addEventListener("click", () => {
          batch.consumptionLog = batch.consumptionLog.filter((e) => e.id !== btn.dataset.rmhist);
          draw();
        });
      });
      document.querySelectorAll("[data-eid]").forEach((rowEl) => {
        const eid = rowEl.dataset.eid;
        rowEl.querySelector(".hist-date").addEventListener("change", (e) => {
          const entry = batch.consumptionLog.find((x) => x.id === eid);
          if (entry) entry.date = e.target.value;
          updateRemainingPreview();
        });
        rowEl.querySelector(".hist-count").addEventListener("input", (e) => {
          const entry = batch.consumptionLog.find((x) => x.id === eid);
          if (entry) entry.count = parseFloat(e.target.value) || 0;
          updateRemainingPreview();
        });
      });

      const updateRemainingPreview = () => {
        const consumed = batch.consumptionLog.reduce((s, l) => s + l.count, 0);
        const left = Math.max(0, batch.servings - consumed);
        const el = document.getElementById("histRemainingPreview");
        if (el) el.textContent = `${left} de ${batch.servings}`;
      };
      updateRemainingPreview();

      document.getElementById("saveHistBtn").addEventListener("click", () => {
        Storage.recomputeBatchRemaining(batch);
        Storage.upsertBatch(batch);
        closeModal();
        toast("Historial actualizado ✓");
        render();
      });
    };

    draw();
  },

  // ---------- Otros congelados ----------
  openFrozenForm(id) {
    const item = id ? Storage.getFrozenItems().find((i) => i.id === id) : null;
    const v = item || { name: "", quantity: 1, unit: "kg", frozenDate: todayISODate(), useByDate: "", notes: "" };

    openModal(`
      <div class="modal-header">
        <h3>${item ? "Editar congelado" : "Nuevo congelado"}</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <label>Nombre</label>
      <input id="f-fname" value="${v.name}" placeholder="Ej: Pechuga de pollo, pan casero...">

      <div class="field-row">
        <div><label>Cantidad</label><input id="f-fqty" type="number" min="0" step="0.1" value="${v.quantity}"></div>
        <div><label>Unidad</label>
          <select id="f-funit">
            <option value="kg" ${v.unit === "kg" ? "selected" : ""}>kg</option>
            <option value="unidad" ${v.unit === "unidad" ? "selected" : ""}>unidad</option>
            <option value="ml" ${v.unit === "ml" ? "selected" : ""}>ml</option>
          </select>
        </div>
      </div>

      <div class="field-row">
        <div><label>Fecha de congelado</label><input id="f-ffrozen" type="date" value="${v.frozenDate || ""}"></div>
        <div><label>Para cuándo comerlo (límite)</label><input id="f-fuseby" type="date" value="${v.useByDate || ""}"></div>
      </div>

      <label>Notas (opcional)</label>
      <input id="f-fnotes" value="${v.notes || ""}" placeholder="Ej: ya cocido, porción chica...">

      <div class="flex-between" style="margin-top:20px; gap:10px;">
        ${item ? `<button class="btn btn-danger" id="delFrozenBtn">Eliminar</button>` : `<span></span>`}
        ${item ? `<button class="btn btn-secondary" id="usedFrozenBtn">Usado ✓</button>` : `<span></span>`}
        <button class="btn btn-primary" id="saveFrozenBtn">Guardar</button>
      </div>
    `);

    document.getElementById("saveFrozenBtn").addEventListener("click", () => {
      const name = document.getElementById("f-fname").value.trim();
      if (!name) { toast("Poné un nombre"); return; }
      const updated = {
        id: item ? item.id : undefined,
        name,
        quantity: parseFloat(document.getElementById("f-fqty").value) || 0,
        unit: document.getElementById("f-funit").value,
        frozenDate: document.getElementById("f-ffrozen").value || todayISODate(),
        useByDate: document.getElementById("f-fuseby").value || "",
        notes: document.getElementById("f-fnotes").value.trim(),
      };
      Storage.upsertFrozenItem(updated);
      closeModal();
      toast("Guardado ✓");
      render();
    });

    if (item) {
      document.getElementById("delFrozenBtn").addEventListener("click", () => {
        if (confirm(`¿Eliminar "${item.name}" del freezer?`)) {
          Storage.deleteFrozenItem(item.id);
          closeModal();
          toast("Eliminado");
          render();
        }
      });
      document.getElementById("usedFrozenBtn").addEventListener("click", () => {
        Storage.deleteFrozenItem(item.id);
        closeModal();
        toast(`"${item.name}" marcado como usado`);
        render();
      });
    }
  },
};
