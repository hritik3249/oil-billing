# 🛢 Oil Billing System

A full-stack billing and management system for oil businesses.  
Built with **Next.js 14**, **Tailwind CSS**, **Supabase** (PostgreSQL), and a thermal-printer-friendly invoice system.

---

## 📁 Folder Structure

```
oil-billing/
├── app/
│   ├── api/
│   │   ├── auth/route.ts          # Login / logout API
│   │   ├── customers/route.ts     # Customer CRUD API
│   │   ├── bills/route.ts         # Bills CRUD API
│   │   └── dashboard/route.ts     # Dashboard stats API
│   ├── login/page.tsx             # Login screen
│   ├── dashboard/
│   │   ├── layout.tsx             # Auth-protected layout
│   │   └── page.tsx               # Dashboard with charts
│   ├── customers/
│   │   ├── layout.tsx
│   │   └── page.tsx               # Customer management
│   ├── bills/
│   │   ├── layout.tsx
│   │   ├── page.tsx               # Bills list with filters
│   │   ├── new/page.tsx           # Create new bill
│   │   └── [id]/page.tsx          # Bill detail + print
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                   # Redirects to dashboard/login
├── components/
│   ├── layout/Navbar.tsx          # Top + bottom navigation
│   └── invoice/Invoice.tsx        # Printable invoice (thermal)
├── lib/
│   ├── supabase.ts                # Supabase client
│   ├── constants.ts               # Oil types, formatters
│   └── auth.ts                    # Cookie auth helpers
├── types/index.ts                 # TypeScript types
├── supabase-setup.sql             # DB schema + sample data
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── .env.local.example
```

---

## 🚀 Quick Start

### Step 1: Clone & Install

```bash
# Clone or unzip the project
cd oil-billing
npm install
```

### Step 2: Set Up Supabase

1. Go to [https://supabase.com](https://supabase.com) and create a **free account**
2. Click **"New Project"** — choose a name like `oil-billing`
3. Set a strong database password (save it!)
4. Wait ~2 minutes for the project to be created

**Get your API keys:**
- Go to **Project Settings → API**
- Copy: `Project URL` and `anon public` key and `service_role` key

### Step 3: Run Database Setup

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy-paste the entire contents of `supabase-setup.sql`
4. Click **Run** (▶ button)
5. You should see "Success. No rows returned"

### Step 4: Configure Environment Variables

```bash
# Copy the example file
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourStrongPassword123

NEXTAUTH_SECRET=any-random-string-here-32-chars-min
NEXT_PUBLIC_APP_NAME=Oil Billing System
```

> ⚠️ **Change the default password!** Do not use `oilbiz2024` in production.

### Step 5: Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Login with the credentials from your `.env.local` file.

---

## 🛠 Customizing Oil Types

Edit `lib/constants.ts` to change oil names and rates:

```ts
export const OIL_TYPES: OilType[] = [
  { id: 'engine_oil', name: 'Engine Oil', rate: 450, unit: 'jar' },
  { id: 'gear_oil',   name: 'Gear Oil',   rate: 380, unit: 'jar' },
  { id: 'brake_oil',  name: 'Brake Oil',  rate: 220, unit: 'jar' },
  { id: 'grease',     name: 'Grease',     rate: 180, unit: 'jar' },
]
```

You can add more oil types here. The UI will automatically show them in the dropdown.

---

## 🖨 Print / Invoice System

### Thermal Printer (58mm / 80mm)
- Click **"Print"** button on any bill detail page
- The invoice is formatted for thermal printers
- Uses monospace font optimized for receipt printers
- Compatible with most POS thermal printers

### PDF Generation
- Click **"PDF"** button on any bill detail page
- Generates an A5-sized PDF automatically
- Downloads as `BILL-NUMBER.pdf`

### Auto-print on Save
- Click **"Save & Print"** when creating a bill
- It saves the bill AND immediately opens the print dialog

---

## ☁️ Deploy to Vercel

### Option A: GitHub (Recommended)

1. Push your code to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
gh repo create oil-billing --public --push
```

2. Go to [https://vercel.com](https://vercel.com)
3. Click **"Add New Project"**
4. Import your GitHub repository
5. In **Environment Variables**, add all variables from `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `NEXTAUTH_SECRET`
6. Click **Deploy**
7. Your app will be live at `https://your-project.vercel.app`

### Option B: Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

Follow the prompts. When asked about environment variables, paste them from your `.env.local`.

---

## 📱 Features

| Feature | Details |
|---|---|
| **Login** | Secure cookie-based admin login |
| **Dashboard** | Total sales, pending dues, daily sales, oil-wise chart |
| **Customers** | Add/edit/delete, search by name |
| **Bills** | Create bills with multiple oil items |
| **Filters** | Search by name, date range, due-only |
| **Invoice** | Thermal-printer-friendly receipt |
| **PDF** | A5 PDF download via jsPDF |
| **Mobile** | Bottom navigation, large touch targets |
| **Payment** | Update paid amount, track due balance |

---

## 🔒 Security Notes

1. Change default admin credentials in `.env.local`
2. The `SUPABASE_SERVICE_ROLE_KEY` is only used server-side (in API routes) — never exposed to the browser
3. All API routes check the `oil_admin_auth` cookie before executing
4. For production, use a strong `NEXTAUTH_SECRET` (at least 32 random characters)

Generate a strong secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🐛 Troubleshooting

**"Invalid credentials" on login:**
- Check `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env.local`
- Restart the dev server after changing env vars

**"Error saving bill":**
- Check Supabase URL and keys in `.env.local`
- Make sure you ran `supabase-setup.sql` in the SQL Editor
- Check Supabase dashboard → Table Editor for `bills` and `customers` tables

**Supabase connection issues:**
- Make sure your Supabase project is not paused (free tier pauses after 1 week of inactivity)
- Go to Supabase dashboard and click "Restore" if paused

**Print not working:**
- Make sure the browser allows pop-ups for the site
- Try Chrome or Edge for best thermal print support

---

## 📞 Support

For issues, check the browser console (F12) and Supabase logs in the dashboard under **Logs → API**.
