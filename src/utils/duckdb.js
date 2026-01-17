// src/utils/duckdb.js
import * as duckdb from '@duckdb/duckdb-wasm';

let db = null;
let conn = null;
let currentFileName = null;

/**
 * Initializes the DuckDB WASM instance and registers the provided file as a table.
 */
export const initDuckDB = async (file) => {
  // If the same file is already loaded, reuse the connection
  if (conn && currentFileName === file.name) return conn;

  // Initialize DB if it doesn't exist
  if (!db) {
    const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

    const worker = new Worker(bundle.mainWorker);
    const logger = new duckdb.ConsoleLogger();
    db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    conn = await db.connect();
  }

  // Handle new file: Drop old table and register new one
  if (currentFileName !== file.name) {
    try {
      await conn.query(`DROP TABLE IF EXISTS data`);
      
      // Register the browser file (Blob/File) with DuckDB
      await db.registerFileHandle(
        file.name, 
        file, 
        duckdb.DuckDBDataProtocol.BROWSER_FILE, 
        true
      );

      // Create a table named 'data' from the CSV
      // auto_detect=true helps with types (dates, numbers, strings)
      await conn.insertCSVFromPath(file.name, { 
        name: 'data', 
        header: true,
        detect: true 
      });

      currentFileName = file.name;
      console.log(`DuckDB: Table 'data' created from ${file.name}`);
    } catch (err) {
      console.error("DuckDB initialization error:", err);
      throw err;
    }
  }
  
  return conn;
};

/**
 * Executes a SQL query and converts results (including BigInts) to JS-friendly formats.
 */
export const runQuery = async (sql) => {
  if (!conn) {
    console.error("DuckDB not initialized. Call initDuckDB(file) first.");
    return null;
  }

  try {
    const result = await conn.query(sql);
    
    // Convert Arrow result to Array of Objects and handle BigInt serialization
    return result.toArray().map(row => 
      Object.fromEntries(
        Object.entries(row).map(([k, v]) => [
          k, 
          typeof v === 'bigint' ? Number(v) : v
        ])
      )
    );
  } catch (err) {
    console.error("SQL Execution Error:", err);
    throw err;
  }
};