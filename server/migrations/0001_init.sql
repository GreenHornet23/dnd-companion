CREATE TABLE campaigns (
  id           TEXT PRIMARY KEY,
  key_hash     TEXT NOT NULL,
  meta         TEXT NOT NULL,
  meta_updated INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL
);

CREATE TABLE items (
  campaign_id TEXT NOT NULL,
  col         TEXT NOT NULL,
  id          TEXT NOT NULL,
  data        TEXT NOT NULL,
  updated_at  INTEGER NOT NULL,
  deleted     INTEGER NOT NULL DEFAULT 0,
  server_ts   INTEGER NOT NULL,
  PRIMARY KEY (campaign_id, col, id)
);
CREATE INDEX items_pull ON items (campaign_id, server_ts);

-- file (PDF, mappe, ritratti) caricati a parti
CREATE TABLE blob_parts (
  campaign_id TEXT NOT NULL,
  id          TEXT NOT NULL,
  n           INTEGER NOT NULL,
  size        INTEGER NOT NULL,
  PRIMARY KEY (campaign_id, id, n)
);

CREATE TABLE blob_meta (
  campaign_id TEXT NOT NULL,
  id          TEXT NOT NULL,
  parts       INTEGER NOT NULL,
  size        INTEGER NOT NULL,
  type        TEXT NOT NULL,
  PRIMARY KEY (campaign_id, id)
);
