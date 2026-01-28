import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { formatCurrency } from '@/lib/format';
import { format } from 'date-fns';
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

// Color palette matching reference PDF
const BLUE_HEADER = '#B4C7DC';
const YELLOW_BG = '#FFF9E6';
const GREEN_BG = '#D5E8D4';
const PINK_BG = '#FFE6E6';
const YELLOW_NOTES = '#FFFACD';
const BLACK = '#000000';
const DARK_TEXT = '#1a1a1a';
const GRAY_TEXT = '#666666';
const WHITE = '#FFFFFF';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 9,
    backgroundColor: WHITE,
  },
  // Header section
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
    paddingBottom: 10,
  },
  logo: {
    width: 180,
    height: 45,
    objectFit: 'contain',
  },
  headerRight: {
    textAlign: 'right',
    alignItems: 'flex-end',
  },
  mainTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: DARK_TEXT,
    marginBottom: 6,
  },
  dealInfo: {
    fontSize: 9,
    color: GRAY_TEXT,
    marginBottom: 2,
  },
  dealInfoBold: {
    fontSize: 9,
    fontWeight: 'bold',
    color: DARK_TEXT,
  },
  // Section styling with blue header
  sectionHeader: {
    backgroundColor: BLUE_HEADER,
    padding: 5,
    paddingLeft: 8,
    borderWidth: 1,
    borderColor: BLACK,
    borderBottomWidth: 0,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: DARK_TEXT,
    textTransform: 'uppercase',
  },
  // Property Summary Table
  summaryTable: {
    borderWidth: 1,
    borderColor: BLACK,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
  },
  summaryRowLast: {
    flexDirection: 'row',
  },
  summaryCell: {
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: BLACK,
  },
  summaryCellLast: {
    padding: 6,
  },
  summaryLabel: {
    fontSize: 8,
    color: GRAY_TEXT,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: DARK_TEXT,
  },
  // Two column layout
  twoColumn: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  column: {
    flex: 1,
  },
  // Party sections with yellow background
  partySection: {
    flex: 1,
    borderWidth: 1,
    borderColor: BLACK,
  },
  partyHeader: {
    backgroundColor: BLUE_HEADER,
    padding: 5,
    paddingLeft: 8,
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
  },
  partyBody: {
    backgroundColor: YELLOW_BG,
    padding: 8,
  },
  partyRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  partyLabel: {
    width: 50,
    fontSize: 8,
    color: GRAY_TEXT,
  },
  partyValue: {
    flex: 1,
    fontSize: 9,
    color: DARK_TEXT,
  },
  // Agency section
  agencySection: {
    borderWidth: 1,
    borderColor: BLACK,
    marginBottom: 10,
  },
  agencyBody: {
    flexDirection: 'row',
    backgroundColor: WHITE,
  },
  agencyColumn: {
    flex: 1,
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: BLACK,
  },
  agencyColumnLast: {
    flex: 1,
    padding: 8,
  },
  agencyLabel: {
    fontSize: 8,
    color: GRAY_TEXT,
    marginBottom: 3,
  },
  agencyValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: DARK_TEXT,
    marginBottom: 2,
  },
  // Calculation notes strip
  calculationNotes: {
    backgroundColor: YELLOW_NOTES,
    padding: 6,
    borderWidth: 1,
    borderColor: BLACK,
    marginBottom: 10,
  },
  calculationText: {
    fontSize: 8,
    color: DARK_TEXT,
  },
  // Commission and Financial section
  commissionFinancialRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  commissionSection: {
    flex: 1,
    borderWidth: 1,
    borderColor: BLACK,
    marginRight: 5,
  },
  financialSection: {
    flex: 1,
    borderWidth: 1,
    borderColor: BLACK,
    marginLeft: 5,
  },
  greenHeader: {
    backgroundColor: BLUE_HEADER,
    padding: 5,
    paddingLeft: 8,
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
  },
  greenBody: {
    backgroundColor: GREEN_BG,
    padding: 8,
  },
  commissionBlock: {
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
  },
  commissionBlockLast: {
    marginBottom: 0,
  },
  commissionTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: DARK_TEXT,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  commissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  commissionLabel: {
    fontSize: 8,
    color: GRAY_TEXT,
  },
  commissionValue: {
    fontSize: 8,
    fontWeight: 'bold',
    color: DARK_TEXT,
  },
  commissionTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: BLACK,
    paddingTop: 3,
    marginTop: 3,
  },
  // Deposit rows
  depositItem: {
    marginBottom: 8,
  },
  depositLabel: {
    fontSize: 8,
    color: GRAY_TEXT,
  },
  depositValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: DARK_TEXT,
  },
  depositHeldBy: {
    fontSize: 8,
    color: GRAY_TEXT,
    marginLeft: 10,
  },
  // Comments section
  commentsSection: {
    backgroundColor: PINK_BG,
    padding: 10,
    borderWidth: 1,
    borderColor: BLACK,
  },
  commentsHeader: {
    backgroundColor: BLUE_HEADER,
    padding: 5,
    paddingLeft: 8,
    borderWidth: 1,
    borderColor: BLACK,
    borderBottomWidth: 0,
  },
  commentsBody: {
    backgroundColor: PINK_BG,
    padding: 10,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: BLACK,
  },
  commentsText: {
    fontSize: 9,
    color: DARK_TEXT,
    lineHeight: 1.4,
  },
  // Conditions in summary
  conditionItem: {
    fontSize: 8,
    color: DARK_TEXT,
    marginBottom: 2,
  },
});

export function DealSheetPDF({ deal, conditions, deposits, getAgent, getBrokerage }: DealSheetPDFProps) {
  // Calculate commissions
  const dealValue = deal.deal_value || 0;
  const commissionRate = deal.commission_percent || 3;
  const otherRate = deal.other_brokerage_percent || 1.5;
  const cvRate = deal.clearview_percent || 1.5;
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

  const valueLabel = deal.deal_type === 'Lease' ? 'Lease Value' : 'Sale Price';
  const agentLabel = deal.deal_type === 'Lease' ? 'Leasing' : 'Selling';

  // Get first 3 deposits
  const displayDeposits = deposits.slice(0, 3);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={clearviewLogo} style={styles.logo} />
          <View style={styles.headerRight}>
            <Text style={styles.mainTitle}>sale/lease dealsheet</Text>
          <View style={{ flexDirection: 'row' }}>
              <Text style={[styles.dealInfo, { marginRight: 4 }]}>Deal #:</Text>
              <Text style={styles.dealInfoBold}>{deal.deal_number || '_________'}</Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <Text style={[styles.dealInfo, { marginRight: 4 }]}>Date:</Text>
              <Text style={styles.dealInfoBold}>{format(new Date(), 'MMMM d, yyyy')}</Text>
            </View>
          </View>
        </View>

        {/* Property / Deal Summary */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Property / Deal Summary</Text>
        </View>
        <View style={styles.summaryTable}>
          {/* Row 1: Address, Closing, Price */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCell, { flex: 2 }]}>
              <Text style={styles.summaryLabel}>Property Address:</Text>
              <Text style={styles.summaryValue}>{deal.address}{deal.city ? `, ${deal.city}` : ''}</Text>
            </View>
            <View style={[styles.summaryCell, { flex: 1 }]}>
              <Text style={styles.summaryLabel}>Closing Date:</Text>
              <Text style={styles.summaryValue}>{deal.close_date ? format(new Date(deal.close_date), 'MMM d, yyyy') : '—'}</Text>
            </View>
            <View style={[styles.summaryCellLast, { flex: 1 }]}>
              <Text style={styles.summaryLabel}>{valueLabel}:</Text>
              <Text style={styles.summaryValue}>{formatCurrency(dealValue)}</Text>
            </View>
          </View>
          {/* Row 2: Size, Conditions */}
          <View style={styles.summaryRowLast}>
            <View style={[styles.summaryCell, { flex: 1 }]}>
              <Text style={styles.summaryLabel}>Premises Size:</Text>
              <Text style={styles.summaryValue}>{deal.size_sf ? `${deal.size_sf.toLocaleString()} SF` : '—'}</Text>
            </View>
            <View style={[styles.summaryCellLast, { flex: 3 }]}>
              <Text style={styles.summaryLabel}>Key Conditions & Removal Dates:</Text>
              {conditions.length > 0 ? (
                conditions.map((c, i) => (
                  <Text key={c.id} style={styles.conditionItem}>
                    {i + 1}. {c.description} {c.due_date ? `– ${format(new Date(c.due_date), 'MMM d, yyyy')}` : ''}
                  </Text>
                ))
              ) : (
                <Text style={styles.conditionItem}>—</Text>
              )}
            </View>
          </View>
        </View>

        {/* Seller & Buyer Information */}
        <View style={styles.twoColumn}>
          {/* Seller */}
          <View style={[styles.partySection, { marginRight: 5 }]}>
            <View style={styles.partyHeader}>
              <Text style={styles.sectionTitle}>Seller Information</Text>
            </View>
            <View style={styles.partyBody}>
              <View style={styles.partyRow}>
                <Text style={styles.partyLabel}>Name:</Text>
                <Text style={styles.partyValue}>{deal.seller_name || '—'}</Text>
              </View>
              <View style={styles.partyRow}>
                <Text style={styles.partyLabel}>Address:</Text>
                <Text style={styles.partyValue}>{sellerBrokerage ? `c/o ${sellerBrokerage.name}` : '—'}</Text>
              </View>
              {sellerBrokerage?.address && (
                <View style={styles.partyRow}>
                  <Text style={styles.partyLabel}>{' '}</Text>
                  <Text style={styles.partyValue}>{sellerBrokerage.address}</Text>
                </View>
              )}
              {listingAgent1 && (
                <>
                  <View style={styles.partyRow}>
                    <Text style={styles.partyLabel}>Contact:</Text>
                    <Text style={styles.partyValue}>{listingAgent1.name}</Text>
                  </View>
                  {listingAgent1.phone && (
                    <View style={styles.partyRow}>
                      <Text style={styles.partyLabel}>Phone:</Text>
                      <Text style={styles.partyValue}>{listingAgent1.phone}</Text>
                    </View>
                  )}
                  {listingAgent1.email && (
                    <View style={styles.partyRow}>
                      <Text style={styles.partyLabel}>Email:</Text>
                      <Text style={styles.partyValue}>{listingAgent1.email}</Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>

          {/* Buyer */}
          <View style={[styles.partySection, { marginLeft: 5 }]}>
            <View style={styles.partyHeader}>
              <Text style={styles.sectionTitle}>Buyer Information</Text>
            </View>
            <View style={styles.partyBody}>
              <View style={styles.partyRow}>
                <Text style={styles.partyLabel}>Name:</Text>
                <Text style={styles.partyValue}>{deal.buyer_name || '—'}</Text>
              </View>
              <View style={styles.partyRow}>
                <Text style={styles.partyLabel}>Address:</Text>
                <Text style={styles.partyValue}>{buyerBrokerage ? `c/o ${buyerBrokerage.name}` : '—'}</Text>
              </View>
              {buyerBrokerage?.address && (
                <View style={styles.partyRow}>
                  <Text style={styles.partyLabel}>{' '}</Text>
                  <Text style={styles.partyValue}>{buyerBrokerage.address}</Text>
                </View>
              )}
              {sellingAgent1 && (
                <>
                  <View style={styles.partyRow}>
                    <Text style={styles.partyLabel}>Contact:</Text>
                    <Text style={styles.partyValue}>{sellingAgent1.name}</Text>
                  </View>
                  {sellingAgent1.phone && (
                    <View style={styles.partyRow}>
                      <Text style={styles.partyLabel}>Phone:</Text>
                      <Text style={styles.partyValue}>{sellingAgent1.phone}</Text>
                    </View>
                  )}
                  {sellingAgent1.email && (
                    <View style={styles.partyRow}>
                      <Text style={styles.partyLabel}>Email:</Text>
                      <Text style={styles.partyValue}>{sellingAgent1.email}</Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        </View>

        {/* Agency & Commission Summary */}
        <View style={styles.agencySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Agency & Commission Summary</Text>
          </View>
          <View style={styles.agencyBody}>
            <View style={styles.agencyColumn}>
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
            <View style={styles.agencyColumnLast}>
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
        </View>

        {/* Commission Calculation Notes */}
        <View style={styles.calculationNotes}>
          <Text style={styles.calculationText}>
            Commission Calculation Notes: {formatCurrency(dealValue)} × {commissionRate}% = {formatCurrency(totalCommission)}
          </Text>
        </View>

        {/* Commission Breakdown & Financial/Trust Details */}
        <View style={styles.commissionFinancialRow}>
          {/* Commission Breakdown */}
          <View style={styles.commissionSection}>
            <View style={styles.greenHeader}>
              <Text style={styles.sectionTitle}>Commission Breakdown</Text>
            </View>
            <View style={styles.greenBody}>
              {/* Total Commission */}
              <View style={styles.commissionBlock}>
                <Text style={styles.commissionTitle}>Total Commission</Text>
                <View style={styles.commissionRow}>
                  <Text style={styles.commissionLabel}>Commission (excl. GST):</Text>
                  <Text style={styles.commissionValue}>{formatCurrency(totalCommission)}</Text>
                </View>
                <View style={styles.commissionRow}>
                  <Text style={styles.commissionLabel}>GST on Commission:</Text>
                  <Text style={styles.commissionValue}>{formatCurrency(totalGST)}</Text>
                </View>
                <View style={styles.commissionTotal}>
                  <Text style={styles.commissionLabel}>Total (incl. GST):</Text>
                  <Text style={styles.commissionValue}>{formatCurrency(totalWithGST)}</Text>
                </View>
              </View>

              {/* Other Brokerage */}
              <View style={styles.commissionBlock}>
                <Text style={styles.commissionTitle}>Other Brokerage – {otherRate}%</Text>
                <View style={styles.commissionRow}>
                  <Text style={styles.commissionLabel}>Commission (excl. GST):</Text>
                  <Text style={styles.commissionValue}>{formatCurrency(otherCommission)}</Text>
                </View>
                <View style={styles.commissionRow}>
                  <Text style={styles.commissionLabel}>GST:</Text>
                  <Text style={styles.commissionValue}>{formatCurrency(otherGST)}</Text>
                </View>
                <View style={styles.commissionTotal}>
                  <Text style={styles.commissionLabel}>Total:</Text>
                  <Text style={styles.commissionValue}>{formatCurrency(otherTotal)}</Text>
                </View>
              </View>

              {/* Clearview */}
              <View style={styles.commissionBlockLast}>
                <Text style={styles.commissionTitle}>Clearview – {cvRate}%</Text>
                <View style={styles.commissionRow}>
                  <Text style={styles.commissionLabel}>Commission (excl. GST):</Text>
                  <Text style={styles.commissionValue}>{formatCurrency(cvCommission)}</Text>
                </View>
                <View style={styles.commissionRow}>
                  <Text style={styles.commissionLabel}>GST:</Text>
                  <Text style={styles.commissionValue}>{formatCurrency(cvGST)}</Text>
                </View>
                <View style={styles.commissionTotal}>
                  <Text style={styles.commissionLabel}>Total:</Text>
                  <Text style={styles.commissionValue}>{formatCurrency(cvTotal)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Financial/Trust Details */}
          <View style={styles.financialSection}>
            <View style={styles.greenHeader}>
              <Text style={styles.sectionTitle}>Financial / Trust Details</Text>
            </View>
            <View style={styles.greenBody}>
              {displayDeposits.length > 0 ? (
                displayDeposits.map((deposit, index) => (
                  <View key={deposit.id} style={styles.depositItem}>
                    <Text style={styles.depositLabel}>{index === 0 ? '1st' : index === 1 ? '2nd' : '3rd'} Deposit Received:</Text>
                    <Text style={styles.depositValue}>{formatCurrency(deposit.amount)}</Text>
                    <Text style={styles.depositHeldBy}>Held By: {deposit.held_by || '—'}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.depositItem}>
                  <Text style={styles.depositLabel}>No deposits recorded</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Comments */}
        {deal.notes && (
          <>
            <View style={styles.commentsHeader}>
              <Text style={styles.sectionTitle}>Comments</Text>
            </View>
            <View style={styles.commentsBody}>
              <Text style={styles.commentsText}>{deal.notes}</Text>
            </View>
          </>
        )}
      </Page>
    </Document>
  );
}
