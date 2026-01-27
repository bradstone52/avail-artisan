import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Deal } from '@/types/database';

interface DealSheetPDFProps {
  deal: Deal;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2px solid #333',
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    borderBottom: '1px solid #ddd',
    paddingBottom: 5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: 150,
    fontSize: 10,
    color: '#666',
  },
  value: {
    flex: 1,
    fontSize: 10,
  },
  notes: {
    fontSize: 10,
    lineHeight: 1.5,
    color: '#333',
  },
});

export function DealSheetPDF({ deal }: DealSheetPDFProps) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Deal Sheet</Text>
          <Text style={styles.subtitle}>
            {deal.deal_number ? `#${deal.deal_number} - ` : ''}{deal.address}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deal Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{deal.address}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>City:</Text>
            <Text style={styles.value}>{deal.city || '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Submarket:</Text>
            <Text style={styles.value}>{deal.submarket || '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Deal Type:</Text>
            <Text style={styles.value}>{deal.deal_type}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{deal.status}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Deal Value:</Text>
            <Text style={styles.value}>{formatCurrency(deal.deal_value)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Commission:</Text>
            <Text style={styles.value}>
              {deal.commission_percent ? `${deal.commission_percent}%` : '-'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Close Date:</Text>
            <Text style={styles.value}>{formatDate(deal.close_date)}</Text>
          </View>
        </View>

        {deal.deposit_amount && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Deposit Information</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Amount:</Text>
              <Text style={styles.value}>{formatCurrency(deal.deposit_amount)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Due Date:</Text>
              <Text style={styles.value}>{formatDate(deal.deposit_due_date)}</Text>
            </View>
          </View>
        )}

        {deal.conditions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conditions</Text>
            <Text style={styles.notes}>{deal.conditions}</Text>
          </View>
        )}

        {deal.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notes}>{deal.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
