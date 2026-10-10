# PindiVantalu – Traditional Telugu Homemade Snacks & Sweets

A production-ready, full-stack e-commerce web platform engineered for **PindiVantalu**, specializing in authentic homemade Andhra and Telangana savories, crispy Murukulu, special Mixtures, Chekkalu, and festival delicacies.

---

## 1. System Architecture

```
/
├── server.ts                    # Express.js server entry point & dev middleware
├── server/
│   ├── types.ts                 # TypeScript domain entities (User, Product, Order, etc.)
│   ├── db.ts                    # Resilient database persistence & seed initialization
│   ├── middleware/
│   │   └── auth.ts              # JWT authentication & role-based authorization (customer & admin)
│   └── routes/
│       ├── auth.ts              # Customer registration, login, profile, addresses
│       ├── products.ts          # Customer search/filter & Admin product CRUD
│       ├── categories.ts        # Category listing & Admin category CRUD
│       ├── cart.ts              # Persistent cart management & stock verification
│       ├── orders.ts            # Atomic checkout, inventory deduction, order tracking
│       ├── coupons.ts           # Promo code validation & coupon CRUD
│       ├── admin.ts             # Analytics dashboard, inventory adjustments, settings
│       └── media.ts             # Image preset gallery & upload endpoints
├── src/
│   ├── types/index.ts           # Frontend shared type definitions
│   ├── services/api.ts          # Typed REST API client with auth token handling
│   ├── context/
│   │   ├── AuthContext.tsx      # Customer & Admin authentication state
│   │   └── CartContext.tsx      # Persistent shopping cart & coupon state
│   ├── components/
│   │   ├── Navbar.tsx           # Strict Top-Bar Contract (Brand, Links, Actions)
│   │   ├── Footer.tsx           # Culinary heritage, WhatsApp support, FSSAI info
│   │   ├── PromotionalBanner.tsx# Dismissible admin-controlled announcement bar
│   │   ├── ProductCard.tsx      # High-fidelity image card with variant pricing
│   │   ├── CartDrawer.tsx       # Slide-over cart drawer with free shipping progress
│   │   ├── SearchModal.tsx      # Real-time search with instant results
│   │   └── AuthModal.tsx        # Login, registration, and password recovery
│   └── views/
│       ├── HomeView.tsx         # Hero banner, dynamic categories, best sellers
│       ├── CatalogView.tsx      # Filtering, sorting, price range, search, pagination
│       ├── ProductDetailView.tsx# Rich PDP with multiple images, variant weights, specs
│       ├── CheckoutView.tsx     # Delivery address selection, COD & Online payment
│       ├── OrderConfirmationView.tsx # Unique order number, summary, print invoice
│       ├── OrderTrackView.tsx   # Visual 6-stage order fulfillment tracker
│       ├── ProfileView.tsx      # Customer account & saved addresses
│       ├── HeritageView.tsx     # Traditional Telugu culinary story & quality pledge
│       └── admin/
│           └── AdminDashboard.tsx # Comprehensive admin control center (CRUD, stats, inventory)
```

---

## 2. Default Access Credentials

### Administrator Account
- **Email:** `admin@pindivantalu.com`
- **Password:** `Admin@PindiVantalu2026`
- **Capabilities:** Full CRUD over products, categories, orders, coupons, kitchen inventory, and store settings.

### Demo Customer Account
- **Email:** `customer@example.com`
- **Password:** `Customer@123`
- **Name:** Ananya Rao
- **Addresses:** Flat 402, Sri Nilayam, Jubilee Hills, Hyderabad.

---

## 3. Key Features

1. **Dynamic Catalog Control:**
   - Products and categories are **never** hardcoded.
   - Any product created in the Admin Dashboard (e.g. *Special Andhra Mixture*, *Pappu Chekkalu*, *Bellam Gavvalu*) immediately appears in the customer store without redeploying code.
   - Initial categories include **Murukulu** and **Mixtures**, with full admin capability to add **Chekkalu**, **Karapusa**, **Boondi**, **Janthikalu**, **Festival Specials**, or any custom category.

2. **Atomic Inventory Management:**
   - Real-time stock tracking by product and variant (250g, 500g, 1kg).
   - Stock is automatically reduced upon confirmed order checkout.
   - Stock is automatically restored if an order is cancelled.

3. **Secure Checkout & Order Fulfilment:**
   - Unique order reference numbers (e.g. `PV-2026-1001`).
   - Immutable snapshot of items, weights, and unit prices on each order.
   - 6-stage live order tracking: *Order Placed* $\to$ *Confirmed* $\to$ *Preparing* $\to$ *Packed & Sealed* $\to$ *Out for Delivery* $\to$ *Delivered*.
   - Cash on Delivery (COD) and Online Payment workflows.

4. **Zero-Pill Visual Discipline:**
   - Adheres to universal frontend design standards: clean typographic hierarchy, natural title-case prose, unboxed metadata with `·` separators, and 60-30-10 warm Indian color harmony.

---

## 4. Running Locally & Production Deployment

### Development
```bash
npm run dev
# Starts unified Express server on http://localhost:3000 with Vite middleware
```

### Production Build
```bash
npm run build
npm start
```

### MongoDB Atlas Setup
1. Create a cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a database user and whitelist `0.0.0.0/0` or your Cloud Run service IP.
3. Set `MONGODB_URI` in `.env`:
   ```bash
   MONGODB_URI="mongodb+srv://<user>:<password>@cluster0.mongodb.net/pindivantalu?retryWrites=true&w=majority"
   ```
4. If `MONGODB_URI` is not supplied, the application automatically uses its zero-dependency atomic persistent file storage (`data/pindivantalu_db.json`), guaranteeing out-of-the-box operation.
