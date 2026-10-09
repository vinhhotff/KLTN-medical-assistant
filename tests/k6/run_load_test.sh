#!/bin/bash
# ==============================================================================
# MediAssist-AI High-Load & Benchmark Automation Runner (Milestone 7)
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_URL="${BASE_URL:-http://localhost:5001}"
RESULTS_DIR="${SCRIPT_DIR}/results"

mkdir -p "${RESULTS_DIR}"

echo "================================================================================"
echo " 🏥 MediAssist-AI Telehealth Platform: High-Load & Performance Suite"
echo " Target Endpoint: ${BASE_URL}"
echo "================================================================================"

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo "⚠️  k6 is not found in PATH."
    echo "💡 Install k6 using: 'brew install k6' (macOS) or 'sudo apt install k6' (Linux)"
    echo "📄 The test scripts are ready at: ${SCRIPT_DIR}/"
    exit 0
fi

MODE="${1:-smoke}"

case "$MODE" in
    "smoke")
        echo "🚀 Running Smoke Test (10 VUs, 30s)..."
        k6 run --env BASE_URL="${BASE_URL}" \
               --summary-export="${RESULTS_DIR}/smoke_summary.json" \
               "${SCRIPT_DIR}/smoke_test.js"
        ;;
    "load")
        echo "🔥 Running 500+ VU High-Load Stress Test (Ramping 50 -> 500 -> 700 VUs)..."
        k6 run --env BASE_URL="${BASE_URL}" \
               --summary-export="${RESULTS_DIR}/high_load_summary.json" \
               "${SCRIPT_DIR}/high_load_test.js"
        ;;
    "benchmark")
        echo "⚡ Running Two-Layer Cache (L1 Caffeine + L2 Redis) Benchmark..."
        k6 run --env BASE_URL="${BASE_URL}" \
               --summary-export="${RESULTS_DIR}/cache_benchmark_summary.json" \
               "${SCRIPT_DIR}/cache_benchmark.js"
        ;;
    "all")
        echo "📊 Running Complete Performance & Load Verification Suite..."
        echo "Step 1/3: Smoke Test"
        k6 run --env BASE_URL="${BASE_URL}" "${SCRIPT_DIR}/smoke_test.js"
        echo "Step 2/3: Cache Benchmark"
        k6 run --env BASE_URL="${BASE_URL}" "${SCRIPT_DIR}/cache_benchmark.js"
        echo "Step 3/3: 500+ VU High-Load Test"
        k6 run --env BASE_URL="${BASE_URL}" "${SCRIPT_DIR}/high_load_test.js"
        ;;
    *)
        echo "❌ Unknown mode: $MODE"
        echo "Usage: $0 [smoke|load|benchmark|all]"
        exit 1
        ;;
esac

echo "================================================================================"
echo "✅ Test execution finished. Results saved in ${RESULTS_DIR}/"
echo "================================================================================"
