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

// Brand colors matching the logo
const BRAND_GOLD = '#E4A815';
const BRAND_DARK = '#1a1a1a';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: BRAND_GOLD,
  },
  logo: {
    width: 180,
    height: 45,
    objectFit: 'contain',
  },
  headerRight: {
    textAlign: 'right',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: BRAND_DARK,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 9,
    color: '#666',
  },
  section: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#fafafa',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 8,
    color: BRAND_DARK,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_GOLD,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  label: {
    width: 120,
    color: '#666',
    fontSize: 9,
  },
  value: {
    flex: 1,
    fontSize: 9,
    fontWeight: 'bold',
    color: BRAND_DARK,
  },
  twoColumn: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
  },
  conditionItem: {
    marginBottom: 5,
    fontSize: 9,
    color: BRAND_DARK,
  },
  commissionBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  commissionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
    color: BRAND_DARK,
  },
  commissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  commissionLabel: {
    fontSize: 9,
    color: '#666',
  },
  commissionValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: BRAND_DARK,
  },
  threeColumn: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  commissionColumn: {
    flex: 1,
    padding: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 4,
  },
  commissionColumnHeader: {
    backgroundColor: BRAND_GOLD,
    color: '#fff',
    padding: 6,
    marginBottom: 8,
    marginTop: -8,
    marginLeft: -8,
    marginRight: -8,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  footer: {
    marginTop: 15,
  },
  notes: {
    fontSize: 9,
    color: '#333',
    lineHeight: 1.4,
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

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={clearviewLogo} style={styles.logo} />
          <View style={styles.headerRight}>
            <Text style={styles.title}>CLEARVIEW {deal.deal_type.toUpperCase()} DEALSHEET</Text>
            <Text style={styles.subtitle}>
              Deal #: {deal.deal_number || '_________'}
            </Text>
            <Text style={styles.subtitle}>
              Date: {format(new Date(), 'MMMM d, yyyy')}
            </Text>
          </View>
        </View>

        {/* Property / Deal Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PROPERTY / DEAL SUMMARY</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Property Address:</Text>
            <Text style={styles.value}>{deal.address}, {deal.city}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Closing Date:</Text>
            <Text style={styles.value}>{deal.close_date ? format(new Date(deal.close_date), 'MMMM d, yyyy') : ''}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{deal.deal_type === 'Lease' ? 'Lease Value:' : 'Sale Price:'}</Text>
            <Text style={styles.value}>{formatCurrency(dealValue)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Premises Size:</Text>
            <Text style={styles.value}>{deal.size_sf?.toLocaleString() || '—'} SF</Text>
          </View>
        </View>

        {/* Key Conditions */}
        {conditions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>KEY CONDITIONS & REMOVAL DATES</Text>
            {conditions.map((c, i) => (
              <Text key={c.id} style={styles.conditionItem}>
                {i + 1}. {c.description} {c.due_date ? `– Removal by ${format(new Date(c.due_date), 'MMMM d, yyyy')}` : ''}
              </Text>
            ))}
          </View>
        )}

        {/* Two Column: Seller / Buyer */}
        <View style={styles.twoColumn}>
          <View style={[styles.section, styles.column]}>
            <Text style={styles.sectionTitle}>SELLER INFORMATION</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{deal.seller_name || ''}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.value}>{sellerBrokerage ? `c/o ${sellerBrokerage.name}` : ''}</Text>
            </View>
          </View>
          <View style={[styles.section, styles.column]}>
            <Text style={styles.sectionTitle}>BUYER INFORMATION</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{deal.buyer_name || ''}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.value}>{buyerBrokerage ? `c/o ${buyerBrokerage.name}` : ''}</Text>
            </View>
          </View>
        </View>

        {/* Agency & Commission Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AGENCY & COMMISSION SUMMARY</Text>
          <View style={styles.twoColumn}>
            <View style={styles.column}>
              <View style={styles.row}>
                <Text style={styles.label}>Listing Agent(s) / Brokerage:</Text>
              </View>
              {listingAgent1 && (
                <Text style={styles.value}>{listingAgent1.name} / {listingBrokerage?.name || ''}</Text>
              )}
              {listingAgent2 && (
                <Text style={styles.value}>{listingAgent2.name} / {listingBrokerage?.name || ''}</Text>
              )}
            </View>
            <View style={styles.column}>
              <View style={styles.row}>
                <Text style={styles.label}>{deal.deal_type === 'Lease' ? 'Leasing' : 'Selling'} Agent(s) / Brokerage:</Text>
              </View>
              {sellingAgent1 && (
                <Text style={styles.value}>{sellingAgent1.name} / {sellingBrokerage?.name || ''}</Text>
              )}
              {sellingAgent2 && (
                <Text style={styles.value}>{sellingAgent2.name} / {sellingBrokerage?.name || ''}</Text>
              )}
            </View>
          </View>
          <Text style={[styles.subtitle, { marginTop: 10 }]}>
            Commission Calculation Notes: {formatCurrency(dealValue)} x {commissionRate}%
          </Text>
        </View>

        {/* Commission Breakdown */}
        <View style={styles.threeColumn}>
          <View style={styles.commissionColumn}>
            <Text style={styles.commissionTitle}>TOTAL COMMISSION</Text>
            <View style={styles.commissionRow}>
              <Text style={styles.commissionLabel}>Commission (excl. GST):</Text>
              <Text style={styles.commissionValue}>{formatCurrency(totalCommission)}</Text>
            </View>
            <View style={styles.commissionRow}>
              <Text style={styles.commissionLabel}>GST on Commission:</Text>
              <Text style={styles.commissionValue}>{formatCurrency(totalGST)}</Text>
            </View>
            <View style={[styles.commissionRow, { borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 3, marginTop: 3 }]}>
              <Text style={[styles.commissionLabel, { fontWeight: 'bold' }]}>Total (incl. GST):</Text>
              <Text style={styles.commissionValue}>{formatCurrency(totalWithGST)}</Text>
            </View>
          </View>

          <View style={styles.commissionColumn}>
            <Text style={styles.commissionTitle}>OTHER BROKERAGE - {otherRate}%</Text>
            <View style={styles.commissionRow}>
              <Text style={styles.commissionLabel}>Commission (excl. GST):</Text>
              <Text style={styles.commissionValue}>{formatCurrency(otherCommission)}</Text>
            </View>
            <View style={styles.commissionRow}>
              <Text style={styles.commissionLabel}>GST:</Text>
              <Text style={styles.commissionValue}>{formatCurrency(otherGST)}</Text>
            </View>
            <View style={[styles.commissionRow, { borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 3, marginTop: 3 }]}>
              <Text style={[styles.commissionLabel, { fontWeight: 'bold' }]}>Total:</Text>
              <Text style={styles.commissionValue}>{formatCurrency(otherTotal)}</Text>
            </View>
          </View>

          <View style={styles.commissionColumn}>
            <Text style={styles.commissionTitle}>CLEARVIEW - {cvRate}%</Text>
            <View style={styles.commissionRow}>
              <Text style={styles.commissionLabel}>Commission (excl. GST):</Text>
              <Text style={styles.commissionValue}>{formatCurrency(cvCommission)}</Text>
            </View>
            <View style={styles.commissionRow}>
              <Text style={styles.commissionLabel}>GST:</Text>
              <Text style={styles.commissionValue}>{formatCurrency(cvGST)}</Text>
            </View>
            <View style={[styles.commissionRow, { borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 3, marginTop: 3 }]}>
              <Text style={[styles.commissionLabel, { fontWeight: 'bold' }]}>Total:</Text>
              <Text style={styles.commissionValue}>{formatCurrency(cvTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Comments */}
        {deal.notes && (
          <View style={styles.footer}>
            <Text style={styles.sectionTitle}>COMMENTS</Text>
            <Text style={styles.notes}>{deal.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
