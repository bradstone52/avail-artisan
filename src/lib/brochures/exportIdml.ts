/**
 * exportIdml.ts
 *
 * Generates an Adobe InDesign IDML file (InDesign Markup Language) from
 * a BrochureData object.  IDML is a ZIP archive containing XML files that
 * InDesign CS4+ can open natively for further editing.
 *
 * Layout produced (US Letter, 3 pages):
 *   Page 1 – Cover  : hero image, address, headline, description, secondary photo
 *   Page 2 – Specs  : property details table, pricing, map image
 *   Page 3 – Highlights : snapshot band, key highlights, gallery strip
 *
 * Coordinate system:
 *   InDesign uses points (1 pt = 1/72 inch).
 *   US Letter = 612 × 792 pt.
 *   Margins: 36 pt (0.5 in) left/right, 40 pt top (below header), 50 pt bottom (above footer).
 *
 * IMPORTANT – IMAGE LINKING:
 *   InDesign does not embed web URLs; images are linked to local file paths.
 *   We export image URLs as href attributes on <Link> elements.
 *   When opened in InDesign, images will show as "missing" until the user
 *   runs Edit → Find/Replace Links or re-links them from their local disk.
 *   This is standard InDesign behaviour for externally linked images.
 */

import JSZip from 'jszip';
import type { BrochureData } from './brochureTypes';

// ─── Constants ───────────────────────────────────────────────────────────────

const W  = 612;   // page width (pt)
const H  = 792;   // page height (pt)
const ML = 36;    // margin left
const MR = 36;    // margin right
const MT = 40;    // margin top (content area, below header)
const MB = 50;    // margin bottom
const CW = W - ML - MR;  // content width = 540 pt
const CH = H - MT - MB;  // content height = 702 pt

// Brand colours (CMYK approximations)
const ACCENT_CMYK  = { c: 89, m: 62, y: 0,  k: 37 };  // #1e3a5f
const YELLOW_CMYK  = { c: 0,  m: 34, y: 100, k: 15 }; // #d97706
const WHITE_CMYK   = { c: 0,  m: 0,  y: 0,  k: 0  };
const BLACK_CMYK   = { c: 0,  m: 0,  y: 0,  k: 90 };
const MID_CMYK     = { c: 0,  m: 0,  y: 0,  k: 60 };
const LIGHT_BG_CMYK = { c: 5, m: 3,  y: 0,  k: 5  };  // #f2f2f2

// ─── Utility helpers ─────────────────────────────────────────────────────────

let _uid = 1000;
function uid(): string { return `u${_uid++}`; }

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;');
}

function cmyk({ c, m, y, k }: { c: number; m: number; y: number; k: number }): string {
  return `<Color Self=\"Color/${c}${m}${y}${k}\" ColorValue=\"${c} ${m} ${y} ${k}\" Model=\"Process\" Space=\"CMYK\" />`;
}

function pt(n: number): string { return n.toFixed(3); }

// Frame geometry helper: x, y, width, height → PathGeometry
function rectPath(x: number, y: number, w: number, h: number): string {
  return `
    <PathGeometry>
      <GeometryPathType PathOpen=\"false\">
        <PathPointArray>
          <PathPointType Anchor=\"${pt(x)} ${pt(y)}\" LeftDirection=\"${pt(x)} ${pt(y)}\" RightDirection=\"${pt(x)} ${pt(y)}\" />
          <PathPointType Anchor=\"${pt(x+w)} ${pt(y)}\" LeftDirection=\"${pt(x+w)} ${pt(y)}\" RightDirection=\"${pt(x+w)} ${pt(y)}\" />
          <PathPointType Anchor=\"${pt(x+w)} ${pt(y+h)}\" LeftDirection=\"${pt(x+w)} ${pt(y+h)}\" RightDirection=\"${pt(x+w)} ${pt(y+h)}\" />
          <PathPointType Anchor=\"${pt(x)} ${pt(y+h)}\" LeftDirection=\"${pt(x)} ${pt(y+h)}\" RightDirection=\"${pt(x)} ${pt(y+h)}\" />
        </PathPointArray>
      </GeometryPathType>
    </PathGeometry>`;
}

// Minimal text frame XML
function textFrame(
  id: string,
  x: number, y: number, w: number, h: number,
  styleRef: string,
  content: string,
  extra = ''
): string {
  const tid = `${id}_story`;
  return `
  <TextFrame Self=\"${id}\" ParentStory=\"${tid}\"
    ItemTransform=\"1 0 0 1 ${pt(x)} ${pt(y)}\"
    AppliedObjectStyle=\"ObjectStyle/$ID/[None]\"
    ContentType=\"TextType\"
    ${extra}>
    <Properties>
      <PathGeometry>${rectPath(0, 0, w, h).trim()}</PathGeometry>
    </Properties>
  </TextFrame>
  <Story Self=\"${tid}\" AppliedTOCStyle=\"n\" TrackChanges=\"false\"
    StoryTitle=\"\" AppliedNamedGrid=\"n\">
    <StoryPreference OpticalMarginAlignment=\"false\" OpticalMarginSize=\"12\" />
    <InCopyExportOption IncludeGraphicProxies=\"true\" IncludeAllResources=\"false\" />
    <ParagraphStyleRange AppliedParagraphStyle=\"ParagraphStyle/${styleRef}\">
      <CharacterStyleRange AppliedCharacterStyle=\"CharacterStyle/$ID/[No character style]\">
        <Content>${esc(content)}</Content>
      </CharacterStyleRange>
    </ParagraphStyleRange>
  </Story>`;
}

// Image frame XML (link by URL — will show as missing until re-linked locally)
function imageFrame(
  id: string,
  x: number, y: number, w: number, h: number,
  href: string
): string {
  const imgId = `${id}_img`;
  return `
  <Rectangle Self=\"${id}\"
    ItemTransform=\"1 0 0 1 ${pt(x)} ${pt(y)}\"
    AppliedObjectStyle=\"ObjectStyle/$ID/[None]\"
    ContentType=\"GraphicType\">
    <Properties>
      <PathGeometry>${rectPath(0, 0, w, h).trim()}</PathGeometry>
    </Properties>
    <Image Self=\"${imgId}\" AppliedObjectStyle=\"ObjectStyle/$ID/[None]\"
      ItemTransform=\"1 0 0 1 0 0\">
      <Properties>
        <Profile type=\"string\">$ID/Embedded</Profile>
      </Properties>
      <Link Self=\"${imgId}_lnk\" LinkResourceURI=\"${esc(href)}\"
        StoredState=\"Normal\" LinkResourceFormat=\"$ID/JPEG\" />
    </Image>
  </Rectangle>`;
}

// Filled rectangle (colour bar)
function filledRect(
  id: string,
  x: number, y: number, w: number, h: number,
  fillSwatch: string
): string {
  return `
  <Rectangle Self=\"${id}\"
    ItemTransform=\"1 0 0 1 ${pt(x)} ${pt(y)}\"
    AppliedObjectStyle=\"ObjectStyle/$ID/[None]\"
    FillColor=\"Color/${fillSwatch}\"
    StrokeWeight=\"0\"
    ContentType=\"Unassigned\">
    <Properties>
      <PathGeometry>${rectPath(0, 0, w, h).trim()}</PathGeometry>
    </Properties>
  </Rectangle>`;
}

// ─── Stories (text content) builder ──────────────────────────────────────────

function buildStories(data: BrochureData): string {
  const frames: string[] = [];

  // ── PAGE 1 ──────────────────────────────────────────────────────────────────

  // Header bar background
  frames.push(filledRect('hdrBg', 0, 0, W, 50, 'White'));

  // Logo placeholder text (InDesign user replaces with actual logo graphic)
  frames.push(textFrame('logoTxt', ML, 11, 180, 28, 'Company', 'CLEARVIEW COMMERCIAL REALTY'));

  // Deal type badge
  frames.push(filledRect('dealBadge', W - MR - 100, 12, 100, 26, 'Accent'));
  frames.push(textFrame('dealBadgeTxt', W - MR - 100, 12, 100, 26, 'DealTypeBadge', data.dealTypeLabel));

  // Hero image
  const heroUrl = data.cover.heroPhotoUrl ?? '';
  frames.push(imageFrame('heroImg', 0, 50, W, 240, heroUrl));

  // Address
  frames.push(textFrame('address', ML, 302, CW, 28, 'Address', data.cover.displayAddress));

  // Subline (city | submarket)
  const subline = `${data.cover.city}, Alberta  |  ${data.cover.submarket}`;
  frames.push(textFrame('subline', ML, 332, CW, 16, 'Subline', subline));

  // Yellow accent bar (drawn as thin rectangle)
  frames.push(filledRect('accentBar', ML, 352, 50, 3, 'Yellow'));

  // Headline
  frames.push(textFrame('headline', ML, 360, CW, 36, 'Headline', data.copy.headline));

  // Two-column body: description left, tagline right
  const colW = (CW - 16) / 2;
  frames.push(textFrame('descBody', ML, 400, colW, 180, 'Body', data.copy.description));
  frames.push(textFrame('taglineBody', ML + colW + 16, 400, colW, 60, 'Tagline', data.copy.tagline));

  // Secondary photo (right column, below tagline)
  if (data.cover.secondaryPhotoUrl) {
    frames.push(imageFrame('secondaryImg', ML + colW + 16, 468, colW, 120, data.cover.secondaryPhotoUrl));
  }

  // Footer
  frames.push(filledRect('ftDivider1', ML, H - MB, CW, 0.75, 'Mid'));
  frames.push(textFrame('ftLeft1', ML, H - MB + 6, 200, 14, 'Footer',
    `${data.cover.displayAddress}, ${data.cover.city}`));
  frames.push(textFrame('ftRight1', ML + 200, H - MB + 6, CW - 200, 28, 'Disclaimer', data.disclaimer));

  // ── PAGE 2 (offset y by 792) ─────────────────────────────────────────────────
  // NOTE: In IDML, each spread/page is a separate coordinate space.
  // We'll place them all in a single spread to keep the generator simple;
  // InDesign will paginate on import if we use separate Spread elements.
  // Instead we build separate <Spread> elements (see buildSpreads).

  return frames.join('\n');
}

// ─── Spread builder ───────────────────────────────────────────────────────────

function buildSpreadPage1(data: BrochureData): string {
  const heroUrl = data.cover.heroPhotoUrl ?? '';
  const colW = (CW - 16) / 2;
  const pid = 'p1';

  const items: string[] = [];

  // Header bg
  items.push(filledRect(`${pid}_hdrBg`, 0, 0, W, 50, 'White'));
  items.push(textFrame(`${pid}_logoTxt`, ML, 11, 180, 28, 'Company', 'CLEARVIEW COMMERCIAL REALTY'));
  items.push(filledRect(`${pid}_dealBg`, W - MR - 110, 12, 110, 26, 'Accent'));
  items.push(textFrame(`${pid}_dealTxt`, W - MR - 110, 12, 110, 26, 'DealTypeBadge', data.dealTypeLabel));

  // Hero image
  if (heroUrl) items.push(imageFrame(`${pid}_hero`, 0, 50, W, 240, heroUrl));

  // Address block
  items.push(textFrame(`${pid}_addr`, ML, 302, CW, 28, 'Address', data.cover.displayAddress));
  items.push(textFrame(`${pid}_sub`, ML, 330, CW, 16, 'Subline',
    `${data.cover.city}, Alberta  |  ${data.cover.submarket}`));
  items.push(filledRect(`${pid}_bar`, ML, 350, 50, 3, 'Yellow'));
  items.push(textFrame(`${pid}_hl`, ML, 358, CW, 36, 'Headline', data.copy.headline));

  // Two-col
  items.push(textFrame(`${pid}_desc`, ML, 400, colW, 200, 'Body', data.copy.description));
  items.push(textFrame(`${pid}_tag`, ML + colW + 16, 400, colW, 60, 'Tagline', data.copy.tagline));
  if (data.cover.secondaryPhotoUrl) {
    items.push(imageFrame(`${pid}_sec`, ML + colW + 16, 464, colW, 120, data.cover.secondaryPhotoUrl));
  }

  // Footer
  items.push(textFrame(`${pid}_ft`, ML, H - MB + 6, CW * 0.35, 14, 'Footer',
    `${data.cover.displayAddress}, ${data.cover.city}`));
  items.push(textFrame(`${pid}_dis`, ML + CW * 0.35, H - MB + 4, CW * 0.65, 28, 'Disclaimer', data.disclaimer));

  return buildSpreadXml('spr1', `pg_${pid}`, items);
}

function buildSpreadPage2(data: BrochureData): string {
  const pid = 'p2';
  const items: string[] = [];
  const leftW  = CW * 0.6;
  const rightW = CW * 0.38;
  const rightX = ML + leftW + CW * 0.02;

  // Header
  items.push(filledRect(`${pid}_hdrBg`, 0, 0, W, 50, 'White'));
  items.push(textFrame(`${pid}_logoTxt`, ML, 11, 180, 28, 'Company', 'CLEARVIEW COMMERCIAL REALTY'));
  items.push(filledRect(`${pid}_dealBg`, W - MR - 110, 12, 110, 26, 'Accent'));
  items.push(textFrame(`${pid}_dealTxt`, W - MR - 110, 12, 110, 26, 'DealTypeBadge', data.dealTypeLabel));

  // Section title: Property Details
  items.push(textFrame(`${pid}_specTitle`, ML, MT, leftW, 16, 'SectionTitle', 'PROPERTY DETAILS'));

  // Spec rows
  let sy = MT + 22;
  const rowH = 18;
  data.specs.forEach((row, i) => {
    const bg = i % 2 === 0 ? 'LightBg' : 'White';
    items.push(filledRect(`${pid}_specBg${i}`, ML, sy, leftW, rowH, bg));
    items.push(textFrame(`${pid}_specL${i}`, ML + 4, sy + 3, leftW * 0.38, rowH - 4, 'SpecLabel', row.label));
    items.push(textFrame(`${pid}_specV${i}`, ML + leftW * 0.38 + 4, sy + 3, leftW * 0.62 - 8, rowH - 4, 'SpecValue', row.value));
    sy += rowH;
  });

  // Features
  if (data.features.length > 0) {
    sy += 8;
    items.push(filledRect(`${pid}_featBg`, ML, sy, leftW, data.features.length * 16 + 12, 'LightBg'));
    items.push(filledRect(`${pid}_featAccent`, ML, sy, 3, data.features.length * 16 + 12, 'Accent'));
    data.features.forEach((f, i) => {
      items.push(textFrame(`${pid}_feat${i}`, ML + 10, sy + 6 + i * 16, leftW - 14, 14, 'Feature', `✓  ${f}`));
    });
    sy += data.features.length * 16 + 16;
  }

  // Financials
  if (data.financials.length > 0) {
    items.push(textFrame(`${pid}_finTitle`, ML, sy, leftW, 16, 'SectionTitle', 'ADDITIONAL COSTS'));
    sy += 22;
    data.financials.forEach((row, i) => {
      const bg = i % 2 === 0 ? 'LightBg' : 'White';
      items.push(filledRect(`${pid}_finBg${i}`, ML, sy, leftW, rowH, bg));
      items.push(textFrame(`${pid}_finL${i}`, ML + 4, sy + 3, leftW * 0.45, rowH - 4, 'SpecLabel', row.label));
      items.push(textFrame(`${pid}_finV${i}`, ML + leftW * 0.45 + 4, sy + 3, leftW * 0.55 - 8, rowH - 4, 'SpecValue', row.value));
      sy += rowH;
    });
  }

  // Right column: Pricing
  let ry = MT;
  if (data.pricing.show) {
    items.push(textFrame(`${pid}_pricingTitle`, rightX, ry, rightW, 16, 'SectionTitle', 'PRICING'));
    ry += 22;
    if (data.pricing.rent) {
      items.push(filledRect(`${pid}_rentBg`, rightX, ry, rightW, 52, 'Accent'));
      items.push(textFrame(`${pid}_rentLbl`, rightX + 8, ry + 6, rightW - 16, 12, 'PricingLabel', 'ASKING RENT'));
      items.push(textFrame(`${pid}_rentVal`, rightX + 8, ry + 22, rightW - 16, 22, 'PricingValue', data.pricing.rent));
      ry += 60;
    }
    if (data.pricing.price) {
      items.push(filledRect(`${pid}_priceBg`, rightX, ry, rightW, 52, 'Accent'));
      items.push(textFrame(`${pid}_priceLbl`, rightX + 8, ry + 6, rightW - 16, 12, 'PricingLabel', 'ASKING PRICE'));
      items.push(textFrame(`${pid}_priceVal`, rightX + 8, ry + 22, rightW - 16, 22, 'PricingValue', data.pricing.price));
      ry += 60;
    }
    ry += 10;
  }

  // Map
  if (data.location.staticMapUrl) {
    items.push(textFrame(`${pid}_mapTitle`, rightX, ry, rightW, 16, 'SectionTitle', 'LOCATION'));
    ry += 22;
    items.push(imageFrame(`${pid}_map`, rightX, ry, rightW, rightW * (9/16), data.location.staticMapUrl));
    ry += rightW * (9/16) + 4;
    items.push(textFrame(`${pid}_mapCap`, rightX, ry, rightW, 12, 'Caption',
      `${data.cover.displayAddress}, ${data.cover.city}`));
  }

  // Footer
  items.push(textFrame(`${pid}_ft`, ML, H - MB + 6, CW * 0.35, 14, 'Footer',
    `${data.cover.displayAddress}, ${data.cover.city}`));
  items.push(textFrame(`${pid}_dis`, ML + CW * 0.35, H - MB + 4, CW * 0.65, 28, 'Disclaimer', data.disclaimer));

  return buildSpreadXml('spr2', `pg_${pid}`, items);
}

function buildSpreadPage3(data: BrochureData): string {
  const pid = 'p3';
  const items: string[] = [];

  // Header
  items.push(filledRect(`${pid}_hdrBg`, 0, 0, W, 50, 'White'));
  items.push(textFrame(`${pid}_logoTxt`, ML, 11, 180, 28, 'Company', 'CLEARVIEW COMMERCIAL REALTY'));
  items.push(filledRect(`${pid}_dealBg`, W - MR - 110, 12, 110, 26, 'Accent'));
  items.push(textFrame(`${pid}_dealTxt`, W - MR - 110, 12, 110, 26, 'DealTypeBadge', data.dealTypeLabel));

  // Snapshot band
  let cy = MT;
  if (data.snapshots.length > 0) {
    const snaps = data.snapshots.slice(0, 6);
    const cellW = CW / snaps.length;
    items.push(filledRect(`${pid}_snapBand`, ML, cy, CW, 50, 'Accent'));
    snaps.forEach((snap, i) => {
      const cx = ML + i * cellW;
      items.push(textFrame(`${pid}_snapL${i}`, cx + 4, cy + 6, cellW - 8, 12, 'SnapshotLabel', snap.label.toUpperCase()));
      items.push(textFrame(`${pid}_snapV${i}`, cx + 4, cy + 20, cellW - 8, 22, 'SnapshotValue', snap.value));
    });
    cy += 58;
  }

  // Key Highlights
  items.push(textFrame(`${pid}_hlTitle`, ML, cy, CW, 16, 'SectionTitle', 'KEY HIGHLIGHTS'));
  cy += 22;

  const leftH  = data.copy.highlights.filter((_, i) => i % 2 === 0);
  const rightH = data.copy.highlights.filter((_, i) => i % 2 === 1);
  const hlColW = (CW - 16) / 2;

  leftH.forEach((h, i) => {
    const fy = cy + i * 24;
    items.push(filledRect(`${pid}_sqL${i}`, ML, fy + 4, 5, 5, 'Yellow'));
    items.push(textFrame(`${pid}_hlL${i}`, ML + 12, fy, hlColW - 12, 22, 'Body', h));
  });
  rightH.forEach((h, i) => {
    const fy = cy + i * 24;
    items.push(filledRect(`${pid}_sqR${i}`, ML + hlColW + 16, fy + 4, 5, 5, 'Yellow'));
    items.push(textFrame(`${pid}_hlR${i}`, ML + hlColW + 28, fy, hlColW - 12, 22, 'Body', h));
  });

  const hlRows = Math.max(leftH.length, rightH.length);
  cy += hlRows * 24 + 16;

  // Gallery strip
  const stripPhotos = data.gallery.slice(0, 3);
  if (stripPhotos.length > 0) {
    const photoW = (CW - (stripPhotos.length - 1) * 8) / stripPhotos.length;
    stripPhotos.forEach((p, i) => {
      items.push(imageFrame(`${pid}_gal${i}`, ML + i * (photoW + 8), cy, photoW, 110, p.photo_url));
    });
    cy += 118;
  }

  // Broker notes (confidential)
  if (data.broker.includeNotes && data.broker.notes) {
    items.push(filledRect(`${pid}_brkBg`, ML, cy, CW, 60, 'ConfBg'));
    items.push(filledRect(`${pid}_brkBar`, ML, cy, 3, 60, 'Yellow'));
    items.push(textFrame(`${pid}_brkTitle`, ML + 10, cy + 6, CW - 14, 12, 'ConfidentialTitle',
      'CONFIDENTIAL — BROKER NOTES'));
    items.push(textFrame(`${pid}_brkNotes`, ML + 10, cy + 22, CW - 14, 34, 'Body', data.broker.notes));
    cy += 68;
  }

  // Footer
  items.push(textFrame(`${pid}_ft`, ML, H - MB + 6, CW * 0.35, 14, 'Footer',
    `${data.cover.displayAddress}, ${data.cover.city}`));
  items.push(textFrame(`${pid}_dis`, ML + CW * 0.35, H - MB + 4, CW * 0.65, 28, 'Disclaimer', data.disclaimer));

  return buildSpreadXml('spr3', `pg_${pid}`, items);
}

function buildSpreadXml(spreadId: string, pageId: string, items: string[]): string {
  return `<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>
<idPkg:Spread xmlns:idPkg=\"http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging\"
  DOMVersion=\"18.0\">
  <Spread Self=\"${spreadId}\"
    AllowPageShuffle=\"true\"
    PageTransitionType=\"None\"
    PageTransitionDirection=\"NotApplicable\"
    PageTransitionDuration=\"Medium\"
    ShowMasterItems=\"true\"
    PageCount=\"1\"
    BindingLocation=\"0\"
    AllowPageShuffle=\"true\">
    <Page Self=\"${pageId}\"
      AppliedTrapPreset=\"TrapPreset/$ID/[No Trap Preset]\"
      Name=\"1\"
      GeometricBounds=\"0 0 ${pt(H)} ${pt(W)}\"
      ItemTransform=\"1 0 0 1 0 0\"
      MasterPageTransform=\"1 0 0 1 0 0\"
      AppliedMaster=\"MasterSpread/$ID/[None]\"
      TabOrder=\"\">
      <Properties>
        <Descriptor type=\"list\">
          <ListItem type=\"string\">${pageId}</ListItem>
        </Descriptor>
        <PageColor type=\"enumeration\">UseMasterColor</PageColor>
      </Properties>
    </Page>
    ${items.join('\n')}
  </Spread>
</idPkg:Spread>`;
}

// ─── Paragraph / Character Styles ────────────────────────────────────────────

function buildStyles(): string {
  const styles = [
    { name: 'Address',           size: 18, weight: 'Bold',    color: 'Black',  leading: 22 },
    { name: 'Subline',           size: 10, weight: 'Regular', color: 'Mid',    leading: 13 },
    { name: 'Headline',          size: 14, weight: 'Bold',    color: 'Accent', leading: 18 },
    { name: 'Tagline',           size: 10, weight: 'Regular', color: 'Accent', leading: 13 },
    { name: 'Body',              size:  8.5, weight: 'Regular', color: 'Black', leading: 13 },
    { name: 'SectionTitle',      size: 10, weight: 'Bold',    color: 'Accent', leading: 13 },
    { name: 'SpecLabel',         size:  7.5, weight: 'Bold',  color: 'Mid',    leading: 11 },
    { name: 'SpecValue',         size:  8.5, weight: 'Regular', color: 'Black', leading: 11 },
    { name: 'PricingLabel',      size:  6.5, weight: 'Regular', color: 'White', leading: 9 },
    { name: 'PricingValue',      size: 14, weight: 'Bold',    color: 'White',  leading: 17 },
    { name: 'SnapshotLabel',     size:  6,  weight: 'Regular', color: 'White', leading: 8 },
    { name: 'SnapshotValue',     size: 11, weight: 'Bold',    color: 'White',  leading: 14 },
    { name: 'Feature',           size:  7.5, weight: 'Regular', color: 'Accent', leading: 11 },
    { name: 'Caption',           size:  6.5, weight: 'Regular', color: 'Mid',  leading: 9 },
    { name: 'Footer',            size:  6.5, weight: 'Regular', color: 'Mid',  leading: 9 },
    { name: 'Disclaimer',        size:  5,  weight: 'Regular', color: 'Mid',   leading: 7 },
    { name: 'DealTypeBadge',     size:  8,  weight: 'Bold',   color: 'White',  leading: 10 },
    { name: 'Company',           size:  9,  weight: 'Bold',   color: 'Accent', leading: 11 },
    { name: 'ConfidentialTitle', size:  7.5, weight: 'Bold',  color: 'Black',  leading: 10 },
  ];

  return `<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>
<idPkg:Styles xmlns:idPkg=\"http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging\"
  DOMVersion=\"18.0\">
  <RootParagraphStyleGroup Self=\"ParagraphStyleGroup/$ID/[Root]\">
    <ParagraphStyle Self=\"ParagraphStyle/$ID/[No paragraph style]\"
      Name=\"[No paragraph style]\"
      IsDefault=\"true\" />
    <ParagraphStyle Self=\"ParagraphStyle/$ID/NormalParagraphStyle\"
      Name=\"NormalParagraphStyle\" />
${styles.map(st => `    <ParagraphStyle
      Self=\"ParagraphStyle/${st.name}\"
      Name=\"${st.name}\"
      PointSize=\"${st.size}\"
      FontStyle=\"${st.weight}\"
      FillColor=\"Color/${st.color}\"
      Leading=\"${st.leading}\"
      HyphenateCapitalizedWords=\"false\"
      Justification=\"LeftAlign\" />`).join('\n')}
  </RootParagraphStyleGroup>
  <RootCharacterStyleGroup Self=\"CharacterStyleGroup/$ID/[Root]\">
    <CharacterStyle Self=\"CharacterStyle/$ID/[No character style]\"
      Name=\"[No character style]\"
      IsDefault=\"true\" />
  </RootCharacterStyleGroup>
</idPkg:Styles>`;
}

// ─── Graphic styles ───────────────────────────────────────────────────────────

function buildGraphicStyles(): string {
  return `<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>
<idPkg:Graphic xmlns:idPkg=\"http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging\"
  DOMVersion=\"18.0\">
  <StrokeStyle Self=\"StrokeStyle/$ID/Solid\" />
  <DashedStrokeStyle Self=\"DashedStrokeStyle/$ID/Japanese Dots\" />
</idPkg:Graphic>`;
}

// ─── Fonts stub ───────────────────────────────────────────────────────────────

function buildFonts(): string {
  return `<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>
<idPkg:Fonts xmlns:idPkg=\"http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging\"
  DOMVersion=\"18.0\">
  <FontFamily Self=\"FontFamily/Helvetica\" Name=\"Helvetica\">
    <Font Self=\"Font/Helvetica Regular\" PostScriptName=\"Helvetica\" />
    <Font Self=\"Font/Helvetica Bold\" PostScriptName=\"Helvetica-Bold\" />
  </FontFamily>
</idPkg:Fonts>`;
}

// ─── Preferences ─────────────────────────────────────────────────────────────

function buildPreferences(): string {
  return `<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>
<idPkg:Preferences xmlns:idPkg=\"http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging\"
  DOMVersion=\"18.0\">
  <ViewPreference ShowRulers=\"true\" HorizontalMeasurementUnits=\"Points\"
    VerticalMeasurementUnits=\"Points\" />
  <DocumentPreference PageWidth=\"${pt(W)}\" PageHeight=\"${pt(H)}\"
    PageOrientation=\"Portrait\" DocumentBleedTopOffset=\"0\"
    DocumentBleedBottomOffset=\"0\" DocumentBleedInsideOrLeftOffset=\"0\"
    DocumentBleedOutsideOrRightOffset=\"0\"
    PagesPerDocument=\"3\" />
</idPkg:Preferences>`;
}

// ─── Swatches ────────────────────────────────────────────────────────────────

function buildSwatches(): string {
  const swatches: Array<{ name: string; c: number; m: number; y: number; k: number }> = [
    { name: 'Accent',  ...ACCENT_CMYK },
    { name: 'Yellow',  ...YELLOW_CMYK },
    { name: 'White',   ...WHITE_CMYK },
    { name: 'Black',   ...BLACK_CMYK },
    { name: 'Mid',     ...MID_CMYK },
    { name: 'LightBg', ...LIGHT_BG_CMYK },
    { name: 'ConfBg',  c: 0, m: 6, y: 22, k: 0 },
  ];

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:Graphic xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging"
  DOMVersion="18.0">
${swatches.map(sw => {
    const cmykVal = `${sw.c} ${sw.m} ${sw.y} ${sw.k}`;
    return `  <Color Self="Color/${sw.name}" Name="${sw.name}"
    ColorValue="${cmykVal}" Model="Process" Space="CMYK" />`;
  }).join('\n')}
  <Swatch Self="Swatch/None" Name="None" />
  <Swatch Self="Swatch/Paper" Name="Paper" />
  <Swatch Self="Swatch/Black" Name="Black" />
  <Swatch Self="Swatch/Registration" Name="Registration" />
</idPkg:Graphic>`;
}

// ─── DesignMap.xml ───────────────────────────────────────────────────────────

function buildDesignMap(data: BrochureData): string {
  const addr = esc(data.cover.displayAddress);
  return `<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>
<Document xmlns:idPkg=\"http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging\"
  DOMVersion=\"18.0\"
  Self=\"d\"
  ActiveLayer=\"u1\"
  UniquenessKey=\"${uid()}\"
  StoryList=\"spr1_story spr2_story spr3_story\"
  ZeroPoint=\"0 0\"
  ActiveProcess=\"CMYK\"
  MetadataPacketPreference=\"MetadataPacketPreference/$ID/[Default]\"
  Name=\"${addr} Brochure\">
  <idPkg:Story src=\"Stories/Story_spr1.xml\" />
  <idPkg:Story src=\"Stories/Story_spr2.xml\" />
  <idPkg:Story src=\"Stories/Story_spr3.xml\" />
  <idPkg:Spread src=\"Spreads/Spread_spr1.xml\" />
  <idPkg:Spread src=\"Spreads/Spread_spr2.xml\" />
  <idPkg:Spread src=\"Spreads/Spread_spr3.xml\" />
  <idPkg:MasterSpread src=\"MasterSpreads/MasterSpread_uNone.xml\" />
  <idPkg:Graphic src=\"Resources/Graphic.xml\" />
  <idPkg:Fonts src=\"Resources/Fonts.xml\" />
  <idPkg:Styles src=\"Resources/Styles.xml\" />
  <idPkg:Preferences src=\"Resources/Preferences.xml\" />
  <Layer Self=\"u1\" Name=\"Layer 1\" />
</Document>`;
}

// ─── Master Spread ────────────────────────────────────────────────────────────

function buildMasterSpread(): string {
  return `<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>
<idPkg:MasterSpread xmlns:idPkg=\"http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging\"
  DOMVersion=\"18.0\">
  <MasterSpread Self=\"MasterSpread/$ID/[None]\"
    NamePrefix=\"\" BaseName=\"[None]\" ShowMasterItems=\"true\"
    PageCount=\"1\" >
    <Page Self=\"MasterPage/$ID/[None]\"
      Name=\"[None]\"
      GeometricBounds=\"0 0 ${pt(H)} ${pt(W)}\"
      ItemTransform=\"1 0 0 1 0 0\"
      AppliedMaster=\"n\"
      MasterPageTransform=\"1 0 0 1 0 0\" TabOrder=\"\" />
  </MasterSpread>
</idPkg:MasterSpread>`;
}

// ─── BackingStory (required but minimal) ─────────────────────────────────────

function buildBackingStory(): string {
  return `<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>
<idPkg:BackingStory xmlns:idPkg=\"http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging\"
  DOMVersion=\"18.0\">
  <XmlStory Self=\"XmlBackingStory\" TrackChanges=\"false\" StoryTitle=\"\"
    AppliedTOCStyle=\"n\" AppliedNamedGrid=\"n\">
  </XmlStory>
</idPkg:BackingStory>`;
}

// ─── Tags.xml ─────────────────────────────────────────────────────────────────

function buildTags(): string {
  const tags = ['address','headline','tagline','description','highlight','spec','pricing','photo','footer'];
  return `<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>
<idPkg:Tags xmlns:idPkg=\"http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging\"
  DOMVersion=\"18.0\">
${tags.map(t => `  <XMLTag Self=\"XMLTag/${t}\" Name=\"${t}\" />`).join('\n')}
</idPkg:Tags>`;
}

// ─── Mapping.xml ──────────────────────────────────────────────────────────────

function buildMapping(): string {
  return `<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>
<idPkg:Mapping xmlns:idPkg=\"http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging\"
  DOMVersion=\"18.0\">
</idPkg:Mapping>`;
}

// ─── Empty story stubs (referenced by DesignMap) ─────────────────────────────

function buildStoryStub(id: string): string {
  return `<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>
<idPkg:Story xmlns:idPkg=\"http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging\"
  DOMVersion=\"18.0\">
  <Story Self=\"${id}_story\" AppliedTOCStyle=\"n\" TrackChanges=\"false\"
    StoryTitle=\"\" AppliedNamedGrid=\"n\">
  </Story>
</idPkg:Story>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build an IDML file and return it as a Blob.
 * The file can be opened directly in InDesign CS4+.
 */
export async function buildIdmlBlob(data: BrochureData): Promise<Blob> {
  const zip = new JSZip();

  // mimetype must be first, uncompressed
  zip.file('mimetype', 'application/vnd.adobe.indesign-idml-package', { compression: 'STORE' });

  // META-INF
  zip.file('META-INF/container.xml', `<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>
<container xmlns=\"urn:oasis:names:tc:opendocument:xmlns:container\"
  version=\"1.0\">
  <rootfiles>
    <rootfile full-path=\"designmap.xml\"
      media-type=\"application/vnd.adobe.indesign-idml-package\" />
  </rootfiles>
</container>`);

  // Core document files
  zip.file('designmap.xml', buildDesignMap(data));
  zip.file('Resources/Styles.xml', buildStyles());
  zip.file('Resources/Graphic.xml', buildSwatches());
  zip.file('Resources/Fonts.xml', buildFonts());
  zip.file('Resources/Preferences.xml', buildPreferences());
  zip.file('XML/BackingStory.xml', buildBackingStory());
  zip.file('XML/Tags.xml', buildTags());
  zip.file('XML/Mapping.xml', buildMapping());
  zip.file('MasterSpreads/MasterSpread_uNone.xml', buildMasterSpread());

  // Spreads (one per page)
  zip.file('Spreads/Spread_spr1.xml', buildSpreadPage1(data));
  zip.file('Spreads/Spread_spr2.xml', buildSpreadPage2(data));
  zip.file('Spreads/Spread_spr3.xml', buildSpreadPage3(data));

  // Story stubs (DesignMap references these)
  zip.file('Stories/Story_spr1.xml', buildStoryStub('spr1'));
  zip.file('Stories/Story_spr2.xml', buildStoryStub('spr2'));
  zip.file('Stories/Story_spr3.xml', buildStoryStub('spr3'));

  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.adobe.indesign-idml-package' });
}

/** Triggers a browser download of the IDML file. */
export async function downloadIdml(data: BrochureData, filename?: string): Promise<void> {
  const blob = await buildIdmlBlob(data);
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename ?? `${data.cover.displayAddress.replace(/[^a-zA-Z0-9]/g, '-')}-Brochure.idml`;
  a.click();
  URL.revokeObjectURL(url);
}
