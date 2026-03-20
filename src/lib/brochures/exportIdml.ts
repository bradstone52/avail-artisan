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

// ─── Public API ───────────────────────────────────────────────────────────────

export async function buildIdmlBlob(data: BrochureData): Promise<Blob> {
  const zip = new JSZip();

  // 1. mimetype — MUST be first and uncompressed (IDML spec §3)
  zip.file('mimetype', 'application/vnd.adobe.indesign-idml-package', { compression: 'STORE' });

  // 2. Static resource files
  const resources: Record<string, string> = {
    'META-INF/container.xml':              buildContainer(),
    'Resources/Graphic.xml':               buildGraphic(),
    'Resources/Styles.xml':                buildStyles(),
    'Resources/Fonts.xml':                 buildFonts(),
    'Resources/Preferences.xml':           buildPreferences(),
    'MasterSpreads/MasterSpread_uNone.xml': buildMasterSpread(),
    'XML/BackingStory.xml':                buildBackingStory(),
    'XML/Tags.xml':                        buildTags(),
    'XML/Mapping.xml':                     buildMapping(),
  };

  for (const [path, xml] of Object.entries(resources)) {
    validateXml(xml, path);
    zip.file(path, xml);
  }

  // 3. Build page items
  const pages = [
    { id: 'spr1', pg: 'pg1', num: 1, items: page1Items(data) },
    { id: 'spr2', pg: 'pg2', num: 2, items: page2Items(data) },
    { id: 'spr3', pg: 'pg3', num: 3, items: page3Items(data) },
  ];

  // 4. Collect all story IDs before writing designmap
  const allStoryIds: string[] = [];
  for (const p of pages) {
    for (const item of p.items) {
      if (item.storyId && item.storyXml) {
        allStoryIds.push(item.storyId);
        validateXml(item.storyXml, `Stories/Story_${item.storyId}.xml`);
        zip.file(`Stories/Story_${item.storyId}.xml`, item.storyXml);
      }
    }
  }

  // 5. Write spread files
  for (const p of pages) {
    const xml = spreadXml(p.id, p.pg, p.num, p.items);
    validateXml(xml, `Spreads/Spread_${p.id}.xml`);
    zip.file(`Spreads/Spread_${p.id}.xml`, xml);
  }

  // 6. Write designmap last (needs all storyIds)
  const dm = buildDesignMap(data.cover.displayAddress, pages.map(p => p.id), allStoryIds);
  validateXml(dm, 'designmap.xml');
  zip.file('designmap.xml', dm);

  return zip.generateAsync({ type: 'blob' });
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
