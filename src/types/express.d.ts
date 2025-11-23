import 'express';
import { Knex } from 'knex';

// User type can be extended as needed
interface CoinetUser {
  id: string;
  username?: string;
  email?: string;
  role?: string;
  permissions?: string[];
}

declare module 'express-serve-static-core' {
  interface Request {
    db: Knex;
    user?: CoinetUser;
  }
} 