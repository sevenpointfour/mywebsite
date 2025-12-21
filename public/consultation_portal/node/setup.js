const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
  const {decrypt, getDefaultKey} = require('./decrypt');
require('dotenv').config();

// --- Configuration ---
const SQL_FILES_DIR = '../sql';
const SQL_FILES_ORDER = [
  "consultation_users.sql",
  "consultation_clients.sql",
  "consultation_general_food_recommendations.sql",
  "consultation_client_medical_history.sql",
  "consultation_client_medications.sql",
  "consultation_client_blood_test_reports.sql",
  "consultation_client_blood_test_results.sql",
  "consultation_client_food_plans.sql",
  "consultation_client_food_plan_hourly_details.sql"
]
;
 // Get encryption key from a secure env var (not in .env file)
const ENC_KEY = process.env.ENC_KEY || getDefaultKey();

// --- Get Database Credentials & Parameters from .env ---
const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_NAME = process.env.DB_NAME;
const DB_PASS = decrypt(process.env.DB_PASSWORD, ENC_KEY);

if (!DB_HOST || !DB_USER || !DB_NAME || !DB_PASS) {
  console.error('Missing database configuration in .env file.');
  process.exit(1);
}

async function main() {
  // Create pool
  const pool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
  });

  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('Successfully connected to database.');
  } catch (err) {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  }

  // Execute SQL files in order
  let sqlFiles = fs.readdirSync(SQL_FILES_DIR)
    .filter(file => file.startsWith('migration-') && file.endsWith('.sql'))
    .sort();
  SQL_FILES_ORDER.push(...sqlFiles);
  for (const sqlFile of SQL_FILES_ORDER) {
    const fullPath = path.join(SQL_FILES_DIR, sqlFile);
    if (!fs.existsSync(fullPath)) {
      console.warn(`Warning: SQL file ${fullPath} not found. Skipping.`);
      continue;
    }
    console.log(`Executing ${sqlFile}...`);
    try {
      const sqlContent = fs.readFileSync(fullPath, 'utf8');
      // Split on semicolon followed by optional whitespace and a newline
      const statements = sqlContent
        .split(/;\s*[\r\n]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const stmt of statements) {
        await pool.query(stmt);
      }
      console.log(`${sqlFile} executed successfully.`);
    } catch (err) {
      console.error(`Error executing ${sqlFile}:`, err);
      process.exit(1);
    }
  }

  await pool.end();
  console.log('All SQL scripts executed successfully.');
  process.exit(0);
}

main();