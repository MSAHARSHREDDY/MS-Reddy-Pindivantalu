import { Router, Response } from 'express';
import { getDb, saveDb } from '../db.js';
import { AuthenticatedRequest, requireAdmin } from '../middleware/auth.js';
import { Coupon } from '../types.js';

export const couponsRouter = Router();

// POST /api/coupons/apply (Customer validation)
couponsRouter.post('/apply', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { code, subtotal = 0 } = req.body;

    if (!code) {
      res.status(400).json({ success: false, message: 'Please enter a coupon code.' });
      return;
    }

    const db = getDb();
    const coupon = db.coupons.find((c) => c.code.toUpperCase() === code.trim().toUpperCase() && c.isActive);

    if (!coupon) {
      res.status(404).json({ success: false, message: 'Invalid or inactive coupon code.' });
      return;
    }

    if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) {
      res.status(400).json({ success: false, message: 'This coupon has expired.' });
      return;
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      res.status(400).json({ success: false, message: 'This coupon usage limit has been reached.' });
      return;
    }

    const numSubtotal = Number(subtotal);
    if (numSubtotal < coupon.minimumOrderValue) {
      res.status(400).json({
        success: false,
        message: `This coupon requires a minimum cart value of ₹${coupon.minimumOrderValue}. Add ₹${coupon.minimumOrderValue - numSubtotal} more to apply.`,
      });
      return;
    }

    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = Math.round((numSubtotal * coupon.discountValue) / 100);
      if (coupon.maximumDiscount && discount > coupon.maximumDiscount) {
        discount = coupon.maximumDiscount;
      }
    } else {
      discount = Math.min(coupon.discountValue, numSubtotal);
    }

    res.json({
      success: true,
      code: coupon.code,
      discount,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      message: `Coupon ${coupon.code} applied! You save ₹${discount}.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to apply coupon.' });
  }
});

// GET /api/admin/coupons
couponsRouter.get('/admin/list', requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const db = getDb();
    res.json({ success: true, coupons: db.coupons });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch coupons.' });
  }
});

// POST /api/admin/coupons
couponsRouter.post('/admin/create', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { code, discountType, discountValue, minimumOrderValue, maximumDiscount, validUntil, usageLimit, isActive } = req.body;

    if (!code || !discountType || discountValue === undefined) {
      res.status(400).json({ success: false, message: 'Code, discount type, and discount value are required.' });
      return;
    }

    const db = getDb();
    const cleanCode = code.trim().toUpperCase();

    if (db.coupons.some((c) => c.code.toUpperCase() === cleanCode)) {
      res.status(409).json({ success: false, message: 'A coupon with this code already exists.' });
      return;
    }

    const newCoupon: Coupon = {
      id: `cpn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      code: cleanCode,
      discountType: discountType === 'fixed' ? 'fixed' : 'percentage',
      discountValue: Number(discountValue),
      minimumOrderValue: minimumOrderValue ? Number(minimumOrderValue) : 0,
      maximumDiscount: maximumDiscount ? Number(maximumDiscount) : undefined,
      validUntil: validUntil || '2028-12-31T23:59:59Z',
      usageLimit: usageLimit ? Number(usageLimit) : undefined,
      usageCount: 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      createdAt: new Date().toISOString(),
    };

    db.coupons.push(newCoupon);
    await saveDb();

    res.status(201).json({ success: true, coupon: newCoupon, message: 'Coupon created successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to create coupon.' });
  }
});

// PATCH /api/admin/coupons/:id
couponsRouter.patch('/admin/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const db = getDb();
    const coupon = db.coupons.find((c) => c.id === id);

    if (!coupon) {
      res.status(404).json({ success: false, message: 'Coupon not found.' });
      return;
    }

    const updates = req.body;
    if (updates.code) coupon.code = updates.code.trim().toUpperCase();
    if (updates.discountType) coupon.discountType = updates.discountType;
    if (updates.discountValue !== undefined) coupon.discountValue = Number(updates.discountValue);
    if (updates.minimumOrderValue !== undefined) coupon.minimumOrderValue = Number(updates.minimumOrderValue);
    if (updates.maximumDiscount !== undefined) coupon.maximumDiscount = updates.maximumDiscount ? Number(updates.maximumDiscount) : undefined;
    if (updates.validUntil) coupon.validUntil = updates.validUntil;
    if (updates.usageLimit !== undefined) coupon.usageLimit = updates.usageLimit ? Number(updates.usageLimit) : undefined;
    if (updates.isActive !== undefined) coupon.isActive = Boolean(updates.isActive);

    await saveDb();
    res.json({ success: true, coupon, message: 'Coupon updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update coupon.' });
  }
});

// DELETE /api/admin/coupons/:id
couponsRouter.delete('/admin/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const db = getDb();
    const index = db.coupons.findIndex((c) => c.id === id);

    if (index === -1) {
      res.status(404).json({ success: false, message: 'Coupon not found.' });
      return;
    }

    db.coupons.splice(index, 1);
    await saveDb();

    res.json({ success: true, message: 'Coupon deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to delete coupon.' });
  }
});
