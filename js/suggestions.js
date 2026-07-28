// Recetas balanceadas sugeridas: cada una fue calculada a mano para acercarse a
// 100 puntos en el sistema de puntaje (kcal, proteína, fibra, grasa, sodio, variedad).
// Los gramos son "por porción" — se multiplican por la cantidad de porciones elegida.
// No incluyen mariscos ni ingredientes con gluten.
const BATCH_TEMPLATES = [
  {
    key: "pollo-lentejas",
    name: "Pollo con lentejas y batata",
    blurb: "Proteína magra + legumbre + carbohidrato — buen puntaje de fibra y sodio controlado.",
    items: [
      { ingredient: "Pollo (pechuga)",   gramsPerServing: 130 },
      { ingredient: "Lentejas (secas)",  gramsPerServing: 40 },
      { ingredient: "Batata",            gramsPerServing: 100 },
      { ingredient: "Cebolla",           gramsPerServing: 40 },
      { ingredient: "Tomate",            gramsPerServing: 60 },
      { ingredient: "Zanahoria",         gramsPerServing: 50 },
      { ingredient: "Morrón verde",      gramsPerServing: 40 },
      { ingredient: "Ajo",               gramsPerServing: 6 },
      { ingredient: "Aceite de oliva",   gramsPerServing: 10, preferUnit: "tbsp" },
      { ingredient: "Sal",               gramsPerServing: 1,  preferUnit: "tsp" },
      { ingredient: "Pimentón dulce (polvo)", gramsPerServing: 1, preferUnit: "tsp" },
      { ingredient: "Pimienta negra",    gramsPerServing: 0.5 },
    ],
  },
  {
    key: "carne-garbanzos",
    name: "Carne con garbanzos y zapallo",
    blurb: "Más contundente, con legumbre y zapallo de estación — buena variedad de vegetales.",
    items: [
      { ingredient: "Carne molida",      gramsPerServing: 90 },
      { ingredient: "Garbanzos (secos)", gramsPerServing: 40 },
      { ingredient: "Zapallo",           gramsPerServing: 120 },
      { ingredient: "Cebolla",           gramsPerServing: 40 },
      { ingredient: "Tomate",            gramsPerServing: 60 },
      { ingredient: "Zanahoria",         gramsPerServing: 40 },
      { ingredient: "Morrón verde",      gramsPerServing: 40 },
      { ingredient: "Ajo",               gramsPerServing: 6 },
      { ingredient: "Aceite de oliva",   gramsPerServing: 6, preferUnit: "tbsp" },
      { ingredient: "Sal",               gramsPerServing: 1, preferUnit: "tsp" },
      { ingredient: "Pimentón dulce (polvo)", gramsPerServing: 1, preferUnit: "tsp" },
      { ingredient: "Pimienta negra",    gramsPerServing: 0.5 },
    ],
  },
  {
    key: "pollo-arroz",
    name: "Pollo con arroz integral y brócoli",
    blurb: "Más liviana, con cereal integral y brócoli — alta en proteína y fibra.",
    items: [
      { ingredient: "Pollo (pechuga)",   gramsPerServing: 120 },
      { ingredient: "Arroz integral",    gramsPerServing: 45 },
      { ingredient: "Brócoli",           gramsPerServing: 100 },
      { ingredient: "Zanahoria",         gramsPerServing: 50 },
      { ingredient: "Cebolla",           gramsPerServing: 40 },
      { ingredient: "Tomate",            gramsPerServing: 50 },
      { ingredient: "Ajo",               gramsPerServing: 5 },
      { ingredient: "Aceite de oliva",   gramsPerServing: 8, preferUnit: "tbsp" },
      { ingredient: "Sal",               gramsPerServing: 1, preferUnit: "tsp" },
      { ingredient: "Pimentón dulce (polvo)", gramsPerServing: 1, preferUnit: "tsp" },
      { ingredient: "Pimienta negra",    gramsPerServing: 0.5 },
    ],
  },
];

const BatchSuggestions = {
  list() {
    return BATCH_TEMPLATES;
  },

  // Arma los items de lote (amount/unit/grams) para una plantilla dada, matcheando
  // por nombre contra el catálogo actual de ingredientes. Ignora líneas cuyo
  // ingrediente no exista más, o esté marcado con gluten/mariscos.
  build(templateKey, servings, ingredients) {
    const template = BATCH_TEMPLATES.find((t) => t.key === templateKey);
    if (!template) return { name: "", items: [], skipped: [] };
    const byName = new Map(ingredients.map((i) => [i.name.trim().toLowerCase(), i]));
    const skipped = [];
    const items = [];

    for (const line of template.items) {
      const ing = byName.get(line.ingredient.trim().toLowerCase());
      if (!ing) { skipped.push(line.ingredient); continue; }
      if (ing.hasGluten || ing.isSeafood) { skipped.push(line.ingredient); continue; }

      const grams = Nutrition.round1(line.gramsPerServing * servings);
      let unit = "g";
      let amount = grams;
      if (line.preferUnit && Nutrition.availableUnits(ing).some((u) => u.value === line.preferUnit)) {
        unit = line.preferUnit;
        amount = Math.round(Nutrition.fromGrams(ing, grams, unit) * 100) / 100;
      }
      items.push({ ingredientId: ing.id, amount, unit, grams });
    }

    return { name: template.name, items, skipped };
  },
};

// ---------- Generador "con mis ingredientes" ----------
// Rangos realistas de gramos POR PORCIÓN (min, max), para que la búsqueda de
// cantidades no proponga algo imposible de cocinar (como 3g de cebolla o
// 400g de aceite). Si un ingrediente no está en la lista puntual, se usa un
// rango genérico según su categoría.
const INGREDIENT_BOUNDS = {
  "pollo (pechuga)": [80, 180],
  "carne molida": [70, 150],
  "tomate": [30, 100],
  "cebolla": [20, 60],
  "ajo": [2, 10],
  "sal": [0.5, 3],
  "papa": [60, 180],
  "lentejas (secas)": [25, 55],
  "morrón verde": [20, 70],
  "batata": [60, 150],
  "aceite de oliva": [5, 18],
  "aceite de girasol": [5, 18],
  "zanahoria": [20, 80],
  "pimentón dulce (polvo)": [0.5, 3],
  "pimienta negra": [0.3, 2],
  "garbanzos (secos)": [25, 55],
  "zapallo": [50, 150],
  "arroz integral": [25, 60],
  "brócoli": [40, 150],
};
const CATEGORY_BOUNDS = {
  proteina: [70, 160],
  carbohidrato: [25, 120],
  vegetal: [25, 100],
  grasa: [5, 18],
  condimento: [0.3, 3],
};

const BatchOptimizer = {
  boundsFor(ing) {
    const key = ing.name.trim().toLowerCase();
    if (INGREDIENT_BOUNDS[key]) return INGREDIENT_BOUNDS[key];
    return CATEGORY_BOUNDS[ing.category] || [10, 100];
  },

  // Búsqueda por coordenadas (hill-climbing): parte del punto medio de cada
  // rango realista y ajusta de a un ingrediente por vez, en pasadas con paso
  // cada vez más fino, buscando el puntaje total más alto posible sin salirse
  // de los rangos. No es una IA — es una búsqueda numérica simple, pero
  // suficiente para converger bien con pocos ingredientes.
  optimize(ingredientIds, servings, ingredientsById) {
    const list = ingredientIds
      .map((id) => ingredientsById[id])
      .filter((ing) => ing && !ing.hasGluten && !ing.isSeafood);
    if (list.length === 0) return { items: [], score: 0 };

    const state = list.map((ing) => {
      const [minPer, maxPer] = this.boundsFor(ing);
      const min = Nutrition.round1(minPer * servings);
      const max = Nutrition.round1(maxPer * servings);
      return { ing, min, max, grams: Nutrition.round1((min + max) / 2) };
    });

    const scoreOf = () => {
      const items = state.map((s) => ({ ingredientId: s.ing.id, grams: s.grams }));
      const totals = Nutrition.computeTotals(items, ingredientsById);
      const per = Nutrition.perServing(totals, servings);
      return Score.evaluate(per, items, ingredientsById).total;
    };

    let stepFraction = 0.25;
    for (let pass = 0; pass < 7; pass++) {
      for (const s of state) {
        const step = (s.max - s.min) * stepFraction;
        if (step <= 0) continue;
        const candidates = [s.grams - step, s.grams + step]
          .map((g) => Math.min(s.max, Math.max(s.min, Nutrition.round1(g))));
        let bestGrams = s.grams;
        let bestScore = scoreOf();
        for (const cand of candidates) {
          if (cand === s.grams) continue;
          const prev = s.grams;
          s.grams = cand;
          const sc = scoreOf();
          if (sc > bestScore) { bestScore = sc; bestGrams = cand; }
          s.grams = prev;
        }
        s.grams = bestGrams;
      }
      stepFraction *= 0.55;
    }

    const finalScore = scoreOf();
    const items = state.map((s) => {
      const grams = Nutrition.round1(s.grams);
      let unit = "g";
      let amount = grams;
      const spoonUnit = s.ing.tbspGrams ? "tbsp" : (s.ing.tspGrams ? "tsp" : null);
      const useSpoon = spoonUnit && (s.ing.category === "grasa" || s.ing.category === "condimento");
      if (useSpoon) {
        unit = spoonUnit;
        amount = Math.round(Nutrition.fromGrams(s.ing, grams, unit) * 100) / 100;
      }
      return { ingredientId: s.ing.id, amount, unit, grams };
    });

    return { items, score: finalScore };
  },
};
