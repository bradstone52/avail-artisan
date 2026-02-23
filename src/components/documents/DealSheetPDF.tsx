import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { Deal, Agent, Brokerage } from '@/types/database';
import type { DealCondition } from '@/hooks/useDealConditions';
import type { DealDeposit } from '@/hooks/useDealDeposits';
import clearviewLogo from '@/assets/clearview-logo.png';

interface DealSheetPDFProps {
  deal: Deal;
  conditions: DealCondition[];
  deposits: DealDeposit[];
  getAgent: (id: string | null | undefined) => Agent | undefined;
  getBrokerage: (id: string | null | undefined) => Brokerage | undefined;
}

// ── helpers ──────────────────────────────────────────────
const fmtCurrency = (v: number | null | undefined): string => {
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

const fmtNumber = (v: number | null | undefined): string => {
  if (v == null) return '';
  return new Intl.NumberFormat('en-CA').format(v);
};

const getTodayFormatted = () =>
  new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });

const depositLabel = (i: number) => ['First Deposit', 'Second Deposit', 'Third Deposit'][i] || `Deposit ${i + 1}`;

// ── colors (distinct from Deal Summary's orange) ─────────
const NAVY = '#1e3a5f';
const LIGHT_BLUE = '#e8f0fa';
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
  contactRow: { flexDirection: 'row', gap: 20, marginBottom: 6, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: NAVY },
  contactBlock: { flex: 1 },
  contactItem: { fontSize: 7, marginBottom: 1 },
  contactBold: { fontWeight: 'bold', fontSize: 7 },

  // Meta row (deal # / date)
  metaRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 6, gap: 16 },
  metaItem: { flexDirection: 'row', gap: 4 },
  metaLabel: { fontSize: 8, fontWeight: 'bold' },
  metaValue: { fontSize: 8 },

  // Section title
  sectionTitle: { fontSize: 9, fontWeight: 'bold', marginTop: 10, marginBottom: 4 },

  // Two-column layout
  twoCol: { flexDirection: 'row', gap: 12 },
  colHalf: { width: '48%' },

  // Cards
  card: { borderWidth: 1, borderColor: BORDER, borderRadius: 3, padding: 8, marginBottom: 4 },
  cardLabel: { fontSize: 8, fontWeight: 'bold', marginBottom: 2 },
  cardValue: { fontSize: 8, color: MUTED },

  // Financial summary cards
  finRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  finCard: { flex: 1, backgroundColor: LIGHT_BLUE, borderRadius: 3, padding: 8 },
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

  // Conditions table columns
  condDesc: { width: '50%' },
  condDate: { width: '30%' },
  condStatus: { width: '20%' },

  // Commission section
  commSection: { marginTop: 4 },
  commRow: { flexDirection: 'row', padding: 4, borderBottomWidth: 1, borderBottomColor: BORDER },
  commRowLast: { flexDirection: 'row', padding: 4 },
  commLabel: { flex: 1, fontSize: 7.5 },
  commValue: { width: 90, textAlign: 'right', fontSize: 7.5 },
  commValueBold: { width: 90, textAlign: 'right', fontSize: 7.5, fontWeight: 'bold' },
  commSubtitle: { fontSize: 8, fontWeight: 'bold', marginTop: 6, marginBottom: 2 },

  // Agent section
  agentSection: { marginTop: 6 },
  agentRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  agentCard: { flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 3, padding: 6, backgroundColor: GRAY_BG },
  agentRole: { fontSize: 6.5, color: MUTED, marginBottom: 1, textTransform: 'uppercase' as any },
  agentName: { fontSize: 7.5, fontWeight: 'bold', marginBottom: 1 },
  agentDetail: { fontSize: 6.5, color: MUTED },

  // Comments
  commentsSection: { marginTop: 8, borderTopWidth: 1, borderTopColor: NAVY, paddingTop: 6 },
  commentsText: { fontSize: 7.5, lineHeight: 1.4, color: MUTED },
});

// ── Component ────────────────────────────────────────────
export function DealSheetPDF({ deal, conditions, deposits, getAgent, getBrokerage }: DealSheetPDFProps) {
  const dealValue = deal.deal_value || 0;
  const commissionRate = deal.commission_percent || 0;
  const otherRate = deal.other_brokerage_percent || 0;
  const cvRate = deal.clearview_percent || 0;
  const gstRate = deal.gst_rate || 5;

  const totalCommission = dealValue * commissionRate / 100;
  const totalGST = totalCommission * gstRate / 100;
  const totalWithGST = totalCommission + totalGST;

  const otherCommission = dealValue * otherRate / 100;
  const otherGST = otherCommission * gstRate / 100;
  const otherTotal = otherCommission + otherGST;

  const cvCommission = dealValue * cvRate / 100;
  const cvGST = cvCommission * gstRate / 100;
  const cvTotal = cvCommission + cvGST;

  const listingBrokerage = getBrokerage(deal.listing_brokerage_id);
  const sellingBrokerage = getBrokerage(deal.selling_brokerage_id);
  const listingAgent1 = getAgent(deal.listing_agent1_id);
  const listingAgent2 = getAgent(deal.listing_agent2_id);
  const sellingAgent1 = getAgent(deal.selling_agent1_id);
  const sellingAgent2 = getAgent(deal.selling_agent2_id);

  const isLease = deal.deal_type?.toLowerCase() === 'lease';
  const usePV = !!(deal as any).use_purchaser_vendor;
  const sellerLabel = usePV ? 'Vendor' : 'Seller';
  const buyerLabel = usePV ? 'Purchaser' : 'Buyer';
  const valueLabel = isLease ? 'Lease Value' : 'Sale Price';
  const agentLabel = isLease ? 'Leasing' : 'Selling';

  const displayDeposits = deposits.slice(0, 3);

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        <Text style={s.pageNumber} render={({ pageNumber, totalPages }) => totalPages > 1 ? `${pageNumber} of ${totalPages}` : ''} fixed />
        {/* ── HEADER ── */}
        <View style={s.headerRow}>
          <Image src={clearviewLogo} style={s.logo} />
        </View>
        <Text style={s.subtitle}>{deal.deal_type?.toUpperCase() || 'SALE'} DEALSHEET: {[deal.address, deal.city].filter(Boolean).join(', ') || '« Address »'}</Text>
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

        {/* ── META (Deal # / Date) ── */}
        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Deal #:</Text>
            <Text style={s.metaValue}>{deal.deal_number || '—'}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Date:</Text>
            <Text style={s.metaValue}>{getTodayFormatted()}</Text>
          </View>
        </View>

        {/* ── TRANSACTION PARTIES + PROPERTY DETAILS ── */}
        <View style={s.twoCol} wrap={false}>
          <View style={{ width: '45%' }}>
            <Text style={s.sectionTitle}>Transaction Parties</Text>
            <View style={[s.card, { marginBottom: 4 }]}>
              <Text style={s.cardLabel}>{sellerLabel}</Text>
              <Text style={s.cardValue}>{deal.seller_name || 'To be confirmed'}</Text>
            </View>
            <View style={s.card}>
              <Text style={s.cardLabel}>{buyerLabel}</Text>
              <Text style={s.cardValue}>{deal.buyer_name || 'To be confirmed'}</Text>
            </View>
          </View>
          <View style={{ width: '55%' }}>
            <Text style={s.sectionTitle}>Property Details</Text>
            <View style={s.table}>
              <View style={s.propRow}>
                <Text style={s.propLabel}>Address</Text>
                <Text style={s.propValue}>{deal.address || ' '}</Text>
              </View>
              <View style={s.propRow}>
                <Text style={s.propLabel}>Premises Size</Text>
                <Text style={s.propValue}>{deal.size_sf ? `${fmtNumber(deal.size_sf)} ${(deal as any).is_land_deal ? 'Ac' : 'SF'}` : '—'}</Text>
              </View>
              <View style={s.propRowLast}>
                <Text style={s.propLabel}>Closing Date</Text>
                <Text style={s.propValue}>{fmtDate(deal.close_date) || '—'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── FINANCIAL SUMMARY ── */}
        <View wrap={false}>
          <Text style={s.sectionTitle}>Financial Summary</Text>
          <View style={s.finRow}>
            <View style={s.finCard}>
              <Text style={s.finLabel}>{valueLabel}</Text>
              <Text style={s.finValue}>{fmtCurrency(dealValue)}</Text>
            </View>
            <View style={s.finCard}>
              <Text style={s.finLabel}>Commission ({commissionRate}%)</Text>
              <Text style={s.finValue}>{fmtCurrency(totalCommission)}</Text>
            </View>
            <View style={s.finCard}>
              <Text style={s.finLabel}>Total w/ GST</Text>
              <Text style={s.finValue}>{fmtCurrency(totalWithGST)}</Text>
            </View>
          </View>
        </View>

        {/* ── BROKERAGES ── */}
        {(listingBrokerage || sellingBrokerage) && (
          <View style={s.agentSection} wrap={false}>
            <Text style={s.sectionTitle}>Brokerages</Text>
            <View style={s.agentRow}>
              {listingBrokerage && (
                <View style={s.agentCard}>
                  <Text style={s.agentRole}>Listing Brokerage</Text>
                  <Text style={s.agentName}>{listingBrokerage.name}</Text>
                  {listingBrokerage.address && <Text style={s.agentDetail}>{listingBrokerage.address}</Text>}
                  {listingBrokerage.phone && <Text style={s.agentDetail}>{listingBrokerage.phone}</Text>}
                  {listingBrokerage.email && <Text style={s.agentDetail}>{listingBrokerage.email}</Text>}
                </View>
              )}
              {sellingBrokerage && (
                <View style={s.agentCard}>
                  <Text style={s.agentRole}>{agentLabel} Brokerage</Text>
                  <Text style={s.agentName}>{sellingBrokerage.name}</Text>
                  {sellingBrokerage.address && <Text style={s.agentDetail}>{sellingBrokerage.address}</Text>}
                  {sellingBrokerage.phone && <Text style={s.agentDetail}>{sellingBrokerage.phone}</Text>}
                  {sellingBrokerage.email && <Text style={s.agentDetail}>{sellingBrokerage.email}</Text>}
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── COMMISSION BREAKDOWN + DEPOSITS ── */}
        <View style={s.twoCol} wrap={false}>
          <View style={s.colHalf}>
            <Text style={s.sectionTitle}>Commission Breakdown</Text>
            <View style={s.table}>
              {/* Total */}
              <View style={s.tableHeader}>
                <Text style={[s.tableHeaderCell, { flex: 1 }]}>Total Commission ({commissionRate}%)</Text>
                <Text style={[s.tableHeaderCell, { width: 90, textAlign: 'right' }]}></Text>
              </View>
              <View style={s.tableRow}>
                <Text style={[s.tableCell, { flex: 1 }]}>Commission (excl. GST)</Text>
                <Text style={[s.tableCell, { width: 90, textAlign: 'right' }]}>{fmtCurrency(totalCommission)}</Text>
              </View>
              <View style={s.tableRow}>
                <Text style={[s.tableCell, { flex: 1 }]}>GST</Text>
                <Text style={[s.tableCell, { width: 90, textAlign: 'right' }]}>{fmtCurrency(totalGST)}</Text>
              </View>
              <View style={s.tableRowLast}>
                <Text style={[s.tableCell, { flex: 1, fontWeight: 'bold' }]}>Total (incl. GST)</Text>
                <Text style={[s.tableCell, { width: 90, textAlign: 'right', fontWeight: 'bold' }]}>{fmtCurrency(totalWithGST)}</Text>
              </View>
            </View>

            <Text style={s.commSubtitle}>Other Brokerage – {otherRate}%</Text>
            <View style={s.table}>
              <View style={s.tableRow}>
                <Text style={[s.tableCell, { flex: 1 }]}>Commission (excl. GST)</Text>
                <Text style={[s.tableCell, { width: 90, textAlign: 'right' }]}>{fmtCurrency(otherCommission)}</Text>
              </View>
              <View style={s.tableRow}>
                <Text style={[s.tableCell, { flex: 1 }]}>GST</Text>
                <Text style={[s.tableCell, { width: 90, textAlign: 'right' }]}>{fmtCurrency(otherGST)}</Text>
              </View>
              <View style={s.tableRowLast}>
                <Text style={[s.tableCell, { flex: 1, fontWeight: 'bold' }]}>Total</Text>
                <Text style={[s.tableCell, { width: 90, textAlign: 'right', fontWeight: 'bold' }]}>{fmtCurrency(otherTotal)}</Text>
              </View>
            </View>

            <Text style={s.commSubtitle}>ClearView Portion – {cvRate}%</Text>
            <View style={s.table}>
              <View style={s.tableRow}>
                <Text style={[s.tableCell, { flex: 1 }]}>Commission (excl. GST)</Text>
                <Text style={[s.tableCell, { width: 90, textAlign: 'right' }]}>{fmtCurrency(cvCommission)}</Text>
              </View>
              <View style={s.tableRow}>
                <Text style={[s.tableCell, { flex: 1 }]}>GST</Text>
                <Text style={[s.tableCell, { width: 90, textAlign: 'right' }]}>{fmtCurrency(cvGST)}</Text>
              </View>
              <View style={s.tableRowLast}>
                <Text style={[s.tableCell, { flex: 1, fontWeight: 'bold' }]}>Total</Text>
                <Text style={[s.tableCell, { width: 90, textAlign: 'right', fontWeight: 'bold' }]}>{fmtCurrency(cvTotal)}</Text>
              </View>
            </View>
          </View>

          <View style={s.colHalf}>
            {/* Deposits */}
            <Text style={s.sectionTitle}>Deposit Schedule</Text>
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={[s.tableHeaderCell, { width: '35%' }]}>Deposit</Text>
                <Text style={[s.tableHeaderCell, { width: '30%' }]}>Amount</Text>
                <Text style={[s.tableHeaderCell, { width: '35%' }]}>Held By</Text>
              </View>
              {displayDeposits.length > 0 ? displayDeposits.map((d, i) => (
                <View style={i === displayDeposits.length - 1 ? s.tableRowLast : s.tableRow} key={d.id}>
                  <Text style={[s.tableCell, { width: '35%' }]}>{depositLabel(i)}</Text>
                  <Text style={[s.tableCell, { width: '30%' }]}>{fmtCurrency(d.amount)}</Text>
                  <Text style={[s.tableCell, { width: '35%' }]}>{d.held_by || '—'}</Text>
                </View>
              )) : (
                <View style={s.tableRowLast}>
                  <Text style={[s.tableCell, { width: '100%' }]}>No deposits recorded</Text>
                </View>
              )}
            </View>

            {/* Conditions */}
            {conditions.length > 0 && (
              <>
                <Text style={s.sectionTitle}>Conditions</Text>
                <View style={s.table}>
                  <View style={s.tableHeader}>
                    <Text style={[s.tableHeaderCell, s.condDesc]}>Description</Text>
                    <Text style={[s.tableHeaderCell, s.condDate]}>Removal Date</Text>
                    <Text style={[s.tableHeaderCell, s.condStatus]}>Status</Text>
                  </View>
                  {conditions.map((c, i) => (
                    <View style={i === conditions.length - 1 ? s.tableRowLast : s.tableRow} key={c.id}>
                      <Text style={[s.tableCell, s.condDesc]}>{c.description}</Text>
                      <Text style={[s.tableCell, s.condDate]}>{fmtDateShort(c.due_date)}</Text>
                      <Text style={[s.tableCell, s.condStatus]}>{c.is_satisfied ? 'Satisfied' : 'Pending'}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        </View>

        {/* ── LAWYERS ── */}
        {(deal.seller_lawyer_name || deal.buyer_lawyer_name) && (
          <View style={s.agentSection} wrap={false}>
            <Text style={s.sectionTitle}>Lawyers</Text>
            <View style={s.agentRow}>
              {deal.seller_lawyer_name && (
                <View style={s.agentCard}>
                  <Text style={s.agentRole}>{sellerLabel}'s Lawyer</Text>
                  <Text style={s.agentName}>{deal.seller_lawyer_name}</Text>
                  {deal.seller_lawyer_firm && <Text style={s.agentDetail}>{deal.seller_lawyer_firm}</Text>}
                  {deal.seller_lawyer_phone && <Text style={s.agentDetail}>{deal.seller_lawyer_phone}</Text>}
                  {deal.seller_lawyer_email && <Text style={s.agentDetail}>{deal.seller_lawyer_email}</Text>}
                </View>
              )}
              {deal.buyer_lawyer_name && (
                <View style={s.agentCard}>
                  <Text style={s.agentRole}>{buyerLabel}'s Lawyer</Text>
                  <Text style={s.agentName}>{deal.buyer_lawyer_name}</Text>
                  {deal.buyer_lawyer_firm && <Text style={s.agentDetail}>{deal.buyer_lawyer_firm}</Text>}
                  {deal.buyer_lawyer_phone && <Text style={s.agentDetail}>{deal.buyer_lawyer_phone}</Text>}
                  {deal.buyer_lawyer_email && <Text style={s.agentDetail}>{deal.buyer_lawyer_email}</Text>}
                </View>
              )}
            </View>
          </View>
        )}



        {(listingAgent1 || listingAgent2 || sellingAgent1 || sellingAgent2) && (
          <View style={s.agentSection} wrap={false}>
            <Text style={s.sectionTitle}>Agent Contacts</Text>
            <View style={s.agentRow}>
              {listingAgent1 && (
                <View style={s.agentCard}>
                  <Text style={s.agentRole}>Listing Agent</Text>
                  <Text style={s.agentName}>{listingAgent1.name}</Text>
                  {listingBrokerage && <Text style={s.agentDetail}>{listingBrokerage.name}</Text>}
                  {listingAgent1.email && <Text style={s.agentDetail}>{listingAgent1.email}</Text>}
                  {listingAgent1.phone && <Text style={s.agentDetail}>{listingAgent1.phone}</Text>}
                </View>
              )}
              {listingAgent2 && (
                <View style={s.agentCard}>
                  <Text style={s.agentRole}>Listing Agent</Text>
                  <Text style={s.agentName}>{listingAgent2.name}</Text>
                  {listingBrokerage && <Text style={s.agentDetail}>{listingBrokerage.name}</Text>}
                  {listingAgent2.email && <Text style={s.agentDetail}>{listingAgent2.email}</Text>}
                  {listingAgent2.phone && <Text style={s.agentDetail}>{listingAgent2.phone}</Text>}
                </View>
              )}
              {sellingAgent1 && (
                <View style={s.agentCard}>
                  <Text style={s.agentRole}>{agentLabel} Agent</Text>
                  <Text style={s.agentName}>{sellingAgent1.name}</Text>
                  {sellingBrokerage && <Text style={s.agentDetail}>{sellingBrokerage.name}</Text>}
                  {sellingAgent1.email && <Text style={s.agentDetail}>{sellingAgent1.email}</Text>}
                  {sellingAgent1.phone && <Text style={s.agentDetail}>{sellingAgent1.phone}</Text>}
                </View>
              )}
              {sellingAgent2 && (
                <View style={s.agentCard}>
                  <Text style={s.agentRole}>{agentLabel} Agent</Text>
                  <Text style={s.agentName}>{sellingAgent2.name}</Text>
                  {sellingBrokerage && <Text style={s.agentDetail}>{sellingBrokerage.name}</Text>}
                  {sellingAgent2.email && <Text style={s.agentDetail}>{sellingAgent2.email}</Text>}
                  {sellingAgent2.phone && <Text style={s.agentDetail}>{sellingAgent2.phone}</Text>}
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── COMMENTS ── */}
        {deal.notes && (
          <View style={s.commentsSection} wrap={false}>
            <Text style={s.sectionTitle}>Comments</Text>
            <Text style={s.commentsText}>{deal.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
