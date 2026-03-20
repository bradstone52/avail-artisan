/**
 * exportIdml.ts  — Adobe InDesign IDML generator
 *
 * IDML ZIP structure (strict order matters):
 *   [0] mimetype              — STORE (method=0), no compression, MUST be first
 *   [1] META-INF/container.xml
 *   [2] designmap.xml
 *   [3] Resources/Graphic.xml
 *   [4] Resources/Styles.xml
 *   [5] Resources/Fonts.xml
 *   [6] Resources/Preferences.xml
 *   [7] MasterSpreads/MasterSpread_uNone.xml
 *   [8] Spreads/Spread_*.xml   (frame elements; NO <Story> nodes here)
 *   [9] Stories/Story_*.xml   (one file per story ID)
 *  [10] XML/BackingStory.xml
 *  [11] XML/Tags.xml
 *  [12] XML/Mapping.xml
 */

import type { BrochureData } from './brochureTypes';

// ─── Page geometry (US Letter, points) ───────────────────────────────────────
const W  = 612;
const H  = 792;
const ML = 36;
const MR = 36;
const MT = 56;
const MB = 50;
const CW = W - ML - MR; // 540

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip non-ASCII / control chars and XML-escape. */
function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' ')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pt(n: number): string { return n.toFixed(3); }

/** Rect path for a frame at (0,0) sized w×h (local coords). */
function rectPath(w: number, h: number): string {
  const tl = `0.000 0.000`;
  const tr = `${pt(w)} 0.000`;
  const br = `${pt(w)} ${pt(h)}`;
  const bl = `0.000 ${pt(h)}`;
  return (
    `<Properties>` +
      `<PathGeometry>` +
        `<GeometryPathType PathOpen="false">` +
          `<PathPointArray>` +
            `<PathPointType Anchor="${tl}" LeftDirection="${tl}" RightDirection="${tl}"/>` +
            `<PathPointType Anchor="${tr}" LeftDirection="${tr}" RightDirection="${tr}"/>` +
            `<PathPointType Anchor="${br}" LeftDirection="${br}" RightDirection="${br}"/>` +
            `<PathPointType Anchor="${bl}" LeftDirection="${bl}" RightDirection="${bl}"/>` +
          `</PathPointArray>` +
        `</GeometryPathType>` +
      `</PathGeometry>` +
    `</Properties>`
  );
}

// ─── Frame builders ───────────────────────────────────────────────────────────

interface FrameItem {
  frameXml: string;
  storyId: string | null;
  storyXml: string | null;
}

let _frameSeq = 0;
function uid(prefix: string): string { return `${prefix}${++_frameSeq}`; }

function mkTextFrame(
  x: number, y: number, w: number, h: number,
  style: string, content: string,
): FrameItem {
  const id  = uid('tf');
  const sid = uid('st');
  return {
    frameXml: (
      `<TextFrame Self="${id}" ParentStory="${sid}"` +
        ` ItemTransform="1 0 0 1 ${pt(x)} ${pt(y)}"` +
        ` AppliedObjectStyle="ObjectStyle/$ID/[None]"` +
        ` ContentType="TextType">` +
        rectPath(w, h) +
      `</TextFrame>`
    ),
    storyId: sid,
    storyXml: (
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<idPkg:Story xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">` +
        `<Story Self="${sid}" AppliedTOCStyle="n" TrackChanges="false"` +
          ` StoryTitle="" AppliedNamedGrid="n">` +
          `<StoryPreference OpticalMarginAlignment="false" OpticalMarginSize="12"/>` +
          `<InCopyExportOption IncludeGraphicProxies="true" IncludeAllResources="false"/>` +
          `<ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/${style}">` +
            `<CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]">` +
              `<Content>${esc(content)}</Content>` +
            `</CharacterStyleRange>` +
          `</ParagraphStyleRange>` +
        `</Story>` +
      `</idPkg:Story>`
    ),
  };
}

function mkColorRect(
  x: number, y: number, w: number, h: number, fill: string,
): FrameItem {
  const id = uid('rc');
  return {
    frameXml: (
      `<Rectangle Self="${id}"` +
        ` ItemTransform="1 0 0 1 ${pt(x)} ${pt(y)}"` +
        ` AppliedObjectStyle="ObjectStyle/$ID/[None]"` +
        ` FillColor="Color/${fill}"` +
        ` StrokeWeight="0"` +
        ` ContentType="Unassigned">` +
        rectPath(w, h) +
      `</Rectangle>`
    ),
    storyId: null,
    storyXml: null,
  };
}

/**
 * imageRegistry maps original URL → { linkPath, bytes } so we fetch each
 * unique image only once and write it as a real file inside Links/ in the ZIP.
 */
type ImageEntry = { linkPath: string; bytes: Uint8Array | null };
let _imageRegistry: Map<string, ImageEntry>;
let _imageSeq = 0;

function registerImage(url: string): string {
  if (_imageRegistry.has(url)) return _imageRegistry.get(url)!.linkPath;
  const linkPath = `Links/image${++_imageSeq}.jpg`;
  _imageRegistry.set(url, { linkPath, bytes: null });
  return linkPath;
}

function mkImageFrame(
  x: number, y: number, w: number, h: number,
  /** Original URL — will be replaced with Links/imageN.jpg in the ZIP */
  url: string,
): FrameItem {
  const linkPath = registerImage(url);
  const id     = uid('rf');
  const imgId  = uid('im');
  const lnkId  = uid('lk');
  return {
    frameXml: (
      `<Rectangle Self="${id}"` +
        ` ItemTransform="1 0 0 1 ${pt(x)} ${pt(y)}"` +
        ` AppliedObjectStyle="ObjectStyle/$ID/[None]"` +
        ` ContentType="GraphicType">` +
        rectPath(w, h) +
        `<Image Self="${imgId}" ItemTransform="1 0 0 1 0 0"` +
          ` AppliedObjectStyle="ObjectStyle/$ID/[None]">` +
          `<Properties><Profile type="string">$ID/Linked</Profile></Properties>` +
          `<Link Self="${lnkId}" LinkResourceURI="${esc(linkPath)}"` +
            ` StoredState="Normal" LinkResourceFormat="$ID/JPEG"/>` +
        `</Image>` +
      `</Rectangle>`
    ),
    storyId: null,
    storyXml: null,
  };
}

// ─── Page builders ────────────────────────────────────────────────────────────

type Items = FrameItem[];

function hdr(dealType: string): Items {
  return [
    mkColorRect(0, 0, W, 50, 'White'),
    mkTextFrame(ML, 14, 200, 22, 'Company', 'CLEARVIEW COMMERCIAL REALTY'),
    mkColorRect(W - MR - 120, 12, 120, 26, 'Accent'),
    mkTextFrame(W - MR - 120, 12, 120, 26, 'DealTypeBadge', dealType),
  ];
}

function ftr(address: string, city: string, disclaimer: string): Items {
  return [
    mkColorRect(ML, H - MB, CW, 1, 'Mid'),
    mkTextFrame(ML, H - MB + 7, CW * 0.45, 14, 'Footer', `${address}, ${city}`),
    mkTextFrame(ML + CW * 0.45, H - MB + 5, CW * 0.55, 24, 'Disclaimer', disclaimer),
  ];
}

function page1(data: BrochureData): Items {
  const { cover, copy, snapshots, dealTypeLabel, disclaimer } = data;
  const colW = (CW - 16) / 2;
  const items: Items = [...hdr(dealTypeLabel)];

  if (cover.heroPhotoUrl)
    items.push(mkImageFrame(0, 50, W, 240, cover.heroPhotoUrl));

  items.push(mkTextFrame(ML, 302, CW, 26, 'Address', cover.displayAddress));
  items.push(mkTextFrame(ML, 330, CW, 14, 'Subline',
    `${cover.city} | ${cover.submarket ?? ''}`));
  items.push(mkColorRect(ML, 348, 50, 3, 'Yellow'));
  items.push(mkTextFrame(ML, 356, CW, 34, 'Headline', copy.headline));
  items.push(mkTextFrame(ML, 396, colW, 200, 'Body', copy.description));
  items.push(mkTextFrame(ML + colW + 16, 396, colW, 52, 'Tagline', copy.tagline));

  if (cover.secondaryPhotoUrl)
    items.push(mkImageFrame(ML + colW + 16, 452, colW, 140, cover.secondaryPhotoUrl));

  const chips = snapshots.slice(0, 4);
  chips.forEach((snap, i) => {
    const chipW = CW / chips.length;
    const cx    = ML + i * chipW;
    items.push(mkColorRect(cx, 610, chipW - 4, 40, i % 2 === 0 ? 'Accent' : 'LightBg'));
    items.push(mkTextFrame(cx + 4, 614, chipW - 12, 10, 'SnapshotLabel', snap.label.toUpperCase()));
    items.push(mkTextFrame(cx + 4, 626, chipW - 12, 20, 'SnapshotValue', snap.value));
  });

  items.push(...ftr(cover.displayAddress, cover.city, disclaimer));
  return items;
}

function page2(data: BrochureData): Items {
  const { cover, specs, features, financials, pricing, location, dealTypeLabel, disclaimer } = data;
  const leftW  = CW * 0.60;
  const rightW = CW * 0.38;
  const rightX = ML + leftW + CW * 0.02;
  const rowH   = 18;
  const items: Items = [...hdr(dealTypeLabel)];

  items.push(mkTextFrame(ML, MT, leftW, 14, 'SectionTitle', 'PROPERTY DETAILS'));
  items.push(mkColorRect(ML, MT + 18, leftW, 1, 'Mid'));

  let sy = MT + 26;
  specs.forEach((row, i) => {
    items.push(mkColorRect(ML, sy, leftW, rowH, i % 2 === 0 ? 'LightBg' : 'White'));
    items.push(mkTextFrame(ML + 4, sy + 4, leftW * 0.38, rowH - 5, 'SpecLabel', row.label));
    items.push(mkTextFrame(ML + leftW * 0.38 + 4, sy + 4, leftW * 0.62 - 8, rowH - 5, 'SpecValue', row.value));
    sy += rowH;
  });

  if (features.length > 0) {
    sy += 8;
    const featH = features.length * 15 + 10;
    items.push(mkColorRect(ML, sy, leftW, featH, 'LightBg'));
    items.push(mkColorRect(ML, sy, 3, featH, 'Accent'));
    features.forEach((f, i) =>
      items.push(mkTextFrame(ML + 10, sy + 5 + i * 15, leftW - 14, 13, 'Feature', `+ ${f}`)));
    sy += featH + 8;
  }

  if (financials.length > 0) {
    items.push(mkTextFrame(ML, sy, leftW, 14, 'SectionTitle', 'ADDITIONAL COSTS'));
    sy += 22;
    financials.forEach((row, i) => {
      items.push(mkColorRect(ML, sy, leftW, rowH, i % 2 === 0 ? 'LightBg' : 'White'));
      items.push(mkTextFrame(ML + 4, sy + 4, leftW * 0.45, rowH - 5, 'SpecLabel', row.label));
      items.push(mkTextFrame(ML + leftW * 0.45 + 4, sy + 4, leftW * 0.55 - 8, rowH - 5, 'SpecValue', row.value));
      sy += rowH;
    });
  }

  let ry = MT;
  if (pricing.show) {
    items.push(mkTextFrame(rightX, ry, rightW, 14, 'SectionTitle', 'PRICING'));
    ry += 22;
    if (pricing.rent) {
      items.push(mkColorRect(rightX, ry, rightW, 50, 'Accent'));
      items.push(mkTextFrame(rightX + 8, ry + 5,  rightW - 16, 11, 'PricingLabel', 'ASKING RENT'));
      items.push(mkTextFrame(rightX + 8, ry + 18, rightW - 16, 22, 'PricingValue', pricing.rent));
      ry += 58;
    }
    if (pricing.price) {
      items.push(mkColorRect(rightX, ry, rightW, 50, 'Accent'));
      items.push(mkTextFrame(rightX + 8, ry + 5,  rightW - 16, 11, 'PricingLabel', 'ASKING PRICE'));
      items.push(mkTextFrame(rightX + 8, ry + 18, rightW - 16, 22, 'PricingValue', pricing.price));
      ry += 58;
    }
    ry += 10;
  }

  if (location.staticMapUrl) {
    items.push(mkTextFrame(rightX, ry, rightW, 14, 'SectionTitle', 'LOCATION'));
    ry += 22;
    const mapH = rightW * 0.75;
    items.push(mkImageFrame(rightX, ry, rightW, mapH, location.staticMapUrl));
    ry += mapH + 4;
    items.push(mkTextFrame(rightX, ry, rightW, 12, 'Caption', cover.displayAddress));
  }

  items.push(...ftr(cover.displayAddress, cover.city, disclaimer));
  return items;
}

function page3(data: BrochureData): Items {
  const { cover, copy, snapshots, gallery, broker, dealTypeLabel, disclaimer } = data;
  const items: Items = [...hdr(dealTypeLabel)];
  let cy = MT;

  if (snapshots.length > 0) {
    const snaps = snapshots.slice(0, 6);
    const cellW = CW / snaps.length;
    items.push(mkColorRect(ML, cy, CW, 48, 'Accent'));
    snaps.forEach((snap, i) => {
      const cx = ML + i * cellW;
      items.push(mkTextFrame(cx + 4, cy + 6,  cellW - 8, 10, 'SnapshotLabel', snap.label.toUpperCase()));
      items.push(mkTextFrame(cx + 4, cy + 18, cellW - 8, 22, 'SnapshotValue', snap.value));
    });
    cy += 56;
  }

  items.push(mkTextFrame(ML, cy, CW, 14, 'SectionTitle', 'KEY HIGHLIGHTS'));
  cy += 22;

  const leftH  = copy.highlights.filter((_, i) => i % 2 === 0);
  const rightH = copy.highlights.filter((_, i) => i % 2 !== 0);
  const hlColW = (CW - 16) / 2;

  leftH.forEach((h, i) => {
    items.push(mkColorRect(ML, cy + i * 22 + 5, 5, 5, 'Yellow'));
    items.push(mkTextFrame(ML + 12, cy + i * 22, hlColW - 12, 20, 'Body', h));
  });
  rightH.forEach((h, i) => {
    items.push(mkColorRect(ML + hlColW + 16, cy + i * 22 + 5, 5, 5, 'Yellow'));
    items.push(mkTextFrame(ML + hlColW + 28, cy + i * 22, hlColW - 12, 20, 'Body', h));
  });
  cy += Math.max(leftH.length, rightH.length) * 22 + 16;

  const photos = gallery.slice(0, 3);
  if (photos.length > 0) {
    const photoW = (CW - (photos.length - 1) * 8) / photos.length;
    photos.forEach((p, i) =>
      items.push(mkImageFrame(ML + i * (photoW + 8), cy, photoW, 110, p.photo_url)));
    cy += 118;
  }

  if (broker.includeNotes && broker.notes) {
    items.push(mkColorRect(ML, cy, CW, 60, 'ConfBg'));
    items.push(mkColorRect(ML, cy, 3,  60, 'Yellow'));
    items.push(mkTextFrame(ML + 10, cy + 6,  CW - 14, 12, 'ConfidentialTitle', 'CONFIDENTIAL - BROKER NOTES'));
    items.push(mkTextFrame(ML + 10, cy + 22, CW - 14, 32, 'Body', broker.notes));
  }

  items.push(...ftr(cover.displayAddress, cover.city, disclaimer));
  return items;
}

// ─── XML component builders ───────────────────────────────────────────────────

function xmlDecl(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`;
}

function buildContainer(): string {
  return (
    xmlDecl() +
    `<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">` +
      `<rootfiles>` +
        `<rootfile full-path="designmap.xml"` +
          ` media-type="application/vnd.adobe.indesign-idml-package"/>` +
      `</rootfiles>` +
    `</container>`
  );
}

function buildDesignMap(addr: string, spreadIds: string[], storyIds: string[]): string {
  const spreadSrcs = spreadIds.map(id =>
    `<idPkg:Spread src="Spreads/Spread_${id}.xml"/>`).join('');
  const storySrcs = storyIds.map(id =>
    `<idPkg:Story src="Stories/Story_${id}.xml"/>`).join('');

  return (
    xmlDecl() +
    `<Document xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging"` +
      ` DOMVersion="18.0" Self="d" ActiveLayer="Layer1"` +
      ` StoryList="${storyIds.join(' ')}"` +
      ` ZeroPoint="0 0" ActiveProcess="CMYK"` +
      ` Name="${esc(addr)}">` +
      `<idPkg:MasterSpread src="MasterSpreads/MasterSpread_uNone.xml"/>` +
      spreadSrcs +
      storySrcs +
      `<idPkg:Graphic src="Resources/Graphic.xml"/>` +
      `<idPkg:Fonts src="Resources/Fonts.xml"/>` +
      `<idPkg:Styles src="Resources/Styles.xml"/>` +
      `<idPkg:Preferences src="Resources/Preferences.xml"/>` +
      `<idPkg:Tags src="XML/Tags.xml"/>` +
      `<idPkg:Mapping src="XML/Mapping.xml"/>` +
      `<idPkg:BackingStory src="XML/BackingStory.xml"/>` +
      `<Layer Self="Layer1" Name="Layer 1"/>` +
    `</Document>`
  );
}

function buildGraphic(): string {
  const swatches = [
    { name: 'Accent',  c: 89, m: 62, y:   0, k: 37 },
    { name: 'Yellow',  c:  0, m: 34, y: 100, k: 15 },
    { name: 'Black',   c:  0, m:  0, y:   0, k: 90 },
    { name: 'Mid',     c:  0, m:  0, y:   0, k: 60 },
    { name: 'White',   c:  0, m:  0, y:   0, k:  0 },
    { name: 'LightBg', c:  5, m:  3, y:   0, k:  5 },
    { name: 'ConfBg',  c:  0, m:  6, y:  22, k:  0 },
  ];
  const colorXml = swatches.map(sw =>
    `<Color Self="Color/${sw.name}" Name="${sw.name}"` +
    ` ColorValue="${sw.c} ${sw.m} ${sw.y} ${sw.k}"` +
    ` Model="Process" Space="CMYK"/>`
  ).join('');

  return (
    xmlDecl() +
    `<idPkg:Graphic xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">` +
      colorXml +
      `<Swatch Self="Swatch/None" Name="None"/>` +
      `<Swatch Self="Swatch/Paper" Name="Paper"/>` +
      `<Swatch Self="Swatch/Black" Name="Black"/>` +
      `<Swatch Self="Swatch/Registration" Name="Registration"/>` +
      `<StrokeStyle Self="StrokeStyle/$ID/Solid"/>` +
    `</idPkg:Graphic>`
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

  const styleXml = defs.map(st =>
    `<ParagraphStyle Self="ParagraphStyle/${st.name}" Name="${st.name}"` +
    ` PointSize="${st.size}" FontStyle="${st.weight}"` +
    ` FillColor="Color/${st.color}" Leading="${st.leading}"` +
    ` HyphenateCapitalizedWords="false" Justification="LeftAlign"/>`
  ).join('');

  return (
    xmlDecl() +
    `<idPkg:Styles xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">` +
      `<RootParagraphStyleGroup Self="ParagraphStyleGroup/$ID/[Root]">` +
        `<ParagraphStyle Self="ParagraphStyle/$ID/[No paragraph style]"` +
          ` Name="[No paragraph style]" IsDefault="true"/>` +
        `<ParagraphStyle Self="ParagraphStyle/$ID/NormalParagraphStyle"` +
          ` Name="NormalParagraphStyle"/>` +
        styleXml +
      `</RootParagraphStyleGroup>` +
      `<RootCharacterStyleGroup Self="CharacterStyleGroup/$ID/[Root]">` +
        `<CharacterStyle Self="CharacterStyle/$ID/[No character style]"` +
          ` Name="[No character style]" IsDefault="true"/>` +
      `</RootCharacterStyleGroup>` +
    `</idPkg:Styles>`
  );
}

function buildFonts(): string {
  return (
    xmlDecl() +
    `<idPkg:Fonts xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">` +
      `<FontFamily Self="FontFamily/Helvetica" Name="Helvetica">` +
        `<Font Self="Font/Helvetica Regular" PostScriptName="Helvetica"` +
          ` FontStyleName="Regular"/>` +
        `<Font Self="Font/Helvetica Bold" PostScriptName="Helvetica-Bold"` +
          ` FontStyleName="Bold"/>` +
      `</FontFamily>` +
    `</idPkg:Fonts>`
  );
}

function buildPreferences(): string {
  return (
    xmlDecl() +
    `<idPkg:Preferences xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">` +
      `<ViewPreference ShowRulers="true"` +
        ` HorizontalMeasurementUnits="Points"` +
        ` VerticalMeasurementUnits="Points"/>` +
      `<DocumentPreference PageWidth="${pt(W)}" PageHeight="${pt(H)}"` +
        ` PageOrientation="Portrait"` +
        ` DocumentBleedTopOffset="0" DocumentBleedBottomOffset="0"` +
        ` DocumentBleedInsideOrLeftOffset="0"` +
        ` DocumentBleedOutsideOrRightOffset="0"` +
        ` PagesPerDocument="3"/>` +
    `</idPkg:Preferences>`
  );
}

function buildMasterSpread(): string {
  return (
    xmlDecl() +
    `<idPkg:MasterSpread xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">` +
      `<MasterSpread Self="MasterSpread/$ID/[None]" NamePrefix="" BaseName="[None]"` +
        ` ShowMasterItems="true" PageCount="1">` +
        `<Page Self="MasterPage/$ID/[None]" Name="[None]"` +
          ` GeometricBounds="0 0 ${pt(H)} ${pt(W)}"` +
          ` ItemTransform="1 0 0 1 0 0"` +
          ` AppliedMaster="n"` +
          ` MasterPageTransform="1 0 0 1 0 0"` +
          ` TabOrder=""/>` +
      `</MasterSpread>` +
    `</idPkg:MasterSpread>`
  );
}

function buildSpread(spreadId: string, pageId: string, pageNum: number, items: Items): string {
  return (
    xmlDecl() +
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
            `<Descriptor type="list">` +
              `<ListItem type="string">${pageId}</ListItem>` +
            `</Descriptor>` +
            `<PageColor type="enumeration">UseMasterColor</PageColor>` +
          `</Properties>` +
        `</Page>` +
        items.map(f => f.frameXml).join('') +
      `</Spread>` +
    `</idPkg:Spread>`
  );
}

function buildBackingStory(): string {
  return (
    xmlDecl() +
    `<idPkg:BackingStory xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">` +
      `<XmlStory Self="XmlBackingStory" TrackChanges="false"` +
        ` StoryTitle="" AppliedTOCStyle="n" AppliedNamedGrid="n">` +
      `</XmlStory>` +
    `</idPkg:BackingStory>`
  );
}

function buildTags(): string {
  const tags = ['address','headline','tagline','body','spec','pricing','photo','footer'];
  return (
    xmlDecl() +
    `<idPkg:Tags xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">` +
      tags.map(t => `<XMLTag Self="XMLTag/${t}" Name="${t}"/>`).join('') +
    `</idPkg:Tags>`
  );
}

function buildMapping(): string {
  return (
    xmlDecl() +
    `<idPkg:Mapping xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">` +
    `</idPkg:Mapping>`
  );
}

// ─── XML validation ───────────────────────────────────────────────────────────

function validateXml(xml: string, name: string): void {
  try {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const err = doc.querySelector('parsererror');
    if (err) {
      const msg = err.textContent?.slice(0, 300) ?? 'unknown error';
      console.error(`[IDML] Bad XML in ${name}:`, msg);
      throw new Error(`Bad XML in ${name}: ${msg}`);
    }
  } catch (e) {
    if ((e as Error).message?.startsWith('Bad XML')) throw e;
  }
}

// ─── Raw ZIP builder (guarantees mimetype is byte-0, method=STORE) ────────────

function crc32(data: Uint8Array): number {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++)
    crc = table[(crc ^ data[i]) & 0xFF]! ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function buildZip(entries: Array<{ name: string; data: Uint8Array }>): Blob {
  const enc       = new TextEncoder();
  const locals:   Uint8Array[] = [];
  const centralDir: Uint8Array[] = [];
  const offsets:  number[] = [];
  let   localOffset = 0;

  for (const entry of entries) {
    const nameBytes = enc.encode(entry.name);
    const data      = entry.data;
    const crc       = crc32(data);
    const size      = data.byteLength;

    // Local file header
    const lh  = new DataView(new ArrayBuffer(30 + nameBytes.byteLength));
    lh.setUint32(0,  0x04034B50, true); // PK\x03\x04
    lh.setUint16(4,  20,         true); // version needed: 2.0
    lh.setUint16(6,  0,          true); // flags
    lh.setUint16(8,  0,          true); // compression: STORE
    lh.setUint16(10, 0,          true); // mod time
    lh.setUint16(12, 0,          true); // mod date
    lh.setUint32(14, crc,        true);
    lh.setUint32(18, size,       true); // compressed size
    lh.setUint32(22, size,       true); // uncompressed size
    lh.setUint16(26, nameBytes.byteLength, true);
    lh.setUint16(28, 0,          true); // extra len
    new Uint8Array(lh.buffer).set(nameBytes, 30);

    offsets.push(localOffset);
    locals.push(new Uint8Array(lh.buffer), data);
    localOffset += lh.buffer.byteLength + data.byteLength;

    // Central directory header
    const cd  = new DataView(new ArrayBuffer(46 + nameBytes.byteLength));
    cd.setUint32(0,  0x02014B50, true); // PK\x01\x02
    cd.setUint16(4,  20,         true); // version made by
    cd.setUint16(6,  20,         true); // version needed
    cd.setUint16(8,  0,          true); // flags
    cd.setUint16(10, 0,          true); // STORE
    cd.setUint16(12, 0,          true); // mod time
    cd.setUint16(14, 0,          true); // mod date
    cd.setUint32(16, crc,        true);
    cd.setUint32(20, size,       true); // compressed
    cd.setUint32(24, size,       true); // uncompressed
    cd.setUint16(28, nameBytes.byteLength, true);
    cd.setUint16(30, 0,          true); // extra
    cd.setUint16(32, 0,          true); // comment
    cd.setUint16(34, 0,          true); // disk start
    cd.setUint16(36, 0,          true); // internal attr
    cd.setUint32(38, 0,          true); // external attr
    cd.setUint32(42, offsets[offsets.length - 1]!, true); // local header offset
    new Uint8Array(cd.buffer).set(nameBytes, 46);
    centralDir.push(new Uint8Array(cd.buffer));
  }

  // Compute central directory size
  const cdSize   = centralDir.reduce((s, b) => s + b.byteLength, 0);
  const cdOffset = localOffset;

  // End of central directory record
  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0,  0x06054B50,        true); // PK\x05\x06
  eocd.setUint16(4,  0,                 true); // disk number
  eocd.setUint16(6,  0,                 true); // start disk
  eocd.setUint16(8,  entries.length,    true); // entries on disk
  eocd.setUint16(10, entries.length,    true); // total entries
  eocd.setUint32(12, cdSize,            true);
  eocd.setUint32(16, cdOffset,          true);
  eocd.setUint16(20, 0,                 true); // comment len

  const parts: ArrayBuffer[] = [
    ...locals.map(u => u.buffer as ArrayBuffer),
    ...centralDir.map(u => u.buffer as ArrayBuffer),
    eocd.buffer,
  ];

  return new Blob(parts, { type: 'application/vnd.adobe.indesign-idml-package' });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function buildIdmlBlob(data: BrochureData): Promise<Blob> {
  // Reset frame/image counters so IDs are deterministic per call
  _frameSeq = 0;
  _imageSeq = 0;
  _imageRegistry = new Map();

  const pages = [
    { id: 'spr1', pg: 'pg1', num: 1, items: page1(data) },
    { id: 'spr2', pg: 'pg2', num: 2, items: page2(data) },
    { id: 'spr3', pg: 'pg3', num: 3, items: page3(data) },
  ];

  // Collect all story IDs + their XML
  const allStoryIds: string[] = [];
  const storyMap: Record<string, string> = {};
  for (const p of pages) {
    for (const item of p.items) {
      if (item.storyId && item.storyXml) {
        allStoryIds.push(item.storyId);
        storyMap[item.storyId] = item.storyXml;
      }
    }
  }

  // Build spread XML (frames only, no stories)
  const spreadMap: Record<string, string> = {};
  for (const p of pages) {
    spreadMap[p.id] = buildSpread(p.id, p.pg, p.num, p.items);
  }

  const designMap = buildDesignMap(data.cover.displayAddress, pages.map(p => p.id), allStoryIds);

  // All XML files to validate
  const xmlFiles: Record<string, string> = {
    'META-INF/container.xml':               buildContainer(),
    'designmap.xml':                        designMap,
    'Resources/Graphic.xml':                buildGraphic(),
    'Resources/Styles.xml':                 buildStyles(),
    'Resources/Fonts.xml':                  buildFonts(),
    'Resources/Preferences.xml':            buildPreferences(),
    'MasterSpreads/MasterSpread_uNone.xml': buildMasterSpread(),
    'XML/BackingStory.xml':                 buildBackingStory(),
    'XML/Tags.xml':                         buildTags(),
    'XML/Mapping.xml':                      buildMapping(),
  };
  for (const [id, xml] of Object.entries(spreadMap)) {
    xmlFiles[`Spreads/Spread_${id}.xml`] = xml;
  }
  for (const [id, xml] of Object.entries(storyMap)) {
    xmlFiles[`Stories/Story_${id}.xml`] = xml;
  }

  for (const [path, xml] of Object.entries(xmlFiles)) {
    validateXml(xml, path);
  }

  // ── Fetch all registered images and write them into Links/ ───────────────
  await Promise.all(
    Array.from(_imageRegistry.entries()).map(async ([url, entry]) => {
      try {
        const resp = await fetch(url);
        if (!resp.ok) return;
        const buf = await resp.arrayBuffer();
        entry.bytes = new Uint8Array(buf);
      } catch {
        // image fetch failed — InDesign will show a missing-link warning but still open
      }
    })
  );

  const enc = new TextEncoder();

  // Build ordered entries array — mimetype MUST be first
  const entries: Array<{ name: string; data: Uint8Array }> = [
    { name: 'mimetype', data: enc.encode('application/vnd.adobe.indesign-idml-package') },
  ];
  for (const [path, xml] of Object.entries(xmlFiles)) {
    entries.push({ name: path, data: enc.encode(xml) });
  }
  // Append each image file under Links/
  for (const entry of _imageRegistry.values()) {
    if (entry.bytes) {
      entries.push({ name: entry.linkPath, data: entry.bytes });
    }
  }

  return buildZip(entries);
}

export async function downloadIdml(data: BrochureData, filename?: string): Promise<void> {
  const blob = await buildIdmlBlob(data);
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename ?? `${data.cover.displayAddress.replace(/[^a-zA-Z0-9]/g, '-')}.idml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
