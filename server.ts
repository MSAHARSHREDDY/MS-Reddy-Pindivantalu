import express from 'express';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { getDb, initMongo } from './server/db.js';
import { authenticateToken } from './server/middleware/auth.js';
import { authRouter } from './server/routes/auth.js';
import { productsRouter } from './server/routes/products.js';
import { categoriesRouter } from './server/routes/categories.js';
import { cartRouter } from './server/routes/cart.js';
import { ordersRouter } from './server/routes/orders.js';
import { couponsRouter } from './server/routes/coupons.js';
import { adminRouter } from './server/routes/admin.js';
import { mediaRouter } from './server/routes/media.js';
import { paymentRouter } from './server/routes/payment.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Initialize database & sync with MongoDB Atlas
getDb();
initMongo().then((db) => {
  if (db) {
    console.log('[PindiVantalu Server] MongoDB Atlas connection successfully initialized.');
  }
}).catch((err) => {
  console.error('[PindiVantalu Server] MongoDB initialization error:', err.message);
});

// Core Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(authenticateToken);

// Serve static assets from src/assets for generated images
app.use('/src/assets', express.static(path.join(__dirname, 'src', 'assets')));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/coupons', couponsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/media', mediaRouter);
app.use('/api', paymentRouter);
app.use('/api/payment', paymentRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    store: 'PindiVantalu',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Vite middleware for development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PindiVantalu Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[PindiVantalu Server] Startup failed:', err);
  process.exit(1);
});
