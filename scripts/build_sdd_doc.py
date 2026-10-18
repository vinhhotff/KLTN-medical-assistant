#!/usr/bin/env python3
"""
Orchestrator script to compile docs/SDD_MediAssist_AI.md
matching the FPT University Capstone Report 4 Software Design Document standard.
"""

import sys
import os

# Add scripts directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from sdd.part1_system_design import get_part1_content
from sdd.part2_database_design import get_part2_content
from sdd.part3_detailed_design_auth_triage import get_part3_content
from sdd.part4_detailed_design_clinical_docs import get_part4_content
from sdd.part5_detailed_design_payment_admin import get_part5_content

def build_sdd():
    print("[INFO] Compiling SDD_MediAssist_AI.md...")
    part1 = get_part1_content()
    part2 = get_part2_content()
    part3 = get_part3_content()
    part4 = get_part4_content()
    part5 = get_part5_content()

    full_content = "\n\n".join([
        part1.strip(),
        part2.strip(),
        part3.strip(),
        part4.strip(),
        part5.strip()
    ]) + "\n"

    output_path = os.path.join(current_dir, "..", "docs", "SDD_MediAssist_AI.md")
    output_path = os.path.abspath(output_path)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(full_content)

    line_count = len(full_content.splitlines())
    char_count = len(full_content)
    print(f"[SUCCESS] Compiled SDD document to {output_path}")
    print(f"[METRICS] Total lines: {line_count:,} | Total characters: {char_count:,}")

if __name__ == "__main__":
    build_sdd()
