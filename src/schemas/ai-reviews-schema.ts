import type { CollectionSchema } from 'deepspace/schema'

/**
 * AI Reviews Collection Schema
 *
 * Age-suitability, monetization risk, and executive summaries for purchase requests.
 *
 * RBAC Boundary:
 * - Admin (Parent): Full read & write permissions.
 * - Member (Child): ACCESS DENIED (`read: false`).
 *   Keeping AI flags strictly parent-only prevents children from learning how
 *   to game prompt phrasing to bypass content or risk filters.
 */
export const aiReviewsSchema: CollectionSchema = {
  name: 'ai_reviews',
  columns: [
    { name: 'requestId', storage: 'text', interpretation: 'plain', required: true },
    {
      name: 'status',
      storage: 'text',
      interpretation: {
        kind: 'select',
        options: ['pending', 'completed', 'failed'],
      },
      default: 'pending',
    },
    {
      name: 'severity',
      storage: 'text',
      interpretation: {
        kind: 'select',
        options: ['safe', 'caution', 'warning'],
      },
      default: 'safe',
    },
    { name: 'ageRating', storage: 'text', interpretation: 'plain' },
    { name: 'ageSuitabilitySummary', storage: 'text', interpretation: 'plain' },
    { name: 'hiddenCostsWarning', storage: 'text', interpretation: 'plain' },
    { name: 'oneLineVerdict', storage: 'text', interpretation: 'plain', required: true },
    { name: 'suggestedAlternative', storage: 'text', interpretation: 'plain' },
    {
      name: 'confidence',
      storage: 'text',
      interpretation: {
        kind: 'select',
        options: ['high', 'moderate', 'low'],
      },
      default: 'high',
    },
    { name: 'evaluatedAt', storage: 'text', interpretation: { kind: 'datetime' } },
  ],
  uniqueOn: ['requestId'],
  permissions: {
    viewer: { read: false, create: false, update: false, delete: false },
    member: { read: false, create: false, update: false, delete: false },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
