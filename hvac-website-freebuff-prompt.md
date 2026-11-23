# HVAC Services Website + Admin Panel: Phased Build Prompt for Freebuff

**How to use this file**

1. Paste **Section 0 (Master Context)** into Freebuff first. Keep it pinned or re-paste it at the start of every new session.
2. Then paste **one phase at a time** (Phase 1, Phase 2, ...). Do not move to the next phase until the acceptance checklist of the current phase passes.
3. If Freebuff drifts from the design rules, paste Section 0.3 (Design Rules) and Section 0.4 (Banned Patterns) again.

---

# SECTION 0: MASTER CONTEXT (paste first, every session)

## 0.1 What we are building

A **white-label, sellable template** for HVAC companies: a premium public website plus a full operations admin panel, running end to end (enquiry, quote, booking, job, invoice, cash payment, AMC renewal, reports).

- The template is sold to many HVAC clients. Each client deployment is configured from **one brand config** and **admin Brand Settings** (company name, logo, colors, cities served, contact details, services enabled). Nothing client-specific is hardcoded in components.
- Demo brand for development: **"Coolvane HVAC"** (placeholder, fully replaceable via `brand.config.ts` and Brand Settings).
- Serves **residential and commercial** customers. English only.
- The website ships in **two visual variants** that share 100% of the features, routes, data, and admin panel. Only the design language differs:
  - **Variant A: "Foundry" (dark, engineered, industrial-premium)**
  - **Variant B: "Atelier" (light, clean, architectural, generous whitespace)**
  - Selected per deployment by env var `VITE_THEME=foundry|atelier`. Both variants live in the same repo. They share components and logic and differ through design tokens, layout choices, typography, and motion personality.
- The admin panel is **one design** (neutral, dense, fast), shared by both variants, with a light/dark toggle.

## 0.2 Tech stack (fixed, do not substitute)

| Layer | Choice |
|---|---|
| Frontend | React 18 + **Vite** + TypeScript |
| Styling | Tailwind CSS with CSS variable design tokens (no component library look) |
| Animation | **GSAP + ScrollTrigger**, **Lenis** (smooth scroll, synced to GSAP ticker), **Framer Motion** (UI transitions, route transitions, micro-interactions) |
| 3D | Optional lazy-loaded **three.js / @react-three/fiber** for one hero element only (see Phase 9). CSS 3D transforms + GSAP for everything else |
| Backend | Node.js 20 + Express + TypeScript |
| Database | MongoDB (Mongoose). On Azure: Azure Cosmos DB for MongoDB (vCore) or MongoDB Atlas |
| Auth | JWT access + refresh tokens (httpOnly cookies), bcrypt, RBAC |
| Email | Nodemailer via SMTP **or** Azure Communication Services Email (abstracted behind one `mailer` service) |
| Files | Azure Blob Storage (local disk adapter in dev) |
| PDF | Server-side PDF for quotations and invoices (pdfkit or puppeteer) |
| Jobs | node-cron (AMC reminders, follow-ups, daily digests) |
| SEO / rendering | **Vite SSR with a custom Express server** for all public routes (real server-rendered HTML), `react-helmet-async`, JSON-LD, sitemap, robots (see Phase 8) |
| Hosting | **Microsoft Azure** (App Service for Node SSR + API, Blob Storage, Front Door/CDN, Cosmos DB for MongoDB or Atlas, Key Vault, GitHub Actions CI/CD) |

Repo layout (monorepo, npm workspaces):

```
/apps/web        React + Vite + SSR (public site + customer portal + admin + technician view)
/apps/api        Express API
/packages/shared types, zod schemas, constants (service catalogue, enums)
/infra           Azure Bicep / scripts, GitHub Actions workflows
```

## 0.3 Design rules (hand-crafted agency standard)

The result must look like it came from a small, expensive design studio, not from a generator.

**Principles**
- One strong idea per section. Large confident typography, deliberate asymmetry, real hierarchy. Whitespace is a feature.
- Everything is built on an **8px grid** with a documented spacing scale. Max content width 1320px, with full-bleed moments for imagery and pinned scroll sections.
- Copy is **specific and technical**, written like an engineer who respects the reader (capacities in TR and kW, SEER/ISEER, CFM, static pressure, refrigerant types, response times). No filler like "world-class solutions" or "your comfort is our priority".
- Imagery direction: real-feeling photography of technicians at work, plant rooms, rooftop condensers, ductwork, thermal imagery, close-ups of copper, coils, fins, gauges. Use art-directed crops, duotone/grain treatments, and consistent color grading. During development use high-quality placeholder images from `/public/placeholders` with proper `alt` text and aspect ratios, swappable from admin media.
- Iconography: a **custom, consistent 1.5px stroke icon set** (draw as SVG; do not mix icon packs). Include HVAC-specific icons (compressor, coil, duct, chiller, VRF branch, cold room, damper, thermostat, filter).
- Add **small crafted details**: technical annotation labels on images (like drawing callouts), hairline dividers with tick marks, measurement-style numerals, section index numbers (01 / 02), subtle film grain overlay, custom cursor states, custom selection color, styled focus rings, a designed 404 and loading state.

**Variant A: Foundry (dark, industrial-premium)**
- Tokens (CSS variables, all defined once in `tokens.css`):
  - `--bg: #0A0D10` (ink), `--surface: #11161B`, `--surface-2: #181F26`, `--line: #26303A`
  - `--text: #E8EDF1`, `--text-dim: #8E9AA6`
  - `--accent-cold: #5EC8E5` (frost cyan) for cooling/primary actions
  - `--accent-heat: #E8863A` (copper ember) for heating/emergency/secondary highlights
  - `--success: #4FBF8B`, `--warn: #E8B33A`, `--danger: #E5584F`
- Type: display **Clash Display** (Fontshare) or a comparable condensed-geometric face; body **Satoshi**; data/specs **JetBrains Mono**. Large tracking-tight headlines, mono for labels and numbers.
- Feel: machined metal, blueprint grid lines at 4% opacity, soft radial glows behind hero objects, frosted-glass panels with real borders, heat/cold gradient used sparingly as a signature thread (a thin gradient line that appears in the hero, dividers, and CTA hover).
- Motion personality: heavy, precise, mechanical easing (`expo.out`, `power4.inOut`), parallax depth, pinned storytelling.

**Variant B: Atelier (light, architectural)**
- Tokens:
  - `--bg: #F5F2EC` (bone), `--surface: #FFFFFF`, `--surface-2: #ECE8DF`, `--line: #D9D3C6`
  - `--text: #14181C`, `--text-dim: #5B6670`
  - `--accent-cold: #0F5C66` (deep teal), `--accent-heat: #B5562B` (burnt copper)
  - `--ink-block: #101820` (used for contrast sections and footer)
- Type: display **Instrument Serif** (large, elegant, sometimes italic emphasis on one word); body **Hanken Grotesk**; data **IBM Plex Mono**. 
- Feel: architecture monograph. Generous margins, thin rules, off-grid captions, large image crops with caption blocks, tall editorial layouts, occasional full-height ink-colored section for rhythm.
- Motion personality: calm, slow, elegant easing (`power3.out`), masked text reveals, image clip-path unveils, soft parallax.

**Shared motion system** (build once in `/apps/web/src/motion`)
- Lenis smooth scroll connected to `gsap.ticker` and `ScrollTrigger.update`. Disable on touch where it hurts, and always respect `prefers-reduced-motion` (replace with simple fades).
- Reusable primitives: `<SplitReveal>` (line/word mask reveal), `<ParallaxImage>`, `<PinnedStory>`, `<HorizontalRail>`, `<CounterStat>`, `<MagneticButton>`, `<TiltCard>` (3D perspective tilt on hover), `<ScrollProgress>`, `<PageTransition>` (Framer Motion route transitions with a branded wipe).
- **3D-style scroll scenes** (CSS 3D + GSAP, no heavy libraries): perspective-stacked service cards that rotate and depth-shift on scroll, a pinned "How air moves through your building" scene where layers (outdoor unit, refrigerant line, indoor unit, ducts, rooms) separate in Z-space as you scroll, a rotating isometric-style system diagram. 
- Performance budget: LCP under 2.5s on mid-range mobile, CLS under 0.05, animate only `transform` and `opacity`, `will-change` used sparingly, all heavy scenes lazy-loaded and disabled on low-power devices.

## 0.4 Banned patterns ("no AI slop" list)

Do **not** produce any of the following:
- Purple/blue gradient hero blobs, generic mesh gradients, floating glowing orbs as decoration.
- The default "hero with centered headline, two buttons, three icon cards below" layout.
- Rows of identical rounded cards with an emoji or Lucide icon, a title, and two lines of text.
- Inter, Roboto, Poppins, or Space Grotesk as primary fonts.
- Stock phrases: "cutting-edge", "seamless", "unlock", "elevate", "world-class", "state-of-the-art", "tailored solutions".
- Fake testimonials presented as real or fake client logos. Placeholder content must be clearly marked in the CMS as sample data.
- Glassmorphism on everything, shadow-heavy cards, rainbow gradients, excessive emoji, lorem ipsum.
- Identical spacing and identical section structure repeated down the page. Every section needs its own layout and rhythm.
- Animations that play once on load and then nothing. Motion must be tied to scroll and interaction and must serve the story.

## 0.5 Global engineering rules

- TypeScript strict mode. Shared zod schemas validated on both client and server.
- Accessibility: WCAG 2.2 AA, keyboard navigable, visible focus, semantic HTML, `aria` on custom widgets, contrast checked in both variants.
- Mobile first. Every page tested at 360, 768, 1024, 1440, 1920 widths.
- No payments gateway. **Payments are recorded as cash (or on-site/offline) only**, entered manually by admin or technician.
- No WhatsApp. Customer contact channels are **phone call, email, contact form, and in-site chat widget that delivers to email/admin inbox**.
- All notifications are **email**, templated, branded, logged in the database.
- Environment config through `.env` with a validated schema. No secrets in code.
- Write clean commit-sized changes, README per app, and seed scripts with realistic demo data.

---

# PHASE 1: Foundation, Monorepo, and Design System

**Goal:** a running skeleton with the full design system, both variants switchable, and zero page content yet.

**Prompt for Freebuff:**

Set up the monorepo described in Section 0.2 with npm workspaces: `apps/web`, `apps/api`, `packages/shared`, `infra`. Configure TypeScript strict, ESLint, Prettier, Husky pre-commit, and absolute path aliases.

In `apps/web`:
1. Vite + React + TS with SSR-ready structure (`entry-client.tsx`, `entry-server.tsx`, `server.ts`). Do not wire full SSR yet, but structure it so Phase 8 only needs to complete it.
2. Tailwind configured to read all colors, radii, spacing, and font families from CSS variables.
3. Create `src/theme/foundry.css` and `src/theme/atelier.css` using the tokens in Section 0.3. Load the correct one from `VITE_THEME`. Provide a dev-only floating switcher to flip variants live.
4. Create `brand.config.ts` (name, tagline, logo paths, phone, email, address, cities served, social links, business hours, service area list) and a `useBrand()` hook. Later the admin Brand Settings override this at runtime.
5. Build the **component library** with both variants styled: Button (primary, secondary, ghost, magnetic), Link with animated underline, Input, Select, Textarea, DatePicker, TimeSlotPicker, Checkbox, Radio, Toggle, Tabs, Accordion, Modal, Drawer, Toast, Tooltip, Badge, Stat, SectionHeader (with index numbers), Marquee, Breadcrumbs, Pagination, Table (for admin), EmptyState, Skeleton, and the custom HVAC icon set (at least 24 icons, hand-drawn SVG, 1.5px stroke).
6. Typography: load fonts per variant (self-hosted, `font-display: swap`, preloaded). Build a type scale with fluid `clamp()` sizing.
7. Build `src/motion/` primitives listed in Section 0.3 (SplitReveal, ParallaxImage, PinnedStory, HorizontalRail, CounterStat, MagneticButton, TiltCard, ScrollProgress, PageTransition) and the Lenis + GSAP bootstrap with reduced-motion handling.
8. Create a hidden `/__styleguide` route showing every token and component in both variants.

**Acceptance checklist**
- [ ] `npm run dev` runs web and api together.
- [ ] Flipping `VITE_THEME` changes the whole look with no component edits.
- [ ] Styleguide page shows all components, states (hover, focus, disabled, error), and motion primitives working.
- [ ] Lighthouse accessibility 95+ on the styleguide.
- [ ] Zero banned patterns from Section 0.4.

---

# PHASE 2: Backend, Data Models, and Auth

**Goal:** a complete, tested API for the whole operation.

**Prompt for Freebuff:**

Build `apps/api` (Express + TS + Mongoose) with modular folders per domain: `routes`, `controllers`, `services`, `models`, `validators`, `middleware`. Use zod validation, centralized error handling, request logging (pino), rate limiting, helmet, CORS, and a health endpoint.

**Roles and permissions (RBAC):** `superadmin`, `admin`, `manager`, `sales`, `dispatcher`, `technician`, `accountant`, `customer`. Permissions are granular per module (view, create, edit, delete, export) and editable by superadmin in the UI. Technicians can only see assigned jobs.

**Collections (Mongoose models with indexes and timestamps):**
- `User` (role, status, profile, avatar, lastLogin), `Technician` (skills, certifications, service areas, availability, rating, vehicle)
- `Customer` (type residential|commercial, contacts, multiple `Site` addresses with geo, notes, tags, source)
- `Service` (slug, name, category, short/long description, features, specs, process steps, FAQs, pricing model, starting price (optional), SEO fields, gallery, status, order)
- `ServiceCategory`, `Brand` (equipment brands handled), `Location` (city/area landing pages)
- `Lead` (source, channel, status pipeline: New, Contacted, Site Visit, Quoted, Won, Lost; owner, follow-up date, notes timeline, attachments, UTM data)
- `Quotation` (number, line items, tax, discount, validity, terms, status, PDF, version history)
- `Booking` (customer, site, service, slot, urgency normal|emergency, status, assigned technician(s), notes)
- `Job` (from booking or quote; checklist, status flow: Scheduled, En Route, In Progress, On Hold, Completed, Cancelled; before/after photos, parts used, labor hours, customer signature, completion report)
- `Invoice` (number, items, tax (GST fields), status, due date, PDF) and `PaymentRecord` (cash/offline only: amount, method cash|bank-transfer|cheque|UPI-on-site, received by, reference, date)
- `AMCContract` (customer, sites, equipment list, plan, visits per year, start/end, price, status, auto-generated visit schedule, renewal reminders)
- `Equipment` (customer site assets: brand, model, serial, capacity, install date, warranty, service history)
- `Inventory` (SKU, name, category, stock, reorder level, unit cost, supplier), `StockMovement`, `Supplier`, `PurchaseOrder`
- `Expense` (category, amount, job link, receipt), `Review` (customer, rating, text, status moderated), `Enquiry/ChatMessage`
- `Post` (blog), `Project` (case study), `Testimonial`, `FAQ`, `Page` (editable static pages), `MediaAsset`, `BrandSettings`, `EmailTemplate`, `EmailLog`, `AuditLog`, `Notification`

**API modules** (REST, versioned `/api/v1`): auth, users, roles, customers, leads, quotations, bookings (including slot availability engine with technician capacity and service areas), jobs, invoices, payments, amc, equipment, inventory, expenses, reports, services, content (blog, projects, testimonials, FAQs, pages), media (Azure Blob upload with image resizing and WebP), settings, public endpoints (services, booking availability, quote request, contact, reviews, sitemap data).

**Business logic**
- Auto-numbering (QT-2026-0001, INV-2026-0001, AMC-2026-0001) per financial year.
- Quote to Booking to Job to Invoice conversion with one click and full linkage.
- Emergency requests: highest priority flag, instant email to dispatcher group, SLA timer.
- AMC engine: generate visit schedule on contract creation, create jobs automatically before each visit, send renewal reminders at 60, 30, 7 days and on expiry.
- Email service: template rendering (Handlebars/MJML), queue with retry, log every send. Events: enquiry received (customer + admin), quote sent, booking confirmed, technician assigned, technician en route, job completed with report, invoice issued, payment received (cash receipt), AMC visit reminder, AMC renewal, review request, password reset.
- Audit log on all create/update/delete operations.
- Reports aggregation endpoints: revenue, outstanding, lead conversion, technician performance, service-wise demand, city-wise demand, AMC renewals, inventory valuation, expense vs income.

**Also deliver:** seed script (demo brand, 20+ services with full content, 3 cities, sample customers, leads, jobs, invoices), Postman/OpenAPI docs, and Jest/Supertest tests for auth, booking availability, quote-to-invoice flow, and AMC schedule generation.

**Acceptance checklist**
- [ ] All endpoints documented and tested with seeded data.
- [ ] RBAC verified: a technician cannot read other technicians' jobs, an accountant cannot edit services.
- [ ] Slot availability never double-books a technician.
- [ ] Every email event fires and is logged (use a dev mail catcher).
- [ ] Seed command creates a fully usable demo dataset.

---

# PHASE 3: Public Website Core Pages

**Goal:** the main marketing site in the active variant, fully responsive, content driven from the API, with page-level scroll storytelling.

**Prompt for Freebuff:**

Build these routes in `apps/web` using the design system and motion primitives. Both variants must render every page, with layout differences where the style calls for it (Foundry: pinned, dense, technical; Atelier: editorial, airy, image-led).

1. **Home**
   - Hero with a distinctive composition (not centered-text-plus-buttons). Foundry: large headline over a dark plant-room photograph with a thin heat/cold gradient line and technical callout labels; Atelier: oversized serif headline with an off-grid image crop and caption. A compact **"Request a callback / Get a quote"** panel embedded in the hero.
   - Live proof strip: years in business, systems installed, total tonnage commissioned, response time, all as `CounterStat` (values from Brand Settings).
   - **Services index** as a 3D perspective card stack that reorders on scroll (see Section 0.3), linking to each service page.
   - Pinned scroll story: "How air moves through your building" (Z-space layer separation).
   - Residential vs Commercial split section with distinct treatments.
   - Process timeline (Survey, Design, Quote, Install, Commission, Maintain) as a horizontal rail with scroll-scrubbed progress.
   - Selected projects (horizontal rail of case studies), brands we work with (marquee), AMC plans teaser, reviews, emergency strip, FAQ, final CTA.
2. **Services overview** (`/services`) with category filters (Residential, Commercial, Industrial, Maintenance) and a comparison-style index.
3. **About** (story, leadership, certifications, safety and quality standards, values written concretely).
4. **Projects** (`/projects`, `/projects/:slug`): filterable case studies with scope, capacity, location, challenge, solution, results, gallery, before/after slider.
5. **Blog / Insights** (`/insights`, `/insights/:slug`): category, tags, reading time, related posts, table of contents, author.
6. **Contact** (`/contact`): form (delivers to admin as a Lead and sends confirmation email), phone, email, map embed, service area list, hours, office locations.
7. **Careers** (optional toggle), **Privacy**, **Terms**, **Cookie notice**, custom **404** and **500**.
8. **City landing pages** (`/hvac-services/:city`), generated from the `Location` collection for local SEO, each with unique content blocks, local FAQs, and services available.
9. **Global elements:** announcement bar (admin editable), sticky header that shrinks on scroll with a mega-menu for services, mobile full-screen menu with staggered reveal, footer with service links, areas, newsletter email signup, sticky mobile action bar (Call, Email, Book), floating "Emergency 24x7" button, and a chat widget that sends messages to the admin inbox and to email.

**Acceptance checklist**
- [ ] Every page works in both variants and all breakpoints.
- [ ] No horizontal scroll, no layout shift, no broken images.
- [ ] Reduced-motion mode shows a fully usable static version.
- [ ] Content on all pages is editable from the admin (Phase 6).

---

# PHASE 4: Detailed Service Pages (one fully detailed page per service)

**Goal:** each HVAC service has a deep, original, technically credible page. Services are data in the `Service` collection and rendered by one flexible template with **per-service layout blocks**, so pages do not feel identical.

**Services to build (all seeded with complete, non-generic content):**

*Residential*
1. Split AC installation (wall, cassette, tower, ductable splits)
2. AC repair and emergency breakdown
3. AC servicing and deep cleaning (chemical wash, jet wash)
4. Gas charging and leak detection (refrigerant types, pressure testing, brazing)
5. AC relocation, uninstall and reinstall
6. Inverter and multi-split systems for homes
7. Ducted residential HVAC
8. Air purification, UV and indoor air quality
9. Smart thermostats and controls

*Commercial / Industrial*
10. VRF / VRV system design and installation
11. Chilled water systems and chillers (air-cooled, water-cooled, screw, scroll, centrifugal)
12. Packaged units and rooftop units
13. Ducting design, fabrication and installation (GI, PIR, pre-insulated, flexible)
14. Ventilation, fresh air and exhaust systems
15. Cold rooms, walk-in coolers and freezers (pharma, food, floral)
16. Cleanrooms and precision cooling (labs, hospitals, data rooms)
17. Server room and data center cooling
18. BMS integration and energy management
19. HVAC retrofit and energy audit
20. Annual Maintenance Contracts (AMC): comprehensive and non-comprehensive plans
21. Chiller and cooling tower maintenance, AHU/FCU servicing, duct cleaning
22. Commercial kitchen ventilation and exhaust

Each service page must contain these **unique content blocks** (use different arrangement per category):
- Hero with a specific, factual headline, one-line value, key spec chips (capacity range, typical timeline, warranty), and "Get a quote for this service" CTA.
- "What this includes" scope list and "What is not included" (honesty builds trust).
- Technical overview written by someone who knows the trade, with a labeled diagram (SVG illustration drawn per service) and key selection factors.
- **Interactive element per service where relevant:** AC tonnage calculator (room size, sun exposure, occupancy), VRF zone planner, chiller capacity estimator, cold room volume/load estimator, duct sizing helper (CFM, velocity), AMC plan comparison selector. Calculators end with "Send this to our engineers" which creates a lead with the inputs attached.
- Our process (steps specific to that service), typical timeline, and site requirements checklist.
- Equipment and brands supported, warranty and standards (ISHRAE, ASHRAE, BIS, ISO references used accurately).
- Pricing guidance: "starting from" or "price depends on" with the factors listed, plus a request form.
- Related projects, related services, FAQs (8+ real questions per service, with FAQ JSON-LD), reviews filtered for that service, and a booking widget prefilled with the service.
- Unique `title`, `meta description`, H1, canonical, OG image, and Service JSON-LD.

**Acceptance checklist**
- [ ] All 22 services rendered from data, each with distinct copy and at least 6 content blocks.
- [ ] Calculators produce sensible, labeled outputs and create leads.
- [ ] No two service pages look structurally identical.
- [ ] Admin can add a brand-new service and it appears with full SEO automatically.

---

# PHASE 5: Customer-Facing Features and Customer Portal

**Prompt for Freebuff:**

1. **Online booking flow** (`/book`): multi-step (Service, Site/address, Date and time slot from real availability, Contact details, Review and confirm). Normal vs **Emergency 24x7** path (skips slots, captures urgency and problem, notifies dispatcher by email immediately). Payment step is **"Pay cash after service"** only, with a clear note. Confirmation page and confirmation email with calendar (.ics) attachment.
2. **Quote request** (`/quote`): residential and commercial variants, file upload (floor plans), preferred contact time. Creates a Lead and acknowledgement email.
3. **Estimate calculators** (shared with Phase 4) available as standalone page `/tools`.
4. **Customer portal** (`/account`): email OTP or password login. Sections: Dashboard, My bookings (reschedule/cancel with rules), My equipment and service history, Quotations (view, accept, request changes, download PDF), Invoices (view, download PDF, see cash payment status), AMC contracts (status, upcoming visits, renewal request), Reports from completed jobs (photos, checklist), Raise a complaint/support ticket, Profile and sites, Notification preferences.
5. **Reviews:** post-job email asks for a rating; reviews go to admin moderation; approved ones appear on site and in JSON-LD (`AggregateRating`, only from real reviews).
6. **Contact channels:** click-to-call, mailto links, contact form, chat widget (messages go to admin Inbox and email). No WhatsApp anywhere.

**Acceptance checklist**
- [ ] A full customer journey works: book, receive email, technician assigned, job completed, invoice, cash recorded, review request.
- [ ] Portal is usable on mobile with large tap targets.

---

# PHASE 6: Admin Panel (end-to-end operations)

**Goal:** a fast, dense, professional back-office. Route prefix `/admin`. One design (light/dark toggle), keyboard shortcuts (`g d` dashboard, `/` search, `n` new), global search (customers, leads, jobs, invoices), and command palette.

**Prompt for Freebuff:**

Build these modules with tables (server-side pagination, column chooser, filters, saved views, CSV export), detail drawers, activity timelines, and bulk actions:

1. **Dashboard:** today's jobs, emergencies open, new leads, quotes awaiting response, overdue invoices, cash collected today/this month, technician utilization, AMC renewals due, low stock alerts, revenue trend, lead funnel. Charts must be clean and custom-styled (Recharts or visx), not default.
2. **Leads and Enquiries:** inbox for form, quote requests, chat messages, and calculator leads. Kanban pipeline and list view, assignment, follow-up reminders, notes, attachments, convert to Customer/Quote, lost reasons, source and UTM attribution.
3. **Customers:** profile, sites, equipment, history, AMC, outstanding balance, notes, tags, merge duplicates.
4. **Quotations:** builder with service catalogue items, tax and discount, terms templates, versioning, PDF preview, send by email, track viewed/accepted, convert to booking or job.
5. **Bookings and Scheduling:** calendar (day/week/month, technician lanes) with drag-and-drop assignment, slot rules, working hours, holidays, service areas, emergency queue with SLA timers, conflict detection.
6. **Jobs and Dispatch:** job board, checklists per service type, status updates, before/after photos, parts used (deducts inventory), labor hours, customer signature, completion report PDF emailed to customer.
7. **Technicians:** profiles, skills, certifications with expiry alerts, schedule, performance (jobs, ratings, rework rate), attendance (optional).
8. **Invoices and Payments:** invoice builder (GST aware), PDF, email, status tracking. **Record cash/offline payments** with receipt PDF and email, partial payments, outstanding aging, credit notes.
9. **AMC Management:** plans builder, contracts, equipment lists, auto visit scheduling, renewal pipeline, reminders, contract PDF, performance of visits.
10. **Inventory:** items, stock in/out, reorder alerts, suppliers, purchase orders, stock valuation, usage per job.
11. **Expenses and Accounts:** expense entry with receipts, categories, job profitability, daily cash book, simple profit and loss.
12. **Reports and Analytics:** all reports from Phase 2 with date filters, scheduled email reports (daily/weekly digest to owner), export CSV/PDF.
13. **Website CMS:** services (rich editor, blocks, FAQs, SEO fields, gallery), city pages, blog, projects, testimonials, FAQs, pages, media library (Azure Blob, auto WebP and responsive sizes, alt text required), navigation and footer editor, homepage section ordering and toggles, announcement bar.
14. **SEO Manager:** per-page title/description/OG, canonical, redirects manager (301), sitemap preview, robots editor, schema toggles, keyword tracker table (manual entry), broken link report, Search Console and Analytics ID fields.
15. **Communications:** email templates editor with variables and preview, send test, email log with status and resend, notification rules per event.
16. **Settings:** Brand Settings (name, logo, colors override, contact, GST details, bank details for invoices, cities, business hours), users, roles and permissions matrix, slot and booking rules, tax rules, number formats, integrations (SMTP/Azure email), data export/backup, audit log viewer.

**Acceptance checklist**
- [ ] Every module supports create, read, update, delete (where permitted) with validation and audit trail.
- [ ] Permissions hide or disable UI properly and the API enforces them.
- [ ] Changing content in CMS updates the public site (with cache revalidation).
- [ ] Admin works well on a tablet; critical flows (job status, record payment) work on a phone.

---

# PHASE 7: Technician Mobile View

**Prompt for Freebuff:**

Build `/tech` as an installable PWA (manifest, service worker, offline cache for assigned jobs) designed for one-hand use on a phone:
- Today's jobs list with map link, customer phone (tap to call), address, service, notes.
- Accept/decline, status buttons (En Route, Arrived, Started, Completed) that trigger customer emails.
- Checklists per service, parts used (search inventory), photo capture with compression and upload queue offline, customer signature pad, notes.
- Record **cash collected** with amount and receipt generation.
- Leaves a completion report that is emailed automatically.
- Large controls, high contrast, works in sunlight, offline-tolerant, syncs when back online.

**Acceptance checklist**
- [ ] A job can be completed fully offline and syncs correctly later.
- [ ] Status changes appear instantly on the admin job board.

---

# PHASE 8: SEO, Server Rendering, and Performance

**Goal:** scalable, proper technical SEO with real server-rendered HTML. A client-only SPA is **not acceptable** for public pages.

**Prompt for Freebuff:**

1. **Complete Vite SSR** using a custom Express server: server-render all public routes (home, services, service detail, city pages, projects, blog, about, contact). Hydrate on the client. Admin, technician, and portal routes are client-rendered and `noindex`. Use streaming SSR where possible, route-level data fetching on the server, and an in-memory/Redis cache with on-demand revalidation when CMS content changes.
2. **Meta management:** `react-helmet-async` with unique title, description, canonical, robots, Open Graph and Twitter cards per page, auto-generated OG images (per service/post) via a render endpoint.
3. **Structured data (JSON-LD):** `Organization`, `LocalBusiness` / `HVACBusiness` with service areas, `Service` per service, `BreadcrumbList`, `FAQPage`, `Article` for blog, `AggregateRating` from real reviews only, `WebSite` with search action, `ContactPoint`.
4. **Technical SEO:** auto `sitemap.xml` (split sitemaps for services, locations, posts, projects) with `lastmod`, `robots.txt`, clean semantic URLs, trailing-slash policy, 301 redirect manager, hreflang not required (English only), pagination rel handling, canonical rules for filters, image sitemap, `llms.txt` optional, 404 and soft-404 handling.
5. **Content structure for keywords:** build a **keyword map** document (`/docs/seo-keyword-map.md`) mapping primary and secondary keywords to each page for HVAC terms such as "AC repair in {city}", "VRF system installation {city}", "chiller maintenance contract", "cold room manufacturers {city}", "commercial HVAC contractors {city}", "AC AMC plans for offices", "duct fabrication {city}". Each page uses its keyword in H1, first 100 words, one H2, URL, title, meta description, and image alt text, written naturally.
6. **Internal linking engine:** contextual links between services, projects, posts, and city pages; related content blocks; breadcrumb trails; hub-and-spoke structure (Services hub to service pages, City hub to city+service combinations).
7. **Backlink-ready assets:** a `/resources` section with linkable content (HVAC sizing guide, ISHRAE comfort standards explainer, refrigerant guide, energy saving checklist, downloadable PDF buyer's guide with email capture), embeddable tonnage calculator widget with attribution link, press/media page, and a **backlink and citation playbook** document (`/docs/backlink-playbook.md`) listing legitimate tactics: Google Business Profile setup, local directories and citations (consistent NAP), trade associations, supplier/OEM partner pages, case study and guest-post outreach, HARO-style expert quotes, local news and chamber listings, review generation flow. Provide outreach email templates. No spammy or paid-link schemes.
8. **Performance:** image CDN with AVIF/WebP, responsive `srcset`, lazy loading below the fold, font preloading, critical CSS, code splitting per route, lazy-load GSAP scenes and three.js only when visible, HTTP caching headers, Brotli, preconnects. Targets: Lighthouse 90+ on mobile for Performance, 100 for SEO and Best Practices, 95+ Accessibility.
9. **Analytics and tracking:** GA4 and Google Search Console verification fields, consent banner, event tracking for form submits, calls, emails, and bookings (no PII).

**Acceptance checklist**
- [ ] "View source" on any public page shows full content, meta, and JSON-LD.
- [ ] Rich Results Test passes for Service, FAQ, LocalBusiness, Breadcrumb.
- [ ] Sitemap and robots valid; admin routes not indexable.
- [ ] Lighthouse targets met in both variants.

---

# PHASE 9: Animation and Scroll Polish (agency-level finish)

**Prompt for Freebuff:**

Elevate the site with the signature motion work, tuned per variant. Everything must degrade gracefully and respect reduced-motion.

1. **Hero entrance:** timeline with masked headline line reveals, image unveil (clip-path), gradient line draw (Foundry) or caption fade-in (Atelier).
2. **Hero 3D element (lazy):** a light three.js scene, such as a rotating condenser fan with airflow particles (Foundry) or a minimal architectural section model with moving air lines (Atelier), reacting to scroll and pointer. Provide a CSS-only fallback and disable on low-power devices.
3. **Scroll-stopping pinned sequences:** (a) airflow story with layers separating in Z-space, (b) system-cycle explainer (compressor, condenser, expansion, evaporator) scrubbed with the scroll and annotated, (c) numbers section where counters and bars fill with scroll position.
4. **3D card stack and tilt:** perspective transforms, depth parallax, hover tilt with light sheen.
5. **Horizontal rails** for projects and process with snap and velocity-based skew.
6. **Page transitions** with Framer Motion (branded wipe, shared-element image transitions from list to detail pages).
7. **Micro-interactions:** magnetic buttons, custom cursor with contextual labels ("View", "Drag", "Play"), animated underline links, form field focus animations, success states with drawn checkmarks, loading skeletons, scroll progress indicator.
8. **Footer moment:** large wordmark with scroll-driven reveal and a final CTA.
9. **Audit:** remove any animation that does not add meaning. Profile with Chrome Performance tab: no long tasks above 50ms during scroll, steady 60fps on mid-range devices.

**Acceptance checklist**
- [ ] Each variant has a clearly different motion personality.
- [ ] Reduced-motion and low-power fallbacks verified.
- [ ] CLS and LCP targets from Phase 8 still met.

---

# PHASE 10: QA, Security, and Azure Deployment

**Prompt for Freebuff:**

1. **Testing:** unit tests (Vitest/Jest), API integration tests, Playwright E2E for: booking, quote request, emergency request, customer portal, admin quote-to-invoice-to-cash flow, technician offline completion, SEO tags presence on public pages. Visual regression snapshots for both variants.
2. **Security:** OWASP checklist, input sanitization, rate limiting, CSRF protection for cookie auth, secure headers, file upload validation and virus-scan hook, password policy, optional 2FA for admins, login throttling, audit logs, secrets in Azure Key Vault, regular dependency audit.
3. **Azure deployment (`/infra`):**
   - Bicep templates for: Resource Group, App Service Plan + Web App (Node 20, runs SSR + API), Azure Storage (Blob for media with CDN), Azure Cosmos DB for MongoDB vCore (or Atlas connection setting), Azure Communication Services Email (or SMTP settings), Key Vault, Application Insights, Azure Front Door (CDN, WAF, custom domain, TLS), deployment slots (staging, production).
   - GitHub Actions: build, test, lint, deploy to staging on PR merge, manual approval to production, database migration step, smoke tests.
   - Scheduled jobs for AMC reminders and digests (App Service WebJob or Azure Functions timer).
   - Backups, monitoring alerts, uptime check, log retention.
4. **White-label onboarding:** `/docs/client-setup.md` with a step-by-step checklist to launch a new client: clone, set `VITE_THEME`, fill `brand.config.ts` and `.env`, run seed (clean mode), upload logo and media, set cities and services, configure email domain (SPF, DKIM, DMARC), connect domain, submit sitemap to Search Console, create Google Business Profile.
5. **Handover docs:** admin user manual (with screenshots), technician quick guide, content editing guide, SEO guide, and a pricing/licensing note for resale.

**Final acceptance checklist**
- [ ] One command deploys a new client environment to Azure from the template.
- [ ] Both variants pass accessibility, performance, and SEO targets.
- [ ] A full end-to-end demo script (lead to cash to AMC renewal) runs without errors.
- [ ] No banned patterns (Section 0.4) anywhere in the UI or copy.

---

# APPENDIX A: Page Map (final sitemap)

```
/                         Home
/services                 Services hub
/services/:slug           22 detailed service pages
/hvac-services/:city      City landing pages
/projects, /projects/:slug
/insights, /insights/:slug
/resources, /resources/:slug
/tools                    Calculators
/about, /contact, /careers, /privacy, /terms
/book, /quote
/account/*                Customer portal (noindex)
/tech/*                   Technician PWA (noindex)
/admin/*                  Admin panel (noindex)
```

# APPENDIX B: Prompt for when Freebuff drifts

> Stop. Re-read Section 0 (Master Context), especially 0.3 Design Rules and 0.4 Banned Patterns. The last output looked generic. Redo the section with a unique layout, specific technical copy, our fonts and tokens only, and scroll-linked motion that tells a story. Show me the diff of what you changed and why it is more distinctive.

# APPENDIX C: Prompt for adding a new variant or client

> Using the existing token system and component library, create a new client configuration: brand name {NAME}, cities {CITIES}, theme {foundry|atelier}, accent override {HEX}. Update only `brand.config.ts`, env, and seed data. Do not modify components. Verify both the public site and the admin pick up the changes.
