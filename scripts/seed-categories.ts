// scripts/seed-categories.ts
// Lub możesz uruchomić to w konsoli przeglądarki jako fetch requests

const defaultCategories = [
  {
    name: "Projekty UE",
    description: "Dokumenty związane z projektami Unii Europejskiej"
  },
  {
    name: "Dokumentacja techniczna",
    description: "Instrukcje, manuele i dokumentacja techniczna"
  },
  {
    name: "Rozporządzenia i przepisy",
    description: "Akty prawne, rozporządzenia i przepisy"
  },
  {
    name: "Raporty i analizy",
    description: "Raporty, analizy i badania"
  },
  {
    name: "Formularze i wnioski",
    description: "Formularze aplikacyjne i dokumenty do wniosków"
  },
  {
    name: "Inne",
    description: "Pozostałe dokumenty"
  }
];

// Możesz uruchomić to w konsoli przeglądarki:
async function createDefaultCategories() {
  for (const category of defaultCategories) {
    try {
      const response = await fetch('/api/knowledge/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(category),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Utworzono kategorię: ${result.category.name}`);
      } else {
        const error = await response.json();
        console.log(`❌ Błąd dla kategorii ${category.name}:`, error.error);
      }
    } catch (error) {
      console.error(`❌ Błąd podczas tworzenia kategorii ${category.name}:`, error);
    }
  }
}

// Wywołaj tę funkcję w konsoli przeglądarki:
// createDefaultCategories();