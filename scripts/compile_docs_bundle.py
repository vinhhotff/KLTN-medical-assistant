#!/usr/bin/env python3
"""
MediAssist-AI: Master Capstone Documentation Bundler
Synchronizes all reports, compiles docs-bundle.js, and deploys to all report directories.
"""

import os
import json
import shutil

DOCS_DEF = [
    {
        "id": "doc_guide",
        "category": "🧭 Hướng Dẫn & Bản Đồ Hồ Sơ",
        "title": "Bản Đồ Cấu Trúc Hồ Sơ KLTN Chuẩn Tiến Sĩ",
        "badge": "Master Map",
        "badgeColor": "sky",
        "filename": "README.md",
        "path": "docs/README.md"
    },
    {
        "id": "clinical_defense",
        "category": "🎯 Khóa Luận & Phản Biện (Defense)",
        "title": "Biện Luận Y Học Chứng Cứ, SOTA & An Toàn Lâm Sàng",
        "badge": "Evidence SOTA",
        "badgeColor": "emerald",
        "filename": "CLINICAL_GROUNDING_AND_EVIDENCE_DEFENSE.md",
        "path": "docs/CLINICAL_GROUNDING_AND_EVIDENCE_DEFENSE.md"
    },
    {
        "id": "capstone_defense",
        "category": "🎯 Khóa Luận & Phản Biện (Defense)",
        "title": "Top 25 Câu Hỏi & Kịch Bản Phản Biện Hội Đồng",
        "badge": "25 Q&A",
        "badgeColor": "amber",
        "filename": "CAPSTONE_DEFENSE.md",
        "path": "docs/CAPSTONE_DEFENSE.md"
    },
    {
        "id": "presentation_slides",
        "category": "🎯 Khóa Luận & Phản Biện (Defense)",
        "title": "Slide Thuyết Trình KLTN Hội Đồng",
        "badge": "24 Slides",
        "badgeColor": "purple",
        "filename": "CAPSTONE_PRESENTATION_SLIDES.md",
        "path": "docs/CAPSTONE_PRESENTATION_SLIDES.md"
    },
    {
        "id": "storytelling",
        "category": "🎯 Khóa Luận & Phản Biện (Defense)",
        "title": "Câu Chuyện Sản Phẩm & Nỗi Đau Y Tế",
        "badge": "O2O Journey",
        "badgeColor": "rose",
        "filename": "STORYTELLING.md",
        "path": "docs/STORYTELLING.md"
    },
    {
        "id": "report_1_main",
        "category": "📑 Bộ Báo Cáo 5 Cột Mốc (Reports 1 - 5)",
        "title": "Report 1: Project Charter & Management Plan",
        "badge": "PMBOK 7th",
        "badgeColor": "blue",
        "filename": "PROJECT_CHARTER_AND_PLAN.md",
        "path": "docs/PROJECT_CHARTER_AND_PLAN.md"
    },
    {
        "id": "report_1_exec",
        "category": "📑 Bộ Báo Cáo 5 Cột Mốc (Reports 1 - 5)",
        "title": "Report 1: Executive Summary",
        "badge": "Summary",
        "badgeColor": "slate",
        "filename": "REPORT_1_EXECUTIVE_SUMMARY.md",
        "path": "report_1/REPORT_1_EXECUTIVE_SUMMARY.md"
    },
    {
        "id": "report_1_risk",
        "category": "📑 Bộ Báo Cáo 5 Cột Mốc (Reports 1 - 5)",
        "title": "Report 1: Risk & FinOps Audit",
        "badge": "FinOps",
        "badgeColor": "emerald",
        "filename": "REPORT_1_RISK_AND_FINOPS_AUDIT.md",
        "path": "report_1/REPORT_1_RISK_AND_FINOPS_AUDIT.md"
    },
    {
        "id": "report_2_main",
        "category": "📑 Bộ Báo Cáo 5 Cột Mốc (Reports 1 - 5)",
        "title": "Report 2: Requirements Analysis & Domain Model",
        "badge": "ISO 29148",
        "badgeColor": "indigo",
        "filename": "REQUIREMENTS_ANALYSIS_AND_DOMAIN_MODEL.md",
        "path": "docs/REQUIREMENTS_ANALYSIS_AND_DOMAIN_MODEL.md"
    },
    {
        "id": "report_2_exec",
        "category": "📑 Bộ Báo Cáo 5 Cột Mốc (Reports 1 - 5)",
        "title": "Report 2: Executive Summary (DDD 7 Bounded Contexts)",
        "badge": "DDD",
        "badgeColor": "slate",
        "filename": "REPORT_2_EXECUTIVE_SUMMARY.md",
        "path": "report_2/REPORT_2_EXECUTIVE_SUMMARY.md"
    },
    {
        "id": "report_3_main",
        "category": "📑 Bộ Báo Cáo 5 Cột Mốc (Reports 1 - 5)",
        "title": "Report 3: Software Requirements Specification (Full Master)",
        "badge": "IEEE 830",
        "badgeColor": "cyan",
        "filename": "SRS_MediAssist_AI.md",
        "path": "docs/SRS_MediAssist_AI.md"
    },
    {
        "id": "report_3_exec",
        "category": "📑 Bộ Báo Cáo 5 Cột Mốc (Reports 1 - 5)",
        "title": "Report 3: SRS Executive Summary",
        "badge": "49 Use Cases",
        "badgeColor": "slate",
        "filename": "REPORT_3_EXECUTIVE_SUMMARY.md",
        "path": "report_3/REPORT_3_EXECUTIVE_SUMMARY.md"
    },
    {
        "id": "report_4_main",
        "category": "📑 Bộ Báo Cáo 5 Cột Mốc (Reports 1 - 5)",
        "title": "Report 4: Software Design Document (Full Master)",
        "badge": "IEEE 1016",
        "badgeColor": "violet",
        "filename": "SDD_MediAssist_AI.md",
        "path": "docs/SDD_MediAssist_AI.md"
    },
    {
        "id": "report_4_exec",
        "category": "📑 Bộ Báo Cáo 5 Cột Mốc (Reports 1 - 5)",
        "title": "Report 4: SDD Executive Summary",
        "badge": "5-Tier Architecture",
        "badgeColor": "slate",
        "filename": "REPORT_4_EXECUTIVE_SUMMARY.md",
        "path": "report_4/REPORT_4_EXECUTIVE_SUMMARY.md"
    },
    {
        "id": "report_5_main",
        "category": "📑 Bộ Báo Cáo 5 Cột Mốc (Reports 1 - 5)",
        "title": "Report 5: Test Report & Verification (306 Tests)",
        "badge": "IEEE 829",
        "badgeColor": "emerald",
        "filename": "TEST_REPORT_MediAssist_AI.md",
        "path": "docs/TEST_REPORT_MediAssist_AI.md"
    },
    {
        "id": "report_5_exec",
        "category": "📑 Bộ Báo Cáo 5 Cột Mốc (Reports 1 - 5)",
        "title": "Report 5: Test Executive Summary",
        "badge": "306 Tests PASS",
        "badgeColor": "slate",
        "filename": "REPORT_5_EXECUTIVE_SUMMARY.md",
        "path": "report_5/REPORT_5_EXECUTIVE_SUMMARY.md"
    },
    {
        "id": "data_provenance",
        "category": "📐 Kỹ Thuật Lâm Sàng & Tiêu Chuẩn",
        "title": "Quy Chuẩn Lâm Sàng, LOINC QĐ 3280 & Nghị Định 13",
        "badge": "MOH Standards",
        "badgeColor": "teal",
        "filename": "DATA_PROVENANCE_AND_CLINICAL_STANDARDS.md",
        "path": "docs/DATA_PROVENANCE_AND_CLINICAL_STANDARDS.md"
    },
    {
        "id": "algorithms_resilience",
        "category": "📐 Kỹ Thuật Lâm Sàng & Tiêu Chuẩn",
        "title": "Thuật Toán WHRF & Khả Năng Chống Sập P99",
        "badge": "5 SOTA Algos",
        "badgeColor": "amber",
        "filename": "ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md",
        "path": "docs/ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md"
    },
    {
        "id": "scan_pipeline",
        "category": "📐 Kỹ Thuật Lâm Sàng & Tiêu Chuẩn",
        "title": "Kiến Trúc Pipeline OCR & Clinical RAG",
        "badge": "Multimodal OCR",
        "badgeColor": "orange",
        "filename": "DOCUMENT_SCAN_PIPELINE.md",
        "path": "docs/DOCUMENT_SCAN_PIPELINE.md"
    },
    {
        "id": "database_design",
        "category": "📐 Kỹ Thuật Lâm Sàng & Tiêu Chuẩn",
        "title": "Thiết Kế Cơ Sở Dữ Liệu 17 Bảng (3NF & pgvector)",
        "badge": "PostgreSQL 16",
        "badgeColor": "blue",
        "filename": "DATABASE_DESIGN.md",
        "path": "docs/DATABASE_DESIGN.md"
    },
    {
        "id": "traceability_index",
        "category": "📐 Kỹ Thuật Lâm Sàng & Tiêu Chuẩn",
        "title": "Master Traceability Index (Truy Vết Toàn Diện)",
        "badge": "RTM 1-to-1",
        "badgeColor": "purple",
        "filename": "MASTER_TRACEABILITY_INDEX.md",
        "path": "docs/MASTER_TRACEABILITY_INDEX.md"
    }
]

def sync_individual_report_files():
    print("Syncing master documents from docs/ to report directories...")
    pairs = [
        ("docs/PROJECT_CHARTER_AND_PLAN.md", "report_1/REPORT_1_PROJECT_CHARTER_AND_PLAN.md"),
        ("docs/CLINICAL_GROUNDING_AND_EVIDENCE_DEFENSE.md", "report_1/REPORT_1_CLINICAL_GROUNDING_AND_EVIDENCE_DEFENSE.md"),
        ("docs/REQUIREMENTS_ANALYSIS_AND_DOMAIN_MODEL.md", "report_2/REPORT_2_REQUIREMENTS_ANALYSIS_AND_DOMAIN_MODEL.md"),
        ("docs/SRS_MediAssist_AI.md", "report_3/REPORT_3_SRS_SOFTWARE_REQUIREMENTS_SPECIFICATION.md"),
        ("docs/SDD_MediAssist_AI.md", "report_4/REPORT_4_SDD_SOFTWARE_DESIGN_DOCUMENT.md"),
        ("docs/DATABASE_DESIGN.md", "report_4/DATABASE_DESIGN.md"),
        ("docs/TEST_REPORT_MediAssist_AI.md", "report_5/REPORT_5_TEST_REPORT_AND_VERIFICATION.md"),
    ]
    for src, dst in pairs:
        if os.path.exists(src):
            shutil.copy2(src, dst)
            print(f"  ✓ Synced {src} -> {dst}")
        else:
            print(f"  ⚠ Source not found: {src}")

def build_bundle():
    print("\nReading markdown files and compiling bundle...")
    bundle = {}
    for item in DOCS_DEF:
        path = item["path"]
        if not os.path.exists(path):
            print(f"  ❌ Missing file: {path}")
            continue
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        bundle[item["id"]] = {
            "id": item["id"],
            "category": item["category"],
            "title": item["title"],
            "badge": item["badge"],
            "badgeColor": item["badgeColor"],
            "filename": item["filename"],
            "content": content
        }
        size_kb = len(content.encode("utf-8")) / 1024
        print(f"  ✓ Added [{item['id']}] {item['title']} ({size_kb:.1f} KB)")

    bundle_json = json.dumps(bundle, ensure_ascii=False)
    bundle_js = f"window.MEDIASSIST_DOCS = {bundle_json};\n"

    targets = [
        "docs-bundle.js",
        "report_1/docs-bundle.js",
        "report_2/docs-bundle.js",
        "report_3/docs-bundle.js",
        "report_4/docs-bundle.js",
        "report_5/docs-bundle.js",
    ]

    total_size_kb = len(bundle_js.encode("utf-8")) / 1024
    print(f"\nWriting bundle ({total_size_kb:.1f} KB, {len(bundle)} documents) to targets:")
    for target in targets:
        with open(target, "w", encoding="utf-8") as f:
            f.write(bundle_js)
        print(f"  ✓ Written {target}")

    print("\nAll report bundles synchronized successfully!")

if __name__ == "__main__":
    sync_individual_report_files()
    build_bundle()
