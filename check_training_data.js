#!/usr/bin/env node

const { Pool } = require('@neondatabase/serverless');
const ws = require('ws');
require('dotenv').config();

// Configure Neon database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    console.log('Checking training data in database...');
    
    // Check if training_data table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'training_data'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.error('training_data table does not exist!');
      return;
    }
    
    // Count the training data entries
    const countResult = await pool.query('SELECT COUNT(*) FROM training_data');
    console.log(`Total training data entries: ${countResult.rows[0].count}`);
    
    // Get the categories
    const categoriesResult = await pool.query('SELECT DISTINCT category FROM training_data');
    console.log('Categories:', categoriesResult.rows.map(row => row.category).join(', '));
    
    // Get company information
    const companyData = await pool.query(`
      SELECT id, user_id, category, name, content 
      FROM training_data 
      WHERE category = 'company'
      LIMIT 5
    `);
    
    console.log('\nCompany training data:');
    companyData.rows.forEach(row => {
      console.log(`ID: ${row.id}, User ID: ${row.user_id}, Name: ${row.name}`);
      console.log(`Content (excerpt): ${row.content.substring(0, 200)}...\n`);
    });
    
    // Get all data for testing
    console.log('\nSample of all training data:');
    const allData = await pool.query(`
      SELECT id, user_id, category, name, content 
      FROM training_data 
      LIMIT 10
    `);
    
    allData.rows.forEach(row => {
      console.log(`ID: ${row.id}, User ID: ${row.user_id}, Category: ${row.category}, Name: ${row.name}`);
      console.log(`Content (excerpt): ${row.content.substring(0, 100)}...\n`);
    });
    
    console.log('\nTraining data check complete.');
  } catch (error) {
    console.error('Error checking training data:', error);
  } finally {
    await pool.end();
  }
}

main();
