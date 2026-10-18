#!/usr/bin/env python3
"""
Tool to export Markdown documentation into official, print-ready Academic Documents (.html)
with embedded LaTeX math (MathJax), vector diagrams (Mermaid.js), and FPT University styling.
Ready for One-Click Save as PDF (Cmd+P / Ctrl+P) or Opening in Microsoft Word / Google Docs.
"""

import os
import sys
import json

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <!-- Marked.js for robust GitHub Flavored Markdown parsing -->
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <!-- Mermaid.js for rendering vector diagrams -->
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <!-- MathJax for rendering LaTeX math formulas -->
    <script>
        window.MathJax = {
            tex: {
                inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
                displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']]
            },
            svg: { fontCache: 'global' }
        };
    </script>
    <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Times+New+Roman&family=JetBrains+Mono:wght@400;500&display=swap');

        :root {
            --primary: #0284c7;
            --primary-dark: #0369a1;
            --text-color: #1e293b;
            --bg-color: #ffffff;
            --border-color: #cbd5e1;
            --table-header-bg: #f1f5f9;
            --table-alt-bg: #f8fafc;
        }

        body {
            font-family: 'Times New Roman', Times, serif, 'Inter', sans-serif;
            font-size: 13pt;
            line-height: 1.6;
            color: var(--text-color);
            background-color: #e2e8f0;
            margin: 0;
            padding: 20px;
        }

        .document-container {
            max-width: 900px;
            margin: 0 auto;
            background: var(--bg-color);
            padding: 40px 60px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            border-radius: 4px;
        }

        /* Fixed Top Action Bar for PDF Export */
        .action-bar {
            position: fixed;
            top: 20px;
            right: 30px;
            z-index: 9999;
            display: flex;
            gap: 10px;
        }

        .action-btn {
            background: var(--primary);
            color: #ffffff;
            border: none;
            padding: 10px 18px;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            font-weight: 600;
            border-radius: 6px;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .action-btn:hover {
            background: var(--primary-dark);
            transform: translateY(-1px);
        }

        /* Typography & Headings */
        h1, h2, h3, h4, h5, h6 {
            color: #0f172a;
            font-family: 'Inter', sans-serif;
            font-weight: 700;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            page-break-after: avoid;
        }

        h1 {
            font-size: 24pt;
            border-bottom: 2px solid var(--primary);
            padding-bottom: 8px;
            text-transform: uppercase;
            text-align: center;
            margin-top: 20px;
        }

        h2 {
            font-size: 18pt;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 6px;
            color: var(--primary-dark);
        }

        h3 { font-size: 15pt; }
        h4 { font-size: 13pt; }

        p, li {
            text-align: justify;
            text-justify: inter-word;
        }

        /* Tables - Academic Standard 2-Column & Grid */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 11pt;
            page-break-inside: avoid;
        }

        table, th, td {
            border: 1px solid var(--border-color);
        }

        th {
            background-color: var(--table-header-bg);
            color: #0f172a;
            font-weight: 600;
            text-align: left;
            padding: 10px 12px;
        }

        td {
            padding: 8px 12px;
            vertical-align: top;
        }

        tr:nth-child(even) {
            background-color: var(--table-alt-bg);
        }

        /* Blockquotes */
        blockquote {
            border-left: 4px solid var(--primary);
            margin: 15px 0;
            padding: 10px 20px;
            background-color: #f8fafc;
            color: #334155;
            font-style: italic;
        }

        /* Code Blocks */
        code {
            font-family: 'JetBrains Mono', monospace;
            font-size: 10.5pt;
            background-color: #f1f5f9;
            padding: 2px 6px;
            border-radius: 4px;
            color: #b91c1c;
        }

        pre code {
            display: block;
            background-color: #0f172a;
            color: #f8fafc;
            padding: 15px;
            border-radius: 6px;
            overflow-x: auto;
            line-height: 1.4;
        }

        /* Mermaid Diagrams Container */
        .mermaid {
            display: flex;
            justify-content: center;
            margin: 25px 0;
            background: #ffffff;
            padding: 15px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            page-break-inside: avoid;
        }

        /* Print Styles for A4 PDF Output */
        @media print {
            body {
                background: none;
                padding: 0;
                font-size: 12pt;
            }

            .action-bar {
                display: none !important;
            }

            .document-container {
                max-width: 100%;
                padding: 0;
                margin: 0;
                box-shadow: none;
                border-radius: 0;
            }

            @page {
                size: A4;
                margin: 20mm 15mm 20mm 15mm;
            }

            h1, h2, h3 {
                page-break-after: avoid;
            }

            table, figure, .mermaid {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>

    <!-- Floating Action Bar for User -->
    <div class="action-bar">
        <button class="action-btn" onclick="window.print()">
            🖨️ In ra PDF / Lưu PDF (Cmd+P)
        </button>
        <button class="action-btn" style="background: #475569;" onclick="openInWordHint()">
            📄 Hướng Dẫn Mở Bằng Word (.docx)
        </button>
    </div>

    <!-- Official Document Paper Container -->
    <div class="document-container">
        <div id="content">Đang tải và định dạng tài liệu học thuật...</div>
    </div>

    <!-- Raw Markdown Content Data Container -->
    <script type="text/markdown" id="raw-markdown">
{markdown_content}
    </script>

    <script>
        function openInWordHint() {
            alert("HƯỚNG DẪN MỞ BẰNG MICROSOFT WORD (.DOCX):\\n\\n1. Mở Microsoft Word.\\n2. Chọn Menu Tệp (File) -> Mở (Open) -> Chọn tệp .html này.\\n3. Word sẽ tự động nạp toàn bộ cấu trúc bảng biểu, căn lề và định dạng chuẩn xác.\\n4. Chọn 'Lưu thành' (Save As) -> Chọn định dạng 'Word Document (.docx)'.");
        }

        document.addEventListener("DOMContentLoaded", function() {
            const rawMd = document.getElementById("raw-markdown").textContent;

            // Custom renderer to intercept mermaid code blocks
            const renderer = new marked.Renderer();
            const defaultCodeRenderer = renderer.code.bind(renderer);

            renderer.code = function(code, language) {
                if (language === 'mermaid') {
                    return '<div class="mermaid">' + code + '</div>';
                }
                return defaultCodeRenderer(code, language);
            };

            marked.setOptions({
                renderer: renderer,
                gfm: true,
                breaks: true,
                smartypants: true
            });

            // Parse markdown to HTML
            document.getElementById("content").innerHTML = marked.parse(rawMd);

            // Initialize Mermaid
            mermaid.initialize({
                startOnLoad: false,
                theme: 'neutral',
                securityLevel: 'loose',
                flowchart: { useMaxWidth: true, htmlLabels: true },
                sequence: { useMaxWidth: true, showSequenceNumbers: true }
            });

            mermaid.run({
                querySelector: '.mermaid'
            });

            // Re-run MathJax after markdown parsing
            if (window.MathJax && window.MathJax.typesetPromise) {
                window.MathJax.typesetPromise();
            }
        });
    </script>
</body>
</html>
"""

def export_file(md_path, html_path, title):
    if not os.path.exists(md_path):
        print(f"[ERROR] Source markdown file not found: {md_path}")
        return False

    with open(md_path, "r", encoding="utf-8") as f:
        md_content = f.read()

    # Escape HTML special chars in raw markdown so it safely sits inside <script>
    safe_md = md_content.replace("</script>", "<\\/script>")

    final_html = HTML_TEMPLATE.replace("{title}", title).replace("{markdown_content}", safe_md)

    with open(html_path, "w", encoding="utf-8") as f:
        f.write(final_html)

    size_kb = os.path.getsize(html_path) / 1024
    print(f"[SUCCESS] Exported '{os.path.basename(md_path)}' -> '{os.path.basename(html_path)}' ({size_kb:.1f} KB)")
    return True

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    docs_dir = os.path.join(base_dir, "..", "docs")
    dist_dir = os.path.join(base_dir, "..", "docs", "export")
    os.makedirs(dist_dir, exist_ok=True)

    files_to_export = [
        ("PROJECT_CHARTER_AND_PLAN.md", "Report1_Project_Charter_and_Plan.html", "Report 1 – Project Charter & Management Plan | MediAssist-AI"),
        ("REQUIREMENTS_ANALYSIS_AND_DOMAIN_MODEL.md", "Report2_Requirements_Analysis_and_Domain_Model.html", "Report 2 – Requirements Analysis & Domain Modeling | MediAssist-AI"),
        ("SRS_MediAssist_AI.md", "Report3_Software_Requirement_Specification.html", "Report 3 – Software Requirement Specification (SRS) | MediAssist-AI"),
        ("SDD_MediAssist_AI.md", "Report4_Software_Design_Document.html", "Report 4 – Software Design Document (SDD) | MediAssist-AI"),
        ("TEST_REPORT_MediAssist_AI.md", "Report5_Software_Test_Report.html", "Report 5 – Software Test Documentation & Verification | MediAssist-AI"),
        ("CAPSTONE_PRESENTATION_SLIDES.md", "Capstone_Presentation_Slides.html", "Capstone Presentation Slides (24 Slides) | MediAssist-AI"),
        ("CAPSTONE_DEFENSE.md", "Capstone_Defense_QnA_Top25.html", "Top 25 Capstone Defense Q&A | MediAssist-AI"),
    ]

    print("=======================================================================")
    print("   EXPORT ACADEMIC CAPSTONE DOCUMENTS (HTML / PDF / DOCX READY)        ")
    print("=======================================================================")

    exported_count = 0
    for md_file, html_file, title in files_to_export:
        src = os.path.join(docs_dir, md_file)
        dst = os.path.join(dist_dir, html_file)
        if export_file(src, dst, title):
            exported_count += 1

    print("\n[RESULT] Successfully exported", exported_count, "official documents to:", dist_dir)
    print("\n[HOW TO USE]:")
    print("1. Xuất file PDF chuẩn luận văn: Mở bất kỳ file .html nào trong Chrome/Safari, nhấn nút 'In ra PDF (Cmd+P)' -> Chọn 'Save as PDF'.")
    print("2. Mở bằng Word (.docx): Mở Microsoft Word -> File -> Open -> Chọn file .html -> Bấm Save As (.docx).")
    print("3. Đưa lên Google Docs: Vào Google Drive -> Tải file .html hoặc .docx lên -> Chọn 'Open with Google Docs'.")

if __name__ == "__main__":
    main()
