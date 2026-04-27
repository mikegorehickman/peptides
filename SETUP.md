# Peptide Tracker — Setup

Database is **already provisioned** in your existing PCC Supabase project (`llfthegtjaexlyuywize`).  
Tables use `pep_` prefix to stay isolated from PCC (`pcc_*`). Zero cost impact.

All you need to do: **deploy the frontend to Netlify**.

---

## What's already done

- ✅ Tables created: `pep_peptides`, `pep_doses`
- ✅ RLS policies active (data scoped to your auth user)
- ✅ SECURITY DEFINER RPCs installed:
  - `pep_insert_peptide(name, mg, ml)`
  - `pep_delete_peptide(peptide_id)`
  - `pep_insert_dose(peptide_id, date, time_of_day, units)` — auto-computes mcg
  - `pep_delete_dose(dose_id)`
- ✅ `.env` file pre-populated with your Supabase URL + anon key

---

## Step 1 — Test locally (optional, 2 min)

```bash
cd peptide-tracker
npm install
npm run dev
```

Open http://localhost:5173 → enter your email → check inbox → click magic link.

**Before the magic link will work:** go to Supabase → **Authentication → URL Configuration** (PCC project) and add `http://localhost:5173` to the Redirect URLs list. Otherwise the magic link won't redirect back.

---

## Step 2 — Deploy to Netlify (5 min)

### A. Push to GitHub
```bash
cd peptide-tracker
git init
git add .
git commit -m "initial"
# Create a new PRIVATE repo on github.com called peptide-tracker, then:
git remote add origin https://github.com/YOUR_USER/peptide-tracker.git
git push -u origin main
```

`.env` is gitignored, so your keys won't hit GitHub. You'll set them in Netlify instead.

### B. Connect Netlify
1. [app.netlify.com](https://app.netlify.com) → **Add new site → Import from Git**
2. Pick your `peptide-tracker` repo
3. Build auto-detects from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Click **Add environment variables** and paste these exactly:

```
VITE_SUPABASE_URL=https://llfthegtjaexlyuywize.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_ueZwfmM-GBY79Qnd5uXpJw_YKEOSZlA
```

5. Click **Deploy site**

### C. Whitelist the Netlify URL in Supabase
Once Netlify gives you a URL (e.g. `https://peptides-mike.netlify.app`):

- Supabase → PCC project → **Authentication → URL Configuration**
- Add your Netlify URL to **Redirect URLs** (keep the PCC URL in there too — don't remove anything)

### D. Optional: custom subdomain
Netlify → **Domain settings** → add something like `peptides.paintergrowth.com`. Add that URL to Supabase Redirect URLs too.

---

## Step 3 — Install on iPhone

1. Open the Netlify URL in Safari (not Chrome)
2. Share button → **Add to Home Screen**
3. Name it "Peptides" → Add
4. Tap the icon — opens full screen, feels native

---

## About auth + PCC coexisting

Your peptide data and PCC customer data share the same Supabase auth system. That's fine because:

- **RLS keeps data separate.** The peptide tables only return rows where `auth.uid() = user_id`. PCC customers who log in to their PCC account won't see your peptide data — they won't even know it exists.
- **Magic links route per app.** The peptide tracker uses `emailRedirectTo = window.location.origin`, so your link sends you to the peptide app, not PCC.
- **One user = one set of data.** First time you log in with your email, Supabase creates a user for you (if one doesn't already exist). Your peptide data attaches to that `user_id` forever.

---

## How the math works

Standard U-100 insulin syringe: **100 units = 1 ml**

`mcg per unit = (mg in vial × 10) / ml of water added`

Example: 10mg BPC-157 + 2ml bacteriostatic water → 50 mcg/unit. 20 units = 1000 mcg = 1 mg.

Stored as a generated column in Postgres — always consistent with the vial setup.

---

## Troubleshooting

**Magic link opens but I'm not logged in**  
Your current URL isn't in the Supabase Redirect URLs list. Add it.

**"Not authenticated" error on saving**  
Session expired. Hard refresh. If it keeps happening, check that the `.env` values match what's in Supabase (Settings → API).

**Can't save a dose — "peptide not found"**  
The peptide_id doesn't belong to your auth user. Usually happens if you manually edited rows. Recreate the peptide.

**Want to wipe all peptide data**  
Supabase SQL Editor:
```sql
delete from pep_doses where user_id = auth.uid();
delete from pep_peptides where user_id = auth.uid();
```

**Want to completely remove the peptide tracker from Supabase later**  
```sql
drop table if exists pep_doses cascade;
drop table if exists pep_peptides cascade;
drop function if exists pep_insert_peptide;
drop function if exists pep_delete_peptide;
drop function if exists pep_insert_dose;
drop function if exists pep_delete_dose;
```
PCC stays untouched.

---

## Your credentials (also in .env)

```
Project URL:  https://llfthegtjaexlyuywize.supabase.co
Anon key:     sb_publishable_ueZwfmM-GBY79Qnd5uXpJw_YKEOSZlA
```

The anon key is **safe to embed in client code** — it's public by design. RLS is what keeps your data private.
