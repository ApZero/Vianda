// Cálculos nutricionales y de costo para lotes
const Nutrition = {
  // Suma nutrientes/costo totales de un lote a partir de sus items {ingredientId, grams}
  computeTotals(items, ingredientsById) {
    const totals = { grams: 0, kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0, cost: 0 };
    for (const item of items) {
      const ing = ingredientsById[item.ingredientId];
      if (!ing) continue;
      const factor = item.grams / 100;
      totals.grams += item.grams;
      totals.kcal += ing.kcal * factor;
      totals.protein += ing.protein * factor;
      totals.carbs += ing.carbs * factor;
      totals.fat += ing.fat * factor;
      totals.fiber += ing.fiber * factor;
      totals.sodium += ing.sodium * factor;
      totals.cost += (ing.pricePerKg / 1000) * item.grams;
    }
    return totals;
  },

  // Divide los totales entre el número de porciones
  perServing(totals, servings) {
    const s = Math.max(1, servings);
    return {
      grams: totals.grams / s,
      kcal: totals.kcal / s,
      protein: totals.protein / s,
      carbs: totals.carbs / s,
      fat: totals.fat / s,
      fiber: totals.fiber / s,
      sodium: totals.sodium / s,
      cost: totals.cost / s,
    };
  },

  // Escala los items de un lote a una nueva cantidad de porciones, manteniendo proporciones
  scaleItems(items, fromServings, toServings) {
    const factor = toServings / Math.max(1, fromServings);
    return items.map((it) => ({
      ...it,
      grams: Math.round(it.grams * factor * 10) / 10,
      amount: it.amount != null ? Math.round(it.amount * factor * 100) / 100 : undefined,
    }));
  },

  round1(n) {
    return Math.round(n * 10) / 10;
  },
  round0(n) {
    return Math.round(n);
  },

  // ---------- Unidades de cocina (g, ml, cdta, cda) ----------
  UNIT_LABELS: { g: "g", ml: "ml", tsp: "cdta", tbsp: "cda" },

  // Devuelve las unidades disponibles para un ingrediente: siempre gramos,
  // más ml/cdta/cda si el ingrediente tiene esa conversión definida.
  availableUnits(ing) {
    const units = [{ value: "g", label: "g" }];
    if (!ing) return units;
    if (ing.mlGrams) units.push({ value: "ml", label: "ml" });
    if (ing.tspGrams) units.push({ value: "tsp", label: "cdta" });
    if (ing.tbspGrams) units.push({ value: "tbsp", label: "cda" });
    return units;
  },

  // Convierte una cantidad en una unidad dada a gramos, según el ingrediente
  toGrams(ing, amount, unit) {
    if (!ing || unit === "g" || !unit) return amount;
    if (unit === "ml") return amount * (ing.mlGrams || 0);
    if (unit === "tsp") return amount * (ing.tspGrams || 0);
    if (unit === "tbsp") return amount * (ing.tbspGrams || 0);
    return amount;
  },

  // Convierte gramos de vuelta a una unidad dada (para mostrar valores editables)
  fromGrams(ing, grams, unit) {
    if (!ing || unit === "g" || !unit) return grams;
    if (unit === "ml") return ing.mlGrams ? grams / ing.mlGrams : grams;
    if (unit === "tsp") return ing.tspGrams ? grams / ing.tspGrams : grams;
    if (unit === "tbsp") return ing.tbspGrams ? grams / ing.tbspGrams : grams;
    return grams;
  },
};
