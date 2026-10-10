import { Router, Response } from 'express';
import { getDb, saveDb, saveProductToMongo, initMongo } from '../db.js';
import { AuthenticatedRequest, requireAdmin } from '../middleware/auth.js';
import { Product, ProductVariant } from '../types.js';

export const productsRouter = Router();

// Helper to generate slug from name
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

// ---------------- CUSTOMER PUBLIC ROUTES ----------------

// GET /api/products
productsRouter.get('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const db = getDb();
    const {
      search,
      category,
      minPrice,
      maxPrice,
      sort = 'popularity',
      page = '1',
      limit = '12',
      featured,
    } = req.query;

    let items = db.products.filter((p) => p.isActive);

    // Search filter
    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.ingredients && p.ingredients.some((ing) => ing.toLowerCase().includes(q)))
      );
    }

    // Category filter (slug or id)
    if (category && typeof category === 'string' && category !== 'all') {
      const catObj = db.categories.find(
        (c) => c.slug === category || c.id === category || c.name.toLowerCase() === category.toLowerCase()
      );
      if (catObj) {
        items = items.filter((p) => p.categoryId === catObj.id);
      } else {
        items = items.filter((p) => p.categoryId === category);
      }
    }

    // Featured filter
    if (featured === 'true') {
      items = items.filter((p) => p.isFeatured || p.isBestSeller);
    }

    // Price range filter
    if (minPrice && !isNaN(Number(minPrice))) {
      items = items.filter((p) => (p.salePrice ?? p.basePrice) >= Number(minPrice));
    }
    if (maxPrice && !isNaN(Number(maxPrice))) {
      items = items.filter((p) => (p.salePrice ?? p.basePrice) <= Number(maxPrice));
    }

    // Sorting
    switch (sort) {
      case 'price_asc':
        items.sort((a, b) => (a.salePrice ?? a.basePrice) - (b.salePrice ?? b.basePrice));
        break;
      case 'price_desc':
        items.sort((a, b) => (b.salePrice ?? b.basePrice) - (a.salePrice ?? a.basePrice));
        break;
      case 'newest':
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'name_asc':
        items.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'popularity':
      default:
        // Featured and best sellers first, then displayOrder
        items.sort((a, b) => {
          if (a.isBestSeller && !b.isBestSeller) return -1;
          if (!a.isBestSeller && b.isBestSeller) return 1;
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          return a.displayOrder - b.displayOrder;
        });
        break;
    }

    const totalCount = items.length;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 12);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedItems = items.slice(startIndex, startIndex + limitNum);

    res.json({
      success: true,
      products: paginatedItems,
      totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch products.' });
  }
});

// GET /api/products/:slug
productsRouter.get('/:slug', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { slug } = req.params;
    const db = getDb();
    const product = db.products.find((p) => p.slug === slug || p.id === slug);

    if (!product || (!product.isActive && (!req.user || req.user.role !== 'admin'))) {
      res.status(404).json({ success: false, message: 'Product not found.' });
      return;
    }

    // Get category info
    const category = db.categories.find((c) => c.id === product.categoryId);

    // Get related products from same category
    const relatedProducts = db.products
      .filter((p) => p.isActive && p.categoryId === product.categoryId && p.id !== product.id)
      .slice(0, 4);

    res.json({
      success: true,
      product,
      category,
      relatedProducts,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch product.' });
  }
});

// ---------------- ADMIN ROUTES ----------------

// GET /api/admin/products
productsRouter.get('/admin/list', requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const db = getDb();
    const { search, category, status } = req.query;

    let items = [...db.products];

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      items = items.filter(
        (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      );
    }

    if (category && typeof category === 'string' && category !== 'all') {
      items = items.filter((p) => p.categoryId === category);
    }

    if (status === 'active') {
      items = items.filter((p) => p.isActive);
    } else if (status === 'inactive') {
      items = items.filter((p) => !p.isActive);
    } else if (status === 'low_stock') {
      items = items.filter((p) => p.stockQuantity <= p.lowStockThreshold && p.stockQuantity > 0);
    } else if (status === 'out_of_stock') {
      items = items.filter((p) => p.stockQuantity <= 0);
    }

    items.sort((a, b) => a.displayOrder - b.displayOrder);

    res.json({ success: true, products: items, totalCount: items.length });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch admin products.' });
  }
});

// POST /api/admin/products
productsRouter.post('/admin/create', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      name,
      slug,
      description,
      categoryId,
      images,
      basePrice,
      salePrice,
      weight,
      sku,
      variants,
      stockQuantity,
      lowStockThreshold,
      ingredients,
      allergens,
      shelfLife,
      storageInstructions,
      spiceLevel,
      isVeg,
      isActive,
      isFeatured,
      isBestSeller,
      displayOrder,
      campaignOffer,
      metaTitle,
      metaDescription,
    } = req.body;

    if (!name || !categoryId || basePrice === undefined) {
      res.status(400).json({ success: false, message: 'Product name, category, and base price are required.' });
      return;
    }

    const db = getDb();
    const finalSlug = slug ? slugify(slug) : slugify(name);

    // Ensure slug uniqueness
    let uniqueSlug = finalSlug;
    let counter = 1;
    while (db.products.some((p) => p.slug === uniqueSlug)) {
      uniqueSlug = `${finalSlug}-${counter++}`;
    }

    const now = new Date().toISOString();
    const newProduct: Product = {
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      slug: uniqueSlug,
      description: description ? description.trim() : '',
      categoryId,
      images: Array.isArray(images) && images.length > 0 ? images : ['/src/assets/images/hero_pindivantalu_traditional_1790935769601.jpg'],
      basePrice: Number(basePrice),
      salePrice: salePrice !== undefined && salePrice !== null && salePrice !== '' ? Number(salePrice) : undefined,
      weight: weight ? weight.trim() : '500g',
      sku: sku ? sku.trim() : `PV-${Date.now().toString().slice(-4)}`,
      variants: Array.isArray(variants) ? variants : [],
      stockQuantity: stockQuantity !== undefined ? Number(stockQuantity) : 50,
      lowStockThreshold: lowStockThreshold !== undefined ? Number(lowStockThreshold) : 10,
      ingredients: Array.isArray(ingredients) ? ingredients : typeof ingredients === 'string' ? ingredients.split(',').map((s) => s.trim()).filter(Boolean) : [],
      allergens: Array.isArray(allergens) ? allergens : typeof allergens === 'string' ? allergens.split(',').map((s) => s.trim()).filter(Boolean) : [],
      shelfLife: shelfLife ? shelfLife.trim() : '45 Days',
      storageInstructions: storageInstructions ? storageInstructions.trim() : 'Store in an airtight container.',
      spiceLevel: spiceLevel || 'Medium',
      isVeg: isVeg !== undefined ? Boolean(isVeg) : true,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      isFeatured: Boolean(isFeatured),
      isBestSeller: Boolean(isBestSeller),
      displayOrder: displayOrder !== undefined ? Number(displayOrder) : db.products.length + 1,
      campaignOffer: campaignOffer ? campaignOffer.trim() : undefined,
      metaTitle: metaTitle ? metaTitle.trim() : undefined,
      metaDescription: metaDescription ? metaDescription.trim() : undefined,
      createdAt: now,
      updatedAt: now,
    };

    db.products.push(newProduct);
    await saveDb();
    saveProductToMongo(newProduct).catch(() => {});

    res.status(201).json({ success: true, product: newProduct, message: 'Product created successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to create product.' });
  }
});

// PATCH /api/admin/products/:id
productsRouter.patch('/admin/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const db = getDb();
    const product = db.products.find((p) => p.id === id);

    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found.' });
      return;
    }

    const updates = req.body;
    if (updates.name && updates.name !== product.name) {
      product.name = updates.name.trim();
      if (!updates.slug) {
        // Keep slug or update if requested
      }
    }

    if (updates.slug && updates.slug !== product.slug) {
      const candidateSlug = slugify(updates.slug);
      if (!db.products.some((p) => p.id !== id && p.slug === candidateSlug)) {
        product.slug = candidateSlug;
      }
    }

    if (updates.description !== undefined) product.description = updates.description.trim();
    if (updates.categoryId !== undefined) product.categoryId = updates.categoryId;
    // Allow updating product images from admin panel
    if (updates.images !== undefined && Array.isArray(updates.images) && updates.images.length > 0) {
      product.images = updates.images;
    }
    if (updates.basePrice !== undefined) {
      product.basePrice = Number(updates.basePrice);
    }
    // Only keep salePrice if explicitly provided and strictly less than basePrice
    if (updates.salePrice !== undefined && updates.salePrice !== null && updates.salePrice !== '') {
      const sp = Number(updates.salePrice);
      product.salePrice = sp < product.basePrice ? sp : undefined;
    } else {
      product.salePrice = undefined;
    }
    if (updates.weight !== undefined) product.weight = updates.weight;
    if (updates.sku !== undefined) product.sku = updates.sku;
    if (updates.variants !== undefined && Array.isArray(updates.variants)) {
      product.variants = updates.variants.map((v: any) => ({
        ...v,
        price: Number(v.price),
        salePrice: (v.salePrice !== undefined && v.salePrice !== null && Number(v.salePrice) < Number(v.price))
          ? Number(v.salePrice)
          : undefined,
      }));
    }
    if (updates.stockQuantity !== undefined) product.stockQuantity = Number(updates.stockQuantity);
    if (updates.lowStockThreshold !== undefined) product.lowStockThreshold = Number(updates.lowStockThreshold);
    if (updates.ingredients !== undefined) {
      product.ingredients = Array.isArray(updates.ingredients) ? updates.ingredients : typeof updates.ingredients === 'string' ? updates.ingredients.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    }
    if (updates.allergens !== undefined) {
      product.allergens = Array.isArray(updates.allergens) ? updates.allergens : typeof updates.allergens === 'string' ? updates.allergens.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    }
    if (updates.shelfLife !== undefined) product.shelfLife = updates.shelfLife;
    if (updates.storageInstructions !== undefined) product.storageInstructions = updates.storageInstructions;
    if (updates.spiceLevel !== undefined) product.spiceLevel = updates.spiceLevel;
    if (updates.isVeg !== undefined) product.isVeg = Boolean(updates.isVeg);
    if (updates.isActive !== undefined) product.isActive = Boolean(updates.isActive);
    if (updates.isFeatured !== undefined) product.isFeatured = Boolean(updates.isFeatured);
    if (updates.isBestSeller !== undefined) product.isBestSeller = Boolean(updates.isBestSeller);
    if (updates.displayOrder !== undefined) product.displayOrder = Number(updates.displayOrder);
    if (updates.campaignOffer !== undefined) product.campaignOffer = updates.campaignOffer;
    if (updates.metaTitle !== undefined) product.metaTitle = updates.metaTitle;
    if (updates.metaDescription !== undefined) product.metaDescription = updates.metaDescription;

    product.updatedAt = new Date().toISOString();
    await saveDb();
    saveProductToMongo(product).catch(() => {});

    res.json({ success: true, product, message: 'Product updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update product.' });
  }
});

// PATCH /api/admin/products/:id/backend-image (Explicit backend product image management)
productsRouter.patch('/admin/:id/backend-image', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { imagePath } = req.body;
    if (!imagePath) {
      res.status(400).json({ success: false, message: 'imagePath is required.' });
      return;
    }
    const db = getDb();
    const product = db.products.find((p) => p.id === id);
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found.' });
      return;
    }
    product.images = [imagePath];
    product.updatedAt = new Date().toISOString();
    await saveDb();
    saveProductToMongo(product).catch(() => {});
    res.json({ success: true, product, message: 'Backend product image updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update backend product image.' });
  }
});

// DELETE /api/admin/products/:id
productsRouter.delete('/admin/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const db = getDb();
    const index = db.products.findIndex((p) => p.id === id);

    if (index === -1) {
      res.status(404).json({ success: false, message: 'Product not found.' });
      return;
    }

    db.products.splice(index, 1);
    await saveDb();

    const mDb = await initMongo();
    if (mDb) {
      mDb.collection('products').deleteOne({ id }).catch(() => {});
    }

    res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to delete product.' });
  }
});
