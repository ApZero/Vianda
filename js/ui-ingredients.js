const CATEGORY_LABELS = {
  proteina: "Proteína",
  vegetal: "Vegetal",
  carbohidrato: "Carbohidrato",
  grasa: "Grasa",
  condimento: "Condimento",
};

const UIIngredients = {
  render() {
    const view = document.getElementById("view");
    const ingredients = Storage.getIngredients().sort((a, b) => a.name.localeCompare(b.name));

    const rows = ingredients.map((ing) => {
      const units = Nutrition.availableUnits(ing).map((u) => u.label);
      const unitsHint = units.length > 1 ? ` · ${units.join("/")}` : "";
      return `
      <div class="card card-tap" data-id="${ing.id}">
        <div class="card-row">
          <div>
            <div style="font-weight:600;">${ing.name}</div>
            <div class="muted" style="margin-top:2px;">
              <span class="pill">${CATEGORY_LABELS[ing.category] || ing.category}</span>
              &nbsp;${Nutrition.round0(ing.kcal)} kcal/100g · ₲${ing.pricePerKg.toLocaleString("es-PY")}/kg${unitsHint}
            </div>
          </div>
          <span class="muted mono">${Nutrition.round1(ing.protein)}P</span>
        </div>
      </div>
    `;
    }).join("");

    view.innerHTML = `
      <div class="eyebrow">Base de datos</div>
      <h2 style="font-size:22px; margin-top:2px;">Ingredientes</h2>
      <p class="muted">Valores nutricionales por 100g y precio de referencia por kilo. Tocá uno para editarlo.</p>
      <div style="margin-top:14px;">
        ${rows || `<div class="empty"><span class="glyph">✦</span>Todavía no hay ingredientes.</div>`}
      </div>
      <button class="fab" id="addIngBtn">+</button>
    `;

    view.querySelectorAll("[data-id]").forEach((el) => {
      el.addEventListener("click", () => this.openForm(el.dataset.id));
    });
    document.getElementById("addIngBtn").addEventListener("click", () => this.openForm(null));
  },

  openForm(id) {
    const ing = id ? Storage.getIngredients().find((i) => i.id === id) : null;
    const v = ing || { name: "", category: "vegetal", kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0, pricePerKg: 0 };

    openModal(`
      <div class="modal-header">
        <h3>${ing ? "Editar ingrediente" : "Nuevo ingrediente"}</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <label>Nombre</label>
      <input id="f-name" value="${v.name}" placeholder="Ej: Pollo (pechuga)">

      <label>Categoría</label>
      <select id="f-category">
        ${Object.entries(CATEGORY_LABELS).map(([k, l]) => `<option value="${k}" ${v.category === k ? "selected" : ""}>${l}</option>`).join("")}
      </select>

      <div class="field-row">
        <div><label>Calorías /100g</label><input id="f-kcal" type="number" step="0.1" value="${v.kcal}"></div>
        <div><label>Proteína g/100g</label><input id="f-protein" type="number" step="0.1" value="${v.protein}"></div>
      </div>
      <div class="field-row">
        <div><label>Carbohidratos g/100g</label><input id="f-carbs" type="number" step="0.1" value="${v.carbs}"></div>
        <div><label>Grasa g/100g</label><input id="f-fat" type="number" step="0.1" value="${v.fat}"></div>
      </div>
      <div class="field-row">
        <div><label>Fibra g/100g</label><input id="f-fiber" type="number" step="0.1" value="${v.fiber}"></div>
        <div><label>Sodio mg/100g</label><input id="f-sodium" type="number" step="1" value="${v.sodium}"></div>
      </div>
      <label>Precio por kg (₲)</label>
      <input id="f-price" type="number" step="1" value="${v.pricePerKg}">

      <div class="divider"></div>
      <div style="font-weight:600; font-size:13.5px;">Medidas de cocina (opcional)</div>
      <p class="muted" style="margin-top:4px;">Completá sólo lo que aplique. Dejá en blanco o en 0 lo que no uses — esa unidad no va a aparecer al armar lotes.</p>
      <div class="field-row">
        <div><label>g por ml (líquidos)</label><input id="f-mlgrams" type="number" step="0.01" value="${v.mlGrams || ""}" placeholder="ej: 0.91"></div>
        <div><label>g por cdta</label><input id="f-tspgrams" type="number" step="0.1" value="${v.tspGrams || ""}" placeholder="ej: 4.5"></div>
      </div>
      <label>g por cda (cucharada)</label>
      <input id="f-tbspgrams" type="number" step="0.1" value="${v.tbspGrams || ""}" placeholder="ej: 13.6">

      <div class="flex-between" style="margin-top:20px; gap:10px;">
        ${ing ? `<button class="btn btn-danger" id="delIngBtn">Eliminar</button>` : `<span></span>`}
        <button class="btn btn-primary" id="saveIngBtn">Guardar</button>
      </div>
    `);

    document.getElementById("saveIngBtn").addEventListener("click", () => {
      const name = document.getElementById("f-name").value.trim();
      if (!name) { toast("Poné un nombre"); return; }
      const updated = {
        id: ing ? ing.id : undefined,
        name,
        category: document.getElementById("f-category").value,
        kcal: parseFloat(document.getElementById("f-kcal").value) || 0,
        protein: parseFloat(document.getElementById("f-protein").value) || 0,
        carbs: parseFloat(document.getElementById("f-carbs").value) || 0,
        fat: parseFloat(document.getElementById("f-fat").value) || 0,
        fiber: parseFloat(document.getElementById("f-fiber").value) || 0,
        sodium: parseFloat(document.getElementById("f-sodium").value) || 0,
        pricePerKg: parseFloat(document.getElementById("f-price").value) || 0,
        mlGrams: parseFloat(document.getElementById("f-mlgrams").value) || undefined,
        tspGrams: parseFloat(document.getElementById("f-tspgrams").value) || undefined,
        tbspGrams: parseFloat(document.getElementById("f-tbspgrams").value) || undefined,
      };
      Storage.upsertIngredient(updated);
      closeModal();
      toast("Ingrediente guardado ✓");
      render();
    });

    if (ing) {
      document.getElementById("delIngBtn").addEventListener("click", () => {
        if (confirm(`¿Eliminar "${ing.name}"? Los lotes que ya lo usan no se modifican.`)) {
          Storage.deleteIngredient(ing.id);
          closeModal();
          toast("Ingrediente eliminado");
          render();
        }
      });
    }
  },
};
