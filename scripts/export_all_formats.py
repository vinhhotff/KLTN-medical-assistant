#!/usr/bin/env python3
"""
Master Export Pipeline for MediAssist-AI Capstone Project Documentation.
Exports all 7 Capstone Deliverables into 3 official formats:
1. Standalone Academic HTML (.html) with interactive Mermaid.js & MathJax
2. Microsoft Word Document (.docx) with all Mermaid diagrams pre-rendered into embedded PNG images
3. Adobe PDF Document (.pdf) with full A4 print styles and vector graphics
"""

import os
import sys
import subprocess
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
DOCS_DIR = os.path.join(PROJECT_ROOT, "docs")
EXPORT_DIR = os.path.join(DOCS_DIR, "export")
CHROME_BIN = "/Users/thanvinh/.cache/puppeteer/chrome/mac_arm-155.0.8059.79/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
MERMAID_FILTER = os.path.join(PROJECT_ROOT, "frontend", "node_modules", ".bin", "mermaid-filter")
PUPPETEER_MODULE = os.path.join(PROJECT_ROOT, "frontend", "node_modules", "puppeteer")

DELIVERABLES = [
    ("PROJECT_CHARTER_AND_PLAN.md", "Report1_Project_Charter_and_Plan", "Report 1 – Project Charter & Management Plan"),
    ("REQUIREMENTS_ANALYSIS_AND_DOMAIN_MODEL.md", "Report2_Requirements_Analysis_and_Domain_Model", "Report 2 – Requirements Analysis & Domain Modeling"),
    ("SRS_MediAssist_AI.md", "Report3_Software_Requirement_Specification", "Report 3 – Software Requirement Specification (SRS)"),
    ("SDD_MediAssist_AI.md", "Report4_Software_Design_Document", "Report 4 – Software Design Document (SDD)"),
    ("TEST_REPORT_MediAssist_AI.md", "Report5_Software_Test_Report", "Report 5 – Software Test Documentation & Verification"),
    ("CAPSTONE_PRESENTATION_SLIDES.md", "Capstone_Presentation_Slides", "Capstone Presentation Slides (24 Slides)"),
    ("CAPSTONE_DEFENSE.md", "Capstone_Defense_QnA_Top25", "Top 25 Capstone Defense Q&A"),
]

def export_docx(src_md, dst_docx):
    print(f"  [DOCX] Converting '{os.path.basename(src_md)}' -> '{os.path.basename(dst_docx)}'...")
    env = os.environ.copy()
    env["PUPPETEER_EXECUTABLE_PATH"] = CHROME_BIN
    cmd = [
        "pandoc",
        src_md,
        "-F", MERMAID_FILTER,
        "-o", dst_docx
    ]
    res = subprocess.run(cmd, env=env, capture_output=True, text=True)
    if res.returncode == 0:
        size_kb = os.path.getsize(dst_docx) / 1024
        print(f"    ✓ DOCX SUCCESS ({size_kb:.1f} KB)")
        return True
    else:
        print(f"    ✗ DOCX FAILED: {res.stderr[:200]}")
        return False

def export_pdf_from_html(src_html, dst_pdf):
    print(f"  [PDF] Rendering '{os.path.basename(src_html)}' -> '{os.path.basename(dst_pdf)}'...")
    script = f"""
    const puppeteer = require('{PUPPETEER_MODULE}');
    const path = require('path');

    (async () => {{
      try {{
        const browser = await puppeteer.launch({{
          executablePath: '{CHROME_BIN}',
          headless: 'new'
        }});
        const page = await browser.newPage();
        await page.goto('file://' + path.resolve('{src_html}'), {{ waitUntil: 'networkidle0', timeout: 60000 }});
        await page.evaluate(async () => {{
          if (window.MathJax && window.MathJax.typesetPromise) {{
            await window.MathJax.typesetPromise();
          }}
          // wait briefly for mermaid svg rendering
          await new Promise(r => setTimeout(r, 1000));
        }});
        await page.pdf({{
          path: '{dst_pdf}',
          format: 'A4',
          printBackground: true,
          margin: {{ top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }}
        }});
        await browser.close();
        process.exit(0);
      }} catch (err) {{
        console.error(err.message);
        process.exit(1);
      }}
    }})();
    """
    res = subprocess.run(["node", "-e", script], capture_output=True, text=True)
    if res.returncode == 0 and os.path.exists(dst_pdf):
        size_kb = os.path.getsize(dst_pdf) / 1024
        print(f"    ✓ PDF SUCCESS ({size_kb:.1f} KB)")
        return True
    else:
        print(f"    ✗ PDF FAILED: {res.stderr[:200]}")
        return False

def main():
    os.makedirs(EXPORT_DIR, exist_ok=True)
    print("=======================================================================")
    print("   MASTER CAPSTONE DOCUMENT EXPORT PIPELINE (HTML + DOCX + PDF)        ")
    print("=======================================================================")

    # First compile HTML documents
    export_tool = os.path.join(BASE_DIR, "export_to_academic_doc.py")
    subprocess.run(["python3", export_tool], check=True)

    print("\n-----------------------------------------------------------------------")
    print("   STEP 2: GENERATING OFFICIAL WORD DOCUMENTS (.DOCX) & PDF (.PDF)     ")
    print("-----------------------------------------------------------------------")

    for src_file, base_name, title in DELIVERABLES:
        src_md = os.path.join(DOCS_DIR, src_file)
        src_html = os.path.join(EXPORT_DIR, f"{base_name}.html")
        dst_docx = os.path.join(EXPORT_DIR, f"{base_name}.docx")
        dst_pdf = os.path.join(EXPORT_DIR, f"{base_name}.pdf")

        print(f"\n[PROCESSING] {title}")
        # Generate DOCX if not already exists or updated
        if not os.path.exists(dst_docx) or os.path.getmtime(src_md) > os.path.getmtime(dst_docx):
            export_docx(src_md, dst_docx)
        else:
            print(f"  [DOCX] Up to date ({os.path.getsize(dst_docx)/1024:.1f} KB)")

        # Generate PDF
        if not os.path.exists(dst_pdf) or os.path.getmtime(src_html) > os.path.getmtime(dst_pdf):
            export_pdf_from_html(src_html, dst_pdf)
        else:
            print(f"  [PDF] Up to date ({os.path.getsize(dst_pdf)/1024:.1f} KB)")

    print("\n=======================================================================")
    print("   EXPORT COMPLETE! ALL 7 DELIVERABLES READY IN docs/export/           ")
    print("=======================================================================")
    for f in sorted(os.listdir(EXPORT_DIR)):
        if f.endswith((".html", ".docx", ".pdf")):
            size_kb = os.path.getsize(os.path.join(EXPORT_DIR, f)) / 1024
            print(f"  - {f:55s} ({size_kb:7.1f} KB)")

if __name__ == "__main__":
    main()
