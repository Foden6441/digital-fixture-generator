# Digital Fixture Generator and Football Competition Management System

A web-based application designed to support the planning and management of football fixtures for Tanzanian football competitions. The platform allows authorized competition administrators to create competitions, register teams, configure venues, generate home-and-away fixtures, assign dates and times, manage postponements, publish approved fixtures, and export professional fixture documents.

## Features

- **Secure Authentication**: Role-based access control for competition administrators
- **Competition Management**: Create and configure football competitions and seasons
- **Team Registration**: Register participating teams with abbreviations and logos
- **Venue Management**: Register and manage football stadiums and approved venues
- **Automated Fixture Generation**: Generate league fixtures using defined scheduling rules
- **Double Round-Robin Support**: Full support for home-and-away competitions
- **Scheduling Interface**: Assign fixture dates, kick-off times, and venues
- **Conflict Detection**: Automatic detection of venue, date, and team conflicts
- **Postponement Management**: Allow authorized users to postpone and reschedule matches
- **Audit History**: Maintain fixture versions and an audit history of important changes
- **Document Export**: Generate printable and downloadable fixture documents (PDF, CSV)
- **Admin Dashboard**: Comprehensive dashboards and reports for competition administrators

## Tech Stack

- **Frontend**: Next.js 16 (React 19) with TypeScript
- **UI Components**: shadcn/ui (built on Radix UI)
- **Styling**: Tailwind CSS v4
- **Database**: MySQL with Prisma ORM
- **Authentication**: NextAuth.js v5
- **PDF Generation**: jsPDF with autoTable
- **Password Hashing**: bcryptjs

## Getting Started

### Prerequisites

- Node.js 18+ installed
- MySQL database server running
- npm or yarn package manager

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd digital-fixture-generator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with:
   ```env
   DATABASE_URL="mysql://root:password@localhost:3306/fixture_generator"
   NEXTAUTH_SECRET="your-secret-key-change-this-in-production"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. Set up the database:
   ```bash
   # Create a MySQL database named 'fixture_generator'
   # Then run migrations
   npx prisma migrate dev --name init

   # Seed the database with an admin user
   npm run seed
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Default Admin Credentials

- Email: `admin@example.com`
- Password: `admin123`

**Important**: Change these credentials in production!

## Usage

1. **Create a Competition**: Navigate to the dashboard and click "Create Competition"
2. **Add Teams**: Register teams that will participate in the competition
3. **Add Venues**: Register stadiums and venues where matches will be played
4. **Generate Fixtures**: Use the fixture generator to create match schedules
5. **Schedule Fixtures**: Assign dates, times, and venues to each fixture
6. **Export**: Download fixtures as PDF or CSV for distribution

## Project Structure

```
digital-fixture-generator/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Database seeding script
├── src/
│   ├── app/                   # Next.js app router
│   │   ├── api/              # API routes
│   │   ├── competitions/     # Competition management pages
│   │   ├── dashboard/        # Admin dashboard
│   │   └── login/            # Authentication page
│   ├── components/           # React components
│   │   └── ui/              # shadcn/ui components
│   ├── lib/                 # Utility functions
│   │   ├── prisma.ts        # Prisma client
│   │   ├── fixtureGenerator.ts  # Fixture generation algorithm
│   │   └── exportFixtures.ts    # Export functions
│   └── types/               # TypeScript type definitions
└── SETUP.md                 # Detailed setup instructions
```

## API Documentation

See [SETUP.md](SETUP.md) for detailed API endpoint documentation.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run seed` - Seed database with admin user

### Database Commands

- `npx prisma migrate dev` - Create and run migrations
- `npx prisma migrate reset` - Reset database and re-run migrations
- `npx prisma studio` - Open Prisma Studio for database management

## License

This project is proprietary software for Tanzanian football competition management.

## Support

For support and questions, please refer to the project documentation or contact the development team.
