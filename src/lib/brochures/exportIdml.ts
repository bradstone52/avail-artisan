/**
 * exportIdml.ts  — Adobe InDesign IDML generator
 *
 * IDML is a ZIP archive. InDesign requires:
 *   1. `mimetype`  → first entry, STORE (no deflate), exact content string
 *   2. `META-INF/container.xml`  → points to designmap.xml
 *   3. `designmap.xml`  → Document root, lists all components
 *   4. `Resources/`  → Graphic.xml  Styles.xml  Fonts.xml  Preferences.xml
 *   5. `MasterSpreads/`  → one [None] master
 *   6. `Spreads/`  → one XML per page (frame elements only, NO <Story> here)
 *   7. `Stories/`  → one XML per story; each <TextFrame ParentStory="X"> maps here
 *   8. `XML/`  → BackingStory.xml  Tags.xml  Mapping.xml
 *
 * Rules that cause "cannot open file" errors:
 *   • Non-well-formed XML in any component
 *   • Story IDs in StoryList that have no matching file in Stories/
 *   • <Story> elements inside Spread files (they belong in Stories/)
 *   • Duplicate XML attributes
 *   • Non-ASCII characters in XML content that InDesign can't decode
 */

import JSZip from 'jszip';
import type { BrochureData } from './brochureTypes';

// ─── Page geometry (US Letter, points) ───────────────────────────────────────
const W  = 612;
const H  = 792;
const ML = 36;
const MR = 36;
const MT = 56;
const MB = 50;
const CW = W - ML - MR; // 540

// ─── CMYK swatches ───────────────────────────────────────────────────────────
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

/** XML-escape and strip non-ASCII so InDesign's parser never chokes. */
function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' ') // strip non-ASCII / control chars
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pt(n: number): string { return n.toFixed(3); }

function rectPath(x: number, y: number, w: number, h: number): string {
  const tl = `${pt(x)} ${pt(y)}`;
  const tr = `${pt(x + w)} ${pt(y)}`;
  const br = `${pt(x + w)} ${pt(y + h)}`;
  const bl = `${pt(x)} ${pt(y + h)}`;
  return (
    `<PathGeometry>` +
      `<GeometryPathType PathOpen="false">` +
        `<PathPointArray>` +
          `<PathPointType Anchor="${tl}" LeftDirection="${tl}" RightDirection="${tl}" />` +
          `<PathPointType Anchor="${tr}" LeftDirection="${tr}" RightDirection="${tr}" />` +
          `<PathPointType Anchor="${br}" LeftDirection="${br}" RightDirection="${br}" />` +
          `<PathPointType Anchor="${bl}" LeftDirection="${bl}" RightDirection="${bl}" />` +
        `</PathPointArray>` +
      `</GeometryPathType>` +
    `</PathGeometry>`
  );
}

// ─── Frame element types ─────────────────────────────────────────────────────

interface FrameItem {
  frameXml: string;
  storyId:  string | null;
  storyXml: string | null;
}

function mkTextFrame(
  id: string,
  x: number, y: number, w: number, h: number,
  styleRef: string,
  content: string,
): FrameItem {
  const sid = `s${id}`;
  const frameXml =
    `<TextFrame Self="${id}" ParentStory="${sid}"` +
      ` ItemTransform="1 0 0 1 ${pt(x)} ${pt(y)}"` +
      ` AppliedObjectStyle="ObjectStyle/$ID/[None]"` +
      ` ContentType="TextType">` +
      `<Properties>${rectPath(0, 0, w, h)}</Properties>` +
    `</TextFrame>`;

  const storyXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<idPkg:Story xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">` +
      `<Story Self="${sid}" AppliedTOCStyle="n" TrackChanges="false" StoryTitle="" AppliedNamedGrid="n">` +
        `<StoryPreference OpticalMarginAlignment="false" OpticalMarginSize="12" />` +
        `<InCopyExportOption IncludeGraphicProxies="true" IncludeAllResources="false" />` +
        `<ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/${styleRef}">` +
          `<CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]">` +
            `<Content>${esc(content)}</Content>` +
          `</CharacterStyleRange>` +
        `</ParagraphStyleRange>` +
      `</Story>` +
    `</idPkg:Story>`;

  return { frameXml, storyId: sid, storyXml };
}

function mkImageFrame(
  id: string,
  x: number, y: number, w: number, h: number,
  href: string,
): FrameItem {
  const imgId = `i${id}`;
  const lnkId = `l${id}`;
  const frameXml =
    `<Rectangle Self="${id}"` +
      ` ItemTransform="1 0 0 1 ${pt(x)} ${pt(y)}"` +
      ` AppliedObjectStyle="ObjectStyle/$ID/[None]"` +
      ` ContentType="GraphicType">` +
      `<Properties>${rectPath(0, 0, w, h)}</Properties>` +
      `<Image Self="${imgId}" AppliedObjectStyle="ObjectStyle/$ID/[None]" ItemTransform="1 0 0 1 0 0">` +
        `<Properties><Profile type="string">$ID/Embedded</Profile></Properties>` +
        `<Link Self="${lnkId}" LinkResourceURI="${esc(href)}" StoredState="Normal" LinkResourceFormat="$ID/JPEG" />` +
      `</Image>` +
    `</Rectangle>`;
  return { frameXml, storyId: null, storyXml: null };
}

function mkRect(
  id: string,
  x: number, y: number, w: number, h: number,
  fill: string,
): FrameItem {
  const frameXml =
    `<Rectangle Self="${id}"` +
      ` ItemTransform="1 0 0 1 ${pt(x)} ${pt(y)}"` +
      ` AppliedObjectStyle="ObjectStyle/$ID/[None]"` +
      ` FillColor="Color/${fill}"` +
      ` StrokeWeight="0"` +
      ` ContentType="Unassigned">` +
      `<Properties>${rectPath(0, 0, w, h)}</Properties>` +
    `</Rectangle>`;
  return { frameXml, storyId: null, storyXml: null };
}

// ─── Page content builders ────────────────────────────────────────────────────

type Items = FrameItem[];

function header(pid: string, dealType: string): Items {
  return [
    mkRect(`${pid}HBg`, 0, 0, W, 50, 'White'),
    mkTextFrame(`${pid}Logo`, ML, 14, 200, 22, 'Company', 'CLEARVIEW COMMERCIAL REALTY'),
    mkRect(`${pid}DBg`,  W - MR - 120, 12, 120, 26, 'Accent'),
    mkTextFrame(`${pid}DTxt`, W - MR - 120, 12, 120, 26, 'DealTypeBadge', dealType),
  ];
}

function footer(pid: string, address: string, city: string, disclaimer: string): Items {
  return [
    mkRect(`${pid}FtRule`, ML, H - MB, CW, 1, 'Mid'),
    mkTextFrame(`${pid}FtL`, ML, H - MB + 7, CW * 0.45, 14, 'Footer',
      `${address}, ${city}, Alberta`),
    mkTextFrame(`${pid}FtD`, ML + CW * 0.45, H - MB + 5, CW * 0.55, 24, 'Disclaimer', disclaimer),
  ];
}

function page1Items(data: BrochureData): Items {
  const { cover, copy, snapshots, dealTypeLabel, disclaimer } = data;
  const colW = (CW - 16) / 2;
  const items: Items = [
    ...header('p1', dealTypeLabel),
  ];

  if (cover.heroPhotoUrl)
    items.push(mkImageFrame('p1Hero', 0, 50, W, 240, cover.heroPhotoUrl));

  items.push(mkTextFrame('p1Addr', ML, 302, CW, 26, 'Address', cover.displayAddress));
  items.push(mkTextFrame('p1Sub', ML, 330, CW, 14, 'Subline',
    `${cover.city}, Alberta | ${cover.submarket ?? ''}`));
  items.push(mkRect('p1Bar', ML, 348, 50, 3, 'Yellow'));
  items.push(mkTextFrame('p1Hl',  ML, 356, CW, 34, 'Headline',   copy.headline));
  items.push(mkTextFrame('p1Desc', ML, 396, colW, 200, 'Body',   copy.description));
  items.push(mkTextFrame('p1Tag', ML + colW + 16, 396, colW, 52, 'Tagline', copy.tagline));

  if (cover.secondaryPhotoUrl)
    items.push(mkImageFrame('p1Sec', ML + colW + 16, 452, colW, 140, cover.secondaryPhotoUrl));

  const chips = snapshots.slice(0, 4);
  if (chips.length > 0) {
    const chipW = CW / chips.length;
    chips.forEach((snap, i) => {
      const cx = ML + i * chipW;
      items.push(mkRect(`p1CB${i}`, cx, 610, chipW - 4, 40, i % 2 === 0 ? 'Accent' : 'LightBg'));
      items.push(mkTextFrame(`p1CL${i}`, cx + 4, 614, chipW - 12, 10, 'SnapshotLabel',
        snap.label.toUpperCase()));
      items.push(mkTextFrame(`p1CV${i}`, cx + 4, 626, chipW - 12, 20, 'SnapshotValue', snap.value));
    });
  }

  items.push(...footer('p1', cover.displayAddress, cover.city, disclaimer));
  return items;
}

function page2Items(data: BrochureData): Items {
  const { cover, specs, features, financials, pricing, location, dealTypeLabel, disclaimer } = data;
  const leftW  = CW * 0.60;
  const rightW = CW * 0.38;
  const rightX = ML + leftW + CW * 0.02;
  const rowH   = 18;
  const items: Items = [...header('p2', dealTypeLabel)];

  items.push(mkTextFrame('p2Title', ML, MT, leftW, 14, 'SectionTitle', 'PROPERTY DETAILS'));
  items.push(mkRect('p2TRule', ML, MT + 18, leftW, 1, 'Mid'));

  let sy = MT + 26;
  specs.forEach((row, i) => {
    items.push(mkRect(`p2SB${i}`, ML, sy, leftW, rowH, i % 2 === 0 ? 'LightBg' : 'White'));
    items.push(mkTextFrame(`p2SL${i}`, ML + 4, sy + 4, leftW * 0.38, rowH - 5, 'SpecLabel', row.label));
    items.push(mkTextFrame(`p2SV${i}`, ML + leftW * 0.38 + 4, sy + 4, leftW * 0.62 - 8, rowH - 5, 'SpecValue', row.value));
    sy += rowH;
  });

  if (features.length > 0) {
    sy += 8;
    const featH = features.length * 15 + 10;
    items.push(mkRect('p2FB', ML, sy, leftW, featH, 'LightBg'));
    items.push(mkRect('p2FAcc', ML, sy, 3, featH, 'Accent'));
    features.forEach((f, i) => {
      items.push(mkTextFrame(`p2F${i}`, ML + 10, sy + 5 + i * 15, leftW - 14, 13, 'Feature',
        `+ ${f}`));
    });
    sy += featH + 8;
  }

  if (financials.length > 0) {
    items.push(mkTextFrame('p2FinT', ML, sy, leftW, 14, 'SectionTitle', 'ADDITIONAL COSTS'));
    sy += 22;
    financials.forEach((row, i) => {
      items.push(mkRect(`p2FB${i}`, ML, sy, leftW, rowH, i % 2 === 0 ? 'LightBg' : 'White'));
      items.push(mkTextFrame(`p2FL${i}`, ML + 4, sy + 4, leftW * 0.45, rowH - 5, 'SpecLabel', row.label));
      items.push(mkTextFrame(`p2FV${i}`, ML + leftW * 0.45 + 4, sy + 4, leftW * 0.55 - 8, rowH - 5, 'SpecValue', row.value));
      sy += rowH;
    });
  }

  // Right col — pricing
  let ry = MT;
  if (pricing.show) {
    items.push(mkTextFrame('p2PT', rightX, ry, rightW, 14, 'SectionTitle', 'PRICING'));
    ry += 22;
    if (pricing.rent) {
      items.push(mkRect('p2RentBg', rightX, ry, rightW, 50, 'Accent'));
      items.push(mkTextFrame('p2RL', rightX + 8, ry + 5,  rightW - 16, 11, 'PricingLabel', 'ASKING RENT'));
      items.push(mkTextFrame('p2RV', rightX + 8, ry + 18, rightW - 16, 22, 'PricingValue', pricing.rent));
      ry += 58;
    }
    if (pricing.price) {
      items.push(mkRect('p2PriceBg', rightX, ry, rightW, 50, 'Accent'));
      items.push(mkTextFrame('p2PL', rightX + 8, ry + 5,  rightW - 16, 11, 'PricingLabel', 'ASKING PRICE'));
      items.push(mkTextFrame('p2PV', rightX + 8, ry + 18, rightW - 16, 22, 'PricingValue', pricing.price));
      ry += 58;
    }
    ry += 10;
  }

  // Right col — map
  if (location.staticMapUrl) {
    items.push(mkTextFrame('p2MapT', rightX, ry, rightW, 14, 'SectionTitle', 'LOCATION'));
    ry += 22;
    const mapH = rightW * 0.75;
    items.push(mkImageFrame('p2Map', rightX, ry, rightW, mapH, location.staticMapUrl));
    ry += mapH + 4;
    items.push(mkTextFrame('p2MapC', rightX, ry, rightW, 12, 'Caption', cover.displayAddress));
  }

  items.push(...footer('p2', cover.displayAddress, cover.city, disclaimer));
  return items;
}

function page3Items(data: BrochureData): Items {
  const { cover, copy, snapshots, gallery, broker, dealTypeLabel, disclaimer } = data;
  const items: Items = [...header('p3', dealTypeLabel)];
  let cy = MT;

  // Snapshot band
  if (snapshots.length > 0) {
    const snaps  = snapshots.slice(0, 6);
    const cellW  = CW / snaps.length;
    items.push(mkRect('p3SBand', ML, cy, CW, 48, 'Accent'));
    snaps.forEach((snap, i) => {
      const cx = ML + i * cellW;
      items.push(mkTextFrame(`p3SL${i}`, cx + 4, cy + 6,  cellW - 8, 10, 'SnapshotLabel',
        snap.label.toUpperCase()));
      items.push(mkTextFrame(`p3SV${i}`, cx + 4, cy + 18, cellW - 8, 22, 'SnapshotValue', snap.value));
    });
    cy += 56;
  }

  items.push(mkTextFrame('p3HlT', ML, cy, CW, 14, 'SectionTitle', 'KEY HIGHLIGHTS'));
  cy += 22;

  const leftH  = copy.highlights.filter((_, i) => i % 2 === 0);
  const rightH = copy.highlights.filter((_, i) => i % 2 !== 0);
  const hlColW = (CW - 16) / 2;

  leftH.forEach((h, i) => {
    items.push(mkRect(`p3SqL${i}`,  ML, cy + i * 22 + 5, 5, 5, 'Yellow'));
    items.push(mkTextFrame(`p3HlL${i}`, ML + 12, cy + i * 22, hlColW - 12, 20, 'Body', h));
  });
  rightH.forEach((h, i) => {
    items.push(mkRect(`p3SqR${i}`,  ML + hlColW + 16, cy + i * 22 + 5, 5, 5, 'Yellow'));
    items.push(mkTextFrame(`p3HlR${i}`, ML + hlColW + 28, cy + i * 22, hlColW - 12, 20, 'Body', h));
  });
  cy += Math.max(leftH.length, rightH.length) * 22 + 16;

  // Gallery
  const photos = gallery.slice(0, 3);
  if (photos.length > 0) {
    const photoW = (CW - (photos.length - 1) * 8) / photos.length;
    photos.forEach((p, i) => {
      items.push(mkImageFrame(`p3G${i}`, ML + i * (photoW + 8), cy, photoW, 110, p.photo_url));
    });
    cy += 118;
  }

  // Broker notes
  if (broker.includeNotes && broker.notes) {
    items.push(mkRect('p3BrkBg',  ML, cy, CW, 60, 'ConfBg'));
    items.push(mkRect('p3BrkBar', ML, cy, 3,  60, 'Yellow'));
    items.push(mkTextFrame('p3BrkT', ML + 10, cy + 6,  CW - 14, 12, 'ConfidentialTitle',
      'CONFIDENTIAL - BROKER NOTES'));
    items.push(mkTextFrame('p3BrkN', ML + 10, cy + 22, CW - 14, 32, 'Body', broker.notes));
  }

  items.push(...footer('p3', cover.displayAddress, cover.city, disclaimer));
  return items;
}

// ─── XML assemblers ──────────────────────────────────────────────────────────

function spreadXml(spreadId: string, pageId: string, pageNum: number, items: Items): string {
  const frameXml = items.map(f => f.frameXml).join('');
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<idPkg:Spread xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">` +
      `<Spread Self="${spreadId}"` +
        ` PageTransitionType="None"` +
        ` PageTransitionDirection="NotApplicable"` +
        ` PageTransitionDuration="Medium"` +
        ` ShowMasterItems="true"` +
        ` PageCount="1"` +
        ` BindingLocation="0"` +
        ` AllowPageShuffle="true">` +
        `<Page Self="${pageId}"` +
          ` AppliedTrapPreset="TrapPreset/$ID/[No Trap Preset]"` +
          ` Name="${pageNum}"` +
          ` GeometricBounds="0 0 ${pt(H)} ${pt(W)}"` +
          ` ItemTransform="1 0 0 1 0 0"` +
          ` MasterPageTransform="1 0 0 1 0 0"` +
          ` AppliedMaster="MasterSpread/$ID/[None]"` +
          ` TabOrder="">` +
          `<Properties>` +
            `<Descriptor type="list"><ListItem type="string">${pageId}</ListItem></Descriptor>` +
            `<PageColor type="enumeration">UseMasterColor</PageColor>` +
          `</Properties>` +
        `</Page>` +
        frameXml +
      `</Spread>` +
    `</idPkg:Spread>`
  );
}

function buildStyles(): string {
  const defs = [
    { name: 'Address',           size: 18,   weight: 'Bold',    color: 'Black',  leading: 22 },
    { name: 'Subline',           size: 10,   weight: 'Regular', color: 'Mid',    leading: 13 },
    { name: 'Headline',          size: 14,   weight: 'Bold',    color: 'Accent', leading: 18 },
    { name: 'Tagline',           size: 10,   weight: 'Regular', color: 'Accent', leading: 13 },
    { name: 'Body',              size:  8.5, weight: 'Regular', color: 'Black',  leading: 13 },
    { name: 'SectionTitle',      size: 10,   weight: 'Bold',    color: 'Accent', leading: 13 },
    { name: 'SpecLabel',         size:  7.5, weight: 'Bold',    color: 'Mid',    leading: 11 },
    { name: 'SpecValue',         size:  8.5, weight: 'Regular', color: 'Black',  leading: 11 },
    { name: 'PricingLabel',      size:  6.5, weight: 'Regular', color: 'White',  leading:  9 },
    { name: 'PricingValue',      size: 14,   weight: 'Bold',    color: 'White',  leading: 17 },
    { name: 'SnapshotLabel',     size:  6,   weight: 'Regular', color: 'White',  leading:  8 },
    { name: 'SnapshotValue',     size: 11,   weight: 'Bold',    color: 'White',  leading: 14 },
    { name: 'Feature',           size:  7.5, weight: 'Regular', color: 'Accent', leading: 11 },
    { name: 'Caption',           size:  6.5, weight: 'Regular', color: 'Mid',    leading:  9 },
    { name: 'Footer',            size:  6.5, weight: 'Regular', color: 'Mid',    leading:  9 },
    { name: 'Disclaimer',        size:  5,   weight: 'Regular', color: 'Mid',    leading:  7 },
    { name: 'DealTypeBadge',     size:  8,   weight: 'Bold',    color: 'White',  leading: 10 },
    { name: 'Company',           size:  9,   weight: 'Bold',    color: 'Accent', leading: 11 },
    { name: 'ConfidentialTitle', size:  7.5, weight: 'Bold',    color: 'Black',  leading: 10 },
  ];

  const styleEls = defs.map(st =>
    `<ParagraphStyle Self="ParagraphStyle/${st.name}" Name="${st.name}"` +
    ` PointSize="${st.size}" FontStyle="${st.weight}"` +
    ` FillColor="Color/${st.color}" Leading="${st.leading}"` +
    ` HyphenateCapitalizedWords="false" Justification="LeftAlign" />`
  ).join('');

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<idPkg:Styles xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">` +
      `<RootParagraphStyleGroup Self="ParagraphStyleGroup/$ID/[Root]">` +
        `<ParagraphStyle Self="ParagraphStyle/$ID/[No paragraph style]" Name="[No paragraph style]" IsDefault="true" />` +
        `<ParagraphStyle Self="ParagraphStyle/$ID/NormalParagraphStyle" Name="NormalParagraphStyle" />` +
        styleEls +
      `</RootParagraphStyleGroup>` +
      `<RootCharacterStyleGroup Self="CharacterStyleGroup/$ID/[Root]">` +
        `<CharacterStyle Self="CharacterStyle/$ID/[No character style]" Name="[No character style]" IsDefault="true" />` +
      `</RootCharacterStyleGroup>` +
    `</idPkg:Styles>`
  );
}

function buildGraphic(): string {
  const colorEls = SWATCHES.map(sw =>
    `<Color Self="Color/${sw.name}" Name="${sw.name}"` +
    ` ColorValue="${sw.c} ${sw.m} ${sw.y} ${sw.k}" Model="Process" Space="CMYK" />`
  ).join('');

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<idPkg:Graphic xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">` +
      colorEls +
      `<Swatch Self="Swatch/None" Name="None" />` +
      `<Swatch Self="Swatch/Paper" Name="Paper" />` +
      `<Swatch Self="Swatch/Black" Name="Black" />` +
      `<Swatch Self="Swatch/Registration" Name="Registration" />` +
      `<StrokeStyle Self="StrokeStyle/$ID/Solid" />` +
    `</idPkg:Graphic>`
  );
}

function buildFonts(): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<idPkg:Fonts xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">` +
      `<FontFamily Self="FontFamily/Helvetica" Name="Helvetica">` +
        `<Font Self="Font/Helvetica Regular" PostScriptName="Helvetica" FontStyleName="Regular" />` +
        `<Font Self="Font/Helvetica Bold"    PostScriptName="Helvetica-Bold" FontStyleName="Bold" />` +
      `</FontFamily>` +
    `</idPkg:Fonts>`
  );
}

function buildPreferences(): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<idPkg:Preferences xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">` +
      `<ViewPreference ShowRulers="true" HorizontalMeasurementUnits="Points" VerticalMeasurementUnits="Points" />` +
      `<DocumentPreference PageWidth="${pt(W)}" PageHeight="${pt(H)}"` +
        ` PageOrientation="Portrait"` +
        ` DocumentBleedTopOffset="0" DocumentBleedBottomOffset="0"` +
        ` DocumentBleedInsideOrLeftOffset="0" DocumentBleedOutsideOrRightOffset="0"` +
        ` PagesPerDocument="3" />` +
    `</idPkg:Preferences>`
  );
}

function buildMasterSpread(): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<idPkg:MasterSpread xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">` +
      `<MasterSpread Self="MasterSpread/$ID/[None]" NamePrefix="" BaseName="[None]" ShowMasterItems="true" PageCount="1">` +
        `<Page Self="MasterPage/$ID/[None]" Name="[None]"` +
          ` GeometricBounds="0 0 ${pt(H)} ${pt(W)}"` +
          ` ItemTransform="1 0 0 1 0 0"` +
          ` AppliedMaster="n"` +
          ` MasterPageTransform="1 0 0 1 0 0"` +
          ` TabOrder="" />` +
      `</MasterSpread>` +
    `</idPkg:MasterSpread>`
  );
}

function buildBackingStory(): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<idPkg:BackingStory xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">` +
      `<XmlStory Self="XmlBackingStory" TrackChanges="false" StoryTitle="" AppliedTOCStyle="n" AppliedNamedGrid="n">` +
      `</XmlStory>` +
    `</idPkg:BackingStory>`
  );
}

function buildTags(): string {
  const tags = ['address','headline','tagline','description','highlight','spec','pricing','photo','footer'];
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<idPkg:Tags xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">` +
      tags.map(t => `<XMLTag Self="XMLTag/${t}" Name="${t}" />`).join('') +
    `</idPkg:Tags>`
  );
}

function buildMapping(): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<idPkg:Mapping xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">` +
    `</idPkg:Mapping>`
  );
}

function buildContainer(): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">` +
      `<rootfiles>` +
        `<rootfile full-path="designmap.xml" media-type="application/vnd.adobe.indesign-idml-package" />` +
      `</rootfiles>` +
    `</container>`
  );
}

function buildDesignMap(addr: string, spreadIds: string[], storyIds: string[]): string {
  const spreadSrcs = spreadIds.map(id =>
    `<idPkg:Spread src="Spreads/Spread_${id}.xml" />`).join('');
  const storySrcs = storyIds.map(id =>
    `<idPkg:Story src="Stories/Story_${id}.xml" />`).join('');
  const storyList = storyIds.join(' ');

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Document xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging"` +
      ` DOMVersion="18.0"` +
      ` Self="d"` +
      ` ActiveLayer="Layer1"` +
      ` StoryList="${storyList}"` +
      ` ZeroPoint="0 0"` +
      ` ActiveProcess="CMYK"` +
      ` Name="${esc(addr)} Brochure">` +
      `<idPkg:MasterSpread src="MasterSpreads/MasterSpread_uNone.xml" />` +
      spreadSrcs +
      storySrcs +
      `<idPkg:Graphic src="Resources/Graphic.xml" />` +
      `<idPkg:Fonts src="Resources/Fonts.xml" />` +
      `<idPkg:Styles src="Resources/Styles.xml" />` +
      `<idPkg:Preferences src="Resources/Preferences.xml" />` +
      `<idPkg:Tags src="XML/Tags.xml" />` +
      `<idPkg:Mapping src="XML/Mapping.xml" />` +
      `<idPkg:BackingStory src="XML/BackingStory.xml" />` +
      `<Layer Self="Layer1" Name="Layer 1" />` +
    `</Document>`
  );
}

// ─── XML validation (browser DOMParser) ──────────────────────────────────────

function validateXml(xml: string, filename: string): void {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    const err = doc.querySelector('parsererror');
    if (err) {
      console.error(`[IDML] XML error in ${filename}:`, err.textContent);
      throw new Error(`Invalid XML in ${filename}: ${err.textContent?.slice(0, 200)}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Invalid XML')) throw e;
    // DOMParser not available (SSR) — skip validation
  }
}

// ─── ZIP assembly helpers ─────────────────────────────────────────────────────

/** Write a local file entry into a raw ZIP byte array. */
function zipEntry(
  filename: string,
  data: Uint8Array,
  compress: boolean,
): { local: Uint8Array; crc: number; compressedSize: number; uncompressedSize: number } {
  const enc   = new TextEncoder();
  const name  = enc.encode(filename);
  const uncompressedSize = data.byteLength;

  // CRC-32
  let crc = 0xFFFFFFFF;
  const crcTable = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c;
    }
    return t;
  })();
  for (let i = 0; i < data.length; i++) crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  crc = (crc ^ 0xFFFFFFFF) >>> 0;

  // For STORE, compressedSize === uncompressedSize
  const compressedData   = data; // no deflate — always STORE for our use-case
  const compressedSize   = compressedData.byteLength;
  const compressionMethod = 0; // STORE

  // Local file header: signature + version + flags + method + mod time + mod date + crc + sizes + name len + extra len
  const header = new DataView(new ArrayBuffer(30 + name.byteLength));
  let o = 0;
  header.setUint32(o, 0x04034B50, true); o += 4; // signature
  header.setUint16(o, 20, true);          o += 2; // version needed
  header.setUint16(o, 0, true);           o += 2; // flags
  header.setUint16(o, compressionMethod, true); o += 2;
  header.setUint16(o, 0, true);           o += 2; // mod time
  header.setUint16(o, 0, true);           o += 2; // mod date
  header.setUint32(o, crc, true);         o += 4;
  header.setUint32(o, compressedSize, true); o += 4;
  header.setUint32(o, uncompressedSize, true); o += 4;
  header.setUint16(o, name.byteLength, true); o += 2;
  header.setUint16(o, 0, true);           o += 2; // extra len
  new Uint8Array(header.buffer).set(name, 30);

  const local = new Uint8Array(header.buffer.byteLength + compressedData.byteLength);
  local.set(new Uint8Array(header.buffer), 0);
  local.set(compressedData, header.buffer.byteLength);

  return { local, crc, compressedSize, uncompressedSize };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function buildIdmlBlob(data: BrochureData): Promise<Blob> {
  // Build all content first
  const pages = [
    { id: 'spr1', pg: 'pg1', num: 1, items: page1Items(data) },
    { id: 'spr2', pg: 'pg2', num: 2, items: page2Items(data) },
    { id: 'spr3', pg: 'pg3', num: 3, items: page3Items(data) },
  ];

  const allStoryIds: string[] = [];
  const storyFiles: Record<string, string> = {};
  for (const p of pages) {
    for (const item of p.items) {
      if (item.storyId && item.storyXml) {
        allStoryIds.push(item.storyId);
        storyFiles[`Stories/Story_${item.storyId}.xml`] = item.storyXml;
      }
    }
  }

  const spreadFiles: Record<string, string> = {};
  for (const p of pages) {
    spreadFiles[`Spreads/Spread_${p.id}.xml`] = spreadXml(p.id, p.pg, p.num, p.items);
  }

  const dm = buildDesignMap(data.cover.displayAddress, pages.map(p => p.id), allStoryIds);

  // Validate all XML
  const allFiles: Record<string, string> = {
    'META-INF/container.xml':               buildContainer(),
    'Resources/Graphic.xml':                buildGraphic(),
    'Resources/Styles.xml':                 buildStyles(),
    'Resources/Fonts.xml':                  buildFonts(),
    'Resources/Preferences.xml':            buildPreferences(),
    'MasterSpreads/MasterSpread_uNone.xml': buildMasterSpread(),
    'XML/BackingStory.xml':                 buildBackingStory(),
    'XML/Tags.xml':                         buildTags(),
    'XML/Mapping.xml':                      buildMapping(),
    'designmap.xml':                        dm,
    ...storyFiles,
    ...spreadFiles,
  };

  for (const [path, xml] of Object.entries(allFiles)) {
    validateXml(xml, path);
  }

  /**
   * CRITICAL: IDML spec requires the `mimetype` entry to be:
   *   1. The VERY FIRST entry in the ZIP central directory
   *   2. Stored with STORE (no compression, method=0)
   *   3. No extra fields, no data descriptor
   *
   * JSZip does NOT guarantee entry order reliably even with { compression: 'STORE' }.
   * We therefore build the ZIP manually so `mimetype` is byte-0.
   */
  const enc     = new TextEncoder();
  const MIME    = 'application/vnd.adobe.indesign-idml-package';
  const mimeBytes = enc.encode(MIME);

  // Use JSZip for everything except mimetype (it handles DEFLATE efficiently)
  const zip = new JSZip();
  for (const [path, xml] of Object.entries(allFiles)) {
    zip.file(path, xml);
  }
  const zipBlob  = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });

  // --- Build a new ZIP with mimetype first, then append all JSZip entries ---
  // Parse the JSZip output to extract entries and rebuild with mimetype prepended.
  // Simpler approach: build the whole ZIP from scratch using JSZip with STORE for mimetype,
  // but generate with streamFiles so order is preserved.

  // The most reliable approach: build raw ZIP bytes manually.
  const parts: Uint8Array[] = [];
  const centralDir: Array<{
    name: Uint8Array;
    crc: number;
    compressedSize: number;
    uncompressedSize: number;
    offset: number;
  }> = [];
  let offset = 0;

  // Helper to write one STORE entry
  function writeEntry(filename: string, content: string | Uint8Array): void {
    const nameBytes    = enc.encode(filename);
    const dataBytes    = typeof content === 'string' ? enc.encode(content) : content;
    const uncompSize   = dataBytes.byteLength;

    // CRC-32
    const crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      crcTable[i] = c;
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < dataBytes.length; i++) {
      crc = crcTable[(crc ^ dataBytes[i]) & 0xFF] ^ (crc >>> 8);
    }
    crc = (crc ^ 0xFFFFFFFF) >>> 0;

    // Local file header (30 bytes + name)
    const lhBuf = new ArrayBuffer(30 + nameBytes.byteLength);
    const lh    = new DataView(lhBuf);
    lh.setUint32(0,  0x04034B50, true); // sig
    lh.setUint16(4,  20,         true); // version needed
    lh.setUint16(6,  0,          true); // flags
    lh.setUint16(8,  0,          true); // STORE
    lh.setUint16(10, 0,          true); // mod time
    lh.setUint16(12, 0,          true); // mod date
    lh.setUint32(14, crc,        true);
    lh.setUint32(18, uncompSize, true); // compressed = uncompressed for STORE
    lh.setUint32(22, uncompSize, true);
    lh.setUint16(26, nameBytes.byteLength, true);
    lh.setUint16(28, 0,          true); // extra len
    new Uint8Array(lhBuf).set(nameBytes, 30);

    centralDir.push({ name: nameBytes, crc, compressedSize: uncompSize, uncompressedSize: uncompSize, offset });
    parts.push(new Uint8Array(lhBuf));
    parts.push(dataBytes);
    offset += lhBuf.byteLength + dataBytes.byteLength;
  }

  // 1. mimetype FIRST
  writeEntry('mimetype', MIME);

  // 2. All other files
  for (const [path, xml] of Object.entries(allFiles)) {
    writeEntry(path, xml);
  }

  // 3. Central directory
  const cdOffset = offset;
  for (const entry of centralDir) {
    const cdBuf = new ArrayBuffer(46 + entry.name.byteLength);
    const cd    = new DataView(cdBuf);
    cd.setUint32(0,  0x02014B50,              true); // sig
    cd.setUint16(4,  20,                      true); // version made
    cd.setUint16(6,  20,                      true); // version needed
    cd.setUint16(8,  0,                       true); // flags
    cd.setUint16(10, 0,                       true); // STORE
    cd.setUint16(12, 0,                       true); // mod time
    cd.setUint16(14, 0,                       true); // mod date
    cd.setUint32(16, entry.crc,               true);
    cd.setUint32(20, entry.compressedSize,    true);
    cd.setUint32(24, entry.uncompressedSize,  true);
    cd.setUint16(28, entry.name.byteLength,   true);
    cd.setUint16(30, 0,                       true); // extra
    cd.setUint16(32, 0,                       true); // comment
    cd.setUint16(34, 0,                       true); // disk start
    cd.setUint16(36, 0,                       true); // int attr
    cd.setUint32(38, 0,                       true); // ext attr
    cd.setUint32(42, entry.offset,            true); // local header offset
    new Uint8Array(cdBuf).set(entry.name, 46);
    parts.push(new Uint8Array(cdBuf));
    offset += cdBuf.byteLength;
  }

  // 4. End of central directory record
  const cdSize   = offset - cdOffset;
  const eocdBuf  = new ArrayBuffer(22);
  const eocd     = new DataView(eocdBuf);
  eocd.setUint32(0,  0x06054B50,           true); // sig
  eocd.setUint16(4,  0,                    true); // disk number
  eocd.setUint16(6,  0,                    true); // start disk
  eocd.setUint16(8,  centralDir.length,    true); // entries on disk
  eocd.setUint16(10, centralDir.length,    true); // total entries
  eocd.setUint32(12, cdSize,               true);
  eocd.setUint32(16, cdOffset,             true);
  eocd.setUint16(20, 0,                    true); // comment len
  parts.push(new Uint8Array(eocdBuf));

  return new Blob(parts.map(p => p.buffer as ArrayBuffer), { type: 'application/vnd.adobe.indesign-idml-package' });
}

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
