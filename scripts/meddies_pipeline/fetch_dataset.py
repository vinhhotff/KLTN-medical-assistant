"""
Meddies Clinical Dataset Extractor & Benchmark Preprocessor.
Downloads Vietnamese patient personas from 'Meddies/meddies-persona-vie'
and hospital PII documents from 'Meddies/meddies-pii' on Hugging Face.
Preprocesses and attaches ground-truth clinical specialties using ICD-10.
"""

import argparse
import json
import os
import sys
import time
from typing import Any, Dict, List, Optional
import requests

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from scripts.meddies_pipeline.icd10_specialty_mapper import resolve_primary_specialty

sys.stdout.reconfigure(encoding="utf-8")

HF_DATASET_ROWS_URL = "https://datasets-server.huggingface.co/rows"


def fetch_persona_batch(offset: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
    """Fetches a batch of patient personas from Meddies/meddies-persona-vie."""
    params = {
        "dataset": "Meddies/meddies-persona-vie",
        "config": "default",
        "split": "train",
        "offset": offset,
        "limit": limit
    }
    headers = {"User-Agent": "MediAssist-AI-Vector-Benchmarking/1.0"}
    resp = requests.get(HF_DATASET_ROWS_URL, params=params, headers=headers, timeout=20)
    resp.raise_for_status()
    data = resp.json()
    return [item["row"] for item in data.get("rows", [])]


def fetch_pii_batch(offset: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
    """Fetches a batch of Vietnamese hospital documents from Meddies/meddies-pii."""
    params = {
        "dataset": "Meddies/meddies-pii",
        "config": "vietnamese",
        "split": "train",
        "offset": offset,
        "limit": limit
    }
    headers = {"User-Agent": "MediAssist-AI-PII-Guardrail/1.0"}
    resp = requests.get(HF_DATASET_ROWS_URL, params=params, headers=headers, timeout=20)
    resp.raise_for_status()
    data = resp.json()
    return [item["row"] for item in data.get("rows", [])]


def process_persona_record(raw_row: Dict[str, Any], record_idx: int) -> Dict[str, Any]:
    """Extracts clinical fields and computes ground truth specialty from ICD-10."""
    demographics = raw_row.get("demographics", {})
    medical_history = raw_row.get("medical_history", {})
    llm_fields = raw_row.get("llm_fields", {})

    age = demographics.get("age")
    gender = demographics.get("gender", "")
    occupation = demographics.get("occupation", "")
    location = demographics.get("location", "")

    chronic_conditions = medical_history.get("chronic_conditions", [])
    allergies = medical_history.get("allergies", [])
    medications = medical_history.get("current_medications", [])

    chief_complaint = llm_fields.get("chief_complaint", "").strip()
    history_illness = llm_fields.get("history_of_present_illness", "").strip()
    patient_narrative = llm_fields.get("patient_narrative", "").strip()

    raw_symptoms = llm_fields.get("presenting_symptoms", [])
    symptom_names = []
    if isinstance(raw_symptoms, list):
        for s in raw_symptoms:
            if isinstance(s, dict) and "symptom_name" in s:
                symptom_names.append(s["symptom_name"])
            elif isinstance(s, str):
                symptom_names.append(s)

    # Resolve Ground Truth Specialty via ICD-10 codes
    specialty_slug, specialty_name = resolve_primary_specialty(chronic_conditions, age=age)

    # Build realistic natural query text that patients would enter
    clinical_query = chief_complaint
    if symptom_names:
        clinical_query += ". Triệu chứng kèm theo: " + ", ".join(symptom_names)

    return {
        "id": f"meddies-persona-{record_idx:05d}",
        "age": age,
        "gender": gender,
        "occupation": occupation,
        "location": location,
        "chronic_conditions": chronic_conditions,
        "allergies": allergies,
        "current_medications": medications,
        "chief_complaint": chief_complaint,
        "presenting_symptoms": symptom_names,
        "patient_narrative": patient_narrative,
        "clinical_query": clinical_query,
        "ground_truth_specialty_slug": specialty_slug,
        "ground_truth_specialty_name": specialty_name
    }


def download_meddies_data(
    target_samples: int = 500,
    output_dir: str = "data/meddies",
    include_pii: bool = True
) -> Dict[str, str]:
    """Downloads persona and PII benchmark records and saves to JSON files."""
    os.makedirs(output_dir, exist_ok=True)
    persona_output_file = os.path.join(output_dir, "persona_benchmark_vietnamese.json")
    pii_output_file = os.path.join(output_dir, "pii_benchmark_vietnamese.json")

    print(f"🏥 Starting Meddies dataset extraction (Target: {target_samples} clinical cases)...")
    personas: List[Dict[str, Any]] = []
    offset = 0
    batch_size = 100

    while len(personas) < target_samples:
        current_limit = min(batch_size, target_samples - len(personas))
        try:
            print(f"   Fetching personas offset={offset}, limit={current_limit}...")
            raw_batch = fetch_persona_batch(offset=offset, limit=current_limit)
            if not raw_batch:
                print("   No more rows returned from Hugging Face.")
                break

            for row in raw_batch:
                processed = process_persona_record(row, len(personas) + 1)
                personas.append(processed)

            offset += len(raw_batch)
            time.sleep(0.3)  # Respect HF rate limits
        except Exception as e:
            print(f"   ⚠️ Error fetching batch at offset {offset}: {e}")
            break

    with open(persona_output_file, "w", encoding="utf-8") as f:
        json.dump(personas, f, ensure_ascii=False, indent=2)

    print(f"✅ Saved {len(personas)} clinical patient cases to: {persona_output_file}")

    # Fetch PII sample records
    if include_pii:
        print("🔒 Fetching Vietnamese hospital documents for PII de-identification testing...")
        try:
            pii_docs = fetch_pii_batch(offset=0, limit=50)
            with open(pii_output_file, "w", encoding="utf-8") as f:
                json.dump(pii_docs, f, ensure_ascii=False, indent=2)
            print(f"✅ Saved {len(pii_docs)} hospital documents to: {pii_output_file}")
        except Exception as e:
            print(f"   ⚠️ Failed to fetch PII records: {e}")

    return {
        "persona_file": persona_output_file,
        "pii_file": pii_output_file,
        "total_personas": len(personas)
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download & Process Meddies Datasets for MediAssist-AI")
    parser.add_argument("--samples", type=int, default=200, help="Number of clinical persona samples (default: 200)")
    parser.add_argument("--output_dir", type=str, default="data/meddies", help="Output directory")
    args = parser.parse_args()

    download_meddies_data(target_samples=args.samples, output_dir=args.output_dir)
