import { Router, Response } from 'express';
import { getDb, saveDb } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { Cart, CartItem } from '../types.js';

export const cartRouter = Router();

function getOrCreateCart(userId: string, guestId?: string): Cart {
  const db = getDb();
  let userCart = db.carts.find((c) => c.userId === userId);

  // If user is authenticated and guestId is provided, merge guest cart into user cart!
  if (guestId && guestId !== userId) {
    const guestCart = db.carts.find((c) => c.userId === guestId);
    if (guestCart && guestCart.items.length > 0) {
      if (!userCart) {
        userCart = {
          userId,
          items: [],
          updatedAt: new Date().toISOString(),
        };
        db.carts.push(userCart);
      }
      for (const gItem of guestCart.items) {
        const existing = userCart.items.find(
          (i) => i.productId === gItem.productId && (gItem.variantId ? i.variantId === gItem.variantId : !i.variantId)
        );
        if (existing) {
          existing.quantity += gItem.quantity;
        } else {
          userCart.items.push({ ...gItem });
        }
      }
      userCart.updatedAt = new Date().toISOString();
      guestCart.items = [];
      guestCart.updatedAt = new Date().toISOString();
      saveDb().catch(() => {});
    }
  }

  if (!userCart) {
    userCart = {
      userId,
      items: [],
      updatedAt: new Date().toISOString(),
    };
    db.carts.push(userCart);
  }
  return userCart;
}

// Helper to hydrate cart items with live product data
function hydrateCart(cart: Cart) {
  const db = getDb();
  const hydratedItems = cart.items
    .map((item) => {
      const product = db.products.find((p) => p.id === item.productId && p.isActive);
      if (!product) return null;

      let variant = undefined;
      let unitPrice = product.salePrice ?? product.basePrice;
      let maxStock = product.stockQuantity;
      let variantName = product.weight;

      if (item.variantId && product.variants && product.variants.length > 0) {
        variant = product.variants.find((v) => v.id === item.variantId);
        if (variant) {
          unitPrice = variant.salePrice ?? variant.price;
          maxStock = variant.stockQuantity;
          variantName = variant.weight;
        }
      }

      // Clamp quantity to available stock if needed
      const safeQty = Math.max(1, Math.min(item.quantity, maxStock > 0 ? maxStock : 1));

      return {
        id: item.id,
        productId: product.id,
        productName: product.name,
        slug: product.slug,
        image: product.images[0] || '/src/assets/images/hero_pindivantalu_traditional_1790935769601.jpg',
        variantId: item.variantId,
        variantName,
        weight: variantName,
        unitPrice,
        regularPrice: variant ? variant.price : product.basePrice,
        quantity: safeQty,
        availableStock: maxStock,
        isOutOfStock: maxStock <= 0,
        subtotal: unitPrice * safeQty,
      };
    })
    .filter(Boolean);

  const subtotal = hydratedItems.reduce((acc, item) => acc + (item?.subtotal || 0), 0);
  const deliveryFee = 0;
  const total = subtotal;

  return {
    items: hydratedItems,
    subtotal,
    deliveryFee: 0,
    freeDeliveryThreshold: 0,
    amountNeededForFreeDelivery: 0,
    total,
  };
}

// GET /api/cart
cartRouter.get('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const guestId = (req.headers['x-guest-id'] as string) || '';
    const userId = req.user ? req.user.id : guestId || 'guest_default';
    const cart = getOrCreateCart(userId, guestId);
    const hydrated = hydrateCart(cart);
    res.json({ success: true, cart: hydrated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch cart.' });
  }
});

// POST /api/cart/items
cartRouter.post('/items', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { productId, variantId, quantity = 1 } = req.body;
    const guestId = (req.headers['x-guest-id'] as string) || '';
    const userId = req.user ? req.user.id : guestId || 'guest_default';

    if (!productId) {
      res.status(400).json({ success: false, message: 'Product ID is required.' });
      return;
    }

    const db = getDb();
    const product = db.products.find((p) => p.id === productId && p.isActive);
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found or unavailable.' });
      return;
    }

    // Determine max available stock
    let maxStock = product.stockQuantity;
    if (variantId && product.variants) {
      const v = product.variants.find((variant) => variant.id === variantId);
      if (v) maxStock = v.stockQuantity;
    }

    if (maxStock <= 0) {
      res.status(400).json({ success: false, message: 'This item is currently out of stock.' });
      return;
    }

    const cart = getOrCreateCart(userId, guestId);
    const existingIndex = cart.items.findIndex(
      (item) => item.productId === productId && (variantId ? item.variantId === variantId : !item.variantId)
    );

    const qtyToAdd = Math.max(1, Number(quantity));

    if (existingIndex > -1) {
      const newQty = cart.items[existingIndex].quantity + qtyToAdd;
      if (newQty > maxStock) {
        cart.items[existingIndex].quantity = maxStock;
      } else {
        cart.items[existingIndex].quantity = newQty;
      }
    } else {
      const newItem: CartItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productId,
        variantId: variantId || undefined,
        quantity: Math.min(qtyToAdd, maxStock),
        addedAt: new Date().toISOString(),
      };
      cart.items.push(newItem);
    }

    cart.updatedAt = new Date().toISOString();
    await saveDb();

    res.json({ success: true, cart: hydrateCart(cart), message: 'Added to cart.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to add item to cart.' });
  }
});

// PATCH /api/cart/items/:itemId
cartRouter.patch('/items/:itemId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const guestId = (req.headers['x-guest-id'] as string) || '';
    const userId = req.user ? req.user.id : guestId || 'guest_default';

    const cart = getOrCreateCart(userId, guestId);
    const itemIndex = cart.items.findIndex((item) => item.id === itemId);

    if (itemIndex === -1) {
      res.status(404).json({ success: false, message: 'Item not found in cart.' });
      return;
    }

    const qty = Number(quantity);
    if (qty <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      // Check stock limit
      const db = getDb();
      const product = db.products.find((p) => p.id === cart.items[itemIndex].productId);
      let maxStock = 999;
      if (product) {
        maxStock = product.stockQuantity;
        if (cart.items[itemIndex].variantId && product.variants) {
          const v = product.variants.find((variant) => variant.id === cart.items[itemIndex].variantId);
          if (v) maxStock = v.stockQuantity;
        }
      }
      cart.items[itemIndex].quantity = Math.min(qty, maxStock);
    }

    cart.updatedAt = new Date().toISOString();
    await saveDb();

    res.json({ success: true, cart: hydrateCart(cart) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update item quantity.' });
  }
});

// DELETE /api/cart/items/:itemId
cartRouter.delete('/items/:itemId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;
    const guestId = (req.headers['x-guest-id'] as string) || '';
    const userId = req.user ? req.user.id : guestId || 'guest_default';

    const cart = getOrCreateCart(userId, guestId);
    cart.items = cart.items.filter((item) => item.id !== itemId);
    cart.updatedAt = new Date().toISOString();
    await saveDb();

    res.json({ success: true, cart: hydrateCart(cart), message: 'Item removed from cart.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to remove item.' });
  }
});

// POST /api/cart/clear
cartRouter.post('/clear', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const guestId = (req.headers['x-guest-id'] as string) || '';
    const userId = req.user ? req.user.id : guestId || 'guest_default';
    const cart = getOrCreateCart(userId, guestId);
    cart.items = [];
    cart.updatedAt = new Date().toISOString();
    if (guestId) {
      const gCart = getDb().carts.find((c) => c.userId === guestId);
      if (gCart) {
        gCart.items = [];
        gCart.updatedAt = new Date().toISOString();
      }
    }
    await saveDb();

    res.json({ success: true, cart: hydrateCart(cart) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to clear cart.' });
  }
});
