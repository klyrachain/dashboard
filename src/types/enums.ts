// ==========================================
// Enums (Must match Prisma Schema)
// ==========================================

export enum TransactionType {
  BUY = "BUY",
  SELL = "SELL",
  TRANSFER = "TRANSFER",
  REQUEST = "REQUEST",
  CLAIM = "CLAIM",
}

export enum TransactionStatus {
  ACTIVE = "ACTIVE",
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  FAILED = "FAILED",
}

export enum PaymentProvider {
  NONE = "NONE",
  ANY = "ANY",
  SQUID = "SQUID",
  LIFI = "LIFI",
  PAYSTACK = "PAYSTACK",
}

export enum IdentityType {
  ADDRESS = "ADDRESS",
  EMAIL = "EMAIL",
  NUMBER = "NUMBER",
}

export enum SupportedChain {
  ETHEREUM = "ETHEREUM",
  BNB = "BNB",
  BASE = "BASE",
  SOLANA = "SOLANA",
}

/** Used for claim flows; aligns with Core API. */
export enum ClaimStatus {
  ACTIVE = "ACTIVE",
  CLAIMED = "CLAIMED",
  CANCELLED = "CANCELLED",
  FAIL = "FAIL",
}
