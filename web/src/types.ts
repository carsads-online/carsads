export interface Listing {
  id: string
  title: string
  make: string
  model: string
  year: number
  price_cents: number
  mileage_km: number
  fuel_type: string | null
  transmission: string | null
  body_type: string | null
  color: string | null
  description: string | null
  location: string
  lat: number | null
  lng: number | null
  contact_email: string | null
  status: 'active' | 'sold' | 'draft'
  seller_id: string
  seller_login: string | null
  created_at: number
}

export interface ListingPhoto {
  id: string
  listing_id: string
  url: string
  position: number
}

export interface ListingWithPhotos extends Listing {
  photos: ListingPhoto[]
}

export type View =
  | { kind: 'browse' }
  | { kind: 'detail'; id: string }
  | { kind: 'post' }
  | { kind: 'edit'; id: string }
  | { kind: 'mine' }
  | { kind: 'saved' }

export interface Filters {
  q: string
  make: string
  minPrice: string
  maxPrice: string
  minYear: string
  maxYear: string
}

export const EMPTY_FILTERS: Filters = {
  q: '',
  make: '',
  minPrice: '',
  maxPrice: '',
  minYear: '',
  maxYear: '',
}

export const FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'LPG', 'Other'] as const
export const TRANSMISSIONS = ['Manual', 'Automatic', 'CVT', 'Dual-clutch'] as const
export const BODY_TYPES = [
  'Sedan',
  'Hatchback',
  'SUV',
  'Wagon',
  'Coupe',
  'Convertible',
  'Ute',
  'Van',
  'Truck',
] as const
