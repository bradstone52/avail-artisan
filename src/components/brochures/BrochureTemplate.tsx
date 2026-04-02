import { useEffect, useState } from 'react';
import type { BrochureProps } from '@/lib/brochures/brochureTypes';
import { supabase } from '@/integrations/supabase/client';

const NAVY = '#0f2044';
const PAGE_W = 816;
const PAGE_H = 1056;
const MARGIN = 48;

function ensureVisibleAccent(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.18 ? '#4A7FA5' : hex;
}

const DEFAULT_DISCLAIMER =
  'The information contained herein has been obtained from sources believed to be reliable. No warranty or representation is made as to its accuracy. All information is subject to change without notice.';
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

/* ─── Reusable PageHeader ─── */
function PageHeader({ address, type, accentColor }: { address: string; type: string; accentColor: string }) {
  return (
    <div style={{ height: 48, width: '100%', background: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px', boxSizing: 'border-box', flexShrink: 0 }}>
      <span style={{ color: 'white', fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', opacity: 0.95 }}>{address}</span>
      <span style={{ color: 'white', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{typeBadge(type as BrochureProps['type'])}</span>
    </div>
  );
}

/* ─── Reusable PageFooter ─── */
function PageFooter({ companyName, pageLabel, accentColor }: { companyName: string; pageLabel: string; accentColor: string }) {
  return (
    <div style={{ height: 36, width: '100%', background: '#F2F2F0', borderTop: `2px solid ${accentColor}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px', boxSizing: 'border-box', flexShrink: 0 }}>
      <span style={{ color: '#999', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.10em' }}>{companyName}</span>
      <span style={{ color: '#999', fontSize: 8 }}>{pageLabel}</span>
    </div>
  );
}

/* ─── PAGE 1 — Cover ─── */
function CoverPage({ props, ac }: { props: BrochureProps; ac: string }) {
  return (
    <div className="brochure-page" style={pageStyle}>
      {/* Full-bleed photo */}
      {props.primaryPhotoUrl ? (
        <img src={props.primaryPhotoUrl} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: NAVY }} />
      )}
      {/* Top vignette */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 38%)' }} />
      {/* Bottom gradient */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to top, rgba(15,32,68,0.97) 0%, rgba(15,32,68,0.72) 48%, transparent 100%)' }} />

      {/* Top strip */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px', zIndex: 2 }}>
        <div>
          {props.brokers.map((b, i) => (
            <div key={i} style={{ color: 'white', fontSize: 10, fontWeight: 500, lineHeight: '18px', opacity: 0.85 }}>{b.name}</div>
          ))}
        </div>
        {props.logoUrl && (
          <img src={props.logoUrl} alt="" style={{ maxHeight: 38, maxWidth: 120, filter: 'brightness(0) invert(1)' }} />
        )}
      </div>

      {/* Main content */}
      <div style={{ position: 'absolute', bottom: 72, left: 48, right: 48, zIndex: 2 }}>
        <div style={{ color: 'white', fontSize: 76, fontWeight: 900, lineHeight: 1, letterSpacing: '-3px', textShadow: '0 2px 16px rgba(0,0,0,0.5)' }}>
          {props.buildingSF || props.address}
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', marginTop: 16, background: ac, padding: '10px 24px' }}>
          <div style={{ width: 3, alignSelf: 'stretch', background: 'white', opacity: 0.35, marginRight: 14, flexShrink: 0 }} />
          <span style={{ color: 'white', fontSize: 15, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            {typeBadge(props.type)}
          </span>
        </div>
        <div style={{ color: 'white', fontSize: 38, fontWeight: 700, lineHeight: 1.15, marginTop: 28, textShadow: '0 1px 10px rgba(0,0,0,0.45)' }}>{props.address}</div>
        <div style={{ color: 'white', fontSize: 16, fontWeight: 400, opacity: 0.78, marginTop: 8, letterSpacing: '0.04em' }}>{props.city}, {props.province}</div>
        {props.headline && (
          <div style={{ color: 'white', fontSize: 13, fontStyle: 'italic', opacity: 0.70, marginTop: 16, maxWidth: 480, lineHeight: 1.65 }}>{props.headline}</div>
        )}
      </div>

      {/* Bottom footer strip */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 56, background: 'rgba(15,32,68,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 48px', zIndex: 2 }}>
        <span style={{ color: 'white', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', opacity: 0.60 }}>{props.companyName}</span>
      </div>
    </div>
  );
}

/* ─── PAGE 2 — Property Details ─── */
function DetailsPage({ props, ac }: { props: BrochureProps; ac: string }) {
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
  const hasHighlights = props.highlights.length > 0 && props.highlights.some(h => h.trim() !== '');
  const hasPricing = !!(props.askingPrice || props.leaseRate);

  return (
    <div className="brochure-page" style={{ ...pageStyle, display: 'flex', flexDirection: 'column' }}>
      <PageHeader address={props.address} type={props.type} accentColor={ac} />
      <div style={{ flex: 1, padding: '24px 48px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: NAVY, fontSize: 28, fontWeight: 300 }}>PROPERTY</span>
          <span style={{ color: ac, fontSize: 28, fontWeight: 800 }}> HIGHLIGHTS</span>
        </div>
        <div style={{ height: 2, background: ac, marginTop: 10, marginBottom: 20 }} />
        <div style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0 }}>
          {/* Left column */}
          <div style={{ flex: '0 0 56%', display: 'flex', flexDirection: 'column' }}>
            {validSpecs.map(([label, value], i) => (
              <div key={i} style={{ padding: '11px 0 11px 12px', borderBottom: '1px solid #EBEBEB', borderLeft: `3px solid ${ac}` }}>
                <div style={{ color: ac, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 3 }}>{label}</div>
                <div style={{ color: NAVY, fontSize: 13, fontWeight: 600 }}>{value}</div>
              </div>
            ))}
            <div style={{ flex: 1 }} />
            <div style={{ marginTop: 'auto', background: '#F0EEE9', padding: '16px 14px', borderLeft: `3px solid ${ac}` }}>
              <span style={{ color: ac, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{typeBadge(props.type)}</span>
            </div>
          </div>
          {/* Right column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Highlights */}
            <div>
              <div style={{ color: ac, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 12 }}>HIGHLIGHTS</div>
              {hasHighlights ? (
                props.highlights.filter(h => h.trim() !== '').map((h, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 5, height: 5, background: ac, borderRadius: 1, marginTop: 6, flexShrink: 0 }} />
                    <span style={{ color: NAVY, fontSize: 11, lineHeight: 1.65 }}>{h}</span>
                  </div>
                ))
              ) : (
                [0, 1, 2].map(i => (
                  <div key={i} style={{ height: 28, borderRadius: 3, border: '1px dashed #DDDBD7', display: 'flex', alignItems: 'center', padding: '0 10px', marginBottom: i < 2 ? 6 : 0 }}>
                    <span style={{ color: '#BFBDB9', fontSize: 9, fontStyle: 'italic' }}>Add a highlight in the editor</span>
                  </div>
                ))
              )}
            </div>
            {/* Pricing block */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div style={{ marginTop: 'auto' }}>
                <div style={{ background: NAVY, borderRadius: 6, padding: 20, borderTop: `3px solid ${ac}` }}>
                  {hasPricing ? (
                    <>
                      {(props.type === 'sale' || props.type === 'sale-lease') && props.askingPrice && (
                        <div>
                          <div style={{ color: 'white', fontSize: 8, textTransform: 'uppercase', opacity: 0.60, marginBottom: 6 }}>ASKING PRICE</div>
                          <div style={{ color: 'white', fontSize: 28, fontWeight: 800 }}>{props.askingPrice}</div>
                        </div>
                      )}
                      {props.type === 'sale-lease' && props.askingPrice && props.leaseRate && (
                        <div style={{ height: 1, background: 'white', opacity: 0.18, margin: '14px 0' }} />
                      )}
                      {(props.type === 'lease' || props.type === 'sale-lease') && props.leaseRate && (
                        <div>
                          <div style={{ color: 'white', fontSize: 8, textTransform: 'uppercase', opacity: 0.60, marginBottom: 6 }}>LEASE RATE</div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                            <span style={{ color: 'white', fontSize: 28, fontWeight: 800 }}>{props.leaseRate}</span>
                            {props.leaseType && <span style={{ color: 'white', fontSize: 11, opacity: 0.55 }}>{props.leaseType}</span>}
                          </div>
                          {props.operatingCosts && (
                            <div style={{ marginTop: 10 }}>
                              <div style={{ color: 'white', fontSize: 8, textTransform: 'uppercase', opacity: 0.60 }}>OPERATING COSTS</div>
                              <div style={{ color: 'white', fontSize: 16, fontWeight: 600, marginTop: 4 }}>{props.operatingCosts}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ color: 'white', fontSize: 13, opacity: 0.50, fontStyle: 'italic' }}>Pricing available upon request</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <PageFooter companyName={props.companyName} pageLabel="Property Details" accentColor={ac} />
    </div>
  );
}

/* ─── PAGE 3 — Photos ─── */
function PhotosPage({ props, ac }: { props: BrochureProps; ac: string }) {
  const hasSecondary = !!props.secondaryPhotoUrl;
  const hasAerial = !!props.aerialPhotoUrl;
  const photoCount = (props.primaryPhotoUrl ? 1 : 0) + (hasSecondary ? 1 : 0) + (hasAerial ? 1 : 0);

  return (
    <div className="brochure-page" style={{ ...pageStyle, display: 'flex', flexDirection: 'column' }}>
      <PageHeader address={props.address} type={props.type} accentColor={ac} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 48px 0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexShrink: 0 }}>
          <span style={{ color: ac, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>INTERIOR & EXTERIOR PHOTOS</span>
          <div style={{ flex: 1, height: 1, background: ac, opacity: 0.35 }} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
          {photoCount >= 3 ? (
            <>
              <div style={{ flex: '0 0 56%', overflow: 'hidden', border: '1px solid #E4E2DE' }}>
                <img src={props.primaryPhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
              <div style={{ flex: 1, display: 'flex', gap: 6, overflow: 'hidden' }}>
                <div style={{ flex: 1, overflow: 'hidden', border: '1px solid #E4E2DE' }}>
                  <img src={props.secondaryPhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
                <div style={{ flex: 1, overflow: 'hidden', border: '1px solid #E4E2DE' }}>
                  <img src={props.aerialPhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              </div>
            </>
          ) : photoCount === 2 ? (
            <>
              <div style={{ flex: '0 0 55%', overflow: 'hidden', border: '1px solid #E4E2DE' }}>
                <img src={props.primaryPhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
              <div style={{ flex: 1, overflow: 'hidden', border: '1px solid #E4E2DE' }}>
                <img src={props.secondaryPhotoUrl || props.aerialPhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            </>
          ) : props.primaryPhotoUrl ? (
            <div style={{ flex: 1, overflow: 'hidden', border: '1px solid #E4E2DE' }}>
              <img src={props.primaryPhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          ) : null}
        </div>
      </div>
      <PageFooter companyName={props.companyName} pageLabel="Property Photos" accentColor={ac} />
    </div>
  );
}

/* ─── PAGE 4 — Floor Plan ─── */
function FloorPlanPage({ props, ac }: { props: BrochureProps; ac: string }) {
  if (!props.floorPlanImageUrl) return null;

  return (
    <div className="brochure-page" style={{ ...pageStyle, display: 'flex', flexDirection: 'column' }}>
      <PageHeader address={props.address} type={props.type} accentColor={ac} />
      <div style={{ flex: 1, padding: '24px 48px 0', display: 'flex', flexDirection: 'column' }}>
        <div>
          <span style={{ color: NAVY, fontSize: 28, fontWeight: 300 }}>FLOOR</span>
          <span style={{ color: ac, fontSize: 28, fontWeight: 800 }}> PLAN</span>
        </div>
        <div style={{ height: 2, background: ac, marginTop: 10, marginBottom: 16 }} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAF8', borderRadius: 4, padding: 16, overflow: 'hidden' }}>
          <img src={props.floorPlanImageUrl} alt="Floor plan" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </div>
        <div style={{ color: '#AAAAAA', fontSize: 9, fontStyle: 'italic', textAlign: 'right', marginTop: 8, flexShrink: 0 }}>
          * Not to scale. Not exactly as shown.
        </div>
      </div>
      <PageFooter companyName={props.companyName} pageLabel="Floor Plan" accentColor={ac} />
    </div>
  );
}

/* ─── PAGE 5 — Location ─── */
function LocationPage({ props, ac }: { props: BrochureProps; ac: string }) {
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
        {/* Left — Map */}
        <div style={{ width: '62%', position: 'relative', height: '100%', overflow: 'hidden' }}>
          {mapUrl ? (
            <img src={mapUrl} alt="Map" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#E8E4DC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#AAA', fontSize: 13 }}>
              Generating map…
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 44, background: 'rgba(15,32,68,0.88)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" /></svg>
            <span style={{ color: 'white', fontSize: 10, fontWeight: 500 }}>{props.address}</span>
            <span style={{ color: 'white', opacity: 0.35 }}>|</span>
            <span style={{ color: 'white', fontSize: 10, opacity: 0.60 }}>{props.city}, {props.province}</span>
          </div>
        </div>
        {/* Right — Drive times */}
        <div style={{ width: '38%', background: NAVY, display: 'flex', flexDirection: 'column', padding: 32, height: '100%', boxSizing: 'border-box' }}>
          <div style={{ color: 'white', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em' }}>LOCATION</div>
          <div style={{ width: 24, height: 2, background: ac, marginTop: 8, marginBottom: 32 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            {props.driveTimes.map((dt, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ color: 'white', fontSize: 52, fontWeight: 900, lineHeight: 1 }}>{dt.minutes}</span>
                  <span style={{ color: 'white', fontSize: 11, fontWeight: 700, opacity: 0.55, marginLeft: 8, marginBottom: 6 }}>MINS</span>
                </div>
                <div style={{ color: 'white', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 4 }}>
                  TO {dt.label.toUpperCase()}
                </div>
                {i < props.driveTimes.length - 1 && (
                  <div style={{ height: 1, background: 'white', opacity: 0.12, marginTop: 16 }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── PAGE 6 — Contact ─── */
function ContactPage({ props, ac }: { props: BrochureProps; ac: string }) {
  const bgPhoto = props.aerialPhotoUrl || props.primaryPhotoUrl;
  const disclaimer = props.disclaimer || DEFAULT_DISCLAIMER;
  const count = props.brokers.length;
  const cols = count >= 4 ? 3 : count >= 2 ? 2 : 1;

  return (
    <div className="brochure-page" style={pageStyle}>
      {bgPhoto ? (
        <img src={bgPhoto} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: NAVY }} />
      )}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15,32,68,0.74)' }} />
      <div style={{ position: 'relative', zIndex: 1, padding: 48, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
        <div>
          <div>
            <span style={{ color: 'white', fontSize: 36, fontWeight: 300 }}>CONTACT</span>
            <span style={{ color: 'white', fontSize: 36, fontWeight: 800 }}> INFORMATION</span>
          </div>
          <div style={{ width: 56, height: 3, background: ac, marginTop: 12, marginBottom: 36 }} />
        </div>
        <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 6, padding: 32, margin: '0 0 24px' }}>
          <div style={{ display: count === 1 ? 'flex' : 'grid', ...(count === 1 ? { gap: 32 } : { gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 24 }) }}>
            {props.brokers.map((b, i) => (
              <div key={i} style={count === 1 ? { display: 'flex', gap: 32 } : {}}>
                {count === 1 && b.photoUrl && (
                  <img src={b.photoUrl} alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                )}
                <div>
                  <div style={{ color: 'white', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{b.name}</div>
                  <div style={{ color: 'white', fontSize: 11, opacity: 0.62, marginBottom: 14 }}>{b.title}</div>
                  {b.directPhone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, flexShrink: 0 }}>D:</span>
                      <span style={{ color: 'white', fontSize: 11 }}>{b.directPhone}</span>
                    </div>
                  )}
                  {b.cellPhone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, flexShrink: 0 }}>C:</span>
                      <span style={{ color: 'white', fontSize: 11 }}>{b.cellPhone}</span>
                    </div>
                  )}
                  <div style={{ color: 'white', fontSize: 11 }}>{b.email}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexShrink: 0 }}>
          {props.logoUrl ? (
            <img src={props.logoUrl} alt="" style={{ width: 110, filter: 'brightness(0) invert(1)', opacity: 0.85 }} />
          ) : (
            <div style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>{props.companyName}</div>
          )}
          <div style={{ color: 'white', fontSize: 8, opacity: 0.55, maxWidth: 380, textAlign: 'right', lineHeight: '13px' }}>
            {disclaimer}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BrochureTemplate(props: BrochureProps) {
  const ac = ensureVisibleAccent(props.accentColor);
  return (
    <div id="brochure-preview">
      <CoverPage props={props} ac={ac} />
      <DetailsPage props={props} ac={ac} />
      <PhotosPage props={props} ac={ac} />
      <FloorPlanPage props={props} ac={ac} />
      <LocationPage props={props} ac={ac} />
      <ContactPage props={props} ac={ac} />
    </div>
  );
}
