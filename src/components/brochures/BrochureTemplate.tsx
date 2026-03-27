import { useEffect, useState } from 'react';
import type { BrochureProps } from '@/lib/brochures/brochureTypes';
import { supabase } from '@/integrations/supabase/client';

const NAVY = '#0f2044';
const PAGE_W = 816;
const PAGE_H = 1056;

const DEFAULT_DISCLAIMER =
  'The information contained herein has been obtained from sources believed to be reliable. No warranty or representation is made as to its accuracy. All information is subject to change without notice.';

const pageStyle: React.CSSProperties = {
  width: PAGE_W,
  height: PAGE_H,
  overflow: 'hidden',
  position: 'relative',
  background: 'white',
  fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
  pageBreakAfter: 'always',
};

const typeBadge = (type: BrochureProps['type']) => {
  switch (type) {
    case 'sale': return 'FOR SALE';
    case 'lease': return 'FOR LEASE';
    case 'sale-lease': return 'FOR SALE / FOR LEASE';
  }
};

function CoverPage({ props }: { props: BrochureProps }) {
  const ac = props.accentColor;
  return (
    <div className="brochure-page" style={pageStyle}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '55%' }}>
        {props.primaryPhotoUrl ? (
          <img src={props.primaryPhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: NAVY }} />
        )}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(to top, rgba(15,32,68,0.85), transparent)' }} />
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '45%', background: NAVY }} />
      {props.logoUrl && (
        <img src={props.logoUrl} alt="" style={{ position: 'absolute', top: 32, right: 32, width: 140, opacity: 0.9, filter: 'brightness(10)' }} />
      )}
      {props.brokers.length > 0 && (
        <div style={{ position: 'absolute', top: 32, left: 32 }}>
          {props.brokers.map((b, i) => (
            <div key={i} style={{ color: 'white', fontSize: 11, lineHeight: '16px', opacity: 0.85 }}>{b.name}</div>
          ))}
        </div>
      )}
      <div style={{ position: 'absolute', top: '40%', left: 48, right: 48, zIndex: 2 }}>
        <div style={{ color: 'white', fontSize: 72, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-2px' }}>
          {props.buildingSF || props.address}
        </div>
        <div style={{ display: 'inline-block', background: ac, padding: '8px 20px', marginTop: 12 }}>
          <span style={{ color: 'white', fontSize: 18, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {typeBadge(props.type)}
          </span>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: '18%', left: 48, right: 48 }}>
        <div style={{ color: 'white', fontSize: 36, fontWeight: 700, lineHeight: 1.2 }}>{props.address}</div>
        <div style={{ color: ac, fontSize: 18, fontWeight: 600, marginTop: 8 }}>{props.city}, {props.province}</div>
        {props.headline && (
          <div style={{ color: 'white', fontSize: 14, fontStyle: 'italic', marginTop: 12, opacity: 0.85, maxWidth: 500 }}>{props.headline}</div>
        )}
      </div>
      <div style={{ position: 'absolute', bottom: 32, right: 32, color: 'white', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.7 }}>
        {props.companyName}
      </div>
    </div>
  );
}

function DetailsPage({ props }: { props: BrochureProps }) {
  const ac = props.accentColor;
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

  return (
    <div className="brochure-page" style={pageStyle}>
      <div style={{ padding: '48px 48px 0' }}>
        <div>
          <span style={{ color: NAVY, fontSize: 32, fontWeight: 300 }}>PROPERTY</span>
          <span style={{ color: ac, fontSize: 32, fontWeight: 800 }}> HIGHLIGHTS</span>
        </div>
        <div style={{ height: 2, background: ac, marginTop: 12, marginBottom: 32 }} />
        <div style={{ display: 'flex', gap: 32 }}>
          <div style={{ flex: '0 0 58%' }}>
            {validSpecs.map(([label, value], i) => (
              <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid #E5E5E5' }}>
                <div style={{ color: ac, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
                <div style={{ color: NAVY, fontSize: 13, fontWeight: 500 }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            {props.highlights.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ color: ac, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>HIGHLIGHTS</div>
                {props.highlights.map((h, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 6, height: 6, background: ac, borderRadius: 1, marginTop: 5, flexShrink: 0 }} />
                    <span style={{ color: NAVY, fontSize: 12, lineHeight: '18px' }}>{h}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ background: NAVY, padding: 24, borderRadius: 4 }}>
              {(props.type === 'sale' || props.type === 'sale-lease') && props.askingPrice && (
                <div style={{ marginBottom: props.type === 'sale-lease' ? 16 : 0 }}>
                  <div style={{ color: ac, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>ASKING PRICE</div>
                  <div style={{ color: 'white', fontSize: 24, fontWeight: 700 }}>{props.askingPrice}</div>
                </div>
              )}
              {props.type === 'sale-lease' && props.askingPrice && props.leaseRate && (
                <div style={{ height: 1, background: ac, margin: '12px 0', opacity: 0.5 }} />
              )}
              {(props.type === 'lease' || props.type === 'sale-lease') && props.leaseRate && (
                <div>
                  <div style={{ color: ac, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>LEASE RATE</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ color: 'white', fontSize: 24, fontWeight: 700 }}>{props.leaseRate}</span>
                    {props.leaseType && <span style={{ color: ac, fontSize: 12 }}>{props.leaseType}</span>}
                  </div>
                  {props.operatingCosts && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ color: ac, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>OPERATING COSTS</div>
                      <div style={{ color: 'white', fontSize: 16, fontWeight: 600 }}>{props.operatingCosts}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhotosPage({ props }: { props: BrochureProps }) {
  const ac = props.accentColor;
  const hasSecondary = !!props.secondaryPhotoUrl;
  const hasAerial = !!props.aerialPhotoUrl;

  return (
    <div className="brochure-page" style={pageStyle}>
      <div style={{ padding: '32px 48px' }}>
        <div style={{ color: ac, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
          INTERIOR & EXTERIOR PHOTOS
        </div>
        <div style={{ height: 2, background: ac, marginBottom: 24 }} />
        {props.primaryPhotoUrl && (
          <img src={props.primaryPhotoUrl} alt="" style={{ width: '100%', height: 360, objectFit: 'cover', borderRadius: 4 }} />
        )}
        {(hasSecondary || hasAerial) && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {hasSecondary && hasAerial ? (
              <>
                <img src={props.secondaryPhotoUrl} alt="" style={{ width: '50%', height: 240, objectFit: 'cover', borderRadius: 4 }} />
                <img src={props.aerialPhotoUrl} alt="" style={{ width: '50%', height: 240, objectFit: 'cover', borderRadius: 4 }} />
              </>
            ) : (
              <img src={props.secondaryPhotoUrl || props.aerialPhotoUrl} alt="" style={{ width: '100%', height: 240, objectFit: 'cover', borderRadius: 4 }} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FloorPlanPage({ props }: { props: BrochureProps }) {
  const ac = props.accentColor;
  if (!props.floorPlanImageUrl) return null;

  return (
    <div className="brochure-page" style={pageStyle}>
      <div style={{ padding: 48, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div>
          <span style={{ color: NAVY, fontSize: 32, fontWeight: 300 }}>FLOOR</span>
          <span style={{ color: ac, fontSize: 32, fontWeight: 800 }}> PLAN</span>
        </div>
        <div style={{ height: 2, background: ac, marginTop: 12, marginBottom: 24 }} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={props.floorPlanImageUrl} alt="Floor plan" style={{ maxWidth: '100%', maxHeight: PAGE_H - 200, objectFit: 'contain' }} />
        </div>
        <div style={{ color: '#999', fontSize: 10, fontStyle: 'italic', textAlign: 'center', marginTop: 12 }}>
          Not to scale. Not exactly as shown.
        </div>
      </div>
    </div>
  );
}

function LocationPage({ props }: { props: BrochureProps }) {
  const ac = props.accentColor;
  const [mapUrl, setMapUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!props.latitude || !props.longitude) return;
    let cancelled = false;

    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) return;

        const acHex = props.accentColor.replace('#', '');
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proxy-static-map?lat=${props.latitude}&lng=${props.longitude}&zoom=13&size=900x500&scale=2&maptype=roadmap&accentColor=${acHex}`;

        const resp = await fetch(url, {
          headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        if (!resp.ok) return;
        const blob = await resp.blob();
        if (!cancelled) setMapUrl(URL.createObjectURL(blob));
      } catch {
        // silent
      }
    })();

    return () => { cancelled = true; };
  }, [props.latitude, props.longitude, props.accentColor]);

  if (!props.latitude || !props.longitude || props.driveTimes.length === 0) return null;

  return (
    <div className="brochure-page" style={pageStyle}>
      <div style={{ display: 'flex', height: '100%' }}>
        <div style={{ width: '62%', position: 'relative', background: '#f0f0f0' }}>
          {mapUrl ? (
            <img src={mapUrl} alt="Map" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#e5e5e5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 14 }}>
              Loading map...
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 24, left: 24, background: NAVY, borderRadius: 16, padding: '8px 12px' }}>
            <span style={{ color: 'white', fontSize: 10 }}>{props.address}</span>
          </div>
        </div>
        <div style={{ width: '38%', background: NAVY, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 32 }}>
          <div style={{ color: 'white', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            LOCATION
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', marginTop: 24 }}>
            {props.driveTimes.map((dt, i) => (
              <div key={i} style={{ borderBottom: `1px solid ${ac}`, paddingBottom: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ color: 'white', fontSize: 48, fontWeight: 800, lineHeight: 1 }}>{dt.minutes}</span>
                  <span style={{ color: ac, fontSize: 14, fontWeight: 700 }}>MINS</span>
                </div>
                <div style={{ color: 'white', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>
                  TO {dt.label.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactPage({ props }: { props: BrochureProps }) {
  const ac = props.accentColor;
  const bgPhoto = props.aerialPhotoUrl || props.primaryPhotoUrl;
  const disclaimer = props.disclaimer || DEFAULT_DISCLAIMER;
  const cols = props.brokers.length > 3 ? 3 : 2;

  return (
    <div className="brochure-page" style={pageStyle}>
      {bgPhoto && (
        <img src={bgPhoto} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 32, 68, 0.65)' }} />
      <div style={{ position: 'relative', zIndex: 1, padding: 48, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div>
          <span style={{ color: 'white', fontSize: 36, fontWeight: 300 }}>CONTACT</span>
          <span style={{ color: ac, fontSize: 36, fontWeight: 800 }}> INFORMATION</span>
        </div>
        <div style={{ height: 2, background: ac, marginTop: 12, marginBottom: 40 }} />
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 24, flex: 1 }}>
          {props.brokers.map((b, i) => (
            <div key={i}>
              <div style={{ color: 'white', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{b.name}</div>
              <div style={{ color: ac, fontSize: 11, marginBottom: 12 }}>{b.title}</div>
              {b.directPhone && (
                <div style={{ color: 'white', fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: '#999', marginRight: 4 }}>D:</span>{b.directPhone}
                </div>
              )}
              {b.cellPhone && (
                <div style={{ color: 'white', fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: '#999', marginRight: 4 }}>C:</span>{b.cellPhone}
                </div>
              )}
              <div style={{ color: 'white', fontSize: 11 }}>{b.email}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 32 }}>
          {props.logoUrl ? (
            <img src={props.logoUrl} alt="" style={{ width: 120, opacity: 0.9, filter: 'brightness(10)' }} />
          ) : (
            <div style={{ color: 'white', fontSize: 14, fontWeight: 700 }}>{props.companyName}</div>
          )}
          <div style={{ color: 'white', fontSize: 8, opacity: 0.7, maxWidth: 400, textAlign: 'right', lineHeight: '12px' }}>
            {disclaimer}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BrochureTemplate(props: BrochureProps) {
  return (
    <div id="brochure-preview">
      <CoverPage props={props} />
      <DetailsPage props={props} />
      <PhotosPage props={props} />
      <FloorPlanPage props={props} />
      <LocationPage props={props} />
      <ContactPage props={props} />
    </div>
  );
}
