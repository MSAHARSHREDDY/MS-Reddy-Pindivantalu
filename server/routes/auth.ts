import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDb, saveDb, saveUserToMongo, syncUserFromMongo } from '../db.js';
import { AuthenticatedRequest, generateToken, requireAuth } from '../middleware/auth.js';
import { User, Address } from '../types.js';

export const authRouter = Router();

// Helper to sanitize user object
function sanitizeUser(user: User) {
  const { passwordHash, resetPasswordToken, resetPasswordExpires, ...safe } = user;
  return safe;
}

// Register
authRouter.post('/register', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
      return;
    }

    const db = getDb();
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = phone ? phone.trim() : '';

    const existingUserByEmail = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existingUserByEmail) {
      res.status(409).json({ 
        success: false, 
        message: 'This email is already registered. If you already have an account, please Sign In instead.' 
      });
      return;
    }

    if (normalizedPhone && db.users.some((u) => u.phone === normalizedPhone)) {
      res.status(409).json({ 
        success: false, 
        message: 'This phone number is already registered. If you already have an account, please Sign In instead.' 
      });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const now = new Date().toISOString();

    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : '',
      passwordHash,
      role: 'customer',
      addresses: [],
      accountStatus: 'active',
      createdAt: now,
      updatedAt: now,
    };

    db.users.push(newUser);
    await saveDb();

    // Persist new user directly to MongoDB Atlas
    try {
      await saveUserToMongo(newUser);
    } catch (mongoErr: any) {
      console.error('[MongoDB] Error saving new registered user to MongoDB Atlas:', mongoErr.message);
    }

    // Merge guest cart if available
    const guestId = (req.headers['x-guest-id'] as string) || '';
    if (guestId) {
      const guestCart = db.carts.find((c) => c.userId === guestId);
      if (guestCart && guestCart.items.length > 0) {
        let userCart = db.carts.find((c) => c.userId === newUser.id);
        if (!userCart) {
          userCart = { userId: newUser.id, items: [], updatedAt: new Date().toISOString() };
          db.carts.push(userCart);
        }
        for (const gItem of guestCart.items) {
          const ex = userCart.items.find((i) => i.productId === gItem.productId && (gItem.variantId ? i.variantId === gItem.variantId : !i.variantId));
          if (ex) ex.quantity += gItem.quantity;
          else userCart.items.push({ ...gItem });
        }
        userCart.updatedAt = new Date().toISOString();
        guestCart.items = [];
        guestCart.updatedAt = new Date().toISOString();
        await saveDb();
      }
    }

    const token = generateToken(newUser);
    res.cookie('pindi_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: sanitizeUser(newUser),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Registration failed.' });
  }
});

// Login
authRouter.post('/login', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    // Synchronize latest user state and role directly from MongoDB Atlas
    const syncedMongoUser = await syncUserFromMongo(normalizedEmail);
    const db = getDb();
    const user = syncedMongoUser || db.users.find((u) => u.email.toLowerCase() === normalizedEmail);

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    if (user.accountStatus !== 'active') {
      res.status(403).json({ success: false, message: 'Your account is suspended. Please contact support.' });
      return;
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    // Merge guest cart if available
    const guestId = (req.headers['x-guest-id'] as string) || '';
    if (guestId && guestId !== user.id) {
      const guestCart = db.carts.find((c) => c.userId === guestId);
      if (guestCart && guestCart.items.length > 0) {
        let userCart = db.carts.find((c) => c.userId === user.id);
        if (!userCart) {
          userCart = { userId: user.id, items: [], updatedAt: new Date().toISOString() };
          db.carts.push(userCart);
        }
        for (const gItem of guestCart.items) {
          const ex = userCart.items.find((i) => i.productId === gItem.productId && (gItem.variantId ? i.variantId === gItem.variantId : !i.variantId));
          if (ex) ex.quantity += gItem.quantity;
          else userCart.items.push({ ...gItem });
        }
        userCart.updatedAt = new Date().toISOString();
        guestCart.items = [];
        guestCart.updatedAt = new Date().toISOString();
        await saveDb();
      }
    }

    const token = generateToken(user);
    res.cookie('pindi_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: sanitizeUser(user),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Login failed.' });
  }
});

// Logout
authRouter.post('/logout', (req: AuthenticatedRequest, res: Response): void => {
  res.clearCookie('pindi_token');
  res.json({ success: true, message: 'Logged out successfully.' });
});

// Current User Me
authRouter.get('/me', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, user: null });
    return;
  }
  // Keep role up-to-date with MongoDB Atlas database
  try {
    const freshestUser = await syncUserFromMongo(req.user.id || req.user.email);
    if (freshestUser) {
      req.user = freshestUser;
    }
  } catch (e) {
    // Continue with existing user in request
  }
  res.json({ success: true, user: sanitizeUser(req.user) });
});

// Profile update
authRouter.put('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, phone } = req.body;
    const db = getDb();
    const user = db.users.find((u) => u.id === req.user!.id);

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    user.updatedAt = new Date().toISOString();

    await saveDb();
    await saveUserToMongo(user);
    res.json({ success: true, user: sanitizeUser(user), message: 'Profile updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Profile update failed.' });
  }
});

// Add Address
authRouter.post('/address', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { fullName, phone, street, city, state, pincode, landmark, isDefault } = req.body;

    if (!fullName || !phone || !street || !city || !state || !pincode) {
      res.status(400).json({ success: false, message: 'All address fields are required.' });
      return;
    }

    const db = getDb();
    const user = db.users.find((u) => u.id === req.user!.id);

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    if (!user.addresses) user.addresses = [];

    const newAddress: Address = {
      id: `addr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      fullName: fullName.trim(),
      phone: phone.trim(),
      street: street.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      landmark: landmark ? landmark.trim() : undefined,
      isDefault: isDefault || user.addresses.length === 0,
    };

    if (newAddress.isDefault) {
      user.addresses.forEach((a) => (a.isDefault = false));
    }

    user.addresses.push(newAddress);
    user.updatedAt = new Date().toISOString();

    await saveDb();
    await saveUserToMongo(user);
    res.status(201).json({ success: true, addresses: user.addresses, newAddress });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to add address.' });
  }
});

// Delete Address
authRouter.delete('/address/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const db = getDb();
    const user = db.users.find((u) => u.id === req.user!.id);

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    user.addresses = (user.addresses || []).filter((a) => a.id !== id);
    if (user.addresses.length > 0 && !user.addresses.some((a) => a.isDefault)) {
      user.addresses[0].isDefault = true;
    }

    user.updatedAt = new Date().toISOString();
    await saveDb();
    await saveUserToMongo(user);
    res.json({ success: true, addresses: user.addresses });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to delete address.' });
  }
});

// Forgot Password
authRouter.post('/forgot-password', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: 'Email is required.' });
      return;
    }

    const db = getDb();
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());

    if (!user) {
      // Return success anyway for security reasons
      res.json({
        success: true,
        message: 'If that email is registered, password reset instructions have been generated.',
      });
      return;
    }

    const randomPassword = Math.random().toString(36).substring(2, 10);
    const salt = bcrypt.genSaltSync(10);
    user.passwordHash = bcrypt.hashSync(randomPassword, salt);
    user.updatedAt = new Date().toISOString();

    await saveDb();
    await saveUserToMongo(user);

    res.json({
      success: true,
      message: 'Temporary password generated.',
      tempPassword: randomPassword, 
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Forgot password request failed.' });
  }
});

// Change Password
authRouter.post('/change-password', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'Current and new password are required.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
      return;
    }

    const db = getDb();
    const user = db.users.find((u) => u.id === req.user!.id);

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const isMatch = bcrypt.compareSync(currentPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Incorrect current password.' });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    user.passwordHash = bcrypt.hashSync(newPassword, salt);
    user.updatedAt = new Date().toISOString();

    await saveDb();
    await saveUserToMongo(user);

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Change password failed.' });
  }
});

// Reset Password
authRouter.post('/reset-password', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      res.status(400).json({ success: false, message: 'Email, code, and new password are required.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
      return;
    }

    const db = getDb();
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());

    if (!user || user.resetPasswordToken !== code.trim().toUpperCase() || (user.resetPasswordExpires && user.resetPasswordExpires < Date.now())) {
      res.status(400).json({ success: false, message: 'Invalid or expired reset code.' });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    user.passwordHash = bcrypt.hashSync(newPassword, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.updatedAt = new Date().toISOString();

    await saveDb();
    res.json({ success: true, message: 'Password has been reset successfully. Please log in.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Reset password failed.' });
  }
});
