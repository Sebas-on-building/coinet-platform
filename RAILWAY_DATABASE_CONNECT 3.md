# 🔗 Connect Existing PostgreSQL to coinet-platform

## You Already Have PostgreSQL! ✅

I can see you have a **Postgres** service already deployed. Now we just need to connect it to `coinet-platform`.

## Step-by-Step: Share DATABASE_URL

### 1. Click on the Postgres Service Card
   - **Location**: Bottom right of your Architecture view
   - **Look for**: Blue PostgreSQL elephant logo
   - **Click**: The entire Postgres card

### 2. Open Variables Tab
   - Once inside the Postgres service page
   - Click on the **"Variables"** tab (usually near the top)
   - You'll see `DATABASE_URL` listed there

### 3. Share DATABASE_URL with coinet-platform
   - Find `DATABASE_URL` in the list
   - Click the **"..."** (three dots menu) next to `DATABASE_URL`
   - Select **"Add to Service"** or **"Share Variable"**
   - In the dialog that appears:
     - ✅ Check the box next to **"coinet-platform"**
     - Click **"Add"** or **"Confirm"**

### 4. Wait for Redeploy
   - Railway will automatically redeploy `coinet-platform` with the new variable
   - This takes ~1-2 minutes
   - You'll see a new deployment appear in the `coinet-platform` service

### 5. Run Database Migrations
   After redeploy completes:

   **Option A: Via Web UI (Easiest)**
   - Go back to Architecture view
   - Click on **`coinet-platform`** service card (middle right)
   - Click **"Deployments"** tab
   - Find the latest deployment (should be active/green)
   - Click **"..."** (three dots) → **"Run Command"**
   - Enter: `npx prisma migrate deploy --schema=./prisma/schema.prisma`
   - Click **"Run"**

   **Option B: Via Railway CLI**
   ```bash
   railway run npx prisma migrate deploy --schema=./prisma/schema.prisma
   ```

### 6. Verify Connection
   - Check deployment logs for: `✅ Database connected`
   - Visit: `https://your-coinet-platform-url.railway.app/api/health`
   - Should show: `"database": { "healthy": true }`

## ✅ Done!

Once migrations complete, your database will have all tables created and `coinet-platform` will be fully connected!

