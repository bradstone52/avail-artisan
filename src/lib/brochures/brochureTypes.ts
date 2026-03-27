export interface BrokerContact {
  name: string
  title: string
  directPhone?: string
  cellPhone?: string
  email: string
  photoUrl?: string
}

export interface DriveTime {
  label: string
  minutes: string
}

export interface BrochureProps {
  type: 'sale' | 'lease' | 'sale-lease'
  accentColor: string // hex with #, e.g. "#6B8F3E"

  // Property
  address: string
  city: string
  province: string
  buildingSF?: string
  landAcres?: string
  clearHeight?: string
  dockDoors?: string
  gradeDoors?: string
  power?: string
  zoning?: string
  occupancy?: string
  district?: string

  // Pricing
  askingPrice?: string
  leaseRate?: string
  leaseType?: string
  operatingCosts?: string

  // Marketing
  headline: string
  highlights: string[]

  // Media
  primaryPhotoUrl?: string
  secondaryPhotoUrl?: string
  aerialPhotoUrl?: string
  floorPlanImageUrl?: string
  logoUrl?: string

  // Location
  latitude?: number
  longitude?: number
  driveTimes: DriveTime[]

  // Brokers
  brokers: BrokerContact[]
  companyName: string
  disclaimer?: string
}
