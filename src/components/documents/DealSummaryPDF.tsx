import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import clearviewLogo from '@/assets/clearview-logo.png';

export interface DealSummaryAgent {
  name: string;
  email?: string;
  phone?: string;
  brokerage?: string;
}

interface DealSummaryDeposit {
  amount: number;
  payable_to: string;
  due_date: string;
  due_time?: string;
}

interface DealSummaryCondition {
  description: string;
  due_date?: string | null;
  is_satisfied: boolean;
}

interface DealSummaryImportantDate {
  description: string;
  due_date?: string | null;
  is_completed: boolean;
}

export interface DealSummaryLawyer {
  name?: string | null;
  firm?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface DealSummaryPDFProps {
  vendor: string;
  purchaser: string;
  propertyAddress: string;
  propertyCity?: string;
  propertyDescription: string;
  effectiveDate?: string | null;
  deposits: DealSummaryDeposit[];
  purchasePrice: number;
  balanceOnClosing: number;
  closingDate?: string | null;
  conditions?: DealSummaryCondition[];
  importantDates?: DealSummaryImportantDate[];
  listingAgents?: DealSummaryAgent[];
  sellingAgents?: DealSummaryAgent[];
  usePurchaserVendor?: boolean;
  sellerLawyer?: DealSummaryLawyer;
  buyerLawyer?: DealSummaryLawyer;
  // Lease-specific fields
  dealType?: string;
  leaseRatePsf?: number | null;
  leaseRates?: Array<{ year: number; rate_psf: number; months: number }> | null;
  leaseTermMonths?: number | null;
  commencementDate?: string | null;
  expiryDate?: string | null;
  freeRentMonths?: Array<{ type: string; months: number; year: number }> | null;
  // Legacy — kept for backward compat but unused
  actions?: any[];
  contacts?: any[];
  logoBase64?: string;
}

// ── helpers ──────────────────────────────────────────────
const fmt = (v: number | null | undefined): string => {
  if (v == null) return '';
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
};

const fmtDate = (d: string | null | undefined): string => {
  if (!d) return '';
  try {
    return new Date(d + (d.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return ''; }
};

const fmtDateShort = (d: string | null | undefined): string => {
  if (!d) return '';
  try {
    return new Date(d + (d.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return ''; }
};

const depositLabel = (i: number, isLeaseType = false) => {
  if (isLeaseType) return ['Deposit', 'Second Deposit', 'Third Deposit'][i] || `Deposit ${i + 1}`;
  return ['First Deposit', 'Second Deposit', 'Third Deposit'][i] || `Deposit ${i + 1}`;
};

const ORANGE = '#e8792b';
const PEACH = '#fdf0e6';
const GRAY_BG = '#f7f7f7';
const BORDER = '#e0e0e0';
const DARK = '#1a1a1a';
const MUTED = '#666666';

// ── styles ───────────────────────────────────────────────
const s = StyleSheet.create({
  page: { padding: 30, paddingBottom: 40, fontSize: 8, fontFamily: 'Helvetica', color: DARK },
  pageNumber: { position: 'absolute', bottom: 15, right: 30, fontSize: 7, color: MUTED },
  
  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  logo: { width: 160, height: 40, objectFit: 'contain' },
  subtitle: { fontSize: 12, fontWeight: 'bold', color: DARK, textAlign: 'center', backgroundColor: GRAY_BG, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 3, marginBottom: 8 },
  contactRow: { flexDirection: 'row', gap: 20, marginBottom: 6, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: ORANGE },
  contactBlock: { flex: 1 },
  contactItem: { fontSize: 7, marginBottom: 1 },
  contactBold: { fontWeight: 'bold', fontSize: 7 },
  
  // Section title
  sectionTitle: { fontSize: 9, fontWeight: 'bold', marginTop: 10, marginBottom: 4 },
  
  // Two-column layout
  twoCol: { flexDirection: 'row', gap: 12 },
  colHalf: { width: '48%' },
  colLeft: { width: '42%' },
  colRight: { width: '56%' },
  
  // Cards
  card: { borderWidth: 1, borderColor: BORDER, borderRadius: 3, padding: 8, marginBottom: 4 },
  cardLabel: { fontSize: 8, fontWeight: 'bold', marginBottom: 2 },
  cardValue: { fontSize: 8, color: MUTED },
  
  // Financial summary cards
  finRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  finCard: { flex: 1, backgroundColor: PEACH, borderRadius: 3, padding: 8 },
  finLabel: { fontSize: 7.5, fontWeight: 'bold', marginBottom: 2 },
  finValue: { fontSize: 9, fontWeight: 'bold' },
  
  // Table
  table: { borderWidth: 1, borderColor: BORDER, borderRadius: 3, marginBottom: 4 },
  tableHeader: { flexDirection: 'row', backgroundColor: GRAY_BG, borderBottomWidth: 1, borderBottomColor: BORDER, padding: 5 },
  tableRow: { flexDirection: 'row', padding: 5, borderBottomWidth: 1, borderBottomColor: BORDER },
  tableRowLast: { flexDirection: 'row', padding: 5 },
  tableHeaderCell: { fontSize: 7.5, fontWeight: 'bold' },
  tableCell: { fontSize: 7.5 },
  
  // Property details table
  propRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER },
  propRowLast: { flexDirection: 'row' },
  propLabel: { width: '40%', padding: 5, fontWeight: 'bold', fontSize: 7.5, backgroundColor: GRAY_BG },
  propValue: { width: '60%', padding: 5, fontSize: 7.5 },
  
  // Timeline
  timelineContainer: { paddingLeft: 6, marginBottom: 4 },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 7 },
  timelineLine: { width: 14, paddingTop: 2 },
  timelineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ORANGE },
  timelineConnector: { width: 0, height: 0 },
  timelineContent: { flex: 1, paddingLeft: 4 },
  timelineDate: { fontSize: 8, fontWeight: 'bold', marginBottom: 1 },
  timelineDesc: { fontSize: 7, color: MUTED },
  
  // Conditions table columns
  condDesc: { width: '50%' },
  condDate: { width: '30%' },
  condStatus: { width: '20%' },
  
  // Contact footer
  contactFooter: { flexDirection: 'row', gap: 8, marginTop: 6 },
  contactCard: { flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 3, padding: 6 },
  contactCardName: { fontSize: 8, fontWeight: 'bold', marginBottom: 1 },
  contactCardDetail: { fontSize: 7, color: MUTED, marginBottom: 1 },
  
  // Agent section
  agentSection: { marginTop: 6 },
  agentRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  agentCard: { flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 3, padding: 6, backgroundColor: GRAY_BG },
  agentRole: { fontSize: 6.5, color: MUTED, marginBottom: 1, textTransform: 'uppercase' as any },
  agentName: { fontSize: 7.5, fontWeight: 'bold', marginBottom: 1 },
  agentDetail: { fontSize: 6.5, color: MUTED },
});

// ── Component ────────────────────────────────────────────
export function DealSummaryPDF({
  vendor, purchaser, propertyAddress, propertyCity, propertyDescription, effectiveDate,
  deposits, purchasePrice, balanceOnClosing, closingDate,
  conditions = [], importantDates = [],
  listingAgents = [], sellingAgents = [],
  usePurchaserVendor = false,
  sellerLawyer, buyerLawyer,
  dealType, leaseRatePsf, leaseRates, leaseTermMonths, commencementDate, expiryDate,
  freeRentMonths,
}: DealSummaryPDFProps) {
  const dealTypeLower = dealType?.toLowerCase() || '';
  const isSublease = dealTypeLower === 'sublease';
  const isLease = ['lease', 'sublease', 'renewal', 'lease renewal'].includes(dealTypeLower);
  const netLeaseLabel = isSublease ? 'Net Sublease Value' : 'Net Lease Value';
  const dealValueLabel = isLease ? netLeaseLabel : 'Purchase Price';
  const sellerLabel = isSublease ? 'Sublandlord' : isLease ? 'Landlord' : (usePurchaserVendor ? 'Vendor' : 'Seller');
  const buyerLabel = isSublease ? 'Subtenant' : isLease ? 'Tenant' : (usePurchaserVendor ? 'Purchaser' : 'Buyer');
  const agentLabel = isLease ? 'Leasing' : 'Selling';
  const validDeposits = deposits.filter(d => d.amount > 0);
  const totalDeposits = validDeposits.reduce((sum, d) => sum + d.amount, 0);
  const validConditions = conditions.filter(c => c.description);
  const validDates = importantDates.filter(d => d.description);

  // Build timeline events
  const timelineEvents: { date: string; label: string; detail: string }[] = [];
  const effectiveDateToUse = isLease ? commencementDate : effectiveDate;
  if (effectiveDateToUse) timelineEvents.push({ date: effectiveDateToUse, label: fmtDateShort(effectiveDateToUse), detail: isLease ? 'Commencement Date — Lease commences' : 'Effective Date — Agreement executed' });
  validDeposits.forEach((d, i) => {
    if (d.due_date) timelineEvents.push({ date: d.due_date, label: fmtDateShort(d.due_date), detail: `${depositLabel(i, isLease)} — ${fmt(d.amount)}` });
  });
  validConditions.forEach(c => {
    if (c.due_date) timelineEvents.push({ date: c.due_date, label: fmtDateShort(c.due_date), detail: `Condition — ${c.description}` });
  });
  if (closingDate) timelineEvents.push({ date: closingDate, label: fmtDateShort(closingDate), detail: isLease ? 'Occupancy Date' : `Closing — Balance of ${fmt(balanceOnClosing)}` });
  // Sort by date then group by date
  timelineEvents.sort((a, b) => a.date.localeCompare(b.date));
  const groupedTimeline: { date: string; label: string; details: string[] }[] = [];
  for (const evt of timelineEvents) {
    const last = groupedTimeline[groupedTimeline.length - 1];
    if (last && last.date === evt.date) {
      last.details.push(evt.detail);
    } else {
      groupedTimeline.push({ date: evt.date, label: evt.label, details: [evt.detail] });
    }
  }

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        <Text style={s.pageNumber} render={({ pageNumber, totalPages }) => totalPages > 1 ? `${pageNumber} of ${totalPages}` : ''} fixed />
        {/* ── HEADER ── */}
        <View style={s.headerRow}>
          <Image src={clearviewLogo} style={s.logo} />
        </View>
        <Text style={s.subtitle}>Deal Summary: {[propertyAddress, propertyCity].filter(Boolean).join(', ') || '« Address »'}</Text>
        <View style={s.contactRow}>
          <View style={s.contactBlock}>
            <Text style={s.contactItem}><Text style={s.contactBold}>Brad Stone</Text>, Partner &amp; Associate Broker</Text>
            <Text style={s.contactItem}>ClearView Commercial Realty Inc.</Text>
            <Text style={s.contactItem}>Phone: 403-613-2898</Text>
            <Text style={s.contactItem}>Email: brad@cvpartners.ca</Text>
          </View>
          <View style={s.contactBlock}>
            <Text style={s.contactItem}><Text style={s.contactBold}>Doug Johannson</Text>, Partner &amp; Senior Vice President</Text>
            <Text style={s.contactItem}>ClearView Commercial Realty Inc.</Text>
            <Text style={s.contactItem}>Phone: 403-470-8875</Text>
            <Text style={s.contactItem}>Email: doug@cvpartners.ca</Text>
          </View>
        </View>

        {/* ── TRANSACTION PARTIES + PROPERTY DETAILS ── */}
        <View style={s.twoCol}>
          <View style={{ width: '45%' }}>
            <Text style={s.sectionTitle}>Transaction Parties</Text>
            <View style={[s.card, { marginBottom: 4 }]}>  
              <Text style={s.cardLabel}>{sellerLabel}</Text>
              <Text style={s.cardValue}>{vendor || 'To be confirmed'}</Text>
            </View>
            <View style={s.card}>
              <Text style={s.cardLabel}>{buyerLabel}</Text>
              <Text style={s.cardValue}>{purchaser || 'To be confirmed'}</Text>
            </View>
          </View>
          <View style={{ width: '55%' }}>
            <Text style={s.sectionTitle}>Property Details</Text>
            <View style={s.table}>
              <View style={s.propRow}>
                <Text style={s.propLabel}>Address</Text>
                <Text style={s.propValue}>{propertyAddress || ' '}</Text>
              </View>
              <View style={s.propRow}>
                <Text style={s.propLabel}>Description</Text>
                <Text style={s.propValue}>{propertyDescription || ' '}</Text>
              </View>
              <View style={isLease ? s.propRow : s.propRowLast}>
                <Text style={s.propLabel}>{isLease ? 'Commencement Date' : 'Effective Date'}</Text>
                <Text style={s.propValue}>{fmtDate(isLease ? commencementDate : effectiveDate) || ' '}</Text>
              </View>
              {isLease && (() => {
                if (leaseRates?.length) {
                  return (
                    <View style={s.propRow}>
                      <Text style={s.propLabel}>Lease Rate Schedule</Text>
                      <Text style={s.propValue}>{leaseRates.map(r => `Yr ${r.year}: $${Number(r.rate_psf).toFixed(2)}/SF × ${r.months} Month`).join('\n')}</Text>
                    </View>
                  );
                }
                return leaseRatePsf != null ? (
                  <View style={s.propRow}>
                    <Text style={s.propLabel}>Lease Rate PSF</Text>
                    <Text style={s.propValue}>{`$${Number(leaseRatePsf).toFixed(2)}/SF`}</Text>
                  </View>
                ) : null;
              })()}
              {isLease && leaseTermMonths != null && (
                <View style={s.propRow}>
                  <Text style={s.propLabel}>Lease Term</Text>
                  <Text style={s.propValue}>{`${leaseTermMonths} months`}</Text>
                </View>
              )}
              {isLease && expiryDate && (
                <View style={s.propRowLast}>
                  <Text style={s.propLabel}>Expiry Date</Text>
                  <Text style={s.propValue}>{fmtDate(expiryDate)}</Text>
                </View>
              )}
              {isLease && freeRentMonths && freeRentMonths.length > 0 && (
                <View style={s.propRowLast}>
                  <Text style={s.propLabel}>Free Rent</Text>
                  <Text style={s.propValue}>
                    {freeRentMonths.map(fr => `${fr.months} Month ${fr.type} (Yr ${fr.year})`).join(', ')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── FINANCIAL SUMMARY ── */}
          <View wrap={false}>
          <Text style={s.sectionTitle}>Financial Summary</Text>
          <View style={s.finRow}>
            <View style={s.finCard}>
              <Text style={s.finLabel}>{dealValueLabel}</Text>
              <Text style={s.finValue}>{fmt(purchasePrice)}</Text>
              {isLease && freeRentMonths && freeRentMonths.length > 0 && (
                <Text style={{ fontSize: 6.5, color: MUTED, marginTop: 2 }}>
                  Incl. {freeRentMonths.map(fr => `${fr.months} Month ${fr.type}`).join(', ')}
                </Text>
              )}
            </View>
            <View style={s.finCard}>
              <Text style={s.finLabel}>{isLease ? 'Total Deposit' : 'Total Deposits'}</Text>
              <Text style={s.finValue}>{fmt(totalDeposits)}</Text>
            </View>
            {!isLease && (
              <View style={s.finCard}>
                <Text style={s.finLabel}>Balance on Closing</Text>
                <Text style={s.finValue}>{fmt(balanceOnClosing)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── DEPOSIT SCHEDULE + TIMELINE ── */}
        <View style={s.twoCol} wrap={false}>
          <View style={s.colLeft}>
            {validDeposits.length > 0 && (
              <>
                <Text style={s.sectionTitle}>Deposit Schedule</Text>
                <View style={s.table}>
                  <View style={s.tableHeader}>
                    <Text style={[s.tableHeaderCell, { width: '35%' }]}>Deposit</Text>
                    <Text style={[s.tableHeaderCell, { width: '30%' }]}>Amount</Text>
                    <Text style={[s.tableHeaderCell, { width: '35%' }]}>Due Date</Text>
                  </View>
                  {validDeposits.map((d, i) => (
                    <View style={i === validDeposits.length - 1 ? s.tableRowLast : s.tableRow} key={i}>
                      <Text style={[s.tableCell, { width: '35%' }]}>{depositLabel(i, isLease)}</Text>
                      <Text style={[s.tableCell, { width: '30%' }]}>{fmt(d.amount)}</Text>
                      <Text style={[s.tableCell, { width: '35%' }]}>{fmtDateShort(d.due_date)}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {!isLease && (
              <>
                <Text style={s.sectionTitle}>Closing Details</Text>
                <View style={s.table}>
                  <View style={s.propRow}>
                    <Text style={[s.propLabel, { width: '50%' }]}>Purchase Price</Text>
                    <Text style={[s.propValue, { width: '50%' }]}>{fmt(purchasePrice)}</Text>
                  </View>
                  <View style={s.propRow}>
                    <Text style={[s.propLabel, { width: '50%' }]}>Balance Due on Closing</Text>
                    <Text style={[s.propValue, { width: '50%' }]}>{fmt(balanceOnClosing)}</Text>
                  </View>
                  <View style={s.propRowLast}>
                    <Text style={[s.propLabel, { width: '50%' }]}>Closing Date</Text>
                    <Text style={[s.propValue, { width: '50%' }]}>{fmtDate(closingDate) || ' '}</Text>
                  </View>
                </View>
              </>
            )}
          </View>

          <View style={[s.colRight, { justifyContent: 'flex-start' }]}>
          {groupedTimeline.length > 0 && (
              <>
                <Text style={s.sectionTitle}>Transaction Timeline</Text>
                <View style={s.timelineContainer}>
                  {groupedTimeline.map((evt, i) => (
                    <View style={s.timelineItem} key={i}>
                      <View style={s.timelineLine}>
                        <View style={s.timelineDot} />
                      </View>
                      <View style={s.timelineContent}>
                        <Text style={s.timelineDate}>{evt.label}</Text>
                        {evt.details.map((detail, j) => (
                          <Text style={s.timelineDesc} key={j}>{detail}</Text>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        </View>

        {/* ── CONDITIONS ── */}
        {validConditions.length > 0 && (
          <View wrap={false}>
            <Text style={s.sectionTitle}>Conditions</Text>
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={[s.tableHeaderCell, s.condDesc]}>Description</Text>
                <Text style={[s.tableHeaderCell, s.condDate]}>Due Date</Text>
                <Text style={[s.tableHeaderCell, s.condStatus]}>Status</Text>
              </View>
              {validConditions.map((c, i) => (
                <View style={i === validConditions.length - 1 ? s.tableRowLast : s.tableRow} key={i}>
                  <Text style={[s.tableCell, s.condDesc]}>{c.description}</Text>
                  <Text style={[s.tableCell, s.condDate]}>{fmtDate(c.due_date)}</Text>
                  <Text style={[s.tableCell, s.condStatus]}>{c.is_satisfied ? 'Satisfied' : 'Pending'}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── IMPORTANT DATES ── */}
        {!isLease && validDates.length > 0 && (
          <View wrap={false}>
            <Text style={s.sectionTitle}>Important Dates</Text>
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={[s.tableHeaderCell, s.condDesc]}>Description</Text>
                <Text style={[s.tableHeaderCell, s.condDate]}>Due Date</Text>
                <Text style={[s.tableHeaderCell, s.condStatus]}>Status</Text>
              </View>
              {validDates.map((d, i) => (
                <View style={i === validDates.length - 1 ? s.tableRowLast : s.tableRow} key={i}>
                  <Text style={[s.tableCell, s.condDesc]}>{d.description}</Text>
                  <Text style={[s.tableCell, s.condDate]}>{fmtDate(d.due_date)}</Text>
                  <Text style={[s.tableCell, s.condStatus]}>{d.is_completed ? 'Completed' : 'Pending'}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── LAWYER CONTACTS ── */}
        {(sellerLawyer?.name || buyerLawyer?.name) && (
          <View style={s.agentSection} wrap={false}>
            <Text style={s.sectionTitle}>Lawyers</Text>
            <View style={s.agentRow}>
              {sellerLawyer?.name && (
                <View style={s.agentCard}>
                  <Text style={s.agentRole}>{sellerLabel}'s Lawyer</Text>
                  <Text style={s.agentName}>{sellerLawyer.name}</Text>
                  {sellerLawyer.firm && <Text style={s.agentDetail}>{sellerLawyer.firm}</Text>}
                  {sellerLawyer.phone && <Text style={s.agentDetail}>{sellerLawyer.phone}</Text>}
                  {sellerLawyer.email && <Text style={s.agentDetail}>{sellerLawyer.email}</Text>}
                </View>
              )}
              {buyerLawyer?.name && (
                <View style={s.agentCard}>
                  <Text style={s.agentRole}>{buyerLabel}'s Lawyer</Text>
                  <Text style={s.agentName}>{buyerLawyer.name}</Text>
                  {buyerLawyer.firm && <Text style={s.agentDetail}>{buyerLawyer.firm}</Text>}
                  {buyerLawyer.phone && <Text style={s.agentDetail}>{buyerLawyer.phone}</Text>}
                  {buyerLawyer.email && <Text style={s.agentDetail}>{buyerLawyer.email}</Text>}
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── AGENT CONTACTS ── */}
        {(listingAgents.length > 0 || sellingAgents.length > 0) && (
          <View style={s.agentSection} wrap={false}>
            <Text style={s.sectionTitle}>Agent Contacts</Text>
            <View style={s.agentRow}>
              {listingAgents.map((a, i) => (
                <View style={s.agentCard} key={`la-${i}`}>
                  <Text style={s.agentRole}>Listing Agent</Text>
                  <Text style={s.agentName}>{a.name}</Text>
                  {a.brokerage && <Text style={s.agentDetail}>{a.brokerage}</Text>}
                  {a.email && <Text style={s.agentDetail}>{a.email}</Text>}
                  {a.phone && <Text style={s.agentDetail}>{a.phone}</Text>}
                </View>
              ))}
              {sellingAgents.map((a, i) => (
                <View style={s.agentCard} key={`sa-${i}`}>
                  <Text style={s.agentRole}>{agentLabel} Agent</Text>
                  <Text style={s.agentName}>{a.name}</Text>
                  {a.brokerage && <Text style={s.agentDetail}>{a.brokerage}</Text>}
                  {a.email && <Text style={s.agentDetail}>{a.email}</Text>}
                  {a.phone && <Text style={s.agentDetail}>{a.phone}</Text>}
                </View>
              ))}
            </View>
          </View>
        )}

      </Page>
    </Document>
  );
}
