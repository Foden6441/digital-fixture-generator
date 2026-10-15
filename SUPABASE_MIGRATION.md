# Supabase Migration Plan

## Current Status
- **Database**: MySQL (local)
- **Authentication**: NextAuth.js
- **API**: Custom Next.js API routes with Prisma

## Target State
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **API**: Supabase Client (PostgREST)
- **Storage**: Supabase Storage (for logos, documents)

---

## Migration Steps

### Step 1: Supabase Project Setup (CURRENT STEP)
- [ ] Create Supabase account at https://supabase.com
- [ ] Create a new project
- [ ] Get Project URL and API keys
- [ ] Install Supabase client ✅ (DONE)
- [ ] Add environment variables

### Step 2: Database Schema Migration
- [ ] Convert Prisma schema from MySQL to PostgreSQL
- [ ] Create tables in Supabase using SQL or Prisma migrations
- [ ] Migrate existing data from MySQL to Supabase
- [ ] Update Prisma connection string

### Step 3: Authentication Migration
- [ ] Set up Supabase Auth in project settings
- [ ] Configure email/password authentication
- [ ] Create admin user in Supabase
- [ ] Replace NextAuth.js with Supabase Auth
- [ ] Update all auth-related code

### Step 4: API Migration
- [ ] Replace Prisma queries with Supabase client queries
- [ ] Update API routes to use Supabase
- [ ] Set up Row Level Security (RLS) policies
- [ ] Test all CRUD operations

### Step 5: Storage Setup
- [ ] Create Supabase Storage buckets
- [ ] Set up storage policies
- [ ] Migrate competition logos to Supabase Storage
- [ ] Update image upload/download code

### Step 6: Testing & Verification
- [ ] Test authentication flow
- [ ] Test all CRUD operations
- [ ] Test fixture generation
- [ ] Test scheduling and conflict detection
- [ ] Test exports

---

## What You Need to Do Now (Step 1)

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Sign up or log in
   - Click "New Project"
   - Choose a name (e.g., "fixture-generator")
   - Choose a database password (save this!)
   - Choose a region closest to you
   - Click "Create Project"

2. **Get Your Credentials**
   - Once project is created, go to Settings → API
   - Copy:
     - Project URL
     - anon/public key
     - service_role key (keep this secret!)

3. **Report Back**
   - Share your Project URL (you can omit if you prefer)
   - Confirm you have the keys ready
   - I'll then help you add them to the environment variables

---

## Notes
- This migration will require rewriting authentication code
- We'll backup your current setup before making changes
- The migration can be done incrementally to minimize risk
