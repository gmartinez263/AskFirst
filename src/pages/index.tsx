/**
 * AskFirst Landing Page — Static Entry Point.
 *
 * Renders without DeepSpace auth or WebSocket providers so crawlers and
 * visitors load it instantaneously.
 */

import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { APP_NAME } from '../constants'
import { seo } from '../seo'

export default function Landing() {
  return (
    <>
      <Seo {...seo} path="/" />
      <div
        data-testid="static-landing"
        className="flex min-h-screen flex-col items-center justify-between bg-background px-6 py-12 text-foreground"
      >
        {/* Header / Brand */}
        <header className="flex w-full max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-lg">
              ?
            </span>
            <span className="text-xl font-bold tracking-tight">{APP_NAME}</span>
          </div>
          <Link
            to="/home"
            className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition hover:opacity-90"
          >
            Open App &rarr;
          </Link>
        </header>

        {/* Hero Section */}
        <main className="my-auto flex max-w-3xl flex-col items-center text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/40 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Safe Family Purchasing</span>
            <span className="text-primary">•</span>
            <span>Real-time Approvals</span>
          </div>

          <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-6xl sm:leading-tight">
            Kids ask. <br />
            Parents review. <br />
            <span className="text-primary">No surprise credit card charges.</span>
          </h1>

          <p className="mb-8 max-w-xl text-lg text-muted-foreground sm:text-xl">
            Give kids an allowance without giving them your card. Children submit what they want to buy;
            parents get live alerts, age-aware AI safety advice, and a one-click checkout link.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link
              to="/home"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
            >
              Get Started with AskFirst
            </Link>
          </div>

          {/* Value Props Grid */}
          <div className="mt-16 grid grid-cols-1 gap-6 text-left sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
              <div className="mb-3 text-2xl">💳</div>
              <h3 className="font-semibold text-foreground">Cards Never Leave You</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Kids never see or handle your credit card numbers. Approved requests launch the retailer's checkout for the parent directly.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
              <div className="mb-3 text-2xl">🤖</div>
              <h3 className="font-semibold text-foreground">Age-Aware AI Safety</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Instant safety audits flag mature ratings, hidden subscriptions, and predatory in-app purchases before you approve.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
              <div className="mb-3 text-2xl">⚡</div>
              <h3 className="font-semibold text-foreground">Instant Real-Time Sync</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Powered by DeepSpace Durable Objects: requests appear immediately on parent screens across phones, tablets, and laptops.
              </p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-muted-foreground">
          Built on DeepSpace with Cloudflare Durable Objects.
        </footer>
      </div>
    </>
  )
}
