import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import { merchantApi } from "./merchant-api";
import {
  hydrateMerchantSession,
  setActiveBusinessId,
  setMerchantEnvironment,
} from "./merchant-session-slice";

/**
 * Merchant API data is partitioned by tenant + environment. Reset RTK Query
 * cache when either changes so hooks refetch with new headers.
 */
export const merchantListenerMiddleware = createListenerMiddleware();

merchantListenerMiddleware.startListening({
  matcher: isAnyOf(
    setMerchantEnvironment,
    setActiveBusinessId,
    hydrateMerchantSession
  ),
  effect: (_action, listenerApi) => {
    listenerApi.dispatch(merchantApi.util.resetApiState());
  },
});
