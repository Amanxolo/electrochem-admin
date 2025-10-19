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
  
  getById: t.procedure
    .input(z.object({ id: z.string().optional() }))
    .query(async ({ input }) => {
      await dbConnect();
      const product = await Product.findById(input.id).lean();
      console.log('Product fetched:', product);
      if (!product) throw new Error('Product not found');
      return product;
  }),

  addProduct: t.procedure
    .input(
      z.object({
        productName: z.string(),
        productCategory: z.string(),
        price: z.number(),
        stock:z.number().default(0),
        prodSpecs: z.string().optional(),
        minQuantity: z.number().default(1),
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
          stock: z.number().optional(),
          minQuantity: z.number().optional(),
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

  
});
