# Supabase Auth Setup

## Configure Email/Password Authentication

1. Go to your Supabase project: https://cravgrgcpeabwnoiaoxy.supabase.co
2. Click **Authentication** (left sidebar - person icon)
3. Click **Providers**
4. Enable **Email** provider:
   - Click on Email
   - Toggle "Enable Email provider" to ON
   - Set "Confirm email" to OFF (for easier testing)
   - Set "Double confirm email" to OFF
   - Click "Save"

5. Configure Email Settings (Optional - for production):
   - Click **URL Configuration**
   - Add your site URL: `http://localhost:3000`
   - Add redirect URLs: `http://localhost:3000/**`
   - Click "Save"

## Create Admin User in Supabase

Option 1: Through Supabase Dashboard
1. Go to **Authentication** → **Users**
2. Click **"Add User"**
3. Click **"Create new user"**
4. Email: `admin@example.com`
5. Password: `admin123` (or your preferred password)
6. Click **"Auto Confirm User"** to skip email verification
7. Click **"Create User"**

Option 2: Through SQL (Recommended - for custom fields)
Run this in SQL Editor:

```sql
-- Insert admin user with custom role
INSERT INTO users (id, email, name, password, role)
VALUES (
  gen_random_uuid(),
  'admin@example.com',
  'Admin User',
  -- Hash this password using bcrypt in your app
  'hashed_password_here',
  'ADMIN'
);
```

Note: For now, we'll use Supabase's built-in users table and link it to our custom users table.

## Next Steps

After setting up auth, we'll:
1. Create a Supabase client utility file
2. Replace NextAuth.js with Supabase Auth
3. Update all authentication-related code
