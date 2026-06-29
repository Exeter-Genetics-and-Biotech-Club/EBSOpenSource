#!/usr/bin/env python3
"""
Fix the curriculum file - move misplaced lessons inside their correct arrays.
The issue: new lessons were placed AFTER the lessons array `],` instead of BEFORE it.
"""

FILE = '/home/z/my-project/src/lib/curriculum-data.ts'

with open(FILE, 'r') as f:
    content = f.read()

# The pattern that went wrong: new lesson content was placed between
# the lessons array closing `],` and the finalProject.
# We need to move the `],` to after the new lesson.

# Fix pattern: 
#   ],          <- lessons array close (WRONG position)
#     {         <- new lesson (should be inside lessons)
#     ...       
#     },        <- end of new lesson
#   finalProject:
# 
# Should be:
#     {         <- new lesson (now inside lessons)
#     ...
#     },        <- end of new lesson
#   ],          <- lessons array close (correct position)
#   finalProject:

# We need to find each case where a new lesson is between `],` and `finalProject:`
# and move the `],` to after the lesson.

import re

# Strategy: Find patterns where `      ],\n        {\n          id: 'r-gg-5'` or similar
# and fix them by removing the `],` before the lesson and adding it after the lesson's closing `},`

# Let's identify all the misplaced lessons by their IDs
new_lesson_ids = [
    'r-gg-5', 'r-bc-4', 'r-org-4',
    'py-np-3', 'py-pd-3', 'py-sp-2', 'py-ml-3'
]

# For each new lesson, find the pattern and fix it
for lesson_id in new_lesson_ids:
    # Find the lesson start
    lesson_start = content.find(f"id: '{lesson_id}'")
    if lesson_start == -1:
        print(f"WARNING: Could not find lesson {lesson_id}")
        continue
    
    # Find the beginning of this lesson object (the `        {` before `id:`)
    # Go backwards to find the opening brace
    search_start = max(0, lesson_start - 200)
    chunk = content[search_start:lesson_start]
    
    # Find the `      ],\n        {` pattern before the lesson
    # This is the misplaced `],` that closes the lessons array too early
    pattern_pos = chunk.rfind('      ],\n        {')
    if pattern_pos == -1:
        # Try other indent patterns
        pattern_pos = chunk.rfind('    ],\n        {')
    if pattern_pos == -1:
        print(f"WARNING: Could not find misplaced ], for {lesson_id}")
        continue
    
    actual_pos = search_start + pattern_pos
    
    # Remove the `],` line (keep the `        {`)
    # The pattern is `      ],\n        {`
    # We want to replace it with just `        {`
    content = content[:actual_pos] + '        {' + content[actual_pos + len('      ],\n        {'):]
    
    # Now find where this lesson ends and add `],` before finalProject
    # The lesson ends with `        },` followed by `      finalProject:`
    lesson_end_pattern = f"        }},\n      finalProject: {{"
    lesson_end_pos = content.find(lesson_end_pattern, lesson_start)
    if lesson_end_pos == -1:
        print(f"WARNING: Could not find lesson end for {lesson_id}")
        continue
    
    # Insert `      ],\n` before `      finalProject`
    content = content[:lesson_end_pos] + "        },\n      ],\n      finalProject: {" + content[lesson_end_pos + len("        },\n      finalProject: {"):]
    
    print(f"Fixed {lesson_id}")

with open(FILE, 'w') as f:
    f.write(content)

print("All fixes applied!")
print(f"File size: {len(content)} characters")
