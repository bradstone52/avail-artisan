import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTransactions, TransactionInput } from '@/hooks/useTransactions';
import { useMarketListings } from '@/hooks/useMarketListings';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

export default function TransactionForm() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getTransaction, createTransaction, updateTransaction } = useTransactions();
  const { listings } = useMarketListings();
  
  const isEdit = id && id !== 'new';
  const listingId = searchParams.get('listing');

  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<TransactionInput>({
    address: '',
    transaction_type: 'Lease',
  });

  // Load existing transaction for edit
  useEffect(() => {
    async function loadTransaction() {
      if (!isEdit || !id) return;
      setIsLoading(true);
      const data = await getTransaction(id);
      if (data) {
        setFormData({
          market_listing_id: data.market_listing_id,
          listing_id: data.listing_id,
          address: data.address,
          display_address: data.display_address,
          city: data.city,
          submarket: data.submarket,
          size_sf: data.size_sf,
          transaction_type: data.transaction_type,
          transaction_date: data.transaction_date,
          closing_date: data.closing_date,
          sale_price: data.sale_price,
          lease_rate_psf: data.lease_rate_psf,
          lease_term_months: data.lease_term_months,
          buyer_tenant_name: data.buyer_tenant_name,
          buyer_tenant_company: data.buyer_tenant_company,
          seller_landlord_name: data.seller_landlord_name,
          seller_landlord_company: data.seller_landlord_company,
          listing_broker_name: data.listing_broker_name,
          listing_broker_company: data.listing_broker_company,
          selling_broker_name: data.selling_broker_name,
          selling_broker_company: data.selling_broker_company,
          commission_percent: data.commission_percent,
          commission_amount: data.commission_amount,
          notes: data.notes,
        });
      }
      setIsLoading(false);
    }
    loadTransaction();
  }, [id, isEdit, getTransaction]);

  // Pre-fill from linked listing
  useEffect(() => {
    if (listingId && listings.length > 0 && !isEdit) {
      const listing = listings.find((l) => l.id === listingId);
      if (listing) {
        setFormData((prev) => ({
          ...prev,
          market_listing_id: listing.id,
          listing_id: listing.listing_id,
          address: listing.address,
          display_address: listing.display_address,
          city: listing.city,
          submarket: listing.submarket,
          size_sf: listing.size_sf,
          seller_landlord_company: listing.landlord || undefined,
          listing_broker_company: listing.broker_source || undefined,
        }));
      }
    }
  }, [listingId, listings, isEdit]);

  const handleChange = (field: keyof TransactionInput, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (isEdit && id) {
        await updateTransaction(id, formData);
        navigate(`/transactions/${id}`);
      } else {
        const created = await createTransaction(formData);
        if (created) {
          navigate(`/transactions/${created.id}`);
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate(isEdit ? `/transactions/${id}` : '/transactions')}
              className="mb-2 -ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {isEdit ? 'Back to Transaction' : 'Back to Transactions'}
            </Button>
            <h1 className="text-2xl font-bold">
              {isEdit ? 'Edit Transaction' : 'New Transaction'}
            </h1>
          </div>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isEdit ? 'Save Changes' : 'Create Transaction'}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Property Info */}
          <Card>
            <CardHeader>
              <CardTitle>Property Information</CardTitle>
              <CardDescription>Basic property details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_address">Display Address</Label>
                <Input
                  id="display_address"
                  value={formData.display_address || ''}
                  onChange={(e) => handleChange('display_address', e.target.value)}
                  placeholder="e.g., 123 Main St — Unit A"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city || ''}
                    onChange={(e) => handleChange('city', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="submarket">Submarket</Label>
                  <Input
                    id="submarket"
                    value={formData.submarket || ''}
                    onChange={(e) => handleChange('submarket', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="size_sf">Size (SF)</Label>
                <Input
                  id="size_sf"
                  type="number"
                  value={formData.size_sf || ''}
                  onChange={(e) => handleChange('size_sf', e.target.value ? parseInt(e.target.value) : null)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Transaction Details */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction Details</CardTitle>
              <CardDescription>Sale or lease particulars</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="transaction_type">Transaction Type *</Label>
                <Select
                  value={formData.transaction_type}
                  onValueChange={(v) => handleChange('transaction_type', v as 'Sale' | 'Lease' | 'Sublease')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sale">Sale</SelectItem>
                    <SelectItem value="Lease">Lease</SelectItem>
                    <SelectItem value="Sublease">Sublease</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.transaction_type === 'Sale' ? (
                <div className="space-y-2">
                  <Label htmlFor="sale_price">Sale Price ($)</Label>
                  <Input
                    id="sale_price"
                    type="number"
                    value={formData.sale_price || ''}
                    onChange={(e) => handleChange('sale_price', e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="lease_rate_psf">Lease Rate ($/SF)</Label>
                    <Input
                      id="lease_rate_psf"
                      type="number"
                      step="0.01"
                      value={formData.lease_rate_psf || ''}
                      onChange={(e) => handleChange('lease_rate_psf', e.target.value ? parseFloat(e.target.value) : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lease_term_months">Lease Term (months)</Label>
                    <Input
                      id="lease_term_months"
                      type="number"
                      value={formData.lease_term_months || ''}
                      onChange={(e) => handleChange('lease_term_months', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transaction_date">Transaction Date</Label>
                  <Input
                    id="transaction_date"
                    type="date"
                    value={formData.transaction_date || ''}
                    onChange={(e) => handleChange('transaction_date', e.target.value || null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closing_date">Closing Date</Label>
                  <Input
                    id="closing_date"
                    type="date"
                    value={formData.closing_date || ''}
                    onChange={(e) => handleChange('closing_date', e.target.value || null)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Buyer/Tenant */}
          <Card>
            <CardHeader>
              <CardTitle>
                {formData.transaction_type === 'Sale' ? 'Buyer' : 'Tenant'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="buyer_tenant_name">Contact Name</Label>
                <Input
                  id="buyer_tenant_name"
                  value={formData.buyer_tenant_name || ''}
                  onChange={(e) => handleChange('buyer_tenant_name', e.target.value || null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyer_tenant_company">Company</Label>
                <Input
                  id="buyer_tenant_company"
                  value={formData.buyer_tenant_company || ''}
                  onChange={(e) => handleChange('buyer_tenant_company', e.target.value || null)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Seller/Landlord */}
          <Card>
            <CardHeader>
              <CardTitle>
                {formData.transaction_type === 'Sale' ? 'Seller' : 'Landlord'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seller_landlord_name">Contact Name</Label>
                <Input
                  id="seller_landlord_name"
                  value={formData.seller_landlord_name || ''}
                  onChange={(e) => handleChange('seller_landlord_name', e.target.value || null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seller_landlord_company">Company</Label>
                <Input
                  id="seller_landlord_company"
                  value={formData.seller_landlord_company || ''}
                  onChange={(e) => handleChange('seller_landlord_company', e.target.value || null)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Brokers */}
          <Card>
            <CardHeader>
              <CardTitle>Listing Broker</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="listing_broker_name">Broker Name</Label>
                <Input
                  id="listing_broker_name"
                  value={formData.listing_broker_name || ''}
                  onChange={(e) => handleChange('listing_broker_name', e.target.value || null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="listing_broker_company">Brokerage</Label>
                <Input
                  id="listing_broker_company"
                  value={formData.listing_broker_company || ''}
                  onChange={(e) => handleChange('listing_broker_company', e.target.value || null)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Selling/Tenant Broker</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="selling_broker_name">Broker Name</Label>
                <Input
                  id="selling_broker_name"
                  value={formData.selling_broker_name || ''}
                  onChange={(e) => handleChange('selling_broker_name', e.target.value || null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="selling_broker_company">Brokerage</Label>
                <Input
                  id="selling_broker_company"
                  value={formData.selling_broker_company || ''}
                  onChange={(e) => handleChange('selling_broker_company', e.target.value || null)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Commission & Notes */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Commission & Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="commission_percent">Commission (%)</Label>
                  <Input
                    id="commission_percent"
                    type="number"
                    step="0.01"
                    value={formData.commission_percent || ''}
                    onChange={(e) => handleChange('commission_percent', e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commission_amount">Commission Amount ($)</Label>
                  <Input
                    id="commission_amount"
                    type="number"
                    value={formData.commission_amount || ''}
                    onChange={(e) => handleChange('commission_amount', e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => handleChange('notes', e.target.value || null)}
                  rows={4}
                  placeholder="Additional transaction notes..."
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </AppLayout>
  );
}
