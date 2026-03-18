import { configureStore, type EnhancedStore } from "@reduxjs/toolkit";
import { inventoryApi } from "./inventory-api";
import { providersApi } from "./providers-api";
import { validationApi } from "./validation-api";
import { layoutSlice } from "./layout-slice";
import { authSlice } from "./auth-slice";
import { statusIndicatorSlice } from "./status-indicator-slice";
import {
  merchantSessionSlice,
  type MerchantSessionState,
} from "./merchant-session-slice";
import { preferencesSlice } from "./preferences-slice";
import { webhookSlice } from "./webhook-slice";
import type { LayoutPreference } from "@/lib/layout-preference-cookie";

export interface RootState {
  [inventoryApi.reducerPath]: ReturnType<typeof inventoryApi.reducer>;
  [providersApi.reducerPath]: ReturnType<typeof providersApi.reducer>;
  [validationApi.reducerPath]: ReturnType<typeof validationApi.reducer>;
  layout: ReturnType<typeof layoutSlice.reducer>;
  statusIndicator: ReturnType<typeof statusIndicatorSlice.reducer>;
  merchantSession: ReturnType<typeof merchantSessionSlice.reducer>;
}

export type AppDispatch = EnhancedStore<RootState>["dispatch"];
export type AppStore = EnhancedStore<RootState>;

export type MakeStoreInput =
  | LayoutPreference
  | null
  | undefined
  | {
      layout?: LayoutPreference | null;
      merchantSession?: Partial<MerchantSessionState> | null;
    };

function parseMakeStoreInput(input: MakeStoreInput): {
  layout: LayoutPreference | null;
  merchantSession: Partial<MerchantSessionState> | null;
} {
  if (input == null) {
    return { layout: null, merchantSession: null };
  }
  if (typeof input === "object" && ("layout" in input || "merchantSession" in input)) {
    const o = input as {
      layout?: LayoutPreference | null;
      merchantSession?: Partial<MerchantSessionState> | null;
    };
    return {
      layout: o.layout ?? null,
      merchantSession: o.merchantSession ?? null,
    };
  }
  if (typeof input === "object" && "theme" in input) {
    return { layout: input as LayoutPreference, merchantSession: null };
  }
  return { layout: null, merchantSession: null };
}

export function makeStore(input?: MakeStoreInput): AppStore {
  const { layout: initialLayout, merchantSession: ms } = parseMakeStoreInput(input ?? null);

  const merchantSessionPreload: MerchantSessionState = {
    sessionType: ms?.sessionType ?? "platform",
    portalJwt: ms?.portalJwt ?? null,
    activeBusinessId: ms?.activeBusinessId ?? null,
    businesses: ms?.businesses ?? [],
  };

  const preloaded: Partial<RootState> = {
    merchantSession: merchantSessionPreload,
  };
  if (initialLayout) {
    preloaded.layout = {
      theme: initialLayout.theme,
      testMode: initialLayout.testMode,
    };
  }

  return configureStore({
    reducer: {
      [inventoryApi.reducerPath]: inventoryApi.reducer,
      [providersApi.reducerPath]: providersApi.reducer,
      [validationApi.reducerPath]: validationApi.reducer,
      layout: layoutSlice.reducer,
      auth: authSlice.reducer,
      statusIndicator: statusIndicatorSlice.reducer,
      merchantSession: merchantSessionSlice.reducer,
      preferences: preferencesSlice.reducer,
      webhook: webhookSlice.reducer,
    },
    middleware: (getDefaultMiddleware: () => { concat: (...m: unknown[]) => unknown }) =>
      getDefaultMiddleware().concat(
        inventoryApi.middleware,
        providersApi.middleware,
        validationApi.middleware
      ),
    preloadedState: preloaded,
  } as never) as AppStore;
}

/** @deprecated Use store from ReduxProvider context (useStore). Kept for non-React code that runs outside Provider. */
export const store = makeStore();
