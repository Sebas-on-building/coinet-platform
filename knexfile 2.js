module.exports = {
  client: 'pg',
  connection: process.env.PG_URL || {
    host: 'localhost',
    user: 'postgres',
    password: 'password',
    database: 'coinet'
  }
}; 