import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dbQuery } from '../sdk.ts'
import { validatePostForm, type FormState } from '../views/Post.tsx'

const query = vi.hoisted(() => vi.fn())

vi.mock('@proappstore/sdk', () => ({
  initPro: () => ({ db: { query } }),
}))

const validForm: FormState = {
  title: '2026 Example Car',
  make: 'Toyota',
  model: 'Example',
  year: '2026',
  price: '25000',
  mileage: '100',
  fuel_type: '',
  transmission: '',
  body_type: '',
  color: '',
  description: '',
  location: 'Melbourne, VIC',
  contact_email: '',
  lat: null,
  lng: null,
}

describe('listing form validation', () => {
  it.each(['', 'not-a-number', '-1', '1.5'])('rejects invalid mileage %j', mileage => {
    expect(validatePostForm({ ...validForm, mileage })).toBe('Mileage is required.')
  })

  it('accepts zero mileage for a new vehicle', () => {
    expect(validatePostForm({ ...validForm, mileage: '0' })).toBeNull()
  })

  it('rejects an invalid optional contact email', () => {
    expect(validatePostForm({ ...validForm, contact_email: 'not-an-email' })).toBe('A valid contact email is required.')
  })
})

describe('dbQuery', () => {
  beforeEach(() => query.mockReset())

  it('propagates worker failures to its caller', async () => {
    query.mockRejectedValueOnce(new Error('worker unavailable'))

    await expect(dbQuery('SELECT 1')).rejects.toThrow('worker unavailable')
  })
})
