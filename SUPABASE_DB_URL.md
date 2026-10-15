# Get Supabase Database Connection String

## How to Get Your Database URL:

1. Go to your Supabase project: https://cravgrgcpeabwnoiaoxy.supabase.co
2. Click **Settings** → **Database** (left sidebar)
3. Scroll down to **Connection String**
4. Select **URI** format
5. Copy the connection string
6. Replace the placeholder in your `.env` file

## The Connection String Will Look Like:

```
postgresql://postgres.cravgrgcpeabwnoiaoxy:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

## Important:
- Use the **pooler** connection string (not the direct one) for better performance
- The password is the database password you set when creating the project
- Add this to your `.env` file as `SUPABASE_DATABASE_URL`

## Your `.env` Should Have:

```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.cravgrgcpeabwnoiaoxy.supabase.co:5432/postgres"
NEXTAUTH_SECRET="digital-fixture-generator-secret-key-2024-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://cravgrgcpeabwnoiaoxy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_fiW5fhTgBZvl7FnWtX3aQg_uG-wuPwF
SUPABASE_SERVICE_ROLE_KEY=Ssb_secret__BcIzf_jxOCy4i3hlESZZA_C5o3g_hT

# Supabase Database URL (for Prisma)
SUPABASE_DATABASE_URL=postgresql://postgres.cravgrgcpeabwnoiaoxy:YOUR_ACTUAL_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

Replace `Mahrez@26_B@RoN47` with your actual database password.
