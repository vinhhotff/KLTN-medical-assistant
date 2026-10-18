#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Master Build Script for MediAssist-AI SRS Document.
Assembles Part 1 through Part 5 into docs/SRS_MediAssist_AI.md.
"""

import os
import sys

# Add scripts directory to import path
sys.path.insert(0, os.path.abspath("scripts"))

from srs import part1_overview_and_common
from srs import part2_patient_use_cases
from srs import part3_doctor_and_admin_use_cases
from srs import part4_functional_requirements
from srs import part5_nfr_and_appendix

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    target_path = os.path.abspath(os.path.join(base_dir, "..", "docs", "SRS_MediAssist_AI.md"))
    print(f"Compiling complete Capstone Report 3 SRS to: {target_path}")

    p1 = part1_overview_and_common.get_content()
    p2 = part2_patient_use_cases.get_content()
    p3 = part3_doctor_and_admin_use_cases.get_content()
    p4 = part4_functional_requirements.get_content()
    p5 = part5_nfr_and_appendix.get_content()

    full_content = "\n".join([p1, p2, p3, p4, p5])

    with open(target_path, "w", encoding="utf-8") as f:
        f.write(full_content)

    line_count = full_content.count("\n")
    char_count = len(full_content)
    print(f"Compilation finished successfully!")
    print(f"Total Lines: {line_count:,}")
    print(f"Total Characters: {char_count:,}")

if __name__ == "__main__":
    main()
