/**
 * exportIdml.ts
 *
 * Generates a valid Adobe InDesign IDML archive from a BrochureData object.
 * IDML is a ZIP where:
 *   - mimetype          → uncompressed, first entry
 *   - META-INF/container.xml
 *   - designmap.xml     → document root; lists all spreads, stories, resources
 *   - Resources/        → Graphic.xml (swatches), Styles.xml, Fonts.xml, Preferences.xml
 *   - MasterSpreads/    → blank [None] master
 *   - Spreads/          → one XML per page; contains ONLY frame elements (no <Story>)
 *   - Stories/          → one XML per story; each <Story> lives here
 *   - XML/              → BackingStory.xml, Tags.xml, Mapping.xml
 *
 * Key rules that InDesign enforces:
 *   1. Each <TextFrame> has a ParentStory="<storyId>" attribute.
 *   2. The corresponding <Story Self="<storyId>"> lives in Stories/<storyId>.xml.
 *   3. DesignMap.xml lists every story and spread via <idPkg:Story src=…/>.
 *   4. PathGeometry is a direct child of the frame element's <Properties> block.
 *   5. No duplicate XML attributes anywhere.
 *   6. mimetype MUST be the first file and stored uncompressed (STORE).
 */

import JSZip from 'jszip';
import type { BrochureData } from './brochureTypes';

// ─── Page geometry (points) ───────────────────────────────────────────────────
const W  = 612;          // US Letter width
const H  = 792;          // US Letter height
const ML = 36;           // margin left
const MR = 36;           // margin right
const MT = 56;           // margin top  (leaves room for header bar)
const MB = 50;           // margin bottom
const CW = W - ML - MR; // 540 pt content width

// ─── Brand CMYK swatches ─────────────────────────────────────────────────────
const SWATCHES = [
  { name: 'Accent',  c: 89, m: 62, y:   0, k: 37 },
  { name: 'Yellow',  c:  0, m: 34, y: 100, k: 15 },
  { name: 'Black',   c:  0, m:  0, y:   0, k: 90 },
  { name: 'Mid',     c:  0, m:  0, y:   0, k: 60 },
  { name: 'White',   c:  0, m:  0, y:   0, k:  0 },
  { name: 'LightBg', c:  5, m:  3, y:   0, k:  5 },
  { name: 'ConfBg',  c:  0, m:  6, y:  22, k:  0 },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pt(n: number): string { return n.toFixed(3); }

/** Build a <PathGeometry> block for a rectangle at (x,y) with size (w×h). */
function pathGeometry(x: number, y: number, w: number, h: number): string {
  const tl = `${pt(x)} ${pt(y)}`;
  const tr = `${pt(x + w)} ${pt(y)}`;
  const br = `${pt(x + w)} ${pt(y + h)}`;
  const bl = `${pt(x)} ${pt(y + h)}`;
  return `<PathGeometry>
      <GeometryPathType PathOpen="false">
        <PathPointArray>
          <PathPointType Anchor="${tl}" LeftDirection="${tl}" RightDirection="${tl}" />
          <PathPointType Anchor="${tr}" LeftDirection="${tr}" RightDirection="${tr}" />
          <PathPointType Anchor="${br}" LeftDirection="${br}" RightDirection="${br}" />
          <PathPointType Anchor="${bl}" LeftDirection="${bl}" RightDirection="${bl}" />
        </PathPointArray>
      </GeometryPathType>
    </PathGeometry>`;
}

// ─── Frame builders (return {frameXml, storyXml} pairs) ──────────────────────

interface FramePair { frame: string; story: string | null; storyId: string | null }

function textFrame(
  id: string,
  x: number, y: number, w: number, h: number,
  styleRef: string,
  content: string,
): FramePair {
  const storyId = `${id}S`;
  const frame = `
  <TextFrame Self="${id}" ParentStory="${storyId}"
    ItemTransform="1 0 0 1 ${pt(x)} ${pt(y)}"
    AppliedObjectStyle="ObjectStyle/$ID/[None]"
    ContentType="TextType">
    <Properties>
      ${pathGeometry(0, 0, w, h)}
    </Properties>
  </TextFrame>`;

  const story = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:Story xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">
  <Story Self="${storyId}" AppliedTOCStyle="n" TrackChanges="false"
    StoryTitle="" AppliedNamedGrid="n">
    <StoryPreference OpticalMarginAlignment="false" OpticalMarginSize="12" />
    <InCopyExportOption IncludeGraphicProxies="true" IncludeAllResources="false" />
    <ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/${styleRef}">
      <CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]">
        <Content>${esc(content)}</Content>
      </CharacterStyleRange>
    </ParagraphStyleRange>
  </Story>
</idPkg:Story>`;

  return { frame, story, storyId };
}

function imageFrame(
  id: string,
  x: number, y: number, w: number, h: number,
  href: string,
): FramePair {
  const imgId  = `${id}I`;
  const lnkId  = `${id}L`;
  const frame = `
  <Rectangle Self="${id}"
    ItemTransform="1 0 0 1 ${pt(x)} ${pt(y)}"
    AppliedObjectStyle="ObjectStyle/$ID/[None]"
    ContentType="GraphicType">
    <Properties>
      ${pathGeometry(0, 0, w, h)}
    </Properties>
    <Image Self="${imgId}" AppliedObjectStyle="ObjectStyle/$ID/[None]"
      ItemTransform="1 0 0 1 0 0">
      <Properties>
        <Profile type="string">$ID/Embedded</Profile>
      </Properties>
      <Link Self="${lnkId}" LinkResourceURI="${esc(href)}"
        StoredState="Normal" LinkResourceFormat="$ID/JPEG" />
    </Image>
  </Rectangle>`;
  return { frame, story: null, storyId: null };
}

function filledRect(
  id: string,
  x: number, y: number, w: number, h: number,
  fillSwatch: string,
): FramePair {
  const frame = `
  <Rectangle Self="${id}"
    ItemTransform="1 0 0 1 ${pt(x)} ${pt(y)}"
    AppliedObjectStyle="ObjectStyle/$ID/[None]"
    FillColor="Color/${fillSwatch}"
    StrokeWeight="0"
    ContentType="Unassigned">
    <Properties>
      ${pathGeometry(0, 0, w, h)}
    </Properties>
  </Rectangle>`;
  return { frame, story: null, storyId: null };
}

// ─── Page content builders ────────────────────────────────────────────────────

type PageItems = FramePair[];

function pageHeader(pid: string, dealTypeLabel: string): PageItems {
  return [
    filledRect(`${pid}HdrBg`, 0, 0, W, 50, 'White'),
    textFrame(`${pid}LogoTxt`, ML, 14, 200, 22, 'Company', 'CLEARVIEW COMMERCIAL REALTY'),
    filledRect(`${pid}DealBg`, W - MR - 120, 12, 120, 26, 'Accent'),
    textFrame(`${pid}DealTxt`, W - MR - 120, 12, 120, 26, 'DealTypeBadge', dealTypeLabel),
  ];
}

function pageFooter(pid: string, address: string, city: string, disclaimer: string): PageItems {
  return [
    filledRect(`${pid}FtRule`, ML, H - MB, CW, 0.75, 'Mid'),
    textFrame(`${pid}FtLeft`, ML, H - MB + 7, CW * 0.45, 14, 'Footer', `${address}  ·  ${city}, Alberta`),
    textFrame(`${pid}FtDis`,  ML + CW * 0.45, H - MB + 5, CW * 0.55, 24, 'Disclaimer', disclaimer),
  ];
}

function buildPage1(data: BrochureData): PageItems {
  const { cover, copy, snapshots, dealTypeLabel, disclaimer } = data;
  const colW = (CW - 16) / 2;
  const items: PageItems = [];

  items.push(...pageHeader('p1', dealTypeLabel));

  if (cover.heroPhotoUrl)
    items.push(imageFrame('p1Hero', 0, 50, W, 240, cover.heroPhotoUrl));

  items.push(textFrame('p1Addr', ML, 302, CW, 26, 'Address',  cover.displayAddress));
  items.push(textFrame('p1Sub',  ML, 330, CW, 14, 'Subline',
    `${cover.city}, Alberta${cover.submarket ? `  ·  ${cover.submarket}` : ''}`));
  items.push(filledRect('p1Bar', ML, 348, 50, 3, 'Yellow'));
  items.push(textFrame('p1Hl',   ML, 356, CW, 34, 'Headline', copy.headline));
  items.push(textFrame('p1Desc', ML, 396, colW, 200, 'Body',    copy.description));
  items.push(textFrame('p1Tag',  ML + colW + 16, 396, colW, 52, 'Tagline',  copy.tagline));

  if (cover.secondaryPhotoUrl)
    items.push(imageFrame('p1Sec', ML + colW + 16, 452, colW, 140, cover.secondaryPhotoUrl));

  // Snapshot chips along bottom (up to 4)
  if (snapshots.length > 0) {
    const chips = snapshots.slice(0, 4);
    const chipW = CW / chips.length;
    chips.forEach((snap, i) => {
      const cx = ML + i * chipW;
      items.push(filledRect(`p1ChipBg${i}`, cx, 610, chipW - 4, 40, i % 2 === 0 ? 'Accent' : 'LightBg'));
      items.push(textFrame(`p1ChipL${i}`, cx + 4, 614, chipW - 12, 10, 'SnapshotLabel', snap.label.toUpperCase()));
      items.push(textFrame(`p1ChipV${i}`, cx + 4, 626, chipW - 12, 20, 'SnapshotValue', snap.value));
    });
  }

  items.push(...pageFooter('p1', cover.displayAddress, cover.city, disclaimer));
  return items;
}

function buildPage2(data: BrochureData): PageItems {
  const { cover, specs, features, financials, pricing, location, dealTypeLabel, disclaimer } = data;
  const leftW  = CW * 0.60;
  const rightW = CW * 0.38;
  const rightX = ML + leftW + CW * 0.02;
  const rowH   = 18;
  const items: PageItems = [];

  items.push(...pageHeader('p2', dealTypeLabel));

  items.push(textFrame('p2Title', ML, MT, leftW, 14, 'SectionTitle', 'PROPERTY DETAILS'));
  items.push(filledRect('p2TitleRule', ML, MT + 18, leftW, 0.75, 'Mid'));

  let sy = MT + 26;
  specs.forEach((row, i) => {
    const bg = i % 2 === 0 ? 'LightBg' : 'White';
    items.push(filledRect(`p2SBg${i}`, ML, sy, leftW, rowH, bg));
    items.push(textFrame(`p2SL${i}`,  ML + 4,              sy + 4, leftW * 0.38, rowH - 5, 'SpecLabel', row.label));
    items.push(textFrame(`p2SV${i}`,  ML + leftW * 0.38 + 4, sy + 4, leftW * 0.62 - 8, rowH - 5, 'SpecValue', row.value));
    sy += rowH;
  });

  if (features.length > 0) {
    sy += 8;
    const featH = features.length * 15 + 10;
    items.push(filledRect('p2FeatBg',  ML, sy, leftW, featH, 'LightBg'));
    items.push(filledRect('p2FeatBar', ML, sy, 3,     featH, 'Accent'));
    features.forEach((f, i) => {
      items.push(textFrame(`p2Feat${i}`, ML + 10, sy + 5 + i * 15, leftW - 14, 13, 'Feature', `✓  ${f}`));
    });
    sy += featH + 8;
  }

  if (financials.length > 0) {
    items.push(textFrame('p2FinTitle', ML, sy, leftW, 14, 'SectionTitle', 'ADDITIONAL COSTS'));
    sy += 22;
    financials.forEach((row, i) => {
      const bg = i % 2 === 0 ? 'LightBg' : 'White';
      items.push(filledRect(`p2FBg${i}`, ML, sy, leftW, rowH, bg));
      items.push(textFrame(`p2FL${i}`,  ML + 4,               sy + 4, leftW * 0.45, rowH - 5, 'SpecLabel', row.label));
      items.push(textFrame(`p2FV${i}`,  ML + leftW * 0.45 + 4, sy + 4, leftW * 0.55 - 8, rowH - 5, 'SpecValue', row.value));
      sy += rowH;
    });
  }

  // Right column
  let ry = MT;
  if (pricing.show) {
    items.push(textFrame('p2PricingTitle', rightX, ry, rightW, 14, 'SectionTitle', 'PRICING'));
    ry += 22;
    if (pricing.rent) {
      items.push(filledRect('p2RentBg', rightX, ry, rightW, 50, 'Accent'));
      items.push(textFrame('p2RentLbl', rightX + 8, ry + 5,  rightW - 16, 11, 'PricingLabel', 'ASKING RENT'));
      items.push(textFrame('p2RentVal', rightX + 8, ry + 18, rightW - 16, 22, 'PricingValue', pricing.rent));
      ry += 58;
    }
    if (pricing.price) {
      items.push(filledRect('p2PriceBg', rightX, ry, rightW, 50, 'Accent'));
      items.push(textFrame('p2PriceLbl', rightX + 8, ry + 5,  rightW - 16, 11, 'PricingLabel', 'ASKING PRICE'));
      items.push(textFrame('p2PriceVal', rightX + 8, ry + 18, rightW - 16, 22, 'PricingValue', pricing.price));
      ry += 58;
    }
    ry += 10;
  }

  if (location.staticMapUrl) {
    items.push(textFrame('p2MapTitle', rightX, ry, rightW, 14, 'SectionTitle', 'LOCATION'));
    ry += 22;
    const mapH = rightW * 0.75;
    items.push(imageFrame('p2Map', rightX, ry, rightW, mapH, location.staticMapUrl));
    ry += mapH + 4;
    items.push(textFrame('p2MapCap', rightX, ry, rightW, 12, 'Caption', cover.displayAddress));
  }

  items.push(...pageFooter('p2', cover.displayAddress, cover.city, disclaimer));
  return items;
}

function buildPage3(data: BrochureData): PageItems {
  const { cover, copy, snapshots, gallery, broker, dealTypeLabel, disclaimer } = data;
  const items: PageItems = [];

  items.push(...pageHeader('p3', dealTypeLabel));

  let cy = MT;

  // Snapshot band
  if (snapshots.length > 0) {
    const snaps  = snapshots.slice(0, 6);
    const cellW  = CW / snaps.length;
    items.push(filledRect('p3SnapBand', ML, cy, CW, 48, 'Accent'));
    snaps.forEach((snap, i) => {
      const cx = ML + i * cellW;
      items.push(textFrame(`p3SL${i}`, cx + 4, cy + 6,  cellW - 8, 10, 'SnapshotLabel', snap.label.toUpperCase()));
      items.push(textFrame(`p3SV${i}`, cx + 4, cy + 18, cellW - 8, 22, 'SnapshotValue', snap.value));
    });
    cy += 56;
  }

  // Highlights
  items.push(textFrame('p3HlTitle', ML, cy, CW, 14, 'SectionTitle', 'KEY HIGHLIGHTS'));
  cy += 22;

  const leftH  = copy.highlights.filter((_, i) => i % 2 === 0);
  const rightH = copy.highlights.filter((_, i) => i % 2 !== 0);
  const hlColW = (CW - 16) / 2;

  leftH.forEach((h, i) => {
    const fy = cy + i * 22;
    items.push(filledRect(`p3SqL${i}`, ML, fy + 5, 5, 5, 'Yellow'));
    items.push(textFrame(`p3HlL${i}`, ML + 12, fy, hlColW - 12, 20, 'Body', h));
  });
  rightH.forEach((h, i) => {
    const fy = cy + i * 22;
    items.push(filledRect(`p3SqR${i}`, ML + hlColW + 16, fy + 5, 5, 5, 'Yellow'));
    items.push(textFrame(`p3HlR${i}`, ML + hlColW + 28, fy, hlColW - 12, 20, 'Body', h));
  });

  cy += Math.max(leftH.length, rightH.length) * 22 + 16;

  // Gallery strip
  const photos = gallery.slice(0, 3);
  if (photos.length > 0) {
    const photoW = (CW - (photos.length - 1) * 8) / photos.length;
    photos.forEach((p, i) => {
      items.push(imageFrame(`p3Gal${i}`, ML + i * (photoW + 8), cy, photoW, 110, p.photo_url));
    });
    cy += 118;
  }

  // Broker notes
  if (broker.includeNotes && broker.notes) {
    items.push(filledRect('p3BrkBg',  ML, cy, CW, 60, 'ConfBg'));
    items.push(filledRect('p3BrkBar', ML, cy, 3,  60, 'Yellow'));
    items.push(textFrame('p3BrkTitle', ML + 10, cy + 6,  CW - 14, 12, 'ConfidentialTitle', 'CONFIDENTIAL — BROKER NOTES'));
    items.push(textFrame('p3BrkNotes', ML + 10, cy + 22, CW - 14, 32, 'Body', broker.notes));
  }

  items.push(...pageFooter('p3', cover.displayAddress, cover.city, disclaimer));
  return items;
}

// ─── XML assemblers ──────────────────────────────────────────────────────────

function spreadXml(spreadId: string, pageId: string, pageNum: number, items: PageItems): string {
  const frames = items.map(i => i.frame).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:Spread xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">
  <Spread Self="${spreadId}"
    PageTransitionType="None"
    PageTransitionDirection="NotApplicable"
    PageTransitionDuration="Medium"
    ShowMasterItems="true"
    PageCount="1"
    BindingLocation="0"
    AllowPageShuffle="true">
    <Page Self="${pageId}"
      AppliedTrapPreset="TrapPreset/$ID/[No Trap Preset]"
      Name="${pageNum}"
      GeometricBounds="0 0 ${pt(H)} ${pt(W)}"
      ItemTransform="1 0 0 1 0 0"
      MasterPageTransform="1 0 0 1 0 0"
      AppliedMaster="MasterSpread/$ID/[None]"
      TabOrder="">
      <Properties>
        <Descriptor type="list">
          <ListItem type="string">${pageId}</ListItem>
        </Descriptor>
        <PageColor type="enumeration">UseMasterColor</PageColor>
      </Properties>
    </Page>
${frames}
  </Spread>
</idPkg:Spread>`;
}

/** Collect all storyIds and story XMLs from a set of page items. */
function collectStories(items: PageItems): { storyId: string; xml: string }[] {
  const out: { storyId: string; xml: string }[] = [];
  for (const item of items) {
    if (item.story && item.storyId) {
      out.push({ storyId: item.storyId, xml: item.story });
    }
  }
  return out;
}

// ─── Resource XML builders ────────────────────────────────────────────────────

function buildStyles(): string {
  const defs = [
    { name: 'Address',           size: 18,  weight: 'Bold',    color: 'Black',  leading: 22 },
    { name: 'Subline',           size: 10,  weight: 'Regular', color: 'Mid',    leading: 13 },
    { name: 'Headline',          size: 14,  weight: 'Bold',    color: 'Accent', leading: 18 },
    { name: 'Tagline',           size: 10,  weight: 'Regular', color: 'Accent', leading: 13 },
    { name: 'Body',              size:  8.5, weight: 'Regular', color: 'Black', leading: 13 },
    { name: 'SectionTitle',      size: 10,  weight: 'Bold',    color: 'Accent', leading: 13 },
    { name: 'SpecLabel',         size:  7.5, weight: 'Bold',   color: 'Mid',    leading: 11 },
    { name: 'SpecValue',         size:  8.5, weight: 'Regular', color: 'Black', leading: 11 },
    { name: 'PricingLabel',      size:  6.5, weight: 'Regular', color: 'White', leading:  9 },
    { name: 'PricingValue',      size: 14,  weight: 'Bold',    color: 'White',  leading: 17 },
    { name: 'SnapshotLabel',     size:  6,  weight: 'Regular', color: 'White',  leading:  8 },
    { name: 'SnapshotValue',     size: 11,  weight: 'Bold',    color: 'White',  leading: 14 },
    { name: 'Feature',           size:  7.5, weight: 'Regular', color: 'Accent', leading: 11 },
    { name: 'Caption',           size:  6.5, weight: 'Regular', color: 'Mid',   leading:  9 },
    { name: 'Footer',            size:  6.5, weight: 'Regular', color: 'Mid',   leading:  9 },
    { name: 'Disclaimer',        size:  5,  weight: 'Regular', color: 'Mid',    leading:  7 },
    { name: 'DealTypeBadge',     size:  8,  weight: 'Bold',    color: 'White',  leading: 10 },
    { name: 'Company',           size:  9,  weight: 'Bold',    color: 'Accent', leading: 11 },
    { name: 'ConfidentialTitle', size:  7.5, weight: 'Bold',   color: 'Black',  leading: 10 },
  ];

  const styleXml = defs.map(st =>
    `    <ParagraphStyle Self="ParagraphStyle/${st.name}" Name="${st.name}"
      PointSize="${st.size}" FontStyle="${st.weight}"
      FillColor="Color/${st.color}" Leading="${st.leading}"
      HyphenateCapitalizedWords="false" Justification="LeftAlign" />`
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:Styles xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">
  <RootParagraphStyleGroup Self="ParagraphStyleGroup/$ID/[Root]">
    <ParagraphStyle Self="ParagraphStyle/$ID/[No paragraph style]"
      Name="[No paragraph style]" IsDefault="true" />
    <ParagraphStyle Self="ParagraphStyle/$ID/NormalParagraphStyle"
      Name="NormalParagraphStyle" />
${styleXml}
  </RootParagraphStyleGroup>
  <RootCharacterStyleGroup Self="CharacterStyleGroup/$ID/[Root]">
    <CharacterStyle Self="CharacterStyle/$ID/[No character style]"
      Name="[No character style]" IsDefault="true" />
  </RootCharacterStyleGroup>
</idPkg:Styles>`;
}

function buildGraphic(): string {
  const colorXml = SWATCHES.map(sw =>
    `  <Color Self="Color/${sw.name}" Name="${sw.name}"
    ColorValue="${sw.c} ${sw.m} ${sw.y} ${sw.k}" Model="Process" Space="CMYK" />`
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:Graphic xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">
${colorXml}
  <Swatch Self="Swatch/None" Name="None" />
  <Swatch Self="Swatch/Paper" Name="Paper" />
  <Swatch Self="Swatch/Black" Name="Black" />
  <Swatch Self="Swatch/Registration" Name="Registration" />
  <StrokeStyle Self="StrokeStyle/$ID/Solid" />
</idPkg:Graphic>`;
}

function buildFonts(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:Fonts xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">
  <FontFamily Self="FontFamily/Helvetica" Name="Helvetica">
    <Font Self="Font/Helvetica Regular" PostScriptName="Helvetica" FontStyleName="Regular" />
    <Font Self="Font/Helvetica Bold"    PostScriptName="Helvetica-Bold" FontStyleName="Bold" />
  </FontFamily>
</idPkg:Fonts>`;
}

function buildPreferences(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:Preferences xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">
  <ViewPreference ShowRulers="true"
    HorizontalMeasurementUnits="Points"
    VerticalMeasurementUnits="Points" />
  <DocumentPreference
    PageWidth="${pt(W)}" PageHeight="${pt(H)}"
    PageOrientation="Portrait"
    DocumentBleedTopOffset="0" DocumentBleedBottomOffset="0"
    DocumentBleedInsideOrLeftOffset="0" DocumentBleedOutsideOrRightOffset="0"
    PagesPerDocument="3" />
</idPkg:Preferences>`;
}

function buildMasterSpread(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:MasterSpread xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">
  <MasterSpread Self="MasterSpread/$ID/[None]"
    NamePrefix="" BaseName="[None]" ShowMasterItems="true" PageCount="1">
    <Page Self="MasterPage/$ID/[None]"
      Name="[None]"
      GeometricBounds="0 0 ${pt(H)} ${pt(W)}"
      ItemTransform="1 0 0 1 0 0"
      AppliedMaster="n"
      MasterPageTransform="1 0 0 1 0 0"
      TabOrder="" />
  </MasterSpread>
</idPkg:MasterSpread>`;
}

function buildBackingStory(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:BackingStory xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">
  <XmlStory Self="XmlBackingStory" TrackChanges="false" StoryTitle=""
    AppliedTOCStyle="n" AppliedNamedGrid="n">
  </XmlStory>
</idPkg:BackingStory>`;
}

function buildTags(): string {
  const tags = ['address','headline','tagline','description','highlight','spec','pricing','photo','footer'];
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:Tags xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">
${tags.map(t => `  <XMLTag Self="XMLTag/${t}" Name="${t}" />`).join('\n')}
</idPkg:Tags>`;
}

function buildMapping(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:Mapping xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">
</idPkg:Mapping>`;
}

function buildContainer(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
    <rootfile full-path="designmap.xml"
      media-type="application/vnd.adobe.indesign-idml-package" />
  </rootfiles>
</container>`;
}

function buildDesignMap(
  addr: string,
  spreadIds: string[],
  storyIds: string[],
): string {
  const spreadSrcs = spreadIds.map((id, i) =>
    `  <idPkg:Spread src="Spreads/Spread_${id}.xml" />`
  ).join('\n');
  const storySrcs = storyIds.map(id =>
    `  <idPkg:Story src="Stories/Story_${id}.xml" />`
  ).join('\n');
  const storyList = storyIds.join(' ');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Document xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging"
  DOMVersion="18.0"
  Self="d"
  ActiveLayer="Layer1"
  StoryList="${storyList}"
  ZeroPoint="0 0"
  ActiveProcess="CMYK"
  Name="${esc(addr)} Brochure">
  <idPkg:MasterSpread src="MasterSpreads/MasterSpread_uNone.xml" />
${spreadSrcs}
${storySrcs}
  <idPkg:Graphic src="Resources/Graphic.xml" />
  <idPkg:Fonts src="Resources/Fonts.xml" />
  <idPkg:Styles src="Resources/Styles.xml" />
  <idPkg:Preferences src="Resources/Preferences.xml" />
  <idPkg:Tags src="XML/Tags.xml" />
  <idPkg:Mapping src="XML/Mapping.xml" />
  <idPkg:BackingStory src="XML/BackingStory.xml" />
  <Layer Self="Layer1" Name="Layer 1" />
</Document>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build an IDML Blob that InDesign CS4+ can open natively.
 */
export async function buildIdmlBlob(data: BrochureData): Promise<Blob> {
  const zip = new JSZip();

  // 1. mimetype MUST be first and uncompressed (IDML spec)
  zip.file('mimetype', 'application/vnd.adobe.indesign-idml-package', { compression: 'STORE' });

  // 2. Container & resource files
  zip.file('META-INF/container.xml',           buildContainer());
  zip.file('Resources/Graphic.xml',            buildGraphic());
  zip.file('Resources/Styles.xml',             buildStyles());
  zip.file('Resources/Fonts.xml',              buildFonts());
  zip.file('Resources/Preferences.xml',        buildPreferences());
  zip.file('MasterSpreads/MasterSpread_uNone.xml', buildMasterSpread());
  zip.file('XML/BackingStory.xml',             buildBackingStory());
  zip.file('XML/Tags.xml',                     buildTags());
  zip.file('XML/Mapping.xml',                  buildMapping());

  // 3. Build page items
  const pages = [
    { id: 'spr1', pg: 'pg1', num: 1, items: buildPage1(data) },
    { id: 'spr2', pg: 'pg2', num: 2, items: buildPage2(data) },
    { id: 'spr3', pg: 'pg3', num: 3, items: buildPage3(data) },
  ];

  // 4. Write spreads (frames only — no story content in spreads)
  for (const p of pages) {
    zip.file(`Spreads/Spread_${p.id}.xml`, spreadXml(p.id, p.pg, p.num, p.items));
  }

  // 5. Collect and write all stories
  const allStoryIds: string[] = [];
  for (const p of pages) {
    const stories = collectStories(p.items);
    for (const s of stories) {
      zip.file(`Stories/Story_${s.storyId}.xml`, s.xml);
      allStoryIds.push(s.storyId);
    }
  }

  // 6. DesignMap lists everything (must come after stories are known)
  zip.file('designmap.xml', buildDesignMap(
    data.cover.displayAddress,
    pages.map(p => p.id),
    allStoryIds,
  ));

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.adobe.indesign-idml-package',
  });
}

/** Trigger a browser download of the IDML archive. */
export async function downloadIdml(data: BrochureData, filename?: string): Promise<void> {
  const blob = await buildIdmlBlob(data);
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename ?? `${data.cover.displayAddress.replace(/[^a-zA-Z0-9]/g, '-')}-Brochure.idml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
