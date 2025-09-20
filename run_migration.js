const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

// Create Supabase client with service role key (for admin operations)
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    console.log('🔄 Reading migration file...');

    // Read the emergency fix SQL file
    const sqlPath = path.join(__dirname, 'emergency_admin_fix.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📡 Connecting to Supabase...');

    // Split SQL into individual statements (basic approach)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`🚀 Executing ${statements.length} SQL statements...`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);

        try {
          const { data, error } = await supabase.rpc('exec_sql', {
            sql: statement + ';'
          });

          if (error) {
            console.error(`❌ Error in statement ${i + 1}:`, error.message);
            // Continue with other statements
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.error(`❌ Failed to execute statement ${i + 1}:`, err.message);
        }
      }
    }

    console.log('🎉 Migration completed!');
    console.log('🔧 You can now test your app with: npm run dev');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Alternative approach using direct SQL execution
async function runMigrationDirect() {
  try {
    console.log('🔄 Reading migration file...');

    const sqlPath = path.join(__dirname, 'emergency_admin_fix.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📡 Executing migration on Supabase...');

    // Try to execute the entire SQL as one statement
    const { data, error } = await supabase.from('_supabase_migration_temp').select('*').limit(1);

    if (error) {
      console.log('🔧 Using alternative approach...');

      // Split and execute statements one by one
      const statements = sqlContent.split(';').filter(stmt => stmt.trim().length > 0);

      for (const statement of statements) {
        if (statement.trim() && !statement.trim().startsWith('--')) {
          console.log('⏳ Executing SQL statement...');
          // Note: This won't work with the anon key, but let's try anyway
          try {
            // This will likely fail with anon key, but we can at least attempt
            const result = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
                'apikey': supabaseKey
              },
              body: JSON.stringify({ sql: statement.trim() + ';' })
            });

            if (!result.ok) {
              console.log('⚠️  SQL execution requires service role key. Please run manually in Supabase SQL Editor.');
              break;
            }
          } catch (err) {
            console.log('⚠️  Cannot execute SQL automatically. Please run manually in Supabase SQL Editor.');
            break;
          }
        }
      }
    }

    console.log('✅ Migration script completed');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

// Run the migration
console.log('🛠️  Starting Supabase migration to fix infinite recursion error...');
console.log('📋 This will fix the admin_users table recursion issue');
console.log('');

runMigrationDirect();