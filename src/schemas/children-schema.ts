import type { CollectionSchema } from 'deepspace/schema'

/**
 * Children Collection Schema
 *
 * Child profiles belonging to a parent's household/account.
 * - Admin (Parent): Full CRUD access to create profiles, set monthly allowance, and track spending.
 * - Member (Child): Scoped read of own profile, with permission to update cosmetic fields (avatar, pin).
 */
export const childrenSchema: CollectionSchema = {
  name: 'children',
  columns: [
    { name: 'name', storage: 'text', interpretation: 'plain', required: true },
    { name: 'age', storage: 'number', interpretation: 'plain', required: true },
    { name: 'avatar', storage: 'text', interpretation: 'plain', default: '🚀' },
    {
      name: 'monthlyAllowance',
      storage: 'number',
      interpretation: { kind: 'currency', symbol: '$', decimals: 2 },
      required: true,
      default: 25.0,
    },
    {
      name: 'spentThisMonth',
      storage: 'number',
      interpretation: { kind: 'currency', symbol: '$', decimals: 2 },
      default: 0,
    },
    { name: 'pinCode', storage: 'text', interpretation: 'plain', maxLength: 6 },
    { name: 'parentUserId', storage: 'text', interpretation: 'plain', required: true },
  ],
  ownerField: 'parentUserId',
  permissions: {
    viewer: { read: false, create: false, update: false, delete: false },
    member: {
      read: 'own',
      create: false,
      update: 'own',
      delete: false,
      writableFields: ['avatar', 'pinCode'],
    },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
