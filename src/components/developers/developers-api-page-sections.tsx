import { BookOpen, Gauge, KeyRound, Terminal, Webhook } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type KeysIntroVariant = "platform" | "merchant";

export function KeysRateTiersIntro({ variant }: { variant: KeysIntroVariant }) {
  const copy =
    variant === "merchant"
      ? "Create and name keys for this business. Limits follow your workspace plan—contact support to raise throughput for high-volume checkouts."
      : "Use development keys in sandboxes and production keys for live traffic. Throughput and burst limits follow your verification tier; rotate keys from this page without downtime when dual-signing is enabled.";

  return (
    <div className="rounded-lg bg-background text-card-foreground space-y-4 p-4 pb-6">
      <div className="flex flex-wrap items-center gap-2 flex-1">
        {/* <KeyRound className="size-5 shrink-0 text-primary" aria-hidden /> */}
        <h2 className="font-primary text-heading font-semibold tracking-tight text-foreground">
          Keys & rate tiers
        </h2>
      </div>
      <p className="max-w-prose font-secondary text-caption leading-relaxed text-muted-foreground">{copy}</p>
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="font-mono text-caption">
          sandbox
        </Badge>
        <Badge variant="outline" className="font-mono text-caption">
          live
        </Badge>
        <Badge variant="secondary" className="text-caption">
          Rotate without downtime
        </Badge>
      </div>
    </div>
  );
}

type DocSectionsProps = {
  /** Base URL for curl example (no trailing slash). */
  baseUrl: string;
  /** Example path appended to baseUrl for the sample request. */
  examplePath?: string;
  /** First header line inside the example (no secrets). */
  authHeaderLine: string;
  /** External docs link for the footer CTA. */
  docsHref: string;
  /** Shown in the curl sample when `baseUrl` is not yet available (e.g. client-hydrating merchant base). */
  emptyBasePlaceholder?: string;
};

export function DeveloperRequestExample({
  curlBlock = "curl -sS \"https://api.example.com/v1/health\" -H \"Authorization: Bearer YOUR_SECRET\" -H \"Content-Type: application/json\"",
  requestHeader,
  description,
}: {
  curlBlock?: string;
  requestHeader: string;
  description: string;
}): React.ReactNode {
  return (
    <div className="rounded-lg bg-background text-card-foreground space-y-4 p-4 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Terminal className="size-5 shrink-0 text-primary" aria-hidden />
          <h2
            id="dash-dev-auth-heading"
            className="font-primary text-heading font-semibold tracking-tight text-foreground"
          >
            {requestHeader}
          </h2>
        </div>
        <p className="max-w-prose font-secondary text-caption leading-relaxed text-muted-foreground">
          {description}
        </p>
        
        <div className="overflow-hidden rounded-lg border border-border bg-muted/40">
          <div className="border-b border-border bg-muted/60 px-4 py-2 text-caption font-medium uppercase tracking-wide text-muted-foreground">
            Example
          </div>
          <pre
            className="overflow-x-auto p-4 font-mono text-caption leading-relaxed text-foreground"
            tabIndex={0}
          >
            <code>{curlBlock}</code>
          </pre>
        </div>
      </div>
  );
}

export function DevelopersApiDocSections({
  baseUrl,
  examplePath = "/health",
  authHeaderLine,
  docsHref,
  emptyBasePlaceholder = "<API_BASE_URL>/health",
}: DocSectionsProps) {
  const trimmed = baseUrl.trim().replace(/\/$/, "");
  const path =
    examplePath && examplePath.length > 0
      ? examplePath.startsWith("/")
        ? examplePath
        : `/${examplePath}`
      : "";
  const urlForCurl =
    trimmed.length > 0
      ? path
        ? `${trimmed}${path}`
        : trimmed
      : emptyBasePlaceholder;

  const curlBlock = `curl -sS "${urlForCurl}" \\
  -H "${authHeaderLine}" \\
  -H "Content-Type: application/json"`;

  return (
    <div className="space-y-6">
      <div className="h-4"/>
      <h2
          id="dash-dev-cap-heading"
          className="font-primary text-heading font-semibold tracking-tight text-foreground"
        >
          How to use our API
        </h2>
      <section aria-labelledby="dash-dev-auth-heading" className="space-y-4 flex gap-4 scroll-smooth overflow-x-auto">
        {DeveloperRequestExample({ requestHeader: "Send Payment Request", description: "Send your secret on every server-side request. Prefer headers over query strings so keys do not appear in logs or referrer headers.", curlBlock })}
        {DeveloperRequestExample({ requestHeader: "Fetch Payment Details", description: "Route and price swaps or cross-border transfers before creating a user-facing transaction.", curlBlock })}
        {DeveloperRequestExample({ requestHeader: "Validate Orders", description: "Payment links, hosted checkout, and order state for digital and physical goods.", curlBlock })}
        {DeveloperRequestExample({ requestHeader: "Track Transactions", description: "Balances, payouts, fee schedules, and webhook endpoints for your integration.", curlBlock })}
      </section>

      <div className="h-4"/>
      <section aria-labelledby="dash-dev-cap-heading" className="space-y-4">
        <h2
          id="dash-dev-cap-heading"
          className="font-primary text-heading font-semibold tracking-tight text-foreground"
        >
          Core capabilities
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <li className="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm transition-all duration-300 ease-out hover:border-primary/25 hover:shadow-md">
            <div className="flex items-start gap-3">
              <Gauge className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <div>
                <h3 className="font-primary font-semibold text-foreground">Quotes</h3>
                <p className="mt-2 font-secondary text-caption leading-relaxed text-muted-foreground">
                  Route and price swaps or cross-border transfers before creating a user-facing transaction.
                </p>
              </div>
            </div>
          </li>
          <li className="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm transition-all duration-300 ease-out hover:border-primary/25 hover:shadow-md">
            <div className="flex items-start gap-3">
              <BookOpen className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <div>
                <h3 className="font-primary font-semibold text-foreground">Commerce</h3>
                <p className="mt-2 font-secondary text-caption leading-relaxed text-muted-foreground">
                  Payment links, hosted checkout, and order state for digital and physical goods.
                </p>
              </div>
            </div>
          </li>
          <li className="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm transition-all duration-300 ease-out hover:border-primary/25 hover:shadow-md sm:col-span-2 lg:col-span-1">
            <div className="flex items-start gap-3">
              <KeyRound className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <div>
                <h3 className="font-primary font-semibold text-foreground">Merchant</h3>
                <p className="mt-2 font-secondary text-caption leading-relaxed text-muted-foreground">
                  Balances, payouts, fee schedules, and webhook endpoints for your integration.
                </p>
              </div>
            </div>
          </li>
        </ul>
        <div className="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm transition-all duration-300 ease-out hover:border-primary/25 hover:shadow-md sm:col-span-2 lg:col-span-1">
        {/* <div className="flex items-start "> */}
          <Webhook className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div className="space-y-3">
            <h2
              id="dash-dev-webhooks-heading"
              className="font-primary text-heading font-semibold tracking-tight text-foreground"
            >
              Webhooks
            </h2>
            <p className="max-w-prose font-secondary text-caption leading-relaxed text-muted-foreground">
              Register HTTPS endpoints in the dashboard. Payloads are signed so you can verify origin. Design handlers
              to be idempotent using provider reference IDs.
            </p>
          </div>
        {/* </div> */}
        </div>
      </section>
      
      <div className="h-4"/>
      <section aria-labelledby="dash-dev-env-heading" className="space-y-3">
        <h2
          id="dash-dev-env-heading"
          className="font-primary text-heading font-semibold tracking-tight text-foreground"
        >
          Environments
        </h2>
        <p className="max-w-prose font-secondary text-caption leading-relaxed text-muted-foreground">
          Use sandbox keys for integration tests; production keys are scoped to your live profile. Rotate keys from
          this workspace without downtime when dual-signing is enabled.
        </p>
        <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-secondary text-caption text-muted-foreground">
          Request and response schemas are versioned with each release.
        </p>
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <a href={docsHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
            Documentation
            <BookOpen className="size-4" aria-hidden />
          </a>
        </Button>
      </div>
      </section>
      
      <div className="h-4"/>


    </div>
  );
}
