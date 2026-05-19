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

export interface Message {
  id: string
  listing_id: string
  buyer_id: string
  buyer_login: string | null
  sender_id: string
  sender_login: string | null
  content: string
  created_at: number
}

export interface ThreadSummary {
  listing_id: string
  listing_title: string
  listing_cover: string | null
  seller_id: string
  seller_login: string | null
  buyer_id: string
  buyer_login: string | null
  latest_content: string
  latest_at: number
  message_count: number
}

export type View =
  | { kind: 'browse' }
  | { kind: 'detail'; id: string }
  | { kind: 'post' }
  | { kind: 'edit'; id: string }
  | { kind: 'mine' }
  | { kind: 'saved' }
  | { kind: 'inbox' }
  | { kind: 'chat'; listingId: string; buyerId: string }

export type Sort = 'newest' | 'price-asc' | 'price-desc' | 'year-desc' | 'mileage-asc'

export const SORT_LABELS: Record<Sort, string> = {
  'newest': 'Newest first',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  'year-desc': 'Year: newest first',
  'mileage-asc': 'Mileage: lowest first',
}

export interface Filters {
  q: string
  make: string
  bodyType: string
  fuelType: string
  minPrice: string
  maxPrice: string
  minYear: string
  maxYear: string
  sort: Sort
}

export const EMPTY_FILTERS: Filters = {
  q: '',
  make: '',
  bodyType: '',
  fuelType: '',
  minPrice: '',
  maxPrice: '',
  minYear: '',
  maxYear: '',
  sort: 'newest',
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

export const COMMON_MAKES = [
  'Toyota', 'Honda', 'Ford', 'BMW', 'Mercedes-Benz', 'Volkswagen',
  'Mazda', 'Hyundai', 'Kia', 'Subaru', 'Nissan', 'Audi', 'Tesla', 'Other',
] as const
