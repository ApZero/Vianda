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
