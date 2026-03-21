import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: any, res: any) {
  // Пропускаем только POST-запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Получаем картинку с нашего фронтенда
    const { base64Image, mimeType } = req.body;
    
    // Берем ключ из переменных окружения Vercel
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "") {
      return res.status(401).json({ error: "MISSING_API_KEY" });
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

    // Отправляем запрос в Гугл с серверов США
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
            plantName: { type: Type.STRING, description: "Название растения" },
            diagnosis: { type: Type.STRING, description: "Общий диагноз" },
            issues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  boundingBox: {
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER }
                  }
                },
                required: ["title", "description", "boundingBox"]
              }
            },
            recommendations: { type: Type.STRING },
            products: { type: Type.STRING }
          },
          required: ["plantName", "diagnosis", "issues", "recommendations", "products"]
        }
      },
    });

    // Парсим ответ и источники
    const data = JSON.parse(response.text || "{}");
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter((chunk: any) => chunk.web)
      ?.map((chunk: any) => ({
        uri: chunk.web!.uri,
        title: chunk.web!.title || chunk.web!.uri
      })) || [];

    // Отправляем готовый результат обратно на наш фронтенд
    return res.status(200).json({
      plantName: data.plantName || "Не удалось определить растение",
      diagnosis: data.diagnosis || "Не удалось поставить диагноз.",
      issues: data.issues || [],
      recommendations: data.recommendations || "Рекомендации отсутствуют.",
      products: data.products || "Товары не найдены.",
      sources: sources,
    });

  } catch (error: any) {
    console.error("API Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
