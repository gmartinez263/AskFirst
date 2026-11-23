/**
 * Type definitions for AskFirst domain entities.
 */

export interface Child {
  id: string
  name: string
  age: number
  avatar: string
  monthlyAllowance: number
  spentThisMonth: number
  pinCode?: string
  parentUserId: string
  createdAt?: string
  updatedAt?: string
}

export type RequestCategory =
  | 'game'
  | 'toy'
  | 'subscription'
  | 'app'
  | 'clothing'
  | 'book'
  | 'electronics'
  | 'other'

export type RequestStatus = 'pending' | 'approved' | 'denied'

export interface PurchaseRequest {
  id: string
  /** Authenticated account ID (parent for this single-family prototype). */
  childId: string
  /** Profile selected by the child PIN. Optional for older request rows. */
  childProfileId?: string
  childName: string
  title: string
  url: string
  price: number
  reason?: string
  category: RequestCategory
  status: RequestStatus
  parentNote?: string
  reviewedAt?: string
  checkoutUrl?: string
  createdAt?: string
  updatedAt?: string
}

export type ReviewSeverity = 'safe' | 'caution' | 'warning'
export type ReviewStatus = 'pending' | 'completed' | 'failed'

export interface AiReview {
  id: string
  requestId: string
  status: ReviewStatus
  severity: ReviewSeverity
  ageRating?: string
  ageSuitabilitySummary?: string
  hiddenCostsWarning?: string
  oneLineVerdict: string
  suggestedAlternative?: string
  /** What the web lookup found, or why it could not verify the product page. */
  researchNote?: string
  /** JSON-encoded array of title/URL citations returned by Exa. */
  sourceLinksJson?: string
  confidence?: 'high' | 'moderate' | 'low'
  evaluatedAt?: string
  createdAt?: string
  updatedAt?: string
}
