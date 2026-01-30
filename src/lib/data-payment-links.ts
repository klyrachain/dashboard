/**
 * Payment link / request data. Replace with API when wired.
 */

export type PaymentLinkStatus = "Pending" | "Paid" | "Expired" | "Cancelled";

export type PaymentLinkRow = {
  id: string;
  amount: string;
  currency: string;
  customer: string;
  requested: Date;
  invoiceNo: string | null;
  status: PaymentLinkStatus;
  code: string;
  offlineReference: string;
};

/** Mock payment link requests. */
export function getPaymentLinks(): PaymentLinkRow[] {
  const now = new Date();
  return [
    {
      id: "pl_1",
      amount: "10",
      currency: "GHS",
      customer: "pixelhubster@gmail.com",
      requested: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 0),
      invoiceNo: null,
      status: "Pending",
      code: "PRQ_gg3sp1c0jrdbus8",
      offlineReference: "163594422946881",
    },
    {
      id: "pl_2",
      amount: "25",
      currency: "GHS",
      customer: "customer@example.com",
      requested: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
      invoiceNo: "INV_001",
      status: "Paid",
      code: "PRQ_abc123xyz",
      offlineReference: "163594422946882",
    },
    {
      id: "pl_3",
      amount: "50",
      currency: "USD",
      customer: "billing@company.com",
      requested: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2),
      invoiceNo: "INV_002",
      status: "Pending",
      code: "PRQ_def456uvw",
      offlineReference: "163594422946883",
    },
  ];
}
