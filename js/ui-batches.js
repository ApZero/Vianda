const UIBatches = {
  render() {
    const view = document.getElementById("view");
    const batches = Storage.getBatches().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    const active = batches.filter((b) => b.status !== "archived");
    const archived = batches.filter((b) => b.status === "archived");

    const card = (b) => {
      const scoreLabel = Score.label(b.score.total);
      return `
      <div class="card card-tap ${b.status === "archived" ? "tag-archived" : ""}" data-id="${b.id}">
        <div class="card-row">
          <div>
            <div style="font-weight:600;">${b.name}</div>
            <div class="muted" style="margin-top:2px;">${b.servings} porciones · ₲${Nutrition.round0(b.perServing.cost).toLocaleString("es-PY")}/porción</div>
          </div>
          <span class="score-badge ${scoreLabel.cls}">${b.score.total}</span>
        </div>
      </div>`;
    };

    view.innerHTML = `
      <div class="eyebrow">Recetario</div>
      <h2 style="font-size:22px; margin-top:2px;">Lotes</h2>
      <p class="muted">Creá un lote, cargá los ingredientes por peso y definí cuántas porciones rinde.</p>

      <div class="section-title"><h2>Activos</h2></div>
      ${active.map(card).join("") || `<div class="empty"><span class="glyph">▤</span>Todavía no creaste ningún lote.</div>`}

      ${archived.length ? `
        <div class="section-title"><h2>Archivados</h2></div>
        ${archived.map(card).join("")}
      ` : ""}

      <button class="fab" id="addBatchBtn">+</button>
    `;

    view.querySelectorAll("[data-id]").forEach((el) => {
      el.addEventListener("click", () => this.openDetail(el.dataset.id));
    });
    document.getElementById("addBatchBtn").addEventListener("click", () => this.openForm(null));
  },

  openDetail(id) {
    const batch = Storage.getBatches().find((b) => b.id === id);
    if (!batch) return;
    const ingredientsById = Object.fromEntries(Storage.getIngredients().map((i) => [i.id, i]));
    const scoreLabel = Score.label(batch.score.total);

    openModal(`
      <div class="modal-header">
        <h3>${batch.name}</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="flex-between">
        <span class="pill">${batch.servings} porciones totales</span>
        <span class="score-badge ${scoreLabel.cls}">${batch.score.total} · ${scoreLabel.text}</span>
      </div>

      <div class="nutri-grid">
        <div class="nutri-cell"><div class="v">${Nutrition.round0(batch.perServing.kcal)}</div><div class="k">kcal</div></div>
        <div class="nutri-cell"><div class="v">${Nutrition.round1(batch.perServing.protein)}g</div><div class="k">proteína</div></div>
        <div class="nutri-cell"><div class="v">${Nutrition.round1(batch.perServing.carbs)}g</div><div class="k">carbs</div></div>
        <div class="nutri-cell"><div class="v">${Nutrition.round1(batch.perServing.fat)}g</div><div class="k">grasa</div></div>
        <div class="nutri-cell"><div class="v">${Nutrition.round1(batch.perServing.fiber)}g</div><div class="k">fibra</div></div>
        <div class="nutri-cell"><div class="v">${Nutrition.round0(batch.perServing.sodium)}mg</div><div class="k">sodio</div></div>
        <div class="nutri-cell"><div class="v">${Nutrition.round0(batch.perServing.grams)}g</div><div class="k">peso</div></div>
        <div class="nutri-cell"><div class="v">₲${Nutrition.round0(batch.perServing.cost).toLocaleString("es-PY")}</div><div class="k">costo</div></div>
        <div class="nutri-cell"><div class="v">₲${Nutrition.round0(batch.perServing.cost * batch.servings).toLocaleString("es-PY")}</div><div class="k">total</div></div>
      </div>

      <div class="divider"></div>
      <div style="font-weight:600; font-size:13.5px;">Sugerencias para el próximo lote</div>
      <ul class="suggestion-list">${batch.score.suggestions.map((s) => `<li>${s}</li>`).join("")}</ul>

      <div class="divider"></div>
      <div style="font-weight:600; font-size:13.5px; margin-bottom:6px;">Ingredientes</div>
      ${batch.items.map((it) => {
        const ing = ingredientsById[it.ingredientId];
        const unitLabel = it.unit && it.unit !== "g" && Nutrition.UNIT_LABELS[it.unit];
        const amountText = unitLabel ? `${it.amount} ${unitLabel} · ${Nutrition.round1(it.grams)}g` : `${Nutrition.round1(it.grams)}g`;
        return `<div class="flex-between muted" style="padding:4px 0;"><span>${ing ? ing.name : "(eliminado)"}</span><span class="mono">${amountText}</span></div>`;
      }).join("")}

      <div class="flex-between" style="margin-top:20px; gap:8px; flex-wrap:wrap;">
        <button class="btn btn-secondary btn-sm" id="copyBatchBtn">Copiar</button>
        <button class="btn btn-secondary btn-sm" id="editBatchBtn">Editar</button>
        <button class="btn btn-danger btn-sm" id="delBatchBtn">Eliminar</button>
        <button class="btn btn-primary btn-sm" id="closeDetailBtn">Cerrar</button>
      </div>
    `);

    document.getElementById("closeDetailBtn").addEventListener("click", closeModal);
    document.getElementById("editBatchBtn").addEventListener("click", () => this.openForm(batch.id));
    document.getElementById("copyBatchBtn").addEventListener("click", () => this.openCopyPrompt(batch));
    document.getElementById("delBatchBtn").addEventListener("click", () => {
      if (confirm(`¿Eliminar el lote "${batch.name}"? Esta acción no se puede deshacer.`)) {
        Storage.deleteBatch(batch.id);
        closeModal();
        toast("Lote eliminado");
        render();
      }
    });
  },

  openCopyPrompt(batch) {
    openModal(`
      <div class="modal-header">
        <h3>Copiar "${batch.name}"</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <p class="muted">Elegí cuántas porciones necesitás. Las cantidades de cada ingrediente se recalculan automáticamente.</p>
      <label>Porciones nuevas</label>
      <input id="copyServings" type="number" min="1" step="1" value="${batch.servings}">
      <button class="btn btn-primary btn-block" id="copyGoBtn" style="margin-top:18px;">Continuar y editar</button>
    `);
    document.getElementById("copyGoBtn").addEventListener("click", () => {
      const newServings = parseInt(document.getElementById("copyServings").value, 10) || batch.servings;
      const scaledItems = Nutrition.scaleItems(batch.items, batch.servings, newServings);
      closeModal();
      this.openForm(null, {
        name: batch.name + " (copia)",
        servings: newServings,
        items: scaledItems,
      });
    });
  },

  openForm(id, prefill) {
    const existing = id ? Storage.getBatches().find((b) => b.id === id) : null;
    const base = existing || prefill || { name: "", servings: 4, items: [] };
    const ingredients = Storage.getIngredients().sort((a, b) => a.name.localeCompare(b.name));
    const ingredientsById = Object.fromEntries(ingredients.map((i) => [i.id, i]));
    // normaliza items existentes (que sólo tienen grams) agregando amount/unit para edición
    let workingItems = base.items.map((it) => ({
      ingredientId: it.ingredientId,
      grams: it.grams,
      amount: it.amount != null ? it.amount : it.grams,
      unit: it.unit || "g",
    }));

    const ingOptions = (selectedId) => ingredients.map((i) =>
      `<option value="${i.id}" ${i.id === selectedId ? "selected" : ""}>${i.name}</option>`
    ).join("");

    openModal(`
      <div class="modal-header">
        <h3>${existing ? "Editar lote" : "Nuevo lote"}</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <label>Nombre del lote</label>
      <input id="f-batchname" value="${base.name}" placeholder="Ej: Guiso de lentejas">

      <label>Cantidad de porciones que rinde</label>
      <input id="f-servings" type="number" min="1" step="1" value="${base.servings}">

      <label>Ingredientes</label>
      <div id="ingRows"></div>
      <button class="btn btn-secondary btn-sm" id="addRowBtn" style="margin-top:8px;">+ Agregar ingrediente</button>

      <div class="divider"></div>
      <div id="livePreview"></div>

      <button class="btn btn-primary btn-block" id="saveBatchBtn" style="margin-top:16px;">Guardar lote</button>
    `);

    const rowsEl = document.getElementById("ingRows");
    const previewEl = document.getElementById("livePreview");

    const unitOptions = (ing, selectedUnit) => Nutrition.availableUnits(ing).map((u) =>
      `<option value="${u.value}" ${u.value === selectedUnit ? "selected" : ""}>${u.label}</option>`
    ).join("");

    const recomputeGrams = (it) => {
      const ing = ingredientsById[it.ingredientId];
      it.grams = Nutrition.round1(Nutrition.toGrams(ing, it.amount, it.unit));
    };

    const renderRows = () => {
      if (workingItems.length === 0) {
        rowsEl.innerHTML = `<p class="muted">Todavía no agregaste ingredientes.</p>`;
      } else {
        rowsEl.innerHTML = workingItems.map((it, idx) => {
          const ing = ingredientsById[it.ingredientId];
          const showGramsHint = it.unit !== "g" && ing;
          return `
          <div class="ing-row" data-idx="${idx}">
            <div class="ing-row-main">
              <select class="row-ing">${ingOptions(it.ingredientId)}</select>
              <div class="ing-row-amount">
                <input class="row-amount" type="number" min="0" step="0.1" value="${it.amount}" placeholder="cantidad">
                <select class="row-unit">${unitOptions(ing, it.unit)}</select>
              </div>
              <button class="rm" data-rm="${idx}">✕</button>
            </div>
            ${showGramsHint ? `<div class="muted ing-row-hint mono">≈ ${it.grams} g</div>` : ""}
          </div>
        `;
        }).join("");
        rowsEl.querySelectorAll(".ing-row").forEach((rowEl) => {
          const idx = parseInt(rowEl.dataset.idx, 10);
          rowEl.querySelector(".row-ing").addEventListener("change", (e) => {
            workingItems[idx].ingredientId = e.target.value;
            // si la nueva unidad no aplica al ingrediente elegido, volvemos a gramos
            const newIng = ingredientsById[e.target.value];
            const stillValid = Nutrition.availableUnits(newIng).some((u) => u.value === workingItems[idx].unit);
            if (!stillValid) workingItems[idx].unit = "g";
            recomputeGrams(workingItems[idx]);
            renderRows();
            renderPreview();
          });
          rowEl.querySelector(".row-amount").addEventListener("input", (e) => {
            workingItems[idx].amount = parseFloat(e.target.value) || 0;
            recomputeGrams(workingItems[idx]);
            renderRows();
            renderPreview();
          });
          rowEl.querySelector(".row-unit").addEventListener("change", (e) => {
            workingItems[idx].unit = e.target.value;
            recomputeGrams(workingItems[idx]);
            renderRows();
            renderPreview();
          });
        });
        rowsEl.querySelectorAll("[data-rm]").forEach((btn) => {
          btn.addEventListener("click", () => {
            workingItems.splice(parseInt(btn.dataset.rm, 10), 1);
            renderRows();
            renderPreview();
          });
        });
      }
    };

    const renderPreview = () => {
      const servings = parseInt(document.getElementById("f-servings").value, 10) || 1;
      const validItems = workingItems.filter((it) => it.ingredientId && it.grams > 0);
      if (validItems.length === 0) {
        previewEl.innerHTML = `<p class="muted">Agregá ingredientes con su peso para ver el cálculo nutricional.</p>`;
        return;
      }
      const totals = Nutrition.computeTotals(validItems, ingredientsById);
      const per = Nutrition.perServing(totals, servings);
      const evalRes = Score.evaluate(per, validItems, ingredientsById);
      const scoreLabel = Score.label(evalRes.total);

      previewEl.innerHTML = `
        <div class="flex-between">
          <span style="font-weight:600; font-size:13.5px;">Por porción</span>
          <span class="score-badge ${scoreLabel.cls}">${evalRes.total} · ${scoreLabel.text}</span>
        </div>
        <div class="nutri-grid">
          <div class="nutri-cell"><div class="v">${Nutrition.round0(per.kcal)}</div><div class="k">kcal</div></div>
          <div class="nutri-cell"><div class="v">${Nutrition.round1(per.protein)}g</div><div class="k">proteína</div></div>
          <div class="nutri-cell"><div class="v">${Nutrition.round1(per.carbs)}g</div><div class="k">carbs</div></div>
          <div class="nutri-cell"><div class="v">${Nutrition.round1(per.fat)}g</div><div class="k">grasa</div></div>
          <div class="nutri-cell"><div class="v">${Nutrition.round1(per.fiber)}g</div><div class="k">fibra</div></div>
          <div class="nutri-cell"><div class="v">${Nutrition.round0(per.sodium)}mg</div><div class="k">sodio</div></div>
          <div class="nutri-cell"><div class="v">${Nutrition.round0(per.grams)}g</div><div class="k">peso</div></div>
          <div class="nutri-cell"><div class="v">₲${Nutrition.round0(per.cost).toLocaleString("es-PY")}</div><div class="k">costo</div></div>
          <div class="nutri-cell"><div class="v">₲${Nutrition.round0(per.cost * servings).toLocaleString("es-PY")}</div><div class="k">total lote</div></div>
        </div>
        <ul class="suggestion-list">${evalRes.suggestions.map((s) => `<li>${s}</li>`).join("")}</ul>
      `;
    };

    document.getElementById("addRowBtn").addEventListener("click", () => {
      workingItems.push({ ingredientId: ingredients[0] ? ingredients[0].id : "", amount: 0, unit: "g", grams: 0 });
      renderRows();
      renderPreview();
    });
    document.getElementById("f-servings").addEventListener("input", renderPreview);

    renderRows();
    renderPreview();

    document.getElementById("saveBatchBtn").addEventListener("click", () => {
      const name = document.getElementById("f-batchname").value.trim();
      const servings = parseInt(document.getElementById("f-servings").value, 10) || 1;
      const validItems = workingItems.filter((it) => it.ingredientId && it.grams > 0);
      if (!name) { toast("Poné un nombre para el lote"); return; }
      if (validItems.length === 0) { toast("Agregá al menos un ingrediente"); return; }

      const totals = Nutrition.computeTotals(validItems, ingredientsById);
      const per = Nutrition.perServing(totals, servings);
      const evalRes = Score.evaluate(per, validItems, ingredientsById);

      const batch = {
        id: existing ? existing.id : undefined,
        name,
        servings,
        items: validItems,
        createdAt: existing ? existing.createdAt : new Date().toISOString(),
        status: existing ? existing.status : "active",
        servingsRemaining: existing ? existing.servingsRemaining : servings,
        consumptionLog: existing ? existing.consumptionLog || [] : [],
        totalWeight: totals.grams,
        perServing: per,
        score: evalRes,
      };
      Storage.upsertBatch(batch);
      closeModal();
      toast(existing ? "Lote actualizado ✓" : "Lote creado ✓");
      render();
    });
  },
};
