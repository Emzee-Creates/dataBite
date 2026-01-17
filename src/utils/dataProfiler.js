/**
 * Generates a metadata profile to help Gemini write accurate DuckDB SQL.
 */
export const generateDataProfile = (rawData, columns) => {
  if (!rawData || rawData.length === 0) return "No data available.";

  const profile = {
    totalRowsAvailable: rawData.length,
    schema: columns.map(col => {
      const values = rawData.map(row => row[col]).filter(v => v !== null && v !== undefined);
      const firstValue = values[0];
      
      // Determine Type
      let type = 'string';
      if (typeof firstValue === 'number') type = 'numeric';
      // Basic date detection
      if (typeof firstValue === 'string' && !isNaN(Date.parse(firstValue)) && firstValue.length > 5) {
        type = 'timestamp';
      }

      const uniqueValues = [...new Set(values)];
      
      return {
        column: col,
        type: type,
        // Provide samples so Gemini knows the exact string casing (e.g., "Electronics" vs "electronics")
        examples: type === 'numeric' 
          ? `Range: ${Math.min(...values)} to ${Math.max(...values)}`
          : uniqueValues.slice(0, 5),
        isUnique: uniqueValues.length === rawData.length
      };
    }),
    // Give Gemini a real look at the first 2 rows to understand relationship between columns
    dataPreview: rawData.slice(0, 2) 
  };

  return `
    TABLE_NAME: data
    COLUMNS & TYPES:
    ${profile.schema.map(s => `- ${s.column} (${s.type}): Examples: ${JSON.stringify(s.examples)}`).join('\n')}
    
    PREVIEW ROWS:
    ${JSON.stringify(profile.dataPreview)}
  `;
};