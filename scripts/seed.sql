-- 15 realistic seed listings + photos. Re-runnable via INSERT OR REPLACE.
--
-- Apply with:
--   wrangler d1 execute carsads --remote --file=scripts/seed.sql
--
-- All listings are owned by the fake `seed-seller-carsads-demo` seller —
-- they appear in Browse and Detail views, but Edit / Mark sold / Delete
-- won't be exercisable by real users from these rows.
--
-- Photos point to public Unsplash URLs (no R2 upload needed for seed).

-- Wipe existing seed rows first so re-runs are clean.
DELETE FROM listing_photos WHERE listing_id LIKE 'seed-listing-%';
DELETE FROM listings WHERE id LIKE 'seed-listing-%';

-- ─── Listings ───────────────────────────────────────────────────────────────

INSERT INTO listings (id, title, make, model, year, price_cents, mileage_km, fuel_type, transmission, body_type, color, description, location, lat, lng, contact_email, status, seller_id, seller_login, created_at) VALUES
('seed-listing-001', '2019 Mazda CX-5 GT — Low km, one owner', 'Mazda', 'CX-5 GT', 2019, 3250000, 65000, 'Petrol', 'Automatic', 'SUV', 'Soul Red Crystal', 'Beautifully maintained CX-5 GT with full service history. Heated leather seats, sunroof, head-up display. Just had its 65k service done.', 'Sydney, NSW', -33.8688, 151.2093, 'demo@carsads.example', 'active', 'seed-seller-carsads-demo', 'carsads-demo', strftime('%s', 'now', '-2 hours') * 1000),
('seed-listing-002', '2021 Toyota Hilux SR5 — Tow pack, bull bar', 'Toyota', 'Hilux SR5', 2021, 5890000, 42000, 'Diesel', 'Automatic', 'Ute', 'Glacier White', 'Genuine SR5 with factory tow pack, bull bar, and tub liner. Perfect work truck or weekend tourer. Always serviced at Toyota.', 'Brisbane, QLD', -27.4698, 153.0251, 'demo@carsads.example', 'active', 'seed-seller-carsads-demo', 'carsads-demo', strftime('%s', 'now', '-1 days') * 1000),
('seed-listing-003', '2018 BMW 330i M Sport — Full BMW service history', 'BMW', '330i M Sport', 2018, 4200000, 78000, 'Petrol', 'Automatic', 'Sedan', 'Alpine White', 'M Sport package with red leather interior. Adaptive cruise, lane assist, harman/kardon sound. Recently had brakes and rotors replaced.', 'Melbourne, VIC', -37.8136, 144.9631, 'demo@carsads.example', 'active', 'seed-seller-carsads-demo', 'carsads-demo', strftime('%s', 'now', '-3 days') * 1000),
('seed-listing-004', '2022 Tesla Model 3 Long Range — Enhanced Autopilot', 'Tesla', 'Model 3 Long Range', 2022, 6150000, 28000, 'Electric', 'Automatic', 'Sedan', 'Pearl White', 'Long Range AWD with Enhanced Autopilot. 580km range, sub-4-second 0-100. Tinted windows and Tesla wall charger included.', 'Sydney, NSW', -33.8688, 151.2093, 'demo@carsads.example', 'active', 'seed-seller-carsads-demo', 'carsads-demo', strftime('%s', 'now', '-5 days') * 1000),
('seed-listing-005', '2017 Honda Civic VTi-S — Reliable commuter', 'Honda', 'Civic VTi-S', 2017, 1890000, 95000, 'Petrol', 'CVT', 'Hatchback', 'Crystal Black', 'Honest hatchback in great condition. Excellent fuel economy, reverse camera, Apple CarPlay added. Selling because we upgraded to a bigger family car.', 'Perth, WA', -31.9505, 115.8605, 'demo@carsads.example', 'active', 'seed-seller-carsads-demo', 'carsads-demo', strftime('%s', 'now', '-7 days') * 1000),
('seed-listing-006', '2020 Ford Ranger Wildtrak — Black pack, canopy', 'Ford', 'Ranger Wildtrak', 2020, 5400000, 55000, 'Diesel', 'Automatic', 'Ute', 'True Red', 'Wildtrak with the black appearance pack. Roof rack, ARB canopy, drawer system. Ready for the next adventure.', 'Adelaide, SA', -34.9285, 138.6007, 'demo@carsads.example', 'active', 'seed-seller-carsads-demo', 'carsads-demo', strftime('%s', 'now', '-9 days') * 1000),
('seed-listing-007', '2016 Subaru Outback 2.5i — AWD wagon', 'Subaru', 'Outback 2.5i', 2016, 2250000, 110000, 'Petrol', 'CVT', 'Wagon', 'Carbide Gray', 'Symmetrical AWD wagon, great for Tasmania weather. Roof rails, tow bar, full service history. Bigger boot than most SUVs.', 'Hobart, TAS', -42.8821, 147.3272, 'demo@carsads.example', 'active', 'seed-seller-carsads-demo', 'carsads-demo', strftime('%s', 'now', '-11 days') * 1000),
('seed-listing-008', '2023 Hyundai Ioniq 5 — Almost new, low km', 'Hyundai', 'Ioniq 5', 2023, 6900000, 12000, 'Electric', 'Automatic', 'SUV', 'Lucid Blue', 'Practically new Ioniq 5 with the bigger battery. 480km range, vehicle-to-load power outlets, head-up display. Still under factory warranty.', 'Melbourne, VIC', -37.8136, 144.9631, 'demo@carsads.example', 'active', 'seed-seller-carsads-demo', 'carsads-demo', strftime('%s', 'now', '-14 days') * 1000),
('seed-listing-009', '2015 Volkswagen Golf GTI — Mk7, Performance Pack', 'Volkswagen', 'Golf GTI', 2015, 2490000, 87000, 'Petrol', 'Dual-clutch', 'Hatchback', 'Tornado Red', 'Mk7 GTI with the Performance Pack — bigger brakes, limited-slip diff, extra 10kW. Has had a Stage 1 tune and DSG flash. Mods receipt with sale.', 'Canberra, ACT', -35.2809, 149.1300, 'demo@carsads.example', 'active', 'seed-seller-carsads-demo', 'carsads-demo', strftime('%s', 'now', '-16 days') * 1000),
('seed-listing-010', '2019 Kia Sportage Si — One owner, books available', 'Kia', 'Sportage Si', 2019, 2450000, 72000, 'Petrol', 'Automatic', 'SUV', 'Mineral Silver', 'Family-friendly Sportage with the SI Premium spec. Heated seats, dual-zone climate, reverse camera. Always garaged.', 'Newcastle, NSW', -32.9283, 151.7817, 'demo@carsads.example', 'active', 'seed-seller-carsads-demo', 'carsads-demo', strftime('%s', 'now', '-18 days') * 1000),
('seed-listing-011', '2021 Mercedes-Benz GLA 250 — AMG Line', 'Mercedes-Benz', 'GLA 250 AMG Line', 2021, 5800000, 31000, 'Petrol', 'Automatic', 'SUV', 'Cosmos Black', 'GLA 250 with the AMG Line package. Burmester sound, panoramic roof, ambient lighting. Just had its 30k service at Mercedes.', 'Gold Coast, QLD', -28.0167, 153.4000, 'demo@carsads.example', 'active', 'seed-seller-carsads-demo', 'carsads-demo', strftime('%s', 'now', '-21 days') * 1000),
('seed-listing-012', '2017 Nissan X-Trail ST — Budget-friendly family SUV', 'Nissan', 'X-Trail ST', 2017, 1950000, 102000, 'Petrol', 'CVT', 'SUV', 'Brilliant Silver', 'Roomy 7-seat X-Trail at a great price. Recently serviced, new tyres, new battery. Some marks on the rear bumper otherwise tidy.', 'Wollongong, NSW', -34.4278, 150.8931, 'demo@carsads.example', 'active', 'seed-seller-carsads-demo', 'carsads-demo', strftime('%s', 'now', '-24 days') * 1000),
('seed-listing-013', '2020 Audi A4 35 TFSI — S-line trim', 'Audi', 'A4 35 TFSI', 2020, 4650000, 48000, 'Petrol', 'Automatic', 'Sedan', 'Manhattan Grey', 'S-line A4 with virtual cockpit, 19-inch wheels, Bang and Olufsen sound. Still has 12 months Audi warranty remaining.', 'Melbourne, VIC', -37.8136, 144.9631, 'demo@carsads.example', 'active', 'seed-seller-carsads-demo', 'carsads-demo', strftime('%s', 'now', '-27 days') * 1000),
('seed-listing-014', '2018 Mazda BT-50 XTR — Tropical north workhorse', 'Mazda', 'BT-50 XTR', 2018, 3590000, 89000, 'Diesel', 'Automatic', 'Ute', 'Cool White', 'XTR with leather seats, sat nav, tub liner. Spent its life as a builder''s vehicle — honest km, no off-road abuse.', 'Cairns, QLD', -16.9186, 145.7781, 'demo@carsads.example', 'active', 'seed-seller-carsads-demo', 'carsads-demo', strftime('%s', 'now', '-30 days') * 1000),
('seed-listing-015', '2022 Subaru Forester 2.5i Sport — Eyesight equipped', 'Subaru', 'Forester 2.5i Sport', 2022, 3990000, 22000, 'Petrol', 'CVT', 'SUV', 'Magnetite Gray', 'Sport-spec Forester with Eyesight driver assist. Heated seats, sunroof, X-Mode. Looking for a quick sale before we move overseas.', 'Brisbane, QLD', -27.4698, 153.0251, 'demo@carsads.example', 'active', 'seed-seller-carsads-demo', 'carsads-demo', strftime('%s', 'now', '-32 days') * 1000);

-- ─── Photos ─────────────────────────────────────────────────────────────────
-- 2 photos per listing, rotated across a small set of stable Unsplash URLs.

INSERT INTO listing_photos (id, listing_id, url, position) VALUES
('seed-photo-001-a', 'seed-listing-001', 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80', 0),
('seed-photo-001-b', 'seed-listing-001', 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1200&q=80', 1),
('seed-photo-002-a', 'seed-listing-002', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80', 0),
('seed-photo-002-b', 'seed-listing-002', 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=1200&q=80', 1),
('seed-photo-003-a', 'seed-listing-003', 'https://images.unsplash.com/photo-1503376780353-7e6f7b178087?auto=format&fit=crop&w=1200&q=80', 0),
('seed-photo-003-b', 'seed-listing-003', 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1200&q=80', 1),
('seed-photo-004-a', 'seed-listing-004', 'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1200&q=80', 0),
('seed-photo-004-b', 'seed-listing-004', 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80', 1),
('seed-photo-005-a', 'seed-listing-005', 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1200&q=80', 0),
('seed-photo-005-b', 'seed-listing-005', 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80', 1),
('seed-photo-006-a', 'seed-listing-006', 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=1200&q=80', 0),
('seed-photo-006-b', 'seed-listing-006', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80', 1),
('seed-photo-007-a', 'seed-listing-007', 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1200&q=80', 0),
('seed-photo-007-b', 'seed-listing-007', 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80', 1),
('seed-photo-008-a', 'seed-listing-008', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80', 0),
('seed-photo-008-b', 'seed-listing-008', 'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1200&q=80', 1),
('seed-photo-009-a', 'seed-listing-009', 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=1200&q=80', 0),
('seed-photo-009-b', 'seed-listing-009', 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1200&q=80', 1),
('seed-photo-010-a', 'seed-listing-010', 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80', 0),
('seed-photo-010-b', 'seed-listing-010', 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1200&q=80', 1),
('seed-photo-011-a', 'seed-listing-011', 'https://images.unsplash.com/photo-1503376780353-7e6f7b178087?auto=format&fit=crop&w=1200&q=80', 0),
('seed-photo-011-b', 'seed-listing-011', 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80', 1),
('seed-photo-012-a', 'seed-listing-012', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80', 0),
('seed-photo-012-b', 'seed-listing-012', 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80', 1),
('seed-photo-013-a', 'seed-listing-013', 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1200&q=80', 0),
('seed-photo-013-b', 'seed-listing-013', 'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1200&q=80', 1),
('seed-photo-014-a', 'seed-listing-014', 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=1200&q=80', 0),
('seed-photo-014-b', 'seed-listing-014', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80', 1),
('seed-photo-015-a', 'seed-listing-015', 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1200&q=80', 0),
('seed-photo-015-b', 'seed-listing-015', 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80', 1);
