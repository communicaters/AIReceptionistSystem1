import { pool } from '../server/db';

async function createWhatsappTemplatesTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS whatsapp_templates (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      components_json TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      provider TEXT NOT NULL DEFAULT 'facebook',
      template_id TEXT,
      last_used TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  
  try {
    await pool.query(query);
    console.log('WhatsApp templates table created successfully');
    return true;
  } catch (error) {
    console.error('Error creating WhatsApp templates table:', error);
    return false;
  }
}

async function createEmailTemplatesTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS email_templates (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      variables TEXT,
      last_used TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  
  try {
    await pool.query(query);
    console.log('Email templates table created successfully');
    return true;
  } catch (error) {
    console.error('Error creating email templates table:', error);
    return false;
  }
}

async function createScheduledEmailsTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS scheduled_emails (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      to_email TEXT NOT NULL,
      from_email TEXT NOT NULL,
      from_name TEXT,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      html_body TEXT,
      scheduled_time TIMESTAMP NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      template_id INTEGER REFERENCES email_templates(id) ON DELETE SET NULL,
      service TEXT,
      sent_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      is_recurring BOOLEAN DEFAULT FALSE,
      recurring_rule TEXT
    );
  `;
  
  try {
    await pool.query(query);
    console.log('Scheduled emails table created successfully');
    return true;
  } catch (error) {
    console.error('Error creating scheduled emails table:', error);
    return false;
  }
}

async function main() {
  console.log('Creating missing tables...');
  
  try {
    // Create email-related tables
    const emailTemplatesCreated = await createEmailTemplatesTable();
    let scheduledEmailsCreated = false;
    if (emailTemplatesCreated) {
      scheduledEmailsCreated = await createScheduledEmailsTable();
    }
    
    // Create WhatsApp templates table
    const whatsappTemplatesCreated = await createWhatsappTemplatesTable();
    
    if (emailTemplatesCreated && scheduledEmailsCreated && whatsappTemplatesCreated) {
      console.log('All tables created successfully');
    }
  } catch (error) {
    console.error('Error in table creation process:', error);
  } finally {
    await pool.end();
  }
}

main();