import type { CollectionSchema } from 'deepspace/schema'

/**
 * Purchase Requests Collection Schema
 *
 * Purchase requests submitted by children for parent review.
 * - Admin (Parent): Full CRUD access to review, approve, deny, add notes, and trigger checkout.
 * - Member (Child): Can create new requests and edit/delete their own pending requests.
 *   `writableFields` ensures children cannot manipulate `status`, `parentNote`, or `reviewedAt`.
 */
export const requestsSchema: CollectionSchema = {
  name: 'requests',
  columns: [
    {
      name: 'childId',
      storage: 'text',
      interpretation: 'plain',
      userBound: true,
      immutable: true,
      required: true,
    },
    { name: 'childName', storage: 'text', interpretation: 'plain', required: true },
    { name: 'title', storage: 'text', interpretation: 'plain', required: true },
    { name: 'url', storage: 'text', interpretation: { kind: 'url' }, required: true },
    {
      name: 'price',
      storage: 'number',
      interpretation: { kind: 'currency', symbol: '$', decimals: 2 },
      required: true,
    },
    { name: 'reason', storage: 'text', interpretation: 'plain' },
    {
      name: 'category',
      storage: 'text',
      interpretation: {
        kind: 'select',
        options: ['game', 'toy', 'subscription', 'app', 'clothing', 'book', 'electronics', 'other'],
      },
      default: 'game',
    },
    {
      name: 'status',
      storage: 'text',
      interpretation: {
        kind: 'select',
        options: ['pending', 'approved', 'denied'],
      },
      default: 'pending',
    },
    { name: 'parentNote', storage: 'text', interpretation: 'plain' },
    { name: 'reviewedAt', storage: 'text', interpretation: { kind: 'datetime' } },
    { name: 'checkoutUrl', storage: 'text', interpretation: { kind: 'url' } },
  ],
  ownerField: 'childId',
  permissions: {
    viewer: { read: false, create: false, update: false, delete: false },
    member: {
      read: 'own',
      create: true,
      update: 'own',
      delete: 'own',
      writableFields: ['childId', 'childName', 'title', 'url', 'price', 'reason', 'category'],
    },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
