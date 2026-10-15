# Get Your Supabase Connection String

## Step 1: Check Database Status

1. Go to https://cravgrgcpeabwnoiaoxy.supabase.co
2. Click **Database** (left sidebar)
3. Check the status at the top:
   - If it says **"Paused"** (yellow/red), click **"Resume Database"**
   - Wait 1-2 minutes for it to become **"Active"** (green)

## Step 2: Get Connection String

1. While still in **Database** settings
2. Scroll down to **Connection String** section
3. You'll see different formats:
   - **URI** (recommended)
   - **Transaction Pooler**
   - **Session Pooler**
   - **Direct Connection**

4. Try these in order:

### First Try: Transaction Pooler (Recommended)
- Click **Transaction Pooler**
- Copy the connection string
- It should look like:
  ```
  postgresql://postgres:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
  ```

### If that fails: Session Pooler
- Click **Session Pooler**
- Copy the connection string
- It should look like:
  ```
  postgresql://postgres:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
  ```

### If that fails: Direct Connection
- Click **Direct Connection**
- Copy the connection string
- It should look like:
  ```
  postgresql://postgres:[YOUR-PASSWORD]@db.cravgrgcpeabwnoiaoxy.supabase.co:5432/postgres
  ```

## Step 3: Report Back

Paste the connection string here (with [YOUR-PASSWORD] or the actual password), and I'll:
1. Update your `.env` file
2. Update Prisma schema
3. Run the migration

**Important**: Make sure the database is **Active** before copying the connection string!
