const { Pool } = require('@neondatabase/serverless');

async function updateDatabaseSchema() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Starting database schema update...');
    
    // Ajouter la colonne structure si elle n'existe pas
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS structure VARCHAR(200);
    `);
    console.log('✓ Added structure column to users table');
    
    // Mettre à jour la table meeting_participants
    await pool.query(`
      ALTER TABLE meeting_participants 
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
    `);
    console.log('✓ Added status column to meeting_participants table');
    
    await pool.query(`
      ALTER TABLE meeting_participants 
      ADD COLUMN IF NOT EXISTS proxy_to_user_id INTEGER REFERENCES users(id);
    `);
    console.log('✓ Added proxy_to_user_id column to meeting_participants table');
    
    await pool.query(`
      ALTER TABLE meeting_participants 
      ADD COLUMN IF NOT EXISTS proxy_to_structure VARCHAR(200);
    `);
    console.log('✓ Added proxy_to_structure column to meeting_participants table');
    
    await pool.query(`
      ALTER TABLE meeting_participants 
      ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);
    `);
    console.log('✓ Added updated_by column to meeting_participants table');
    
    // Supprimer l'ancienne colonne is_present si elle existe
    await pool.query(`
      ALTER TABLE meeting_participants 
      DROP COLUMN IF EXISTS is_present;
    `);
    console.log('✓ Removed old is_present column');
    
    // Ajouter des structures d'exemple pour les élus
    const structures = [
      'SUD éducation',
      'UNSA éducation', 
      'SGEN-CFDT',
      'SNUIPP-FSU',
      'SE-UNSA',
      'CGT éduc\'action',
      'FO',
      'SNALC'
    ];
    
    // Mettre à jour les utilisateurs élus avec des structures
    await pool.query(`
      UPDATE users 
      SET structure = 'SUD éducation'
      WHERE role = 'Elu·es' AND email = 'elu@scc.fr';
    `);
    
    console.log('✓ Updated elected members with structures');
    
    console.log('Database schema update completed successfully!');
    
  } catch (error) {
    console.error('Error updating database schema:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

updateDatabaseSchema().catch(console.error);