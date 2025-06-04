import { Pool } from '@neondatabase/serverless';

async function migrateDatabase() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Add structure column to users table
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS structure VARCHAR(200)
    `);
    
    // Modify meeting_participants table
    await pool.query(`
      ALTER TABLE meeting_participants 
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'
    `);
    
    await pool.query(`
      ALTER TABLE meeting_participants 
      ADD COLUMN IF NOT EXISTS proxy_to_user_id INTEGER REFERENCES users(id)
    `);
    
    await pool.query(`
      ALTER TABLE meeting_participants 
      ADD COLUMN IF NOT EXISTS proxy_to_structure VARCHAR(200)
    `);
    
    await pool.query(`
      ALTER TABLE meeting_participants 
      ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id)
    `);
    
    // Drop old columns if they exist
    await pool.query(`
      ALTER TABLE meeting_participants 
      DROP COLUMN IF EXISTS is_present
    `);
    
    await pool.query(`
      ALTER TABLE meeting_participants 
      DROP COLUMN IF EXISTS joined_at
    `);
    
    console.log('Database migration completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await pool.end();
  }
}

migrateDatabase();