import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Main AI logic updated for DuckDB-Wasm SQL generation.
 */
export const generateChartConfig = async (userQuery, dataProfile, previousState = null) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview", 
      generationConfig: { 
        responseMimeType: "application/json", 
        temperature: 0.1 
      }
    });

    const prompt = `
      You are an Expert Data Analyst and SQL Master.
      
      DATA PROFILE (The schema of the dataset):
      ${dataProfile}

      CURRENT CHART STATE:
      ${previousState ? JSON.stringify(previousState) : "No chart active."}

      USER COMMAND: "${userQuery}"

      TASK:
      1. Write a DUCKDB SQL query to extract the data needed. The table is always named 'data'.
      2. If the user asks for a modification (e.g., "make it a line chart"), keep the previous SQL but change the 'chartType'.
      3. For forecasts, use SQL to aggregate historical data. 
      4. Ensure the SQL columns match the 'label' and 'value' needs of a chart.

      OUTPUT JSON STRUCTURE:
      {
        "sql": "SELECT column_a as label, SUM(column_b) as value FROM data GROUP BY 1",
        "chartType": "bar" | "line" | "pie",
        "xAxis": "column_name_for_label",
        "yAxis": "column_name_for_value",
        "title": "Descriptive Title",
        "reasoning": "Quick explanation of the analytical approach",
        "isForecast": boolean
      }
    `;

    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  } catch (error) {
    console.error("AI Generation Error:", error);
    return null;
  }
};

/**
 * Suggestions based on column metadata.
 */
export const getDiscoverySuggestions = async (columns, rawData) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `Based on these columns [${columns.join(", ")}], return 3 high-value business questions as a JSON array of strings.`;
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  } catch (error) {
    return ["What are the total sales by category?", "Show me the monthly trend", "Which region has the highest growth?"];
  }
};