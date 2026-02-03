

# Brochure Generation Strategy for InDesign Compatibility

## Recommendation: Dual-Output Approach

The most effective strategy for your workflow is a **two-output system**:

1. **PDF Preview** - For quick sharing, email attachments, and immediate use
2. **IDML Package** - InDesign's native interchange format for full editing capability

---

## Why IDML (Not Gamma, HTML, or DOCX)?

| Format | Pros | Cons |
|--------|------|------|
| **IDML** | Native InDesign format, preserves layout, styles, and structure perfectly | More complex to generate |
| Gamma | Easy to create | Not InDesign-compatible, requires manual recreation |
| HTML | Can be placed in InDesign | Loses precise layout control, requires significant reformatting |
| DOCX | Importable to InDesign | Loses layout, only preserves text structure |
| PDF | Universal, immediate use | Not editable in InDesign without costly plugins |

**IDML is the clear winner** for your use case because:
- InDesign opens it as a native document
- All text, images, styles, and layout are preserved
- You can make any edit without rebuilding from scratch

---

## Technical Implementation

### Approach: Server-Side IDML Generation

IDML files are actually ZIP archives containing XML files. We'll generate these programmatically:

```text
my-brochure.idml (ZIP archive)
├── designmap.xml          (document structure)
├── Resources/
│   ├── Fonts.xml
│   ├── Styles.xml         (paragraph/character styles)
│   └── Graphic.xml
├── Spreads/
│   └── Spread_u123.xml    (page layouts)
├── Stories/
│   └── Story_u456.xml     (text content)
└── META-INF/
    └── container.xml
```

### Edge Function: `generate-listing-brochure`

This function will:
1. Fetch listing data (property details, photos, financials)
2. Generate AI marketing copy via Lovable AI (gemini-3-flash-preview)
3. Build IDML XML structure with predefined styles
4. Package into ZIP and upload to storage
5. Optionally generate PDF preview using existing @react-pdf/renderer

### Database Schema Addition

```text
internal_listing_brochures
├── id, listing_id, created_at, created_by
├── idml_storage_path       (path to .idml file)
├── pdf_storage_path        (path to preview .pdf)
├── template_used           (e.g., "industrial_standard", "retail_premium")
├── ai_copy_version         (snapshot of generated copy)
└── status                  (draft, published)
```

---

## Brochure Templates

We'll create 2-3 base IDML templates that define:
- Page size (Letter or Tabloid)
- Style definitions (headings, body, captions)
- Image placeholder positions
- Color palette (matching your brand)

Templates available:
1. **Industrial Standard** - 2-page, photo-heavy, spec-focused
2. **Retail/Office Premium** - 4-page, lifestyle imagery, detailed amenities
3. **Quick Flyer** - 1-page, single property highlight

---

## User Workflow

```text
1. User opens Listing Profile → Marketing tab
2. Clicks "Generate Brochure"
3. Selects template and tone
4. AI generates property description, broker remarks
5. User previews in browser (PDF render)
6. User can:
   a. Download PDF (immediate use)
   b. Download IDML (open in InDesign for editing)
   c. Regenerate with different tone/template
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/generate-listing-brochure/index.ts` | Main generation logic |
| `supabase/functions/generate-listing-brochure/idml-builder.ts` | IDML XML construction |
| `supabase/functions/generate-listing-brochure/templates/` | Base IDML template XMLs |
| `src/components/internal-listings/BrochureGenerator.tsx` | UI for template selection and preview |
| `src/components/internal-listings/BrochurePreviewDialog.tsx` | PDF preview modal |
| `src/hooks/useListingBrochures.ts` | Brochure CRUD operations |

---

## Storage

- Bucket: `listing-brochures`
- Path pattern: `{org_id}/{listing_id}/{date}-{template}.idml`

---

## Alternative: Canva API (If IDML is Too Complex)

If IDML generation proves too complex, we could integrate **Canva's Connect API** which:
- Provides editable templates
- Exports to PDF, PNG, and can export to formats importable by InDesign
- Requires Canva API key setup

However, IDML gives you **native InDesign files** without third-party dependencies.

---

## Summary

| Output | Format | Use Case |
|--------|--------|----------|
| Preview | PDF | Quick sharing, email, printing |
| Editable | IDML | Full InDesign editing, custom refinements |

This approach gives you the speed of automated brochure generation while preserving complete creative control in InDesign when needed.

