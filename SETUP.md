# Peptide Tracker — Setup

The whole database lives in one file: `supabase/migrations/001_init.sql`.
Run it on any Supabase project, point the app at that project, done.

It works on a **new project** or an **existing one** (like PCC). Every table and
function starts with `pep_`, so nothing else gets touched.

---

## Step 1 — Build the database (2 min)

1. Open [supabase.com/dashboard](https://supabase.com/dashboard) and pick a project
   (or click **New project**. The free tier is fine.)
2. Go to **SQL Editor → New query**
3. Paste in all of `supabase/migrations/001_init.sql` and click **Run**
4. Check **Table Editor**. You should see `pep_peptides` and `pep_doses`.

That creates:
- Tables `pep_peptides`, `pep_doses`
- RLS: you can only read your own rows
- Write functions (RPCs): `pep_insert_peptide`, `pep_delete_peptide`,
  `pep_insert_dose` (works out mcg for you), `pep_delete_dose`

You can run the script more than once. It won't break anything.

---

## Step 2 — Auth settings

Go to **Authentication → URL Configuration**:
- **Redirect URLs**: add your Netlify URL (e.g. `https://peptides-mgh.netlify.app`),
  your custom domain if you have one, and `http://localhost:5173`. Don't remove the
  URLs already there.
- **Site URL**: on a **new, peptides-only** project, set it to your Netlify URL.
  On a **shared** project like PCC, **leave it alone**. PCC's emails use it.

Optional, **new project only**: to skip the confirmation email, turn off
**Authentication → Sign In / Providers → Email → Confirm email**. Don't do this on
PCC. It turns off email confirmation for every PCC user too.

---

## Step 3 — Point the app at the project

Go to **Project Settings → API Keys** and copy:
- Project URL (`https://<ref>.supabase.co`)
- Publishable / anon key (`sb_publishable_...` or the legacy `anon` key)

**Local:** copy `.env.example` to `.env` and fill in both values.

**Netlify:** go to **Site configuration → Environment variables** and set:
```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable key>
```
Then **Deploys → Trigger deploy → Clear cache and deploy site**. Vite bakes the
env vars in at build time, so you have to rebuild after changing them.

The publishable key is safe in client code. RLS keeps your data private.
**Never** use the `service_role` / secret key here.

---

## Step 4 — Make a new account

Your old login was in the deleted project, so it's gone. Open the app, tap
**Sign up**, and use the same email. Then add your peptides again.

---

## Install on iPhone

Open the site in Safari → Share → **Add to Home Screen**.

---

## How the math works

U-100 insulin syringe: **100 units = 1 ml**

`mcg per unit = (mg in vial × 10) / ml of water added`

Example: 10 mg BPC-157 + 2 ml bac water = 50 mcg/unit. 20 units = 1000 mcg = 1 mg.

---

## Troubleshooting

**"Could not find the function pep_insert_peptide" / table not found**
The SQL didn't run on *this* project, or the API hasn't reloaded yet. Run the script
again. It ends with `notify pgrst, 'reload schema'`.

**"Invalid API key" / blank screen**
The Netlify env vars are wrong or still point at the old project. Fix them, then
clear the cache and redeploy.

**Confirmation link opens but you're not logged in**
That URL is missing from Redirect URLs.

**"not authenticated" when saving**
Your session expired. Hard refresh and log in again.

---

## Remove it later

```sql
drop table if exists pep_doses cascade;
drop table if exists pep_peptides cascade;
drop function if exists pep_insert_peptide;
drop function if exists pep_delete_peptide;
drop function if exists pep_insert_dose;
drop function if exists pep_delete_dose;
```
