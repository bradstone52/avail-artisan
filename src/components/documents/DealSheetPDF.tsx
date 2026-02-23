import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { Deal, Agent, Brokerage } from '@/types/database';
import type { DealCondition } from '@/hooks/useDealConditions';
import type { DealDeposit } from '@/hooks/useDealDeposits';

// Import logo as base64 for PDF
import clearviewLogo from '@/assets/clearview-logo.png';

interface DealSheetPDFProps {
  deal: Deal;
  conditions: DealCondition[];
  deposits: DealDeposit[];
  getAgent: (id: string | null | undefined) => Agent | undefined;
  getBrokerage: (id: string | null | undefined) => Brokerage | undefined;
}

// New color palette per specification
const colors = {
  headerBg: '#f5f5f5',      // Gray - label cells
  yellowBg: '#fffde7',      // Seller section
  blueBg: '#e3f2fd',        // Buyer section  
  greenBg: '#e8f5e9',       // Agency section
  border: '#333333',        // Dark borders
  lightBorder: '#cccccc',   // Light borders
};

// Format functions
const formatCurrencyCAD = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '';
  return new Intl.NumberFormat('en-CA', { 
    style: 'currency', 
    currency: 'CAD', 
    minimumFractionDigits: 2 
  }).format(value);
};

const formatDateLong = (date: string | null | undefined) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-CA', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

const getTodayFormatted = () => {
  return new Date().toLocaleDateString('en-CA', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '';
  return new Intl.NumberFormat('en-CA').format(value);
};

const styles = StyleSheet.create({
  page: { 
    padding: 30, 
    fontSize: 9, 
    fontFamily: 'Helvetica' 
  },
  
  // HEADER
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border, 
    paddingBottom: 8 
  },
  headerLeft: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  logo: { 
    width: 180, 
    height: 40, 
    objectFit: 'contain' 
  },
  headerRight: { 
    flexDirection: 'column', 
    alignItems: 'flex-end' 
  },
  title: { 
    fontSize: 14, 
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerField: { 
    flexDirection: 'row', 
    alignItems: 'center',
    marginBottom: 2,
  },
  headerLabel: { 
    fontWeight: 'bold', 
    marginRight: 4 
  },
  
  // SECTION TITLES
  sectionTitle: { 
    fontSize: 10, 
    fontWeight: 'bold', 
    marginBottom: 6, 
    textDecoration: 'underline' 
  },
  
  // SUMMARY TABLE
  summaryTable: { 
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: { 
    flexDirection: 'row', 
    borderBottomWidth: 1, 
    borderBottomColor: colors.lightBorder 
  },
  summaryRowLast: { 
    flexDirection: 'row' 
  },
  summaryCell: { 
    padding: 6, 
    borderRightWidth: 1, 
    borderRightColor: colors.lightBorder 
  },
  summaryCellLast: { 
    padding: 6 
  },
  summaryCellLabel: { 
    fontWeight: 'bold', 
    backgroundColor: colors.headerBg 
  },
  summaryLabel: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  summaryValue: {
    fontSize: 9,
  },
  
  // TWO COLUMN LAYOUT
  twoColumn: { 
    flexDirection: 'row', 
    marginBottom: 12 
  },
  column: { 
    flex: 1 
  },
  
  // INFO BOXES
  infoBox: { 
    borderWidth: 1, 
    borderColor: colors.border, 
    padding: 10, 
    minHeight: 80 
  },
  sellerBox: { 
    backgroundColor: colors.yellowBg 
  },
  buyerBox: { 
    backgroundColor: colors.blueBg 
  },
  agencyBox: { 
    backgroundColor: colors.greenBg 
  },
  infoTitle: { 
    fontWeight: 'bold', 
    fontSize: 10, 
    marginBottom: 8, 
    textDecoration: 'underline' 
  },
  infoRow: { 
    flexDirection: 'row', 
    marginBottom: 3 
  },
  infoLabel: { 
    fontWeight: 'bold', 
    width: 55 
  },
  infoValue: { 
    flex: 1 
  },
  
  // AGENCY SECTION
  agencyColumns: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  agencyColumn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.greenBg,
    padding: 10,
  },
  agencyColumnLeft: {
    borderRightWidth: 0,
  },
  agencyLabel: {
    fontWeight: 'bold',
    fontSize: 9,
    marginBottom: 4,
  },
  agencyValue: {
    fontSize: 9,
    marginBottom: 2,
  },
  
  // COMMISSION SECTION
  commissionNote: { 
    fontWeight: 'bold', 
    textDecoration: 'underline', 
    marginBottom: 8, 
    marginTop: 4,
    fontSize: 9,
  },
  commissionColumns: { 
    flexDirection: 'row', 
    marginBottom: 12 
  },
  commissionColumn: { 
    flex: 1 
  },
  commissionColumnLeft: {
    marginRight: 10,
  },
  commissionTitle: { 
    fontWeight: 'bold', 
    textDecoration: 'underline', 
    marginBottom: 4,
    fontSize: 9,
  },
  commissionSubtitle: { 
    fontWeight: 'bold', 
    marginBottom: 4,
    marginTop: 10,
    fontSize: 9,
  },
  commissionRow: { 
    flexDirection: 'row', 
    marginBottom: 2 
  },
  commissionLabel: { 
    flex: 1,
    fontSize: 9,
  },
  commissionValue: { 
    width: 90, 
    textAlign: 'right',
    fontSize: 9,
  },
  commissionValueBold: { 
    width: 90, 
    textAlign: 'right',
    fontSize: 9,
    fontWeight: 'bold',
  },
  
  // DEPOSITS
  depositTitle: { 
    fontWeight: 'bold', 
    textDecoration: 'underline', 
    marginBottom: 4,
    fontSize: 9,
  },
  depositRow: { 
    marginBottom: 4 
  },
  depositLabel: { 
    fontWeight: 'bold',
    fontSize: 9,
  },
  depositValue: {
    fontSize: 9,
  },
  depositHeldBy: {
    fontSize: 8,
    marginLeft: 10,
  },
  
  // COMMENTS
  commentsSection: { 
    marginTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: colors.lightBorder, 
    paddingTop: 8 
  },
  commentsTitle: { 
    fontWeight: 'bold', 
    textDecoration: 'underline', 
    marginBottom: 4,
    fontSize: 10,
  },
  commentsText: {
    fontSize: 9,
    lineHeight: 1.4,
  },
  
  // Condition items
  conditionItem: {
    fontSize: 8,
    marginBottom: 2,
  },
});

export function DealSheetPDF({ deal, conditions, deposits, getAgent, getBrokerage }: DealSheetPDFProps) {
  // Calculate commissions
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

  // Get related entities
  const listingBrokerage = getBrokerage(deal.listing_brokerage_id);
  const sellingBrokerage = getBrokerage(deal.selling_brokerage_id);
  const sellerBrokerage = getBrokerage(deal.seller_brokerage_id);
  const buyerBrokerage = getBrokerage(deal.buyer_brokerage_id);
  const listingAgent1 = getAgent(deal.listing_agent1_id);
  const listingAgent2 = getAgent(deal.listing_agent2_id);
  const sellingAgent1 = getAgent(deal.selling_agent1_id);
  const sellingAgent2 = getAgent(deal.selling_agent2_id);

  const isLease = deal.deal_type?.toLowerCase() === 'lease';
  const usePV = !!(deal as any).use_purchaser_vendor;
  const sellerLabel = usePV ? 'VENDOR' : 'SELLER';
  const buyerLabel = usePV ? 'PURCHASER' : 'BUYER';
  const valueLabel = isLease ? 'Lease Value' : 'Sale Price';
  const agentLabel = isLease ? 'Leasing' : 'Selling';

  // Get first 3 deposits
  const displayDeposits = deposits.slice(0, 3);
  const depositLabels = ['1st', '2nd', '3rd'];

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image src={clearviewLogo} style={styles.logo} />
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.title}>{deal.deal_type?.toUpperCase() || 'SALE'} DEALSHEET</Text>
            <View style={styles.headerField}>
              <Text style={styles.headerLabel}>Deal #:</Text>
              <Text>{deal.deal_number || '_________'}</Text>
            </View>
            <View style={styles.headerField}>
              <Text style={styles.headerLabel}>Date:</Text>
              <Text>{getTodayFormatted()}</Text>
            </View>
          </View>
        </View>

        {/* PROPERTY / DEAL SUMMARY */}
        <Text style={styles.sectionTitle}>PROPERTY / DEAL SUMMARY</Text>
        <View style={styles.summaryTable}>
          {/* Row 1: Labels */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCell, styles.summaryCellLabel, { flex: 2 }]}>
              <Text style={styles.summaryLabel}>Property Address:</Text>
            </View>
            <View style={[styles.summaryCell, styles.summaryCellLabel, { flex: 1 }]}>
              <Text style={styles.summaryLabel}>Closing Date:</Text>
            </View>
            <View style={[styles.summaryCellLast, styles.summaryCellLabel, { flex: 1 }]}>
              <Text style={styles.summaryLabel}>{valueLabel}:</Text>
            </View>
          </View>
          {/* Row 2: Values */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCell, { flex: 2 }]}>
              <Text style={styles.summaryValue}>{deal.address}{deal.city ? `, ${deal.city}` : ''}</Text>
            </View>
            <View style={[styles.summaryCell, { flex: 1 }]}>
              <Text style={styles.summaryValue}>{formatDateLong(deal.close_date)}</Text>
            </View>
            <View style={[styles.summaryCellLast, { flex: 1 }]}>
              <Text style={styles.summaryValue}>{formatCurrencyCAD(dealValue)}</Text>
            </View>
          </View>
          {/* Row 3: Labels */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCell, styles.summaryCellLabel, { flex: 2 }]}>
              <Text style={styles.summaryLabel}>Premises Size:</Text>
            </View>
            <View style={[styles.summaryCellLast, styles.summaryCellLabel, { flex: 3 }]}>
              <Text style={styles.summaryLabel}>Key Conditions & Removal Dates:</Text>
            </View>
          </View>
          {/* Row 4: Values */}
          <View style={styles.summaryRowLast}>
            <View style={[styles.summaryCell, { flex: 2 }]}>
              <Text style={styles.summaryValue}>{deal.size_sf ? `${formatNumber(deal.size_sf)} ${(deal as any).is_land_deal ? 'Ac' : 'SF'}` : '—'}</Text>
            </View>
            <View style={[styles.summaryCellLast, { flex: 3 }]}>
              {conditions.length > 0 ? (
                conditions.map((c, i) => (
                  <Text key={c.id} style={styles.conditionItem}>
                    {i + 1}) {c.description}{c.due_date ? ` – Removal by ${formatDateLong(c.due_date)}` : ''}
                  </Text>
                ))
              ) : (
                <Text style={styles.conditionItem}>—</Text>
              )}
            </View>
          </View>
        </View>

        {/* SELLER & BUYER INFORMATION */}
        <View style={styles.twoColumn}>
          {/* Seller Box - Yellow */}
          <View style={[styles.infoBox, styles.sellerBox, { marginRight: 5, flex: 1 }]}>
            <Text style={styles.infoTitle}>{sellerLabel} INFORMATION</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name:</Text>
              <Text style={styles.infoValue}>{deal.seller_name || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Address:</Text>
              <Text style={styles.infoValue}>{sellerBrokerage ? `c/o ${sellerBrokerage.name}` : '—'}</Text>
            </View>
            {sellerBrokerage?.address && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{' '}</Text>
                <Text style={styles.infoValue}>{sellerBrokerage.address}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Contact:</Text>
              <Text style={styles.infoValue}>{listingAgent1?.name || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{listingAgent1?.phone || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{listingAgent1?.email || '—'}</Text>
            </View>
          </View>

          {/* Buyer Box - Blue */}
          <View style={[styles.infoBox, styles.buyerBox, { marginLeft: 5, flex: 1 }]}>
            <Text style={styles.infoTitle}>{buyerLabel} INFORMATION</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name:</Text>
              <Text style={styles.infoValue}>{deal.buyer_name || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Address:</Text>
              <Text style={styles.infoValue}>{buyerBrokerage ? `c/o ${buyerBrokerage.name}` : '—'}</Text>
            </View>
            {buyerBrokerage?.address && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{' '}</Text>
                <Text style={styles.infoValue}>{buyerBrokerage.address}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Contact:</Text>
              <Text style={styles.infoValue}>{sellingAgent1?.name || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{sellingAgent1?.phone || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{sellingAgent1?.email || '—'}</Text>
            </View>
          </View>
        </View>

        {/* AGENCY & COMMISSION SUMMARY - Green */}
        <View style={styles.agencyColumns}>
          <View style={[styles.agencyColumn, styles.agencyColumnLeft]}>
            <Text style={styles.agencyLabel}>Listing Agent(s) / Brokerage:</Text>
            {listingAgent1 && (
              <Text style={styles.agencyValue}>{listingAgent1.name} / {listingBrokerage?.name || '—'}</Text>
            )}
            {listingAgent2 && (
              <Text style={styles.agencyValue}>{listingAgent2.name} / {listingBrokerage?.name || '—'}</Text>
            )}
            {!listingAgent1 && !listingAgent2 && (
              <Text style={styles.agencyValue}>—</Text>
            )}
          </View>
          <View style={styles.agencyColumn}>
            <Text style={styles.agencyLabel}>{agentLabel} Agent(s) / Brokerage:</Text>
            {sellingAgent1 && (
              <Text style={styles.agencyValue}>{sellingAgent1.name} / {sellingBrokerage?.name || '—'}</Text>
            )}
            {sellingAgent2 && (
              <Text style={styles.agencyValue}>{sellingAgent2.name} / {sellingBrokerage?.name || '—'}</Text>
            )}
            {!sellingAgent1 && !sellingAgent2 && (
              <Text style={styles.agencyValue}>—</Text>
            )}
          </View>
        </View>

        {/* COMMISSION CALCULATION NOTES */}
        <Text style={styles.commissionNote}>
          Commission Calculation Notes: {formatCurrencyCAD(dealValue)} x {commissionRate}%
        </Text>

        {/* COMMISSION DETAILS & DEPOSITS */}
        <View style={styles.commissionColumns}>
          {/* Left Column - Commission Calculations */}
          <View style={[styles.commissionColumn, styles.commissionColumnLeft]}>
            <Text style={styles.commissionTitle}>TOTAL COMMISSION</Text>
            <View style={styles.commissionRow}>
              <Text style={styles.commissionLabel}>Commission (excl. GST):</Text>
              <Text style={styles.commissionValue}>{formatCurrencyCAD(totalCommission)}</Text>
            </View>
            <View style={styles.commissionRow}>
              <Text style={styles.commissionLabel}>GST on Commission:</Text>
              <Text style={styles.commissionValue}>{formatCurrencyCAD(totalGST)}</Text>
            </View>
            <View style={styles.commissionRow}>
              <Text style={styles.commissionLabel}>Total Commission (incl. GST):</Text>
              <Text style={styles.commissionValueBold}>{formatCurrencyCAD(totalWithGST)}</Text>
            </View>

            <Text style={styles.commissionSubtitle}>OTHER BROKERAGE PORTION – {otherRate}%</Text>
            <View style={styles.commissionRow}>
              <Text style={styles.commissionLabel}>Commission (excl. GST):</Text>
              <Text style={styles.commissionValue}>{formatCurrencyCAD(otherCommission)}</Text>
            </View>
            <View style={styles.commissionRow}>
              <Text style={styles.commissionLabel}>GST:</Text>
              <Text style={styles.commissionValue}>{formatCurrencyCAD(otherGST)}</Text>
            </View>
            <View style={styles.commissionRow}>
              <Text style={styles.commissionLabel}>Total:</Text>
              <Text style={styles.commissionValueBold}>{formatCurrencyCAD(otherTotal)}</Text>
            </View>

            <Text style={styles.commissionSubtitle}>CLEARVIEW PORTION – {cvRate}%</Text>
            <View style={styles.commissionRow}>
              <Text style={styles.commissionLabel}>Commission (excl. GST):</Text>
              <Text style={styles.commissionValue}>{formatCurrencyCAD(cvCommission)}</Text>
            </View>
            <View style={styles.commissionRow}>
              <Text style={styles.commissionLabel}>GST:</Text>
              <Text style={styles.commissionValue}>{formatCurrencyCAD(cvGST)}</Text>
            </View>
            <View style={styles.commissionRow}>
              <Text style={styles.commissionLabel}>Total:</Text>
              <Text style={styles.commissionValueBold}>{formatCurrencyCAD(cvTotal)}</Text>
            </View>
          </View>

          {/* Right Column - Deposits */}
          <View style={styles.commissionColumn}>
            <Text style={styles.depositTitle}>FINANCIAL / TRUST DETAILS</Text>
            {displayDeposits.length > 0 ? (
              displayDeposits.map((deposit, index) => (
                <View key={deposit.id} style={styles.depositRow}>
                  <Text style={styles.depositLabel}>
                    {depositLabels[index]} Deposit Received: <Text style={styles.depositValue}>{formatCurrencyCAD(deposit.amount)}</Text>
                  </Text>
                  <Text style={styles.depositHeldBy}>Held By: {deposit.held_by || '—'}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.depositValue}>—</Text>
            )}
            {/* Show empty placeholder rows if less than 3 deposits */}
            {displayDeposits.length < 3 && Array.from({ length: 3 - displayDeposits.length }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.depositRow}>
                <Text style={styles.depositLabel}>
                  {depositLabels[displayDeposits.length + i]} Deposit Received: <Text style={styles.depositValue}>—</Text>
                </Text>
                <Text style={styles.depositHeldBy}>Held By: —</Text>
              </View>
            ))}
          </View>
        </View>

        {/* COMMENTS */}
        <View wrap={false} style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>COMMENTS</Text>
          <Text style={styles.commentsText}>{deal.notes || '—'}</Text>
        </View>
      </Page>
    </Document>
  );
}
