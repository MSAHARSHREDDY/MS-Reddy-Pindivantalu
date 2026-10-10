import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { MongoClient, Db } from 'mongodb';
import { User, Product, Category, Order, Cart, Coupon, StoreSettings } from './types.js';

// Load env if needed
dotenv.config();
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.example') });
}

interface DatabaseSchema {
  users: User[];
  products: Product[];
  categories: Category[];
  orders: Order[];
  carts: Cart[];
  coupons: Coupon[];
  settings: StoreSettings;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'pindivantalu_db.json');

// Memory cache
let dbCache: DatabaseSchema | null = null;
let isSaving = false;
let pendingSave = false;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getDefaultSeedData(): DatabaseSchema {
  const salt = bcrypt.genSaltSync(10);
  const adminPasswordHash = bcrypt.hashSync('Admin@PindiVantalu2026', salt);
  const customerPasswordHash = bcrypt.hashSync('Customer@123', salt);
  const now = new Date().toISOString();

  const categories: Category[] = [
    {
      id: 'cat_murukulu',
      name: 'Murukulu',
      slug: 'murukulu',
      description: 'Traditional crispy spiral chakli & janthikalu made with premium rice flour, roasted gram and fragrant carom seeds.',
      image: '/src/assets/images/product_crispy_murukulu_1790935783958.jpg',
      parentCategoryId: null,
      isActive: true,
      displayOrder: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cat_mixtures',
      name: 'Mixtures',
      slug: 'mixtures',
      description: 'Zesty savory Telugu mixtures loaded with golden boondi, crunchy sev, fried peanuts, cashews, and aromatic curry leaves.',
      image: '/src/assets/images/product_andhra_mixture_1790935795686.jpg',
      parentCategoryId: null,
      isActive: true,
      displayOrder: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cat_chekkalu',
      name: 'Chekkalu',
      slug: 'chekkalu',
      description: 'Hand-flattened crispy lentil crackers spiced with green chilies, ginger, curry leaves, and tender soaked chana dal.',
      image: '/src/assets/images/product_chekkalu_snack_1790935807445.jpg',
      parentCategoryId: null,
      isActive: true,
      displayOrder: 3,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cat_festive',
      name: 'Festival Specials',
      slug: 'festival-specials',
      description: 'Handcrafted authentic festival sweets and savories prepared in pure cold-pressed oils and organic Telugu jaggery.',
      image: '/src/assets/images/category_festive_collection_1790935819627.jpg',
      parentCategoryId: null,
      isActive: true,
      displayOrder: 4,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const products: Product[] = [
    {
      id: 'prod_andhra_mixture',
      name: 'Ribbon Murkulu',
      slug: 'special-andhra-mixture',
      description: 'Our signature homemade savory snack made using heirloom Godavari recipes. Features crispy golden ribbon spirals, seasoned with fragrant carom seeds, cumin, and fried curry leaves.',
      categoryId: 'cat_murukulu',
      images: [
        '/src/assets/images/ribbon_murukulu_snack_1791473410296.jpg',
        '/src/assets/images/hero_pindivantalu_traditional_1790935769601.jpg',
      ],
      basePrice: 300,
      weight: '500g',
      sku: 'PV-MIX-001',
      variants: [
        { id: 'v_mix_250', weight: '250g', price: 150, stockQuantity: 65, sku: 'PV-MIX-250' },
        { id: 'v_mix_500', weight: '500g', price: 300, stockQuantity: 80, sku: 'PV-MIX-500' },
        { id: 'v_mix_1kg', weight: '1kg', price: 600, stockQuantity: 30, sku: 'PV-MIX-1KG' },
      ],
      stockQuantity: 175,
      lowStockThreshold: 15,
      ingredients: ['Gram Flour (Besan)', 'Rice Flour', 'Peanuts', 'Cashews', 'Curry Leaves', 'Sunflower Oil', 'Guntur Chili Powder', 'Hing', 'Sea Salt'],
      allergens: ['Peanuts', 'Tree Nuts (Cashews)'],
      shelfLife: '60 Days',
      storageInstructions: 'Store in a dry airtight container away from direct sunlight.',
      spiceLevel: 'Spicy',
      isVeg: true,
      isActive: true,
      isFeatured: true,
      isBestSeller: true,
      displayOrder: 1,
      metaTitle: 'Ribbon Murkulu - Authentic Telugu Homemade Snack',
      metaDescription: 'Order traditional homemade Ribbon Murkulu online crafted with heirloom recipes and pure spices.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod_butter_murukulu',
      name: 'Melt-in-Mouth Butter Murukulu',
      slug: 'melt-in-mouth-butter-murukulu',
      description: 'Delicately handcrafted spiral chakli infused with pure country butter (Vennamudda), roasted white sesame seeds, and ajwain. Incredibly light, crisp, and golden.',
      categoryId: 'cat_murukulu',
      images: [
        '/src/assets/images/product_crispy_murukulu_1790935783958.jpg',
        '/src/assets/images/hero_pindivantalu_traditional_1790935769601.jpg',
      ],
      basePrice: 240,
      weight: '500g',
      sku: 'PV-MUR-001',
      variants: [
        { id: 'v_mur_250', weight: '250g', price: 130, stockQuantity: 40, sku: 'PV-MUR-250' },
        { id: 'v_mur_500', weight: '500g', price: 240, stockQuantity: 55, sku: 'PV-MUR-500' },
        { id: 'v_mur_1kg', weight: '1kg', price: 460, stockQuantity: 20, sku: 'PV-MUR-1KG' },
      ],
      stockQuantity: 115,
      lowStockThreshold: 10,
      ingredients: ['Premium Rice Flour', 'Roasted Bengal Gram Flour', 'Pure Butter', 'White Sesame Seeds', 'Carom Seeds (Vamu)', 'Rock Salt', 'Sunflower Oil'],
      allergens: ['Dairy (Butter)'],
      shelfLife: '45 Days',
      storageInstructions: 'Keep in an airtight jar. Do not refrigerate.',
      spiceLevel: 'Mild',
      isVeg: true,
      isActive: true,
      isFeatured: true,
      isBestSeller: true,
      displayOrder: 2,
      metaTitle: 'Crispy Butter Murukulu - Pure Homemade Vennamudda Chakli',
      metaDescription: 'Authentic Andhra Butter Murukulu crafted fresh with pure butter and sesame seeds.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod_pappu_chekkalu',
      name: 'Spicy Pappu Chekkalu',
      slug: 'spicy-pappu-chekkalu',
      description: 'Traditional Telugu thin round savory discs pressed by hand, studded with tender soaked chana dal, finely chopped ginger, fresh curry leaves, and green chili paste.',
      categoryId: 'cat_chekkalu',
      images: [
        '/src/assets/images/product_chekkalu_snack_1790935807445.jpg',
      ],
      basePrice: 230,
      weight: '500g',
      sku: 'PV-CHK-001',
      variants: [
        { id: 'v_chk_250', weight: '250g', price: 125, stockQuantity: 45, sku: 'PV-CHK-250' },
        { id: 'v_chk_500', weight: '500g', price: 230, stockQuantity: 50, sku: 'PV-CHK-500' },
        { id: 'v_chk_1kg', weight: '1kg', price: 440, stockQuantity: 15, sku: 'PV-CHK-1KG' },
      ],
      stockQuantity: 110,
      lowStockThreshold: 12,
      ingredients: ['Stone Ground Rice Flour', 'Chana Dal (Bengal Gram)', 'Fresh Green Chilies', 'Ginger', 'Curry Leaves', 'Cumin Seeds', 'Refined Sunflower Oil', 'Salt'],
      allergens: [],
      shelfLife: '45 Days',
      storageInstructions: 'Store in an airtight container to preserve crispness.',
      spiceLevel: 'Medium',
      isVeg: true,
      isActive: true,
      isFeatured: true,
      isBestSeller: true,
      displayOrder: 3,
      metaTitle: 'Authentic Spicy Pappu Chekkalu - Rice Crackers',
      metaDescription: 'Handcrafted crunchy Andhra Chekkalu with chana dal and green chilies.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod_bellam_gavvalu',
      name: 'Traditional Bellam Gavvalu',
      slug: 'traditional-bellam-gavvalu',
      description: 'Shell-shaped festival sweet delicacies made from flour dough rolled on traditional wooden plank, fried to golden crispness and dipped in fragrant cardamom-infused organic jaggery syrup.',
      categoryId: 'cat_festive',
      images: [
        '/src/assets/images/category_festive_collection_1790935819627.jpg',
      ],
      basePrice: 260,
      weight: '500g',
      sku: 'PV-GVL-001',
      variants: [
        { id: 'v_gvl_250', weight: '250g', price: 140, stockQuantity: 30, sku: 'PV-GVL-250' },
        { id: 'v_gvl_500', weight: '500g', price: 260, stockQuantity: 40, sku: 'PV-GVL-500' },
        { id: 'v_gvl_1kg', weight: '1kg', price: 490, stockQuantity: 20, sku: 'PV-GVL-1KG' },
      ],
      stockQuantity: 70,
      lowStockThreshold: 10,
      ingredients: ['Wheat Flour', 'Pure Organic Jaggery (Bellam)', 'Cardamom Powder', 'Ghee', 'Sunflower Oil'],
      allergens: ['Gluten', 'Dairy (Ghee)'],
      shelfLife: '30 Days',
      storageInstructions: 'Store in a dry airtight container. Do not expose to moisture.',
      spiceLevel: 'Mild',
      isVeg: true,
      isActive: true,
      isFeatured: false,
      isBestSeller: true,
      displayOrder: 4,
      metaTitle: 'Bellam Gavvalu - Jaggery Sweet Shells',
      metaDescription: 'Traditional homemade Bellam Gavvalu coated with organic jaggery and cardamom.',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const users: User[] = [];
  const coupons: Coupon[] = [];
  const orders: Order[] = [];
  const carts: Cart[] = [];

  const settings: StoreSettings = {
    storeName: 'MS Reddy PindiVantalu',
    tagline: 'Taste the Tradition of Homemade Andhra Snacks',
    supportPhone: '+91 98765 43210',
    whatsappNumber: '+919876543210',
    supportEmail: 'orders@pindivantalu.com',
    storeAddress: 'Traditional Kitchens, Madhapur, Hyderabad, Telangana 500081',
    freeDeliveryThreshold: 0,
    standardDeliveryFee: 0,
    codEnabled: true,
    onlinePaymentEnabled: true,
    bannerNotice: {
      enabled: false,
      text: '',
      linkUrl: '/products',
    },
    seoDefaults: {
      title: 'MS Reddy PindiVantalu - Traditional Telugu Homemade Snacks & Sweets',
      description: 'Order authentic Telugu MS Reddy PindiVantalu, crispy Murukulu, Andhra Mixture, Chekkalu, and sweets delivered to your doorstep.',
    },
    campaignOffers: [],
    updatedAt: now,
  };

  return {
    users,
    products,
    categories,
    orders,
    carts,
    coupons,
    settings,
  };
}

export function getDb(): DatabaseSchema {
  if (dbCache) {
    return dbCache;
  }
  ensureDataDir();
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      dbCache = JSON.parse(data);
      // Ensure all collections exist
      if (!dbCache?.users) dbCache!.users = [];
      if (!dbCache?.products) dbCache!.products = [];
      if (!dbCache?.categories) dbCache!.categories = [];
      if (!dbCache?.orders) dbCache!.orders = [];
      if (!dbCache?.carts) dbCache!.carts = [];
      if (!dbCache?.coupons) dbCache!.coupons = [];
      if (!dbCache?.settings) dbCache!.settings = getDefaultSeedData().settings;
      return dbCache!;
    } catch (err) {
      console.error('Error parsing db file, re-initializing seed data:', err);
    }
  }

  dbCache = getDefaultSeedData();
  saveDbSync();
  return dbCache;
}

export function saveDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isSaving) {
      pendingSave = true;
      resolve();
      return;
    }
    isSaving = true;
    ensureDataDir();
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    const data = JSON.stringify(dbCache, null, 2);

    fs.writeFile(tempFile, data, 'utf-8', (err) => {
      if (err) {
        isSaving = false;
        console.error('Failed to write db file:', err);
        reject(err);
        return;
      }
      fs.rename(tempFile, DB_FILE, (renameErr) => {
        isSaving = false;
        if (renameErr) {
          console.error('Failed to rename temp db file:', renameErr);
          reject(renameErr);
          return;
        }
        if (pendingSave) {
          pendingSave = false;
          saveDb().then(resolve).catch(reject);
        } else {
          resolve();
        }
      });
    });
  });
}

export function saveDbSync(): void {
  ensureDataDir();
  const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
  const data = JSON.stringify(dbCache, null, 2);
  fs.writeFileSync(tempFile, data, 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}

// ---------------- MONGODB ATLAS INTEGRATION ----------------
let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;
let mongoConnectPromise: Promise<Db | null> | null = null;

export function getMongoDb(): Db | null {
  return mongoDb;
}

export async function initMongo(): Promise<Db | null> {
  if (mongoDb) return mongoDb;
  if (mongoConnectPromise) return mongoConnectPromise;

  mongoConnectPromise = (async () => {
    const mongoUri =
      process.env.MONGODB_URI ||
      'mongodb+srv://saharshreddym59_db_user:Vsvc3ZmayzqOb5KZ@cluster0.7hvbdms.mongodb.net/';

    try {
      console.log('[MongoDB] Connecting to MongoDB Atlas...');
      mongoClient = new MongoClient(mongoUri, {
        serverSelectionTimeoutMS: 10000,
      });
      await mongoClient.connect();
      mongoDb = mongoClient.db('pindivantalu');
      console.log('[MongoDB] Successfully connected to database: pindivantalu');

      // Sync collections with cache (bidirectional)
      await syncMongoWithCache();
      return mongoDb;
    } catch (err: any) {
      console.error('[MongoDB] Connection error:', err.message);
      mongoConnectPromise = null;
      return null;
    }
  })();

  return mongoConnectPromise;
}

export async function syncMongoWithCache(): Promise<void> {
  if (!mongoDb) return;
  try {
    const db = getDb();

    // 1. Sync Users
    const usersCol = mongoDb.collection('users');
    const usersCount = await usersCol.countDocuments();
    if (usersCount === 0) {
      console.log('[MongoDB] Seeding initial users into MongoDB users collection...');
      if (db.users.length > 0) {
        await usersCol.insertMany(db.users.map((u) => ({ ...u })));
      }
    } else {
      console.log(`[MongoDB] Loading ${usersCount} users from MongoDB...`);
      const mongoUsers = (await usersCol.find().toArray()) as any[];
      db.users = mongoUsers.map(({ _id, ...safeUser }) => safeUser as User);
    }

    // 2. Sync Products
    const productsCol = mongoDb.collection('products');
    const productsCount = await productsCol.countDocuments();
    if (productsCount === 0) {
      if (db.products.length > 0) {
        await productsCol.insertMany(db.products.map((p) => ({ ...p })));
      }
    } else {
      const mongoProducts = (await productsCol.find().toArray()) as any[];
      db.products = mongoProducts.map((mp) => {
        const { _id, ...safeProd } = mp;
        if (safeProd.salePrice !== undefined && (safeProd.salePrice >= safeProd.basePrice || safeProd.salePrice === null)) {
          delete safeProd.salePrice;
        }
        if (safeProd.variants) {
          safeProd.variants = safeProd.variants.map((v: any) => {
            if (v.salePrice !== undefined && (v.salePrice >= v.price || v.salePrice === null)) {
              const { salePrice, ...rest } = v;
              return rest;
            }
            return v;
          });
        }
        return safeProd as Product;
      });
    }

    // 3. Sync Categories
    const categoriesCol = mongoDb.collection('categories');
    const categoriesCount = await categoriesCol.countDocuments();
    if (categoriesCount === 0) {
      if (db.categories.length > 0) {
        await categoriesCol.insertMany(db.categories.map((c) => ({ ...c })));
      }
    } else {
      const mongoCategories = (await categoriesCol.find().toArray()) as any[];
      db.categories = mongoCategories.map(({ _id, ...safeCat }) => safeCat as Category);
    }

    // 4. Sync Orders (MongoDB Atlas is the source of truth)
    const ordersCol = mongoDb.collection('orders');
    const mongoOrders = (await ordersCol.find().toArray()) as any[];
    // Authoritatively synchronize db.orders to match MongoDB Atlas
    db.orders = mongoOrders.map((mo) => {
      const { _id, ...safeOrder } = mo;
      return safeOrder as Order;
    });
    console.log(`[MongoDB] Synchronized ${db.orders.length} orders from MongoDB Atlas.`);

    saveDbSync();
    console.log('[MongoDB] Database sync with MongoDB Atlas complete.');
  } catch (err: any) {
    console.error('[MongoDB] Error during initial sync:', err.message);
  }
}

export async function syncUserFromMongo(emailOrId: string): Promise<User | null> {
  const norm = (emailOrId || '').toLowerCase().trim();
  if (!norm) return null;
  const db = getDb();

  try {
    const mDb = await initMongo();
    if (mDb) {
      const mongoUser = (await mDb.collection('users').findOne({
        $or: [
          { id: emailOrId },
          { email: norm },
          { email: new RegExp(`^${norm}$`, 'i') },
        ],
      })) as any;

      if (mongoUser) {
        const { _id, ...safeUser } = mongoUser;
        const idx = db.users.findIndex(
          (u) => u.id === safeUser.id || (u.email && u.email.toLowerCase() === norm)
        );
        if (idx >= 0) {
          db.users[idx] = { ...db.users[idx], ...safeUser };
          saveDbSync();
          return db.users[idx];
        } else {
          db.users.push(safeUser);
          saveDbSync();
          return safeUser;
        }
      }
    }
  } catch (err: any) {
    console.error('[MongoDB] Error in syncUserFromMongo:', err.message);
  }

  return db.users.find((u) => u.id === emailOrId || u.email.toLowerCase() === norm) || null;
}

export async function saveUserToMongo(user: User): Promise<void> {
  const db = getDb();
  const idx = db.users.findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    db.users[idx] = user;
  } else {
    db.users.push(user);
  }
  saveDbSync();

  const mDb = await initMongo();

  if (mDb) {
    try {
      const { _id, ...userData } = user as any;
      await mDb.collection('users').updateOne(
        { $or: [{ id: user.id }, { email: user.email.toLowerCase() }] },
        { $set: { ...userData, email: user.email.toLowerCase() } },
        { upsert: true }
      );
      console.log(
        `[MongoDB] Successfully persisted user "${user.name}" (${user.email}) with role [${user.role}] into MongoDB Atlas database 'pindivantalu' collection 'users'!`
      );
    } catch (err: any) {
      console.error('[MongoDB] Failed to write user to MongoDB:', err.message);
    }
  } else {
    console.warn('[MongoDB] MongoDB Atlas not connected; user persisted to local JSON store.');
  }
}

export async function saveOrderToMongo(order: Order): Promise<void> {
  if (!mongoDb) await initMongo();
  if (mongoDb) {
    try {
      const { _id, ...orderData } = order as any;
      await mongoDb.collection('orders').updateOne(
        { id: order.id },
        { $set: orderData },
        { upsert: true }
      );
      console.log(`[MongoDB] Successfully persisted order ${order.orderNumber} into MongoDB Atlas!`);
    } catch (err: any) {
      console.error('[MongoDB] Failed to write order to MongoDB:', err.message);
    }
  }
}

export async function saveProductToMongo(product: Product): Promise<void> {
  if (!mongoDb) await initMongo();
  if (mongoDb) {
    try {
      const { _id, ...productData } = product as any;
      await mongoDb.collection('products').replaceOne(
        { id: product.id },
        productData,
        { upsert: true }
      );
      console.log(`[MongoDB] Successfully synced product "${product.name}" (stock: ${product.stockQuantity}) into MongoDB Atlas.`);
    } catch (err: any) {
      console.error('[MongoDB] Failed to write product to MongoDB:', err.message);
    }
  }
}

export async function getOrdersFromDb(filter: any = {}): Promise<Order[]> {
  const db = getDb();
  try {
    const mDb = await initMongo();
    if (mDb) {
      const mongoOrders = (await mDb.collection('orders').find(filter).sort({ createdAt: -1 }).toArray()) as any[];
      const safeOrders = mongoOrders.map(({ _id, ...o }) => o as Order);
      if (Object.keys(filter).length === 0) {
        db.orders = safeOrders;
        saveDbSync();
      }
      return safeOrders;
    }
  } catch (err: any) {
    console.error('[MongoDB] Error querying orders from MongoDB:', err.message);
  }
  return db.orders;
}

export async function getCustomerOrdersFromDb(userId: string, email: string, phone: string): Promise<Order[]> {
  const db = getDb();
  try {
    const mDb = await initMongo();
    if (mDb) {
      const normalizedEmail = (email || '').toLowerCase().trim();
      const normalizedPhone = (phone || '').trim().replace(/[^0-9]/g, '');
      const orConditions: any[] = [];
      if (userId) orConditions.push({ userId });
      if (normalizedEmail) {
        orConditions.push({ customerEmail: normalizedEmail });
        orConditions.push({ customerEmail: new RegExp(`^${normalizedEmail}$`, 'i') });
      }
      if (normalizedPhone) {
        orConditions.push({ customerPhone: normalizedPhone });
      }

      const filter = orConditions.length > 0 ? { $or: orConditions } : {};
      const mongoOrders = (await mDb.collection('orders').find(filter).sort({ createdAt: -1 }).toArray()) as any[];
      return mongoOrders.map(({ _id, ...o }) => o as Order);
    }
  } catch (err: any) {
    console.error('[MongoDB] Error querying customer orders from MongoDB:', err.message);
  }

  const normEmail = (email || '').toLowerCase().trim();
  const normPhone = (phone || '').trim().replace(/[^0-9]/g, '');
  return db.orders.filter(
    (o) =>
      o.userId === userId ||
      (normEmail && o.customerEmail?.toLowerCase() === normEmail) ||
      (normPhone && o.customerPhone && o.customerPhone.replace(/[^0-9]/g, '') === normPhone)
  );
}

export async function getOrderByIdFromDb(idOrNumber: string): Promise<Order | null> {
  const db = getDb();
  try {
    const mDb = await initMongo();
    if (mDb) {
      const mongoOrder = (await mDb.collection('orders').findOne({
        $or: [{ id: idOrNumber }, { orderNumber: idOrNumber }],
      })) as any;
      if (mongoOrder) {
        const { _id, ...safeOrder } = mongoOrder;
        return safeOrder as Order;
      } else {
        // If it was deleted in MongoDB, remove from local cache too
        db.orders = db.orders.filter((o) => o.id !== idOrNumber && o.orderNumber !== idOrNumber);
        saveDbSync();
        return null;
      }
    }
  } catch (err: any) {
    console.error('[MongoDB] Error fetching order from MongoDB:', err.message);
  }
  return db.orders.find((o) => o.id === idOrNumber || o.orderNumber === idOrNumber) || null;
}

export async function deleteOrderFromMongo(orderIdOrNumber: string): Promise<boolean> {
  const db = getDb();
  db.orders = db.orders.filter((o) => o.id !== orderIdOrNumber && o.orderNumber !== orderIdOrNumber);
  saveDbSync();

  try {
    const mDb = await initMongo();
    if (mDb) {
      const res = await mDb.collection('orders').deleteOne({
        $or: [{ id: orderIdOrNumber }, { orderNumber: orderIdOrNumber }],
      });
      console.log(`[MongoDB] Deleted order ${orderIdOrNumber} from MongoDB Atlas (deleted: ${res.deletedCount}).`);
      return res.deletedCount > 0;
    }
  } catch (err: any) {
    console.error('[MongoDB] Error deleting order from MongoDB:', err.message);
  }
  return true;
}

export async function updateOrderInMongo(order: Order): Promise<void> {
  const db = getDb();
  const idx = db.orders.findIndex((o) => o.id === order.id || o.orderNumber === order.orderNumber);
  if (idx >= 0) {
    db.orders[idx] = order;
  } else {
    db.orders.unshift(order);
  }
  saveDbSync();

  try {
    const mDb = await initMongo();
    if (mDb) {
      const { _id, ...orderData } = order as any;
      await mDb.collection('orders').updateOne(
        { $or: [{ id: order.id }, { orderNumber: order.orderNumber }] },
        { $set: orderData },
        { upsert: true }
      );
      console.log(`[MongoDB] Updated order ${order.orderNumber} in MongoDB Atlas to [status: ${order.orderStatus}, payment: ${order.paymentStatus}].`);
    }
  } catch (err: any) {
    console.error('[MongoDB] Error updating order in MongoDB:', err.message);
  }
}

export async function deleteProductFromMongo(productId: string): Promise<void> {
  const db = getDb();
  db.products = db.products.filter((p) => p.id !== productId);
  saveDbSync();

  try {
    const mDb = await initMongo();
    if (mDb) {
      await mDb.collection('products').deleteOne({ id: productId });
      console.log(`[MongoDB] Deleted product ${productId} from MongoDB Atlas.`);
    }
  } catch (err: any) {
    console.error('[MongoDB] Error deleting product from MongoDB:', err.message);
  }
}

export async function saveCategoryToMongo(category: Category): Promise<void> {
  const db = getDb();
  const idx = db.categories.findIndex((c) => c.id === category.id);
  if (idx >= 0) db.categories[idx] = category;
  else db.categories.push(category);
  saveDbSync();

  try {
    const mDb = await initMongo();
    if (mDb) {
      const { _id, ...data } = category as any;
      await mDb.collection('categories').updateOne({ id: category.id }, { $set: data }, { upsert: true });
    }
  } catch (err: any) {
    console.error('[MongoDB] Error saving category to MongoDB:', err.message);
  }
}

export async function deleteCategoryFromMongo(categoryId: string): Promise<void> {
  const db = getDb();
  db.categories = db.categories.filter((c) => c.id !== categoryId);
  saveDbSync();

  try {
    const mDb = await initMongo();
    if (mDb) {
      await mDb.collection('categories').deleteOne({ id: categoryId });
    }
  } catch (err: any) {
    console.error('[MongoDB] Error deleting category from MongoDB:', err.message);
  }
}

export async function deleteUserFromMongo(userId: string): Promise<void> {
  const db = getDb();
  const user = db.users.find((u) => u.id === userId || u.email?.toLowerCase() === userId.toLowerCase());
  const userEmail = user?.email ? user.email.toLowerCase().trim() : (userId.includes('@') ? userId.toLowerCase().trim() : '');

  db.users = db.users.filter((u) => u.id !== userId && (!userEmail || u.email.toLowerCase() !== userEmail));
  saveDbSync();

  const mDb = await initMongo();
  if (mDb) {
    try {
      const orClauses: any[] = [{ id: userId }];
      if (userEmail) {
        orClauses.push({ email: userEmail });
        orClauses.push({ email: new RegExp(`^${userEmail}$`, 'i') });
      }
      const res = await mDb.collection('users').deleteMany({ $or: orClauses });
      console.log(`[MongoDB] Successfully deleted ${res.deletedCount} user document(s) from MongoDB Atlas for identifier: ${userId} (${userEmail})`);
    } catch (err: any) {
      console.error('[MongoDB] Failed to delete user from MongoDB:', err.message);
    }
  }
}
