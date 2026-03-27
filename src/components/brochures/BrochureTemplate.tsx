export interface BrochureProps {
  type: 'sale' | 'lease' | 'sale-lease';
  address: string;
  city: string;
  province: string;
  buildingSF?: string;
  landAcres?: string;
  clearHeight?: string;
  dockDoors?: string;
  gradeDoors?: string;
  power?: string;
  zoning?: string;
  occupancy?: string;
  askingPrice?: string;
  leaseRate?: string;
  leaseType?: string;
  headline: string;
  highlights: string[];
  primaryPhotoUrl?: string;
  secondaryPhotoUrl?: string;
  aerialPhotoUrl?: string;
  logoUrl?: string;
  brokerName: string;
  brokerTitle: string;
  brokerPhone: string;
  brokerEmail: string;
  brokerPhotoUrl?: string;
  broker2Name?: string;
  broker2Title?: string;
  broker2Phone?: string;
  broker2Email?: string;
  broker2PhotoUrl?: string;
  companyName: string;
}

const NAVY = '#0f2044';

const typeBadgeLabel = (type: BrochureProps['type']) => {
  switch (type) {
    case 'sale': return 'FOR SALE';
    case 'lease': return 'FOR LEASE';
    case 'sale-lease': return 'FOR SALE / FOR LEASE';
  }
};

interface SpecRowProps { label: string; value?: string }
function SpecRow({ label, value }: SpecRowProps) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2 border-b border-gray-200 last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="font-medium text-sm text-gray-900">{value}</span>
    </div>
  );
}

export function BrochureTemplate(props: BrochureProps) {
  const {
    type, address, city, province,
    buildingSF, landAcres, clearHeight, dockDoors, gradeDoors,
    power, zoning, occupancy,
    askingPrice, leaseRate, leaseType,
    headline, highlights,
    primaryPhotoUrl, secondaryPhotoUrl, aerialPhotoUrl,
    logoUrl, brokerName, brokerTitle, brokerPhone, brokerEmail,
    brokerPhotoUrl, companyName,
  } = props;

  const hasSecondary = !!secondaryPhotoUrl;
  const hasAerial = !!aerialPhotoUrl;
  const showTwoUp = hasSecondary && hasAerial;
  const showOneUp = (hasSecondary || hasAerial) && !showTwoUp;
  const singleExtraPhoto = secondaryPhotoUrl || aerialPhotoUrl;

  return (
    <div
      id="brochure-preview"
      className="bg-white text-gray-900 w-[816px] min-h-[1056px] flex flex-col"
      style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-8 py-4"
        style={{ backgroundColor: NAVY }}
      >
        <div>
          <h1 className="text-white text-xl font-bold tracking-tight">{address}</h1>
          <p className="text-blue-200 text-sm">{city}, {province}</p>
        </div>
        <span className="text-xs font-bold tracking-widest text-white bg-white/20 px-4 py-2 rounded">
          {typeBadgeLabel(type)}
        </span>
      </div>

      {/* Primary Photo */}
      {primaryPhotoUrl && (
        <div className="w-full aspect-video overflow-hidden bg-gray-100">
          <img
            src={primaryPhotoUrl}
            alt={address}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Headline */}
      <div className="px-8 pt-6 pb-2">
        <h2 className="text-2xl font-bold text-gray-900 leading-tight">{headline}</h2>
      </div>

      {/* Two-column body */}
      <div className="flex-1 px-8 py-4 grid grid-cols-2 gap-8">
        {/* Left: Spec grid */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
            Property Specifications
          </h3>
          <div>
            <SpecRow label="Building Size" value={buildingSF} />
            <SpecRow label="Land" value={landAcres} />
            <SpecRow label="Clear Height" value={clearHeight} />
            <SpecRow label="Dock Doors" value={dockDoors} />
            <SpecRow label="Grade Doors" value={gradeDoors} />
            <SpecRow label="Power" value={power} />
            <SpecRow label="Zoning" value={zoning} />
            <SpecRow label="Occupancy" value={occupancy} />
          </div>
        </div>

        {/* Right: Highlights + Pricing */}
        <div className="space-y-6">
          {highlights.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
                Highlights
              </h3>
              <ul className="space-y-2">
                {highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Pricing */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
              Pricing
            </h3>
            {(type === 'sale' || type === 'sale-lease') && askingPrice && (
              <div className="mb-2">
                <p className="text-xs text-gray-500">Asking Price</p>
                <p className="text-xl font-bold text-gray-900">{askingPrice}</p>
              </div>
            )}
            {(type === 'lease' || type === 'sale-lease') && leaseRate && (
              <div>
                <p className="text-xs text-gray-500">Lease Rate</p>
                <p className="text-xl font-bold text-gray-900">
                  {leaseRate}
                  {leaseType && <span className="text-sm font-normal text-gray-500 ml-1">{leaseType}</span>}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Optional secondary photos */}
      {showTwoUp && (
        <div className="px-8 pb-4 grid grid-cols-2 gap-4">
          <div className="aspect-video overflow-hidden rounded-lg bg-gray-100">
            <img src={secondaryPhotoUrl} alt="Secondary" className="w-full h-full object-cover" />
          </div>
          <div className="aspect-video overflow-hidden rounded-lg bg-gray-100">
            <img src={aerialPhotoUrl} alt="Aerial" className="w-full h-full object-cover" />
          </div>
        </div>
      )}
      {showOneUp && singleExtraPhoto && (
        <div className="px-8 pb-4">
          <div className="aspect-video overflow-hidden rounded-lg bg-gray-100">
            <img src={singleExtraPhoto} alt="Property" className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        className="flex items-center justify-between px-8 py-4 mt-auto"
        style={{ backgroundColor: NAVY }}
      >
        <div className="flex items-center gap-3">
          {logoUrl && (
            <img src={logoUrl} alt={companyName} className="h-10 object-contain" />
          )}
          <span className="text-white font-semibold text-sm">{companyName}</span>
        </div>
        <div className="flex items-center gap-4">
          {brokerPhotoUrl && (
            <img
              src={brokerPhotoUrl}
              alt={brokerName}
              className="w-10 h-10 rounded-full object-cover border-2 border-white/30"
            />
          )}
          <div className="text-right">
            <p className="text-white font-semibold text-sm">{brokerName}</p>
            <p className="text-blue-200 text-xs">{brokerTitle}</p>
            <p className="text-blue-200 text-xs">{brokerPhone} · {brokerEmail}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
