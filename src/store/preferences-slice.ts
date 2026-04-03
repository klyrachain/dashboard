import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { QuoteCurrency } from "@/lib/token-rates";

type PreferencesState = {
  /** Platform base currency; null until loaded from API. */
  baseCurrency: QuoteCurrency | null;
};

const initialState: PreferencesState = {
  baseCurrency: null,
};

export const preferencesSlice = createSlice({
  name: "preferences",
  initialState,
  reducers: {
    setBaseCurrency: (state, action: PayloadAction<QuoteCurrency | null>) => {
      state.baseCurrency = action.payload;
    },
  },
});

export const { setBaseCurrency } = preferencesSlice.actions;

export const selectBaseCurrency = (state: { preferences: PreferencesState }): QuoteCurrency =>
  state.preferences.baseCurrency ?? "usdc";
