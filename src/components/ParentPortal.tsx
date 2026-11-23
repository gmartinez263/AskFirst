import { useState, type FormEvent } from 'react'
import { ArrowUpRight, Check, Clock3, ExternalLink, LoaderCircle, Pencil, Plus, Save, ShieldAlert, Sparkles, Users, X } from 'lucide-react'
import { getAuthToken, useAuth, useMutations, useQuery } from 'deepspace'
import type { AiReview, Child, PurchaseRequest, RequestStatus } from '@/types/askfirst'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { approvedAmountThisMonth } from '@/lib/allowance'

type RequestRecord = Omit<PurchaseRequest, 'id' | 'createdAt' | 'updatedAt'>
type ChildRecord = Omit<Child, 'id' | 'createdAt' | 'updatedAt'>

const childAvatars = ['🚀', '🎨', '🦊', '🐼', '🐸', '🦄', '🐙', '🐯']

const statusLabels: Record<RequestStatus, string> = {
  pending: 'Waiting for you',
  approved: 'Approved',
  denied: 'Not approved',
}

const statusVariant: Record<RequestStatus, 'warning' | 'success' | 'secondary'> = {
  pending: 'warning',
  approved: 'success',
  denied: 'secondary',
}

const severityLabels: Record<AiReview['severity'], string> = {
  safe: 'No clear concern',
  caution: 'Worth checking',
  warning: 'Potential concern',
}

const severityVariants: Record<AiReview['severity'], 'success' | 'warning' | 'destructive'> = {
  safe: 'success',
  caution: 'warning',
  warning: 'destructive',
}

export default function ParentPortal() {
  const { userId } = useAuth()
  const { records = [], status, error } = useQuery<PurchaseRequest>('requests', {
    orderBy: 'createdAt',
    orderDir: 'desc',
  })
  const { records: reviewRecords = [], status: reviewsStatus, error: reviewsError } = useQuery<AiReview>('ai_reviews', {
    orderBy: 'evaluatedAt',
    orderDir: 'desc',
  })
  const { records: childRecords = [], status: childrenStatus, error: childrenError } = useQuery<Child>('children', {
    orderBy: 'createdAt',
    orderDir: 'asc',
  })
  const { putConfirmed, ready } = useMutations<RequestRecord>('requests')
  const {
    createConfirmed: createChildConfirmed,
    putConfirmed: updateChildConfirmed,
    ready: childrenReady,
  } = useMutations<ChildRecord>('children')
  const [activeRequest, setActiveRequest] = useState<string | null>(null)
  const [parentNote, setParentNote] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [assessingId, setAssessingId] = useState<string | null>(null)
  const [assessmentError, setAssessmentError] = useState<{ requestId: string; message: string } | null>(null)
  const [assessmentOverrides, setAssessmentOverrides] = useState<Record<string, AiReview>>({})
  const [isAddChildOpen, setIsAddChildOpen] = useState(false)
  const [isAddingChild, setIsAddingChild] = useState(false)
  const [childFormError, setChildFormError] = useState<string | null>(null)
  const [childName, setChildName] = useState('')
  const [childAge, setChildAge] = useState('')
  const [childAvatar, setChildAvatar] = useState(childAvatars[0])
  const [childPin, setChildPin] = useState('')
  const [childAllowance, setChildAllowance] = useState('25')
  const [editingAllowanceId, setEditingAllowanceId] = useState<string | null>(null)
  const [allowanceDraft, setAllowanceDraft] = useState('')
  const [savingAllowanceId, setSavingAllowanceId] = useState<string | null>(null)
  const [allowanceError, setAllowanceError] = useState<string | null>(null)

  const requests = records.map((record) => ({
    ...record.data,
    id: record.recordId,
    createdAt: record.createdAt,
  }))
  const pendingCount = requests.filter((request) => request.status === 'pending').length
  const children = childRecords.map((record) => ({
    ...record.data,
    id: record.recordId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }))
  const totalAllowance = children.reduce((total, child) => total + Math.max(0, Number(child.monthlyAllowance) || 0), 0)
  const spendingByChild = new Map(children.map((child) => [
    child.id,
    Math.max(0, Number(child.spentThisMonth) || 0) + approvedAmountThisMonth(requests, child.id),
  ]))
  const totalSpent = [...spendingByChild.values()].reduce((total, spent) => total + spent, 0)
  const assessments = new Map<string, AiReview>([
    ...reviewRecords.map((record) => [record.data.requestId, { ...record.data, id: record.recordId }] as const),
    ...Object.entries(assessmentOverrides),
  ])

  const assessRequest = async (requestId: string) => {
    setAssessingId(requestId)
    setAssessmentError(null)
    try {
      const token = await getAuthToken()
      if (!token) throw new Error('Your parent session has expired. Sign in again and retry.')
      const response = await fetch('/api/actions/assess-purchase-request', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestId }),
      })
      const result = (await response.json()) as { success?: boolean; error?: string; data?: AiReview }
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Could not assess this request. Please try again.')
      }
      if (result.data) {
        setAssessmentOverrides((current) => ({ ...current, [requestId]: result.data! }))
      }
    } catch (cause) {
      setAssessmentError({
        requestId,
        message: cause instanceof Error ? cause.message : 'Could not assess this request. Please try again.',
      })
    } finally {
      setAssessingId(null)
    }
  }

  const decide = async (request: PurchaseRequest, decision: 'approved' | 'denied') => {
    const checkoutUrl = decision === 'approved' ? getHttpCheckoutUrl(request.checkoutUrl || request.url) : null
    // Open the tab during the click gesture so popup blockers allow it. It only
    // navigates to the store after the approval has been saved successfully.
    const checkoutWindow = checkoutUrl ? window.open('about:blank', '_blank') : null
    if (checkoutWindow) {
      checkoutWindow.opener = null
      checkoutWindow.document.title = 'Approval in progress'
      checkoutWindow.document.body.textContent = 'AskFirst is saving the approval. The checkout page will open when it is complete.'
    }

    setSavingId(request.id)
    setActionError(null)
    try {
      await putConfirmed(request.id, {
        status: decision,
        parentNote: parentNote.trim() || undefined,
        reviewedAt: new Date().toISOString(),
      })
      if (checkoutUrl) {
        if (checkoutWindow && !checkoutWindow.closed) {
          checkoutWindow.location.replace(checkoutUrl)
        } else {
          // A blocked popup still gets the parent to checkout after approval.
          window.location.assign(checkoutUrl)
        }
      }
      setActiveRequest(null)
      setParentNote('')
    } catch (cause) {
      checkoutWindow?.close()
      setActionError(cause instanceof Error ? cause.message : 'Could not save your decision. Please try again.')
    } finally {
      setSavingId(null)
    }
  }

  const resetChildForm = () => {
    setChildName('')
    setChildAge('')
    setChildAvatar(childAvatars[0])
    setChildPin('')
    setChildAllowance('25')
    setChildFormError(null)
  }

  const addChild = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const age = Number(childAge)
    const allowance = Number(childAllowance)
    if (!userId) {
      setChildFormError('Your parent account is not ready. Please sign in again.')
      return
    }
    if (!Number.isInteger(age) || age < 1 || age > 17) {
      setChildFormError('Enter an age between 1 and 17.')
      return
    }
    if (!Number.isFinite(allowance) || allowance < 0) {
      setChildFormError('Enter an allowance of $0 or more.')
      return
    }
    if (!/^\d{4,6}$/.test(childPin)) {
      setChildFormError('PIN must contain 4 to 6 digits.')
      return
    }

    setIsAddingChild(true)
    setChildFormError(null)
    try {
      await createChildConfirmed({
        name: childName.trim(),
        age,
        avatar: childAvatar,
        monthlyAllowance: allowance,
        spentThisMonth: 0,
        pinCode: childPin,
        parentUserId: userId,
      })
      resetChildForm()
      setIsAddChildOpen(false)
    } catch (cause) {
      setChildFormError(cause instanceof Error ? cause.message : 'Could not add this child profile. Please try again.')
    } finally {
      setIsAddingChild(false)
    }
  }

  const saveAllowance = async (child: Child) => {
    const allowance = Number(allowanceDraft)
    if (!Number.isFinite(allowance) || allowance < 0) {
      setAllowanceError('Enter an allowance of $0 or more.')
      return
    }
    setSavingAllowanceId(child.id)
    setAllowanceError(null)
    try {
      await updateChildConfirmed(child.id, { monthlyAllowance: allowance })
      setEditingAllowanceId(null)
    } catch (cause) {
      setAllowanceError(cause instanceof Error ? cause.message : 'Could not update the allowance. Please try again.')
    } finally {
      setSavingAllowanceId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
      <header className="flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Parent space</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Purchase requests</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Take a look together. You make the final call on every purchase.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
            <Clock3 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xl font-semibold tabular-nums">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">waiting for review</p>
          </div>
        </div>
      </header>

      <section aria-labelledby="family-heading" className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Household</p>
            <h2 id="family-heading" className="mt-1 text-xl font-semibold">Children & allowances</h2>
          </div>
          <Button onClick={() => { resetChildForm(); setIsAddChildOpen(true) }}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Add child profile
          </Button>
        </div>

        {childrenStatus === 'loading' && (
          <div className="mt-4 flex items-center justify-center gap-3 rounded-2xl border border-border bg-card px-5 py-10 text-sm text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading child profiles…
          </div>
        )}
        {childrenStatus === 'error' && (
          <div role="alert" className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
            Could not load child profiles{childrenError ? `: ${childrenError}` : '.'}
          </div>
        )}
        {childrenStatus === 'ready' && children.length > 0 && (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">Family monthly budget</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">${totalAllowance.toFixed(2)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">Allowance used (spent + approved)</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">${totalSpent.toFixed(2)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">Child profiles</p>
                <p className="mt-1 flex items-center gap-2 text-2xl font-semibold tabular-nums"><Users className="h-5 w-5 text-primary" aria-hidden="true" />{children.length}</p>
              </div>
            </div>
            {allowanceError && <p role="alert" className="mt-3 text-sm text-destructive">{allowanceError}</p>}
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {children.map((child) => {
                const isEditing = editingAllowanceId === child.id
                const isSaving = savingAllowanceId === child.id
                return (
                  <article key={child.id} className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-2xl" aria-hidden="true">{child.avatar || '🚀'}</span>
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold">{child.name}</h3>
                          <p className="text-sm text-muted-foreground">Age {child.age}</p>
                        </div>
                      </div>
                      {!isEditing && (
                        <Button variant="outline" size="sm" onClick={() => { setEditingAllowanceId(child.id); setAllowanceDraft(String(child.monthlyAllowance)); setAllowanceError(null) }}>
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit budget
                        </Button>
                      )}
                    </div>
                    <div className="mt-5 border-t border-border pt-4">
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Monthly allowance</p>
                          {isEditing ? (
                            <label className="mt-1 flex items-center gap-2">
                              <span className="text-sm">$</span>
                              <Input autoFocus type="number" min="0" step="0.01" aria-label={`${child.name} monthly allowance`} className="h-9 w-36" value={allowanceDraft} onChange={(event) => setAllowanceDraft(event.target.value)} />
                            </label>
                          ) : (
                            <p className="mt-1 text-lg font-semibold tabular-nums">${Number(child.monthlyAllowance).toFixed(2)}</p>
                          )}
                        </div>
                        <p className="text-sm tabular-nums text-muted-foreground">${(spendingByChild.get(child.id) ?? 0).toFixed(2)} used</p>
                      </div>
                      {isEditing && (
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" disabled={!childrenReady || isSaving} loading={isSaving} onClick={() => void saveAllowance(child)}><Save className="h-3.5 w-3.5" aria-hidden="true" /> Save budget</Button>
                          <Button size="sm" variant="ghost" disabled={isSaving} onClick={() => { setEditingAllowanceId(null); setAllowanceError(null) }}>Cancel</Button>
                        </div>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}
        {childrenStatus === 'ready' && children.length === 0 && (
          <div className="mt-4 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center">
            <p className="font-medium">No saved child profiles yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Add a profile to set a PIN and monthly allowance for a child.</p>
          </div>
        )}
      </section>

      <Modal open={isAddChildOpen} onClose={() => { if (!isAddingChild) setIsAddChildOpen(false) }} aria-label="Add child profile">
        <div className="p-6 text-foreground">
          <h2 className="text-xl font-bold">Add a child profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">Set up the profile, sign-in PIN, and monthly allowance.</p>
          <form onSubmit={(event) => void addChild(event)} className="mt-5 flex flex-col gap-4">
            <div>
              <label htmlFor="child-name" className="text-sm font-medium">Child’s name</label>
              <Input id="child-name" required maxLength={60} className="mt-1.5" placeholder="Name" value={childName} onChange={(event) => setChildName(event.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="child-age" className="text-sm font-medium">Age</label>
                <Input id="child-age" type="number" min="1" max="17" step="1" required className="mt-1.5" value={childAge} onChange={(event) => setChildAge(event.target.value)} />
              </div>
              <div>
                <label htmlFor="child-pin" className="text-sm font-medium">Sign-in PIN</label>
                <Input id="child-pin" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{4,6}" minLength={4} maxLength={6} required className="mt-1.5" placeholder="4–6 digits" value={childPin} onChange={(event) => setChildPin(event.target.value.replace(/\D/g, '').slice(0, 6))} />
              </div>
            </div>
            <fieldset>
              <legend className="text-sm font-medium">Choose an avatar</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {childAvatars.map((avatar) => (
                  <button key={avatar} type="button" aria-label={`Use ${avatar} avatar`} aria-pressed={childAvatar === avatar} onClick={() => setChildAvatar(avatar)} className={`flex h-10 w-10 items-center justify-center rounded-xl border text-xl ${childAvatar === avatar ? 'border-primary bg-primary/10' : 'border-border bg-background'}`}>
                    {avatar}
                  </button>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor="child-allowance" className="text-sm font-medium">Monthly allowance</label>
              <div className="mt-1.5 flex items-center gap-2"><span aria-hidden="true">$</span><Input id="child-allowance" type="number" min="0" step="0.01" required className="max-w-48" value={childAllowance} onChange={(event) => setChildAllowance(event.target.value)} /></div>
            </div>
            {childFormError && <p role="alert" className="text-sm text-destructive">{childFormError}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" disabled={isAddingChild} onClick={() => setIsAddChildOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!childrenReady || isAddingChild} loading={isAddingChild}>Create profile</Button>
            </div>
          </form>
        </div>
      </Modal>

      <section aria-label="Purchase request list" className="mt-8">
        {status === 'loading' && (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-border bg-card px-5 py-16 text-sm text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading family requests…
          </div>
        )}

        {status === 'error' && (
          <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
            Could not load requests{error ? `: ${error}` : '.'}
          </div>
        )}

        {status === 'ready' && requests.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-base font-semibold">You’re all caught up</h2>
            <p className="mt-1 text-sm text-muted-foreground">New requests from your kids will show up here in real time.</p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {requests.map((request) => {
            const isPending = request.status === 'pending'
            const isOpen = activeRequest === request.id
            const isSaving = savingId === request.id

            return (
              <article key={request.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">{request.childName} is asking for</p>
                    <h2 className="mt-1 break-words text-lg font-semibold">{request.title}</h2>
                  </div>
                  <Badge variant={statusVariant[request.status]}>{statusLabels[request.status]}</Badge>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <span className="font-semibold">${Number(request.price).toFixed(2)}</span>
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs capitalize text-secondary-foreground">{request.category}</span>
                  {request.url && (
                    <a href={request.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                      View item <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  )}
                </div>

                {request.reason && <p className="mt-4 rounded-xl bg-background/70 px-4 py-3 text-sm leading-6 text-muted-foreground">“{request.reason}”</p>}

                <AiAssessmentPanel
                  review={assessments.get(request.id)}
                  reviewsStatus={reviewsStatus}
                  reviewsError={reviewsError}
                  isAssessing={assessingId === request.id}
                  isBusy={assessingId !== null}
                  error={assessmentError?.requestId === request.id ? assessmentError.message : null}
                  canAssess={isPending}
                  onAssess={() => void assessRequest(request.id)}
                />

                {request.parentNote && (
                  <p className="mt-3 border-l-2 border-primary/50 pl-3 text-sm text-muted-foreground">
                    Your note: {request.parentNote}
                  </p>
                )}

                {request.status === 'approved' && (request.checkoutUrl || request.url) && (
                  <a href={request.checkoutUrl || request.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                    Continue to checkout <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                )}

                {isPending && !isOpen && (
                  <Button className="mt-5" onClick={() => { setActiveRequest(request.id); setParentNote('') }}>
                    Review request
                  </Button>
                )}

                {isPending && isOpen && (
                  <div className="mt-5 border-t border-border pt-4">
                    <label htmlFor={`parent-note-${request.id}`} className="text-sm font-medium">Add a note for {request.childName} <span className="font-normal text-muted-foreground">(optional)</span></label>
                    <Textarea
                      id={`parent-note-${request.id}`}
                      className="mt-2 min-h-20"
                      placeholder="Share your decision or talk about it together…"
                      value={parentNote}
                      onChange={(event) => setParentNote(event.target.value)}
                      maxLength={500}
                    />
                    {actionError && <p role="alert" className="mt-2 text-sm text-destructive">{actionError}</p>}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button disabled={!ready || isSaving} onClick={() => void decide(request, 'approved')}>
                        {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Approve
                      </Button>
                      <Button variant="destructive" disabled={!ready || isSaving} onClick={() => void decide(request, 'denied')}>
                        <X className="h-4 w-4" /> Deny
                      </Button>
                      <Button variant="ghost" disabled={isSaving} onClick={() => { setActiveRequest(null); setActionError(null) }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function getHttpCheckoutUrl(value: string | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

function AiAssessmentPanel({
  review,
  reviewsStatus,
  reviewsError,
  isAssessing,
  isBusy,
  error,
  canAssess,
  onAssess,
}: {
  review: AiReview | undefined
  reviewsStatus: string
  reviewsError?: string
  isAssessing: boolean
  isBusy: boolean
  error: string | null
  canAssess: boolean
  onAssess: () => void
}) {
  const hasWebAssessment = review?.status === 'completed' && Boolean(review.researchNote)
  const sources = parseReviewSources(review?.sourceLinksJson)

  return (
    <section aria-label="AI safety assessment" className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" /> AI safety assessment
        </h3>
        {hasWebAssessment && review && (
          <Badge variant={severityVariants[review.severity]}>{severityLabels[review.severity]}</Badge>
        )}
      </div>

      {hasWebAssessment && review ? (
        <div className="mt-3 space-y-3 text-sm">
          <p className="font-medium leading-6">{review.oneLineVerdict}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rating guidance</p>
              <p className="mt-1">{review.ageRating || 'Unknown — not verified'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Age suitability</p>
              <p className="mt-1 leading-5">{review.ageSuitabilitySummary || 'No age-suitability details were returned.'}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Possible hidden costs</p>
              <p className="mt-1 leading-5">{review.hiddenCostsWarning || 'Could not determine from the request.'}</p>
            </div>
          </div>
          {review.suggestedAlternative && <p className="text-muted-foreground"><span className="font-medium text-foreground">Alternative:</span> {review.suggestedAlternative}</p>}
          <div className="border-t border-border/70 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Web research</p>
            <p className="mt-1 leading-5">{review.researchNote}</p>
            {sources.length > 0 && (
              <ul className="mt-2 space-y-1">
                {sources.map((source, index) => (
                  <li key={`${source.url}-${index}`}>
                    <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                      [{index + 1}] {source.title || source.url}
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Confidence: {review.confidence || 'low'}. AI guidance only; confirm ratings and costs on the source pages before deciding.
          </p>
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-sm leading-5 text-muted-foreground">
            {review?.status === 'completed'
              ? 'The saved assessment has no web research. Run it again to look up the item and show its sources.'
              : reviewsStatus === 'loading'
              ? 'Loading assessment…'
              : reviewsStatus === 'error'
                ? `Could not load saved assessments${reviewsError ? `: ${reviewsError}` : '.'}`
                : 'No assessment yet. Ask AI to research the item and prepare a cautious, age-aware summary. This uses DeepSpace credits; you make the final decision.'}
          </p>
          {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
          {canAssess && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              disabled={isBusy}
              loading={isAssessing}
              onClick={onAssess}
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {isAssessing ? 'Researching and assessing…' : review?.status === 'failed' ? 'Retry assessment' : review?.status === 'completed' ? 'Run web-backed assessment' : 'Research with AI'}
            </Button>
          )}
        </div>
      )}
    </section>
  )
}

function parseReviewSources(value: string | undefined): Array<{ title: string; url: string }> {
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item) => {
      if (!item || typeof item !== 'object') return []
      const source = item as { title?: unknown; url?: unknown }
      if (typeof source.url !== 'string') return []
      try {
        const url = new URL(source.url)
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return []
        return [{ title: typeof source.title === 'string' ? source.title : '', url: url.href }]
      } catch {
        return []
      }
    })
  } catch {
    return []
  }
}
