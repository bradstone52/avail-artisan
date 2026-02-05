 import { useState } from 'react';
 import { pdf } from '@react-pdf/renderer';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Checkbox } from '@/components/ui/checkbox';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import { Input } from '@/components/ui/input';
 import { Skeleton } from '@/components/ui/skeleton';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 import {
   Sparkles,
   FileText,
   Download,
   RefreshCw,
   Pencil,
   Save,
   X,
 } from 'lucide-react';
 import { ListingBrochurePDF, MarketingContent } from './ListingBrochurePDF';
 
 interface MarketingSectionProps {
   listing: {
     id: string;
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
     description: string | null;
     broker_remarks: string | null;
     loading_type: string | null;
     cam: number | null;
     op_costs: number | null;
     taxes: number | null;
     gross_rate: number | null;
     listing_number: string | null;
   };
 }
 
 export function MarketingSection({ listing }: MarketingSectionProps) {
   const [isGenerating, setIsGenerating] = useState(false);
   const [marketingContent, setMarketingContent] = useState<MarketingContent | null>(null);
   const [isEditing, setIsEditing] = useState(false);
   const [editedContent, setEditedContent] = useState<MarketingContent | null>(null);
   const [includeConfidential, setIncludeConfidential] = useState(false);
   const [isDownloading, setIsDownloading] = useState(false);
 
   const generateMarketingContent = async () => {
     setIsGenerating(true);
     try {
       const { data, error } = await supabase.functions.invoke('generate-listing-marketing', {
         body: { listing }
       });
 
       if (error) throw error;
       if (data.error) throw new Error(data.error);
 
       setMarketingContent(data);
       setEditedContent(data);
       toast.success('Marketing content generated!');
     } catch (error) {
       console.error('Error generating marketing:', error);
       toast.error(error instanceof Error ? error.message : 'Failed to generate marketing content');
     } finally {
       setIsGenerating(false);
     }
   };
 
   const handleSaveEdits = () => {
     if (editedContent) {
       setMarketingContent(editedContent);
       setIsEditing(false);
       toast.success('Changes saved');
     }
   };
 
   const handleCancelEdit = () => {
     setEditedContent(marketingContent);
     setIsEditing(false);
   };
 
   const downloadPDF = async () => {
     if (!marketingContent) return;
     
     setIsDownloading(true);
     try {
       const doc = (
         <ListingBrochurePDF 
           listing={listing} 
           marketing={marketingContent}
           includeConfidential={includeConfidential}
         />
       );
       
       const blob = await pdf(doc).toBlob();
       const url = URL.createObjectURL(blob);
       const link = document.createElement('a');
       link.href = url;
       link.download = `${listing.address.replace(/[^a-zA-Z0-9]/g, '-')}-Brochure.pdf`;
       link.click();
       URL.revokeObjectURL(url);
       toast.success('PDF downloaded!');
     } catch (error) {
       console.error('Error generating PDF:', error);
       toast.error('Failed to generate PDF');
     } finally {
       setIsDownloading(false);
     }
   };
 
   const downloadIDML = () => {
     if (!marketingContent) return;
     
     // Generate IDML-ready content as JSON
     const idmlContent = {
       metadata: {
         version: '1.0',
         generated: new Date().toISOString(),
         listing_id: listing.id,
         listing_number: listing.listing_number,
       },
       content: {
         headline: marketingContent.headline,
         tagline: marketingContent.tagline,
         address: listing.display_address || listing.address,
         city: listing.city,
         submarket: listing.submarket,
         deal_type: listing.deal_type,
         description: marketingContent.description,
         highlights: marketingContent.highlights,
         broker_pitch: includeConfidential ? marketingContent.broker_pitch : null,
       },
       specifications: {
         size_sf: listing.size_sf,
         warehouse_sf: listing.warehouse_sf,
         office_sf: listing.office_sf,
         land_acres: listing.land_acres,
         clear_height_ft: listing.clear_height_ft,
         dock_doors: listing.dock_doors,
         drive_in_doors: listing.drive_in_doors,
         loading_type: listing.loading_type,
         power: listing.power,
         yard: listing.yard,
         zoning: listing.zoning,
         property_type: listing.property_type,
       },
       financials: {
         asking_rent_psf: listing.asking_rent_psf,
         asking_sale_price: listing.asking_sale_price,
         cam: listing.cam,
         op_costs: listing.op_costs,
         taxes: listing.taxes,
         gross_rate: listing.gross_rate,
       }
     };
 
     const blob = new Blob([JSON.stringify(idmlContent, null, 2)], { type: 'application/json' });
     const url = URL.createObjectURL(blob);
     const link = document.createElement('a');
     link.href = url;
     link.download = `${listing.address.replace(/[^a-zA-Z0-9]/g, '-')}-IDML-Data.json`;
     link.click();
     URL.revokeObjectURL(url);
     toast.success('IDML data exported! Import into InDesign via Data Merge.');
   };
 
   return (
     <div className="space-y-6">
       {/* Generate Button */}
       {!marketingContent && !isGenerating && (
         <Card className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
           <CardContent className="py-12 text-center">
             <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary" />
             <h3 className="text-lg font-semibold mb-2">AI-Powered Marketing</h3>
             <p className="text-muted-foreground mb-6 max-w-md mx-auto">
               Generate professional marketing copy including headlines, descriptions, and key highlights using AI.
             </p>
             <Button onClick={generateMarketingContent} size="lg">
               <Sparkles className="h-4 w-4 mr-2" />
               Generate Marketing Content
             </Button>
           </CardContent>
         </Card>
       )}
 
       {/* Loading State */}
       {isGenerating && (
         <Card className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
           <CardContent className="py-12">
             <div className="flex flex-col items-center gap-4">
               <RefreshCw className="h-8 w-8 animate-spin text-primary" />
               <p className="text-muted-foreground">Generating marketing content...</p>
               <div className="space-y-3 w-full max-w-md">
                 <Skeleton className="h-6 w-3/4" />
                 <Skeleton className="h-4 w-full" />
                 <Skeleton className="h-4 w-full" />
                 <Skeleton className="h-4 w-2/3" />
               </div>
             </div>
           </CardContent>
         </Card>
       )}
 
       {/* Generated Content */}
       {marketingContent && !isGenerating && (
         <>
           {/* Actions Bar */}
           <Card className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
             <CardContent className="py-4">
               <div className="flex flex-wrap items-center justify-between gap-4">
                 <div className="flex items-center gap-4">
                   <div className="flex items-center space-x-2">
                     <Checkbox
                       id="confidential"
                       checked={includeConfidential}
                       onCheckedChange={(checked) => setIncludeConfidential(checked as boolean)}
                     />
                     <Label htmlFor="confidential" className="text-sm">
                       Include broker notes
                     </Label>
                   </div>
                 </div>
                 <div className="flex items-center gap-2">
                   <Button
                     variant="outline"
                     onClick={generateMarketingContent}
                     disabled={isGenerating}
                   >
                     <RefreshCw className="h-4 w-4 mr-2" />
                     Regenerate
                   </Button>
                   {!isEditing ? (
                     <Button variant="outline" onClick={() => setIsEditing(true)}>
                       <Pencil className="h-4 w-4 mr-2" />
                       Edit
                     </Button>
                   ) : (
                     <>
                       <Button variant="outline" onClick={handleCancelEdit}>
                         <X className="h-4 w-4 mr-2" />
                         Cancel
                       </Button>
                       <Button onClick={handleSaveEdits}>
                         <Save className="h-4 w-4 mr-2" />
                         Save
                       </Button>
                     </>
                   )}
                 </div>
               </div>
             </CardContent>
           </Card>
 
           {/* Content Preview / Edit */}
           <div className="grid md:grid-cols-2 gap-6">
             {/* Headline & Tagline */}
             <Card className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
               <CardHeader>
                 <CardTitle className="text-base">Headline & Tagline</CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                 {isEditing && editedContent ? (
                   <>
                     <div>
                       <Label className="text-xs text-muted-foreground">Headline</Label>
                       <Input
                         value={editedContent.headline}
                         onChange={(e) => setEditedContent({ ...editedContent, headline: e.target.value })}
                       />
                     </div>
                     <div>
                       <Label className="text-xs text-muted-foreground">Tagline</Label>
                       <Input
                         value={editedContent.tagline}
                         onChange={(e) => setEditedContent({ ...editedContent, tagline: e.target.value })}
                       />
                     </div>
                   </>
                 ) : (
                   <>
                     <div>
                       <p className="text-xs text-muted-foreground mb-1">Headline</p>
                       <p className="text-lg font-semibold">{marketingContent.headline}</p>
                     </div>
                     <div>
                       <p className="text-xs text-muted-foreground mb-1">Tagline</p>
                       <p className="text-primary">{marketingContent.tagline}</p>
                     </div>
                   </>
                 )}
               </CardContent>
             </Card>
 
             {/* Key Highlights */}
             <Card className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
               <CardHeader>
                 <CardTitle className="text-base">Key Highlights</CardTitle>
               </CardHeader>
               <CardContent>
                 {isEditing && editedContent ? (
                   <Textarea
                     value={editedContent.highlights.join('\n')}
                     onChange={(e) => setEditedContent({
                       ...editedContent,
                       highlights: e.target.value.split('\n').filter(h => h.trim())
                     })}
                     rows={6}
                     placeholder="One highlight per line"
                   />
                 ) : (
                   <ul className="space-y-2">
                     {marketingContent.highlights.map((highlight, idx) => (
                       <li key={idx} className="flex items-start gap-2">
                         <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                         <span className="text-sm">{highlight}</span>
                       </li>
                     ))}
                   </ul>
                 )}
               </CardContent>
             </Card>
           </div>
 
           {/* Description */}
           <Card className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
             <CardHeader>
               <CardTitle className="text-base">Property Description</CardTitle>
             </CardHeader>
             <CardContent>
               {isEditing && editedContent ? (
                 <Textarea
                   value={editedContent.description}
                   onChange={(e) => setEditedContent({ ...editedContent, description: e.target.value })}
                   rows={6}
                 />
               ) : (
                 <p className="text-sm leading-relaxed whitespace-pre-line">
                   {marketingContent.description}
                 </p>
               )}
             </CardContent>
           </Card>
 
           {/* Broker Pitch */}
           <Card className="border-2 border-amber-400/50 bg-amber-50/30 dark:bg-amber-950/20 shadow-[4px_4px_0_hsl(var(--foreground))]">
             <CardHeader>
               <CardTitle className="text-base flex items-center gap-2">
                 <span className="text-amber-600 dark:text-amber-400">Confidential</span>
                 Broker Notes
               </CardTitle>
             </CardHeader>
             <CardContent>
               {isEditing && editedContent ? (
                 <Textarea
                   value={editedContent.broker_pitch}
                   onChange={(e) => setEditedContent({ ...editedContent, broker_pitch: e.target.value })}
                   rows={3}
                 />
               ) : (
                 <p className="text-sm leading-relaxed">{marketingContent.broker_pitch}</p>
               )}
             </CardContent>
           </Card>
 
           {/* Download Actions */}
           <Card className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
             <CardContent className="py-6">
               <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                 <Button
                   onClick={downloadPDF}
                   disabled={isDownloading}
                   size="lg"
                 >
                   {isDownloading ? (
                     <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                   ) : (
                     <FileText className="h-4 w-4 mr-2" />
                   )}
                   Download PDF Brochure
                 </Button>
                 <Button
                   variant="outline"
                   onClick={downloadIDML}
                   size="lg"
                 >
                   <Download className="h-4 w-4 mr-2" />
                   Export for InDesign
                 </Button>
               </div>
               <p className="text-xs text-muted-foreground text-center mt-3">
                 IDML export provides structured data for Adobe InDesign Data Merge
               </p>
             </CardContent>
           </Card>
         </>
       )}
     </div>
   );
 }