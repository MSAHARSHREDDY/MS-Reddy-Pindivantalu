import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDb, saveDb, saveUserToMongo, deleteUserFromMongo, saveProductToMongo, getOrdersFromDb } from '../db.js';
import { AuthenticatedRequest, requireAdmin } from '../middleware/auth.js';

export const adminRouter = Router();

// GET /api/admin/dashboard (Comprehensive real-time analytics)
adminRouter.get('/dashboard', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const orders = await getOrdersFromDb();
    const products = db.products;
    const users = db.users.filter((u) => u.role === 'customer');

    const totalOrders = orders.length;
    const validOrders = orders.filter((o) => o.orderStatus !== 'cancelled');
    const totalRevenue = validOrders.reduce((acc, o) => acc + o.totalAmount, 0);

    const pendingOrders = orders.filter(
      (o) => ['placed', 'confirmed', 'preparing', 'packed', 'shipped'].includes(o.orderStatus)
    ).length;

    const deliveredOrders = orders.filter((o) => o.orderStatus === 'delivered').length;
    const cancelledOrders = orders.filter((o) => o.orderStatus === 'cancelled').length;

    const totalCustomers = users.length;
    const activeProducts = products.filter((p) => p.isActive).length;

    const lowStockProducts = products.filter(
      (p) => p.stockQuantity <= p.lowStockThreshold && p.stockQuantity > 0
    );
    const outOfStockProducts = products.filter((p) => p.stockQuantity <= 0);

    // Recent orders (last 6)
    const recentOrders = orders
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6)
      .map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        totalAmount: o.totalAmount,
        orderStatus: o.orderStatus,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        itemCount: o.items.reduce((sum, item) => sum + item.quantity, 0),
        createdAt: o.createdAt,
      }));

    // Product sales calculation
    const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    validOrders.forEach((o) => {
      o.items.forEach((item) => {
        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = {
            name: item.productName,
            quantity: 0,
            revenue: 0,
          };
        }
        productSalesMap[item.productId].quantity += item.quantity;
        productSalesMap[item.productId].revenue += item.subtotal;
      });
    });

    const topProducts = Object.entries(productSalesMap)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Sales by day (last 7 days)
    const last7DaysMap: Record<string, { date: string; revenue: number; orders: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      last7DaysMap[dateStr] = { date: dateStr, revenue: 0, orders: 0 };
    }

    validOrders.forEach((o) => {
      const dateStr = o.createdAt.slice(0, 10);
      if (last7DaysMap[dateStr]) {
        last7DaysMap[dateStr].revenue += o.totalAmount;
        last7DaysMap[dateStr].orders += 1;
      }
    });

    const salesTrend = Object.values(last7DaysMap);

    res.json({
      success: true,
      stats: {
        totalOrders,
        totalRevenue,
        pendingOrders,
        deliveredOrders,
        cancelledOrders,
        totalCustomers,
        activeProducts,
        lowStockCount: lowStockProducts.length,
        outOfStockCount: outOfStockProducts.length,
        lowStockProducts: lowStockProducts.map((p) => ({ id: p.id, name: p.name, stock: p.stockQuantity, threshold: p.lowStockThreshold })),
        outOfStockProducts: outOfStockProducts.map((p) => ({ id: p.id, name: p.name })),
        recentOrders,
        topProducts,
        salesTrend,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch dashboard metrics.' });
  }
});

// GET /api/admin/customers
adminRouter.get('/customers', requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const db = getDb();
    const { search, role } = req.query;

    let users = [...db.users];

    if (role && typeof role === 'string' && role !== 'all') {
      users = users.filter((u) => u.role === role);
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      users = users.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q)) ||
          (c.role && c.role.toLowerCase().includes(q))
      );
    }

    const customerData = users.map((c) => {
      const cPhone = c.phone ? c.phone.trim().replace(/[^0-9]/g, '') : '';
      const userOrders = db.orders.filter(
        (o) =>
          o.userId === c.id ||
          (c.email && o.customerEmail && o.customerEmail.toLowerCase() === c.email.toLowerCase()) ||
          (cPhone && o.customerPhone && o.customerPhone.replace(/[^0-9]/g, '') === cPhone)
      );
      const totalSpent = userOrders
        .filter((o) => o.orderStatus !== 'cancelled')
        .reduce((sum, o) => sum + o.totalAmount, 0);

      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone || '',
        role: c.role || 'customer',
        accountStatus: c.accountStatus || 'active',
        addressesCount: (c.addresses || []).length,
        totalOrders: userOrders.length,
        totalSpent,
        createdAt: c.createdAt,
      };
    });

    res.json({ success: true, customers: customerData });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch customers.' });
  }
});

// PATCH /api/admin/customers/:id/role (Change user role to admin or customer)
adminRouter.patch('/customers/:id/role', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['admin', 'customer'].includes(role)) {
      res.status(400).json({ success: false, message: 'Invalid role value. Must be "admin" or "customer".' });
      return;
    }

    const db = getDb();
    const user = db.users.find((u) => u.id === id);

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    user.role = role;
    user.updatedAt = new Date().toISOString();
    await saveDb();

    // Sync role update to MongoDB Atlas
    try {
      await saveUserToMongo(user);
    } catch (mongoErr: any) {
      console.error('[MongoDB] Error updating user role in MongoDB:', mongoErr.message);
    }

    res.json({
      success: true,
      message: `User role for ${user.name} successfully updated to "${role}".`,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update user role.' });
  }
});

// PATCH /api/admin/customers/:id/status
adminRouter.patch('/customers/:id/status', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid customer status value.' });
      return;
    }

    const db = getDb();
    const customer = db.users.find((u) => u.id === id);

    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer not found.' });
      return;
    }

    customer.accountStatus = status;
    customer.updatedAt = new Date().toISOString();
    await saveDb();

    // Sync to MongoDB Atlas
    try {
      await saveUserToMongo(customer);
    } catch (mongoErr: any) {
      console.error('[MongoDB] Error updating customer status in MongoDB:', mongoErr.message);
    }

    res.json({ success: true, message: `Customer account status updated to ${status}.` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update customer status.' });
  }
});

// DELETE /api/admin/customers/:id
adminRouter.delete('/customers/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const db = getDb();
    const user = db.users.find((u) => u.id === id || u.email?.toLowerCase() === id.toLowerCase());

    // Protection against deleting self
    if (user && user.email === req.user?.email) {
      res.status(400).json({ success: false, message: 'You cannot delete your own admin account.' });
      return;
    }

    await deleteUserFromMongo(id);
    res.json({
      success: true,
      message: `User ${user ? user.name : id} successfully deleted from database and MongoDB Atlas.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to delete user.' });
  }
});

// PATCH /api/admin/customers/:id/password (Change user password from admin panel)
adminRouter.patch('/customers/:id/password', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
      return;
    }

    const db = getDb();
    const user = db.users.find((u) => u.id === id);

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    user.passwordHash = bcrypt.hashSync(newPassword, salt);
    user.updatedAt = new Date().toISOString();
    await saveDb();

    // Sync updated password to MongoDB Atlas
    try {
      await saveUserToMongo(user);
    } catch (mongoErr: any) {
      console.error('[MongoDB] Error updating user password in MongoDB:', mongoErr.message);
    }

    res.json({
      success: true,
      message: `Password for ${user.name} successfully updated!`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update user password.' });
  }
});

// GET /api/admin/inventory
adminRouter.get('/inventory', requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const db = getDb();
    const inventoryList = db.products.map((p) => {
      const category = db.categories.find((c) => c.id === p.categoryId);
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        categoryName: category?.name || 'Uncategorized',
        stockQuantity: p.stockQuantity,
        lowStockThreshold: p.lowStockThreshold,
        variants: p.variants || [],
        isLowStock: p.stockQuantity <= p.lowStockThreshold && p.stockQuantity > 0,
        isOutOfStock: p.stockQuantity <= 0,
        updatedAt: p.updatedAt,
      };
    });

    res.json({ success: true, inventory: inventoryList });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch inventory.' });
  }
});

// POST /api/admin/inventory/adjust
adminRouter.post('/inventory/adjust', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { productId, variantId, adjustment, newStock, reason } = req.body;

    if (!productId) {
      res.status(400).json({ success: false, message: 'Product ID is required.' });
      return;
    }

    const db = getDb();
    const product = db.products.find((p) => p.id === productId);

    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found.' });
      return;
    }

    if (variantId && product.variants) {
      const variant = product.variants.find((v) => v.id === variantId);
      if (variant) {
        if (newStock !== undefined) {
          variant.stockQuantity = Math.max(0, Number(newStock));
        } else if (adjustment !== undefined) {
          variant.stockQuantity = Math.max(0, variant.stockQuantity + Number(adjustment));
        }
        // Recalculate parent stock as sum of variants if variants exist
        product.stockQuantity = product.variants.reduce((sum, v) => sum + v.stockQuantity, 0);
      }
    } else {
      if (newStock !== undefined) {
        product.stockQuantity = Math.max(0, Number(newStock));
      } else if (adjustment !== undefined) {
        product.stockQuantity = Math.max(0, product.stockQuantity + Number(adjustment));
      }
    }

    product.updatedAt = new Date().toISOString();
    await saveDb();
    saveProductToMongo(product).catch(() => {});

    res.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        stockQuantity: product.stockQuantity,
        variants: product.variants,
      },
      message: 'Stock updated successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to adjust stock.' });
  }
});

// GET /api/settings (Public Settings)
adminRouter.get('/settings/public', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const db = getDb();
    res.json({ success: true, settings: db.settings });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch settings.' });
  }
});

// PATCH /api/admin/settings (Admin Settings Update)
adminRouter.patch('/settings', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const updates = req.body;

    if (updates.storeName !== undefined) db.settings.storeName = updates.storeName.trim();
    if (updates.tagline !== undefined) db.settings.tagline = updates.tagline.trim();
    if (updates.supportPhone !== undefined) db.settings.supportPhone = updates.supportPhone.trim();
    if (updates.whatsappNumber !== undefined) db.settings.whatsappNumber = updates.whatsappNumber.trim();
    if (updates.supportEmail !== undefined) db.settings.supportEmail = updates.supportEmail.trim();
    if (updates.storeAddress !== undefined) db.settings.storeAddress = updates.storeAddress.trim();
    if (updates.freeDeliveryThreshold !== undefined) db.settings.freeDeliveryThreshold = Number(updates.freeDeliveryThreshold);
    if (updates.standardDeliveryFee !== undefined) db.settings.standardDeliveryFee = Number(updates.standardDeliveryFee);
    if (updates.codEnabled !== undefined) db.settings.codEnabled = Boolean(updates.codEnabled);
    if (updates.onlinePaymentEnabled !== undefined) db.settings.onlinePaymentEnabled = Boolean(updates.onlinePaymentEnabled);
    if (updates.bannerNotice !== undefined) db.settings.bannerNotice = updates.bannerNotice;
    if (updates.seoDefaults !== undefined) db.settings.seoDefaults = updates.seoDefaults;
    if (updates.campaignOffers !== undefined) db.settings.campaignOffers = updates.campaignOffers;

    db.settings.updatedAt = new Date().toISOString();
    await saveDb();

    res.json({ success: true, settings: db.settings, message: 'Store settings saved successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update settings.' });
  }
});
