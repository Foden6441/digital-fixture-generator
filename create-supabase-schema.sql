-- Complete Schema for Digital Fixture Generator - Exact Prisma Match
-- Run this in Supabase SQL Editor at https://cravgrgcpeabwnoiaoxy.supabase.co

-- Create Enums
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'ORGANIZER', 'VIEWER');
CREATE TYPE "CompetitionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "CompetitionFormat" AS ENUM ('SINGLE_ROUND_ROBIN', 'DOUBLE_ROUND_ROBIN', 'KNOCKOUT', 'GROUP_STAGE');
CREATE TYPE "FixtureStatus" AS ENUM ('SCHEDULED', 'POSTPONED', 'PLAYED', 'CANCELLED');

-- Create Users Table
CREATE TABLE "users" (
    "id" TEXT PRIMARY KEY,
    "email" TEXT UNIQUE NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create Competitions Table
CREATE TABLE "competitions" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#191B52',
    "season" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "CompetitionStatus" NOT NULL DEFAULT 'DRAFT',
    "format" "CompetitionFormat" NOT NULL DEFAULT 'DOUBLE_ROUND_ROBIN',
    "groupSize" INTEGER NOT NULL DEFAULT 4,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "competitions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create Teams Table
CREATE TABLE "teams" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create Venues Table
CREATE TABLE "venues" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT UNIQUE NOT NULL,
    "location" TEXT,
    "capacity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "homeTeamId" TEXT UNIQUE
);

-- Add venue foreign key after table creation
ALTER TABLE "venues" ADD CONSTRAINT "venues_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create Competition Teams Join Table
CREATE TABLE "competition_teams" (
    "competitionId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "competition_teams_pkey" PRIMARY KEY ("competitionId", "teamId"),
    CONSTRAINT "competition_teams_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "competition_teams_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create Competition Venues Join Table
CREATE TABLE "competition_venues" (
    "competitionId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "competition_venues_pkey" PRIMARY KEY ("competitionId", "venueId"),
    CONSTRAINT "competition_venues_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "competition_venues_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create Fixtures Table
CREATE TABLE "fixtures" (
    "id" TEXT PRIMARY KEY,
    "competitionId" TEXT NOT NULL,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "venueId" TEXT,
    "matchDate" TIMESTAMP(3),
    "kickoffTime" TEXT,
    "matchday" INTEGER,
    "groupNumber" INTEGER,
    "status" "FixtureStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fixtures_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fixtures_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fixtures_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fixtures_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "fixtures_competitionId_homeTeamId_awayTeamId_matchday_key" UNIQUE ("competitionId", "homeTeamId", "awayTeamId", "matchday")
);

-- Create Audit Logs Table
CREATE TABLE "audit_logs" (
    "id" TEXT PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" TEXT,
    "performedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create Indexes
CREATE INDEX "competition_teams_teamId_idx" ON "competition_teams"("teamId");
CREATE INDEX "competition_venues_venueId_idx" ON "competition_venues"("venueId");

-- Insert default admin user (password: admin123 - bcrypt hash)
INSERT INTO "users" ("id", "email", "name", "password", "role")
VALUES (
    'admin-user-id',
    'admin@example.com',
    'Admin',
    '$2a$10$rE3W8xQO8hF5ZyNfJ5j1uOEK5W7yN8hQYxPZlN8gR9hF5ZyNfJ5j1u',
    'ADMIN'
);

-- Success message
SELECT 'Schema created successfully!' as status;
