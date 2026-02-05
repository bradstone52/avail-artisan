 import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
 import clearviewLogo from '@/assets/clearview-logo.png';
 
 export interface MarketingContent {
   headline: string;
   tagline: string;
   description: string;
   highlights: string[];
   broker_pitch: string;
 }
 
 interface ListingBrochurePDFProps {
   listing: {
     address: string;
     display_address?: string | null;
     city: string;
     submarket: string;
     deal_type: string;
     size_sf: number | null;
     warehouse_sf: number | null;
     office_sf: number | null;
     land_acres: number | null;
     clear_height_ft: number | null;
     dock_doors: number | null;
     drive_in_doors: number | null;
     asking_rent_psf: number | null;
     asking_sale_price: number | null;
     property_type: string | null;
     power: string | null;
     yard: string | null;
     zoning: string | null;
     loading_type: string | null;
     cam: number | null;
     op_costs: number | null;
     taxes: number | null;
     gross_rate: number | null;
     listing_number: string | null;
   };
   marketing: MarketingContent;
   includeConfidential?: boolean;
 }
 
 const colors = {
   primary: '#1a1a1a',
   secondary: '#666666',
   accent: '#2563eb',
   lightGray: '#f5f5f5',
   border: '#e5e5e5',
 };
 
 const styles = StyleSheet.create({
   page: {
     padding: 40,
     fontSize: 10,
     fontFamily: 'Helvetica',
     backgroundColor: '#ffffff',
   },
   header: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'flex-start',
     marginBottom: 20,
     paddingBottom: 15,
     borderBottomWidth: 2,
     borderBottomColor: colors.primary,
   },
   logo: {
     width: 160,
     height: 36,
     objectFit: 'contain',
   },
   listingInfo: {
     textAlign: 'right',
   },
   listingNumber: {
     fontSize: 9,
     color: colors.secondary,
     marginBottom: 2,
   },
   dealType: {
     fontSize: 11,
     fontWeight: 'bold',
     color: colors.accent,
     textTransform: 'uppercase',
   },
   heroSection: {
     marginBottom: 20,
   },
   headline: {
     fontSize: 22,
     fontWeight: 'bold',
     color: colors.primary,
     marginBottom: 6,
   },
   tagline: {
     fontSize: 12,
     color: colors.accent,
     marginBottom: 10,
   },
   addressLine: {
     fontSize: 14,
     color: colors.secondary,
   },
   twoColumn: {
     flexDirection: 'row',
     gap: 20,
   },
   mainColumn: {
     flex: 2,
   },
   sideColumn: {
     flex: 1,
   },
   section: {
     marginBottom: 15,
   },
   sectionTitle: {
     fontSize: 11,
     fontWeight: 'bold',
     color: colors.primary,
     marginBottom: 8,
     paddingBottom: 4,
     borderBottomWidth: 1,
     borderBottomColor: colors.border,
     textTransform: 'uppercase',
     letterSpacing: 0.5,
   },
   description: {
     fontSize: 10,
     lineHeight: 1.5,
     color: colors.primary,
     textAlign: 'justify',
   },
   highlightsBox: {
     backgroundColor: colors.lightGray,
     padding: 12,
     borderRadius: 4,
   },
   highlightItem: {
     flexDirection: 'row',
     marginBottom: 6,
   },
   bullet: {
     width: 6,
     height: 6,
     borderRadius: 3,
     backgroundColor: colors.accent,
     marginRight: 8,
     marginTop: 3,
   },
   highlightText: {
     flex: 1,
     fontSize: 9,
     color: colors.primary,
   },
   specsGrid: {
     backgroundColor: colors.lightGray,
     padding: 12,
   },
   specRow: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     paddingVertical: 4,
     borderBottomWidth: 1,
     borderBottomColor: colors.border,
   },
   specLabel: {
     fontSize: 9,
     color: colors.secondary,
   },
   specValue: {
     fontSize: 9,
     fontWeight: 'bold',
     color: colors.primary,
   },
   pricingBox: {
     backgroundColor: colors.accent,
     padding: 12,
     marginTop: 10,
   },
   pricingLabel: {
     fontSize: 9,
     color: '#ffffff',
     opacity: 0.8,
   },
   pricingValue: {
     fontSize: 16,
     fontWeight: 'bold',
     color: '#ffffff',
   },
   confidentialBox: {
     backgroundColor: '#fef3c7',
     padding: 12,
     marginTop: 15,
     borderLeftWidth: 3,
     borderLeftColor: '#f59e0b',
   },
   confidentialTitle: {
     fontSize: 9,
     fontWeight: 'bold',
     color: '#92400e',
     marginBottom: 4,
     textTransform: 'uppercase',
   },
   confidentialText: {
     fontSize: 9,
     color: '#78350f',
     lineHeight: 1.4,
   },
   footer: {
     position: 'absolute',
     bottom: 30,
     left: 40,
     right: 40,
     flexDirection: 'row',
     justifyContent: 'space-between',
     paddingTop: 10,
     borderTopWidth: 1,
     borderTopColor: colors.border,
   },
   footerText: {
     fontSize: 8,
     color: colors.secondary,
   },
   disclaimer: {
     fontSize: 7,
     color: colors.secondary,
     textAlign: 'center',
     maxWidth: '70%',
   },
 });
 
 const formatNumber = (value: number | null | undefined) => {
   if (value === null || value === undefined) return null;
   return new Intl.NumberFormat('en-CA').format(value);
 };
 
 const formatCurrency = (value: number | null | undefined) => {
   if (value === null || value === undefined) return null;
   return new Intl.NumberFormat('en-CA', {
     style: 'currency',
     currency: 'CAD',
     minimumFractionDigits: 2,
   }).format(value);
 };
 
 const formatRate = (value: number | null | undefined) => {
   if (value === null || value === undefined) return null;
   return `$${value.toFixed(2)}/SF`;
 };
 
 export function ListingBrochurePDF({ listing, marketing, includeConfidential = false }: ListingBrochurePDFProps) {
   const dealTypeLabel = listing.deal_type === 'sale' ? 'FOR SALE' :
                         listing.deal_type === 'lease' ? 'FOR LEASE' : 'FOR SALE/LEASE';
 
   // Build specs array
   const specs: { label: string; value: string }[] = [];
   if (listing.size_sf) specs.push({ label: 'Total Size', value: `${formatNumber(listing.size_sf)} SF` });
   if (listing.warehouse_sf) specs.push({ label: 'Warehouse', value: `${formatNumber(listing.warehouse_sf)} SF` });
   if (listing.office_sf) specs.push({ label: 'Office', value: `${formatNumber(listing.office_sf)} SF` });
   if (listing.land_acres) specs.push({ label: 'Land', value: `${listing.land_acres} Acres` });
   if (listing.clear_height_ft) specs.push({ label: 'Clear Height', value: `${listing.clear_height_ft}'` });
   if (listing.dock_doors) specs.push({ label: 'Dock Doors', value: String(listing.dock_doors) });
   if (listing.drive_in_doors) specs.push({ label: 'Drive-In Doors', value: String(listing.drive_in_doors) });
   if (listing.loading_type) specs.push({ label: 'Loading', value: listing.loading_type });
   if (listing.power) specs.push({ label: 'Power', value: listing.power });
   if (listing.yard) specs.push({ label: 'Yard', value: listing.yard });
   if (listing.zoning) specs.push({ label: 'Zoning', value: listing.zoning });
   if (listing.property_type) specs.push({ label: 'Type', value: listing.property_type });
 
   // Build financial specs
   const financials: { label: string; value: string }[] = [];
   if (listing.cam) financials.push({ label: 'CAM', value: formatRate(listing.cam) || '' });
   if (listing.op_costs) financials.push({ label: 'Op Costs', value: formatRate(listing.op_costs) || '' });
   if (listing.taxes) financials.push({ label: 'Taxes', value: formatRate(listing.taxes) || '' });
   if (listing.gross_rate) financials.push({ label: 'Gross Rate', value: formatRate(listing.gross_rate) || '' });
 
   return (
     <Document>
       <Page size="LETTER" style={styles.page}>
         {/* Header */}
         <View style={styles.header}>
           <Image src={clearviewLogo} style={styles.logo} />
           <View style={styles.listingInfo}>
             {listing.listing_number && (
               <Text style={styles.listingNumber}>{listing.listing_number}</Text>
             )}
             <Text style={styles.dealType}>{dealTypeLabel}</Text>
           </View>
         </View>
 
         {/* Hero Section */}
         <View style={styles.heroSection}>
           <Text style={styles.headline}>{marketing.headline}</Text>
           <Text style={styles.tagline}>{marketing.tagline}</Text>
           <Text style={styles.addressLine}>
             {listing.display_address || listing.address}, {listing.city} | {listing.submarket}
           </Text>
         </View>
 
         {/* Two Column Layout */}
         <View style={styles.twoColumn}>
           {/* Main Column - Description & Highlights */}
           <View style={styles.mainColumn}>
             <View style={styles.section}>
               <Text style={styles.sectionTitle}>Property Overview</Text>
               <Text style={styles.description}>{marketing.description}</Text>
             </View>
 
             <View style={styles.section}>
               <Text style={styles.sectionTitle}>Key Features</Text>
               <View style={styles.highlightsBox}>
                 {marketing.highlights.map((highlight, idx) => (
                   <View key={idx} style={styles.highlightItem}>
                     <View style={styles.bullet} />
                     <Text style={styles.highlightText}>{highlight}</Text>
                   </View>
                 ))}
               </View>
             </View>
           </View>
 
           {/* Side Column - Specs & Pricing */}
           <View style={styles.sideColumn}>
             <View style={styles.section}>
               <Text style={styles.sectionTitle}>Specifications</Text>
               <View style={styles.specsGrid}>
                 {specs.map((spec, idx) => (
                   <View key={idx} style={styles.specRow}>
                     <Text style={styles.specLabel}>{spec.label}</Text>
                     <Text style={styles.specValue}>{spec.value}</Text>
                   </View>
                 ))}
               </View>
 
               {/* Pricing */}
               {(listing.asking_rent_psf || listing.asking_sale_price) && (
                 <View style={styles.pricingBox}>
                   {listing.asking_rent_psf && listing.deal_type !== 'sale' && (
                     <>
                       <Text style={styles.pricingLabel}>Asking Rent</Text>
                       <Text style={styles.pricingValue}>{formatRate(listing.asking_rent_psf)}</Text>
                     </>
                   )}
                   {listing.asking_sale_price && listing.deal_type !== 'lease' && (
                     <>
                       <Text style={styles.pricingLabel}>Asking Price</Text>
                       <Text style={styles.pricingValue}>{formatCurrency(listing.asking_sale_price)}</Text>
                     </>
                   )}
                 </View>
               )}
             </View>
 
             {/* Financial Summary if lease */}
             {financials.length > 0 && listing.deal_type !== 'sale' && (
               <View style={styles.section}>
                 <Text style={styles.sectionTitle}>Additional Costs</Text>
                 <View style={styles.specsGrid}>
                   {financials.map((fin, idx) => (
                     <View key={idx} style={styles.specRow}>
                       <Text style={styles.specLabel}>{fin.label}</Text>
                       <Text style={styles.specValue}>{fin.value}</Text>
                     </View>
                   ))}
                 </View>
               </View>
             )}
           </View>
         </View>
 
         {/* Confidential Broker Pitch */}
         {includeConfidential && (
           <View style={styles.confidentialBox}>
             <Text style={styles.confidentialTitle}>Confidential - Broker Notes</Text>
             <Text style={styles.confidentialText}>{marketing.broker_pitch}</Text>
           </View>
         )}
 
         {/* Footer */}
         <View style={styles.footer}>
           <Text style={styles.footerText}>
             Generated {new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
           </Text>
           <Text style={styles.disclaimer}>
             Information believed accurate but not warranted. Subject to change without notice.
           </Text>
         </View>
       </Page>
     </Document>
   );
 }