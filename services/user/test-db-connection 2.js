/**
 * Test database connection for User Service
 */

const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://coinet_user:coinet_password@localhost:5432/coinet_ai_dev'
  });

  try {
    console.log('🔗 Testing database connection...');
    await client.connect();
    
    // Test query
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Database connection successful!');
    console.log('📊 Database info:', {
      currentTime: result.rows[0].current_time,
      version: result.rows[0].pg_version.split(' ')[0]
    });

    // Check if users table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    console.log('📋 Users table exists:', tableCheck.rows[0].exists);

    if (tableCheck.rows[0].exists) {
      const userCount = await client.query('SELECT COUNT(*) as count FROM users');
      console.log('👥 Users in database:', userCount.rows[0].count);
    }

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('💡 Try starting Postgres with: docker run -d -p 5432:5432 -e POSTGRES_DB=coinet_ai_dev -e POSTGRES_USER=coinet_user -e POSTGRES_PASSWORD=coinet_password postgres:15-alpine');
  } finally {
    await client.end();
  }
}

testConnection();
