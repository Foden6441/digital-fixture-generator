# Digital Fixture Generator - Setup Instructions

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="mysql://root:password@localhost:3306/fixture_generator"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

## Database Setup

1. Create a MySQL database named `fixture_generator`
2. Run Prisma migrations:
   ```bash
   npx prisma migrate dev --name init
   ```
3. Seed the database with an admin user:
   ```bash
   npm run seed
   ```

## Default Admin Credentials

After seeding, you can log in with:
- Email: `admin@example.com`
- Password: `admin123`

**Important:** Change these credentials in production!

## Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

- `/src/app` - Next.js app router pages
- `/src/components` - React components (including shadcn/ui)
- `/src/lib` - Utility functions (Prisma client, fixture generator, export functions)
- `/prisma` - Database schema and migrations

## Features Implemented

1. **Authentication & Authorization**
   - NextAuth.js with credentials provider
   - Role-based access (ADMIN, ORGANIZER, VIEWER)
   - Secure session management

2. **Competition Management**
   - Create, view, and edit competitions
   - Support for different formats (Single/Double Round-Robin, Knockout)
   - Competition status tracking (DRAFT, PUBLISHED, COMPLETED, CANCELLED)

3. **Team Management**
   - Register teams for competitions
   - Team abbreviations and logos
   - Delete teams

4. **Venue Management**
   - Register stadiums and venues
   - Location and capacity tracking
   - Delete venues

5. **Fixture Generation**
   - Automatic fixture generation for round-robin formats
   - Double round-robin support (home and away)
   - Knockout tournament support
   - Matchday organization

6. **Fixture Scheduling**
   - Assign dates, times, and venues to fixtures
   - Real-time conflict detection
   - Venue conflicts (same venue, same time)
   - Team conflicts (same team playing at same time)

7. **Postponement & Rescheduling**
   - Postpone matches with reasons
   - Reschedule to new dates
   - Audit trail of changes

8. **Audit History**
   - Track all changes to competitions and fixtures
   - Version tracking for fixtures
   - User attribution for all actions

9. **Export Functionality**
   - Export fixtures as PDF
   - Export fixtures as CSV
   - Professional document generation

10. **Admin Dashboard**
    - Overview statistics
    - Competition listing
    - Quick access to management features

## API Endpoints

- `POST /api/competitions` - Create competition
- `GET /api/competitions/[id]` - Get competition details
- `PATCH /api/competitions/[id]` - Update competition
- `GET /api/competitions/[id]/teams` - Get teams
- `POST /api/competitions/[id]/teams` - Add team
- `DELETE /api/competitions/[id]/teams/[teamId]` - Delete team
- `GET /api/competitions/[id]/venues` - Get venues
- `POST /api/competitions/[id]/venues` - Add venue
- `DELETE /api/competitions/[id]/venues/[venueId]` - Delete venue
- `GET /api/competitions/[id]/fixtures` - Get fixtures
- `POST /api/competitions/[id]/fixtures/generate` - Generate fixtures
- `DELETE /api/competitions/[id]/fixtures` - Clear fixtures
- `PATCH /api/competitions/[id]/fixtures/[fixtureId]` - Update fixture
- `POST /api/competitions/[id]/fixtures/check-conflicts` - Check scheduling conflicts
- `POST /api/competitions/[id]/fixtures/[fixtureId]/reschedule` - Reschedule fixture
- `GET /api/competitions/[id]/audit` - Get audit history

## Production Deployment

1. Set secure environment variables
2. Change default admin credentials
3. Enable HTTPS
4. Configure production database
5. Run `npm run build` to build the application
6. Use `npm start` to run the production server
