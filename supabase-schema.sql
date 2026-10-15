-- Supabase Database Schema for Digital Fixture Generator
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (will be replaced by Supabase Auth eventually)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'ADMIN' CHECK (role IN ('ADMIN', 'ORGANIZER', 'VIEWER')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Competitions table
CREATE TABLE IF NOT EXISTS competitions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  logo TEXT,
  primary_color TEXT DEFAULT '#191B52',
  season TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED')),
  format TEXT DEFAULT 'DOUBLE_ROUND_ROBIN' CHECK (format IN ('SINGLE_ROUND_ROBIN', 'DOUBLE_ROUND_ROBIN', 'KNOCKOUT', 'GROUP_STAGE')),
  group_size INTEGER DEFAULT 4,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT competitions_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  abbreviation TEXT,
  logo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Competition Teams join table
CREATE TABLE IF NOT EXISTS competition_teams (
  competition_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (competition_id, team_id),
  CONSTRAINT competition_teams_competition_id_fkey FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
  CONSTRAINT competition_teams_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Venues table
CREATE TABLE IF NOT EXISTS venues (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  location TEXT,
  capacity INTEGER,
  home_team_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT venues_home_team_id_fkey FOREIGN KEY (home_team_id) REFERENCES teams(id) ON DELETE SET NULL
);

-- Competition Venues join table
CREATE TABLE IF NOT EXISTS competition_venues (
  competition_id TEXT NOT NULL,
  venue_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (competition_id, venue_id),
  CONSTRAINT competition_venues_competition_id_fkey FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
  CONSTRAINT competition_venues_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE
);

-- Fixtures table
CREATE TABLE IF NOT EXISTS fixtures (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id TEXT NOT NULL,
  home_team_id TEXT NOT NULL,
  away_team_id TEXT NOT NULL,
  venue_id TEXT,
  match_date TIMESTAMP WITH TIME ZONE,
  kickoff_time TEXT,
  matchday INTEGER,
  group_number INTEGER,
  status TEXT DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'POSTPONED', 'PLAYED', 'CANCELLED')),
  notes TEXT,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fixtures_competition_id_fkey FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
  CONSTRAINT fixtures_home_team_id_fkey FOREIGN KEY (home_team_id) REFERENCES teams(id),
  CONSTRAINT fixtures_away_team_id_fkey FOREIGN KEY (away_team_id) REFERENCES teams(id),
  CONSTRAINT fixtures_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES venues(id),
  CONSTRAINT fixtures_unique_match UNIQUE (competition_id, home_team_id, away_team_id, matchday)
);

-- Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  changes TEXT,
  performed_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT audit_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_competition_teams_team_id ON competition_teams(team_id);
CREATE INDEX IF NOT EXISTS idx_competition_venues_venue_id ON competition_venues(venue_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_competition_id ON fixtures(competition_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_home_team_id ON fixtures(home_team_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_away_team_id ON fixtures(away_team_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_venue_id ON fixtures(venue_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_match_date ON fixtures(match_date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Create a function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competitions_updated_at BEFORE UPDATE ON competitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON venues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fixtures_updated_at BEFORE UPDATE ON fixtures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
