import { Router, Request, Response } from 'express';
import { saveInquiryToMongo, getInquiriesFromDb, deleteInquiryFromMongo, updateInquiryStatusInMongo } from '../db.js';
import { AuthenticatedRequest, requireAdmin } from '../middleware/auth.js';
import { Inquiry } from '../types.js';

export const inquiriesRouter = Router();

// POST /api/inquiries (Public: Submit an inquiry from Contact form)
inquiriesRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, message, subject } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Please enter your name.' });
      return;
    }
    if (!phone || !phone.trim()) {
      res.status(400).json({ success: false, message: 'Please enter your mobile phone number.' });
      return;
    }
    if (!message || !message.trim()) {
      res.status(400).json({ success: false, message: 'Please enter your message or inquiry.' });
      return;
    }

    const now = new Date().toISOString();
    const newInquiry: Inquiry = {
      id: `inq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      email: email ? email.trim().toLowerCase() : '',
      phone: phone.trim(),
      subject: subject ? subject.trim() : 'Customer Inquiry',
      message: message.trim(),
      status: 'new',
      createdAt: now,
      updatedAt: now,
    };

    // Save directly to MongoDB Atlas and in-memory cache
    await saveInquiryToMongo(newInquiry);

    res.status(201).json({
      success: true,
      message: 'Thank you! Your inquiry has been received. Our team will contact you shortly.',
      inquiry: newInquiry,
    });
  } catch (err: any) {
    console.error('[Inquiries] Error creating inquiry:', err.message);
    res.status(500).json({ success: false, message: 'Failed to submit inquiry. Please try again.' });
  }
});

// GET /api/inquiries (Admin: Get all inquiries)
inquiriesRouter.get('/', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const inquiries = await getInquiriesFromDb();
    res.json({
      success: true,
      inquiries,
      count: inquiries.length,
    });
  } catch (err: any) {
    console.error('[Inquiries] Error fetching inquiries:', err.message);
    res.status(500).json({ success: false, message: 'Failed to load inquiries.' });
  }
});

// PATCH /api/inquiries/:id (Admin: Update inquiry status)
inquiriesRouter.patch('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['new', 'contacted', 'resolved'].includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status. Must be "new", "contacted", or "resolved".' });
      return;
    }

    const updated = await updateInquiryStatusInMongo(id, status);
    if (!updated) {
      res.status(404).json({ success: false, message: 'Inquiry not found.' });
      return;
    }

    res.json({
      success: true,
      message: `Inquiry status updated to ${status}.`,
      inquiry: updated,
    });
  } catch (err: any) {
    console.error('[Inquiries] Error updating inquiry:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update inquiry.' });
  }
});

// DELETE /api/inquiries/:id (Admin: Delete an inquiry)
inquiriesRouter.delete('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await deleteInquiryFromMongo(id);
    res.json({
      success: true,
      message: 'Inquiry deleted successfully.',
    });
  } catch (err: any) {
    console.error('[Inquiries] Error deleting inquiry:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete inquiry.' });
  }
});
