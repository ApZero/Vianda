// Capa de almacenamiento — localStorage
const DB_KEYS = {
  ingredients: "vianda_ingredients",
  batches: "vianda_batches",
  settings: "vianda_settings",
  lastBackup: "vianda_last_backup_date",
};

const DEFAULT_SETTINGS = {
  lowStockThreshold: 4,     // porciones totales antes de avisar
  peoplePerDay: 2,          // porciones consumidas por día (referencia)
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const Storage = {
  // ---------- Ingredientes ----------
  getIngredients() {
    const raw = localStorage.getItem(DB_KEYS.ingredients);
    if (!raw) {
      const seeded = SEED_INGREDIENTS.map((i) => ({ id: uid(), ...i }));
      localStorage.setItem(DB_KEYS.ingredients, JSON.stringify(seeded));
      return seeded;
    }
    const list = JSON.parse(raw);
    const migrated = this._migrateIngredients(list);
    if (migrated.changed) {
      localStorage.setItem(DB_KEYS.ingredients, JSON.stringify(migrated.list));
    }
    return migrated.list;
  },

  // Agrega ingredientes semilla nuevos (por nombre) que todavía no existan, sin tocar
  // ediciones del usuario en los que ya tiene. No sobreescribe campos existentes.
  _migrateIngredients(list) {
    let changed = false;
    const byName = new Map(list.map((i) => [i.name.trim().toLowerCase(), i]));
    for (const seed of SEED_INGREDIENTS) {
      const key = seed.name.trim().toLowerCase();
      if (!byName.has(key)) {
        list.push({ id: uid(), ...seed });
        changed = true;
      }
    }
    return { list, changed };
  },
  saveIngredients(list) {
    localStorage.setItem(DB_KEYS.ingredients, JSON.stringify(list));
  },
  upsertIngredient(ing) {
    const list = this.getIngredients();
    const idx = list.findIndex((i) => i.id === ing.id);
    if (idx >= 0) list[idx] = ing;
    else list.push({ ...ing, id: ing.id || uid() });
    this.saveIngredients(list);
    return list;
  },
  deleteIngredient(id) {
    const list = this.getIngredients().filter((i) => i.id !== id);
    this.saveIngredients(list);
    return list;
  },

  // ---------- Lotes (batches) ----------
  getBatches() {
    const raw = localStorage.getItem(DB_KEYS.batches);
    return raw ? JSON.parse(raw) : [];
  },
  saveBatches(list) {
    localStorage.setItem(DB_KEYS.batches, JSON.stringify(list));
  },
  upsertBatch(batch) {
    const list = this.getBatches();
    const idx = list.findIndex((b) => b.id === batch.id);
    if (idx >= 0) list[idx] = batch;
    else list.push({ ...batch, id: batch.id || uid() });
    this.saveBatches(list);
    return list;
  },
  deleteBatch(id) {
    const list = this.getBatches().filter((b) => b.id !== id);
    this.saveBatches(list);
    return list;
  },

  // ---------- Configuración ----------
  getSettings() {
    const raw = localStorage.getItem(DB_KEYS.settings);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  },
  saveSettings(settings) {
    localStorage.setItem(DB_KEYS.settings, JSON.stringify(settings));
  },

  // ---------- Backup ----------
  getLastBackupDate() {
    return localStorage.getItem(DB_KEYS.lastBackup);
  },
  setLastBackupDate(dateStr) {
    localStorage.setItem(DB_KEYS.lastBackup, dateStr);
  },

  // ---------- Exportar/Importar todo ----------
  exportAll() {
    return {
      app: "vianda",
      version: 1,
      exportedAt: new Date().toISOString(),
      ingredients: this.getIngredients(),
      batches: this.getBatches(),
      settings: this.getSettings(),
    };
  },
  importAll(data) {
    if (!data || data.app !== "vianda") throw new Error("Archivo no reconocido");
    if (Array.isArray(data.ingredients)) this.saveIngredients(data.ingredients);
    if (Array.isArray(data.batches)) this.saveBatches(data.batches);
    if (data.settings) this.saveSettings(data.settings);
  },
};
