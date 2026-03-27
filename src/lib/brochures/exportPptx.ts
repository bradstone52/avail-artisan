import PptxGenJS from 'pptxgenjs';
import type { BrochureProps } from '@/components/brochures/BrochureTemplate';

const NAVY = '0f2044';
const WHITE = 'FFFFFF';
const GRAY = '666666';

const typeBadgeLabel = (type: BrochureProps['type']) => {
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
  pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5
  // Use custom size 10x7.5
  pptx.defineLayout({ name: 'BROCHURE', width: 10, height: 7.5 });
  pptx.layout = 'BROCHURE';

  const slide = pptx.addSlide();

  // ── Header bar ──
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 10, h: 0.8,
    fill: { color: NAVY },
  });
  slide.addText(props.address, {
    x: 0.5, y: 0.1, w: 6, h: 0.35,
    color: WHITE, fontSize: 18, bold: true, fontFace: 'Arial',
  });
  slide.addText(`${props.city}, ${props.province}`, {
    x: 0.5, y: 0.45, w: 6, h: 0.25,
    color: 'AAC4E0', fontSize: 10, fontFace: 'Arial',
  });
  slide.addText(typeBadgeLabel(props.type), {
    x: 7, y: 0.2, w: 2.7, h: 0.4,
    color: WHITE, fontSize: 9, bold: true, fontFace: 'Arial',
    align: 'right',
  });

  // ── Primary photo ──
  let photoY = 0.8;
  if (props.primaryPhotoUrl) {
    const b64 = await fetchImageAsBase64(props.primaryPhotoUrl);
    if (b64) {
      slide.addImage({ data: b64, x: 0.5, y: photoY, w: 9, h: 2.5, rounding: true });
      photoY += 2.6;
    }
  }

  // ── Headline ──
  slide.addText(props.headline, {
    x: 0.5, y: photoY, w: 9, h: 0.5,
    color: '1a1a1a', fontSize: 16, bold: true, fontFace: 'Arial',
  });

  const bodyY = photoY + 0.6;

  // ── Left column: Specs ──
  const specs: [string, string | undefined][] = [
    ['Building Size', props.buildingSF],
    ['Land', props.landAcres],
    ['Clear Height', props.clearHeight],
    ['Dock Doors', props.dockDoors],
    ['Grade Doors', props.gradeDoors],
    ['Power', props.power],
    ['Zoning', props.zoning],
    ['Occupancy', props.occupancy],
  ];
  const validSpecs = specs.filter(([, v]) => !!v);

  slide.addText('PROPERTY SPECIFICATIONS', {
    x: 0.5, y: bodyY, w: 4, h: 0.3,
    color: GRAY, fontSize: 8, bold: true, fontFace: 'Arial',
  });

  validSpecs.forEach(([label, value], i) => {
    const rowY = bodyY + 0.35 + i * 0.25;
    slide.addText(label, {
      x: 0.5, y: rowY, w: 2, h: 0.22,
      color: GRAY, fontSize: 9, fontFace: 'Arial',
    });
    slide.addText(value!, {
      x: 2.5, y: rowY, w: 2, h: 0.22,
      color: '1a1a1a', fontSize: 9, bold: true, fontFace: 'Arial',
    });
  });

  // ── Right column: Highlights + Pricing ──
  slide.addText('HIGHLIGHTS', {
    x: 5.5, y: bodyY, w: 4, h: 0.3,
    color: GRAY, fontSize: 8, bold: true, fontFace: 'Arial',
  });

  props.highlights.forEach((h, i) => {
    const rowY = bodyY + 0.35 + i * 0.28;
    slide.addText(`•  ${h}`, {
      x: 5.5, y: rowY, w: 4, h: 0.25,
      color: '333333', fontSize: 9, fontFace: 'Arial',
    });
  });

  const pricingY = bodyY + 0.35 + Math.max(props.highlights.length, 1) * 0.28 + 0.2;

  if ((props.type === 'sale' || props.type === 'sale-lease') && props.askingPrice) {
    slide.addText('Asking Price', {
      x: 5.5, y: pricingY, w: 4, h: 0.2,
      color: GRAY, fontSize: 8, fontFace: 'Arial',
    });
    slide.addText(props.askingPrice, {
      x: 5.5, y: pricingY + 0.2, w: 4, h: 0.3,
      color: '1a1a1a', fontSize: 16, bold: true, fontFace: 'Arial',
    });
  }

  if ((props.type === 'lease' || props.type === 'sale-lease') && props.leaseRate) {
    const leaseY = props.type === 'sale-lease' ? pricingY + 0.55 : pricingY;
    slide.addText('Lease Rate', {
      x: 5.5, y: leaseY, w: 4, h: 0.2,
      color: GRAY, fontSize: 8, fontFace: 'Arial',
    });
    slide.addText(`${props.leaseRate}${props.leaseType ? ` ${props.leaseType}` : ''}`, {
      x: 5.5, y: leaseY + 0.2, w: 4, h: 0.3,
      color: '1a1a1a', fontSize: 16, bold: true, fontFace: 'Arial',
    });
  }

  // ── Footer bar ──
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 6.7, w: 10, h: 0.8,
    fill: { color: NAVY },
  });
  slide.addText('ClearView', {
    x: 0.5, y: 6.85, w: 2, h: 0.3,
    color: WHITE, fontSize: 11, bold: true, fontFace: 'Arial',
  });
  if (props.companyName) {
    slide.addText(props.companyName, {
      x: 2.5, y: 6.85, w: 2, h: 0.3,
      color: 'AAC4E0', fontSize: 9, fontFace: 'Arial',
    });
  }

  // Agent 1
  const agent1Text = `${props.brokerName}  |  ${props.brokerTitle}\n${props.brokerPhone}  ·  ${props.brokerEmail}`;
  const hasAgent2 = !!props.broker2Name;

  if (hasAgent2) {
    slide.addText(agent1Text, {
      x: 4.5, y: 6.8, w: 2.5, h: 0.5,
      color: 'AAC4E0', fontSize: 8, fontFace: 'Arial', align: 'right',
    });
    const agent2Text = `${props.broker2Name}  |  ${props.broker2Title || ''}\n${[props.broker2Phone, props.broker2Email].filter(Boolean).join('  ·  ')}`;
    slide.addText(agent2Text, {
      x: 7.2, y: 6.8, w: 2.5, h: 0.5,
      color: 'AAC4E0', fontSize: 8, fontFace: 'Arial', align: 'right',
    });
  } else {
    slide.addText(agent1Text, {
      x: 5.5, y: 6.8, w: 4, h: 0.5,
      color: 'AAC4E0', fontSize: 9, fontFace: 'Arial', align: 'right',
    });
  }

  await pptx.writeFile({ fileName: 'brochure.pptx' });
}
