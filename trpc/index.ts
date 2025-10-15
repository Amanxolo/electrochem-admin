import { initTRPC } from '@trpc/server';
import { productRouter } from './routers/product';

import { userRouter } from './routers/user';

const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = router({
  product: productRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
