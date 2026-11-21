import { describe, expect, it } from 'vitest'
import { schemas } from '../schemas'
import { childrenSchema } from './children-schema'
import { requestsSchema } from './requests-schema'
import { aiReviewsSchema } from './ai-reviews-schema'

describe('AskFirst Collection Schemas & RBAC Security Boundaries', () => {
  it('registers all required collections in the global schema list', () => {
    const names = schemas.map((s) => s.name)
    expect(names).toContain('users')
    expect(names).toContain('settings')
    expect(names).toContain('children')
    expect(names).toContain('requests')
    expect(names).toContain('ai_reviews')
  })

  describe('Children Collection RBAC', () => {
    it('allows admin full permissions and restricts member writes to cosmetic fields', () => {
      const perms = childrenSchema.permissions
      expect(perms.admin).toEqual({ read: true, create: true, update: true, delete: true })
      expect(perms.member.read).toBe('own')
      expect(perms.member.create).toBe(false)
      expect(perms.member.delete).toBe(false)
      expect(perms.member.writableFields).toEqual(['avatar', 'pinCode'])
    })
  })

  describe('Requests Collection RBAC', () => {
    it('allows children (member) to create requests but blocks status and review tampering', () => {
      const perms = requestsSchema.permissions
      expect(perms.admin).toEqual({ read: true, create: true, update: true, delete: true })
      expect(perms.member.read).toBe('own')
      expect(perms.member.create).toBe(true)

      // Crucial security boundary: children cannot alter approval status or parent notes
      expect(perms.member.writableFields).toBeDefined()
      expect(perms.member.writableFields).not.toContain('status')
      expect(perms.member.writableFields).not.toContain('parentNote')
      expect(perms.member.writableFields).not.toContain('reviewedAt')
      expect(perms.member.writableFields).toContain('title')
      expect(perms.member.writableFields).toContain('url')
      expect(perms.member.writableFields).toContain('price')
    })
  })

  describe('AI Reviews Collection RBAC', () => {
    it('strictly denies child (member) read and write access to AI assessment flags', () => {
      const perms = aiReviewsSchema.permissions
      expect(perms.admin).toEqual({ read: true, create: true, update: true, delete: true })

      // Child cannot view AI flags or tamper with them
      expect(perms.member.read).toBe(false)
      expect(perms.member.create).toBe(false)
      expect(perms.member.update).toBe(false)
      expect(perms.member.delete).toBe(false)
    })

    it('enforces unique assessment per request via uniqueOn', () => {
      expect(aiReviewsSchema.uniqueOn).toEqual(['requestId'])
    })
  })
})
