import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Deal, DealDeposit } from '@/types/database';

interface DealSummaryPDFProps {
  deal: Deal;
  deposits?: DealDeposit[];
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  address: {
    fontSize: 14,
    color: '#666',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 20,
  },
  cell: {
    width: '50%',
    marginBottom: 15,
  },
  label: {
    fontSize: 9,
    color: '#666',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 12,
  },
  section: {
    marginTop: 20,
    paddingTop: 15,
    borderTop: '1px solid #ddd',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  depositRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  depositLabel: {
    fontSize: 10,
  },
  depositStatus: {
    fontSize: 10,
    color: '#666',
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTop: '1px solid #ddd',
    fontSize: 9,
    color: '#999',
    textAlign: 'center',
  },
});

export function DealSummaryPDF({ deal, deposits = [] }: DealSummaryPDFProps) {
  const formatDepositAmount = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Deal Summary</Text>
          <Text style={styles.address}>{deal.address}</Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.cell}>
            <Text style={styles.label}>Deal Type</Text>
            <Text style={styles.value}>{deal.deal_type}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{deal.status}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.label}>Deal Value</Text>
            <Text style={styles.value}>{formatCurrency(deal.deal_value)}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.label}>Commission</Text>
            <Text style={styles.value}>
              {deal.commission_percent ? `${deal.commission_percent}%` : '-'}
            </Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.label}>Close Date</Text>
            <Text style={styles.value}>{formatDate(deal.close_date)}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.label}>City</Text>
            <Text style={styles.value}>{deal.city || '-'}</Text>
          </View>
        </View>

        {deposits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Deposits</Text>
            {deposits.map((deposit, index) => (
              <View key={deposit.id} style={styles.depositRow}>
                <Text style={styles.depositLabel}>
                  Deposit {index + 1}: {formatDepositAmount(deposit.amount)}
                  {deposit.due_date ? ` (Due: ${formatDate(deposit.due_date)})` : ''}
                </Text>
                <Text style={styles.depositStatus}>
                  {deposit.received ? 'Received' : 'Pending'}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Text>Generated on {formatDate(new Date().toISOString())}</Text>
        </View>
      </Page>
    </Document>
  );
}
