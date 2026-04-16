"use server";

import { getConnectMerchantById, type ConnectMerchantDetailResult } from "@/lib/data-connect";
import { getConnectSettlementById, type ConnectSettlementDetailResult } from "@/lib/data-connect";

export async function getConnectMerchantByIdAction(
  id: string
): Promise<ConnectMerchantDetailResult> {
  return getConnectMerchantById(id);
}

export async function getConnectSettlementByIdAction(
  id: string
): Promise<ConnectSettlementDetailResult> {
  return getConnectSettlementById(id);
}
