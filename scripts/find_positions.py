#!/usr/bin/env python3
"""
Expand the EBSOpenSource curriculum.
Writes new unit/lesson files as TypeScript snippets, then merges them into curriculum-data.ts
using precise line-based insertion instead of string replacement.
"""
import re

FILE = '/home/z/my-project/src/lib/curriculum-data.ts'

with open(FILE, 'r') as f:
    lines = f.readlines()

# Build a line-number index of key positions
def find_line(pattern, start=0):
    """Find the first line number (0-indexed) matching a regex pattern."""
    for i in range(start, len(lines)):
        if re.search(pattern, lines[i]):
            return i
    return -1

def find_line_before(pattern, end_line):
    """Find the last line before end_line matching a pattern."""
    for i in range(end_line - 1, -1, -1):
        if re.search(pattern, lines[i]):
            return i
    return -1

# ============================================================
# Step 1: Find insertion points for new LESSONS in existing units
# ============================================================

# For each thin unit, find the line of `finalProject: {` (the unit's final project)
# The new lesson should be inserted just before the `],` that closes the lessons array,
# which is typically 2 lines before the finalProject line.

insertions = []  # list of (line_index, content_lines)

# --- R Track lesson expansions ---

# r-gg-5: Add to ggplot2 unit (find r-gg-final)
gg_final_line = find_line(r"id: 'r-gg-final'")
# The lessons array `],` is typically a few lines before finalProject
# Walk backward from gg_final_line to find `],` at the correct indent
for i in range(gg_final_line - 1, gg_final_line - 10, -1):
    if lines[i].strip() == '],':
        gg_lessons_close = i
        break

# r-bc-4: Add to Bioconductor unit
bc_final_line = find_line(r"id: 'r-bc-final'")
for i in range(bc_final_line - 1, bc_final_line - 10, -1):
    if lines[i].strip() == '],':
        bc_lessons_close = i
        break

# r-org-4: Add to org.Hs.eg.db unit
org_final_line = find_line(r"id: 'r-org-final'")
for i in range(org_final_line - 1, org_final_line - 10, -1):
    if lines[i].strip() == '],':
        org_lessons_close = i
        break

# --- Python Track lesson expansions ---

# py-np-3: Add to NumPy unit
np_final_line = find_line(r"id: 'py-np-final'")
for i in range(np_final_line - 1, np_final_line - 10, -1):
    if lines[i].strip() == '],':
        np_lessons_close = i
        break

# py-pd-3: Add to pandas unit
pd_final_line = find_line(r"id: 'py-pd-final'")
for i in range(pd_final_line - 1, pd_final_line - 10, -1):
    if lines[i].strip() == '],':
        pd_lessons_close = i
        break

# py-sp-2: Add to SciPy unit
sp_final_line = find_line(r"id: 'py-sp-final'")
for i in range(sp_final_line - 1, sp_final_line - 10, -1):
    if lines[i].strip() == '],':
        sp_lessons_close = i
        break

# py-ml-3: Add to ML unit
ml_final_line = find_line(r"id: 'py-ml-final'")
for i in range(ml_final_line - 1, ml_final_line - 10, -1):
    if lines[i].strip() == '],':
        ml_lessons_close = i
        break

# ============================================================
# Step 2: Find insertion points for new UNITS
# ============================================================

# R Track: Find the end of r-projects unit (last R unit)
r_projects_final_line = find_line(r"id: 'r-projects-final'")
# Find the `},` that closes the r-projects unit (after its finalProject)
# Walk forward from r_projects_final_line to find the closing `},` at indent level 4
for i in range(r_projects_final_line + 1, r_projects_final_line + 40):
    if lines[i].strip() == '},' and lines[i].startswith('    },'):
        r_projects_close = i
        break

# Python Track: Find the end of py-projects unit (last Python unit)
py_projects_final_line = find_line(r"id: 'py-projects-final'")
for i in range(py_projects_final_line + 1, py_projects_final_line + 40):
    if lines[i].strip() == '},' and lines[i].startswith('    },'):
        py_projects_close = i
        break

print(f"R projects close line: {r_projects_close + 1}")
print(f"Python projects close line: {py_projects_close + 1}")
print(f"gg lessons close: {gg_lessons_close + 1}")
print(f"bc lessons close: {bc_lessons_close + 1}")
print(f"org lessons close: {org_lessons_close + 1}")
print(f"np lessons close: {np_lessons_close + 1}")
print(f"pd lessons close: {pd_lessons_close + 1}")
print(f"sp lessons close: {sp_lessons_close + 1}")
print(f"ml lessons close: {ml_lessons_close + 1}")

# Save line positions for the next script
import json
positions = {
    'gg_lessons_close': gg_lessons_close,
    'bc_lessons_close': bc_lessons_close,
    'org_lessons_close': org_lessons_close,
    'np_lessons_close': np_lessons_close,
    'pd_lessons_close': pd_lessons_close,
    'sp_lessons_close': sp_lessons_close,
    'ml_lessons_close': ml_lessons_close,
    'r_projects_close': r_projects_close,
    'py_projects_close': py_projects_close,
}
with open('/home/z/my-project/scripts/insert_positions.json', 'w') as f:
    json.dump(positions, f)

print("Positions saved!")
