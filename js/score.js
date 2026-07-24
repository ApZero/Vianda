// Sistema de puntos: evalúa qué tan balanceada es UNA porción (una comida, una persona)
// Puntaje total: 100 puntos repartidos en 6 componentes.
const Score = {
  // Rangos objetivo para una porción de una comida principal
  targets: {
    kcal: { min: 450, max: 750, floor: 300, ceil: 950 },
    protein: { good: 25, low: 10 },
    fiber: { good: 6, low: 0 },
    fat: { min: 12, max: 28, floor: 5, ceil: 40 },
    sodium: { good: 700, bad: 1500 },
    veggieCount: { good: 3 },
  },

  // Puntaje lineal simple: full en [min,max], cae a 0 en floor/ceil
  rangeScore(value, min, max, floor, ceil, weight) {
    if (value >= min && value <= max) return weight;
    if (value < min) {
      if (value <= floor) return 0;
      return weight * (value - floor) / (min - floor);
    }
    if (value > max) {
      if (value >= ceil) return 0;
      return weight * (ceil - value) / (ceil - max);
    }
    return 0;
  },

  // Puntaje "cuanto más mejor" hasta un tope
  upToScore(value, goodAt, weight, lowAt = 0) {
    if (value >= goodAt) return weight;
    if (value <= lowAt) return 0;
    return weight * (value - lowAt) / (goodAt - lowAt);
  },

  // Puntaje "cuanto menos mejor" (ej. sodio)
  downFromScore(value, goodAt, badAt, weight) {
    if (value <= goodAt) return weight;
    if (value >= badAt) return 0;
    return weight * (badAt - value) / (badAt - goodAt);
  },

  evaluate(perServing, items, ingredientsById) {
    const t = this.targets;
    const scores = {};

    scores.kcal = this.rangeScore(perServing.kcal, t.kcal.min, t.kcal.max, t.kcal.floor, t.kcal.ceil, 20);
    scores.protein = this.upToScore(perServing.protein, t.protein.good, 20, t.protein.low);
    scores.fiber = this.upToScore(perServing.fiber, t.fiber.good, 15);
    scores.fat = this.rangeScore(perServing.fat, t.fat.min, t.fat.max, t.fat.floor, t.fat.ceil, 15);
    scores.sodium = this.downFromScore(perServing.sodium, t.sodium.good, t.sodium.bad, 15);

    const veggieCategories = new Set(
      items
        .map((it) => ingredientsById[it.ingredientId])
        .filter((ing) => ing && ing.category === "vegetal")
        .map((ing) => ing.name)
    );
    scores.diversity = this.upToScore(veggieCategories.size, t.veggieCount.good, 15);

    const total = Object.values(scores).reduce((a, b) => a + b, 0);

    return {
      total: Math.round(total),
      breakdown: scores,
      suggestions: this.buildSuggestions(perServing, scores, veggieCategories.size),
    };
  },

  buildSuggestions(perServing, scores, veggieCount) {
    const s = [];
    if (scores.kcal < 14) {
      if (perServing.kcal < this.targets.kcal.min) s.push("Porción con pocas calorías: sumá más carbohidrato (papa, batata, lentejas) o grasa saludable.");
      else s.push("Porción con muchas calorías: reducí un poco el aceite o la porción de carbohidrato.");
    }
    if (scores.protein < 14) s.push("Bajo en proteína: aumentá la cantidad de pollo, carne o lentejas.");
    if (scores.fiber < 10) s.push("Bajo en fibra: agregá más verduras, lentejas o batata.");
    if (scores.fat < 10) {
      if (perServing.fat < this.targets.fat.min) s.push("Poca grasa: un chorrito más de aceite de oliva ayuda a la saciedad.");
      else s.push("Demasiada grasa: reducí un poco el aceite o la carne más grasosa.");
    }
    if (scores.sodium < 10) s.push("Alto en sodio: usá menos sal, controlá caldos o condimentos salados.");
    if (veggieCount < 2) s.push("Poca variedad de verduras: sumá una o dos más (zanahoria, morrón, tomate).");
    if (s.length === 0) s.push("Buen balance general — mantené esta receta como referencia.");
    return s;
  },

  label(total) {
    if (total >= 85) return { text: "Excelente", cls: "score-great" };
    if (total >= 70) return { text: "Bueno", cls: "score-good" };
    if (total >= 50) return { text: "Mejorable", cls: "score-ok" };
    return { text: "Desbalanceado", cls: "score-bad" };
  },
};
