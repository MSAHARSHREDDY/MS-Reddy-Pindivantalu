import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { AuthenticatedRequest, requireAdmin } from '../middleware/auth.js';

export const mediaRouter = Router();

const UPLOADS_DIR = path.resolve(process.cwd(), 'data', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Preset gallery of authentic traditional Telugu snack photography
const PRESET_GALLERY = [
  {
    name: 'Artisanal Pindi Vantalu Spread',
    url: '/src/assets/images/hero_pindivantalu_traditional_1790935769601.jpg',
    category: 'Hero / Banners',
  },
  {
    name: 'Crispy Butter Murukulu (Janthikalu)',
    url: '/src/assets/images/product_crispy_murukulu_1790935783958.jpg',
    category: 'Murukulu',
  },
  {
    name: 'Spicy Andhra Mixture with Cashews',
    url: '/src/assets/images/product_andhra_mixture_1790935795686.jpg',
    category: 'Mixtures',
  },
  {
    name: 'Handcrafted Pappu Chekkalu',
    url: '/src/assets/images/product_chekkalu_snack_1790935807445.jpg',
    category: 'Chekkalu',
  },
  {
    name: 'Festive Sweets & Savories Thali',
    url: '/src/assets/images/category_festive_collection_1790935819627.jpg',
    category: 'Festival Specials',
  },
];

// GET /api/media/gallery
mediaRouter.get('/gallery', requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  res.json({ success: true, gallery: PRESET_GALLERY });
});

// POST /api/media/upload (Base64 or URL register)
mediaRouter.post('/upload', requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { base64Data, fileName, mimeType, directUrl } = req.body;

    if (directUrl) {
      res.json({ success: true, url: directUrl, message: 'Image URL registered.' });
      return;
    }

    if (!base64Data) {
      res.status(400).json({ success: false, message: 'Base64 image data or directUrl is required.' });
      return;
    }

    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      res.status(400).json({ success: false, message: 'Invalid base64 image data string.' });
      return;
    }

    const ext = matches[1].split('/')[1] || 'jpg';
    const safeExt = ext.replace(/[^a-zA-Z0-9]/g, '');
    const cleanFileName = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${safeExt}`;
    const filePath = path.join(UPLOADS_DIR, cleanFileName);

    const buffer = Buffer.from(matches[2], 'base64');
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/api/media/file/${cleanFileName}`;
    res.json({ success: true, url: publicUrl, message: 'Image uploaded successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Image upload failed.' });
  }
});

// GET /api/media/file/:filename
mediaRouter.get('/file/:filename', (req: AuthenticatedRequest, res: Response): void => {
  const { filename } = req.params;
  const safeFilename = path.basename(filename);
  const filePath = path.join(UPLOADS_DIR, safeFilename);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('File not found');
  }
});
