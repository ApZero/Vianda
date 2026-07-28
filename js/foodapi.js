// Cliente para USDA FoodData Central (fdc.nal.usda.gov) — base de datos abierta
// del gobierno de EE.UU. con perfiles nutricionales de miles de alimentos.
// Funciona con DEMO_KEY (límite bajo) o con una clave propia gratuita, cargada
// en Configuración.
const FoodApi = {
  BASE: "https://api.nal.usda.gov/fdc/v1",

  // ids = nutrientId de la API de FDC; names = palabras clave de respaldo por si
  // el id cambia según el tipo de dato (Foundation/SR Legacy/Branded/Survey).
  NUTRIENT_MAP: {
    kcal:    { ids: [1008, 2047, 2048], names: ["energy"] },
    protein: { ids: [1003],            names: ["protein"] },
    carbs:   { ids: [1005],            names: ["carbohydrate"] },
    fat:     { ids: [1004],            names: ["total lipid", "fat"] },
    fiber:   { ids: [1079],            names: ["fiber"] },
    sodium:  { ids: [1093],            names: ["sodium"] },
  },

  DATATYPE_PRIORITY: { "Foundation": 0, "SR Legacy": 1, "Survey (FNDDS)": 2, "Branded": 3 },

  apiKey() {
    const settings = Storage.getSettings();
    return (settings.usdaApiKey && settings.usdaApiKey.trim()) || "DEMO_KEY";
  },

  async search(query) {
    const url = `${this.BASE}/foods/search?api_key=${encodeURIComponent(this.apiKey())}&query=${encodeURIComponent(query)}&pageSize=15`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("FDC search HTTP " + res.status);
    const data = await res.json();
    const foods = (data.foods || []).slice();
    foods.sort((a, b) => (this.DATATYPE_PRIORITY[a.dataType] ?? 9) - (this.DATATYPE_PRIORITY[b.dataType] ?? 9));
    return foods;
  },

  async details(fdcId) {
    const url = `${this.BASE}/food/${fdcId}?api_key=${encodeURIComponent(this.apiKey())}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("FDC detail HTTP " + res.status);
    return res.json();
  },

  // Soporta ambas formas que devuelve la API: plana ({nutrientId,nutrientName,unitName,value})
  // en /foods/search, y anidada ({nutrient:{id,name,unitName},amount}) en /food/{id}.
  _findNutrient(foodNutrients, key) {
    const spec = this.NUTRIENT_MAP[key];
    for (const n of foodNutrients) {
      const id = n.nutrientId != null ? n.nutrientId : (n.nutrient ? n.nutrient.id : null);
      const name = (n.nutrientName || (n.nutrient && n.nutrient.name) || "").toLowerCase();
      const unit = (n.unitName || (n.nutrient && n.nutrient.unitName) || "").toLowerCase();
      const matches = spec.ids.includes(id) || spec.names.some((k) => name.includes(k));
      if (!matches) continue;
      if (key === "kcal" && unit && unit !== "kcal") continue; // evita confundir con kJ
      const value = n.value != null ? n.value : n.amount;
      if (value != null) return value;
    }
    return 0;
  },

  // Extrae los 6 valores que usa Vianda (todos ya vienen "por 100g" en FDC
  // para Foundation/SR Legacy/Survey; Branded también normaliza foodNutrients a 100g).
  extractNutrition(foodDetail) {
    const fn = foodDetail.foodNutrients || [];
    return {
      kcal: Math.round(this._findNutrient(fn, "kcal") * 10) / 10,
      protein: Math.round(this._findNutrient(fn, "protein") * 10) / 10,
      carbs: Math.round(this._findNutrient(fn, "carbs") * 10) / 10,
      fat: Math.round(this._findNutrient(fn, "fat") * 10) / 10,
      fiber: Math.round(this._findNutrient(fn, "fiber") * 10) / 10,
      sodium: Math.round(this._findNutrient(fn, "sodium") * 10) / 10,
    };
  },
};
