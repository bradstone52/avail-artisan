import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Deal } from '@/types/database';

interface DepositData {
  label: string;
  amount: number;
  payableTo: string;
  dueDate: string | null;
  dueTime: string | null;
}

interface ActionData {
  label: string;
  dueDate: string | null;
  dueTime: string | null;
  dateMet: string | null;
  actingParty: string;
  description: string;
}

interface FormData {
  vendor: string;
  purchaser: string;
  propertyAddress: string;
  propertyDescription: string;
  effectiveDate: string | null;
  closingDate: string | null;
  purchasePrice: number;
  deposits: DepositData[];
  actions: ActionData[];
  totalDeposits: number;
  balanceOnClosing: number;
}

interface DealSummaryPDFProps {
  deal: Deal;
  formData?: FormData;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '50%',
    marginBottom: 10,
  },
  cellFull: {
    width: '100%',
    marginBottom: 10,
  },
  label: {
    fontSize: 8,
    color: '#666',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 10,
  },
  depositCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 8,
    borderRadius: 4,
  },
  depositHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  depositRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  depositCell: {
    width: '50%',
  },
  actionCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 8,
    borderRadius: 4,
  },
  actionHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    color: '#666',
  },
  summaryValue: {
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 30,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    fontSize: 8,
    color: '#999',
    textAlign: 'center',
  },
});

export function DealSummaryPDF({ deal, formData }: DealSummaryPDFProps) {
  const formatPdfCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Use formData if provided, otherwise fall back to deal data
  const vendor = formData?.vendor || 'Clearview Commercial Realty Inc.';
  const purchaser = formData?.purchaser || deal.buyer_name || '-';
  const propertyAddress = formData?.propertyAddress || deal.address;
  const propertyDescription = formData?.propertyDescription || (deal.size_sf ? `${deal.size_sf.toLocaleString()} SF` : '-');
  const effectiveDate = formData?.effectiveDate;
  const closingDate = formData?.closingDate || deal.close_date;
  const purchasePrice = formData?.purchasePrice || deal.deal_value || 0;
  const deposits = formData?.deposits || [];
  const actions = formData?.actions || [];
  const totalDeposits = formData?.totalDeposits || 0;
  const balanceOnClosing = formData?.balanceOnClosing || purchasePrice;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>DEAL SUMMARY</Text>
          <Text style={styles.subtitle}>{propertyAddress}</Text>
        </View>

        {/* Basic Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <View style={styles.grid}>
            <View style={styles.cell}>
              <Text style={styles.label}>Vendor</Text>
              <Text style={styles.value}>{vendor}</Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.label}>Purchaser</Text>
              <Text style={styles.value}>{purchaser}</Text>
            </View>
            <View style={styles.cellFull}>
              <Text style={styles.label}>Property Address</Text>
              <Text style={styles.value}>{propertyAddress}</Text>
            </View>
            <View style={styles.cellFull}>
              <Text style={styles.label}>Property Description</Text>
              <Text style={styles.value}>{propertyDescription}</Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.label}>Effective Date</Text>
              <Text style={styles.value}>{effectiveDate ? formatDate(effectiveDate) : '-'}</Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.label}>Closing Date</Text>
              <Text style={styles.value}>{closingDate ? formatDate(closingDate) : '-'}</Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.label}>Purchase Price</Text>
              <Text style={styles.value}>{formatPdfCurrency(purchasePrice)}</Text>
            </View>
          </View>
        </View>

        {/* Deposits Section */}
        {deposits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Deposits</Text>
            {deposits.map((deposit, index) => (
              <View key={index} style={styles.depositCard}>
                <Text style={styles.depositHeader}>{deposit.label}</Text>
                <View style={styles.depositRow}>
                  <View style={styles.depositCell}>
                    <Text style={styles.label}>Amount</Text>
                    <Text style={styles.value}>{formatPdfCurrency(deposit.amount)}</Text>
                  </View>
                  <View style={styles.depositCell}>
                    <Text style={styles.label}>Payable To</Text>
                    <Text style={styles.value}>{deposit.payableTo || '-'}</Text>
                  </View>
                </View>
                <View style={styles.depositRow}>
                  <View style={styles.depositCell}>
                    <Text style={styles.label}>Due Date</Text>
                    <Text style={styles.value}>{deposit.dueDate ? formatDate(deposit.dueDate) : '-'}</Text>
                  </View>
                  <View style={styles.depositCell}>
                    <Text style={styles.label}>Due Time</Text>
                    <Text style={styles.value}>{deposit.dueTime || '-'}</Text>
                  </View>
                </View>
              </View>
            ))}

            {/* Summary */}
            <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' }}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Deposits:</Text>
                <Text style={styles.summaryValue}>{formatPdfCurrency(totalDeposits)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Purchase Price:</Text>
                <Text style={styles.summaryValue}>{formatPdfCurrency(purchasePrice)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Balance on Closing:</Text>
                <Text style={styles.summaryValue}>{formatPdfCurrency(balanceOnClosing)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Actions Section */}
        {actions.length > 0 && actions.some(a => a.description || a.dueDate) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions & Milestones</Text>
            {actions.filter(a => a.description || a.dueDate).map((action, index) => (
              <View key={index} style={styles.actionCard}>
                <Text style={styles.actionHeader}>{action.label}</Text>
                <View style={styles.depositRow}>
                  <View style={styles.depositCell}>
                    <Text style={styles.label}>Due Date</Text>
                    <Text style={styles.value}>
                      {action.dueDate ? formatDate(action.dueDate) : '-'}
                      {action.dueTime ? ` at ${action.dueTime}` : ''}
                    </Text>
                  </View>
                  <View style={styles.depositCell}>
                    <Text style={styles.label}>Date Met</Text>
                    <Text style={styles.value}>{action.dateMet ? formatDate(action.dateMet) : '-'}</Text>
                  </View>
                </View>
                <View style={styles.depositRow}>
                  <View style={styles.depositCell}>
                    <Text style={styles.label}>Acting Party</Text>
                    <Text style={styles.value}>{action.actingParty || '-'}</Text>
                  </View>
                </View>
                {action.description && (
                  <View style={{ marginTop: 4 }}>
                    <Text style={styles.label}>Description</Text>
                    <Text style={styles.value}>{action.description}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Generated on {formatDate(new Date().toISOString())}</Text>
        </View>
      </Page>
    </Document>
  );
}
