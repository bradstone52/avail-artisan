import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

// Import logo
import clearviewLogo from '@/assets/clearview-logo.png';

interface DealSummaryDeposit {
  amount: number;
  payable_to: string;
  due_date: string;
  due_time?: string;
}

interface DealSummaryAction {
  due_date: string;
  due_time?: string;
  date_met?: string;
  acting_party: string;
  action: string;
}

interface DealSummaryPDFProps {
  vendor: string;
  purchaser: string;
  propertyAddress: string;
  propertyDescription: string;
  effectiveDate?: string | null;
  deposits: DealSummaryDeposit[];
  purchasePrice: number;
  balanceOnClosing: number;
  closingDate?: string | null;
  actions: DealSummaryAction[];
  contacts: { name: string; email?: string; phone?: string }[];
  logoBase64?: string;
}

const styles = StyleSheet.create({
  // PAGE: Letter size, 40px padding, extra bottom padding for footer
  page: {
    padding: 40,
    paddingBottom: 100,
    fontSize: 10,
    fontFamily: 'Helvetica',
    position: 'relative',
  },

  // HEADER: Logo and title side by side, left aligned
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 200,
    height: 50,
    objectFit: 'contain',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },

  // MAIN TABLE: Two-column layout (35% label, 65% value)
  dealDetailsTable: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#000',
    borderStyle: 'solid',
  },
  dealRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
  },
  dealRowLast: {
    flexDirection: 'row',
  },
  labelCell: {
    width: '35%',
    padding: 6,
    backgroundColor: '#f5f5f5',
    borderRightWidth: 1,
    borderRightColor: '#000',
    borderRightStyle: 'solid',
    fontWeight: 'bold',
  },
  valueCell: {
    width: '65%',
    padding: 6,
  },

  // ACTIONS TABLE: Four columns
  actionsTable: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#000',
    borderStyle: 'solid',
    marginTop: 20,
  },
  actionsHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#e0e0e0',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
  },
  actionsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
  },
  actionsRowLast: {
    flexDirection: 'row',
  },
  actionsCellHeader: {
    padding: 6,
    fontWeight: 'bold',
    fontSize: 9,
    borderRightWidth: 1,
    borderRightColor: '#000',
    borderRightStyle: 'solid',
    textAlign: 'center',
  },
  actionsCell: {
    padding: 6,
    fontSize: 9,
    borderRightWidth: 1,
    borderRightColor: '#000',
    borderRightStyle: 'solid',
    textAlign: 'center',
  },
  actionsCellLast: {
    padding: 6,
    fontSize: 9,
    textAlign: 'center',
  },

  // Column widths for actions table
  dueDateCol: { width: '20%' },
  dateMetCol: { width: '20%' },
  actingPartyCol: { width: '20%' },
  actionCol: { width: '40%' },

  // FOOTER: Yellow/orange background, fixed to bottom
  contactsSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fbaf15',
    paddingTop: 15,
    paddingBottom: 15,
    paddingLeft: 40,
    paddingRight: 40,
  },
  contactsTable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contactColumn: {
    flex: 1,
  },
  contactName: {
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#ffffff',
    fontSize: 10,
  },
  contactDetail: {
    fontSize: 9,
    marginBottom: 1,
    color: '#ffffff',
  },
});

// Currency: CAD with 2 decimals
const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
  }).format(value);
};

// Date: "January 28, 2026" format
const formatDate = (date: string | null | undefined): string => {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '';
  }
};

// Get deposit label
const getDepositLabel = (index: number): string => {
  const labels = ['First Deposit', 'Second Deposit', 'Third Deposit'];
  return labels[index] || `Deposit ${index + 1}`;
};

export function DealSummaryPDF({
  vendor,
  purchaser,
  propertyAddress,
  propertyDescription,
  effectiveDate,
  deposits,
  purchasePrice,
  balanceOnClosing,
  closingDate,
  actions,
  contacts,
}: DealSummaryPDFProps) {
  // Filter out empty deposits
  const validDeposits = deposits.filter(d => d.amount > 0);
  // Filter out empty actions
  const validActions = actions.filter(a => a.action || a.due_date);
  
  // Count rows to determine which is last
  const baseRows = 8; // Vendor, Purchaser, Address, Description, Effective Date, Purchase Price, Balance, Closing Date
  const totalRows = baseRows + validDeposits.length;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* === HEADER === */}
        <View style={styles.header}>
          <Image src={clearviewLogo} style={styles.logo} />
          <Text style={styles.title}>Deal Summary</Text>
        </View>

        {/* === DEAL DETAILS TABLE === */}
        <View style={styles.dealDetailsTable}>
          {/* Row: Vendor */}
          <View style={styles.dealRow}>
            <Text style={styles.labelCell}>Vendor:</Text>
            <Text style={styles.valueCell}>{vendor || ' '}</Text>
          </View>

          {/* Row: Purchaser */}
          <View style={styles.dealRow}>
            <Text style={styles.labelCell}>Purchaser:</Text>
            <Text style={styles.valueCell}>{purchaser || ' '}</Text>
          </View>

          {/* Row: Property Address */}
          <View style={styles.dealRow}>
            <Text style={styles.labelCell}>Property Address:</Text>
            <Text style={styles.valueCell}>{propertyAddress || ' '}</Text>
          </View>

          {/* Row: Property Description */}
          <View style={styles.dealRow}>
            <Text style={styles.labelCell}>Property Description:</Text>
            <Text style={styles.valueCell}>{propertyDescription || ' '}</Text>
          </View>

          {/* Row: Effective Date */}
          <View style={styles.dealRow}>
            <Text style={styles.labelCell}>Effective Date:</Text>
            <Text style={styles.valueCell}>{effectiveDate ? formatDate(effectiveDate) : ' '}</Text>
          </View>

          {/* Dynamic Rows: Deposits - formatted as "Amount payable to Payee on Date by Time" */}
          {validDeposits.map((deposit, index) => (
            <View style={styles.dealRow} key={index}>
              <Text style={styles.labelCell}>{getDepositLabel(index)}:</Text>
              <Text style={styles.valueCell}>
                {formatCurrency(deposit.amount)}
                {deposit.payable_to ? ` payable to ${deposit.payable_to}` : ''}
                {deposit.due_date ? ` on ${formatDate(deposit.due_date)}` : ''}
                {deposit.due_time ? ` by ${deposit.due_time}` : ''}
              </Text>
            </View>
          ))}

          {/* Row: Purchase Price */}
          <View style={styles.dealRow}>
            <Text style={styles.labelCell}>Purchase Price:</Text>
            <Text style={styles.valueCell}>{formatCurrency(purchasePrice)}</Text>
          </View>

          {/* Row: Balance on Closing */}
          <View style={styles.dealRow}>
            <Text style={styles.labelCell}>Balance on Closing:</Text>
            <Text style={styles.valueCell}>{formatCurrency(balanceOnClosing)}</Text>
          </View>

          {/* Row: Closing Date (LAST ROW - no bottom border) */}
          <View style={styles.dealRowLast}>
            <Text style={styles.labelCell}>Closing Date:</Text>
            <Text style={styles.valueCell}>{closingDate ? formatDate(closingDate) : ' '}</Text>
          </View>
        </View>

        {/* === ACTIONS TABLE (only if actions exist) === */}
        {validActions.length > 0 && (
          <View style={styles.actionsTable}>
            {/* Header Row */}
            <View style={styles.actionsHeaderRow}>
              <Text style={[styles.actionsCellHeader, styles.dueDateCol]}>Due Date</Text>
              <Text style={[styles.actionsCellHeader, styles.dateMetCol]}>Date Met</Text>
              <Text style={[styles.actionsCellHeader, styles.actingPartyCol]}>Acting Party</Text>
              <Text style={[styles.actionsCellHeader, styles.actionCol, { borderRightWidth: 0 }]}>Action</Text>
            </View>

            {/* Data Rows */}
            {validActions.map((action, index) => (
              <View
                style={index === validActions.length - 1 ? styles.actionsRowLast : styles.actionsRow}
                key={index}
              >
                <Text style={[styles.actionsCell, styles.dueDateCol]}>
                  {formatDate(action.due_date)}
                  {action.due_time ? `, by ${action.due_time}` : ''}
                </Text>
                <Text style={[styles.actionsCell, styles.dateMetCol]}>
                  {action.date_met ? formatDate(action.date_met) : ' '}
                </Text>
                <Text style={[styles.actionsCell, styles.actingPartyCol]}>
                  {action.acting_party || ' '}
                </Text>
                <Text style={[styles.actionsCellLast, styles.actionCol]}>
                  {action.action || ' '}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* === FOOTER: Contact Information (fixed to bottom) === */}
        <View style={styles.contactsSection} fixed>
          <View style={styles.contactsTable}>
            <View style={styles.contactColumn}>
              <Text style={styles.contactName}>BRAD STONE</Text>
              <Text style={styles.contactDetail}>brad@cvpartners.ca</Text>
              <Text style={styles.contactDetail}>(403) 613-2898</Text>
            </View>
            <View style={styles.contactColumn}>
              <Text style={styles.contactName}>DOUG JOHANNSON</Text>
              <Text style={styles.contactDetail}>doug@cvpartners.ca</Text>
              <Text style={styles.contactDetail}>(403) 470-8875</Text>
            </View>
            <View style={styles.contactColumn}>
              <Text style={styles.contactName}>ANGEL PILOR</Text>
              <Text style={styles.contactDetail}>angel@cvpartners.ca</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
