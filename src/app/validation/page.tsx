import { ValidationFailedClient } from "@/components/validation/validation-failed-client";

export default function ValidationPage() {
  return (
    <div className="space-y-8 font-primary text-body">
      <div>
        <h1 className="text-display font-semibold tracking-tight">
          Failed order validation
        </h1>
        <p className="font-secondary text-caption text-muted-foreground mt-1">
          Dashboard and list of failed validations (price out of tolerance, quote expired, etc.).
          Data from Core API with platform admin key.
        </p>
      </div>
      <ValidationFailedClient />
    </div>
  );
}
