# Good News Cafe - Technical Rebuild Specification

## 1. Purpose
This document specifies the current Good News Cafe application so another AI coding assistant can recreate the same system with matching behavior, data model, routes, and UI flow.

## 2. Product Summary
Good News Cafe is a waiter-facing order system for a church cafe.

Core capabilities:
- PIN-based waiter login
- Order creation with customer details, tag, drink, size, and add-ons
- Priority queueing by customer tag
- Live display board for pending and served orders
- Marking orders served and undoing to pending
- Daily order numbering reset and served-today filtering

## 3. Technology Stack
- Framework: Next.js 16.2.1 (App Router)
- UI: React 19.2.4
- Database: MongoDB via Mongoose 9.3.1
- Styling: Tailwind CSS v4 with custom theme variables in global CSS
- Runtime: Node.js server routes in Next.js app/api

## 4. Environment Variables
Required:
- MONGODB_URI: MongoDB connection string
- WAITER_PIN: shared waiter authentication PIN

Important security note:
- Do not hardcode or expose real credentials in source control.
- Use placeholder values in examples.

## 5. High-Level Architecture
- Frontend pages:
  - / : waiter PIN login page
  - /order : order entry form (authenticated)
  - /display : real-time order board
- Backend routes:
  - /api/auth for authentication and auth status
  - /api/orders for read and create
  - /api/orders/[id] for status update (pending/served)
  - /api/orders/stream for server-sent events updates
- Database:
  - Single Order collection with fields for queueing and status

## 6. Source of Truth Files
Primary implementation lives under the root src directory:
- [src/app/page.js](src/app/page.js)
- [src/app/order/page.js](src/app/order/page.js)
- [src/app/display/page.js](src/app/display/page.js)
- [src/app/api/auth/route.js](src/app/api/auth/route.js)
- [src/app/api/orders/route.js](src/app/api/orders/route.js)
- [src/app/api/orders/[id]/route.js](src/app/api/orders/[id]/route.js)
- [src/app/api/orders/stream/route.js](src/app/api/orders/stream/route.js)
- [src/lib/Order.js](src/lib/Order.js)
- [src/lib/mongodb.js](src/lib/mongodb.js)
- [src/app/globals.css](src/app/globals.css)

Note:
- There is a duplicate scaffold-style folder [Cafe Website/src/app/page.js](Cafe%20Website/src/app/page.js) and related files under [Cafe Website/src/app/layout.js](Cafe%20Website/src/app/layout.js). The active app implementation is the root src folder.

## 7. Data Model
Collection: Order

Fields:
- orderNumber: Number, required
- customerName: String, required, trimmed
- tag: Enum String, required
  - Guest
  - Pastor
  - Elder
  - Adult
  - Youth
  - Children
- priority: Number, required, min 1, max 6
- drink: String, required
- size: Enum String, required
  - S
  - M
  - L
- addOns: Array of String
- status: Enum String, required, default pending
  - pending
  - served
- createdAt: Date, default now

Business mapping:
- Guest => 1
- Pastor => 2
- Elder => 3
- Adult => 4
- Youth => 5
- Children => 6

Indexes:
- status + priority + createdAt compound index for queue sorting

## 8. Authentication Design
Mechanism:
- Shared PIN checked in POST /api/auth
- On success, server sets cookie waiter_auth=authenticated

Cookie settings:
- httpOnly: true
- secure: true only in production
- sameSite: lax
- maxAge: 12 hours
- path: /

Auth checks in app:
- /order page performs GET /api/auth and redirects to / if unauthorized
- POST /api/orders requires authenticated cookie

## 9. API Contracts
### 9.1 GET /api/auth
Purpose:
- Check whether waiter is authenticated

Success response:
- 200 with { authenticated: true }

Failure response:
- 401 with { authenticated: false }

### 9.2 POST /api/auth
Request body:
- { pin: string or number }

Success response:
- 200 with { success: true } and auth cookie

Failure responses:
- 401 with { error: Incorrect PIN }
- 500 with { error: Server PIN not configured }

### 9.3 GET /api/orders
Purpose:
- Return active pending queue and served orders for current day

Response:
- 200 with { orders, servedOrders }
- orders sorted by priority asc, createdAt asc
- servedOrders filtered to today only, sorted by priority asc, createdAt asc

### 9.4 POST /api/orders
Auth:
- Requires waiter_auth authenticated cookie

Request body:
- customerName: string required
- tag: one of tag enum required
- drink: string required
- size: S or M or L required
- addOns: optional string array

Business rules:
- orderNumber auto-increments per day
- first order of day starts at 1
- priority assigned from tag mapping
- status set to pending

Responses:
- 201 with created order document
- 400 missing required fields
- 401 unauthorized

### 9.5 PATCH /api/orders/[id]
Purpose:
- Update order status

Request body:
- { status: pending } sets pending
- any other value sets served

Response:
- 200 with updated order
- 404 if order not found

### 9.6 GET /api/orders/stream
Purpose:
- Real-time updates via server-sent events

Behavior:
- Sends initial payload event with type init
- Polls DB every 2 seconds and sends type update payload
- Sends heartbeat comment every 15 seconds

Event payload shape:
- { type: init or update, orders: [...], servedOrders: [...] }

Headers:
- Content-Type: text/event-stream
- Cache-Control: no-cache, no-transform
- Connection: keep-alive

## 10. UI/UX Functional Behavior
### 10.1 Login Page (/)
- Waiter enters numeric PIN (input constrained to digits)
- On successful login, navigates to /order
- On failure, shows error and clears input
- Live date/time stamp shown in header

### 10.2 Order Page (/order)
- Verifies auth on load, redirects to / if not authenticated
- Form sections:
  - Customer name
  - Tag selection
  - Drink selection
  - Size selection
  - Optional add-ons (preset + custom)
- Submit enabled only when required fields are present
- On success:
  - shows toast including zero-padded order number
  - clears form and custom state
- Sticky bottom action bar for submission

Form constants:
- Drinks:
  - Espresso
  - Latte
  - Cappuccino
  - Long Black
  - Flat White
  - Hot Chocolate
  - Iced Chocolate
  - Iced Coffee
  - Iced Milo
  - Wagh Bakri Special Tea
- Sizes: S, M, L
- Add-ons preset:
  - Whipped Cream
  - Less Condensed Milk
  - Extra Sugar
  - Ice Cream
  - Marshmallow

### 10.3 Display Page (/display)
- Opens EventSource to /api/orders/stream
- Auto-reconnect after disconnect (3 seconds)
- Shows connection state badge (live/reconnecting)
- Two tabs:
  - Pending
  - Served
- Groups tickets by tag priority order
- Displays stats for pending, served today, total
- Mark served and undo actions are optimistic in UI
- SSE data eventually reconciles UI with DB

## 11. Styling System
Implemented in [src/app/globals.css](src/app/globals.css):
- Tailwind v4 import and theme variables via @theme inline
- Warm sunrise palette (cream, espresso, terracotta, caramel)
- Custom utility/component classes:
  - card, glass, chip, btn-primary, label-mono, label-mono-ink
- Decorative and motion features:
  - gradient dawn background
  - grain texture overlay
  - ticket, toast, rise/fade animations
  - reduced motion media support

Typography:
- Fraunces (display)
- Plus Jakarta Sans (UI)
- JetBrains Mono (mono labels)
Loaded in [src/app/layout.js](src/app/layout.js).

## 12. Data/Queue Rules
- Pending queue order is always:
  1. Lower priority number first
  2. Earlier createdAt first
- Served list on board is only for current day
- orderNumber is daily and resets each day

## 13. Database Connectivity
Connection helper in [src/lib/mongodb.js](src/lib/mongodb.js):
- Uses global cache object to prevent duplicate Mongoose connections
- Reuses live connection when readyState is connected
- Clears cached promise on failed connect attempt so retries can occur
- Resets cache on mongoose disconnected event
- Timeouts:
  - serverSelectionTimeoutMS: 10000
  - connectTimeoutMS: 10000

## 14. Known Behavioral Notes
- PATCH /api/orders/[id] currently does not enforce auth cookie check.
- Stream endpoint uses polling inside SSE rather than MongoDB change streams.
- Daily reset and served-today boundaries are based on server local timezone (start of day).

## 15. Rebuild Acceptance Criteria
A rebuilt app should be considered equivalent if it satisfies all below:
- Waiter can authenticate with shared PIN and receives 12-hour auth cookie
- Unauthorized user cannot create orders
- Order creation auto-assigns priority from tag and increments daily orderNumber
- Display shows real-time pending and served lists with automatic refresh
- Queue is sorted by priority then creation time
- Served tab includes only same-day served orders
- Staff can mark order served and undo back to pending
- UI includes themed warm design, grouped ticket board, and mobile-friendly layout

## 16. Suggested Build Sequence For Another AI
1. Create Next.js app-router project with dependencies: next, react, react-dom, mongoose.
2. Add path alias so @/* maps to ./src/*.
3. Implement MongoDB connection cache helper.
4. Implement Order schema, enums, priority mapping, and index.
5. Add auth API and cookie behavior.
6. Add orders CRUD/status APIs with daily order numbering and served-today filtering.
7. Add SSE stream endpoint with initial data, polling updates, and heartbeat.
8. Build pages for login, order entry, and display board.
9. Add global theme styles and animations.
10. Validate all acceptance criteria manually.

## 17. AI Rebuild Prompt (Copy/Paste)
Recreate the Good News Cafe application exactly as specified in this document.

Constraints:
- Use Next.js App Router and React.
- Use MongoDB with Mongoose.
- Implement these routes: /, /order, /display, /api/auth, /api/orders, /api/orders/[id], /api/orders/stream.
- Match data model, tag priority mapping, and queue sorting rules.
- Match auth cookie semantics and unauthorized behavior.
- Match daily order numbering reset and served-today filtering.
- Build a warm sunrise-themed UI with responsive layout and the listed form options.
- Include optimistic served/undo actions on display page with SSE reconciliation.

Deliverables:
- Complete source code
- .env.example with MONGODB_URI and WAITER_PIN placeholders
- Run steps and verification checklist

Definition of done:
- All acceptance criteria in Section 15 pass.
