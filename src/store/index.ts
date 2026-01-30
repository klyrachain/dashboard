import { configureStore } from "@reduxjs/toolkit";
import { inventoryApi } from "./inventory-api";
import { layoutSlice } from "./layout-slice";
import type { LayoutPreference } from "@/lib/layout-preference-cookie";

export type RootState = ReturnType<ReturnType<typeof makeStore>["getState"]>;
export type AppDispatch = ReturnType<typeof makeStore>["dispatch"];

export function makeStore(initialLayout?: LayoutPreference | null) {
  return configureStore({
    reducer: {
      [inventoryApi.reducerPath]: inventoryApi.reducer,
      layout: layoutSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(inventoryApi.middleware),
    preloadedState: initialLayout
      ? { layout: { theme: initialLayout.theme, testMode: initialLayout.testMode } }
      : undefined,
  });
}

/** @deprecated Use store from ReduxProvider context (useStore). Kept for non-React code that runs outside Provider. */
export const store = makeStore();
