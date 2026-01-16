import { GoogleGenerativeAI } from "@google/generative-ai";

// Existing Chart Config Function
export const generateChartConfig = async (userQuery, columns, rawData) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview", // Stable model for high-speed logic
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
    });

    const prompt = `
      You are a Senior Data Scientist.
      TASK:
      1. Analyze the raw data provided.
      2. If the user asks for a trend, forecast, or "what's next", perform a linear projection.
      3. In 'transformedData', mark historical points with "type": "actual" and future points with "type": "forecast".
      4. If forecasting, provide at least 3-5 future data points.

      DATASET:
      ${JSON.stringify(rawData.slice(0, 50))}

      USER QUERY: "${userQuery}"

      OUTPUT JSON STRUCTURE:
      {
        "chartType": "bar" | "line" | "pie",
        "transformedData": [{"label": "Jan", "value": 100, "type": "actual"}, {"label": "Feb", "value": 120, "type": "forecast"}],
        "xAxis": "label",
        "yAxis": "value",
        "title": "...",
        "reasoning": "...",
        "isForecast": true | false
      }
    `;

    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  } catch (error) {
    console.error("AI Error:", error);
    return null;
  }
};

// NEW: Discovery Suggestions Function
export const getDiscoverySuggestions = async (columns, rawData) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview", // Stable model for high-speed logic
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      Analyze these data columns: ${columns.join(", ")}.
      Sample data: ${JSON.stringify(rawData.slice(0, 2))}.
      
      Generate 3 insightful questions a business owner would ask this specific data.
      One must be a forecast question.
      Return a JSON array of strings ONLY.
      Example: ["What is the projected revenue?", "Which region has highest growth?"]
    `;

    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  } catch (error) {
    return ["Forecast future growth", "Show data distribution", "Analyze by category"];
  }
};