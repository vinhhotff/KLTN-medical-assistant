#!/usr/bin/env bash
# ====================================================================
# MediAssist-AI: Automated High-Performance Vector Scaling Runner
# Target: 16GB RAM / 512GB SSD Environments
# Usage:
#   chmod +x pgvector_scaling_16gb/run_scaled_pipeline.sh
#   ./pgvector_scaling_16gb/run_scaled_pipeline.sh [SAMPLES]
# Examples:
#   ./pgvector_scaling_16gb/run_scaled_pipeline.sh 1000
#   ./pgvector_scaling_16gb/run_scaled_pipeline.sh 5000
# ====================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SAMPLES=${1:-5000}
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${BLUE}====================================================================${NC}"
echo -e "${BLUE}🏥 MediAssist-AI: High-Performance Vector Scaling Runner (16GB RAM)${NC}"
echo -e "${BLUE}====================================================================${NC}"
echo -e "Target clinical sample size: ${YELLOW}${SAMPLES} cases${NC}"
echo -e "Project root: ${PROJECT_ROOT}"

# 1. Check PostgreSQL (port 5433)
echo -e "\n${BLUE}[1/5] Checking PostgreSQL pgvector connection (port 5433)...${NC}"
if ! nc -z localhost 5433 2>/dev/null; then
    echo -e "${YELLOW}⚠️ PostgreSQL is not listening on port 5433.${NC}"
    echo -e "Starting optimized container with: ${GREEN}docker compose -f pgvector_scaling_16gb/docker-compose.16gb.yml up -d postgres redis${NC}..."
    docker compose -f "${PROJECT_ROOT}/pgvector_scaling_16gb/docker-compose.16gb.yml" up -d postgres redis
    echo "Waiting 5 seconds for PostgreSQL to be ready..."
    sleep 5
else
    echo -e "${GREEN}✅ PostgreSQL is active and ready on port 5433.${NC}"
fi

# 2. Check Python Dependencies
echo -e "\n${BLUE}[2/5] Checking Python environment and requirements...${NC}"
python3 -c "import psycopg2, requests" 2>/dev/null || {
    echo -e "${YELLOW}Installing required Python packages (psycopg2-binary, requests)...${NC}"
    pip install psycopg2-binary requests || pip3 install psycopg2-binary requests
}
echo -e "${GREEN}✅ Python dependencies are ready.${NC}"

# 3. Apply Ultra-Precision HNSW Index Tuning
echo -e "\n${BLUE}[3/5] Applying Ultra-Precision HNSW Index (m=32, ef_construction=256)...${NC}"
docker exec -i mediassist_postgres psql -U postgres -d mediassist_db -c "
    DROP INDEX IF EXISTS idx_doctor_bio_hnsw_verified;
    CREATE INDEX idx_doctor_bio_hnsw_verified ON doctor_profiles
    USING hnsw (bio_embedding vector_cosine_ops)
    WITH (m = 32, ef_construction = 256)
    WHERE is_verified = TRUE AND bio_embedding IS NOT NULL;
    ALTER DATABASE mediassist_db SET hnsw.ef_search = 200;
" 2>/dev/null || echo -e "${YELLOW}Note: Index will be tuned when doctors table is initialized.${NC}"

# 4. Run the Full Scaled Meddies Pipeline
echo -e "\n${BLUE}[4/5] Executing Meddies Vector Pipeline (--samples ${SAMPLES} --full)...${NC}"
cd "${PROJECT_ROOT}"
python3 scripts/run_meddies_pipeline.py --samples "${SAMPLES}" --full

# 5. Success Summary
echo -e "\n${GREEN}====================================================================${NC}"
echo -e "${GREEN}🎉 SCALED VECTOR TRAINING & BENCHMARK COMPLETED SUCCESSFULLY!${NC}"
echo -e "${GREEN}====================================================================${NC}"
echo -e "1. Database updated: ${YELLOW}PostgreSQL doctor_profiles.bio_embedding (1536-d vectors)${NC}"
echo -e "2. Evaluation report: ${YELLOW}docs/VECTOR_BENCHMARK_REPORT.md${NC}"
echo -e "3. Defense Cheat Sheet: ${YELLOW}pgvector_scaling_16gb/CAPSTONE_DEFENSE_CHEAT_SHEET.md${NC}"
echo -e "4. Data artifacts: ${YELLOW}data/meddies/benchmark_results.json${NC}"
