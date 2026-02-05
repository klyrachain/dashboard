import { createSlice } from "@reduxjs/toolkit";

/**
 * Incremented when POST /api/webhooks/admin receives an event.
 * Components (e.g. volume section) subscribe and refetch in background without showing full loading.
 */
export const webhookSlice = createSlice({
  name: "webhook",
  initialState: { lastTrigger: 0 },
  reducers: {
    incrementWebhookTrigger: (state) => {
      state.lastTrigger += 1;
    },
  },
});

export const { incrementWebhookTrigger } = webhookSlice.actions;
export const selectWebhookLastTrigger = (state: { webhook: { lastTrigger: number } }) =>
  state.webhook.lastTrigger;
