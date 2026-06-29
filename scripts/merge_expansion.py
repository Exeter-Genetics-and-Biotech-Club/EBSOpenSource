#!/usr/bin/env python3
"""
Merge expansion content into curriculum-data.ts using line-based insertion.
"""

import json
import re

CURRICULUM_FILE = '/home/z/my-project/src/lib/curriculum-data.ts'
R_EXPANSION_FILE = '/home/z/my-project/scripts/r_expansion.ts'
PY_EXPANSION_FILE = '/home/z/my-project/scripts/py_expansion.ts'
POSITIONS_FILE = '/home/z/my-project/scripts/insert_positions.json'

with open(CURRICULUM_FILE, 'r') as f:
    lines = f.readlines()

with open(POSITIONS_FILE, 'r') as f:
    positions = json.load(f)

# ============================================================
# Helper: Extract sections from expansion files by marker comments
# ============================================================

def extract_sections(filepath):
    """Parse expansion file into a dict of section_name -> list of lines."""
    with open(filepath, 'r') as f:
        content = f.read()
    
    sections = {}
    # Split by marker comments like: // === LESSON: r-gg-5 ... ===
    # or: // === UNIT: r-deseq2 ... ===
    parts = re.split(r'// === (LESSON|UNIT): (\S+?) .*? ===\n', content)
    
    # parts alternates: [preamble, type1, name1, content1, type2, name2, content2, ...]
    i = 1  # skip preamble
    while i < len(parts) - 1:
        section_type = parts[i]
        section_name = parts[i+1]
        section_content = parts[i+2]
        sections[section_name] = section_content.splitlines(True)  # keep newlines
        i += 3
    
    return sections

r_sections = extract_sections(R_EXPANSION_FILE)
py_sections = extract_sections(PY_EXPANSION_FILE)

print(f"R sections found: {list(r_sections.keys())}")
print(f"Python sections found: {list(py_sections.keys())}")

# ============================================================
# Build insertions: list of (line_index, content_lines) 
# Process from bottom to top so line indices stay valid
# ============================================================

insertions = []

# --- R Track lesson insertions (before lessons array close) ---
for lesson_id, pos_key in [
    ('r-gg-5', 'gg_lessons_close'),
    ('r-bc-4', 'bc_lessons_close'),
    ('r-org-4', 'org_lessons_close'),
]:
    if lesson_id in r_sections:
        # Insert BEFORE the `],` that closes the lessons array
        insert_line = positions[pos_key]
        content_lines = r_sections[lesson_id]
        # Add a comma+newline before the content if the previous line doesn't end with comma
        # The content should start with the lesson object, we need a comma after the previous lesson
        insertions.append((insert_line, content_lines, lesson_id))
    else:
        print(f"WARNING: {lesson_id} not found in R expansion file")

# --- Python Track lesson insertions ---
for lesson_id, pos_key in [
    ('py-np-3', 'np_lessons_close'),
    ('py-pd-3', 'pd_lessons_close'),
    ('py-sp-2', 'sp_lessons_close'),
    ('py-ml-3', 'ml_lessons_close'),
]:
    if lesson_id in py_sections:
        insert_line = positions[pos_key]
        content_lines = py_sections[lesson_id]
        insertions.append((insert_line, content_lines, lesson_id))
    else:
        print(f"WARNING: {lesson_id} not found in Python expansion file")

# --- R Track new unit insertions (after r-projects unit close) ---
r_unit_order = ['r-deseq2', 'r-rmarkdown', 'r-biostrings', 'r-survival']
r_unit_lines = []
for unit_id in r_unit_order:
    if unit_id in r_sections:
        r_unit_lines.append(r_sections[unit_id])
    else:
        print(f"WARNING: {unit_id} not found in R expansion file")

# Insert after r-projects close
# We need to insert all 4 units after the r-projects closing `},`
insertions.append((positions['r_projects_close'] + 1, 
                   [l for unit_lines in r_unit_lines for l in unit_lines],
                   'R new units'))

# --- Python Track new unit insertions (after py-projects unit close) ---
py_unit_order = ['py-viz', 'py-biopython', 'py-dl', 'py-network']
py_unit_lines = []
for unit_id in py_unit_order:
    if unit_id in py_sections:
        py_unit_lines.append(py_sections[unit_id])
    else:
        print(f"WARNING: {unit_id} not found in Python expansion file")

insertions.append((positions['py_projects_close'] + 1,
                   [l for unit_lines in py_unit_lines for l in unit_lines],
                   'Python new units'))

# ============================================================
# Sort insertions by line index (descending) to preserve indices
# ============================================================

insertions.sort(key=lambda x: x[0], reverse=True)

# ============================================================
# Apply insertions
# ============================================================

for insert_line, content_lines, name in insertions:
    # For lesson insertions: insert before the `],` line
    # We need to ensure the previous lesson has a trailing comma
    
    # Check if the line before insert_line ends with a comma
    prev_line = lines[insert_line - 1].rstrip()
    if not prev_line.endswith(','):
        # Add comma to the previous line
        lines[insert_line - 1] = lines[insert_line - 1].rstrip() + ',\n'
    
    # Insert the content lines before the `],` line
    for i, line in enumerate(content_lines):
        lines.insert(insert_line + i, line)
    
    print(f"Inserted {name} at line {insert_line} ({len(content_lines)} lines)")

# Write the result
with open(CURRICULUM_FILE, 'w') as f:
    f.writelines(lines)

print(f"\nExpansion complete! File now has {len(lines)} lines")
