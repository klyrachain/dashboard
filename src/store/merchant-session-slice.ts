import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type SessionPortalType = "platform" | "merchant";

export type MerchantBusiness = {
  id: string;
  name: string;
  slug: string;
};

export type MerchantSessionState = {
  /** Platform (super admin) vs tenant portal */
  sessionType: SessionPortalType;
  /** Portal JWT for Bearer auth on `/api/v1/merchant/*` — set after login */
  portalJwt: string | null;
  /** Active tenant scope */
  activeBusinessId: string | null;
  businesses: MerchantBusiness[];
};

const initialState: MerchantSessionState = {
  sessionType: "platform",
  portalJwt: null,
  activeBusinessId: null,
  businesses: [],
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
    },
    setPortalJwt(state, action: PayloadAction<string | null>) {
      state.portalJwt = action.payload;
    },
    setActiveBusinessId(state, action: PayloadAction<string | null>) {
      state.activeBusinessId = action.payload;
    },
    setBusinesses(state, action: PayloadAction<MerchantBusiness[]>) {
      state.businesses = action.payload;
      if (
        state.sessionType === "merchant" &&
        action.payload.length === 1 &&
        !state.activeBusinessId
      ) {
        state.activeBusinessId = action.payload[0].id;
      }
    },
    clearMerchantPortal(state) {
      state.sessionType = "platform";
      state.portalJwt = null;
      state.activeBusinessId = null;
      state.businesses = [];
    },
  },
});

export const {
  hydrateMerchantSession,
  setPortalJwt,
  setActiveBusinessId,
  setBusinesses,
  clearMerchantPortal,
} = merchantSessionSlice.actions;
