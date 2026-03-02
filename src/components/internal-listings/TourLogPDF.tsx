import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import type { InternalListingTour } from '@/hooks/useInternalListingTours';

const ORANGE = '#e8792b';
const GRAY_BG = '#f7f7f7';
const BORDER = '#e0e0e0';
const DARK = '#1a1a1a';
const MUTED = '#666666';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: DARK,
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 10,
    borderBottom: `2px solid ${ORANGE}`,
    marginBottom: 14,
  },
  logo: { width: 110, height: 'auto' },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: ORANGE },
  headerDate: { fontSize: 7, color: MUTED, marginTop: 2 },
  // Property banner
  banner: {
    backgroundColor: GRAY_BG,
    borderRadius: 3,
    padding: '8 10',
    marginBottom: 10,
    borderLeft: `3px solid ${ORANGE}`,
  },
  bannerAddress: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  bannerSub: { fontSize: 8, color: MUTED, marginTop: 2 },
  // Summary
  summary: { fontSize: 8, color: MUTED, marginBottom: 12 },
  // Table
  table: { width: '100%' },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: ORANGE,
    borderRadius: 2,
    paddingVertical: 5,
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  tableHeaderCell: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: '#ffffff',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottom: `1px solid ${BORDER}`,
  },
  tableRowAlt: { backgroundColor: GRAY_BG },
  tableCell: { fontSize: 8, color: DARK },
  tableCellMuted: { fontSize: 8, color: MUTED, fontStyle: 'italic' },
  // Column widths
  colDate: { width: '18%' },
  colParty: { width: '26%' },
  colAgent: { width: '26%' },
  colNotes: { width: '30%' },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: `1px solid ${BORDER}`,
    paddingTop: 5,
  },
  footerText: { fontSize: 7, color: MUTED },
});

interface TourLogPDFProps {
  tours: InternalListingTour[];
  listingAddress: string;
  listingNumber?: string | null;
  generatedAt: Date;
}

export function TourLogPDF({ tours, listingAddress, listingNumber, generatedAt }: TourLogPDFProps) {
  const sorted = [...tours].sort(
    (a, b) => new Date(a.tour_date).getTime() - new Date(b.tour_date).getTime()
  );

  const earliest = sorted.length > 0 ? new Date(sorted[0].tour_date) : null;
  const latest = sorted.length > 0 ? new Date(sorted[sorted.length - 1].tour_date) : null;

  const summaryText =
    tours.length === 0
      ? 'No tours logged for this listing.'
      : tours.length === 1
      ? `1 tour logged on ${format(earliest!, 'MMM d, yyyy')}.`
      : `${tours.length} tours logged between ${format(earliest!, 'MMM d, yyyy')} and ${format(latest!, 'MMM d, yyyy')}.`;

  // Display tours newest-first in the table
  const displayTours = [...tours].sort(
    (a, b) => new Date(b.tour_date).getTime() - new Date(a.tour_date).getTime()
  );

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image style={styles.logo} src="/src/assets/clearview-logo.png" />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Property Tour Log</Text>
            <Text style={styles.headerDate}>
              Generated {format(generatedAt, 'MMMM d, yyyy')}
            </Text>
          </View>
        </View>

        {/* Property Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerAddress}>{listingAddress}</Text>
          {listingNumber && (
            <Text style={styles.bannerSub}>Listing #{listingNumber}</Text>
          )}
        </View>

        {/* Summary */}
        <Text style={styles.summary}>{summaryText}</Text>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDate]}>Date & Time</Text>
            <Text style={[styles.tableHeaderCell, styles.colParty]}>Touring Party</Text>
            <Text style={[styles.tableHeaderCell, styles.colAgent]}>Showed By</Text>
            <Text style={[styles.tableHeaderCell, styles.colNotes]}>Notes</Text>
          </View>

          {displayTours.length === 0 && (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCellMuted, { width: '100%' }]}>No tours to display.</Text>
            </View>
          )}

          {displayTours.map((tour, i) => {
            const partyName = tour.touring_party_name || null;
            const partyCompany = tour.touring_party_company || null;
            const agentName = tour.touring_agent?.name || null;
            const brokerageName = tour.touring_agent?.brokerage?.name || null;

            return (
              <View
                key={tour.id}
                style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <View style={styles.colDate}>
                  <Text style={styles.tableCell}>
                    {format(new Date(tour.tour_date), 'MMM d, yyyy')}
                  </Text>
                  <Text style={[styles.tableCell, { color: MUTED }]}>
                    {format(new Date(tour.tour_date), 'h:mm a')}
                  </Text>
                </View>

                <View style={styles.colParty}>
                  {partyName || partyCompany ? (
                    <>
                      {partyName && <Text style={styles.tableCell}>{partyName}</Text>}
                      {partyCompany && (
                        <Text style={[styles.tableCell, { color: MUTED }]}>{partyCompany}</Text>
                      )}
                    </>
                  ) : (
                    <Text style={styles.tableCellMuted}>Not specified</Text>
                  )}
                </View>

                <View style={styles.colAgent}>
                  {agentName ? (
                    <>
                      <Text style={styles.tableCell}>{agentName}</Text>
                      {brokerageName && (
                        <Text style={[styles.tableCell, { color: MUTED }]}>{brokerageName}</Text>
                      )}
                    </>
                  ) : (
                    <Text style={styles.tableCellMuted}>Not specified</Text>
                  )}
                </View>

                <View style={styles.colNotes}>
                  {tour.notes ? (
                    <Text style={styles.tableCell}>{tour.notes}</Text>
                  ) : (
                    <Text style={styles.tableCellMuted}>—</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Clearview Commercial Real Estate</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
