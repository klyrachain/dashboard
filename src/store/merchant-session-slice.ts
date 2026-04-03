import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type SessionPortalType = "platform" | "merchant";

/** Tenant partition for Merchant API (`x-merchant-environment`). */
export type MerchantEnvironment = "TEST" | "LIVE";

export type MerchantBusiness = {
  id: string;
  name: string;
  slug: string;
  /** Portal RBAC for this membership (when returned by session). */
  role?: string;
};

export type MerchantSessionState = {
  /** Platform (super admin) vs tenant portal */
  sessionType: SessionPortalType;
  /** Portal JWT for Bearer auth on `/api/v1/merchant/*` — set after login */
  portalJwt: string | null;
  /** Business portal user email (from GET /api/business-auth/session). */
  portalUserEmail: string | null;
  /** Business portal display name (from session). */
  portalUserDisplayName: string | null;
  /** Active tenant scope */
  activeBusinessId: string | null;
  businesses: MerchantBusiness[];
  /** Sent as `x-merchant-environment` on `/api/v1/merchant/*` */
  merchantEnvironment: MerchantEnvironment;
  /** Role for `activeBusinessId` — UI RBAC (portal JWT only). */
  activeBusinessRole: string | null;
};

const initialState: MerchantSessionState = {
  sessionType: "platform",
  portalJwt: null,
  portalUserEmail: null,
  portalUserDisplayName: null,
  activeBusinessId: null,
  businesses: [],
  merchantEnvironment: "LIVE",
  activeBusinessRole: null,
};

export const merchantSessionSlice = createSlice({
  name: "merchantSession",
  initialState,
  reducers: {
    hydrateMerchantSession(
      state,
      action: PayloadAction<Partial<MerchantSessionState> & { sessionType: SessionPortalType }>
    ) {
      state.sessionType = action.payload.sessionType;
      if (action.payload.portalJwt !== undefined) {
        state.portalJwt = action.payload.portalJwt;
      }
      if (action.payload.portalUserEmail !== undefined) {
        state.portalUserEmail = action.payload.portalUserEmail;
      }
      if (action.payload.portalUserDisplayName !== undefined) {
        state.portalUserDisplayName = action.payload.portalUserDisplayName;
      }
      if (action.payload.businesses !== undefined) {
        state.businesses = action.payload.businesses;
      }
      if (action.payload.activeBusinessId !== undefined) {
        state.activeBusinessId = action.payload.activeBusinessId;
      } else if (
        action.payload.sessionType === "merchant" &&
        action.payload.businesses &&
        action.payload.businesses.length === 1
      ) {
        state.activeBusinessId = action.payload.businesses[0].id;
      }
      if (action.payload.merchantEnvironment !== undefined) {
        state.merchantEnvironment = action.payload.merchantEnvironment;
      }
      if (action.payload.activeBusinessRole !== undefined) {
        state.activeBusinessRole = action.payload.activeBusinessRole;
      } else if (state.activeBusinessId && state.businesses.length > 0) {
        const m = state.businesses.find((b) => b.id === state.activeBusinessId);
        state.activeBusinessRole = m?.role?.trim() ?? state.activeBusinessRole;
      }
    },
    setPortalJwt(state, action: PayloadAction<string | null>) {
      state.portalJwt = action.payload;
    },
    setActiveBusinessId(state, action: PayloadAction<string | null>) {
      state.activeBusinessId = action.payload;
      if (action.payload && state.businesses.length > 0) {
        const m = state.businesses.find((b) => b.id === action.payload);
        state.activeBusinessRole = m?.role?.trim() ?? null;
      } else if (!action.payload) {
        state.activeBusinessRole = null;
      }
    },
    setMerchantEnvironment(
      state,
      action: PayloadAction<MerchantEnvironment>
    ) {
      state.merchantEnvironment = action.payload;
    },
    setActiveBusinessRole(state, action: PayloadAction<string | null>) {
      state.activeBusinessRole = action.payload;
    },
    setBusinesses(state, action: PayloadAction<MerchantBusiness[]>) {
      state.businesses = action.payload;
      if (
        state.sessionType === "merchant" &&
        action.payload.length === 1 &&
        !state.activeBusinessId
      ) {
        state.activeBusinessId = action.payload[0].id;
        state.activeBusinessRole = action.payload[0].role?.trim() ?? null;
      } else if (state.activeBusinessId) {
        const m = action.payload.find((b) => b.id === state.activeBusinessId);
        state.activeBusinessRole = m?.role?.trim() ?? null;
      }
    },
    clearMerchantPortal(state) {
      state.sessionType = "platform";
      state.portalJwt = null;
      state.portalUserEmail = null;
      state.portalUserDisplayName = null;
      state.activeBusinessId = null;
      state.businesses = [];
      state.merchantEnvironment = "LIVE";
      state.activeBusinessRole = null;
    },
  },
});

export const {
  hydrateMerchantSession,
  setPortalJwt,
  setActiveBusinessId,
  setMerchantEnvironment,
  setActiveBusinessRole,
  setBusinesses,
  clearMerchantPortal,
} = merchantSessionSlice.actions;
