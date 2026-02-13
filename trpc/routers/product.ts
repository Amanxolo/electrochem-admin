import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { dbConnect } from '../../models/dbconnect';
import { Product } from '../../models/product';

const t = initTRPC.create();

export const productRouter = t.router({
  getAll: t.procedure.query(async () => {
    await dbConnect();
    return await Product.find().lean();
  }),

  getAllFiltered: t.procedure
    .input(z.object({
      search: z.string().optional(),
      category: z.string().optional(),
      sortBy: z.enum(['featured', 'price-low', 'price-high', 'newest']).optional(),
      page: z.number().min(1).optional(),
      limit: z.number().min(1).max(100).optional(),
      userType: z.enum(['individual', 'reseller', 'oem']).optional(),
    }))
    .query(async ({ input }) => {
      await dbConnect();
      
      const { search, category, sortBy = 'featured', page = 1, limit = 12, userType } = input;
      
      // Build filter query
      const filter: any = {};
      
      if (search) {
        filter.$or = [
          { productName: { $regex: search, $options: 'i' } },
          { prodSpecs: { $regex: search, $options: 'i' } },
          { productCategory: { $regex: search, $options: 'i' } }
        ];
      }
      
      // Restrict product categories by user type:
      // - individual & reseller: only "Batteries" (ignore manual category selection)
      // - oem: respect manual category selection or show all
      if (userType === 'oem') {
        // OEM can see all categories, respect manual selection if provided
        if (category && category !== 'all') {
          filter.productCategory = category;
        }
        // If no category selected, show all (no filter applied)
      } else {
        // Individual & Reseller: always restrict to Batteries only
        filter.productCategory = 'Batteries';
      }
      
      // Build sort query
      let sort: any = {};
      switch (sortBy) {
        case 'price-low':
          sort = { price: 1 };
          break;
        case 'price-high':
          sort = { price: -1 };
          break;
        case 'newest':
          sort = { createdAt: -1 };
          break;
        case 'featured':
        default:
          sort = { productName: 1 };
          break;
      }
      
      // Calculate pagination
      const skip = (page - 1) * limit;
      
      // Execute query
      const products = await Product.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();
      
      // Get total count for pagination
      const totalCount = await Product.countDocuments(filter);
      
      return {
        products,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page * limit < totalCount,
          hasPrev: page > 1,
        }
      };
    }),

  getCategories: t.procedure.query(async () => {
    await dbConnect();
    const categories = await Product.distinct('productCategory');
    return categories.filter(Boolean); // Remove any null/undefined values
  }),
  
  getById: t.procedure
    .input(z.object({ id: z.string().optional() }))
    .query(async ({ input }) => {
      await dbConnect();
      const product = await Product.findById(input.id).lean();
      
      if (!product) throw new Error('Product not found');
      return product;
  }),

  addProduct: t.procedure
    .input(
      z.object({
        productName: z.string(),
        productCategory: z.string(),
        price: z.number(),
        prodSpecs: z.string().optional(),
        minQuantity: z.number().default(1),
        stock: z.number().default(0),
        image: z.array(z.string()).default(["/placeholder.svg"]),
        voltageRatings: z.array(z.string()).default([]),
        ahRatings: z.array(z.string()).default([]),
        subprodlst: z.array(
          z.object({
            modalNo: z.string(),
            M_voltageRating: z.number(),
            M_AhRating: z.number(),
          })
        ).default([]),
      })
    )
    .mutation(async ({ input }) => {
      await dbConnect();
      const newProduct = await Product.create({
        productId: `prod-${Date.now()}`,
        ...input,
      });
      return newProduct;
    }),

    updateProduct: t.procedure
    .input(
      z.object({
        id: z.string(),
        updates: z.object({
          productName: z.string().optional(),
          productCategory: z.string().optional(),
          price: z.number().optional(),
          prodSpecs: z.string().optional(),
          minQuantity: z.number().optional(),
          stock: z.number().optional(),
          image: z.array(z.string()).optional(),
          voltageRatings: z.array(z.string()).optional(),
          ahRatings: z.array(z.string()).optional(),
          subprodlst: z.array(
            z.object({
              modalNo: z.string(),
              M_voltageRating: z.number(),
              M_AhRating: z.number(),
            })
          ).optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      await dbConnect();
      return await Product.findByIdAndUpdate(input.id, input.updates, {
        new: true,
      });
    }),

  deleteProduct: t.procedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await dbConnect();
      return await Product.findByIdAndDelete(input.id);
    }),

  /**
   * Set price for a specific user type for a product.
   * When setting individual price, also keep base `price` in sync.
   */
  setUserTypePrice: t.procedure
    .input(
      z.object({
        id: z.string(),
        userType: z.enum(['individual', 'reseller', 'oem']),
        price: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await dbConnect();
      const { id, userType, price } = input;

      const update: any = {
        [`pricing.${userType}`]: price,
      };

      // Keep base price aligned with individual pricing
      if (userType === 'individual') {
        update.price = price;
      }

      return await Product.findByIdAndUpdate(id, update, {
        new: true,
      });
    }),

});