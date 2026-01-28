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

// Brand colors matching the reference PDF
const BRAND_GOLD = '#C4A052';
const BRAND_DARK = '#1a1a1a';
const BRAND_GRAY = '#666666';
const BRAND_LIGHT_GRAY = '#f5f5f5';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    backgroundColor: '#fff',
  },
  // Header section
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 3,
    borderBottomColor: BRAND_GOLD,
  },
  logo: {
    width: 200,
    height: 50,
    objectFit: 'contain',
  },
  headerRight: {
    textAlign: 'right',
    alignItems: 'flex-end',
  },
  mainTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BRAND_DARK,
    marginBottom: 8,
  },
  dealInfo: {
    fontSize: 10,
    color: BRAND_GRAY,
    marginBottom: 2,
  },
  dealInfoBold: {
    fontSize: 10,
    fontWeight: 'bold',
    color: BRAND_DARK,
  },
  // Section styling
  section: {
    marginBottom: 15,
  },
  sectionHeader: {
    backgroundColor: BRAND_GOLD,
    padding: 6,
    paddingLeft: 10,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    paddingHorizontal: 4,
  },
  // Row styles
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 120,
    fontSize: 9,
    color: BRAND_GRAY,
  },
  value: {
    flex: 1,
    fontSize: 9,
    fontWeight: 'bold',
    color: BRAND_DARK,
  },
  // Two column layout
  twoColumn: {
    flexDirection: 'row',
    gap: 20,
  },
  column: {
    flex: 1,
  },
  // Conditions
  conditionItem: {
    marginBottom: 4,
    fontSize: 9,
    color: BRAND_DARK,
  },
  // Party info block
  partyBlock: {
    marginBottom: 10,
  },
  partyTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: BRAND_DARK,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  partyRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  partyLabel: {
    width: 60,
    fontSize: 9,
    color: BRAND_GRAY,
  },
  partyValue: {
    flex: 1,
    fontSize: 9,
    color: BRAND_DARK,
  },
  // Agency section
  agencyRow: {
    marginBottom: 6,
  },
  agencyLabel: {
    fontSize: 9,
    color: BRAND_GRAY,
    marginBottom: 2,
  },
  agencyValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: BRAND_DARK,
  },
  // Commission tables
  commissionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 15,
  },
  commissionBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 2,
  },
  commissionHeader: {
    backgroundColor: BRAND_GOLD,
    padding: 6,
  },
  commissionHeaderText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  commissionBody: {
    padding: 8,
  },
  commissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  commissionLabel: {
    fontSize: 9,
    color: BRAND_GRAY,
  },
  commissionValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: BRAND_DARK,
  },
  commissionTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 4,
    marginTop: 4,
  },
  commissionTotalLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: BRAND_DARK,
  },
  commissionTotalValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: BRAND_DARK,
  },
  // Notes section
  notesSection: {
    marginTop: 15,
    padding: 10,
    backgroundColor: BRAND_LIGHT_GRAY,
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: BRAND_DARK,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  notesText: {
    fontSize: 9,
    color: BRAND_DARK,
    lineHeight: 1.4,
  },
  // Calculation note
  calculationNote: {
    fontSize: 9,
    color: BRAND_GRAY,
    marginTop: 10,
    fontStyle: 'italic',
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

  const dealTypeLabel = deal.deal_type === 'Lease' ? 'LEASE' : 'SALE';
  const valueLabel = deal.deal_type === 'Lease' ? 'Lease Value:' : 'Sale Price:';
  const agentLabel = deal.deal_type === 'Lease' ? 'Leasing' : 'Selling';

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={clearviewLogo} style={styles.logo} />
          <View style={styles.headerRight}>
            <Text style={styles.mainTitle}>CLEARVIEW {dealTypeLabel} DEALSHEET</Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <Text style={styles.dealInfo}>Deal #:</Text>
              <Text style={styles.dealInfoBold}>{deal.deal_number || '_________'}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <Text style={styles.dealInfo}>Date:</Text>
              <Text style={styles.dealInfoBold}>{format(new Date(), 'MMMM d, yyyy')}</Text>
            </View>
          </View>
        </View>

        {/* Property / Deal Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Property / Deal Summary</Text>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.row}>
              <Text style={styles.label}>Property Address:</Text>
              <Text style={styles.value}>{deal.address}{deal.city ? `, ${deal.city}` : ''}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Closing Date:</Text>
              <Text style={styles.value}>{deal.close_date ? format(new Date(deal.close_date), 'MMMM d, yyyy') : ''}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{valueLabel}</Text>
              <Text style={styles.value}>{formatCurrency(dealValue)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Premises Size:</Text>
              <Text style={styles.value}>{deal.size_sf ? `${deal.size_sf.toLocaleString()} SF` : '—'}</Text>
            </View>
          </View>
        </View>

        {/* Key Conditions */}
        {conditions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Key Conditions & Removal Dates</Text>
            </View>
            <View style={styles.sectionContent}>
              {conditions.map((c, i) => (
                <Text key={c.id} style={styles.conditionItem}>
                  {i + 1}. {c.description} {c.due_date ? `– Removal by ${format(new Date(c.due_date), 'MMMM d, yyyy')}` : ''}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Seller & Buyer Information */}
        <View style={styles.twoColumn}>
          <View style={[styles.section, styles.column]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Seller Information</Text>
            </View>
            <View style={styles.sectionContent}>
              <View style={styles.partyRow}>
                <Text style={styles.partyLabel}>Name:</Text>
                <Text style={styles.partyValue}>{deal.seller_name || ''}</Text>
              </View>
              <View style={styles.partyRow}>
                <Text style={styles.partyLabel}>Address:</Text>
                <Text style={styles.partyValue}>{sellerBrokerage ? `c/o ${sellerBrokerage.name}` : ''}</Text>
              </View>
              {sellerBrokerage?.address && (
                <View style={styles.partyRow}>
                  <Text style={styles.partyLabel}></Text>
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

          <View style={[styles.section, styles.column]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Buyer Information</Text>
            </View>
            <View style={styles.sectionContent}>
              <View style={styles.partyRow}>
                <Text style={styles.partyLabel}>Name:</Text>
                <Text style={styles.partyValue}>{deal.buyer_name || ''}</Text>
              </View>
              <View style={styles.partyRow}>
                <Text style={styles.partyLabel}>Address:</Text>
                <Text style={styles.partyValue}>{buyerBrokerage ? `c/o ${buyerBrokerage.name}` : ''}</Text>
              </View>
              {buyerBrokerage?.address && (
                <View style={styles.partyRow}>
                  <Text style={styles.partyLabel}></Text>
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
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Agency & Commission Summary</Text>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.twoColumn}>
              <View style={styles.column}>
                <View style={styles.agencyRow}>
                  <Text style={styles.agencyLabel}>Listing Agent(s) / Brokerage:</Text>
                  {listingAgent1 && (
                    <Text style={styles.agencyValue}>{listingAgent1.name} / {listingBrokerage?.name || ''}</Text>
                  )}
                  {listingAgent2 && (
                    <Text style={styles.agencyValue}>{listingAgent2.name} / {listingBrokerage?.name || ''}</Text>
                  )}
                </View>
              </View>
              <View style={styles.column}>
                <View style={styles.agencyRow}>
                  <Text style={styles.agencyLabel}>{agentLabel} Agent(s) / Brokerage:</Text>
                  {sellingAgent1 && (
                    <Text style={styles.agencyValue}>{sellingAgent1.name} / {sellingBrokerage?.name || ''}</Text>
                  )}
                  {sellingAgent2 && (
                    <Text style={styles.agencyValue}>{sellingAgent2.name} / {sellingBrokerage?.name || ''}</Text>
                  )}
                </View>
              </View>
            </View>
            <Text style={styles.calculationNote}>
              Commission Calculation Notes: {formatCurrency(dealValue)} x {commissionRate}%
            </Text>
          </View>
        </View>

        {/* Commission Breakdown */}
        <View style={styles.commissionContainer}>
          {/* Total Commission */}
          <View style={styles.commissionBox}>
            <View style={styles.commissionHeader}>
              <Text style={styles.commissionHeaderText}>Total Commission</Text>
            </View>
            <View style={styles.commissionBody}>
              <View style={styles.commissionRow}>
                <Text style={styles.commissionLabel}>Commission (excl. GST):</Text>
                <Text style={styles.commissionValue}>{formatCurrency(totalCommission)}</Text>
              </View>
              <View style={styles.commissionRow}>
                <Text style={styles.commissionLabel}>GST on Commission:</Text>
                <Text style={styles.commissionValue}>{formatCurrency(totalGST)}</Text>
              </View>
              <View style={styles.commissionTotal}>
                <Text style={styles.commissionTotalLabel}>Total Commission (incl. GST):</Text>
                <Text style={styles.commissionTotalValue}>{formatCurrency(totalWithGST)}</Text>
              </View>
            </View>
          </View>

          {/* Other Brokerage Portion */}
          <View style={styles.commissionBox}>
            <View style={styles.commissionHeader}>
              <Text style={styles.commissionHeaderText}>Other Brokerage - {otherRate}%</Text>
            </View>
            <View style={styles.commissionBody}>
              <View style={styles.commissionRow}>
                <Text style={styles.commissionLabel}>Commission (excl. GST):</Text>
                <Text style={styles.commissionValue}>{formatCurrency(otherCommission)}</Text>
              </View>
              <View style={styles.commissionRow}>
                <Text style={styles.commissionLabel}>GST:</Text>
                <Text style={styles.commissionValue}>{formatCurrency(otherGST)}</Text>
              </View>
              <View style={styles.commissionTotal}>
                <Text style={styles.commissionTotalLabel}>Total:</Text>
                <Text style={styles.commissionTotalValue}>{formatCurrency(otherTotal)}</Text>
              </View>
            </View>
          </View>

          {/* Clearview Portion */}
          <View style={styles.commissionBox}>
            <View style={styles.commissionHeader}>
              <Text style={styles.commissionHeaderText}>Clearview - {cvRate}%</Text>
            </View>
            <View style={styles.commissionBody}>
              <View style={styles.commissionRow}>
                <Text style={styles.commissionLabel}>Commission (excl. GST):</Text>
                <Text style={styles.commissionValue}>{formatCurrency(cvCommission)}</Text>
              </View>
              <View style={styles.commissionRow}>
                <Text style={styles.commissionLabel}>GST:</Text>
                <Text style={styles.commissionValue}>{formatCurrency(cvGST)}</Text>
              </View>
              <View style={styles.commissionTotal}>
                <Text style={styles.commissionTotalLabel}>Total:</Text>
                <Text style={styles.commissionTotalValue}>{formatCurrency(cvTotal)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Comments */}
        {deal.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Comments</Text>
            <Text style={styles.notesText}>{deal.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
