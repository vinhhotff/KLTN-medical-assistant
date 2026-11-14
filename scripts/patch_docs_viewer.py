#!/usr/bin/env python3
"""
Patch MediAssist-AI docs viewers:
1. Implement IntersectionObserver lazy loading for Mermaid diagrams (eliminates UI freeze on 92 diagrams in Report 4).
2. Clean up fuzzy hash navigation to prevent unintended cross-document jumping.
3. Configure default loaded document per report workbench.
"""

import os
import re

REPORTS = [
    ("report_1/index.html", "report_1_main"),
    ("report_2/index.html", "report_2_main"),
    ("report_3/index.html", "report_3_main"),
    ("report_4/index.html", "report_4_main"),
    ("report_5/index.html", "report_5_main"),
]

LAZY_MERMAID_REPLACEMENT = """      // High-performance Lazy Mermaid Rendering via IntersectionObserver
      if (window._mermaidObserver) {
        window._mermaidObserver.disconnect();
      }
      window._mermaidDiagrams = new Map();

      const codeBlocks = renderedDiv.querySelectorAll('pre code.language-mermaid');
      const totalDiagrams = codeBlocks.length;
      for (let i = 0; i < totalDiagrams; i++) {
        const block = codeBlocks[i];
        const pre = block.parentElement;
        const mermaidCode = block.textContent.trim();
        const diagramId = `mermaid_diag_${Date.now()}_${i}`;
        window._mermaidDiagrams.set(diagramId, mermaidCode);

        const container = document.createElement('div');
        container.className = 'mermaid-container my-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-x-auto min-h-[120px] flex items-center justify-center p-4 transition-all';
        container.id = diagramId;
        container.setAttribute('data-diagram-id', diagramId);
        container.innerHTML = `
          <div class="mermaid-placeholder flex flex-col items-center justify-center py-6 text-slate-400 dark:text-slate-500 text-xs gap-2 select-none">
            <svg class="animate-spin h-5 w-5 text-sky-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span>Đang dựng sơ đồ kỹ thuật (${i + 1}/${totalDiagrams})...</span>
          </div>
        `;
        pre.parentNode.replaceChild(container, pre);
      }

      if (totalDiagrams > 0) {
        const viewport = document.getElementById('main-viewport');
        window._mermaidObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const container = entry.target;
              window._mermaidObserver.unobserve(container);
              renderSingleMermaidDiagram(container);
            }
          });
        }, {
          root: viewport,
          rootMargin: '450px 0px 450px 0px'
        });

        renderedDiv.querySelectorAll('.mermaid-container').forEach(c => window._mermaidObserver.observe(c));
      }"""

SINGLE_RENDER_FUNCTION = """    // HTML Escaping Utility
    function escapeHtml(str) {
      if (!str) return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    // Render a single Mermaid diagram asynchronously on demand
    async function renderSingleMermaidDiagram(container) {
      const diagramId = container.getAttribute('data-diagram-id');
      const code = window._mermaidDiagrams ? window._mermaidDiagrams.get(diagramId) : null;
      if (!code) return;

      const svgId = 'svg_' + diagramId.replace(/[^a-zA-Z0-9_]/g, '_');
      try {
        const { svg, bindFunctions } = await mermaid.render(svgId, code);
        container.innerHTML = `<div class="mermaid flex justify-center w-full overflow-x-auto">${svg}</div>`;
        if (bindFunctions) {
          bindFunctions(container);
        }
      } catch (err) {
        console.warn('Mermaid render error for ' + diagramId + ':', err);
        const dangling = document.getElementById(svgId) || document.getElementById('d' + svgId);
        if (dangling) dangling.remove();

        container.innerHTML = `
          <div class="w-full text-left p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div class="text-xs font-bold text-amber-800 dark:text-amber-300 mb-1 flex items-center gap-1.5">
              <svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              <span>Sơ đồ cú pháp Mermaid</span>
            </div>
            <pre class="text-[11px] font-mono text-slate-800 dark:text-slate-200 overflow-x-auto whitespace-pre p-2 bg-white dark:bg-slate-900 rounded border border-amber-100 dark:border-amber-900/60">${escapeHtml(code)}</pre>
          </div>
        `;
      }
    }
"""

def patch_file(file_path, default_doc):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Replace synchronous mermaid.run block
    old_mermaid_pattern = re.compile(
        r"// Transform Mermaid code blocks[\s\S]*?await mermaid\.run\(\);[\s\S]*?\}\s*catch\s*\(e\)\s*\{[\s\S]*?\}",
        re.MULTILINE
    )
    if old_mermaid_pattern.search(content):
        content = old_mermaid_pattern.sub(LAZY_MERMAID_REPLACEMENT, content)
        print(f"  ✓ Replaced synchronous mermaid.run with lazy observer in {file_path}")
    else:
        print(f"  ⚠ Pattern for old mermaid.run not found in {file_path}")

    # 2. Insert renderSingleMermaidDiagram right before generateToc
    if "async function renderSingleMermaidDiagram" not in content:
        toc_pattern = "    // Generate Dynamic Table of Contents (Right sidebar)"
        if toc_pattern in content:
            content = content.replace(toc_pattern, f"{SINGLE_RENDER_FUNCTION}\n{toc_pattern}")
            print(f"  ✓ Added renderSingleMermaidDiagram to {file_path}")

    # 3. Clean up loose cross-doc matching in handleHashNavigation
    loose_match_pattern = re.compile(
        r"if \(hSlug === cleanSlug \|\| hUnaccent === cleanUnaccent \|\| hSlug\.includes\(cleanSlug\) \|\| cleanSlug\.includes\(hSlug\)\) \{[\s\S]*?// Broad content search fallback[\s\S]*?for \(const \[docId, doc\] of Object\.entries\(window\.MEDIASSIST_DOCS\)\) \{[\s\S]*?\}\s*\}\s*\}",
        re.MULTILINE
    )
    exact_match_replacement = """if (hSlug === cleanSlug || hUnaccent === cleanUnaccent) {
                await selectDocument(docId);
                setTimeout(() => scrollToElement(cleanSlug), 250);
                return;
              }
            }
          }
        }
      }"""
    if loose_match_pattern.search(content):
        content = loose_match_pattern.sub(exact_match_replacement, content)
        print(f"  ✓ Cleaned up loose hash navigation in {file_path}")

    # 4. Set default document
    content = re.sub(
        r"let currentDocId = '[^']+';",
        f"let currentDocId = '{default_doc}';",
        content,
        count=1
    )
    content = re.sub(
        r"await selectDocument\('[^']+'\);",
        f"await selectDocument('{default_doc}');",
        content,
        count=1
    )
    print(f"  ✓ Configured default doc '{default_doc}' in {file_path}")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

for path, doc_id in REPORTS:
    patch_file(path, doc_id)

print("\nDone patching all report index files!")
