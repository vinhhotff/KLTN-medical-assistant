#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re
import os

def parse_use_case_block(content):
    lines = content.strip().split("\n")
    fields = {}
    current_key = None
    current_val = []

    known_keys = [
        "use case id", "use case name", "target system", "primary actor",
        "stakeholders", "trigger", "pre-conditions", "post-conditions",
        "priority", "normal flow", "alternative flows", "alternative flow",
        "exception flows", "exception flow", "business rules",
        "non-functional requirements", "data entities involved",
        "user interface controls", "open issues"
    ]

    for line in lines:
        if line.strip().startswith("="):
            continue
        m = re.match(r"^\s*(\d+[\.\)])?\s*([A-Za-z\s\-\(\)]+?):\s*(.*)$", line)
        if m:
            key_candidate = m.group(2).strip().lower()
            matched = False
            for k in known_keys:
                if key_candidate == k or key_candidate.startswith(k):
                    if current_key:
                        fields[current_key] = "\n".join(current_val).strip()
                    current_key = m.group(2).strip()
                    current_val = [m.group(3).strip()] if m.group(3).strip() else []
                    matched = True
                    break
            if matched:
                continue
        if current_key:
            current_val.append(line.strip())
    if current_key:
        fields[current_key] = "\n".join(current_val).strip()

    return fields

def to_table(sec_num, title, fields):
    def get_f(key_name, default="None"):
        for k, v in fields.items():
            if key_name.lower() in k.lower():
                return v
        return default

    uc_id = get_f("use case id", "UC-XX")
    name = get_f("use case name", title)
    target = get_f("target system", "MediAssist-AI Subsystem")
    actor = get_f("primary actor", "All Roles")
    trigger = get_f("trigger", "User navigates to screen")
    pre = get_f("pre-conditions", "User has network access")
    post = get_f("post-conditions", "System state is updated")
    normal = get_f("normal flow", "Standard sequence")
    alt = get_f("alternative flow", "None")
    exc = get_f("exception flow", "None")
    priority = get_f("priority", "Medium")
    rules = get_f("business rules", "Standard constraints")
    data = get_f("data entities", "PostgreSQL tables")
    ui = get_f("user interface", "Form controls")

    def fmt(val):
        lines = [l.strip() for l in val.split("\n") if l.strip() and not l.strip().startswith("=")]
        return "<br>".join(lines).replace("|", "\\|")

    sec_actor = "External Gateway"
    if "COMM" in uc_id:
        sec_actor = "Google Identity Provider, Transactional Email Gateway"
    elif any(k in uc_id for k in ["PAT-01", "PAT-02", "PAT-03", "PAT-05", "PAT-06"]):
        sec_actor = "Google Gemini 1.5 Flash Vision, OpenAI text-embedding-3-small"
    elif any(k in uc_id for k in ["PAT-08", "PAT-10"]):
        sec_actor = "Stripe Payment Gateway, Mock Payment Sandbox"
    elif "DOC" in uc_id:
        sec_actor = "Clinical Ontology Registry (WHO ICD-10 & LOINC), PDF Scribe"
    elif "ADM" in uc_id:
        sec_actor = "PostgreSQL Audit Subsystem, Redis Telemetry Aggregator"

    freq = "High (Frequent operational use)" if any(k in uc_id for k in ["COMM", "PAT", "DOC-01", "DOC-03", "DOC-08"]) else "Medium (Periodic / Administrative)"

    return f"""##### {sec_num} {name} ({uc_id})

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `{uc_id}` |
| **Use Case Name** | {name} |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | {actor} |
| **Secondary Actor** | {sec_actor} |
| **Description** | {target} — {fmt(post)} |
| **Trigger** | {fmt(trigger)} |
| **Pre-conditions** | {fmt(pre)} |
| **Post-conditions** | {fmt(post)} |
| **Normal Flow** | {fmt(normal)} |
| **Alternative Flow** | {fmt(alt)} |
| **Exceptions** | {fmt(exc)} |
| **Priority** | {fmt(priority)} |
| **Frequency of Use** | {freq} |
| **Business Rules** | {fmt(rules)} |
| **Data Entities Involved** | {fmt(data)} |
| **User Interface Controls** | {fmt(ui)} |
"""

def process_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    pattern = r'```\s*\n=+\s*\nUSE CASE SPECIFICATION:\s*([\d\.]+)\s+(.*?)\s*\((.*?)\)\s*\n=+\s*\n(.*?)(?:```|(?=\n"""))'

    def replacer(match):
        sec_num = match.group(1).strip()
        title = match.group(2).strip()
        uc_id = match.group(3).strip()
        body = match.group(4)
        fields = parse_use_case_block(body)
        if "Use Case ID" not in fields:
            fields["Use Case ID"] = uc_id
        if "Use Case Name" not in fields:
            fields["Use Case Name"] = title
        return to_table(sec_num, title, fields)

    new_content, count = re.subn(pattern, replacer, content, flags=re.DOTALL)
    print(f"Processed {filepath}: Converted {count} use cases.")

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(new_content)

def main():
    base_dir = "scripts/srs"
    for fname in ["part1_overview_and_common.py", "part2_patient_use_cases.py", "part3_doctor_and_admin_use_cases.py"]:
        fpath = os.path.join(base_dir, fname)
        if os.path.exists(fpath):
            process_file(fpath)

if __name__ == "__main__":
    main()
