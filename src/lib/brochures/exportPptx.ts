import PptxGenJS from 'pptxgenjs';
import type { BrochureProps } from './brochureTypes';

const WHITE = 'FFFFFF';
const NAVY = '0f2044';
const GRAY = '666666';

function acHex(color: string): string {
  return color.replace('#', '');
}

const typeBadge = (type: BrochureProps['type']) => {
  switch (type) {
    case 'sale': return 'FOR SALE';
    case 'lease': return 'FOR LEASE';
    case 'sale-lease': return 'FOR SALE / FOR LEASE';
  }
};

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportBrochureAsPptx(props: BrochureProps): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'LETTER', width: 8.5, height: 11 });
  pptx.layout = 'LETTER';
  const ac = acHex(props.accentColor);

  // ── Slide 1: Cover ──
  const s1 = pptx.addSlide();
  // Navy background
  s1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 8.5, h: 11, fill: { color: NAVY } });

  // Primary photo top half
  if (props.primaryPhotoUrl) {
    const b64 = await fetchImageAsBase64(props.primaryPhotoUrl);
    if (b64) {
      s1.addImage({ data: b64, x: 0, y: 0, w: 8.5, h: 6 });
    }
  }

  // Building SF / address
  s1.addText(props.buildingSF || props.address, {
    x: 0.5, y: 4.2, w: 7.5, h: 1,
    color: WHITE, fontSize: 48, bold: true, fontFace: 'Arial',
  });

  // Type badge
  s1.addShape(pptx.ShapeType.rect, { x: 0.5, y: 5.3, w: 3, h: 0.45, fill: { color: ac } });
  s1.addText(typeBadge(props.type), {
    x: 0.5, y: 5.3, w: 3, h: 0.45,
    color: WHITE, fontSize: 12, bold: true, fontFace: 'Arial', margin: [0, 0, 0, 10],
  });

  // Address in navy section
  s1.addText(props.address, {
    x: 0.5, y: 7, w: 7, h: 0.6,
    color: WHITE, fontSize: 28, bold: true, fontFace: 'Arial',
  });
  s1.addText(`${props.city}, ${props.province}`, {
    x: 0.5, y: 7.6, w: 7, h: 0.35,
    color: ac, fontSize: 14, bold: true, fontFace: 'Arial',
  });
  if (props.headline) {
    s1.addText(props.headline, {
      x: 0.5, y: 8.1, w: 5, h: 0.4,
      color: WHITE, fontSize: 10, italic: true, fontFace: 'Arial',
    });
  }

  // Company name bottom-right
  s1.addText(props.companyName, {
    x: 5, y: 10.3, w: 3, h: 0.3,
    color: WHITE, fontSize: 8, fontFace: 'Arial', align: 'right',
  });

  // ── Slide 2: Property Details ──
  const s2 = pptx.addSlide();
  s2.addText([
    { text: 'PROPERTY', options: { color: NAVY, fontSize: 24, fontFace: 'Arial' } },
    { text: ' HIGHLIGHTS', options: { color: ac, fontSize: 24, bold: true, fontFace: 'Arial' } },
  ], { x: 0.5, y: 0.5, w: 7.5, h: 0.5 });

  // Accent rule
  s2.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.05, w: 7.5, h: 0.02, fill: { color: ac } });

  // Specs
  const specs: [string, string | undefined][] = [
    ['District', props.district],
    ['Building SF', props.buildingSF],
    ['Land', props.landAcres],
    ['Clear Height', props.clearHeight],
    ['Dock Doors', props.dockDoors],
    ['Grade Doors', props.gradeDoors],
    ['Power', props.power],
    ['Zoning', props.zoning],
    ['Occupancy', props.occupancy],
  ];
  const validSpecs = specs.filter(([, v]) => !!v);

  validSpecs.forEach(([label, value], i) => {
    const rowY = 1.3 + i * 0.45;
    s2.addText(label.toUpperCase(), {
      x: 0.5, y: rowY, w: 2, h: 0.18,
      color: ac, fontSize: 7, fontFace: 'Arial',
    });
    s2.addText(value!, {
      x: 0.5, y: rowY + 0.17, w: 3.5, h: 0.22,
      color: '1a1a1a', fontSize: 10, bold: true, fontFace: 'Arial',
    });
  });

  // Highlights
  s2.addText('HIGHLIGHTS', {
    x: 4.8, y: 1.3, w: 3, h: 0.2,
    color: ac, fontSize: 7, fontFace: 'Arial',
  });
  props.highlights.forEach((h, i) => {
    s2.addText(`●  ${h}`, {
      x: 4.8, y: 1.55 + i * 0.3, w: 3.2, h: 0.25,
      color: '333333', fontSize: 9, fontFace: 'Arial',
    });
  });

  // Pricing block
  const pricingY = 1.55 + Math.max(props.highlights.length, 1) * 0.3 + 0.3;
  s2.addShape(pptx.ShapeType.rect, { x: 4.8, y: pricingY, w: 3.2, h: 1.5, fill: { color: NAVY }, rectRadius: 0.05 });

  if ((props.type === 'sale' || props.type === 'sale-lease') && props.askingPrice) {
    s2.addText('ASKING PRICE', {
      x: 5, y: pricingY + 0.15, w: 2.8, h: 0.15,
      color: ac, fontSize: 7, fontFace: 'Arial',
    });
    s2.addText(props.askingPrice, {
      x: 5, y: pricingY + 0.3, w: 2.8, h: 0.35,
      color: WHITE, fontSize: 18, bold: true, fontFace: 'Arial',
    });
  }
  if ((props.type === 'lease' || props.type === 'sale-lease') && props.leaseRate) {
    const lY = props.type === 'sale-lease' ? pricingY + 0.7 : pricingY + 0.15;
    s2.addText('LEASE RATE', {
      x: 5, y: lY, w: 2.8, h: 0.15,
      color: ac, fontSize: 7, fontFace: 'Arial',
    });
    s2.addText(`${props.leaseRate}${props.leaseType ? ` ${props.leaseType}` : ''}`, {
      x: 5, y: lY + 0.15, w: 2.8, h: 0.35,
      color: WHITE, fontSize: 18, bold: true, fontFace: 'Arial',
    });
  }

  // ── Slide 3: Photos ──
  const s3 = pptx.addSlide();
  s3.addText('INTERIOR & EXTERIOR PHOTOS', {
    x: 0.5, y: 0.4, w: 7.5, h: 0.3,
    color: ac, fontSize: 9, fontFace: 'Arial',
  });
  s3.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.72, w: 7.5, h: 0.02, fill: { color: ac } });

  if (props.primaryPhotoUrl) {
    const b64 = await fetchImageAsBase64(props.primaryPhotoUrl);
    if (b64) {
      s3.addImage({ data: b64, x: 0.5, y: 1, w: 7.5, h: 4 });
    }
  }
  const hasSecondary = !!props.secondaryPhotoUrl;
  const hasAerial = !!props.aerialPhotoUrl;
  if (hasSecondary && hasAerial) {
    const b64s = await fetchImageAsBase64(props.secondaryPhotoUrl!);
    const b64a = await fetchImageAsBase64(props.aerialPhotoUrl!);
    if (b64s) s3.addImage({ data: b64s, x: 0.5, y: 5.1, w: 3.7, h: 2.5 });
    if (b64a) s3.addImage({ data: b64a, x: 4.3, y: 5.1, w: 3.7, h: 2.5 });
  } else if (hasSecondary || hasAerial) {
    const url = props.secondaryPhotoUrl || props.aerialPhotoUrl;
    if (url) {
      const b64 = await fetchImageAsBase64(url);
      if (b64) s3.addImage({ data: b64, x: 0.5, y: 5.1, w: 7.5, h: 2.5 });
    }
  }

  // ── Slide 4: Floor Plan (conditional) ──
  if (props.floorPlanImageUrl) {
    const s4 = pptx.addSlide();
    s4.addText([
      { text: 'FLOOR', options: { color: NAVY, fontSize: 24, fontFace: 'Arial' } },
      { text: ' PLAN', options: { color: ac, fontSize: 24, bold: true, fontFace: 'Arial' } },
    ], { x: 0.5, y: 0.5, w: 7.5, h: 0.5 });
    s4.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.05, w: 7.5, h: 0.02, fill: { color: ac } });
    const fpB64 = await fetchImageAsBase64(props.floorPlanImageUrl);
    if (fpB64) {
      s4.addImage({ data: fpB64, x: 0.75, y: 1.5, w: 7, h: 8, sizing: { type: 'contain', w: 7, h: 8 } });
    }
    s4.addText('Not to scale. Not exactly as shown.', {
      x: 0.5, y: 9.8, w: 7.5, h: 0.3,
      color: GRAY, fontSize: 8, italic: true, fontFace: 'Arial', align: 'center',
    });
  }

  // ── Slide 5: Location ──
  if (props.latitude && props.longitude && props.driveTimes.length > 0) {
    const s5 = pptx.addSlide();
    // Navy right panel
    s5.addShape(pptx.ShapeType.rect, { x: 5.3, y: 0, w: 3.2, h: 11, fill: { color: NAVY } });
    // Map placeholder left
    s5.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 5.3, h: 11, fill: { color: 'E5E5E5' } });
    s5.addText('Map — see PDF for full map', {
      x: 0.5, y: 5, w: 4.3, h: 0.5,
      color: GRAY, fontSize: 12, fontFace: 'Arial', align: 'center',
    });

    // Address pill
    s5.addShape(pptx.ShapeType.rect, { x: 0.3, y: 9.8, w: 3, h: 0.4, fill: { color: NAVY }, rectRadius: 0.2 });
    s5.addText(props.address, {
      x: 0.3, y: 9.8, w: 3, h: 0.4,
      color: WHITE, fontSize: 8, fontFace: 'Arial', align: 'center',
    });

    // LOCATION label
    s5.addText('LOCATION', {
      x: 5.6, y: 0.5, w: 2.5, h: 0.3,
      color: WHITE, fontSize: 9, fontFace: 'Arial',
    });

    // Drive times
    const dtSpacing = Math.min(1.5, 8 / Math.max(props.driveTimes.length, 1));
    props.driveTimes.forEach((dt, i) => {
      const y = 1.5 + i * dtSpacing;
      s5.addText(dt.minutes, {
        x: 5.6, y, w: 1.2, h: 0.6,
        color: WHITE, fontSize: 36, bold: true, fontFace: 'Arial',
      });
      s5.addText('MINS', {
        x: 6.8, y: y + 0.25, w: 1, h: 0.3,
        color: ac, fontSize: 10, bold: true, fontFace: 'Arial',
      });
      s5.addText(`TO ${dt.label.toUpperCase()}`, {
        x: 5.6, y: y + 0.6, w: 2.5, h: 0.25,
        color: WHITE, fontSize: 8, fontFace: 'Arial',
      });
      s5.addShape(pptx.ShapeType.rect, { x: 5.6, y: y + 0.9, w: 2.3, h: 0.01, fill: { color: ac } });
    });
  }

  // ── Slide 6: Contact ──
  const s6 = pptx.addSlide();
  s6.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 8.5, h: 11, fill: { color: NAVY } });

  s6.addText([
    { text: 'CONTACT', options: { color: WHITE, fontSize: 28, fontFace: 'Arial' } },
    { text: ' INFORMATION', options: { color: ac, fontSize: 28, bold: true, fontFace: 'Arial' } },
  ], { x: 0.5, y: 0.5, w: 7.5, h: 0.6 });
  s6.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.15, w: 7.5, h: 0.02, fill: { color: ac } });

  const cols = props.brokers.length > 3 ? 3 : 2;
  const colW = 7 / cols;
  props.brokers.forEach((b, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.5 + col * colW;
    const y = 1.8 + row * 2;

    s6.addText(b.name, {
      x, y, w: colW - 0.3, h: 0.3,
      color: WHITE, fontSize: 12, bold: true, fontFace: 'Arial',
    });
    s6.addText(b.title, {
      x, y: y + 0.3, w: colW - 0.3, h: 0.2,
      color: ac, fontSize: 9, fontFace: 'Arial',
    });
    const lines: string[] = [];
    if (b.directPhone) lines.push(`D: ${b.directPhone}`);
    if (b.cellPhone) lines.push(`C: ${b.cellPhone}`);
    lines.push(b.email);
    s6.addText(lines.join('\n'), {
      x, y: y + 0.6, w: colW - 0.3, h: 0.6,
      color: 'AAC4E0', fontSize: 8, fontFace: 'Arial',
    });
  });

  // Company name
  s6.addText(props.companyName, {
    x: 0.5, y: 9.8, w: 3, h: 0.3,
    color: WHITE, fontSize: 10, bold: true, fontFace: 'Arial',
  });

  // Disclaimer
  const disclaimer = props.disclaimer || 'The information contained herein has been obtained from sources believed to be reliable. No warranty or representation is made as to its accuracy.';
  s6.addText(disclaimer, {
    x: 3.5, y: 9.6, w: 4.5, h: 0.8,
    color: 'AAC4E0', fontSize: 7, fontFace: 'Arial', align: 'right',
  });

  await pptx.writeFile({ fileName: 'brochure.pptx' });
}
