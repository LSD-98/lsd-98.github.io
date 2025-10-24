---
title: 'Research'
date: 2025-01-22
type: landing

design:
  # Section spacing
  spacing: '4rem'

# Page sections
sections:
  - block: collection
    id: working_papers
    content:
      title: Working Papers
      filters:
        folders:
          - projects
    design:
      view: article-grid
      columns: 1
  - block: collection
    content:
      title: Publications
      filters:
        folders:
          - publications
    design:
      view: citation
---