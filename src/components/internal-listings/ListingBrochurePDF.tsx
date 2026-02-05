 import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
 import clearviewLogo from '@/assets/clearview-logo.png';
 
 export interface ListingPhoto {
   id: string;
   photo_url: string;
   caption: string | null;
 }
 
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
     latitude: number | null;
     longitude: number | null;
     photo_url: string | null;
   };
   marketing: MarketingContent;
   includeConfidential?: boolean;
   staticMapUrl?: string;
   additionalPhotos?: ListingPhoto[];
 }
 
 const colors = {
   primary: '#1a1a1a',
   secondary: '#666666',
   accent: '#3B82F6',
   lightGray: '#f5f5f5',
   border: '#e5e5e5',
   yellow: '#FBBF24',
 };
 
 const styles = StyleSheet.create({
   page: {
     padding: 32,
     fontSize: 10,
     fontFamily: 'Helvetica',
     backgroundColor: '#ffffff',
   },
   header: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'flex-start',
     marginBottom: 12,
     paddingBottom: 10,
     borderBottomWidth: 4,
     borderBottomColor: colors.primary,
   },
   logo: {
     width: 140,
     height: 32,
     objectFit: 'contain',
   },
   dealType: {
     fontSize: 13,
     fontWeight: 'bold',
     color: colors.primary,
     backgroundColor: colors.yellow,
     paddingVertical: 7,
     paddingHorizontal: 14,
     textTransform: 'uppercase',
     letterSpacing: 2,
     borderWidth: 3,
     borderColor: colors.primary,
   },
   heroImage: {
     width: '100%',
     height: 200,
     objectFit: 'cover',
     marginBottom: 10,
     borderWidth: 4,
     borderColor: colors.primary,
   },
   heroSection: {
     marginBottom: 10,
   },
   headline: {
     fontSize: 18,
     fontWeight: 'bold',
     color: colors.primary,
     marginBottom: 5,
     lineHeight: 1.2,
   },
   tagline: {
     fontSize: 10,
     color: colors.accent,
     marginBottom: 6,
     fontWeight: 'bold',
     lineHeight: 1.3,
   },
   addressLine: {
     fontSize: 10,
     color: colors.secondary,
     borderBottomWidth: 2,
     borderBottomColor: colors.primary,
     paddingBottom: 6,
   },
   twoColumn: {
     flexDirection: 'row',
     gap: 12,
     marginTop: 10,
   },
   mainColumn: {
     flex: 2,
   },
   sideColumn: {
     flex: 1,
     minWidth: 150,
   },
   section: {
     marginBottom: 10,
   },
   sectionTitle: {
     fontSize: 9,
     fontWeight: 'bold',
     color: colors.primary,
     marginBottom: 5,
     paddingBottom: 3,
     borderBottomWidth: 2,
     borderBottomColor: colors.primary,
     textTransform: 'uppercase',
     letterSpacing: 0.5,
   },
   description: {
     fontSize: 9,
     lineHeight: 1.4,
     color: colors.primary,
     textAlign: 'justify',
   },
   specsGrid: {
     backgroundColor: colors.lightGray,
     padding: 8,
     borderWidth: 3,
     borderColor: colors.primary,
   },
   specRow: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     paddingVertical: 2,
     borderBottomWidth: 1,
     borderBottomColor: colors.border,
   },
   specLabel: {
     fontSize: 8,
     color: colors.secondary,
   },
   specValue: {
     fontSize: 8,
     fontWeight: 'bold',
     color: colors.primary,
   },
   pricingBox: {
     backgroundColor: colors.accent,
     padding: 12,
     marginTop: 8,
     borderWidth: 4,
     borderColor: colors.primary,
   },
   pricingLabel: {
     fontSize: 8,
     color: '#ffffff',
     textTransform: 'uppercase',
     letterSpacing: 1,
     marginBottom: 2,
   },
   pricingValue: {
     fontSize: 16,
     fontWeight: 'bold',
     color: '#ffffff',
   },
   confidentialBox: {
     backgroundColor: colors.yellow,
     padding: 8,
     marginTop: 10,
     borderWidth: 3,
     borderColor: colors.primary,
   },
   confidentialTitle: {
     fontSize: 8,
     fontWeight: 'bold',
     color: colors.primary,
     marginBottom: 3,
     textTransform: 'uppercase',
   },
   confidentialText: {
     fontSize: 8,
     color: colors.primary,
     lineHeight: 1.4,
   },
   footer: {
     position: 'absolute',
     bottom: 22,
     left: 32,
     right: 32,
     flexDirection: 'row',
     justifyContent: 'space-between',
     paddingTop: 6,
     borderTopWidth: 2,
     borderTopColor: colors.primary,
   },
   footerText: {
     fontSize: 7,
     color: colors.secondary,
   },
   disclaimer: {
     fontSize: 6,
     color: colors.secondary,
     textAlign: 'center',
     maxWidth: '70%',
   },
   // Page 2 styles
   highlightsBox: {
     backgroundColor: colors.lightGray,
     padding: 12,
     borderWidth: 4,
     borderColor: colors.primary,
   },
   highlightItem: {
     flexDirection: 'row',
     marginBottom: 6,
   },
   bullet: {
     width: 10,
     height: 10,
     backgroundColor: colors.yellow,
     marginRight: 8,
     marginTop: 2,
     borderWidth: 2,
     borderColor: colors.primary,
   },
   highlightText: {
     flex: 1,
     fontSize: 9,
     color: colors.primary,
     lineHeight: 1.4,
   },
   mapSection: {
     marginTop: 15,
   },
   mapImage: {
     width: '100%',
     height: 280,
     objectFit: 'cover',
     borderWidth: 4,
     borderColor: colors.primary,
   },
   mapCaption: {
     fontSize: 7,
     color: colors.secondary,
     textAlign: 'center',
     marginTop: 3,
   },
   // Photo page styles
   photosPageTitle: {
     fontSize: 16,
     fontWeight: 'bold',
     color: colors.primary,
     marginBottom: 12,
     paddingBottom: 6,
     borderBottomWidth: 4,
     borderBottomColor: colors.primary,
   },
   photoGrid: {
     flexDirection: 'row',
     flexWrap: 'wrap',
     justifyContent: 'space-between',
   },
   photoItem: {
     width: '48%',
     marginBottom: 10,
   },
   additionalPhoto: {
     width: '100%',
     height: 170,
     objectFit: 'cover',
     borderWidth: 3,
     borderColor: colors.primary,
   },
   photoCaption: {
     fontSize: 8,
     color: colors.secondary,
     marginTop: 3,
     textAlign: 'center',
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
 
 export function ListingBrochurePDF({ 
   listing, 
   marketing, 
   includeConfidential = false, 
   staticMapUrl, 
   additionalPhotos = [] 
 }: ListingBrochurePDFProps) {
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
       {/* PAGE 1: Cover, Hero, Description, Specs */}
       <Page size="LETTER" style={styles.page}>
         <View style={styles.header}>
           <Image src={clearviewLogo} style={styles.logo} />
           <Text style={styles.dealType}>{dealTypeLabel}</Text>
         </View>
 
         {listing.photo_url && (
           <Image src={listing.photo_url} style={styles.heroImage} />
         )}
 
         <View style={styles.heroSection}>
           <Text style={styles.headline}>{marketing.headline}</Text>
           <Text style={styles.tagline}>{marketing.tagline}</Text>
           <Text style={styles.addressLine}>
             {listing.display_address || listing.address}, {listing.city} | {listing.submarket}
           </Text>
         </View>
 
         <View style={styles.twoColumn}>
           <View style={styles.mainColumn}>
             <View style={styles.section}>
               <Text style={styles.sectionTitle}>Property Overview</Text>
               <Text style={styles.description}>{marketing.description}</Text>
             </View>
           </View>
 
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
 
         {includeConfidential && (
           <View style={styles.confidentialBox}>
             <Text style={styles.confidentialTitle}>Confidential - Broker Notes</Text>
             <Text style={styles.confidentialText}>{marketing.broker_pitch}</Text>
           </View>
         )}
 
         <View style={styles.footer}>
           <Text style={styles.footerText}>
             Generated {new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
           </Text>
           <Text style={styles.disclaimer}>
             Information believed accurate but not warranted. Subject to change without notice.
           </Text>
         </View>
       </Page>
 
       {/* PAGE 2: Key Features & Location Map */}
       <Page size="LETTER" style={styles.page}>
         <View style={styles.header}>
           <Image src={clearviewLogo} style={styles.logo} />
           <Text style={styles.dealType}>{dealTypeLabel}</Text>
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
 
         {staticMapUrl && (
           <View style={styles.mapSection}>
             <Text style={styles.sectionTitle}>Location</Text>
             <Image src={staticMapUrl} style={styles.mapImage} />
             <Text style={styles.mapCaption}>
               {listing.display_address || listing.address}, {listing.city}
             </Text>
           </View>
         )}
 
         <View style={styles.footer}>
           <Text style={styles.footerText}>
             {listing.display_address || listing.address}, {listing.city}
           </Text>
           <Text style={styles.disclaimer}>
             Information believed accurate but not warranted.
           </Text>
         </View>
       </Page>
 
       {/* PAGE 3+: Additional Photos */}
       {additionalPhotos.length > 0 && (
         <Page size="LETTER" style={styles.page}>
           <View style={styles.header}>
             <Image src={clearviewLogo} style={styles.logo} />
             <Text style={styles.dealType}>{dealTypeLabel}</Text>
           </View>
 
           <Text style={styles.photosPageTitle}>Property Photos</Text>
 
           <View style={styles.photoGrid}>
             {additionalPhotos.slice(0, 4).map((photo, idx) => (
               <View key={photo.id || idx} style={styles.photoItem}>
                 <Image src={photo.photo_url} style={styles.additionalPhoto} />
                 {photo.caption && (
                   <Text style={styles.photoCaption}>{photo.caption}</Text>
                 )}
               </View>
             ))}
           </View>
 
           <View style={styles.footer}>
             <Text style={styles.footerText}>
               {listing.display_address || listing.address}, {listing.city}
             </Text>
             <Text style={styles.disclaimer}>
               Information believed accurate but not warranted.
             </Text>
           </View>
         </Page>
       )}
 
       {/* PAGE 4: More photos if needed */}
       {additionalPhotos.length > 4 && (
         <Page size="LETTER" style={styles.page}>
           <View style={styles.header}>
             <Image src={clearviewLogo} style={styles.logo} />
             <Text style={styles.dealType}>{dealTypeLabel}</Text>
           </View>
 
           <Text style={styles.photosPageTitle}>Property Photos (Continued)</Text>
 
           <View style={styles.photoGrid}>
             {additionalPhotos.slice(4, 8).map((photo, idx) => (
               <View key={photo.id || idx} style={styles.photoItem}>
                 <Image src={photo.photo_url} style={styles.additionalPhoto} />
                 {photo.caption && (
                   <Text style={styles.photoCaption}>{photo.caption}</Text>
                 )}
               </View>
             ))}
           </View>
 
           <View style={styles.footer}>
             <Text style={styles.footerText}>
               {listing.display_address || listing.address}, {listing.city}
             </Text>
             <Text style={styles.disclaimer}>
               Information believed accurate but not warranted.
             </Text>
           </View>
         </Page>
       )}
     </Document>
   );
 }