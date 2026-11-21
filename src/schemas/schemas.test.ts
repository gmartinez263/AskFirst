import { describe, expect, it } from 'vitest'
import {
  canCreate,
  canDelete,
  canRead,
  canUpdate,
  checkFieldPermissions,
} from 'deepspace/worker'
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

    it('enforces anti-spoofing on childId via userBound and immutable flags', () => {
      const childIdCol = requestsSchema.columns.find((c) => c.name === 'childId')
      expect(childIdCol).toBeDefined()
      expect(childIdCol?.userBound).toBe(true)
      expect(childIdCol?.immutable).toBe(true)
    })

    it('actively rejects illegal client mutation attempts at runtime (behavioral attack test)', () => {
      // Attack 1: Child attempts to self-approve a request
      const tamperStatus = checkFieldPermissions(requestsSchema, 'member', { status: 'approved' })
      expect(tamperStatus).toBe("Role 'member' cannot modify field 'status'")

      // Attack 2: Child attempts to forge parent feedback
      const tamperNote = checkFieldPermissions(requestsSchema, 'member', { parentNote: 'Approved by mom' })
      expect(tamperNote).toBe("Role 'member' cannot modify field 'parentNote'")

      // Legitimate write: Child submits title and price
      const legitimateWrite = checkFieldPermissions(requestsSchema, 'member', {
        title: 'LEGO Star Wars',
        price: 49.99,
        url: 'https://example.com/lego',
      })
      expect(legitimateWrite).toBeNull() // Permitted!

      // Parent (admin) has full rights to approve and attach notes
      const parentApproval = checkFieldPermissions(requestsSchema, 'admin', {
        status: 'approved',
        parentNote: 'Great job this week!',
      })
      expect(parentApproval).toBeNull() // Permitted!
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

  describe('Parent (Admin) Guardian Authority & Child Boundaries', () => {
    it('allows parent to manage child allowances, but blocks children from giving themselves a raise', () => {
      // Parent can update a child's allowance:
      const parentUpdate = checkFieldPermissions(childrenSchema, 'admin', { monthlyAllowance: 50.0 })
      expect(parentUpdate).toBeNull() // Permitted!

      // Child attempts to give themselves a raise:
      const childTamper = checkFieldPermissions(childrenSchema, 'member', { monthlyAllowance: 500.0 })
      expect(childTamper).toBe("Role 'member' cannot modify field 'monthlyAllowance'") // Blocked!
    })

    it('allows parent full control over request outcomes and checkout links', () => {
      const parentDenial = checkFieldPermissions(requestsSchema, 'admin', {
        status: 'denied',
        parentNote: 'Not appropriate for your age. Save for next year.',
        checkoutUrl: 'https://amazon.com/checkout/...',
      })
      expect(parentDenial).toBeNull() // Permitted!
    })

    it('allows parent full access to the internal AI safety reviews collection', () => {
      const parentAiWrite = checkFieldPermissions(aiReviewsSchema, 'admin', {
        severity: 'warning',
        oneLineVerdict: 'Flagged: Mature 17+ content and microtransactions',
      })
      expect(parentAiWrite).toBeNull() // Permitted!
    })
  })

  describe('Sibling Boundary Isolation: Child A full CRUD attack on Child B', () => {
    const childARequest = {
      data: { childId: 'child_leo', title: 'Leo Book', price: 15.0 },
      createdBy: 'child_leo',
    }

    const childBRequest = {
      data: { childId: 'child_maya', title: 'Maya Watercolor Set', price: 24.99 },
      createdBy: 'child_maya',
    }

    const childBProfile = {
      data: { parentUserId: 'parent_1', name: 'Maya', monthlyAllowance: 30.0 },
      createdBy: 'parent_1',
    }

    // DeepSpace server-side mutation pipeline simulator
    function executeServerMutation(
      schema: (typeof schemas)[number],
      role: string,
      userId: string,
      action: 'create' | 'update' | 'delete',
      data: Record<string, unknown> = {},
      existingRecord?: { data: Record<string, unknown>; createdBy: string },
    ) {
      if (action === 'update' && (!existingRecord || !canUpdate(schema, role, existingRecord, userId))) {
        return { success: false, error: `UPDATE DENIED: role=${role}, collection=${schema.name}` }
      }
      if (action === 'delete' && (!existingRecord || !canDelete(schema, role, existingRecord, userId))) {
        return { success: false, error: `DELETE DENIED: role=${role}, collection=${schema.name}` }
      }
      if (action === 'create' && !canCreate(schema, role)) {
        return { success: false, error: `CREATE DENIED: role=${role}, collection=${schema.name}` }
      }
      const fieldError = checkFieldPermissions(
        schema,
        role,
        data,
        action === 'update' ? existingRecord?.data : undefined,
      )
      if (fieldError) {
        return { success: false, error: `FIELD ERROR: ${fieldError}` }
      }
      return { success: true }
    }

    it('actively blocks and rejects actual mutation attempts by Child A against Child B', () => {
      const childAUserId = 'child_leo'
      const childBUserId = 'child_maya'

      // 1. CREATE Attack: Child A tries to execute a profile creation
      const createAttack = executeServerMutation(childrenSchema, 'member', childAUserId, 'create', {
        name: 'Spoofed Child',
        monthlyAllowance: 100,
      })
      expect(createAttack).toEqual({
        success: false,
        error: 'CREATE DENIED: role=member, collection=children',
      })

      // 2. READ Attack: Child A attempts to read Child B's request & profile
      expect(canRead(requestsSchema, 'member', childBRequest, childAUserId)).toBe(false)
      expect(canRead(childrenSchema, 'member', childBProfile, childAUserId)).toBe(false)

      // 3. UPDATE Attack: Child A actually attempts to modify Child B's request price & title
      const updateAttack = executeServerMutation(
        requestsSchema,
        'member',
        childAUserId,
        'update',
        { price: 99.99, title: 'Hacked Price' },
        childBRequest,
      )
      expect(updateAttack).toEqual({
        success: false,
        error: 'UPDATE DENIED: role=member, collection=requests',
      })

      // 4. DELETE Attack: Child A actually attempts to delete Child B's request
      const deleteAttack = executeServerMutation(
        requestsSchema,
        'member',
        childAUserId,
        'delete',
        {},
        childBRequest,
      )
      expect(deleteAttack).toEqual({
        success: false,
        error: 'DELETE DENIED: role=member, collection=requests',
      })

      // 5. Legitimate Child Self-Action: Child B updates her own request title
      const validChildBUpdate = executeServerMutation(
        requestsSchema,
        'member',
        childBUserId,
        'update',
        { title: 'Maya Premium Watercolor Set' },
        childBRequest,
      )
      expect(validChildBUpdate).toEqual({ success: true })

      // 6. Child A self-tamper: Child A tries to self-approve their own request
      const selfApproveAttack = executeServerMutation(
        requestsSchema,
        'member',
        childAUserId,
        'update',
        { status: 'approved' },
        childARequest,
      )
      expect(selfApproveAttack).toEqual({
        success: false,
        error: "FIELD ERROR: Role 'member' cannot modify field 'status'",
      })
    })
  })

  describe('AI Review Tamper Resistance: Child full CRUD attack on AI evaluations', () => {
    const flaggedAiReview = {
      data: {
        requestId: 'req_gta',
        severity: 'warning',
        ageRating: 'ESRB Mature 17+',
        hiddenCostsWarning: 'Contains $9.99/mo battle pass and microtransactions',
        oneLineVerdict: 'Flagged: Extreme violence and recurring billing',
      },
      createdBy: 'system',
    }

    // Helper for AI review transaction attempts
    function executeAiMutation(
      role: string,
      userId: string,
      action: 'create' | 'update' | 'delete',
      data: Record<string, unknown> = {},
      existingRecord?: { data: Record<string, unknown>; createdBy: string },
    ) {
      if (action === 'update' && (!existingRecord || !canUpdate(aiReviewsSchema, role, existingRecord, userId))) {
        return { success: false, error: `UPDATE DENIED: role=${role}, collection=ai_reviews` }
      }
      if (action === 'delete' && (!existingRecord || !canDelete(aiReviewsSchema, role, existingRecord, userId))) {
        return { success: false, error: `DELETE DENIED: role=${role}, collection=ai_reviews` }
      }
      if (action === 'create' && !canCreate(aiReviewsSchema, role)) {
        return { success: false, error: `CREATE DENIED: role=${role}, collection=ai_reviews` }
      }
      return { success: true }
    }

    it('actively rejects actual mutation attempts by a child against AI reviews', () => {
      const childUserId = 'child_leo'
      const parentUserId = 'parent_user'

      // 1. CREATE Attack: Child attempts to forge a fake "safe" AI review
      const createAttempt = executeAiMutation('member', childUserId, 'create', {
        severity: 'safe',
        oneLineVerdict: 'Fake verdict: All safe!',
      })
      expect(createAttempt).toEqual({
        success: false,
        error: 'CREATE DENIED: role=member, collection=ai_reviews',
      })

      // 2. READ Attack: Child attempts to inspect internal AI flags
      expect(canRead(aiReviewsSchema, 'member', flaggedAiReview, childUserId)).toBe(false)

      // 3. UPDATE Attack: Child attempts to downgrade severity from 'warning' to 'safe'
      const updateAttempt = executeAiMutation('member', childUserId, 'update', { severity: 'safe' }, flaggedAiReview)
      expect(updateAttempt).toEqual({
        success: false,
        error: 'UPDATE DENIED: role=member, collection=ai_reviews',
      })

      // 4. DELETE Attack: Child attempts to delete the negative AI review to hide warnings from parent
      const deleteAttempt = executeAiMutation('member', childUserId, 'delete', {}, flaggedAiReview)
      expect(deleteAttempt).toEqual({
        success: false,
        error: 'DELETE DENIED: role=member, collection=ai_reviews',
      })

      // 5. Parent (Admin) Full Authority: Parent actions succeed with { success: true }
      expect(executeAiMutation('admin', parentUserId, 'create', { severity: 'safe' })).toEqual({ success: true })
      expect(canRead(aiReviewsSchema, 'admin', flaggedAiReview, parentUserId)).toBe(true)
      expect(executeAiMutation('admin', parentUserId, 'update', { severity: 'caution' }, flaggedAiReview)).toEqual({ success: true })
      expect(executeAiMutation('admin', parentUserId, 'delete', {}, flaggedAiReview)).toEqual({ success: true })
    })
  })
})
