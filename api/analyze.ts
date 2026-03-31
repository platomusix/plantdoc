import { GoogleGenAI, Type } from "@google/genai";
export const maxDuration = 60; // Даем серверу 60 секунд на подумать

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
    
    // МАКСИМАЛЬНО ЖЕСТКИЙ ПРОМПТ
    const prompt = `
      Ты — ведущий эксперт-ботаник и фитопатолог. Проанализируй изображение растения максимально подробно.
      
      ОТВЕЧАЙ СТРОГО НА РУССКОМ ЯЗЫКЕ. Ищи информацию в Google так, как если бы ты находился в России.

      1. Определи название растения (на русском и латыни).
      2. Диагноз: Поставь точный и развернутый диагноз. (Если растение здорово, так и напиши, а список проблем оставь пустым).
      3. Зоны (issues): Укажи координаты проблемных зон [ymin, xmin, ymax, xmax] (от 0 до 1000).
      4. Рекомендации: Напиши ОЧЕНЬ ПОДРОБНУЮ инструкцию по лечению или уходу. ОБЯЗАТЕЛЬНО используй Markdown: жирный текст для акцентов, списки для шагов, двойные переносы строк для абзацев.
      5. Товары: Найди конкретные препараты, удобрения или грунты, которые популярны и доступны для покупки в РФ (например, Фитоверм, Эпин, Актара и т.д.). Оформи в виде красивого Markdown-списка.
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
        maxOutputTokens: 4096, // Разрешаем генерировать много текста
        systemInstruction: "Ты профессиональный агроном. Твои ответы всегда длинные, структурированные и используют Markdown (**, -, \n\n).", // Заставляем использовать разметку
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
            // Явно требуем Markdown с переносами строк прямо в схеме
            recommendations: { type: Type.STRING, description: "Подробный текст в формате Markdown с переносами строк \\n\\n" },
            products: { type: Type.STRING, description: "Список в формате Markdown с переносами строк \\n\\n" }
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
