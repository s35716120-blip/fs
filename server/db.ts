import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from "@shared/schema";

// Use SQLite for local development
const sqlite = new Database('rosae.db');
export const db = drizzle(sqlite, { schema });

// Initialize database tables
export function initializeDatabase() {
  // SAFETY: do not drop tables in dev/prod; keep data. Only ensure schema.
  try {
    const info = sqlite.prepare(`PRAGMA table_info(expenses)`).all() as any[];
    const hasCreatorName = info.some((c) => c.name === 'creator_name');
    if (!hasCreatorName) {
      sqlite.exec(`ALTER TABLE expenses ADD COLUMN creator_name TEXT`);
    }
  } catch {}
  
  // Create tables with correct schema
  sqlite.exec(`
         CREATE TABLE IF NOT EXISTS users (
       id TEXT PRIMARY KEY,
       email TEXT UNIQUE NOT NULL,
       first_name TEXT,
       last_name TEXT,
       profile_image_url TEXT,
       password_hash TEXT,
       role TEXT DEFAULT 'user',
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
       updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
     );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      theatre_name TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      guests INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      phone_number TEXT,
      age INTEGER,
      total_amount REAL NOT NULL DEFAULT 0,
      cash_amount REAL NOT NULL DEFAULT 0,
      upi_amount REAL NOT NULL DEFAULT 0,
      snacks_amount REAL NOT NULL DEFAULT 0,
      snacks_cash REAL NOT NULL DEFAULT 0,
      snacks_upi REAL NOT NULL DEFAULT 0,
      booking_date TEXT NOT NULL,
      is_eighteen_plus INTEGER NOT NULL DEFAULT 1,
      eighteen_plus_reason TEXT,
      eighteen_plus_description TEXT,
      visited INTEGER NOT NULL DEFAULT 1,
      visited_reason TEXT,
      visited_description TEXT,
      repeat_count INTEGER NOT NULL DEFAULT 0,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      expense_date TEXT NOT NULL,
      creator_name TEXT,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS leave_applications (
      id TEXT PRIMARY KEY,
      employee_name TEXT NOT NULL,
      leave_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS customer_tickets (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      issue TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'open',
      priority TEXT DEFAULT 'medium',
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

         CREATE TABLE IF NOT EXISTS activity_logs (
       id TEXT PRIMARY KEY,
       user_id TEXT NOT NULL,
       action TEXT NOT NULL,
       resource_type TEXT NOT NULL,
       resource_id TEXT,
       details TEXT,
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (user_id) REFERENCES users(id)
     );

    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expire DATETIME NOT NULL
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      google_calendar_event_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      location TEXT,
      status TEXT DEFAULT 'confirmed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id)
    );

    CREATE TABLE IF NOT EXISTS sales_reports (
      id TEXT PRIMARY KEY,
      report_date TEXT NOT NULL,
      total_revenue REAL NOT NULL,
      food_sales REAL DEFAULT 0,
      screen_sales REAL DEFAULT 0,
      total_bookings INTEGER DEFAULT 0,
      total_guests INTEGER DEFAULT 0,
      avg_booking_value REAL DEFAULT 0,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS configurations (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_by TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ad_spends (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
         substr(hex(randomblob(2)),2) || '-' ||
         substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))),
      date TEXT NOT NULL,
      platform TEXT NOT NULL DEFAULT 'Meta Ads',
      campaign_name TEXT NOT NULL,
      ad_set_name TEXT,
      ad_name TEXT,
      ad_spend REAL NOT NULL DEFAULT 0,
      total_leads INTEGER NOT NULL DEFAULT 0,
      good_leads INTEGER NOT NULL DEFAULT 0,
      bad_leads INTEGER NOT NULL DEFAULT 0,
      sales_count INTEGER,
      revenue REAL,
      impressions INTEGER,
      clicks INTEGER,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS daily_income (
      id TEXT PRIMARY KEY DEFAULT (
        hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
        substr(hex(randomblob(2)),2) || '-' ||
        substr('89ab',abs(random()) % 4 + 1, 1) ||
        substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))
      ),
      date TEXT NOT NULL,
      number_of_shows INTEGER NOT NULL,
      cash_received REAL NOT NULL DEFAULT 0,
      upi_received REAL NOT NULL DEFAULT 0,
      other_payments REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);

  // Insert sample data for daily income if table is empty
  try {
    const count = sqlite.prepare(`SELECT COUNT(*) as count FROM daily_income`).get() as any;
    if (count.count === 0) {
      sqlite.exec(`
        INSERT INTO daily_income (
          date, number_of_shows, cash_received, upi_received, other_payments, notes
        ) VALUES 
        ('2025-08-30', 3, 5000, 3000, 2000, 'Weekend shows'),
        ('2025-08-31', 2, 4000, 2500, 0, 'Weekday low')
      `);
      console.log("Sample daily income data inserted");
    }
  } catch (error) {
    console.log("Note: Could not insert sample daily income data:", error);
  }
}