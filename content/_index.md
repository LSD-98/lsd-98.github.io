---
# Leave the homepage title empty to use the site title
title: ""
date: 2025-02-12
type: landing

design:
  # Default section spacing
  spacing: "2rem"

sections:
  - block: resume-biography-custom
    content:
      # Choose a user profile to display (a folder name within `content/authors/`)
      username: admin
      text: ""
      # Show a call-to-action button under your biography? (optional)
      #button:
        #text: Download CV
        #url: uploads/resume.pdf
    design:
      css_class: light
      #background:
        #color: navy
        #image:
          # Add your image background to `assets/media/`.
          #filename: stacked-peaks.svg
          #filters:
            #brightness: 1.0
          #size: cover
          #position: center
          #parallax: false
  - block: collection
    id: Updates
    content:
      title: News & Updates
      #subtitle: ''
      text: '**Announcement:** I am conducting a survey of French PE firms regarding their sustainable finance practices. If you are interested in participating (and have not been contacted already), please [send me an email](mailto:leo.denis@polytechnique.edu)!'
      page_type: blog
      # Choose how many pages you would like to display (0 = all pages)
      count: 10
      # Filter on criteria
      filters:
        author: ""
        category: ""
        tag: ""
        exclude_featured: false
        exclude_future: false
        exclude_past: false
        publication_type: ""
      # Choose how many pages you would like to offset by
      offset: 0
      # Page order: descending (desc) or ascending (asc) date.
      order: desc
    design:
      # Choose a layout view
      view: date-title-summary
      # Reduce spacing
      spacing:
        padding: [0, 0, 0, 0]
---