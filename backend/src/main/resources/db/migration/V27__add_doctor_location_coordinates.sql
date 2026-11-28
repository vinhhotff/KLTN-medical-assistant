-- V27: Add clinic location & coordinates to doctor_profiles for Clinical-First Proximity Ranking

ALTER TABLE doctor_profiles
    ADD COLUMN IF NOT EXISTS city VARCHAR(100),
    ADD COLUMN IF NOT EXISTS district VARCHAR(100),
    ADD COLUMN IF NOT EXISTS clinic_address VARCHAR(255),
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Backfill coordinates for seeded hospitals in Vietnam
UPDATE doctor_profiles
SET city = 'TP. Hồ Chí Minh',
    district = 'Quận 5',
    clinic_address = '215 Hồng Bàng, Phường 11, Quận 5, TP. Hồ Chí Minh',
    latitude = 10.7553,
    longitude = 106.6634
WHERE hospital_affiliation ILIKE '%Đại Học Y Dược%'
  AND latitude IS NULL;

UPDATE doctor_profiles
SET city = 'TP. Hồ Chí Minh',
    district = 'Quận 5',
    clinic_address = '201B Nguyễn Chí Thanh, Phường 12, Quận 5, TP. Hồ Chí Minh',
    latitude = 10.7574,
    longitude = 106.6596
WHERE hospital_affiliation ILIKE '%Chợ Rẫy%'
  AND latitude IS NULL;

UPDATE doctor_profiles
SET city = 'TP. Hồ Chí Minh',
    district = 'Quận 10',
    clinic_address = '341 Sư Vạn Hạnh, Phường 10, Quận 10, TP. Hồ Chí Minh',
    latitude = 10.7689,
    longitude = 106.6697
WHERE hospital_affiliation ILIKE '%Nhi Đồng 1%'
  AND latitude IS NULL;

UPDATE doctor_profiles
SET city = 'TP. Hồ Chí Minh',
    district = 'Quận 1',
    clinic_address = '284 Cống Quỳnh, Phường Phạm Ngũ Lão, Quận 1, TP. Hồ Chí Minh',
    latitude = 10.7675,
    longitude = 106.6836
WHERE hospital_affiliation ILIKE '%Từ Dũ%'
  AND latitude IS NULL;

UPDATE doctor_profiles
SET city = 'Hà Nội',
    district = 'Quận Đống Đa',
    clinic_address = '78 Giải Phóng, Phương Mai, Đống Đa, Hà Nội',
    latitude = 21.0023,
    longitude = 105.8412
WHERE hospital_affiliation ILIKE '%Bạch Mai%'
  AND latitude IS NULL;

UPDATE doctor_profiles
SET city = 'Hà Nội',
    district = 'Quận Hoàn Kiếm',
    clinic_address = '40 Tràng Thi, Hàng Bông, Hoàn Kiếm, Hà Nội',
    latitude = 21.0268,
    longitude = 105.8467
WHERE hospital_affiliation ILIKE '%Việt Đức%'
  AND latitude IS NULL;

UPDATE doctor_profiles
SET city = 'Hà Nội',
    district = 'Quận Hai Bà Trưng',
    clinic_address = '1 Trần Hưng Đạo, Bạch Đằng, Hai Bà Trưng, Hà Nội',
    latitude = 21.0185,
    longitude = 105.8602
WHERE (hospital_affiliation ILIKE '%108%' OR hospital_affiliation ILIKE '%Quân Y%')
  AND latitude IS NULL;

UPDATE doctor_profiles
SET city = 'Đà Nẵng',
    district = 'Quận Hải Châu',
    clinic_address = '124 Hải Phòng, Thạch Thang, Hải Châu, Đà Nẵng',
    latitude = 16.0721,
    longitude = 108.2156
WHERE hospital_affiliation ILIKE '%Đà Nẵng%'
  AND latitude IS NULL;

-- Default fallback for any remaining TP.HCM or unmapped hospital affiliations
UPDATE doctor_profiles
SET city = COALESCE(city, CASE
        WHEN hospital_affiliation ILIKE '%Hà Nội%' THEN 'Hà Nội'
        WHEN hospital_affiliation ILIKE '%Đà Nẵng%' THEN 'Đà Nẵng'
        ELSE 'TP. Hồ Chí Minh'
    END),
    district = COALESCE(district, CASE
        WHEN hospital_affiliation ILIKE '%Hà Nội%' THEN 'Quận Đống Đa'
        WHEN hospital_affiliation ILIKE '%Đà Nẵng%' THEN 'Quận Hải Châu'
        ELSE 'Quận 10'
    END),
    latitude = COALESCE(latitude, CASE
        WHEN hospital_affiliation ILIKE '%Hà Nội%' THEN 21.0278
        WHEN hospital_affiliation ILIKE '%Đà Nẵng%' THEN 16.0544
        ELSE 10.7769
    END),
    longitude = COALESCE(longitude, CASE
        WHEN hospital_affiliation ILIKE '%Hà Nội%' THEN 105.8342
        WHEN hospital_affiliation ILIKE '%Đà Nẵng%' THEN 108.2022
        ELSE 106.7009
    END)
WHERE latitude IS NULL;
