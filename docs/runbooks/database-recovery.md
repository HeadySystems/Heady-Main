# Runbook: Database Recovery — pgvector Backup & Restore

> Heady™ Platform — PostgreSQL + pgvector Recovery Procedures
> Database: heady_vector (pgvector/pgvector:pg16)
> All services are concurrent equals — no priority during recovery.
> © 2024-2026 HeadySystems Inc. All Rights Reserved.

## Database Overview

The Heady™ platform uses PostgreSQL 16 with the pgvector extension for all persistent storage:

| Database | Purpose | Key Tables |
|----------|---------|------------|
| `heady_vector` | Primary application database | heady_vectors, heady_sessions, heady_analytics, heady_notifications, heady_migrations |
| `heady_drupal` | Drupal CMS content | Drupal core tables |

- **Connection**: `PGHOST=postgres PGPORT=5432 PGUSER=heady`
- **Docker volume**: `heady-pgdata` mounted at `/var/lib/postgresql/data`
- **Vector dimensions**: 384 (VECTOR_DIM) with HNSW indexes
- **Connection pooling**: PgBouncer with pool_size=34, max_conn=233 (Fibonacci)

---

## Backup Procedures

### Manual Full Backup

```bash
# Full database backup (both databases)
docker compose exec postgres pg_dumpall -U heady > backup_$(date +%Y%m%d_%H%M%S).sql

# Application database only
docker compose exec postgres pg_dump -U heady heady_vector > heady_vector_$(date +%Y%m%d_%H%M%S).sql

# Drupal database only
docker compose exec postgres pg_dump -U heady heady_drupal > heady_drupal_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup (recommended for large databases)
docker compose exec postgres pg_dump -U heady -Fc heady_vector > heady_vector_$(date +%Y%m%d_%H%M%S).dump
```

### Backup Specific Tables

```bash
# Backup vector data only
docker compose exec postgres pg_dump -U heady -t heady_vectors heady_vector > vectors_$(date +%Y%m%d_%H%M%S).sql

# Backup sessions
docker compose exec postgres pg_dump -U heady -t heady_sessions heady_vector > sessions_$(date +%Y%m%d_%H%M%S).sql

# Backup migrations history
docker compose exec postgres pg_dump -U heady -t heady_migrations heady_vector > migrations_$(date +%Y%m%d_%H%M%S).sql
```

### Automated Backup Script

```bash
#!/usr/bin/env bash
# Run this via cron: 0 */8 * * * /path/to/backup.sh (every 8 hours — Fibonacci)
BACKUP_DIR="/backups/heady-db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=13  # Fibonacci

mkdir -p "$BACKUP_DIR"

# Compressed custom format backup
docker compose exec -T postgres pg_dump -U heady -Fc heady_vector > "$BACKUP_DIR/heady_vector_$TIMESTAMP.dump"
docker compose exec -T postgres pg_dump -U heady -Fc heady_drupal > "$BACKUP_DIR/heady_drupal_$TIMESTAMP.dump"

# Clean old backups (keep last 13 days)
find "$BACKUP_DIR" -name "*.dump" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $TIMESTAMP"
```

---

## Restore Procedures

### Full Restore from Backup

```bash
# 1. Stop all services that depend on the database
docker compose stop  # Stop everything

# 2. Keep only PostgreSQL running
docker compose up -d postgres
sleep 8  # Fibonacci — wait for PostgreSQL to be ready
docker compose exec postgres pg_isready -U heady

# 3. Drop and recreate the database
docker compose exec postgres psql -U heady -c "DROP DATABASE IF EXISTS heady_vector;"
docker compose exec postgres psql -U heady -c "CREATE DATABASE heady_vector;"

# 4. Restore from SQL backup
cat backup_file.sql | docker compose exec -T postgres psql -U heady heady_vector

# 5. Or restore from compressed backup
cat backup_file.dump | docker compose exec -T postgres pg_restore -U heady -d heady_vector

# 6. Verify pgvector extension
docker compose exec postgres psql -U heady -d heady_vector -c "SELECT extversion FROM pg_extension WHERE extname = 'vector';"

# 7. Restart all services
docker compose up -d
sleep 21  # Fibonacci — wait for services to start

# 8. Verify all services are healthy
bash scripts/health-check-all.sh
```

### Restore Specific Tables

```bash
# Restore vectors table only
cat vectors_backup.sql | docker compose exec -T postgres psql -U heady heady_vector

# Verify HNSW index was restored
docker compose exec postgres psql -U heady -d heady_vector \
  -c "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'heady_vectors';"

# If HNSW index is missing, recreate it
docker compose exec postgres psql -U heady -d heady_vector \
  -c "CREATE INDEX IF NOT EXISTS heady_vectors_embedding_idx ON heady_vectors USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);"
```

---

## Disaster Recovery Scenarios

### Scenario 1: Corrupted Database Volume

```bash
# Symptoms: PostgreSQL won't start, crash loop, WAL corruption

# 1. Check PostgreSQL logs
docker compose logs postgres --tail=89

# 2. If volume is corrupted, last resort:
# WARNING: This destroys all data. Only use if backup exists.
docker compose down
docker volume rm heady-platform_heady-pgdata

# 3. Recreate from scratch
docker compose up -d postgres
sleep 8  # Fibonacci
docker compose exec postgres pg_isready -U heady

# 4. Restore from latest backup
cat latest_backup.dump | docker compose exec -T postgres pg_restore -U heady -d heady_vector --create

# 5. Run migrations to ensure schema is current
docker compose up -d migration-service
sleep 5  # Fibonacci
curl -s -X POST http://localhost:3403/migrate/up | jq .

# 6. Restart all services
docker compose up -d
```

### Scenario 2: Accidental Table Drop

```bash
# 1. Immediately stop all services to prevent further damage
docker compose stop

# 2. Keep PostgreSQL running
docker compose up -d postgres

# 3. Check what tables exist
docker compose exec postgres psql -U heady -d heady_vector \
  -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"

# 4. Restore the missing table from backup
# If you have a table-specific backup:
cat table_backup.sql | docker compose exec -T postgres psql -U heady heady_vector

# If you only have a full backup, extract the table:
docker compose exec -T postgres pg_restore -U heady -d heady_vector \
  -t <table_name> < full_backup.dump

# 5. Verify restoration
docker compose exec postgres psql -U heady -d heady_vector \
  -c "SELECT count(*) FROM <table_name>;"

# 6. Restart services
docker compose up -d
```

### Scenario 3: pgvector Extension Lost

```bash
# Symptoms: queries with vector operations fail, "type vector does not exist"

# 1. Check extension status
docker compose exec postgres psql -U heady -d heady_vector \
  -c "SELECT * FROM pg_extension WHERE extname = 'vector';"

# 2. Reinstall extension
docker compose exec postgres psql -U heady -d heady_vector \
  -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 3. Verify vector columns still exist
docker compose exec postgres psql -U heady -d heady_vector \
  -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'heady_vectors';"

# 4. Recreate HNSW index if needed
docker compose exec postgres psql -U heady -d heady_vector \
  -c "CREATE INDEX IF NOT EXISTS heady_vectors_embedding_idx ON heady_vectors USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);"

# 5. Run migrations to ensure schema integrity
curl -s -X POST http://localhost:3403/migrate/up | jq .
```

### Scenario 4: Connection Pool Exhaustion

```bash
# Symptoms: "too many connections", services timing out on DB operations

# 1. Check active connections
docker compose exec postgres psql -U heady \
  -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# 2. Check max connections
docker compose exec postgres psql -U heady \
  -c "SHOW max_connections;"

# 3. Kill idle connections (be careful with active ones)
docker compose exec postgres psql -U heady \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < now() - interval '89 seconds';"

# 4. If PgBouncer is configured, check its stats
# pool_mode = transaction, default_pool_size = 34, max_client_conn = 233

# 5. Restart services to reset connection pools
docker compose restart
```

---

## Maintenance Operations

### Vacuum and Analyze

```bash
# Full vacuum (reclaim disk space — resource intensive)
docker compose exec postgres psql -U heady -d heady_vector \
  -c "VACUUM FULL ANALYZE heady_vectors;"

# Regular vacuum (less intensive)
docker compose exec postgres psql -U heady -d heady_vector \
  -c "VACUUM ANALYZE;"

# Check table bloat
docker compose exec postgres psql -U heady -d heady_vector \
  -c "SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 10;"
```

### HNSW Index Maintenance

```bash
# Check index size
docker compose exec postgres psql -U heady -d heady_vector \
  -c "SELECT pg_size_pretty(pg_relation_size('heady_vectors_embedding_idx'));"

# Reindex (if index performance degrades)
docker compose exec postgres psql -U heady -d heady_vector \
  -c "REINDEX INDEX heady_vectors_embedding_idx;"

# Check index usage stats
docker compose exec postgres psql -U heady -d heady_vector \
  -c "SELECT indexrelname, idx_scan, idx_tup_read, idx_tup_fetch FROM pg_stat_user_indexes WHERE indexrelname LIKE '%heady%';"
```

---

## Escalation Path

1. **On-call engineer**: Follow backup/restore procedures above
2. **Database team**: For complex recovery scenarios, schema migrations, or performance tuning
3. **Platform team**: If database issues affect > 50% of services
4. **Eric Haywood (founder)**: If data loss occurred or security breach suspected

---

## Known Issues

1. **Docker volume persistence**: If Docker is uninstalled or volumes are pruned, all data is lost
2. **HNSW memory usage**: Large vector indexes require significant RAM — monitor PostgreSQL memory
3. **pgvector version compatibility**: Ensure pgvector extension version matches between backup and restore environments
4. **Long-running VACUUM FULL**: Can lock tables for extended periods — schedule during maintenance windows
