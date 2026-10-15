# Supabase Environment Setup

## Add These Variables to Your `.env` File

Open your `.env` file and add these Supabase environment variables at the end:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://cravgrgcpeabwnoiaoxy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## How to Get the Keys:

1. Go to https://supavgrgcpeabwnoiaoxy.supabase.co
2. Click **Settings** → **API** (left sidebar)
3. Copy the keys:
   - **anon/public key** → paste in `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → paste in `SUPABASE_SERVICE_ROLE_KEY`

## Your Updated `.env` Should Look Like:

```env
DATABASE_URL="mysql://root:@localhost:3306/fixture_generator"
NEXTAUTH_SECRET="digital-fixture-generator-secret-key-2024-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://cravgrgcpeabwnoiaoxy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Important Notes:
- Keep your `Ssb_secret__BcIzf_jxOCy4i3hlESZZA_C5o3g_hT` secret - it has full database access
- The `sb_publishable_fiW5fhTgBZvl7FnWtX3aQg_uG-wuPwF` is safe for client-side code
- We'll keep the MySQL DATABASE_URL for now during migration
