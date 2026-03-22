// HEADY_BRAND:BEGIN
// FILE: src/hc_memory_bridge.js
// LAYER: backend/src
// HEADY_BRAND:END

/**
 * HeadyMemoryBridge
 * Natively connects Node.js to the persistent Python HeadyMemory SQLite database.
 * Enables zero-latency, cross-environment data synchronization for the unified Phi-Architecture.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

class HeadyMemoryBridge {
  constructor() {
    const rootPath = path.join(__dirname, '..');
    const dbDir = path.join(rootPath, '.heady');
    
    // Ensure .heady directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    const dbPath = path.join(dbDir, 'memory.db');
    this.db = new Database(dbPath, { 
      // verbose: console.log 
    });
    
    // Ensure tables exist matching Python schema if Node boots first
    this._initDatabase();
  }

  _initDatabase() {
    // Match HeadyMemory.py schema precisely
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        source TEXT NOT NULL,
        relevance_score REAL DEFAULT 1.0,
        access_count INTEGER DEFAULT 0,
        last_accessed TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Indexes
    this.db.exec("CREATE INDEX IF NOT EXISTS idx_category ON memories(category)");
    this.db.exec("CREATE INDEX IF NOT EXISTS idx_timestamp ON memories(timestamp)");
    this.db.exec("CREATE INDEX IF NOT EXISTS idx_source ON memories(source)");
    this.db.exec("CREATE INDEX IF NOT EXISTS idx_relevance ON memories(relevance_score)");

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS external_sources (
        id TEXT PRIMARY KEY,
        source_type TEXT NOT NULL,
        source_url TEXT,
        content TEXT NOT NULL,
        comparative_analysis TEXT,
        integrated_at TEXT NOT NULL,
        relevance_score REAL DEFAULT 1.0
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        category TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  storeMemory(category, content, tags = [], source = "node-system", relevance_score = 1.0) {
    const contentStr = JSON.stringify(content);
    // Mimic Python hashlib.sha256(f"{category}:{content_str}").hexdigest()[:16]
    const hashInput = `${category}:${contentStr}`;
    const memId = crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16);
    const timestamp = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO memories 
      (id, category, content, tags, timestamp, source, relevance_score, access_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `);

    stmt.run(memId, category, contentStr, JSON.stringify(tags), timestamp, source, relevance_score);
    return memId;
  }

  recallMemory(memId) {
    const stmt = this.db.prepare("SELECT * FROM memories WHERE id = ?");
    const row = stmt.get(memId);
    
    if (row) {
      // Update access count metrics
      const updateStmt = this.db.prepare(`
        UPDATE memories 
        SET access_count = access_count + 1, last_accessed = ?
        WHERE id = ?
      `);
      updateStmt.run(new Date().toISOString(), memId);

      return {
        id: row.id,
        category: row.category,
        content: JSON.parse(row.content),
        tags: JSON.parse(row.tags),
        timestamp: row.timestamp,
        source: row.source,
        relevance_score: row.relevance_score,
        access_count: row.access_count + 1,
        last_accessed: new Date().toISOString()
      };
    }
    return null;
  }

  queryMemories(category = null, limit = 50) {
    let stmt;
    if (category) {
      stmt = this.db.prepare("SELECT * FROM memories WHERE category = ? ORDER BY relevance_score DESC, timestamp DESC LIMIT ?");
      return stmt.all(category, limit).map(row => ({
        ...row,
        content: JSON.parse(row.content),
        tags: JSON.parse(row.tags)
      }));
    } else {
      stmt = this.db.prepare("SELECT * FROM memories ORDER BY relevance_score DESC, timestamp DESC LIMIT ?");
      return stmt.all(limit).map(row => ({
        ...row,
        content: JSON.parse(row.content),
        tags: JSON.parse(row.tags)
      }));
    }
  }

  getPreference(key, defaultValue = null) {
    const stmt = this.db.prepare("SELECT value FROM user_preferences WHERE key = ?");
    const row = stmt.get(key);
    if (row) {
      return JSON.parse(row.value);
    }
    return defaultValue;
  }

  setPreference(key, value, category = "general") {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_preferences (key, value, category, updated_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(key, JSON.stringify(value), category, new Date().toISOString());
  }

  close() {
    this.db.close();
  }
}

module.exports = HeadyMemoryBridge;
