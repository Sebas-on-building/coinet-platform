-- Alchemy Whales Database Schema
-- PostgreSQL 14+

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE chain_type AS ENUM (
  'ethereum',
  'polygon',
  'arbitrum',
  'optimism',
  'base'
);

CREATE TYPE transfer_category_type AS ENUM (
  'external',
  'internal',
  'erc20',
  'erc721',
  'erc1155',
  'specialnft'
);

CREATE TYPE transfer_direction_type AS ENUM (
  'incoming',
  'outgoing'
);

CREATE TYPE whale_tier_type AS ENUM (
  'whale',
  'large_whale',
  'mega_whale'
);

CREATE TYPE entity_type AS ENUM (
  'eoa',
  'contract',
  'exchange',
  'whale',
  'defi_protocol',
  'bridge',
  'unknown'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- Transfers table - stores all whale transfers
CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chain chain_type NOT NULL,
  block_number BIGINT NOT NULL,
  block_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  transaction_hash VARCHAR(66) NOT NULL,
  from_address VARCHAR(42) NOT NULL,
  to_address VARCHAR(42),
  value NUMERIC(78, 0) NOT NULL, -- Support up to 2^256
  value_usd NUMERIC(20, 2) NOT NULL,
  category transfer_category_type NOT NULL,
  direction transfer_direction_type NOT NULL,
  
  -- Asset information
  asset_address VARCHAR(42),
  asset_symbol VARCHAR(20),
  asset_decimals INTEGER,
  asset_name VARCHAR(255),
  
  -- NFT specific
  token_id VARCHAR(78), -- Support large token IDs
  
  -- Whale classification
  whale_tier whale_tier_type,
  
  -- Entity labels
  from_entity_id UUID,
  to_entity_id UUID,
  
  -- Metadata
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_transfer UNIQUE (chain, transaction_hash, from_address, to_address, value)
);

-- Entity labels table - stores address classifications
CREATE TABLE IF NOT EXISTS entity_labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address VARCHAR(42) NOT NULL,
  chain chain_type NOT NULL,
  name VARCHAR(255),
  type entity_type NOT NULL,
  labels TEXT[], -- Array of string labels
  
  -- Metadata
  source VARCHAR(50), -- 'arkham', 'nansen', 'internal'
  confidence NUMERIC(3, 2), -- 0.00 to 1.00
  is_contract BOOLEAN DEFAULT FALSE,
  contract_name VARCHAR(255),
  is_exchange BOOLEAN DEFAULT FALSE,
  exchange_name VARCHAR(100),
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_entity_label UNIQUE (address, chain)
);

-- Whale profiles table - aggregated whale statistics
CREATE TABLE IF NOT EXISTS whale_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address VARCHAR(42) NOT NULL,
  chain chain_type NOT NULL,
  
  -- Statistics
  total_transfers INTEGER DEFAULT 0,
  total_value_usd NUMERIC(20, 2) DEFAULT 0,
  largest_transfer_usd NUMERIC(20, 2) DEFAULT 0,
  average_transfer_usd NUMERIC(20, 2) DEFAULT 0,
  
  -- Activity
  first_seen_at TIMESTAMP WITH TIME ZONE,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  
  -- Classification
  tier whale_tier_type NOT NULL,
  behavior_score INTEGER DEFAULT 0 CHECK (behavior_score BETWEEN 0 AND 100),
  risk_score INTEGER DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  
  -- Labels
  entity_label_id UUID,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_whale_profile UNIQUE (address, chain),
  CONSTRAINT fk_whale_entity_label FOREIGN KEY (entity_label_id) REFERENCES entity_labels(id) ON DELETE SET NULL
);

-- Whale alerts table - webhook subscription configurations
CREATE TABLE IF NOT EXISTS whale_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  chains chain_type[] NOT NULL,
  min_value_usd NUMERIC(20, 2) NOT NULL,
  categories transfer_category_type[] NOT NULL,
  
  -- Webhook configuration
  webhook_url TEXT NOT NULL,
  webhook_secret VARCHAR(255) NOT NULL,
  
  -- Filters
  exclude_addresses VARCHAR(42)[],
  include_addresses VARCHAR(42)[],
  exclude_contracts BOOLEAN DEFAULT FALSE,
  
  -- Status
  enabled BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alert deliveries table - webhook delivery tracking
CREATE TABLE IF NOT EXISTS alert_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id UUID NOT NULL,
  transfer_id UUID NOT NULL,
  
  -- Delivery status
  status VARCHAR(20) NOT NULL, -- 'pending', 'delivered', 'failed'
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  
  -- Response
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fk_alert FOREIGN KEY (alert_id) REFERENCES whale_alerts(id) ON DELETE CASCADE,
  CONSTRAINT fk_transfer FOREIGN KEY (transfer_id) REFERENCES transfers(id) ON DELETE CASCADE
);

-- Token metadata cache table
CREATE TABLE IF NOT EXISTS token_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chain chain_type NOT NULL,
  contract_address VARCHAR(42) NOT NULL,
  symbol VARCHAR(20),
  name VARCHAR(255),
  decimals INTEGER,
  total_supply NUMERIC(78, 0),
  
  -- Metadata
  metadata JSONB,
  
  -- Cache control
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT unique_token UNIQUE (chain, contract_address)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Transfers indexes
CREATE INDEX idx_transfers_chain ON transfers(chain);
CREATE INDEX idx_transfers_block_number ON transfers(chain, block_number DESC);
CREATE INDEX idx_transfers_block_timestamp ON transfers(block_timestamp DESC);
CREATE INDEX idx_transfers_transaction_hash ON transfers(transaction_hash);
CREATE INDEX idx_transfers_from_address ON transfers(from_address);
CREATE INDEX idx_transfers_to_address ON transfers(to_address);
CREATE INDEX idx_transfers_value_usd ON transfers(value_usd DESC);
CREATE INDEX idx_transfers_whale_tier ON transfers(whale_tier);
CREATE INDEX idx_transfers_category ON transfers(category);
CREATE INDEX idx_transfers_asset_address ON transfers(asset_address);
CREATE INDEX idx_transfers_metadata ON transfers USING gin(metadata);

-- Composite indexes for common queries
CREATE INDEX idx_transfers_chain_timestamp ON transfers(chain, block_timestamp DESC);
CREATE INDEX idx_transfers_from_timestamp ON transfers(from_address, block_timestamp DESC);
CREATE INDEX idx_transfers_to_timestamp ON transfers(to_address, block_timestamp DESC);
CREATE INDEX idx_transfers_whale_timestamp ON transfers(whale_tier, block_timestamp DESC) WHERE whale_tier IS NOT NULL;

-- Entity labels indexes
CREATE INDEX idx_entity_labels_address ON entity_labels(address);
CREATE INDEX idx_entity_labels_chain ON entity_labels(chain);
CREATE INDEX idx_entity_labels_type ON entity_labels(type);
CREATE INDEX idx_entity_labels_labels ON entity_labels USING gin(labels);
CREATE INDEX idx_entity_labels_name ON entity_labels USING gin(name gin_trgm_ops);

-- Whale profiles indexes
CREATE INDEX idx_whale_profiles_address ON whale_profiles(address);
CREATE INDEX idx_whale_profiles_chain ON whale_profiles(chain);
CREATE INDEX idx_whale_profiles_tier ON whale_profiles(tier);
CREATE INDEX idx_whale_profiles_total_value ON whale_profiles(total_value_usd DESC);
CREATE INDEX idx_whale_profiles_last_seen ON whale_profiles(last_seen_at DESC);

-- Alert deliveries indexes
CREATE INDEX idx_alert_deliveries_alert_id ON alert_deliveries(alert_id);
CREATE INDEX idx_alert_deliveries_transfer_id ON alert_deliveries(transfer_id);
CREATE INDEX idx_alert_deliveries_status ON alert_deliveries(status);
CREATE INDEX idx_alert_deliveries_created_at ON alert_deliveries(created_at DESC);

-- Token metadata indexes
CREATE INDEX idx_token_metadata_chain_address ON token_metadata(chain, contract_address);
CREATE INDEX idx_token_metadata_symbol ON token_metadata(symbol);
CREATE INDEX idx_token_metadata_expires_at ON token_metadata(expires_at);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_transfers_updated_at BEFORE UPDATE ON transfers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entity_labels_updated_at BEFORE UPDATE ON entity_labels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whale_profiles_updated_at BEFORE UPDATE ON whale_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whale_alerts_updated_at BEFORE UPDATE ON whale_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update whale profile on new transfer
CREATE OR REPLACE FUNCTION update_whale_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if it's a whale transfer
  IF NEW.whale_tier IS NOT NULL THEN
    -- Update or insert whale profile
    INSERT INTO whale_profiles (
      address,
      chain,
      total_transfers,
      total_value_usd,
      largest_transfer_usd,
      average_transfer_usd,
      first_seen_at,
      last_seen_at,
      tier
    )
    VALUES (
      NEW.from_address,
      NEW.chain,
      1,
      NEW.value_usd,
      NEW.value_usd,
      NEW.value_usd,
      NEW.block_timestamp,
      NEW.block_timestamp,
      NEW.whale_tier
    )
    ON CONFLICT (address, chain) DO UPDATE SET
      total_transfers = whale_profiles.total_transfers + 1,
      total_value_usd = whale_profiles.total_value_usd + NEW.value_usd,
      largest_transfer_usd = GREATEST(whale_profiles.largest_transfer_usd, NEW.value_usd),
      average_transfer_usd = (whale_profiles.total_value_usd + NEW.value_usd) / (whale_profiles.total_transfers + 1),
      last_seen_at = NEW.block_timestamp,
      tier = CASE
        WHEN NEW.value_usd > 10000000 THEN 'mega_whale'::whale_tier_type
        WHEN NEW.value_usd > 1000000 THEN 'large_whale'::whale_tier_type
        ELSE 'whale'::whale_tier_type
      END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update whale profile
CREATE TRIGGER trigger_update_whale_profile
AFTER INSERT ON transfers
FOR EACH ROW EXECUTE FUNCTION update_whale_profile();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for recent whale activity
CREATE OR REPLACE VIEW recent_whale_activity AS
SELECT
  t.id,
  t.chain,
  t.block_timestamp,
  t.transaction_hash,
  t.from_address,
  t.to_address,
  t.value_usd,
  t.whale_tier,
  t.category,
  fel.name AS from_name,
  fel.type AS from_type,
  tel.name AS to_name,
  tel.type AS to_type
FROM transfers t
LEFT JOIN entity_labels fel ON t.from_address = fel.address AND t.chain = fel.chain
LEFT JOIN entity_labels tel ON t.to_address = tel.address AND t.chain = tel.chain
WHERE t.whale_tier IS NOT NULL
ORDER BY t.block_timestamp DESC;

-- View for whale leaderboard
CREATE OR REPLACE VIEW whale_leaderboard AS
SELECT
  wp.address,
  wp.chain,
  wp.total_value_usd,
  wp.total_transfers,
  wp.largest_transfer_usd,
  wp.tier,
  wp.last_seen_at,
  el.name,
  el.type
FROM whale_profiles wp
LEFT JOIN entity_labels el ON wp.address = el.address AND wp.chain = el.chain
ORDER BY wp.total_value_usd DESC;

-- ============================================================================
-- GRANTS (adjust as needed for your user)
-- ============================================================================

-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- ============================================================================
-- SAMPLE QUERIES
-- ============================================================================

-- Get recent whale transfers
-- SELECT * FROM recent_whale_activity LIMIT 100;

-- Get top whales by total value
-- SELECT * FROM whale_leaderboard LIMIT 50;

-- Get transfers for specific address
-- SELECT * FROM transfers WHERE from_address = '0x...' ORDER BY block_timestamp DESC;

-- Get whale transfers in last 24 hours
-- SELECT * FROM transfers 
-- WHERE whale_tier IS NOT NULL 
--   AND block_timestamp > NOW() - INTERVAL '24 hours'
-- ORDER BY value_usd DESC;

-- Get exchange flow analysis
-- SELECT 
--   el.name AS exchange,
--   SUM(CASE WHEN t.direction = 'incoming' THEN t.value_usd ELSE 0 END) AS inflow,
--   SUM(CASE WHEN t.direction = 'outgoing' THEN t.value_usd ELSE 0 END) AS outflow,
--   COUNT(*) AS transfer_count
-- FROM transfers t
-- JOIN entity_labels el ON t.to_address = el.address AND t.chain = el.chain
-- WHERE el.is_exchange = TRUE
--   AND t.block_timestamp > NOW() - INTERVAL '24 hours'
-- GROUP BY el.name
-- ORDER BY inflow DESC;

