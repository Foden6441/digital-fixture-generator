-- Migration to make venues reusable

-- Step 1: Create the competition_venues table without foreign keys
CREATE TABLE competition_venues (
  competitionId VARCHAR(191) NOT NULL,
  venueId VARCHAR(191) NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (competitionId, venueId),
  INDEX idx_venueId (venueId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 2: Migrate existing venue-competition relationships
INSERT INTO competition_venues (competitionId, venueId, createdAt)
SELECT DISTINCT competitionId, id, createdAt
FROM venues
WHERE competitionId IS NOT NULL;

-- Step 3: Drop the competitionId column from venues
ALTER TABLE venues DROP COLUMN competitionId;

-- Step 4: Remove duplicate venue names and add unique constraint
DELETE v1 FROM venues v1
INNER JOIN venues v2
WHERE v1.id > v2.id AND v1.name = v2.name;

ALTER TABLE venues ADD UNIQUE INDEX idx_venue_name (name);

-- Step 5: Add foreign keys to competition_venues
ALTER TABLE competition_venues
ADD CONSTRAINT fk_competition_venues_competition
FOREIGN KEY (competitionId) REFERENCES competitions(id) ON DELETE CASCADE;

ALTER TABLE competition_venues
ADD CONSTRAINT fk_competition_venues_venue
FOREIGN KEY (venueId) REFERENCES venues(id) ON DELETE CASCADE;

-- Step 6: Drop the backup table
DROP TABLE IF EXISTS venues_backup;
