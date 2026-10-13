import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SCHEMA_SQL = `
-- Trading Journal Database Schema for Supabase
CREATE TABLE IF NOT EXISTS public.accounts (
  id text PRIMARY KEY,
  "userId" text NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  "propType" text,
  phase integer,
  "maxDrawdown" numeric,
  "dailyDrawdown" numeric,
  "profitTarget" numeric,
  "drawdownType" text,
  "drawdownValue" numeric,
  "liveTargetAmount" numeric,
  "initialBalance" numeric NOT NULL,
  "currentBalance" numeric NOT NULL,
  currency text DEFAULT 'USD',
  status text DEFAULT 'active',
  "createdAt" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trades (
  id text PRIMARY KEY,
  "accountId" text NOT NULL,
  "userId" text,
  pair text NOT NULL,
  type text NOT NULL,
  "entryPrice" numeric NOT NULL,
  "stopLoss" numeric NOT NULL,
  "takeProfit" numeric,
  "lotSize" numeric DEFAULT 0,
  "riskAmount" numeric DEFAULT 0,
  "exitPrice" numeric,
  "profitLoss" numeric,
  "additionalLoss" numeric,
  status text DEFAULT 'open',
  "imageUrl" text,
  "afterImageUrl" text,
  notes text,
  "analysisBy" text,
  "createdAt" timestamp with time zone DEFAULT now(),
  "closedAt" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.withdrawals (
  id text PRIMARY KEY,
  "accountId" text NOT NULL,
  "userId" text,
  amount numeric NOT NULL,
  notes text,
  "createdAt" timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Permissive policies for application usage
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'accounts' AND policyname = 'Accounts public access') THEN
    CREATE POLICY "Accounts public access" ON public.accounts FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trades' AND policyname = 'Trades public access') THEN
    CREATE POLICY "Trades public access" ON public.trades FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'withdrawals' AND policyname = 'Withdrawals public access') THEN
    CREATE POLICY "Withdrawals public access" ON public.withdrawals FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
`;

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = Number(process.env.PORT) || 3000;

  // Supabase client for health and query checks
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const isConfigured = Boolean(
    supabaseUrl &&
    supabaseKey &&
    supabaseKey !== 'your-anon-key' &&
    !supabaseKey.includes('X-X-X-X') &&
    supabaseKey.length > 20
  );
  const supabase = isConfigured ? createClient(supabaseUrl!, supabaseKey!) : null;

  // Auto-run schema migration if DATABASE_URL or POSTGRES_URL is provided in environment
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;
  if (dbUrl) {
    try {
      const client = new pg.Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
      });
      await client.connect();
      await client.query(SCHEMA_SQL);
      await client.end();
      console.log('✅ Supabase database schema initialized successfully via direct database connection.');
    } catch (err: any) {
      console.warn('Notice: Auto-migration via DATABASE_URL skipped or failed:', err.message);
    }
  }

  // API Health Check Endpoint (returns 200 so deployment health checks succeed)
  app.get("/api/health", async (req, res) => {
    const status: any = {
      status: "ok",
      timestamp: new Date().toISOString(),
      database: isConfigured ? "configured" : "not_configured"
    };

    if (supabase) {
      try {
        const { error } = await supabase.from('accounts').select('id').limit(1);
        if (error) {
          const msg = (error.message || '').toLowerCase();
          if (error.code === '42P01' || msg.includes('does not exist') || msg.includes('schema cache') || msg.includes('could not find the table')) {
            status.database = "tables_not_created";
            status.notice = "Supabase connected but tables (accounts, trades) need initialization.";
          } else {
            status.database = "error";
            status.error = error.message;
          }
        } else {
          status.database = "ready";
        }
      } catch (err: any) {
        status.database = "error";
        status.error = err.message;
      }
    }

    res.json(status);
  });

  // Get raw SQL schema endpoint
  app.get("/api/schema-sql", (req, res) => {
    res.type('text/plain').send(SCHEMA_SQL);
  });

  // Endpoint to run auto-schema migration
  app.post("/api/init-db", async (req, res) => {
    const connectionString = req.body?.connectionString || dbUrl;
    if (!connectionString) {
      return res.status(400).json({ 
        success: false, 
        message: "No PostgreSQL connection string provided. You can paste your connection string or run the SQL in Supabase SQL Editor.",
        sql: SCHEMA_SQL 
      });
    }

    try {
      const client = new pg.Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
      });
      await client.connect();
      await client.query(SCHEMA_SQL);
      await client.end();
      return res.json({ success: true, message: "Database tables created successfully!" });
    } catch (err: any) {
      console.error("Init DB failed:", err);
      return res.status(500).json({ 
        success: false, 
        error: err.message, 
        message: "Could not connect to database directly. Please run the SQL in Supabase SQL editor.",
        sql: SCHEMA_SQL 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/api/health`);
  });
}

startServer();
