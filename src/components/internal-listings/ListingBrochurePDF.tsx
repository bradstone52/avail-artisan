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
    borderBottomWidth: 3,
     borderBottomColor: colors.primary,
   },
   logo: {
    width: 180,
    height: 40,
     objectFit: 'contain',
   },
   listingInfo: {
     textAlign: 'right',
   },
   dealType: {
    fontSize: 16,
     fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
     textTransform: 'uppercase',
    letterSpacing: 1,
   },
   heroSection: {
     marginBottom: 20,
   },
   headline: {
    fontSize: 26,
     fontWeight: 'bold',
     color: colors.primary,
    marginBottom: 8,
   },
   tagline: {
    fontSize: 14,
     color: colors.accent,
    marginBottom: 12,
    fontWeight: 'bold',
   },
   addressLine: {
    fontSize: 13,
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
    borderWidth: 2,
    borderColor: colors.primary,
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
    borderWidth: 2,
    borderColor: colors.primary,
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
    backgroundColor: colors.primary,
     padding: 12,
     marginTop: 10,
    borderWidth: 3,
    borderColor: colors.yellow,
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
  heroImage: {
    width: '100%',
   height: 220,
    objectFit: 'cover',
    marginBottom: 15,
   borderWidth: 3,
   borderColor: colors.primary,
  },
  mapSection: {
    marginTop: 15,
    marginBottom: 15,
  },
  mapImage: {
    width: '100%',
   height: 200,
    objectFit: 'cover',
   borderWidth: 3,
   borderColor: colors.primary,
  },
  mapCaption: {
    fontSize: 8,
    color: colors.secondary,
    textAlign: 'center',
    marginTop: 4,
  },
  // Additional photos page styles
  photosPageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 3,
    borderBottomColor: colors.primary,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  photoItem: {
    width: '47%',
    marginBottom: 15,
  },
  additionalPhoto: {
    width: '100%',
    height: 180,
    objectFit: 'cover',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  photoCaption: {
    fontSize: 9,
    color: colors.secondary,
    marginTop: 4,
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
 
export function ListingBrochurePDF({ listing, marketing, includeConfidential = false, staticMapUrl, additionalPhotos = [] }: ListingBrochurePDFProps) {
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
             <Text style={styles.dealType}>{dealTypeLabel}</Text>
           </View>
         </View>
 
        {/* Hero Photo */}
        {listing.photo_url && (
          <Image src={listing.photo_url} style={styles.heroImage} />
        )}

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
 
        {/* Location Map */}
        {staticMapUrl && (
          <View style={styles.mapSection}>
            <Text style={styles.sectionTitle}>Location</Text>
            <Image src={staticMapUrl} style={styles.mapImage} />
            <Text style={styles.mapCaption}>
              {listing.display_address || listing.address}, {listing.city}
            </Text>
          </View>
        )}

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
      
      {/* Additional Photos Page - only if there are additional photos */}
      {additionalPhotos.length > 0 && (
        <Page size="LETTER" style={styles.page}>
          <View style={styles.header}>
            <Image src={clearviewLogo} style={styles.logo} />
            <View style={styles.listingInfo}>
              <Text style={styles.dealType}>{dealTypeLabel}</Text>
            </View>
          </View>
          
          <Text style={styles.photosPageTitle}>Property Photos</Text>
          
          <View style={styles.photoGrid}>
            {additionalPhotos.map((photo, idx) => (
              <View key={photo.id || idx} style={styles.photoItem}>
                <Image src={photo.photo_url} style={styles.additionalPhoto} />
                {photo.caption && (
                  <Text style={styles.photoCaption}>{photo.caption}</Text>
                )}
              </View>
            ))}
          </View>
          
          {/* Footer */}
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