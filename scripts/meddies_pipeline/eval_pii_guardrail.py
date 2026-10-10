"""
Medical Document PII De-identification Evaluation Script.
Evaluates privacy masking patterns against Hugging Face 'Meddies/meddies-pii' (Vietnamese config).
Computes Precision, Recall, and F1-score for patient privacy guardrails (Decree 13/2023/ND-CP & HIPAA).
"""

import argparse
import json
import os
import re
import sys
from typing import Any, Dict, List, Set, Tuple

sys.stdout.reconfigure(encoding="utf-8")

# Regex rules matching Java MedicalPiiService
PII_PATTERNS = {
    "phone_number": [
        re.compile(r"(?:(?:\+?84|0)(?:3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])(?:\d{7}|\s\d{3}\s\d{4}|\.\d{3}\.\d{4}|-\d{3}-\d{4}))"),
        re.compile(r"(?i:(?:SĐT|Số\s*ĐT|Số\s*điện\s*thoại|Điện\s*thoại|Phone|Tel|Mobile))\s*[:\s-]?\s*([0-9+.\s-]{9,15})")
    ],
    "id_number": [
        re.compile(r"\b0\d{11}\b"),  # CCCD 12 digits
        re.compile(r"(?i:(?:CCCD|CMND|Số\s*CCCD|Số\s*CMND|Số\s*định\s*danh))\s*[:\s-]?\s*(\d{9,12})\b"),
        re.compile(r"(?i:(?:Mã\s*BN|Mã\s*bệnh\s*nhân|Mã\s*tiếp\s*nhận|Mã\s*HS|Mã\s*hồ\s*sơ|Số\s*HS|Mã\s*số\s*BN|Mã\s*phiếu|SID))\s*[:\s-]?\s*([A-Za-z0-9\-_/]{4,25})\b")
    ],
    "date": [
        re.compile(r"(?i:(?:Ngày\s*sinh|Sinh\s*ngày|Năm\s*sinh|DOB|NS))\s*[:\s-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b"),
        re.compile(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b")
    ],
    "address": [
        re.compile(r"(?i:(?:Địa\s*chỉ|Nơi\s*ở|Thường\s*trú|Đ/c|ĐC|HKTT))\s*[:\s-]\s*([^\n\r;!?]+?)(?=[;!?]|\.\s+[A-ZÀ-Ỹ]|\.\s*$|\r|\n|$)")
    ],
    "human_name": [
        re.compile(r"(?i:(?:Họ\s*và\s*tên|Họ\s*tên|Bệnh\s*nhân|Họ\s*&\s*Tên|Tên\s*BN|Người\s*bệnh))\s*[:\s-]\s*([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]+){1,5})"),
        re.compile(r"(?i:(?:Người\s*ký|Trưởng\s*khoa|Bác\s*sĩ|BS\.?))\s*[:\s-]\s*([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]+){1,5})")
    ]
}


def extract_ground_truth_entities(tagged_text: str) -> List[Tuple[str, str]]:
    """Extracts entities marked as [Value]<label> in Meddies ground truth text."""
    # Pattern: [Entity Value]<tag_name>
    matches = re.findall(r"\[([^\]]+)\]<([a-z_]+)>", tagged_text)
    return [(tag, val.strip()) for val, tag in matches]


def detect_pii_entities(raw_text: str) -> List[Tuple[str, str]]:
    """Runs regex detection patterns against raw hospital document text."""
    detected = []
    for pii_type, patterns in PII_PATTERNS.items():
        for pat in patterns:
            for match in pat.finditer(raw_text):
                val = match.group(1) if match.groups() else match.group(0)
                detected.append((pii_type, val.strip()))
    return detected


def evaluate_pii_benchmark(
    benchmark_file: str = "data/meddies/pii_benchmark_vietnamese.json"
) -> Dict[str, Any]:
    if not os.path.exists(benchmark_file):
        raise FileNotFoundError(f"PII benchmark file not found: {benchmark_file}")

    with open(benchmark_file, "r", encoding="utf-8") as f:
        docs = json.load(f)

    print(f"🔒 Evaluating PII De-identification Guardrail over {len(docs)} hospital documents...")
    total_gt = 0
    total_detected = 0
    true_positives = 0

    type_stats: Dict[str, Dict[str, int]] = {
        k: {"gt": 0, "detected": 0, "tp": 0} for k in PII_PATTERNS.keys()
    }

    for doc in docs:
        tagged_text = doc.get("text", "")
        raw_text = doc.get("raw", "")

        gt_entities = extract_ground_truth_entities(tagged_text)
        detected_entities = detect_pii_entities(raw_text)

        total_gt += len(gt_entities)
        total_detected += len(detected_entities)

        for gt_type, gt_val in gt_entities:
            normalized_type = gt_type
            if normalized_type in type_stats:
                type_stats[normalized_type]["gt"] += 1

        for det_type, det_val in detected_entities:
            if det_type in type_stats:
                type_stats[det_type]["detected"] += 1

            # Check if this detected entity matches any ground truth
            for gt_type, gt_val in gt_entities:
                if det_val.lower() in gt_val.lower() or gt_val.lower() in det_val.lower():
                    true_positives += 1
                    if det_type in type_stats:
                        type_stats[det_type]["tp"] += 1
                    break

    precision = (true_positives / total_detected) if total_detected > 0 else 0.0
    recall = (true_positives / total_gt) if total_gt > 0 else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0

    print("\n" + "="*70)
    print("🛡️ PII DE-IDENTIFICATION BENCHMARK REPORT (Decree 13 & HIPAA)")
    print("="*70)
    print(f"   Evaluated Documents:      {len(docs)}")
    print(f"   Total Ground-Truth PII:   {total_gt}")
    print(f"   Total Detected Entities:  {total_detected}")
    print(f"   True Positives:           {true_positives}")
    print(f"   Precision:                {precision*100:.2f}%")
    print(f"   Recall:                   {recall*100:.2f}%")
    print(f"   F1-Score:                 {f1*100:.2f}%")
    print("="*70)

    for p_type, s in type_stats.items():
        p = (s["tp"] / s["detected"] * 100.0) if s["detected"] > 0 else 0.0
        r = (s["tp"] / s["gt"] * 100.0) if s["gt"] > 0 else 0.0
        print(f"   • {p_type:15s}: GT={s['gt']:3d} | Detected={s['detected']:3d} | Precision={p:5.1f}% | Recall={r:5.1f}%")
    print("="*70 + "\n")

    return {
        "total_docs": len(docs),
        "precision": round(precision * 100, 2),
        "recall": round(recall * 100, 2),
        "f1_score": round(f1 * 100, 2)
    }


if __name__ == "__main__":
    evaluate_pii_benchmark()
