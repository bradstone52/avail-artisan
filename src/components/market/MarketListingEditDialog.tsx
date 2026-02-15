import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MarketListing } from '@/hooks/useMarketListings';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { BrokerageCombobox } from './BrokerageCombobox';
import { LandlordCombobox } from './LandlordCombobox';
import { CityCombobox } from '@/components/common/CityCombobox';
import { DoorDimensionCombobox, DoorDimensionProvider } from '@/components/common/DoorDimensionCombobox';
import { useOrg } from '@/hooks/useOrg';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const FORM_STORAGE_KEY = 'market-listing-form-draft';

// Create mode: only Active/Under Contract (no Sold/Leased or Unknown/Removed for new listings)
const STATUS_OPTIONS_CREATE = [
  { value: 'Active', label: 'Active' },
  { value: 'Under Contract', label: 'Under Contract' },
  { value: 'Sold/Leased', label: 'Sold/Leased' },
  { value: 'Unknown/Removed', label: 'Unknown/Removed' },
];

// Edit mode: all status options available
const STATUS_OPTIONS_EDIT = [
  { value: 'Active', label: 'Active' },
  { value: 'Under Contract', label: 'Under Contract' },
  { value: 'Sold/Leased', label: 'Sold/Leased' },
  { value: 'Unknown/Removed', label: 'Unknown/Removed' },
];

// Get status background color to match table styling
const getStatusColor = (status: string) => {
  switch (status) {
    case 'Active':
      return 'bg-blue-600 text-white border-blue-700';
    case 'Under Contract':
      return 'bg-amber-500 text-white border-amber-600';
    case 'Sold/Leased':
      return 'bg-red-600 text-white border-red-700';
    case 'Unknown/Removed':
      return 'bg-gray-300 text-gray-700 border-gray-400';
    default:
      return '';
  }
};

const LISTING_TYPE_OPTIONS = [
  { value: 'Lease', label: 'Lease' },
  { value: 'Sale', label: 'Sale' },
  { value: 'Sublease', label: 'Sublease' },
  { value: 'Sale/Lease', label: 'Sale/Lease' },
];

interface MarketListingEditDialogProps {
  listing: MarketListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  mode?: 'edit' | 'create';
  onLogTransaction?: (listing: MarketListing) => void;
}

export function MarketListingEditDialog({
  listing,
  open,
  onOpenChange,
  onSaved,
  mode = 'edit',
  onLogTransaction,
}: MarketListingEditDialogProps) {
  const { user } = useAuth();
  const { org } = useOrg();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showTransactionPrompt, setShowTransactionPrompt] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const isCreateMode = mode === 'create';

  // Form state - Core fields for create
  const [listingId, setListingId] = useState('');
  const [address, setAddress] = useState('');
  const [building, setBuilding] = useState('');
  const [unit, setUnit] = useState('');
  const [displayAddress, setDisplayAddress] = useState('');
  const [displayAddressManuallyEdited, setDisplayAddressManuallyEdited] = useState(false);
  const [city, setCity] = useState('');
  const [submarket, setSubmarket] = useState('');
  const [sizeSf, setSizeSf] = useState('');
  
  // Form state - Additional fields
  const [status, setStatus] = useState('Active');
  const [listingType, setListingType] = useState('');
  const [askingRate, setAskingRate] = useState('');
  const [opCosts, setOpCosts] = useState('');
  const [propertyTax, setPropertyTax] = useState('');
  const [condoFees, setCondoFees] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [grossRate, setGrossRate] = useState('');
  const [availabilityDate, setAvailabilityDate] = useState('');
  const [subleaseExp, setSubleaseExp] = useState('');
  const [landlord, setLandlord] = useState('');
  const [brokerSource, setBrokerSource] = useState('');
  const [brochureLink, setBrochureLink] = useState('');
  const [websiteLink, setWebsiteLink] = useState('');
  const [notesPublic, setNotesPublic] = useState('');
  const [internalNote, setInternalNote] = useState('');

  // Building specs
  const [warehouseSf, setWarehouseSf] = useState('');
  const [officeSf, setOfficeSf] = useState('');
  const [clearHeight, setClearHeight] = useState('');
  const [dockDoors, setDockDoors] = useState('');
  const [driveInDoors, setDriveInDoors] = useState('');
  const [driveInDoorDimensions, setDriveInDoorDimensions] = useState<string[]>([]);
  const [buildingDepth, setBuildingDepth] = useState('');
  const [powerAmps, setPowerAmps] = useState('');
  const [voltage, setVoltage] = useState('');
  const [sprinkler, setSprinkler] = useState('');
  const [hasSprinklers, setHasSprinklers] = useState(false);
  const [hasCranes, setHasCranes] = useState(false);
  const [cranes, setCranes] = useState('');
  const [craneTons, setCraneTons] = useState('');
  const [craneTonValues, setCraneTonValues] = useState<string[]>([]);
  const [yard, setYard] = useState(false);
  const [yardArea, setYardArea] = useState('');
  const [crossDock, setCrossDock] = useState(false);
  const [trailerParking, setTrailerParking] = useState('');
  const [landAcres, setLandAcres] = useState('');
  const [zoning, setZoning] = useState('');
  const [mua, setMua] = useState(false);
  const [muaValue, setMuaValue] = useState('');
  const [hasLand, setHasLand] = useState(false);
  const [isDistributionWarehouse, setIsDistributionWarehouse] = useState(false);
  const [calgaryQuad, setCalgaryQuad] = useState('');
  // Track if we've initialized form from storage to avoid re-init on re-renders
  const hasInitializedRef = useRef(false);
  const formSessionIdRef = useRef<string | null>(null);

  // Collect all form state into an object for persistence
  const getFormState = useCallback(() => ({
    listingId,
    address,
    building,
    unit,
    displayAddress,
    displayAddressManuallyEdited,
    city,
    submarket,
    sizeSf,
    status,
    listingType,
    askingRate,
    opCosts,
    propertyTax,
    condoFees,
    salePrice,
    availabilityDate,
    subleaseExp,
    landlord,
    brokerSource,
    brochureLink,
    websiteLink,
    notesPublic,
    internalNote,
    warehouseSf,
    officeSf,
    clearHeight,
    dockDoors,
    driveInDoors,
    driveInDoorDimensions,
    buildingDepth,
    powerAmps,
    voltage,
    sprinkler,
    hasSprinklers,
    hasCranes,
    cranes,
    craneTons,
    yard,
    yardArea,
    crossDock,
    trailerParking,
    landAcres,
    zoning,
    mua,
    muaValue,
    hasLand,
    grossRate,
    isDistributionWarehouse,
  }), [
    listingId, address, building, unit, displayAddress, displayAddressManuallyEdited, city, submarket,
    sizeSf, status, listingType, askingRate, opCosts, propertyTax, condoFees, salePrice, availabilityDate,
    subleaseExp, landlord, brokerSource, brochureLink, websiteLink, notesPublic, internalNote, warehouseSf,
    officeSf, clearHeight, dockDoors, driveInDoors, driveInDoorDimensions, buildingDepth, powerAmps, voltage, sprinkler,
    hasSprinklers, hasCranes, cranes, craneTons, yard, yardArea, crossDock, trailerParking, landAcres, zoning,
    mua, muaValue, hasLand, grossRate, isDistributionWarehouse,
  ]);


  // Apply form state from storage
  const applyFormState = useCallback((state: ReturnType<typeof getFormState>) => {
    setListingId(state.listingId);
    setAddress(state.address);
    setBuilding(state.building || '');
    setUnit(state.unit || '');
    setDisplayAddress(state.displayAddress);
    setDisplayAddressManuallyEdited(state.displayAddressManuallyEdited);
    setCity(state.city);
    setSubmarket(state.submarket);
    setSizeSf(state.sizeSf);
    setStatus(state.status);
    setListingType(state.listingType);
    setAskingRate(state.askingRate);
    setOpCosts(state.opCosts);
    setPropertyTax(state.propertyTax || '');
    setCondoFees(state.condoFees || '');
    setSalePrice(state.salePrice);
    setAvailabilityDate(state.availabilityDate || '');
    setSubleaseExp(state.subleaseExp || '');
    setLandlord(state.landlord);
    setBrokerSource(state.brokerSource);
    setBrochureLink(state.brochureLink || '');
    setWebsiteLink(state.websiteLink || '');
    setNotesPublic(state.notesPublic);
    setInternalNote(state.internalNote);
    setWarehouseSf(state.warehouseSf);
    setOfficeSf(state.officeSf);
    setClearHeight(state.clearHeight);
    setDockDoors(state.dockDoors);
    setDriveInDoors(state.driveInDoors);
    setDriveInDoorDimensions(state.driveInDoorDimensions || []);
    setBuildingDepth(state.buildingDepth || '');
    setPowerAmps(state.powerAmps);
    setVoltage(state.voltage);
    setSprinkler(state.sprinkler);
    setHasSprinklers(state.hasSprinklers || !!state.sprinkler);
    setHasCranes(state.hasCranes || !!state.cranes || !!state.craneTons);
    setCranes(state.cranes);
    setCraneTons(state.craneTons);
    // Parse crane ton values from comma-separated string
    const craneCount = parseInt(state.cranes) || 0;
    if (craneCount > 0 && state.craneTons) {
      const parts = state.craneTons.split(',').map((s: string) => s.trim());
      setCraneTonValues(Array.from({ length: craneCount }, (_, i) => parts[i] || ''));
    } else {
      setCraneTonValues(Array.from({ length: craneCount }, () => ''));
    }
    setYard(state.yard);
    setYardArea(state.yardArea);
    setCrossDock(state.crossDock);
    setTrailerParking(state.trailerParking);
    setLandAcres(state.landAcres);
    setZoning(state.zoning);
    setMua(state.mua);
    setMuaValue(state.muaValue || '');
    setHasLand(state.hasLand || false);
    setGrossRate(state.grossRate || '');
    setIsDistributionWarehouse(state.isDistributionWarehouse);
  }, []);

  // Auto-calculate gross rate when asking rate and op costs are both numeric
  const calculatedGrossRate = useMemo(() => {
    // Parse numeric values from asking rate and op costs (strip $ and commas)
    const parseNumeric = (val: string) => {
      if (!val) return null;
      const cleaned = val.replace(/[$,]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num;
    };
    
    const askingNum = parseNumeric(askingRate);
    const opCostsNum = parseNumeric(opCosts);
    
    if (askingNum !== null && opCostsNum !== null) {
      return (askingNum + opCostsNum).toFixed(2);
    }
    return null;
  }, [askingRate, opCosts]);

  // Auto-fill gross rate when calculated value is available and field is empty
  useEffect(() => {
    if (calculatedGrossRate && !grossRate) {
      setGrossRate(calculatedGrossRate);
    }
  }, [calculatedGrossRate, grossRate]);

  // Update drive-in door dimensions array when count changes
  useEffect(() => {
    const count = parseInt(driveInDoors) || 0;
    if (count > driveInDoorDimensions.length) {
      const newDims = [...driveInDoorDimensions];
      for (let i = driveInDoorDimensions.length; i < count; i++) {
        newDims.push('');
      }
      setDriveInDoorDimensions(newDims);
    } else if (count < driveInDoorDimensions.length) {
      setDriveInDoorDimensions(driveInDoorDimensions.slice(0, count));
    }
  }, [driveInDoors]);

  // Update a single door dimension
  const updateDoorDimension = (index: number, value: string) => {
    const updated = [...driveInDoorDimensions];
    updated[index] = value;
    setDriveInDoorDimensions(updated);
  };

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(FORM_STORAGE_KEY);
    } catch (e) {
      // Ignore storage errors
    }
    formSessionIdRef.current = null;
  }, []);

  // Helper to format a number string with commas
  const formatNumberWithCommas = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    if (!cleaned) return '';
    return new Intl.NumberFormat('en-CA').format(parseInt(cleaned));
  };

  // Handle formatted number input - strips commas for storage but displays with commas
  const handleFormattedNumberChange = (
    value: string, 
    setter: (val: string) => void
  ) => {
    // Allow typing numbers and commas
    const cleaned = value.replace(/[^0-9,]/g, '');
    setter(cleaned);
  };

  const handleFormattedNumberBlur = (
    value: string, 
    setter: (val: string) => void
  ) => {
    // Format with commas on blur
    setter(formatNumberWithCommas(value));
  };

  // Format PSF-style fields to 2 decimal places on blur (e.g., "12" → "12.00")
  const handlePsfBlur = (value: string, setter: (val: string) => void) => {
    const clean = value.replace(/[^0-9.]/g, '');
    if (!clean) return;
    const num = parseFloat(clean);
    if (!isNaN(num)) {
      setter(num.toFixed(2));
    }
  };

  // Generate combined display address from address + building + unit
  const generateDisplayAddress = useCallback((addr: string, bldg: string, unt: string) => {
    const parts = [addr];
    if (bldg.trim()) parts.push(bldg.trim());
    if (unt.trim()) parts.push(unt.trim());
    if (parts.length === 1) return addr;
    return parts.join(' — ');
  }, []);

  // Handle address change - mirror to displayAddress if not manually edited
  const handleAddressChange = (value: string) => {
    setAddress(value);
    if (!displayAddressManuallyEdited) {
      setDisplayAddress(generateDisplayAddress(value, building, unit));
    }
  };

  // Handle building change - mirror to displayAddress if not manually edited
  const handleBuildingChange = (value: string) => {
    setBuilding(value);
    if (!displayAddressManuallyEdited) {
      setDisplayAddress(generateDisplayAddress(address, value, unit));
    }
  };

  // Handle unit change - mirror to displayAddress if not manually edited
  const handleUnitChange = (value: string) => {
    setUnit(value);
    if (!displayAddressManuallyEdited) {
      setDisplayAddress(generateDisplayAddress(address, building, value));
    }
  };

  // Handle displayAddress change
  const handleDisplayAddressChange = (value: string) => {
    setDisplayAddress(value);
    const expectedDisplay = generateDisplayAddress(address, building, unit);
    if (value === '') {
      // User cleared the field - reset to mirroring mode
      setDisplayAddressManuallyEdited(false);
      setDisplayAddress(expectedDisplay);
    } else if (value !== expectedDisplay) {
      // User made a different value - mark as manually edited
      setDisplayAddressManuallyEdited(true);
    }
  };

  // Generate a unique listing ID
  const generateListingId = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ML-${year}${month}${day}-${random}`;
  };

  // Save form state to localStorage when it changes (debounced via effect)
  useEffect(() => {
    if (!open || !hasInitializedRef.current) return;

    const sessionId = isCreateMode ? 'create' : listing?.id;
    if (!sessionId) return;

    try {
      const draft = {
        sessionId,
        mode,
        timestamp: Date.now(),
        state: getFormState(),
      };
      localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(draft));
    } catch (e) {
      // Ignore storage errors (quota exceeded, etc.)
    }
  }, [open, isCreateMode, listing?.id, mode, getFormState]);

  // Parse building/unit from existing display_address (if present)
  const parseBuildingUnitFromDisplayAddress = (displayAddr: string, addr: string): { building: string; unit: string } => {
    if (!displayAddr || !addr) return { building: '', unit: '' };
    // Check for " — " separator pattern
    if (displayAddr.includes(' — ')) {
      const parts = displayAddr.split(' — ');
      if (parts.length === 2) {
        // Could be building or unit
        return { building: parts[1].trim(), unit: '' };
      } else if (parts.length === 3) {
        return { building: parts[1].trim(), unit: parts[2].trim() };
      } else if (parts.length > 3) {
        return { building: parts[1].trim(), unit: parts.slice(2).join(' — ').trim() };
      }
    }
    return { building: '', unit: '' };
  };

  // Initialize form when dialog opens
  useEffect(() => {
    if (!open) {
      // Dialog closed - reset initialization flag so next open can re-init
      hasInitializedRef.current = false;
      return;
    }

    // Already initialized for this session
    if (hasInitializedRef.current) return;

    const sessionId = isCreateMode ? 'create' : listing?.id;
    
    // Try to restore from localStorage
    try {
      const stored = localStorage.getItem(FORM_STORAGE_KEY);
      if (stored) {
        const draft = JSON.parse(stored);
        // Only restore if same session (same listing or create mode) and recent (< 30 min)
        const isRecent = Date.now() - draft.timestamp < 30 * 60 * 1000;
        const isSameSession = draft.sessionId === sessionId && draft.mode === mode;
        
        if (isRecent && isSameSession) {
          console.log('[Form] Restoring draft from localStorage');
          applyFormState(draft.state);
          formSessionIdRef.current = sessionId;
          hasInitializedRef.current = true;
          return;
        } else {
          // Clear stale draft
          localStorage.removeItem(FORM_STORAGE_KEY);
        }
      }
    } catch (e) {
      // Ignore parse errors
    }

    // No valid draft - initialize from scratch
    formSessionIdRef.current = sessionId;

    if (isCreateMode) {
      // Auto-generate listing ID for create mode
      setListingId(generateListingId());
      setAddress('');
      setBuilding('');
      setUnit('');
      setDisplayAddress('');
      setDisplayAddressManuallyEdited(false);
      setCity('Calgary');
      setSubmarket('');
      setSizeSf('');
      setStatus('Active');
      setListingType('');
      setCalgaryQuad('');
      setAskingRate('');
      setOpCosts('');
      setPropertyTax('');
      setCondoFees('');
      setSalePrice('');
      setAvailabilityDate('');
      setSubleaseExp('');
      setLandlord('');
      setBrokerSource('');
      setBrochureLink('');
      setWebsiteLink('');
      setNotesPublic('');
      setInternalNote('');
      setWarehouseSf('');
      setOfficeSf('');
      setHasLand(false);
      setGrossRate('');
      setClearHeight('');
      setDockDoors('');
      setDriveInDoors('');
      setDriveInDoorDimensions([]);
      setBuildingDepth('');
      setPowerAmps('');
      setVoltage('');
      setSprinkler('');
      setHasSprinklers(false);
      setHasCranes(false);
      setCranes('');
      setCraneTons('');
      setCraneTonValues([]);
      setYard(false);
      setYardArea('');
      setCrossDock(false);
      setTrailerParking('');
      setLandAcres('');
      setZoning('');
      setMua(false);
      setMuaValue('');
      setIsDistributionWarehouse(false);
    } else if (listing) {
      setListingId(listing.listing_id || '');
      setAddress(listing.address || '');
      // Try to parse building/unit from display_address
      const parsed = parseBuildingUnitFromDisplayAddress(listing.display_address || '', listing.address || '');
      setBuilding(parsed.building);
      setUnit(parsed.unit);
      setDisplayAddress(listing.display_address || '');
      setDisplayAddressManuallyEdited(listing.display_address !== listing.address && !parsed.building && !parsed.unit);
      setCity(listing.city || '');
      setSubmarket(listing.submarket || '');
      setSizeSf(listing.size_sf?.toString() || '');
      setStatus(listing.status || 'Active');
      setListingType(listing.listing_type || '');
      setCalgaryQuad((listing as any).calgary_quad || '');
      setAskingRate(listing.asking_rate_psf || '');
      setOpCosts(listing.op_costs || '');
      setPropertyTax(listing.property_tax || '');
      setCondoFees((listing as any).condo_fees || '');
      setSalePrice(listing.sale_price || '');
      setAvailabilityDate(listing.availability_date || '');
      setSubleaseExp(listing.sublease_exp || '');
      setLandlord(listing.landlord || '');
      setBrokerSource(listing.broker_source || '');
      setBrochureLink((listing as any).brochure_link || listing.link || '');
      setWebsiteLink((listing as any).website_link || '');
      setNotesPublic(listing.notes_public || '');
      setInternalNote(listing.internal_note || '');
      setWarehouseSf(listing.warehouse_sf?.toString() || '');
      setOfficeSf(listing.office_sf?.toString() || '');
      setHasLand((listing as any).has_land || false);
      setGrossRate((listing as any).gross_rate || '');
      setClearHeight(listing.clear_height_ft?.toString() || '');
      setDockDoors(listing.dock_doors?.toString() || '');
      setDriveInDoors(listing.drive_in_doors?.toString() || '');
      setDriveInDoorDimensions(Array.isArray((listing as any).drive_in_door_dimensions) ? (listing as any).drive_in_door_dimensions : []);
      setBuildingDepth(listing.building_depth || '');
      setPowerAmps(listing.power_amps || '');
      setVoltage(listing.voltage || '');
      setSprinkler(listing.sprinkler || '');
      setHasSprinklers(!!listing.sprinkler);
      setCranes(listing.cranes || '');
      setCraneTons(listing.crane_tons || '');
      setHasCranes(!!listing.cranes || !!listing.crane_tons);
      // Parse crane ton values from comma-separated string
      const craneCount = parseInt(listing.cranes || '') || 0;
      if (craneCount > 0 && listing.crane_tons) {
        const parts = listing.crane_tons.split(',').map((s: string) => s.trim());
        setCraneTonValues(Array.from({ length: craneCount }, (_, i) => parts[i] || ''));
      } else {
        setCraneTonValues(Array.from({ length: craneCount }, () => ''));
      }
      setYard(listing.yard === 'Yes' || listing.yard === 'yes' || listing.yard === 'Y');
      setYardArea(listing.yard_area || '');
      setCrossDock(listing.cross_dock === 'Yes' || listing.cross_dock === 'yes' || listing.cross_dock === 'Y');
      setTrailerParking(listing.trailer_parking || '');
      setLandAcres(listing.land_acres || '');
      setZoning(listing.zoning || '');
      // MUA can be 'Yes', 'No', or a specific value like 'TBV' or details
      const muaVal = listing.mua || '';
      const isMuaChecked = muaVal && muaVal !== 'No' && muaVal !== 'no' && muaVal !== 'N';
      setMua(isMuaChecked);
      setMuaValue(isMuaChecked && muaVal !== 'Yes' && muaVal !== 'yes' && muaVal !== 'Y' ? muaVal : '');
      setIsDistributionWarehouse(listing.is_distribution_warehouse || false);
    }

    hasInitializedRef.current = true;
  }, [open, listing, isCreateMode, mode, applyFormState, generateDisplayAddress]);

  const handleStatusChange = (newStatus: string) => {
    // Check if changing to "Sold/Leased" status (only in edit mode)
    if (!isCreateMode && newStatus === 'Sold/Leased' && status !== 'Sold/Leased') {
      setPendingStatus(newStatus);
      setShowTransactionPrompt(true);
    } else {
      setStatus(newStatus);
    }
  };

  const handleConfirmTransaction = () => {
    if (pendingStatus) {
      setStatus(pendingStatus);
    }
    setShowTransactionPrompt(false);
    setPendingStatus(null);
  };

  const handleSkipTransaction = () => {
    if (pendingStatus) {
      setStatus(pendingStatus);
    }
    setShowTransactionPrompt(false);
    setPendingStatus(null);
  };

  const handleSave = async () => {
    if (isCreateMode) {
      await handleCreate();
    } else {
      await handleUpdate();
    }
  };

  const handleCreate = async () => {
    if (!user || !org) {
      toast.error('You must be logged in to create a listing');
      return;
    }

    // Validate required fields
    if (!address.trim()) {
      toast.error('Address is required');
      return;
    }
    // Submarket required only if city is not Calgary (Calgary will auto-assign)
    if (city !== 'Calgary' && !submarket.trim()) {
      toast.error('Submarket is required for non-Calgary listings');
      return;
    }

    const finalDisplayAddress = displayAddress.trim() || generateDisplayAddress(address.trim(), building, unit);
    const finalSprinkler = hasSprinklers ? (sprinkler.trim() || 'TBV') : null;

    setIsSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      
      const { error } = await supabase
        .from('market_listings')
        .insert({
          listing_id: listingId.trim(),
          address: address.trim(),
          display_address: finalDisplayAddress,
          city: city || '',
          submarket: city === 'Calgary' ? 'Pending' : submarket.trim(),
          size_sf: parseInt(sizeSf) || 0,
          status,
          listing_type: listingType || null,
          asking_rate_psf: askingRate || null,
          op_costs: opCosts || null,
          property_tax: propertyTax || null,
          condo_fees: condoFees || null,
          sale_price: salePrice || null,
          availability_date: availabilityDate || null,
          sublease_exp: subleaseExp || null,
          landlord: landlord || null,
          broker_source: brokerSource || null,
          brochure_link: brochureLink || null,
          website_link: websiteLink || null,
          has_land: hasLand,
          gross_rate: grossRate || null,
          notes_public: notesPublic || null,
          internal_note: internalNote || null,
          warehouse_sf: warehouseSf ? parseInt(warehouseSf) : null,
          office_sf: officeSf ? parseInt(officeSf) : null,
          clear_height_ft: clearHeight ? parseFloat(clearHeight) : null,
          dock_doors: dockDoors ? parseInt(dockDoors) : null,
          drive_in_doors: driveInDoors ? parseInt(driveInDoors) : null,
          drive_in_door_dimensions: driveInDoorDimensions.filter(d => d.trim() !== ''),
          building_depth: buildingDepth || null,
          power_amps: powerAmps || null,
          voltage: voltage || null,
          sprinkler: finalSprinkler,
          cranes: cranes || null,
          crane_tons: craneTons || null,
          yard: yard ? 'Yes' : 'No',
          yard_area: yardArea || null,
          cross_dock: crossDock ? 'Yes' : 'No',
          trailer_parking: trailerParking || null,
          land_acres: landAcres || null,
          zoning: zoning || null,
          mua: mua ? (muaValue || 'Yes') : 'No',
          is_distribution_warehouse: isDistributionWarehouse,
          calgary_quad: calgaryQuad || null,
          user_id: user.id,
          org_id: org.id,
          last_verified_date: new Date().toISOString().split('T')[0], // Auto-verify on create
        });

      if (error) throw error;

      // For Calgary listings, trigger geocoding and submarket assignment
      if (city === 'Calgary' && session?.session?.access_token) {
        try {
          console.log('[Create Listing] Triggering geocoding for Calgary listing...');
          const { data: geocodeResult, error: geocodeError } = await supabase.functions.invoke(
            'geocode-market-listing',
            {
              headers: {
                Authorization: `Bearer ${session.session.access_token}`,
              },
              body: { listingId: listingId.trim() },
            }
          );
          
          if (geocodeError) {
            console.error('[Create Listing] Geocoding error:', geocodeError);
          } else if (geocodeResult?.submarket_assigned) {
            console.log('[Create Listing] Submarket assigned:', geocodeResult.submarket);
            toast.success(`Listing created — submarket: ${geocodeResult.submarket}`);
            clearDraft();
            onSaved();
            onOpenChange(false);
            return;
          }
        } catch (geoErr) {
          console.error('[Create Listing] Geocoding failed:', geoErr);
          // Don't fail the whole operation, just log and continue
        }
      }

      toast.success('Listing created successfully');
      clearDraft();
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error creating listing:', err);
      if (err.code === '23505') {
        toast.error('A listing with this ID already exists');
      } else {
        toast.error('Failed to create listing');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!listing) return;

    // Validate required fields
    if (!address.trim()) {
      toast.error('Address is required');
      return;
    }
    if (city !== 'Calgary' && !submarket.trim()) {
      toast.error('Submarket is required for non-Calgary listings');
      return;
    }

    // Check if address or city changed (triggers re-geocoding)
    const addressChanged = address.trim() !== listing.address;
    const cityChanged = city !== listing.city;
    const needsReGeocode = addressChanged || cityChanged;

    // If address/city changed, clear geocode to trigger re-geocoding
    const geocodeReset = needsReGeocode && listing.geocode_source !== 'manual'
      ? {
          latitude: null,
          longitude: null,
          geocoded_at: null,
          geocode_source: null,
          submarket: city === 'Calgary' ? 'Pending' : submarket.trim(),
        }
      : {};

    const finalDisplayAddress = displayAddress.trim() || generateDisplayAddress(address.trim(), building, unit);
    const finalSprinkler = hasSprinklers ? (sprinkler.trim() || 'TBV') : null;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('market_listings')
        .update({
          address: address.trim(),
          display_address: finalDisplayAddress,
          city: city || '',
          submarket: needsReGeocode && city === 'Calgary' ? 'Pending' : submarket.trim(),
          size_sf: parseInt(sizeSf.replace(/,/g, '')) || 0,
          warehouse_sf: warehouseSf ? parseInt(warehouseSf.replace(/,/g, '')) : null,
          office_sf: officeSf ? parseInt(officeSf.replace(/,/g, '')) : null,
          status,
          listing_type: listingType || null,
          asking_rate_psf: askingRate || null,
          op_costs: opCosts || null,
          property_tax: propertyTax || null,
          condo_fees: condoFees || null,
          sale_price: salePrice || null,
          availability_date: availabilityDate || null,
          sublease_exp: subleaseExp || null,
          landlord: landlord || null,
          broker_source: brokerSource || null,
          brochure_link: brochureLink || null,
          website_link: websiteLink || null,
          has_land: hasLand,
          gross_rate: grossRate || null,
          notes_public: notesPublic || null,
          internal_note: internalNote || null,
          clear_height_ft: clearHeight ? parseFloat(clearHeight) : null,
          dock_doors: dockDoors ? parseInt(dockDoors) : null,
          drive_in_doors: driveInDoors ? parseInt(driveInDoors) : null,
          drive_in_door_dimensions: driveInDoorDimensions.filter(d => d.trim() !== ''),
          building_depth: buildingDepth || null,
          power_amps: powerAmps || null,
          voltage: voltage || null,
          sprinkler: finalSprinkler,
          cranes: cranes || null,
          crane_tons: craneTons || null,
          yard: yard ? 'Yes' : 'No',
          yard_area: yardArea || null,
          cross_dock: crossDock ? 'Yes' : 'No',
          trailer_parking: trailerParking || null,
          land_acres: landAcres || null,
          zoning: zoning || null,
          mua: mua ? (muaValue || 'Yes') : 'No',
          is_distribution_warehouse: isDistributionWarehouse,
          calgary_quad: calgaryQuad || null,
          updated_at: new Date().toISOString(),
          last_verified_date: new Date().toISOString().split('T')[0], // Auto-verify on update
          ...geocodeReset,
        })
        .eq('id', listing.id);

      if (error) throw error;

      // Update linked property if exists
      if (listing) {
        // Find property linked to this address
        const { data: linkedProperties } = await supabase
          .from('properties')
          .select('id')
          .ilike('address', address.trim())
          .limit(1);

        if (linkedProperties && linkedProperties.length > 0) {
          const propertyId = linkedProperties[0].id;
          await supabase
            .from('properties')
            .update({
              name: finalDisplayAddress,
              address: address.trim(),
              display_address: finalDisplayAddress,
              city: city || '',
              submarket: needsReGeocode && city === 'Calgary' ? 'Pending' : submarket.trim(),
              size_sf: parseInt(sizeSf.replace(/,/g, '')) || null,
              clear_height_ft: clearHeight ? parseFloat(clearHeight) : null,
              dock_doors: dockDoors ? parseInt(dockDoors) : null,
              drive_in_doors: driveInDoors ? parseInt(driveInDoors) : null,
              zoning: zoning || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', propertyId);
        }
      }

      if (error) throw error;

      // Trigger re-geocoding if address/city changed
      if (needsReGeocode && listing.geocode_source !== 'manual') {
        const { data: session } = await supabase.auth.getSession();
        if (session?.session?.access_token) {
          try {
            const { error: geocodeError, data: geocodeResult } = await supabase.functions.invoke(
              'geocode-market-listing',
              {
                headers: {
                  Authorization: `Bearer ${session.session.access_token}`,
                },
                body: { listingId: listing.listing_id },
              }
            );
            
            if (geocodeError) {
              console.error('[Update Listing] Geocoding error:', geocodeError);
            } else if (geocodeResult?.geocoded) {
              console.log('[Update Listing] Re-geocoded successfully');
              if (geocodeResult.submarket_assigned) {
                toast.success(`Listing updated — submarket: ${geocodeResult.submarket}`);
                clearDraft();
                onSaved();
                onOpenChange(false);
                return;
              }
            }
          } catch (geoErr) {
            console.error('[Update Listing] Geocoding failed:', geoErr);
          }
        }
      }

      toast.success('Listing updated');
      clearDraft();
      onSaved();
      onOpenChange(false);

      // If status was changed to Sold/Leased, open log transaction dialog
      if (status === 'Sold/Leased' && pendingStatus === 'Sold/Leased' && listing) {
        onLogTransaction?.(listing);
      }
    } catch (err) {
      console.error('Error updating listing:', err);
      toast.error('Failed to update listing');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!listing) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('market_listings')
        .delete()
        .eq('id', listing.id);

      if (error) throw error;

      toast.success('Listing deleted');
      clearDraft();
      setShowDeleteConfirm(false);
      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error('Error deleting listing:', err);
      toast.error('Failed to delete listing');
    } finally {
      setIsDeleting(false);
    }
  };

  // For edit mode, require listing - don't render if not available
  // IMPORTANT: This must come BEFORE any hooks that depend on listing
  // But all hooks must be called unconditionally - so we return a closed Dialog
  const handleClose = useCallback(() => {
    clearDraft();
    onOpenChange(false);
  }, [clearDraft, onOpenChange]);

  if (!isCreateMode && !listing) {
    return <Dialog open={false} onOpenChange={() => {}}>
      <DialogContent className="hidden" />
    </Dialog>;
  }

  // Neo-brutalist toggle button component
  const ToggleButton = ({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label?: string }) => (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide border-2 border-foreground transition-all ${
        value 
          ? 'bg-primary text-primary-foreground shadow-[2px_2px_0_hsl(var(--foreground))]' 
          : 'bg-destructive text-destructive-foreground shadow-[2px_2px_0_hsl(var(--foreground))]'
      }`}
      style={{ borderRadius: 'var(--radius)' }}
    >
      {label || (value ? 'Yes' : 'No')}
    </button>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
        <DialogContent 
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          preventOutsideClose
          onCloseClick={handleClose}
        >
          <DialogHeader>
            <DialogTitle>{isCreateMode ? 'Add New Listing' : 'Edit Listing'}</DialogTitle>
            <DialogDescription>
              {isCreateMode 
                ? 'Enter the details for the new market listing.'
                : `${listing?.display_address || listing?.address} • ${listing?.listing_id}`
              }
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="property" className="w-full">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="property" className="flex-1">Property Info</TabsTrigger>
              <TabsTrigger value="specs" className="flex-1">Building Specs</TabsTrigger>
              <TabsTrigger value="pricing" className="flex-1">Pricing & Details</TabsTrigger>
            </TabsList>

            {/* Property Info Tab */}
            <TabsContent value="property" className="space-y-4">
              {/* Address */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">
                  Address *
                </Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  className={`col-span-3 placeholder-light ${address ? 'input-filled' : ''}`}
                  placeholder="e.g., 123 Industrial Way"
                />
              </div>

              {/* Building and Unit - side by side */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">
                  Building / Unit
                </Label>
                <div className="col-span-3 grid grid-cols-2 gap-3">
                  <Input
                    id="building"
                    value={building}
                    onChange={(e) => handleBuildingChange(e.target.value)}
                    className={`placeholder-light ${building ? 'input-filled' : ''}`}
                    placeholder="e.g., Building A"
                  />
                  <Input
                    id="unit"
                    value={unit}
                    onChange={(e) => handleUnitChange(e.target.value)}
                    className={`placeholder-light ${unit ? 'input-filled' : ''}`}
                    placeholder="e.g., Unit 4"
                  />
                </div>
              </div>

              {/* Display Address (read-only preview) */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="displayAddress" className="text-right text-muted-foreground text-xs">
                  Display Address
                </Label>
                <Input
                  id="displayAddress"
                  value={displayAddress}
                  onChange={(e) => handleDisplayAddressChange(e.target.value)}
                  className={`col-span-3 placeholder-light text-sm ${displayAddress ? 'input-filled' : ''}`}
                  placeholder="Auto-generated from address + unit"
                />
              </div>

              {/* City */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="city" className="text-right">
                  City
                </Label>
                <div className="col-span-3">
                  <CityCombobox value={city} onChange={setCity} />
                </div>
              </div>

              {/* Submarket - auto-assigned for Calgary, manual input for others */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="submarket" className="text-right">
                  Submarket {city !== 'Calgary' && '*'}
                </Label>
                {city === 'Calgary' ? (
                  <div className="col-span-3">
                    <Input
                      id="submarket"
                      value={submarket || 'Auto-assigned on save'}
                      readOnly
                      disabled
                      className="bg-muted cursor-not-allowed text-muted-foreground"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Submarket will be auto-assigned based on geocoded location
                    </p>
                  </div>
                ) : (
                  <Input
                    id="submarket"
                    value={submarket}
                    onChange={(e) => setSubmarket(e.target.value)}
                    className={`col-span-3 placeholder-light ${submarket ? 'input-filled' : ''}`}
                    placeholder="e.g., SE Industrial"
                  />
                )}
              </div>

              {/* Status */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Status
                </Label>
                <div className="col-span-3">
                  <Select value={status} onValueChange={handleStatusChange}>
                    <SelectTrigger className={`${getStatusColor(status)} font-semibold`}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {(isCreateMode ? STATUS_OPTIONS_CREATE : STATUS_OPTIONS_EDIT).map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Listing Type */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="listingType" className="text-right">
                  Listing Type
                </Label>
                <div className="col-span-3">
                  <Select value={listingType} onValueChange={setListingType}>
                    <SelectTrigger className={listingType ? 'input-filled' : ''}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {LISTING_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Calgary Quad */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">
                  Calgary Quad.
                </Label>
                <div className="col-span-3">
                  <button
                    type="button"
                    onClick={() => {
                      const cycle = ['', 'NE', 'NW', 'SE', 'SW'];
                      const currentIdx = cycle.indexOf(calgaryQuad);
                      const nextIdx = (currentIdx + 1) % cycle.length;
                      setCalgaryQuad(cycle[nextIdx]);
                    }}
                    className={`px-3 py-2 text-sm font-bold uppercase border-2 border-foreground transition-all shadow-[2px_2px_0_hsl(var(--foreground))] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_hsl(var(--foreground))] ${
                      calgaryQuad === 'NE' ? 'bg-orange-400 text-black'
                      : calgaryQuad === 'SE' ? 'bg-lime-400 text-black'
                      : calgaryQuad === 'NW' ? 'bg-cyan-400 text-black'
                      : calgaryQuad === 'SW' ? 'bg-yellow-300 text-black'
                      : 'bg-muted text-muted-foreground'
                    }`}
                    style={{ borderRadius: 'var(--radius)' }}
                  >
                    {calgaryQuad || '-'}
                  </button>
                </div>
              </div>

              {/* Zoning */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="zoning" className="text-right">
                  Zoning
                </Label>
                <Input
                  id="zoning"
                  value={zoning}
                  onChange={(e) => setZoning(e.target.value)}
                  className={`col-span-3 placeholder-light ${zoning ? 'input-filled' : ''}`}
                  placeholder="e.g., I-G"
                />
              </div>

              {/* Land checkbox */}
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="col-start-2 col-span-3 flex items-center gap-3">
                  <Checkbox
                    id="hasLand"
                    checked={hasLand}
                    onCheckedChange={(checked) => setHasLand(!!checked)}
                  />
                  <Label htmlFor="hasLand" className="text-sm cursor-pointer">Land</Label>
                </div>
              </div>
            </TabsContent>

            {/* Building Specs Tab */}
            <TabsContent value="specs" className="space-y-4">
              {/* SIZING SECTION */}
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-3">Sizing</p>
                <div className="grid grid-cols-2 gap-4">
                  {/* Land Acres */}
                  <div className="space-y-1">
                    <Label className="text-xs">Land Acres</Label>
                    <Input
                      value={landAcres}
                      onChange={(e) => setLandAcres(e.target.value)}
                      className={`placeholder-light ${landAcres ? 'input-filled' : ''}`}
                      placeholder="e.g., 5.2"
                    />
                  </div>

                  {/* Size SF */}
                  <div className="space-y-1">
                    <Label className="text-xs">Size (SF)</Label>
                    <Input
                      value={sizeSf}
                      onChange={(e) => handleFormattedNumberChange(e.target.value, setSizeSf)}
                      onBlur={(e) => handleFormattedNumberBlur(e.target.value, setSizeSf)}
                      className={`placeholder-light ${sizeSf ? 'input-filled' : ''}`}
                      placeholder="e.g., 150,000"
                    />
                  </div>

                  {/* Warehouse SF */}
                  <div className="space-y-1">
                    <Label className="text-xs">Warehouse SF</Label>
                    <Input
                      value={warehouseSf}
                      onChange={(e) => handleFormattedNumberChange(e.target.value, setWarehouseSf)}
                      onBlur={(e) => handleFormattedNumberBlur(e.target.value, setWarehouseSf)}
                      className={`placeholder-light ${warehouseSf ? 'input-filled' : ''}`}
                      placeholder="e.g., 120,000"
                    />
                  </div>

                  {/* Office SF */}
                  <div className="space-y-1">
                    <Label className="text-xs">Office SF</Label>
                    <Input
                      value={officeSf}
                      onChange={(e) => handleFormattedNumberChange(e.target.value, setOfficeSf)}
                      onBlur={(e) => handleFormattedNumberBlur(e.target.value, setOfficeSf)}
                      className={`placeholder-light ${officeSf ? 'input-filled' : ''}`}
                      placeholder="e.g., 5,000"
                    />
                  </div>

                  {/* Ceiling Height */}
                  <div className="space-y-1">
                    <Label className="text-xs">Ceiling Height (ft)</Label>
                    <Input
                      value={clearHeight}
                      onChange={(e) => handleFormattedNumberChange(e.target.value, setClearHeight)}
                      onBlur={(e) => handleFormattedNumberBlur(e.target.value, setClearHeight)}
                      className={`placeholder-light ${clearHeight ? 'input-filled' : ''}`}
                      placeholder="e.g., 32"
                    />
                  </div>

                  {/* Building Depth */}
                  <div className="space-y-1">
                    <Label className="text-xs">Building Depth</Label>
                    <Input
                      value={buildingDepth}
                      onChange={(e) => setBuildingDepth(e.target.value)}
                      className={`placeholder-light ${buildingDepth ? 'input-filled' : ''}`}
                      placeholder="e.g., 200 ft"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* LOADING SECTION */}
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-3">Loading</p>
                <div className="grid grid-cols-2 gap-4">
                  {/* Dock Doors */}
                  <div className="space-y-1">
                    <Label className="text-xs">Dock Doors</Label>
                    <Input
                      value={dockDoors}
                      onChange={(e) => handleFormattedNumberChange(e.target.value, setDockDoors)}
                      onBlur={(e) => handleFormattedNumberBlur(e.target.value, setDockDoors)}
                      className={`placeholder-light ${dockDoors ? 'input-filled' : ''}`}
                      placeholder="e.g., 12"
                    />
                  </div>

                  {/* Drive-In Doors */}
                  <div className="space-y-1">
                    <Label className="text-xs">Drive-In Doors</Label>
                    <Input
                      value={driveInDoors}
                      onChange={(e) => handleFormattedNumberChange(e.target.value, setDriveInDoors)}
                      onBlur={(e) => handleFormattedNumberBlur(e.target.value, setDriveInDoors)}
                      className={`placeholder-light ${driveInDoors ? 'input-filled' : ''}`}
                      placeholder="e.g., 2"
                    />
                  </div>

                  {/* Dynamic drive-in door dimensions */}
                  {(parseInt(driveInDoors) || 0) > 0 && (
                    <DoorDimensionProvider>
                    <div className="col-span-2 space-y-3 p-4 border rounded-lg bg-muted/30">
                      <Label className="text-sm font-medium">
                        Drive-In Door Dimensions
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Enter dimensions for each drive-in door (e.g., 12' x 14')
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Array.from({ length: parseInt(driveInDoors) || 0 }).map((_, index) => (
                          <div key={index} className="space-y-1">
                            <label className="text-xs text-muted-foreground">
                              Door {index + 1}
                            </label>
                            <DoorDimensionCombobox
                              value={driveInDoorDimensions[index] || ''}
                              onChange={(val) => updateDoorDimension(index, val)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    </DoorDimensionProvider>
                  )}

                  {/* Trailer Parking */}
                  <div className="space-y-1">
                    <Label className="text-xs">Trailer Parking</Label>
                    <Input
                      value={trailerParking}
                      onChange={(e) => setTrailerParking(e.target.value)}
                      className={`placeholder-light ${trailerParking ? 'input-filled' : ''}`}
                      placeholder="e.g., 20 stalls"
                    />
                  </div>
                </div>

                {/* Loading checkboxes with inputs */}
                <div className="space-y-3 mt-4">
                  {/* Yard checkbox row */}
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="hasYard"
                      checked={yard}
                      onCheckedChange={(checked) => {
                        setYard(!!checked);
                        if (!checked) {
                          setYardArea('');
                        }
                      }}
                    />
                    <Label htmlFor="hasYard" className="text-sm cursor-pointer">Yard</Label>
                    {yard && (
                      <Input
                        value={yardArea}
                        onChange={(e) => setYardArea(e.target.value)}
                        className={`flex-1 placeholder-light ${yardArea ? 'input-filled' : ''}`}
                        placeholder="e.g., 2 acres"
                      />
                    )}
                  </div>

                  {/* Cross-Dock checkbox row */}
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="hasCrossDock"
                      checked={crossDock}
                      onCheckedChange={(checked) => setCrossDock(!!checked)}
                    />
                    <Label htmlFor="hasCrossDock" className="text-sm cursor-pointer">Cross-Dock</Label>
                  </div>

                  {/* Dist. Warehouse checkbox row */}
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="hasDistWarehouse"
                      checked={isDistributionWarehouse}
                      onCheckedChange={(checked) => setIsDistributionWarehouse(!!checked)}
                    />
                    <Label htmlFor="hasDistWarehouse" className="text-sm cursor-pointer">Dist. Warehouse</Label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* FEATURES SECTION */}
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-3">Features</p>
                <div className="grid grid-cols-2 gap-4">
                  {/* Power Amps */}
                  <div className="space-y-1">
                    <Label className="text-xs">Power Amps</Label>
                    <Input
                      value={powerAmps}
                      onChange={(e) => handleFormattedNumberChange(e.target.value, setPowerAmps)}
                      onBlur={(e) => handleFormattedNumberBlur(e.target.value, setPowerAmps)}
                      className={`placeholder-light ${powerAmps ? 'input-filled' : ''}`}
                      placeholder="e.g., 2,000"
                    />
                  </div>

                  {/* Power Voltage */}
                  <div className="space-y-1">
                    <Label className="text-xs">Power Voltage</Label>
                    <Input
                      value={voltage}
                      onChange={(e) => setVoltage(e.target.value)}
                      className={`placeholder-light ${voltage ? 'input-filled' : ''}`}
                      placeholder="e.g., 600V"
                    />
                  </div>
                </div>

                {/* Sprinklers checkbox row */}
                <div className="flex items-center gap-3 mt-4">
                  <Checkbox
                    id="hasSprinklers"
                    checked={hasSprinklers}
                    onCheckedChange={(checked) => {
                      setHasSprinklers(!!checked);
                      if (!checked) {
                        setSprinkler('');
                      }
                    }}
                  />
                  <Label htmlFor="hasSprinklers" className="text-sm cursor-pointer">Sprinklers</Label>
                  {hasSprinklers && (
                    <Input
                      value={sprinkler}
                      onChange={(e) => setSprinkler(e.target.value)}
                      className={`flex-1 placeholder-light ${sprinkler ? 'input-filled' : ''}`}
                      placeholder="e.g., ESFR"
                    />
                  )}
                </div>

                {/* Cranes checkbox row */}
                <div className="flex items-center gap-3 mt-3">
                  <Checkbox
                    id="hasCranes"
                    checked={hasCranes}
                    onCheckedChange={(checked) => {
                      setHasCranes(!!checked);
                      if (!checked) {
                        setCranes('');
                        setCraneTons('');
                        setCraneTonValues([]);
                      }
                    }}
                  />
                  <Label htmlFor="hasCranes" className="text-sm cursor-pointer">Cranes</Label>
                </div>
                {hasCranes && (
                  <div className="mt-2 ml-7 space-y-3">
                    <div className="space-y-1 max-w-[200px]">
                      <Label className="text-xs">Number of Cranes</Label>
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        value={cranes}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCranes(val);
                          const count = parseInt(val) || 0;
                          const clamped = Math.min(count, 20);
                          setCraneTonValues(prev => {
                            const newArr = Array.from({ length: clamped }, (_, i) => prev[i] || '');
                            return newArr;
                          });
                          // Sync craneTons string
                          const newArr = Array.from({ length: clamped }, (_, i) => craneTonValues[i] || '');
                          setCraneTons(newArr.filter(v => v).join(', '));
                        }}
                        className={`placeholder-light ${cranes ? 'input-filled' : ''}`}
                        placeholder="e.g., 2"
                      />
                    </div>
                    {craneTonValues.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Crane Tonnage</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {craneTonValues.map((val, idx) => (
                            <div key={idx} className="space-y-1">
                              <Label className="text-xs">Crane {idx + 1}</Label>
                              <Input
                                value={val}
                                onChange={(e) => {
                                  const updated = [...craneTonValues];
                                  updated[idx] = e.target.value;
                                  setCraneTonValues(updated);
                                  setCraneTons(updated.filter(v => v).join(', '));
                                }}
                                className={`placeholder-light ${val ? 'input-filled' : ''}`}
                                placeholder="e.g., 10T"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* MUA checkbox row */}
                <div className="flex items-center gap-3 mt-3">
                  <Checkbox
                    id="hasMua"
                    checked={mua}
                    onCheckedChange={(checked) => {
                      setMua(!!checked);
                      if (!checked) {
                        setMuaValue('');
                      }
                    }}
                  />
                  <Label htmlFor="hasMua" className="text-sm cursor-pointer">MUA</Label>
                  {mua && (
                    <Input
                      value={muaValue}
                      onChange={(e) => setMuaValue(e.target.value)}
                      className={`flex-1 placeholder-light ${muaValue ? 'input-filled' : ''}`}
                      placeholder="e.g., TBV"
                    />
                  )}
                </div>

              </div>
            </TabsContent>

            {/* Pricing & Details Tab */}
            <TabsContent value="pricing" className="space-y-4">
              {/* Asking Rate / Op Costs / Gross Rate */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Asking Rate (PSF)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      value={askingRate.replace(/^\$/, '')}
                      onChange={(e) => setAskingRate(e.target.value.replace(/^\$/, ''))}
                      onBlur={() => handlePsfBlur(askingRate, setAskingRate)}
                      className={`pl-7 placeholder-light ${askingRate ? 'input-filled' : ''}`}
                      placeholder="e.g., 12.50"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Op Costs</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      value={opCosts.replace(/^\$/, '')}
                      onChange={(e) => setOpCosts(e.target.value.replace(/^\$/, ''))}
                      onBlur={() => handlePsfBlur(opCosts, setOpCosts)}
                      className={`pl-7 placeholder-light ${opCosts ? 'input-filled' : ''}`}
                      placeholder="e.g., 4.50"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Gross Rate</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      value={grossRate.replace(/^\$/, '')}
                      onChange={(e) => setGrossRate(e.target.value.replace(/^\$/, ''))}
                      onBlur={() => handlePsfBlur(grossRate, setGrossRate)}
                      className={`pl-7 placeholder-light ${grossRate ? 'input-filled' : ''}`}
                      placeholder="Auto-calc or enter"
                    />
                  </div>
                </div>
              </div>

              {/* Sale Price - only show if listing type is Sale or Sale/Lease */}
              {(listingType === 'Sale' || listingType === 'Sale/Lease') && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Sale Price</Label>
                  <div className="col-span-3 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      value={salePrice.replace(/^\$/, '')}
                      onChange={(e) => handleFormattedNumberChange(e.target.value.replace(/^\$/, ''), setSalePrice)}
                      onBlur={(e) => handleFormattedNumberBlur(e.target.value, setSalePrice)}
                      className={`pl-7 placeholder-light ${salePrice ? 'input-filled' : ''}`}
                      placeholder="e.g., 5,000,000"
                    />
                  </div>
                </div>
              )}

              {/* Taxes */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Taxes</Label>
                <div className="col-span-3 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    value={propertyTax.replace(/^\$/, '')}
                    onChange={(e) => setPropertyTax(e.target.value.replace(/^\$/, ''))}
                    onBlur={() => handlePsfBlur(propertyTax, setPropertyTax)}
                    className={`pl-7 placeholder-light ${propertyTax ? 'input-filled' : ''}`}
                    placeholder="e.g., 3.50"
                  />
                </div>
              </div>

              {/* Condo Fees */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Condo Fees</Label>
                <div className="col-span-3 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    value={condoFees.replace(/^\$/, '')}
                    onChange={(e) => setCondoFees(e.target.value.replace(/^\$/, ''))}
                    onBlur={() => handlePsfBlur(condoFees, setCondoFees)}
                    className={`pl-7 placeholder-light ${condoFees ? 'input-filled' : ''}`}
                    placeholder="e.g., 2.00"
                  />
                </div>
              </div>

              {/* Sublease Expiry - only show if listing type is Sublease */}
              {listingType === 'Sublease' && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Sublease Expiry</Label>
                  <Input
                    value={subleaseExp}
                    onChange={(e) => setSubleaseExp(e.target.value)}
                    className={`col-span-3 placeholder-light ${subleaseExp ? 'input-filled' : ''}`}
                    placeholder="e.g., Jan 2025 or Q1 2025"
                  />
                </div>
              )}

              {/* Availability */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Availability</Label>
                <Input
                  value={availabilityDate}
                  onChange={(e) => setAvailabilityDate(e.target.value)}
                  className={`col-span-3 placeholder-light ${availabilityDate ? 'input-filled' : ''}`}
                  placeholder="e.g., Immediate, Q2 2025, or Jan 15, 2025"
                />
              </div>

              {/* Brokerage */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="brokerSource" className="text-right">
                  Brokerage
                </Label>
                <div className="col-span-3">
                  <BrokerageCombobox
                    value={brokerSource}
                    onChange={setBrokerSource}
                  />
                </div>
              </div>

              {/* Landlord */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="landlord" className="text-right">
                  Landlord
                </Label>
                <div className="col-span-3">
                  <LandlordCombobox
                    value={landlord}
                    onChange={setLandlord}
                  />
                </div>
              </div>

              {/* Brochure/Website Link */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="link" className="text-right">
                  Brochure/Website
                </Label>
                <Input
                  id="brochureLink"
                  value={brochureLink}
                  onChange={(e) => setBrochureLink(e.target.value)}
                  className={`col-span-3 placeholder-light ${brochureLink ? 'input-filled' : ''}`}
                  placeholder="e.g., https://..."
                />
              </div>

              {/* Website Link */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="websiteLink" className="text-right">
                  Website Link
                </Label>
                <Input
                  id="websiteLink"
                  value={websiteLink}
                  onChange={(e) => setWebsiteLink(e.target.value)}
                  className={`col-span-3 placeholder-light ${websiteLink ? 'input-filled' : ''}`}
                  placeholder="e.g., https://..."
                />
              </div>

              {/* Notes Section */}
              <div className="border-t pt-4 mt-2">
                <p className="text-sm font-semibold text-muted-foreground mb-3">Notes</p>
              </div>

              {/* Public Notes */}
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="notesPublic" className="text-right pt-2">
                  Public Notes
                </Label>
                <Textarea
                  id="notesPublic"
                  value={notesPublic}
                  onChange={(e) => setNotesPublic(e.target.value)}
                  className={`col-span-3 placeholder-light ${notesPublic ? 'input-filled' : ''}`}
                  rows={2}
                  placeholder="Visible on reports"
                />
              </div>

              {/* Internal Notes */}
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="internalNote" className="text-right pt-2">
                  Internal Notes
                </Label>
                <Textarea
                  id="internalNote"
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  className={`col-span-3 placeholder-light ${internalNote ? 'input-filled' : ''}`}
                  rows={2}
                  placeholder="Private notes (not shown externally)"
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex justify-between sm:justify-between mt-4">
            {!isCreateMode && (
              <Button 
                variant="destructive" 
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSaving || isDeleting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving || isDeleting}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isCreateMode ? 'Create Listing' : 'Save Changes'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Prompt */}
      <AlertDialog open={showTransactionPrompt} onOpenChange={setShowTransactionPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create Transaction Record?</AlertDialogTitle>
            <AlertDialogDescription>
              You're marking this listing as "{pendingStatus}". Would you like to create a transaction 
              record to capture the deal details (price, buyer/tenant, closing date, etc.)?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleSkipTransaction}>
              Skip for Now
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmTransaction}>
              Yes, Create Transaction
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Listing?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{listing?.display_address || listing?.address}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Listing'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
