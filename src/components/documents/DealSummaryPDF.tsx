import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Deal } from '@/types/database';

interface DealSummaryPDFProps {
  deal: Deal;
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
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTop: '1px solid #ddd',
    fontSize: 9,
    color: '#999',
    textAlign: 'center',
  },
});

export function DealSummaryPDF({ deal }: DealSummaryPDFProps) {
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

        <View style={styles.footer}>
          <Text>Generated on {formatDate(new Date().toISOString())}</Text>
        </View>
      </Page>
    </Document>
  );
}
