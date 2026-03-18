import { ValidationFailedClient } from "@/components/validation/validation-failed-client";
import { getAccessContext } from "@/lib/data-access";

export default async function ValidationPage() {
  const access = await getAccessContext();
  const isMerchant = Boolean(access.ok && access.context?.type === "merchant");

  return (
    <div className="space-y-8 font-primary text-body">
      <div>
        <h1 className="text-display font-semibold tracking-tight">
          {isMerchant ? "Payment issues" : "Failed order validation"}
        </h1>
        <p className="font-secondary text-caption text-muted-foreground mt-1">
          {isMerchant
            ? "Quotes that expired, underpayments, or other issues that need your attention."
            : "Dashboard and list of failed validations (price out of tolerance, quote expired, etc.). Data from Core API with platform admin key."}
        </p>
      </div>
      <ValidationFailedClient />
    </div>
  );
}
