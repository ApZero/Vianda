// Datos semilla de ingredientes: valores nutricionales por 100g (crudo, salvo aclaración)
// y precio por kg de referencia (editable por el usuario).
// Categorías: proteina | vegetal | carbohidrato | grasa | condimento
//
// Conversión a medidas de cocina (opcional, sólo donde aplica):
//   mlGrams   = gramos por mililitro (densidad) — típico de líquidos como aceites
//   tspGrams  = gramos por cucharadita (cdta, ~5ml)
//   tbspGrams = gramos por cucharada (cda, ~15ml)
const SEED_INGREDIENTS = [
  { name: "Pollo (pechuga)",       category: "proteina",      kcal: 165, protein: 31,  carbs: 0,    fat: 3.6,  fiber: 0,    sodium: 74,    pricePerKg: 18000 },
  { name: "Carne molida",          category: "proteina",      kcal: 254, protein: 17,  carbs: 0,    fat: 20,   fiber: 0,    sodium: 66,    pricePerKg: 26000 },
  { name: "Tomate",                category: "vegetal",       kcal: 18,  protein: 0.9, carbs: 3.9,  fat: 0.2,  fiber: 1.2,  sodium: 5,     pricePerKg: 6000 },
  { name: "Cebolla",               category: "vegetal",       kcal: 40,  protein: 1.1, carbs: 9.3,  fat: 0.1,  fiber: 1.7,  sodium: 4,     pricePerKg: 5000 },
  { name: "Ajo",                   category: "condimento",    kcal: 149, protein: 6.4, carbs: 33,   fat: 0.5,  fiber: 2.1,  sodium: 17,    pricePerKg: 15000 },
  { name: "Sal",                   category: "condimento",    kcal: 0,   protein: 0,   carbs: 0,    fat: 0,    fiber: 0,    sodium: 38758, pricePerKg: 3000,  tspGrams: 6,   tbspGrams: 18 },
  { name: "Papa",                  category: "carbohidrato",  kcal: 77,  protein: 2,   carbs: 17,   fat: 0.1,  fiber: 2.2,  sodium: 6,     pricePerKg: 4000 },
  { name: "Lentejas (secas)",      category: "carbohidrato",  kcal: 353, protein: 25,  carbs: 60,   fat: 1.1,  fiber: 11,   sodium: 6,     pricePerKg: 12000 },
  { name: "Morrón verde",          category: "vegetal",       kcal: 20,  protein: 0.9, carbs: 4.6,  fat: 0.2,  fiber: 1.7,  sodium: 3,     pricePerKg: 8000 },
  { name: "Batata",                category: "carbohidrato",  kcal: 86,  protein: 1.6, carbs: 20,   fat: 0.1,  fiber: 3,    sodium: 55,    pricePerKg: 6000 },
  { name: "Aceite de oliva",       category: "grasa",         kcal: 884, protein: 0,   carbs: 0,    fat: 100,  fiber: 0,    sodium: 2,     pricePerKg: 35000, mlGrams: 0.91, tspGrams: 4.5, tbspGrams: 13.6 },
  { name: "Aceite de girasol",     category: "grasa",         kcal: 884, protein: 0,   carbs: 0,    fat: 100,  fiber: 0,    sodium: 0,     pricePerKg: 12000, mlGrams: 0.92, tspGrams: 4.6, tbspGrams: 13.8 },
  { name: "Zanahoria",             category: "vegetal",       kcal: 41,  protein: 0.9, carbs: 10,   fat: 0.2,  fiber: 2.8,  sodium: 69,    pricePerKg: 5000 },
  { name: "Pimentón dulce (polvo)",category: "condimento",    kcal: 282, protein: 14.1,carbs: 54,   fat: 12.9, fiber: 34.9, sodium: 68,    pricePerKg: 25000, tspGrams: 2.3, tbspGrams: 6.9 },
  { name: "Pimienta negra",        category: "condimento",    kcal: 251, protein: 10.4,carbs: 64,   fat: 3.3,  fiber: 25.3, sodium: 20,    pricePerKg: 30000, tspGrams: 2.1, tbspGrams: 6.3 },
];
