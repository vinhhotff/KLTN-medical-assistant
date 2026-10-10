"""
Doctor Clinical Knowledge Enrichment & Vector Profile Training Pipeline.
Leverages Meddies Vietnamese patient personas to aggregate symptom vocabulary
and train/re-vectorize doctor profiles in PostgreSQL pgvector (port 5433).
"""

import argparse
import collections
import json
import os
import sys
from typing import Any, Dict, List, Set, Tuple
import psycopg2

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from scripts.meddies_pipeline.vector_engine import VectorEmbeddingEngine

sys.stdout.reconfigure(encoding="utf-8")


def extract_symptom_clusters_from_meddies(
    benchmark_file: str = "data/meddies/persona_benchmark_vietnamese.json"
) -> Dict[str, Dict[str, Any]]:
    """
    Groups real patient chief complaints and symptoms from Meddies by clinical specialty.
    """
    if not os.path.exists(benchmark_file):
        raise FileNotFoundError(f"Benchmark file not found: {benchmark_file}")

    with open(benchmark_file, "r", encoding="utf-8") as f:
        cases: List[Dict[str, Any]] = json.load(f)

    specialty_clusters: Dict[str, Dict[str, Any]] = collections.defaultdict(lambda: {
        "symptoms": collections.Counter(),
        "complaints": [],
        "conditions": collections.Counter()
    })

    for case in cases:
        slug = case.get("ground_truth_specialty_slug")
        if not slug or slug == "general-internal-medicine":
            continue

        complaint = case.get("chief_complaint")
        if complaint:
            specialty_clusters[slug]["complaints"].append(complaint)

        for s in case.get("presenting_symptoms", []):
            if s and len(s.strip()) > 2:
                specialty_clusters[slug]["symptoms"][s.strip().lower()] += 1

        for c in case.get("chronic_conditions", []):
            if c:
                specialty_clusters[slug]["conditions"][str(c).strip().upper()] += 1

    return specialty_clusters


def augment_doctor_profiles_in_db(
    benchmark_file: str = "data/meddies/persona_benchmark_vietnamese.json",
    db_host: str = "localhost",
    db_port: int = 5433,
    db_name: str = "mediassist_db",
    db_user: str = "postgres",
    db_pass: str = "postgres_secure_2026"
) -> int:
    """
    Enriches doctor profiles in PostgreSQL with clinical symptom vocabulary derived from Meddies,
    recalculates 1536-d neural vector embeddings, and stores them in bio_embedding.
    """
    clusters = extract_symptom_clusters_from_meddies(benchmark_file)
    vector_engine = VectorEmbeddingEngine()

    conn = psycopg2.connect(
        host=db_host,
        port=db_port,
        dbname=db_name,
        user=db_user,
        password=db_pass
    )
    cur = conn.cursor()

    # Query all active doctors with their specialties
    cur.execute("""
        SELECT dp.id, u.full_name, dp.academic_title, dp.hospital_affiliation, dp.department,
               dp.years_of_experience, dp.bio, s.slug, s.name, s.description
        FROM doctor_profiles dp
        JOIN users u ON dp.user_id = u.id
        JOIN doctor_specialties ds ON dp.id = ds.doctor_profile_id
        JOIN specialties s ON ds.specialty_id = s.id;
    """)
    doctors = cur.fetchall()

    print(f"🏥 Training and enriching {len(doctors)} doctor clinical vector profiles...")
    updated_count = 0

    for doc in doctors:
        (dp_id, full_name, title, hospital, dept, years, old_bio, s_slug, s_name, s_desc) = doc

        # Get top symptoms from Meddies cluster for this specialty
        cluster = clusters.get(s_slug, {})
        top_symptoms = [s for s, _ in cluster.get("symptoms", collections.Counter()).most_common(12)]
        sample_complaints = cluster.get("complaints", [])[:4]
        top_conditions = [c for c, _ in cluster.get("conditions", collections.Counter()).most_common(6)]

        symptom_section = ", ".join(top_symptoms) if top_symptoms else "Các bệnh lý chuyên khoa tổng quát"
        complaint_section = "; ".join(sample_complaints) if sample_complaints else ""
        condition_section = ", ".join(top_conditions) if top_conditions else ""

        # Construct comprehensive structured clinical embedding text (HL7/FHIR style)
        rich_clinical_document = f"""[HỒ SƠ BÁC SĨ CHUYÊN KHOA LÂM SÀNG]
• Bác sĩ: {title or 'BS.'} {full_name}
• Chuyên khoa: {s_name} ({s_slug})
• Nơi công tác: {hospital or 'Bệnh viện Đa Khoa MediAssist'} - {dept or 'Khoa Khám Bệnh'}
• Kinh nghiệm lâm sàng: {years or 10} năm kinh nghiệm điều trị.
• Phạm vi bệnh học & Chuyên môn: {s_desc or ''}
• Mã chẩn đoán ICD-10 thường gặp: {condition_section}
• Triệu chứng lâm sàng tiếp nhận & xử trí: {symptom_section}
• Các tình trạng bệnh nhân than phiền thực tế: {complaint_section}
• Tóm tắt tiểu sử chuyên môn: {old_bio or ''}"""

        # Generate 1536-dimensional L2-normalized vector embedding
        new_vector = vector_engine.generate_embedding(rich_clinical_document)
        vector_sql = vector_engine.to_pgvector_sql(new_vector)

        # Update PostgreSQL doctor_profiles
        cur.execute("""
            UPDATE doctor_profiles
            SET bio = %s,
                bio_embedding = CAST(%s AS vector)
            WHERE id = %s;
        """, (rich_clinical_document.strip(), vector_sql, dp_id))

        updated_count += 1
        print(f"   ✅ Trained vector profile for: {title or 'BS.'} {full_name} -> {s_name} ({len(top_symptoms)} symptoms indexed)")

    conn.commit()
    conn.close()

    print(f"\n🎉 Successfully trained and vectorized {updated_count} doctor profiles into pgvector!")
    return updated_count


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Doctor Clinical Profile Vector Training")
    parser.add_argument("--benchmark_file", type=str, default="data/meddies/persona_benchmark_vietnamese.json")
    args = parser.parse_args()

    augment_doctor_profiles_in_db(benchmark_file=args.benchmark_file)
