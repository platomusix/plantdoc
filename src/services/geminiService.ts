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
  // Отправляем запрос на наш собственный прокси-сервер Vercel
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ base64Image, mimeType }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    if (errorData.error === "MISSING_API_KEY") {
      throw new Error("MISSING_API_KEY");
    }
    throw new Error(errorData.error || "Ошибка при анализе изображения");
  }

  // Возвращаем результат в App.tsx
  return await response.json();
}
