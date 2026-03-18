import { GoogleGenAI, Type } from "@google/genai";

export interface Issue {
  title: string;
  description: string;
  boundingBox: [number, number, number, number]; // [ymin, xmin, ymax, xmax] in normalized coordinates 0-1000
}

export interface AnalysisResult {
  plantName: string;
  diagnosis: string;
  issues: Issue[];
  recommendations: string;
  products: string;
  sources: { uri: string; title: string }[];
}

export async function analyzePlantImage(base64Image: string, mimeType: string): Promise<AnalysisResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "") {
    throw new Error("MISSING_API_KEY");
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Проанализируй это изображение растения. 
    
    1. Определи название растения (на русском и латыни, если возможно).
    2. ВАЖНО: Если растение выглядит полностью здоровым, так и напиши в диагнозе. В этом случае список проблем (issues) должен быть пустым. Не пытайся найти болезни там, где их нет.
    3. Если есть проблемы, найди конкретные зоны и укажи их координаты в формате [ymin, xmin, ymax, xmax] (нормализованные от 0 до 1000). Если растение здорово, оставь список пустым.
    4. Поставь общий диагноз (например: "Растение здорово", "Заражение мучнистой росой" и т.д.).
    5. Дай подробные рекомендации по уходу (для лечения или поддержания здоровья здорового растения).
    6. Предложи конкретные товары (удобрения, лекарства, инструменты), которые ДОСТУПНЫ В ПРОДАЖЕ В РОССИИ (РФ). Указывай названия брендов, популярных в РФ.
    
    ОТВЕЧАЙ ТОЛЬКО НА РУССКОМ ЯЗЫКЕ.
    Используй Google Поиск для проверки доступности товаров в РФ и актуальных методов ухода.
  `;

  const response = await ai.models.generateContent({
    model: model,
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1],
              mimeType: mimeType,
            },
          },
          { text: prompt },
        ],
      },
    ],
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          plantName: { type: Type.STRING, description: "Название растения (напр. 'Фикус каучуконосный (Ficus elastica)')" },
          diagnosis: { type: Type.STRING, description: "Общий диагноз состояния растения" },
          issues: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Краткое название проблемы (например, 'Пятнистость')" },
                description: { type: Type.STRING, description: "Описание того, что именно не так в этой зоне" },
                boundingBox: {
                  type: Type.ARRAY,
                  items: { type: Type.NUMBER },
                  description: "[ymin, xmin, ymax, xmax] координаты зоны"
                }
              },
              required: ["title", "description", "boundingBox"]
            }
          },
          recommendations: { type: Type.STRING, description: "Подробные советы по уходу в формате Markdown" },
          products: { type: Type.STRING, description: "Список товаров для покупки в формате Markdown" }
        },
        required: ["plantName", "diagnosis", "issues", "recommendations", "products"]
      }
    },
  });

  const data = JSON.parse(response.text || "{}");
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter(chunk => chunk.web)
    ?.map(chunk => ({
      uri: chunk.web!.uri,
      title: chunk.web!.title || chunk.web!.uri
    })) || [];

  return {
    plantName: data.plantName || "Не удалось определить растение",
    diagnosis: data.diagnosis || "Не удалось поставить диагноз.",
    issues: data.issues || [],
    recommendations: data.recommendations || "Рекомендации отсутствуют.",
    products: data.products || "Товары не найдены.",
    sources: sources,
  };
}
