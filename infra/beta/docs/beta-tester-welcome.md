# Welcome to the SCMCube beta

Thanks for agreeing to test SCMCube — NextGen Solutions during this beta.
This guide gets you signed in and pointed at the right places to click and
report what you find.

## What you're testing

SCMCube is a unified logistics platform — bookings, shipments, customs,
accounting, all in one app. During beta you'll be exercising:

- **Sales / CRM** — leads, opportunities, quote wizard
- **Freight Forwarding** — Control Tower (the shipments dashboard), bookings,
  shipment details with milestones / containers / charges
- **Master Data** — parties (customers, vendors, carriers), products
- **Accounting** — invoices, bills, receipts, payments
- **Procurement** — POs, GRNs, invoice match
- **Customs** (US tenants) — entries, ISF, ABI, PGA holds

Some screens are read-only. Some have data pre-seeded for you. None of it is
real customer data — feel free to break things.

## Signing in for the first time

You'll have received an email at `<your work email>` with subject
**"Set up your SCMCube beta account"**. The email contains:

1. A link to set your permanent password
2. A link to verify your email address

Open both links in order. After setting your password, the app will walk
you through:

3. **Scanning a QR code** with FreeOTP / Google Authenticator on your phone
   (this is the 2-factor / TOTP step — required for beta)
4. **Verifying your email** by clicking the link in a second email

You only do all this once. From then on:

1. Visit https://app.\<your beta domain\>
2. Enter email + password
3. Enter the 6-digit code from your authenticator app

You'll land on the dashboard.

## Day-2 tips

- **Ctrl+K / Cmd+K** anywhere opens a global navigation search. Type
  "shipments" / "invoices" / "leads" and press Enter to jump.
- **Sidebar groups** map roughly to a logistics business — Sales at the top,
  Operations in the middle, Finance / Visibility / Admin lower down.
- **The dashboard** shows live counts. Click any KPI tile to drill in.
- **The factory-reset button** (Admin sidebar → Demo Reset) wipes the
  pre-seeded demo data and re-applies it. Use this if you've made a mess.

## Things that ARE expected to be rough during beta

- **Performance under contention** — when many of you hit the box at once,
  page loads can briefly cross 1 second. We'll catch and fix the worst
  offenders during the bug bash.
- **Email delivery delays** — password reset emails can take up to a couple
  of minutes (especially the first time the SMTP path warms up).
- **Authentication retries** — if you fat-finger the TOTP code 5 times in
  a row, the system will lock your account for 60 seconds. Wait it out;
  don't keep retrying. Repeated failures double the wait, capped at 15 min.
- **MinIO console** at `https://minio.<domain>` is admin-only — testers
  should not need it.

## Reporting bugs

For each issue, please tell us:

1. **What you were doing** — page name + the action ("clicking 'Save' on a
   new booking from the FF → Bookings → New Booking page")
2. **What you expected** — "the booking should save and I should land on
   the detail page"
3. **What actually happened** — "I got a red banner saying 'Origin port is
   required' even though I selected one"
4. **Time of issue** (so we can pull logs) — your local time + timezone
5. **Browser** — Chrome / Firefox / Safari + version (Help → About)
6. **Screenshot** if the issue is visual — paste in the bug report

Send to: \<beta@your-domain.example\> — we triage daily during beta. Critical
bugs (you can't log in, the app is unreachable, you lost data) — flag with
**[CRITICAL]** in the subject and we'll respond within an hour during work
hours.

## Things you don't need to report

- Cosmetic alignment / spacing on screens that look "almost right"
- Typos in labels (we know about most; reporting one or two as you go is
  fine, but don't flood the channel with them)
- The login screen looking different from your last login — we may push
  config tweaks during beta

## What happens at end of beta

After the 2-week beta window:

1. We collect all bugs filed by the cohort
2. Critical + high-severity items get fixed before GA cutover
3. Your beta account migrates to the production tenant on cutover day —
   same email, same password, no re-signup
4. Production has different domain (we'll email the URL); beta domain goes
   away 7 days after cutover

Thanks again for joining the beta — your feedback is genuinely the difference
between "shipped" and "shipped well."

— SCMCube team
