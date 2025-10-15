import { appRouter } from "./index";


export function createCaller() {
  return appRouter.createCaller({});
}