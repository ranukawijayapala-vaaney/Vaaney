import { db } from "./db";
import { sql } from "drizzle-orm";
import { execSync } from "child_process";
import { log } from "./vite";

/**
 * Initialize database schema if tables don't exist
 * This runs on server startup and creates tables automatically in production
 */
export async function initializeDatabase() {
  try {
    log("Checking database schema...");
    
    // Check if the users table exists as a proxy for schema initialization
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      ) as table_exists;
    `);
    
    const tableExists = (result.rows[0] as any).table_exists;
    
    if (!tableExists) {
      log("Database tables not found. Initializing schema...");
      
      // Run drizzle-kit push to create tables
      execSync('npx drizzle-kit push', {
        stdio: 'inherit',
        env: process.env
      });
      
      log("✓ Database schema initialized successfully");
    } else {
      log("✓ Database schema already initialized");
    }
  } catch (error) {
    // If the information_schema query fails, the database might be completely empty
    // Try to run drizzle-kit push
    log("Database schema check failed. Attempting to initialize...");
    
    try {
      execSync('npx drizzle-kit push', {
        stdio: 'inherit',
        env: process.env
      });
      
      log("✓ Database schema initialized successfully");
    } catch (pushError) {
      log("✗ Failed to initialize database schema");
      console.error(pushError);
      throw new Error("Database initialization failed. Please check your DATABASE_URL and try again.");
    }
  }
}
