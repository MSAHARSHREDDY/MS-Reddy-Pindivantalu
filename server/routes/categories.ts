import { Router, Response } from 'express';
import { getDb, saveDb, saveCategoryToMongo, deleteCategoryFromMongo } from '../db.js';
import { AuthenticatedRequest, requireAdmin } from '../middleware/auth.js';
import { Category } from '../types.js';
import { slugify } from './products.js';

export const categoriesRouter = Router();

// GET /api/categories (Public)
categoriesRouter.get('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const db = getDb();
    const categories = db.categories
      .filter((c) => c.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((cat) => {
        const count = db.products.filter((p) => p.categoryId === cat.id && p.isActive).length;
        return {
          ...cat,
          productCount: count,
        };
      });

    res.json({ success: true, categories });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch categories.' });
  }
});

// GET /api/admin/categories (Admin)
categoriesRouter.get('/admin/list', requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const db = getDb();
    const categories = db.categories
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((cat) => {
        const totalProducts = db.products.filter((p) => p.categoryId === cat.id).length;
        const activeProducts = db.products.filter((p) => p.categoryId === cat.id && p.isActive).length;
        return {
          ...cat,
          totalProducts,
          activeProducts,
        };
      });

    res.json({ success: true, categories });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch categories.' });
  }
});

// POST /api/admin/categories
categoriesRouter.post('/admin/create', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, slug, description, image, displayOrder, isActive } = req.body;

    if (!name) {
      res.status(400).json({ success: false, message: 'Category name is required.' });
      return;
    }

    const db = getDb();
    const finalSlug = slug ? slugify(slug) : slugify(name);

    if (db.categories.some((c) => c.slug === finalSlug)) {
      res.status(409).json({ success: false, message: 'A category with this URL slug already exists.' });
      return;
    }

    const now = new Date().toISOString();
    const newCategory: Category = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      slug: finalSlug,
      description: description ? description.trim() : '',
      image: image || '/src/assets/images/category_festive_collection_1790935819627.jpg',
      parentCategoryId: null,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      displayOrder: displayOrder !== undefined ? Number(displayOrder) : db.categories.length + 1,
      createdAt: now,
      updatedAt: now,
    };

    db.categories.push(newCategory);
    await saveDb();
    saveCategoryToMongo(newCategory).catch(() => {});

    res.status(201).json({ success: true, category: newCategory, message: 'Category created successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to create category.' });
  }
});

// PATCH /api/admin/categories/:id
categoriesRouter.patch('/admin/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const db = getDb();
    const category = db.categories.find((c) => c.id === id);

    if (!category) {
      res.status(404).json({ success: false, message: 'Category not found.' });
      return;
    }

    const updates = req.body;
    if (updates.name !== undefined) category.name = updates.name.trim();
    if (updates.slug !== undefined) {
      const candidateSlug = slugify(updates.slug);
      if (!db.categories.some((c) => c.id !== id && c.slug === candidateSlug)) {
        category.slug = candidateSlug;
      }
    }
    if (updates.description !== undefined) category.description = updates.description.trim();
    if (updates.image !== undefined) category.image = updates.image;
    if (updates.displayOrder !== undefined) category.displayOrder = Number(updates.displayOrder);
    if (updates.isActive !== undefined) category.isActive = Boolean(updates.isActive);

    category.updatedAt = new Date().toISOString();
    await saveDb();
    saveCategoryToMongo(category).catch(() => {});

    res.json({ success: true, category, message: 'Category updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update category.' });
  }
});

// DELETE /api/admin/categories/:id
categoriesRouter.delete('/admin/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reassignToCategoryId } = req.body;
    const db = getDb();
    const index = db.categories.findIndex((c) => c.id === id);

    if (index === -1) {
      res.status(404).json({ success: false, message: 'Category not found.' });
      return;
    }

    const linkedProducts = db.products.filter((p) => p.categoryId === id);

    if (linkedProducts.length > 0) {
      if (reassignToCategoryId) {
        // Reassign products
        const targetCategory = db.categories.find((c) => c.id === reassignToCategoryId);
        if (!targetCategory) {
          res.status(400).json({ success: false, message: 'Reassign target category does not exist.' });
          return;
        }
        linkedProducts.forEach((p) => {
          p.categoryId = reassignToCategoryId;
          p.updatedAt = new Date().toISOString();
        });
      } else {
        res.status(400).json({
          success: false,
          hasLinkedProducts: true,
          productCount: linkedProducts.length,
          message: `Cannot delete category because it has ${linkedProducts.length} product(s) assigned. Please select a category to reassign them to.`,
        });
        return;
      }
    }

    db.categories.splice(index, 1);
    await saveDb();
    deleteCategoryFromMongo(id).catch(() => {});

    res.json({ success: true, message: 'Category deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to delete category.' });
  }
});
