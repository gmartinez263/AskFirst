import { useMemo, useState, type FormEvent } from 'react'
import { ArrowLeft, LoaderCircle, Plus, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth, useMutations, useQuery } from 'deepspace'
import type { Child, PurchaseRequest, RequestCategory, RequestStatus } from '@/types/askfirst'
import { DEMO_CHILDREN } from '@/demo-data'
import { approvedAmountThisMonth } from '@/lib/allowance'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'

type NewRequest = Omit<
  Pick<PurchaseRequest, 'childId' | 'childProfileId' | 'childName' | 'title' | 'url' | 'price' | 'category' | 'status'>,
  'childProfileId'
> & { childProfileId: string; reason?: string }

const categories: RequestCategory[] = [
  'game',
  'toy',
  'subscription',
  'app',
  'clothing',
  'book',
  'electronics',
  'other',
]

const statusLabels: Record<RequestStatus, string> = {
  pending: 'Pending review',
  approved: 'Approved!',
  denied: 'Denied',
}

const statusVariants: Record<RequestStatus, 'warning' | 'success' | 'secondary'> = {
  pending: 'warning',
  approved: 'success',
  denied: 'secondary',
}

interface ChildPortalProps {
  childProfileId: string | null
}

export default function ChildPortal({ childProfileId }: ChildPortalProps) {
  const { userId } = useAuth()
  const { records: childRecords = [], status: childrenStatus } = useQuery<Child>('children')
  const { records: requestRecords = [], status: requestsStatus, error: requestsError } = useQuery<PurchaseRequest>(
    'requests',
    childProfileId ? { where: { childProfileId }, orderBy: 'createdAt', orderDir: 'desc' } : { where: { childProfileId: '__no_child_selected__' } },
  )
  const { createConfirmed, ready } = useMutations<NewRequest>('requests')
  const [isAskModalOpen, setIsAskModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState<RequestCategory>('game')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const profiles = useMemo<Child[]>(() => {
    if (childRecords.length === 0) return DEMO_CHILDREN
    return childRecords.map((record) => ({
      ...record.data,
      id: record.recordId || record.data.id,
      createdAt: record.createdAt || record.data.createdAt,
      updatedAt: record.updatedAt || record.data.updatedAt,
    }))
  }, [childRecords])
  const child = profiles.find((profile) => profile.id === childProfileId)
  const requests = requestRecords.map((record) => ({
    ...record.data,
    id: record.recordId,
    createdAt: record.createdAt,
  }))

  const allowance = Math.max(0, child?.monthlyAllowance ?? 0)
  const spent = Math.max(0, child?.spentThisMonth ?? 0) + (childProfileId ? approvedAmountThisMonth(requests, childProfileId) : 0)
  const remaining = Math.max(0, allowance - spent)
  const spentPercent = allowance > 0 ? Math.min(100, (spent / allowance) * 100) : 0

  const resetForm = () => {
    setTitle('')
    setUrl('')
    setPrice('')
    setCategory('game')
    setReason('')
    setSubmitError(null)
  }

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!child || !userId) {
      setSubmitError('Your signed-in family account is not ready. Please try again.')
      return
    }

    const numericPrice = Number(price)
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setSubmitError('Enter a price greater than $0.')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await createConfirmed({
        childId: userId,
        childProfileId: child.id,
        childName: child.name,
        title: title.trim(),
        url: url.trim(),
        price: numericPrice,
        category,
        status: 'pending',
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      })
      resetForm()
      setIsAskModalOpen(false)
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : 'Could not send your request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!childProfileId || (!child && childrenStatus === 'ready')) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
          <ShoppingBag className="h-5 w-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-semibold">Choose a child profile first</h1>
        <p className="mt-2 text-sm text-muted-foreground">Return to the sign-in screen and select your profile.</p>
        <Link to="/login" className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to sign-in
        </Link>
      </div>
    )
  }

  if (!child) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">Loading child profile…</div>
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
      <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-3xl" aria-hidden="true">
            {child.avatar || '🚀'}
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Child space</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Hi, {child.name}!</h1>
            <p className="text-sm text-muted-foreground">What would you like to ask for?</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setIsAskModalOpen(true) }}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Ask for Something
        </Button>
      </header>

      <section aria-labelledby="allowance-heading" className="mt-7 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Monthly allowance</p>
            <h2 id="allowance-heading" className="mt-1 text-2xl font-bold tabular-nums">${remaining.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">left</span></h2>
          </div>
          <p className="text-sm tabular-nums text-muted-foreground">${spent.toFixed(2)} used (spent + approved) of ${allowance.toFixed(2)}</p>
        </div>
        <div
          role="progressbar"
          aria-label="Monthly allowance used, including approved requests"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(spentPercent)}
          className="mt-4 h-2.5 overflow-hidden rounded-full bg-secondary"
        >
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${spentPercent}%` }} />
        </div>
      </section>

      <section aria-labelledby="requests-heading" className="mt-9">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="requests-heading" className="text-lg font-semibold">Your requests</h2>
            <p className="mt-1 text-sm text-muted-foreground">You’ll see your parent’s decision here.</p>
          </div>
          <span className="text-xs text-muted-foreground">Updates live</span>
        </div>

        {requestsStatus === 'loading' && (
          <div className="mt-4 flex items-center justify-center gap-3 rounded-2xl border border-border bg-card px-5 py-12 text-sm text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading your requests…
          </div>
        )}
        {requestsStatus === 'error' && (
          <div role="alert" className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
            Could not load your requests{requestsError ? `: ${requestsError}` : '.'}
          </div>
        )}
        {requestsStatus === 'ready' && requests.length === 0 && (
          <div className="mt-4 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
            <p className="font-medium">No requests yet</p>
            <p className="mt-1 text-sm text-muted-foreground">When you ask for something, it’ll show up here.</p>
          </div>
        )}

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {requests.map((request) => (
            <article key={request.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words font-semibold">{request.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">${Number(request.price).toFixed(2)} · <span className="capitalize">{request.category}</span></p>
                </div>
                <Badge variant={statusVariants[request.status]}>{statusLabels[request.status]}</Badge>
              </div>
              {request.reason && <p className="mt-3 text-sm leading-6 text-muted-foreground">“{request.reason}”</p>}
              {request.parentNote && (
                <p className="mt-3 border-l-2 border-primary/50 pl-3 text-sm text-foreground">
                  <span className="font-medium">Parent’s note:</span> {request.parentNote}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>

      <Modal open={isAskModalOpen} onClose={() => setIsAskModalOpen(false)} size="md" aria-label="Ask for something">
        <div className="p-6 text-foreground">
          <h2 className="text-xl font-bold">Ask for something</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your parent will review the item and its checkout link.</p>
          <form onSubmit={submitRequest} className="mt-5 flex flex-col gap-4">
            <div>
              <label htmlFor="request-title" className="text-sm font-medium">What would you like?</label>
              <Input id="request-title" required maxLength={120} className="mt-1.5" placeholder="Item name" value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div>
              <label htmlFor="request-url" className="text-sm font-medium">Store checkout link</label>
              <Input id="request-url" type="url" required className="mt-1.5" placeholder="https://store.example/item" value={url} onChange={(event) => setUrl(event.target.value)} />
              <p className="mt-1.5 text-xs text-muted-foreground">AskFirst won’t take payment. Your parent will use this link to buy the item.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="request-price" className="text-sm font-medium">Price</label>
                <Input id="request-price" type="number" inputMode="decimal" min="0.01" step="0.01" required className="mt-1.5" placeholder="0.00" value={price} onChange={(event) => setPrice(event.target.value)} />
              </div>
              <div>
                <label htmlFor="request-category" className="text-sm font-medium">Category</label>
                <select id="request-category" className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm capitalize text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={category} onChange={(event) => setCategory(event.target.value as RequestCategory)}>
                  {categories.map((option) => <option key={option} value={option} className="capitalize">{option}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="request-reason" className="text-sm font-medium">Note to your parent <span className="font-normal text-muted-foreground">(optional)</span></label>
              <Textarea id="request-reason" className="mt-1.5 min-h-20" maxLength={500} placeholder="Why would you like it?" value={reason} onChange={(event) => setReason(event.target.value)} />
            </div>
            {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" disabled={isSubmitting} onClick={() => setIsAskModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!ready || !userId || isSubmitting} loading={isSubmitting}>Send request</Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  )
}
