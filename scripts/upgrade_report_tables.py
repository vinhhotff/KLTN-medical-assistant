#!/usr/bin/env python3
"""
Upgrade Table Layout and Robust Anchor Navigation across Report Viewers (report_1 to report_5):
1. Fixes Hash Navigation: Supports double dashes, unaccented matching, leading hashes, and prevents blank viewport.
2. Expands #content-wrapper default width to 1200px (removes cramped max-w-3xl).
3. Adds balanced column layout classes:
   - .table-spec-2col for 2-column Attribute-Value Specification tables.
   - .table-matrix-5col for 5-column Matrix & Description tables (sets min-width: 1100px).
   - ONLY applies .table-stakeholders if table has EXACTLY 4 columns (fixes the 0px column 5 bug!).
   - Column 5 (Descriptions) gets 35% of table width (min-width: 340px) so text breathes without huge vertical height!
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

NEW_CSS = """    /* Balanced layout for 2-column Attribute-Value Specification tables */
    .table-spec-2col {
      table-layout: fixed;
      width: 100%;
    }
    .table-spec-2col th:nth-child(1),
    .table-spec-2col td:nth-child(1) {
      width: 22%;
      min-width: 160px;
      max-width: 220px;
      font-weight: 600;
      background-color: rgba(148, 163, 184, 0.05);
    }
    .table-spec-2col th:nth-child(2),
    .table-spec-2col td:nth-child(2) {
      width: 78%;
    }
    /* Balanced layout for 5-column Matrix & Description tables */
    .table-matrix-5col {
      table-layout: fixed;
      width: 100%;
      min-width: 1100px;
    }
    .table-matrix-5col th:nth-child(1),
    .table-matrix-5col td:nth-child(1) {
      width: 13%;
      min-width: 120px;
      font-weight: 600;
    }
    .table-matrix-5col th:nth-child(2),
    .table-matrix-5col td:nth-child(2) {
      width: 17%;
      min-width: 150px;
    }
    .table-matrix-5col th:nth-child(3),
    .table-matrix-5col td:nth-child(3) {
      width: 14%;
      min-width: 120px;
    }
    .table-matrix-5col th:nth-child(4),
    .table-matrix-5col td:nth-child(4) {
      width: 21%;
      min-width: 190px;
    }
    .table-matrix-5col th:nth-child(5),
    .table-matrix-5col td:nth-child(5) {
      width: 35%;
      min-width: 320px;
    }
"""

SLUG_NORM_CODE = """    // Comprehensive slug normalization for robust anchor matching
    function normalizeSlug(str) {
      if (!str) return '';
      return removeVietnameseAccents(str)
        .toLowerCase()
        .replace(/^#+\\s*/, '')
        .replace(/[`~!@#$%^&*()+=|{}[\]:;\"'<>,.?\\\\/]/g, '')
        .replace(/[\\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .trim();
    }
"""

def upgrade_report(filepath, default_doc):
    if not os.path.exists(filepath):
        print(f"Skipping {filepath} (not found)")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        c = f.read()

    # 1. Update #content-wrapper HTML class (remove max-w-3xl)
    c = c.replace(
        '<div id="content-wrapper" class="w-full max-w-3xl transition-all duration-200 min-w-0">',
        '<div id="content-wrapper" class="w-full transition-all duration-200 min-w-0">'
    )

    # 2. Update #content-wrapper CSS (max-width: 1200px)
    c = re.sub(
        r'#content-wrapper\s*\{\s*width:\s*100%;\s*max-width:\s*\d+px;',
        '#content-wrapper {\n      width: 100%;\n      max-width: 1200px;',
        c
    )
    c = c.replace("wrapper.style.maxWidth = '880px';", "wrapper.style.maxWidth = '1200px';")

    # 3. Replace CSS for table-spec-2col & table-matrix-5col
    if '.table-spec-2col' in c:
        # Replace existing block
        c = re.sub(
            r'/\* Balanced layout for 2-column Attribute-Value Specification tables \*/[\s\S]*?\.table-matrix-5col th:nth-child\(5\)[^}]*\}',
            NEW_CSS.strip(),
            c
        )
    elif '.table-stakeholders {' in c:
        c = c.replace('    .table-stakeholders {', NEW_CSS + '    .table-stakeholders {')

    # 4. Insert normalizeSlug function if not present
    if 'function normalizeSlug(' not in c and 'function slugify(' in c:
        c = c.replace('    function slugify(', SLUG_NORM_CODE + '\n    function slugify(')

    # 5. Fix JS table auto-detection (CRITICAL: colCount === 4 ONLY for table-stakeholders!)
    js_table_detection = """// Auto-detect and optimize table structure
        const firstRowHeader = table.querySelector('thead tr, tr:first-child');
        if (firstRowHeader) {
          const cells = firstRowHeader.querySelectorAll('th, td');
          const colCount = cells.length;
          const headerText = firstRowHeader.textContent.toLowerCase();

          // CRITICAL: Remove any conflicting classes first
          table.classList.remove('table-stakeholders', 'table-spec-2col', 'table-matrix-5col');

          if (colCount === 2 && (headerText.includes('attribute') || headerText.includes('thuộc tính') || headerText.includes('đặc tả'))) {
            table.classList.add('table-spec-2col');
          } else if (colCount === 4 && (headerText.includes('tác nhân') || headerText.includes('actor') || headerText.includes('bản chất & vai trò'))) {
            table.classList.add('table-stakeholders');
          } else if (colCount === 5) {
            table.classList.add('table-matrix-5col');
          }
          if (colCount >= 5) {
            table.style.minWidth = '1100px';
          }"""
    
    c = re.sub(
        r'// Auto-detect and optimize[^\n]*\n\s*const firstRowHeader = table\.querySelector\([^)]+\);\s*if \(firstRowHeader\) \{[\s\S]*?(?=// Compact index)',
        js_table_detection + "\n\n          ",
        c
    )

    # 6. Upgrade handleHashNavigation matching
    hash_old_snippet = """              const cleanUnaccent = removeVietnameseAccents(cleanSlug);
              if (hSlug === cleanSlug || hUnaccent === cleanUnaccent) {
                await selectDocument(docId);
                setTimeout(() => scrollToElement(cleanSlug), 250);
                return;
              }
            }
          }
        }
      }"""
    hash_new_snippet = """              const cleanNorm = normalizeSlug(cleanSlug);
              const hNorm = normalizeSlug(hText);
              if (hNorm === cleanNorm || (cleanNorm.length >= 6 && hNorm.includes(cleanNorm)) || (hNorm.length >= 6 && cleanNorm.includes(hNorm))) {
                await selectDocument(docId);
                setTimeout(() => scrollToElement(cleanSlug), 300);
                return;
              }
            }
          }
        }
      }

      // Fallback: Ensure default document is loaded if viewport is empty
      if (!currentMarkdown) {
        await selectDocument(currentDocId || '""" + default_doc + """');
        setTimeout(() => scrollToElement(cleanSlug), 300);
      }"""
    if hash_old_snippet in c:
        c = c.replace(hash_old_snippet, hash_new_snippet)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"✓ Upgraded table layout & hash navigation for: {filepath}")

if __name__ == '__main__':
    for r, d in REPORTS:
        upgrade_report(r, d)
    print("\nAll 5 report viewers successfully upgraded!")
