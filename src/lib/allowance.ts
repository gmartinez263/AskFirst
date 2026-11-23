import type { PurchaseRequest } from '@/types/askfirst'

/** Money approved for this child since the start of the current local month. */
export function approvedAmountThisMonth(
  requests: readonly PurchaseRequest[],
  childProfileId: string,
  now = new Date(),
): number {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime()
  const approvedCents = requests.reduce((total, request) => {
    if (request.childProfileId !== childProfileId || request.status !== 'approved' || !request.reviewedAt) return total
    const reviewedAt = Date.parse(request.reviewedAt)
    const price = Number(request.price)
    if (!Number.isFinite(reviewedAt) || reviewedAt < monthStart || reviewedAt >= nextMonth || !Number.isFinite(price) || price <= 0) {
      return total
    }
    return total + Math.round(price * 100)
  }, 0)
  return approvedCents / 100
}
