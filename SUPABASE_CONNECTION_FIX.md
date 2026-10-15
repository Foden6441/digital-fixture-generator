# Fix Supabase Connection

## Step 1: Check Database Status

1. Go to https://cravgrgcpeabwnoiaoxy.supabase.co
2. Click **Database** (left sidebar)
3. Check if the database is **Active** (green status)
4. If it says "Paused", click **Resume Database**

## Step 2: Get Correct Connection String

1. In Supabase, go to **Settings** → **Database**
2. Scroll down to **Connection String**
3. Try each of these formats one by one:

### Format 1: Direct Connection (Try First)
```
postgresql://postgres:Mahrez@26_B@RoN47@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

### Format 2: Transaction Pooler
```
postgresql://postgres:Mahrez@26_B@RoN47@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### Format 3: Session Pooler
```
postgresql://postgres:Mahrez@26_B@RoN47@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

### Format 4: IPv4 Connection
```
postgresql://postgres:Mahrez@26_B@RoN47@aws-0-us-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true
```

## Step 3: Test Connection

Once you have a working connection string:
1. Update your `.env` file
2. Change DATABASE_URL to the working connection string
3. Run: `npx prisma db push` (instead of migrate dev)
4. If successful, the tables will be created in Supabase

## Step 4: Report Back

Let me know:
- Is the database status "Active" or "Paused"?
- Which connection string format worked?
- Any error messages you see

I'll then help you complete the migration!
