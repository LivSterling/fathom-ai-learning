#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables or use defaults
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hllgukmhltfadzwzjbjm.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.log('Please set it in your .env.local file or pass it as an environment variable');
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runSQL(sql, description) {
  console.log(`\n🔧 ${description}...`);
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      console.error('❌ Error:', error.message);
      return false;
    }
    console.log('✅ Success');
    return true;
  } catch (err) {
    console.error('❌ Error:', err.message);
    return false;
  }
}

async function setupDatabase() {
  console.log('🚀 Setting up Fathom AI Learning Platform database...');
  
  // Read SQL files
  const setupSQL = fs.readFileSync(path.join(__dirname, 'setup-supabase.sql'), 'utf8');
  const rlsSQL = fs.readFileSync(path.join(__dirname, 'setup-rls-policies.sql'), 'utf8');
  
  // Execute main setup
  const setupSuccess = await runSQL(setupSQL, 'Creating tables and functions');
  if (!setupSuccess) {
    console.error('Failed to create tables. Exiting.');
    process.exit(1);
  }
  
  // Execute RLS policies
  const rlsSuccess = await runSQL(rlsSQL, 'Setting up Row Level Security policies');
  if (!rlsSuccess) {
    console.error('Failed to set up RLS policies. Exiting.');
    process.exit(1);
  }
  
  console.log('\n🎉 Database setup complete!');
  console.log('You can now use the guest mode features in your application.');
}

// Run the setup
setupDatabase().catch(console.error);
