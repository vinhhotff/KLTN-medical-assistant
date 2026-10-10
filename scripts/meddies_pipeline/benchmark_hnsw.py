"""
pgvector HNSW Vector Search Clinical Retrieval Benchmark.
Evaluates Top-1 Accuracy, Recall@3, Recall@5, MRR, and Query Latency (ms)
on PostgreSQL 16 (port 5433) using the Meddies Vietnamese Patient Persona benchmark.
"""

import argparse
import json
import os
import sys
import time
from typing import Any, Dict, List, Optional
import psycopg2
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from scripts.meddies_pipeline.vector_engine import VectorEmbeddingEngine

sys.stdout.reconfigure(encoding="utf-8")


class HNSWClinicalBenchmark:
    def __init__(
        self,
        db_host: str = "localhost",
        db_port: int = 5433,
        db_name: str = "mediassist_db",
        db_user: str = "postgres",
        db_pass: str = "postgres_secure_2026",
        ef_search: int = 100
    ):
        self.db_config = {
            "host": db_host,
            "port": db_port,
            "dbname": db_name,
            "user": db_user,
            "password": db_pass
        }
        self.ef_search = ef_search
        self.vector_engine = VectorEmbeddingEngine()

    def get_connection(self):
        return psycopg2.connect(**self.db_config)

    def run_benchmark(
        self,
        benchmark_file: str = "data/meddies/persona_benchmark_vietnamese.json",
        limit_queries: Optional[int] = None
    ) -> Dict[str, Any]:
        """Runs evaluation over the benchmark persona queries."""
        if not os.path.exists(benchmark_file):
            raise FileNotFoundError(f"Benchmark file not found: {benchmark_file}")

        with open(benchmark_file, "r", encoding="utf-8") as f:
            cases: List[Dict[str, Any]] = json.load(f)

        if limit_queries and limit_queries > 0:
            cases = cases[:limit_queries]

        print(f"🚀 Initializing pgvector HNSW Benchmark over {len(cases)} clinical cases...")
        print(f"   PostgreSQL: {self.db_config['host']}:{self.db_config['port']} | DB: {self.db_config['dbname']}")
        print(f"   HNSW Search Depth: ef_search = {self.ef_search}")

        conn = self.get_connection()
        cur = conn.cursor()

        top1_hits = 0
        top3_hits = 0
        top5_hits = 0
        reciprocal_ranks: List[float] = []
        latencies_ms: List[float] = []
        detailed_evaluations: List[Dict[str, Any]] = []

        query_sql = """
            SET LOCAL hnsw.ef_search = %s;
            SELECT dp.id, u.full_name, s.slug, s.name, (dp.bio_embedding <=> CAST(%s AS vector)) as cosine_dist
            FROM doctor_profiles dp
            JOIN users u ON dp.user_id = u.id
            JOIN doctor_specialties ds ON dp.id = ds.doctor_profile_id
            JOIN specialties s ON ds.specialty_id = s.id
            WHERE dp.bio_embedding IS NOT NULL
            ORDER BY cosine_dist ASC
            LIMIT 5;
        """

        for idx, case in enumerate(cases, 1):
            query_text = case.get("clinical_query") or case.get("chief_complaint") or ""
            target_slug = case.get("ground_truth_specialty_slug")
            target_name = case.get("ground_truth_specialty_name")

            # 1. Vectorize query into 1536-d space
            t_vec_start = time.perf_counter()
            query_vector = self.vector_engine.generate_embedding(query_text)
            vector_sql = self.vector_engine.to_pgvector_sql(query_vector)

            # 2. Query HNSW Index in PostgreSQL
            t_query_start = time.perf_counter()
            cur.execute(query_sql, (self.ef_search, vector_sql))
            results = cur.fetchall()
            t_query_end = time.perf_counter()

            latency_ms = (t_query_end - t_query_start) * 1000.0
            latencies_ms.append(latency_ms)

            retrieved_slugs = [r[2] for r in results]
            retrieved_names = [r[3] for r in results]
            retrieved_dists = [float(r[4]) for r in results]

            # Evaluate Specialty Matching
            rank = -1
            for r_idx, r_slug in enumerate(retrieved_slugs):
                if r_slug == target_slug:
                    rank = r_idx + 1
                    break
                # Special lenient match for General Internal Medicine if multiple conditions
                if target_slug == "general-internal-medicine" and r_slug in ["cardiology", "pulmonology", "gastroenterology"]:
                    # Secondary partial match
                    pass

            if rank == 1:
                top1_hits += 1
            if 1 <= rank <= 3:
                top3_hits += 1
            if 1 <= rank <= 5:
                top5_hits += 1

            rr = (1.0 / rank) if rank > 0 else 0.0
            reciprocal_ranks.append(rr)

            eval_item = {
                "case_id": case.get("id"),
                "query": query_text[:120] + ("..." if len(query_text) > 120 else ""),
                "ground_truth_specialty": target_name,
                "ground_truth_slug": target_slug,
                "retrieved_top1": retrieved_names[0] if retrieved_names else None,
                "retrieved_top1_dist": round(retrieved_dists[0], 4) if retrieved_dists else None,
                "rank": rank if rank > 0 else "Not in Top 5",
                "latency_ms": round(latency_ms, 2)
            }
            detailed_evaluations.append(eval_item)

            if idx % 20 == 0 or idx == len(cases):
                cur_top1 = (top1_hits / idx) * 100.0
                cur_top3 = (top3_hits / idx) * 100.0
                cur_mrr = np.mean(reciprocal_ranks)
                cur_lat = np.mean(latencies_ms)
                print(f"   [{idx:03d}/{len(cases)}] Top-1: {cur_top1:.1f}% | Top-3: {cur_top3:.1f}% | MRR: {cur_mrr:.3f} | Latency: {cur_lat:.2f}ms")

        conn.close()

        total = len(cases)
        top1_acc = (top1_hits / total) * 100.0
        recall3 = (top3_hits / total) * 100.0
        recall5 = (top5_hits / total) * 100.0
        mrr = float(np.mean(reciprocal_ranks))
        avg_latency = float(np.mean(latencies_ms))
        p95_latency = float(np.percentile(latencies_ms, 95))

        metrics = {
            "total_evaluated_queries": total,
            "ef_search": self.ef_search,
            "top_1_accuracy_percent": round(top1_acc, 2),
            "recall_at_3_percent": round(recall3, 2),
            "recall_at_5_percent": round(recall5, 2),
            "mean_reciprocal_rank_mrr": round(mrr, 4),
            "avg_query_latency_ms": round(avg_latency, 2),
            "p95_query_latency_ms": round(p95_latency, 2),
            "detailed_evaluations": detailed_evaluations
        }

        output_res_file = "data/meddies/benchmark_results.json"
        with open(output_res_file, "w", encoding="utf-8") as f:
            json.dump(metrics, f, ensure_ascii=False, indent=2)

        print("\n" + "="*70)
        print("📊 PGVECTOR HNSW CLINICAL RETRIEVAL BENCHMARK RESULTS")
        print("="*70)
        print(f"   Total Clinical Queries: {total}")
        print(f"   HNSW Index Parameter:   ef_search = {self.ef_search}")
        print(f"   Top-1 Match Accuracy:   {top1_acc:.2f}%")
        print(f"   Recall@3:               {recall3:.2f}%")
        print(f"   Recall@5:               {recall5:.2f}%")
        print(f"   Mean Reciprocal Rank:   {mrr:.4f}")
        print(f"   Average Query Latency:  {avg_latency:.2f} ms")
        print(f"   P95 Query Latency:      {p95_latency:.2f} ms")
        print(f"   Results Saved:          {output_res_file}")
        print("="*70 + "\n")

        return metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="pgvector HNSW Vector Search Benchmark")
    parser.add_argument("--benchmark_file", type=str, default="data/meddies/persona_benchmark_vietnamese.json")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--ef_search", type=int, default=100)
    args = parser.parse_args()

    bench = HNSWClinicalBenchmark(ef_search=args.ef_search)
    bench.run_benchmark(benchmark_file=args.benchmark_file, limit_queries=args.limit)
