// Capa de almacenamiento — localStorage
const DB_KEYS = {
  ingredients: "vianda_ingredients",
  batches: "vianda_batches",
  batchCounter: "vianda_batch_counter",
  frozenItems: "vianda_frozen_items",
  settings: "vianda_settings",
  lastBackup: "vianda_last_backup_date",
};

const DEFAULT_SETTINGS = {
  lowStockThreshold: 4,     // porciones totales antes de avisar
  peoplePerDay: 2,          // porciones consumidas por día (referencia)
  expiryWarningDays: 5,     // avisar cuando un congelado esté a esta cantidad de días de su fecha límite
  usdaApiKey: "",           // clave opcional para USDA FoodData Central (vacío = usa DEMO_KEY)
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayISODate() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
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
    const list = raw ? JSON.parse(raw) : [];
    const migrated = this._migrateBatches(list);
    if (migrated.changed) {
      localStorage.setItem(DB_KEYS.batches, JSON.stringify(migrated.list));
    }
    return migrated.list;
  },

  // Asigna número secuencial a lotes viejos que no lo tengan (orden de creación),
  // y deja el contador listo para el próximo lote nuevo.
  _migrateBatches(list) {
    let changed = false;
    const missing = list.filter((b) => !b.number);
    if (missing.length > 0) {
      const sorted = [...list].sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
      let maxNumber = list.reduce((m, b) => Math.max(m, b.number || 0), 0);
      sorted.forEach((b) => {
        if (!b.number) {
          maxNumber += 1;
          b.number = maxNumber;
        }
      });
      changed = true;
      const counterRaw = localStorage.getItem(DB_KEYS.batchCounter);
      const counter = counterRaw ? parseInt(counterRaw, 10) : 1;
      localStorage.setItem(DB_KEYS.batchCounter, String(Math.max(counter, maxNumber + 1)));
    }
    return { list, changed };
  },
  getNextBatchNumber() {
    const raw = localStorage.getItem(DB_KEYS.batchCounter);
    const n = raw ? parseInt(raw, 10) : 1;
    localStorage.setItem(DB_KEYS.batchCounter, String(n + 1));
    return n;
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

  // Recalcula porciones restantes y estado (activo/archivado) de un lote a partir
  // de su historial de consumo. Se usa siempre que se agrega, edita o borra un
  // registro del historial, para que todo quede consistente.
  recomputeBatchRemaining(batch) {
    const consumed = (batch.consumptionLog || []).reduce((s, l) => s + l.count, 0);
    batch.servingsRemaining = Math.max(0, batch.servings - consumed);
    if (batch.servingsRemaining <= 0) {
      batch.servingsRemaining = 0;
      if (batch.status !== "archived") {
        batch.status = "archived";
        batch.archivedAt = new Date().toISOString();
      }
    } else if (batch.status === "archived") {
      batch.status = "active";
      delete batch.archivedAt;
    }
    return batch;
  },

  // ---------- Otros congelados (items sueltos, no-lotes) ----------
  getFrozenItems() {
    const raw = localStorage.getItem(DB_KEYS.frozenItems);
    return raw ? JSON.parse(raw) : [];
  },
  saveFrozenItems(list) {
    localStorage.setItem(DB_KEYS.frozenItems, JSON.stringify(list));
  },
  upsertFrozenItem(item) {
    const list = this.getFrozenItems();
    const idx = list.findIndex((i) => i.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.push({ ...item, id: item.id || uid() });
    this.saveFrozenItems(list);
    return list;
  },
  deleteFrozenItem(id) {
    const list = this.getFrozenItems().filter((i) => i.id !== id);
    this.saveFrozenItems(list);
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
      version: 2,
      exportedAt: new Date().toISOString(),
      ingredients: this.getIngredients(),
      batches: this.getBatches(),
      frozenItems: this.getFrozenItems(),
      settings: this.getSettings(),
    };
  },
  importAll(data) {
    if (!data || data.app !== "vianda") throw new Error("Archivo no reconocido");
    if (Array.isArray(data.ingredients)) this.saveIngredients(data.ingredients);
    if (Array.isArray(data.batches)) this.saveBatches(data.batches);
    if (Array.isArray(data.frozenItems)) this.saveFrozenItems(data.frozenItems);
    if (data.settings) this.saveSettings(data.settings);
  },
};
