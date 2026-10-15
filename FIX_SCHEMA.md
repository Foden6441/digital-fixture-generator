# Fix Schema - Drop Tables and Let Prisma Recreate

## Problem:
The tables in Supabase don't match the Prisma schema exactly.

## Solution:
Let Prisma recreate the tables with the correct structure.

## Steps:

### Step 1: Drop All Tables in Supabase

1. Go to https://cravgrgcpeabwnoiaoxy.supabase.co
2. Click **SQL Editor** (left sidebar)
3. Click **"New Query"**
4. Open the file: `drop-all-tables.sql` in your project
5. Copy all the SQL code
6. Paste it into the SQL Editor
7. Click **"Run"**

This will drop all existing tables.

### Step 2: Let Prisma Recreate Tables

After you run the drop SQL, let me know and I'll run:
```bash
npx prisma db push
```

This will recreate all tables with the exact structure Prisma expects.

### Step 3: Add Admin User

After Prisma creates the tables, I'll add the admin user back.

## After Running the Drop SQL:

Let me know when you've completed Step 1, and I'll continue with Steps 2 and 3.
