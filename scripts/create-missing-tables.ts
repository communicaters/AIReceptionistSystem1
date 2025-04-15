import { pool } from '../server/db';

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
    const templatesCreated = await createEmailTemplatesTable();
    if (templatesCreated) {
      const scheduledEmailsCreated = await createScheduledEmailsTable();
      if (scheduledEmailsCreated) {
        console.log('All tables created successfully');
      }
    }
  } catch (error) {
    console.error('Error in table creation process:', error);
  } finally {
    await pool.end();
  }
}

main();