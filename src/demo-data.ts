import type { Child } from '@/types/askfirst'

/** Sample family profiles shown when the parent has not added profiles yet. */
export const DEMO_CHILDREN: Child[] = [
  {
    id: 'child_leo',
    name: 'Leo',
    age: 10,
    avatar: '🚀',
    monthlyAllowance: 25,
    spentThisMonth: 0,
    pinCode: '1234',
    parentUserId: 'parent_demo_user',
  },
  {
    id: 'child_maya',
    name: 'Maya',
    age: 13,
    avatar: '🎨',
    monthlyAllowance: 40,
    spentThisMonth: 0,
    pinCode: '5678',
    parentUserId: 'parent_demo_user',
  },
]
