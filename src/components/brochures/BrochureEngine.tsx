/**
 * BrochureEngine.tsx
 *
 * Template dispatcher: given a BrochureData object, returns the correct
 * react-pdf Document component.
 *
 * To add a new template:
 *  1. Add the key to BrochureTemplateKey in brochureTypes.ts
 *  2. Create a template component in templates/<YourTemplate>/index.tsx
 *  3. Add a case here
 */
import type { BrochureData } from '@/lib/brochures/brochureTypes';
import { IndustrialStandardBrochure } from './templates/IndustrialStandard';

interface BrochureEngineProps {
  data: BrochureData;
}

/**
 * Returns the react-pdf <Document> for the given BrochureData.
 * Use inside `pdf(<BrochureEngine data={data} />).toBlob()` to generate a PDF.
 */
export function BrochureEngine({ data }: BrochureEngineProps) {
  switch (data.templateKey) {
    case 'industrial-standard':
    // future variants fall through to the standard template until they are built
    case 'industrial-lease':
    case 'industrial-sale':
    case 'industrial-both':
    default:
      return <IndustrialStandardBrochure data={data} />;
  }
}
