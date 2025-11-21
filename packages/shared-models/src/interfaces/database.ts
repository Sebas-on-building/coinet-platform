export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  maxConnections?: number;
}

export interface QueryResult<T = unknown> {
  rows: T[];
  rowCount: number;
  fields: string[];
}

export interface DatabaseConnection {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  transaction<T>(callback: (trx: DatabaseConnection) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export interface Migration {
  version: string;
  name: string;
  up: string;
  down: string;
  timestamp: Date;
} 