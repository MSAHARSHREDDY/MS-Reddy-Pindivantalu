import { Router, Response } from 'express';
import { getDb, saveDb, saveOrderToMongo, saveProductToMongo, getOrdersFromDb, getCustomerOrdersFromDb, getOrderByIdFromDb, deleteOrderFromMongo, updateOrderInMongo } from '../db.js';
import { AuthenticatedRequest, requireAdmin, requireAuth } from '../middleware/auth.js';
import { Order, OrderItemSnapshot, OrderStatus, PaymentMethod, PaymentStatus, StatusHistoryEntry } from '../types.js';

export const ordersRouter = Router();

// Helper to generate unique order number
function generateOrderNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PV-${dateStr}-${rand}`;
}

// ---------------- PUBLIC / CUSTOMER ROUTES ----------------

// POST /api/orders/checkout
ordersRouter.post('/checkout', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      paymentMethod = 'cod',
      couponCode,
      notes,
    } = req.body;

    if (!customerName || !customerEmail || !customerPhone || !shippingAddress) {
      res.status(400).json({ success: false, message: 'Customer name, email, phone, and shipping address are required.' });
      return;
    }

    if (!shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.pincode) {
      res.status(400).json({ success: false, message: 'Complete delivery address with street, city, state, and pincode is required.' });
      return;
    }

    const db = getDb();
    const guestId = (req.headers['x-guest-id'] as string) || '';
    const userId = req.user ? req.user.id : guestId || 'guest_default';

    // 1. Find user cart
    let cart = db.carts.find((c) => c.userId === userId);

    // 2. If user cart is missing or empty, check guest cart
    if ((!cart || cart.items.length === 0) && guestId && guestId !== userId) {
      const guestCart = db.carts.find((c) => c.userId === guestId);
      if (guestCart && guestCart.items.length > 0) {
        if (!cart) {
          cart = { userId, items: [], updatedAt: new Date().toISOString() };
          db.carts.push(cart);
        }
        cart.items = [...guestCart.items];
      }
    }

    // 3. Fallback: If still empty, accept items from request body sent by frontend
    if ((!cart || cart.items.length === 0) && Array.isArray(req.body.items) && req.body.items.length > 0) {
      if (!cart) {
        cart = { userId, items: [], updatedAt: new Date().toISOString() };
        db.carts.push(cart);
      }
      cart.items = req.body.items.map((it: any) => ({
        id: it.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productId: it.productId,
        variantId: it.variantId,
        quantity: Math.max(1, Number(it.quantity) || 1),
        addedAt: new Date().toISOString(),
      }));
    }

    if (!cart || cart.items.length === 0) {
      res.status(400).json({ success: false, message: 'Your shopping cart is empty.' });
      return;
    }

    // Atomic inventory check and snapshot creation
    const itemSnapshots: OrderItemSnapshot[] = [];
    let subtotal = 0;

    for (const item of cart.items) {
      const product = db.products.find((p) => p.id === item.productId && p.isActive);
      if (!product) {
        res.status(400).json({ success: false, message: 'One or more items in your cart are no longer available.' });
        return;
      }

      let unitPrice = product.salePrice ?? product.basePrice;
      let variantName = product.weight;
      let availableStock = product.stockQuantity;

      if (item.variantId && product.variants && product.variants.length > 0) {
        let variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant) {
          const vId = item.variantId.toLowerCase();
          variant = product.variants.find((v) => vId.includes(v.weight.toLowerCase()));
        }
        if (!variant) {
          variant = product.variants[0];
        }
        if (variant) {
          item.variantId = variant.id;
          unitPrice = variant.salePrice ?? variant.price;
          variantName = variant.weight;
          availableStock = variant.stockQuantity;
        }
      }

      if (availableStock < item.quantity) {
        res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name} (${variantName}). Only ${availableStock} remaining.`,
        });
        return;
      }

      const itemSubtotal = unitPrice * item.quantity;
      subtotal += itemSubtotal;

      itemSnapshots.push({
        productId: product.id,
        productName: `${product.name} (${variantName})`,
        variantId: item.variantId,
        variantName,
        image: product.images[0] || '/src/assets/images/hero_pindivantalu_traditional_1790935769601.jpg',
        unitPrice,
        quantity: item.quantity,
        subtotal: itemSubtotal,
      });
    }

    // Delivery fee is removed (Free delivery on all orders)
    const deliveryFee = 0;

    // Apply Coupon if provided
    let discount = 0;
    let validatedCoupon = undefined;

    if (couponCode) {
      const codeUpper = couponCode.trim().toUpperCase();
      const coupon = db.coupons.find((c) => c.code.toUpperCase() === codeUpper && c.isActive);

      if (coupon) {
        const isNotExpired = !coupon.validUntil || new Date(coupon.validUntil) >= new Date();
        const meetsMinOrder = subtotal >= coupon.minimumOrderValue;

        if (isNotExpired && meetsMinOrder) {
          if (coupon.discountType === 'percentage') {
            discount = Math.round((subtotal * coupon.discountValue) / 100);
            if (coupon.maximumDiscount && discount > coupon.maximumDiscount) {
              discount = coupon.maximumDiscount;
            }
          } else {
            discount = coupon.discountValue;
          }
          coupon.usageCount = (coupon.usageCount || 0) + 1;
          validatedCoupon = coupon.code;
        }
      }
    }

    const totalAmount = Math.max(0, subtotal - discount + deliveryFee);
    const now = new Date().toISOString();
    const orderNumber = generateOrderNumber();

    // Deduct inventory atomically
    for (const item of cart.items) {
      const product = db.products.find((p) => p.id === item.productId);
      if (product) {
        product.stockQuantity = Math.max(0, product.stockQuantity - item.quantity);
        if (item.variantId && product.variants) {
          const variant = product.variants.find((v) => v.id === item.variantId);
          if (variant) {
            variant.stockQuantity = Math.max(0, variant.stockQuantity - item.quantity);
          }
        }
        product.updatedAt = now;
        saveProductToMongo(product).catch(() => {});
      }
    }

    // Clear cart
    if (cart) {
      cart.items = [];
      cart.updatedAt = now;
    }
    if (guestId && guestId !== userId) {
      const gCart = db.carts.find((c) => c.userId === guestId);
      if (gCart) {
        gCart.items = [];
        gCart.updatedAt = now;
      }
    }

    // Determine initial payment status
    let paymentStatus: PaymentStatus = 'pending';
    let paymentId: string | undefined = undefined;

    if (paymentMethod === 'cod') {
      paymentStatus = 'pending';
    } else {
      // In online / Razorpay payment flow, mark as completed
      paymentStatus = 'completed';
      paymentId = req.body.paymentId || `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    const initialHistory: StatusHistoryEntry[] = [
      {
        status: 'placed',
        timestamp: now,
        note:
          paymentMethod === 'cod'
            ? 'Order placed with Cash on Delivery'
            : `Order placed and paid online via Razorpay (${paymentId})`,
      },
    ];

    const newOrder: Order = {
      id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      orderNumber,
      userId,
      customerName: customerName.trim(),
      customerEmail: customerEmail.toLowerCase().trim(),
      customerPhone: customerPhone.trim(),
      items: itemSnapshots,
      shippingAddress: {
        id: shippingAddress.id || `addr_${Date.now()}`,
        fullName: shippingAddress.fullName || customerName,
        phone: shippingAddress.phone || customerPhone,
        street: shippingAddress.street,
        city: shippingAddress.city,
        state: shippingAddress.state,
        pincode: shippingAddress.pincode,
        landmark: shippingAddress.landmark,
      },
      subtotal,
      discount,
      couponCode: validatedCoupon,
      deliveryFee,
      tax: 0,
      totalAmount,
      paymentMethod: paymentMethod as PaymentMethod,
      paymentStatus,
      paymentId,
      orderStatus: 'placed',
      statusHistory: initialHistory,
      notes: notes ? notes.trim() : undefined,
      createdAt: now,
      updatedAt: now,
    };

    db.orders.unshift(newOrder);
    await saveDb();

    // Persist new order to MongoDB Atlas
    try {
      await saveOrderToMongo(newOrder);
    } catch (mongoErr: any) {
      console.error('[MongoDB] Error saving new order to MongoDB:', mongoErr.message);
    }

    res.status(201).json({
      success: true,
      order: newOrder,
      message: 'Order placed successfully!',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Checkout failed.' });
  }
});

// GET /api/orders (Customer's own orders)
ordersRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user!.email ? req.user!.email.toLowerCase() : '';
    const userPhone = req.user!.phone ? req.user!.phone.trim().replace(/[^0-9]/g, '') : '';

    // Fetch directly from MongoDB Atlas so additions or deletions in DB are reflected instantly
    const orders = await getCustomerOrdersFromDb(userId, userEmail, userPhone);
    res.json({ success: true, orders });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch orders.' });
  }
});

// GET /api/orders/:id (Public tracking by ID or Order Number)
ordersRouter.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const order = await getOrderByIdFromDb(id);

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    res.json({ success: true, order });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch order.' });
  }
});

// PATCH /api/orders/:id/cancel (Customer cancellation if not shipped)
ordersRouter.patch('/:id/cancel', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const order = await getOrderByIdFromDb(id);

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    // Only allow customer if owner, or admin
    const userEmail = req.user!.email ? req.user!.email.toLowerCase() : '';
    const userPhone = req.user!.phone ? req.user!.phone.trim().replace(/[^0-9]/g, '') : '';
    const isOwner =
      order.userId === req.user!.id ||
      (userEmail && order.customerEmail.toLowerCase() === userEmail) ||
      (userPhone && order.customerPhone && order.customerPhone.replace(/[^0-9]/g, '') === userPhone);

    if (!isOwner && req.user!.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Not authorized to cancel this order.' });
      return;
    }

    if (['dispatched', 'shipped', 'delivered', 'cancelled'].includes(order.orderStatus)) {
      res.status(400).json({
        success: false,
        message: `Order cannot be cancelled because it is already ${order.orderStatus}.`,
      });
      return;
    }

    const db = getDb();
    const now = new Date().toISOString();
    order.orderStatus = 'cancelled';
    order.statusHistory.push({
      status: 'cancelled',
      timestamp: now,
      note: 'Cancelled by customer',
    });

    if (order.paymentStatus === 'completed') {
      order.paymentStatus = 'refunded';
    }

    // Restore stock safely
    for (const item of order.items) {
      const product = db.products.find((p) => p.id === item.productId);
      if (product) {
        product.stockQuantity += item.quantity;
        if (item.variantId && product.variants) {
          const variant = product.variants.find((v) => v.id === item.variantId);
          if (variant) {
            variant.stockQuantity += item.quantity;
          }
        }
        product.updatedAt = now;
        saveProductToMongo(product).catch(() => {});
      }
    }

    order.updatedAt = now;
    await updateOrderInMongo(order);

    res.json({ success: true, order, message: 'Order cancelled successfully and inventory restored.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to cancel order.' });
  }
});

// ---------------- ADMIN ROUTES ----------------

// GET /api/orders/admin/list
ordersRouter.get('/admin/list', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, paymentStatus, search } = req.query;

    // Fetch directly from MongoDB Atlas
    let orders = await getOrdersFromDb();

    if (status && status !== 'all') {
      orders = orders.filter((o) => o.orderStatus === status);
    }

    if (paymentStatus && paymentStatus !== 'all') {
      orders = orders.filter((o) => o.paymentStatus === paymentStatus);
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.toLowerCase();
      orders = orders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerEmail.toLowerCase().includes(q) ||
          o.customerPhone.includes(q)
      );
    }

    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, orders, totalCount: orders.length });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch admin orders.' });
  }
});

// PATCH /api/orders/admin/:id/status
ordersRouter.patch('/admin/:id/status', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const validStatuses: OrderStatus[] = ['placed', 'confirmed', 'preparing', 'packed', 'dispatched', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid order status value.' });
      return;
    }

    const order = await getOrderByIdFromDb(id);

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    const db = getDb();
    const prevStatus = order.orderStatus;
    const now = new Date().toISOString();

    // If changing to cancelled and was not cancelled before, restore inventory
    if (status === 'cancelled' && prevStatus !== 'cancelled') {
      for (const item of order.items) {
        const product = db.products.find((p) => p.id === item.productId);
        if (product) {
          product.stockQuantity += item.quantity;
          if (item.variantId && product.variants) {
            const v = product.variants.find((variant) => variant.id === item.variantId);
            if (v) v.stockQuantity += item.quantity;
          }
          product.updatedAt = now;
          saveProductToMongo(product).catch(() => {});
        }
      }
    }

    // If changing from cancelled back to active, deduct inventory
    if (prevStatus === 'cancelled' && status !== 'cancelled') {
      for (const item of order.items) {
        const product = db.products.find((p) => p.id === item.productId);
        if (product) {
          product.stockQuantity = Math.max(0, product.stockQuantity - item.quantity);
          if (item.variantId && product.variants) {
            const v = product.variants.find((variant) => variant.id === item.variantId);
            if (v) v.stockQuantity = Math.max(0, v.stockQuantity - item.quantity);
          }
          product.updatedAt = now;
          saveProductToMongo(product).catch(() => {});
        }
      }
    }

    // If marked delivered, and COD payment was pending, mark payment completed
    if (status === 'delivered' && order.paymentMethod === 'cod' && order.paymentStatus === 'pending') {
      order.paymentStatus = 'completed';
    }

    order.orderStatus = status;
    order.statusHistory.push({
      status,
      timestamp: now,
      note: note || `Status updated to ${status} by admin`,
    });
    order.updatedAt = now;

    await updateOrderInMongo(order);

    res.json({ success: true, order, message: `Order status updated to ${status}.` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update order status.' });
  }
});

// PATCH /api/orders/admin/:id/payment
ordersRouter.patch('/admin/:id/payment', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    const validStatuses: PaymentStatus[] = ['pending', 'completed', 'failed', 'refunded'];
    if (!validStatuses.includes(paymentStatus)) {
      res.status(400).json({ success: false, message: 'Invalid payment status value.' });
      return;
    }

    const order = await getOrderByIdFromDb(id);

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    order.paymentStatus = paymentStatus;
    order.updatedAt = new Date().toISOString();

    await updateOrderInMongo(order);

    res.json({ success: true, order, message: `Payment status updated to ${paymentStatus}.` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update payment status.' });
  }
});

// DELETE /api/orders/admin/:id (Delete order directly from admin panel and MongoDB Atlas)
ordersRouter.delete('/admin/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await deleteOrderFromMongo(id);
    res.json({ success: true, message: `Order ${id} deleted successfully from database.` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to delete order.' });
  }
});
