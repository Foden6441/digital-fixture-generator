-- Drop all tables to let Prisma recreate them
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS fixtures CASCADE;
DROP TABLE IF EXISTS competition_venues CASCADE;
DROP TABLE IF EXISTS competition_teams CASCADE;
DROP TABLE IF EXISTS venues CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS competitions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop enums
DROP TYPE IF EXISTS "UserRole" CASCADE;
DROP TYPE IF EXISTS "CompetitionStatus" CASCADE;
DROP TYPE IF EXISTS "CompetitionFormat" CASCADE;
DROP TYPE IF EXISTS "FixtureStatus" CASCADE;

SELECT 'All tables dropped successfully!' as status;
