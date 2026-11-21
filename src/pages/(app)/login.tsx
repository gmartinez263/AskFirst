import { useState, useMemo } from 'react'
import { Fingerprint, Shield, Sparkles, Smartphone } from 'lucide-react'
import { useQuery } from 'deepspace'
import type { Child } from '@/types/askfirst'
import { BiometricLoginModal } from '@/components/BiometricLoginModal'
import { Button } from '@/components/ui/Button'
import {Link} from "react-router-dom";

// Fallback demo children if database has not been seeded yet
const DEMO_CHILDREN: Child[] = [
  {
    id: 'child_leo',
    name: 'Leo',
    age: 10,
    avatar: '🚀',
    monthlyAllowance: 25.0,
    spentThisMonth: 14.5,
    pinCode: '1234',
    parentUserId: 'parent_demo_user',
  },
  {
    id: 'child_maya',
    name: 'Maya',
    age: 13,
    avatar: '🎨',
    monthlyAllowance: 40.0,
    spentThisMonth: 28.0,
    pinCode: '5678',
    parentUserId: 'parent_demo_user',
  },
]

export default function LoginPage() {
  const [isBiometricOpen, setIsBiometricOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  // Query household children from DeepSpace
  const { records: liveChildren = [] } = useQuery<Child>('children')

  // Unwrap RecordData container
  const unwrappedChildren: Child[] = useMemo(() => {
    return (liveChildren || []).map((r) => ({
      ...r.data,
      id: r.recordId || r.data.id,
      createdAt: r.createdAt || r.data.createdAt,
      updatedAt: r.updatedAt || r.data.updatedAt,
    }))
  }, [liveChildren])

  const childrenList: Child[] = useMemo(() => {
    if (unwrappedChildren && unwrappedChildren.length > 0) return unwrappedChildren
    return DEMO_CHILDREN
  }, [unwrappedChildren])

  // Option 2: Device lock check (persisted by parent in localStorage)
  const boundChildId = typeof window !== 'undefined' ? localStorage.getItem('askfirst_bound_child_id') : null
  const boundChild = useMemo(
    () => (boundChildId ? childrenList.find((c) => c.id === boundChildId) ?? null : null),
    [boundChildId, childrenList],
  )

  const handleSelectChild = (child: Child) => {
    setSelectedUser(`Child: ${child.name}`)
    // Destination navigation hook (e.g. navigate('/portal')) will connect here
  }

  const handleSelectParent = () => {
    setSelectedUser('Parent / Guardian')
    // Destination navigation hook (e.g. navigate('/parent')) will connect here
  }

  return (
    <div className="flex min-h-[calc(100vh-3rem)] flex-col px-4 py-6 text-foreground">
      {/* Top-left AskFirst branding */}
      <div className="flex items-center gap-2 mb-auto">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-sm">
          ?
        </span>
        <Link
          to="/"
          className="text-base font-bold tracking-tight"
        > 
          AskFirst
        </Link>
      </div>

      <div className="mx-auto flex max-w-xl flex-col items-center text-center mb-auto">
        {/* Device Binding Status Pill (if bound by parent) */}
        {boundChild && (
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1 text-xs text-primary shadow-xs">
            <Smartphone className="h-3.5 w-3.5" />
            <span>
              Bound to <strong>{boundChild.name}&apos;s Device</strong>
            </span>
          </div>
        )}

        {/* Brand Header */}
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground mb-4">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>AskFirst • Biometric Access</span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Welcome to AskFirst
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Safe shopping for kids. Peace of mind for parents. Tap the sensor below to verify your identity.
        </p>

        {/* Large Tactile Biometric Fingerprint Button */}
        <div className="mt-10 flex flex-col items-center">
          <button
            type="button"
            onClick={() => setIsBiometricOpen(true)}
            aria-label="Scan Fingerprint to Sign In"
            className="group relative flex h-32 w-32 items-center justify-center rounded-3xl border-2 border-primary/40 bg-card p-6 shadow-xl shadow-primary/10 transition-all duration-300 hover:scale-105 hover:border-primary hover:shadow-primary/25 active:scale-95 focus:outline-hidden"
          >
            {/* Pulsing ring aura */}
            <div className="absolute inset-0 rounded-3xl bg-primary/10 opacity-0 blur-md transition-opacity group-hover:opacity-100" />

            <Fingerprint className="h-16 w-16 text-primary transition-transform duration-300 group-hover:scale-110" />

            {/* Touch hint indicator */}
            <span className="absolute -bottom-3 rounded-full border border-primary/30 bg-background px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary shadow-xs">
              Tap Sensor
            </span>
          </button>

          <span className="mt-6 text-sm font-semibold text-foreground">
            {boundChild ? `Touch to sign in as ${boundChild.name}` : 'Touch Fingerprint to Sign In'}
          </span>
          <p className="mt-1 text-xs text-muted-foreground">
            Simulates passkey/biometric authentication for parents and children.
          </p>
        </div>

        {/* Current status display (if signed in via biometric modal) */}
        {selectedUser && (
          <div className="mt-6 rounded-xl border border-success/40 bg-success/10 px-4 py-2 text-xs font-semibold text-success">
            Verified as {selectedUser}
          </div>
        )}

        {/* Quick Demo Shortcuts */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectParent}
            className="gap-2 text-xs"
          >
            <Shield className="h-3.5 w-3.5 text-primary" /> Sign In as Parent
          </Button>

          {childrenList.map((c) => (
            <Button
              key={c.id}
              variant="outline"
              size="sm"
              onClick={() => handleSelectChild(c)}
              className="gap-2 text-xs"
            >
              <span>{c.avatar || '🚀'}</span> Sign In as {c.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Biometric Sign-In Modal */}
      <BiometricLoginModal
        open={isBiometricOpen}
        onClose={() => setIsBiometricOpen(false)}
        childrenList={childrenList}
        onSelectChild={handleSelectChild}
        onSelectParent={handleSelectParent}
        boundChildId={boundChildId}
      />
    </div>
  )
}