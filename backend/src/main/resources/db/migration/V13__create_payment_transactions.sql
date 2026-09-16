-- ===================================================================
-- MediAssist-AI Flyway Migration: V13__create_payment_transactions.sql
-- Financial Ledger & Pluggable Multi-Gateway Payment Transactions
-- ===================================================================

CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_code VARCHAR(64) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_type VARCHAR(40) NOT NULL,
    reference_id VARCHAR(100),
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'VND',
    payment_method VARCHAR(40) NOT NULL,
    payment_gateway VARCHAR(40) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED')),
    gateway_reference VARCHAR(255),
    metadata_json TEXT,
    created_at TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

-- Performance & Audit Query Indexes
CREATE INDEX IF NOT EXISTS idx_payment_tx_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_code ON payment_transactions(transaction_code);
CREATE INDEX IF NOT EXISTS idx_payment_tx_gateway_ref ON payment_transactions(gateway_reference);
CREATE INDEX IF NOT EXISTS idx_payment_tx_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_tx_created_at ON payment_transactions(created_at DESC);
