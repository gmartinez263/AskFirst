import { useState } from 'react'
import { Fingerprint, Shield, User, ArrowLeft, Delete } from 'lucide-react'
import type { Child } from '@/types/askfirst'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'

interface BiometricLoginModalProps {
  open: boolean
  onClose: () => void
  childrenList: Child[]
  onSelectChild: (child: Child) => void
  onSelectParent: () => void
  boundChildId?: string | null
}

export function BiometricLoginModal({
  open,
  onClose,
  childrenList,
  onSelectChild,
  onSelectParent,
  boundChildId,
}: BiometricLoginModalProps) {
  // Steps: 'role_select' | 'child_picker' | 'child_pin' | 'parent_auth'
  const [step, setStep] = useState<'role_select' | 'child_picker' | 'child_pin' | 'parent_auth'>(
    boundChildId ? 'child_pin' : 'role_select',
  )
  const [selectedChild, setSelectedChild] = useState<Child | null>(
    boundChildId ? childrenList.find((c) => c.id === boundChildId) ?? null : null,
  )
  const [pin, setPin] = useState<string>('')
  const [pinError, setPinError] = useState<string | null>(null)

  // Reset state on close
  const handleClose = () => {
    setPin('')
    setPinError(null)
    setStep(boundChildId ? 'child_pin' : 'role_select')
    onClose()
  }

  // Handle number click on PIN pad
  const handlePinInput = (num: string) => {
    if (pin.length >= 4) return
    const nextPin = pin + num
    setPin(nextPin)
    setPinError(null)

    // Auto-verify when 4 digits are entered
    if (nextPin.length === 4 && selectedChild) {
      const expectedPin = selectedChild.pinCode || '1234'
      if (nextPin === expectedPin) {
        onSelectChild(selectedChild)
        handleClose()
      } else {
        setPinError('Incorrect PIN. (Default demo PIN is 1234)')
        setTimeout(() => setPin(''), 600)
      }
    }
  }

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1))
    setPinError(null)
  }

  return (
    <Modal open={open} onClose={handleClose} size="md">
      <div className="p-6 text-foreground">
        {/* Step 1: Who is signing in? */}
        {step === 'role_select' && (
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <Fingerprint className="h-9 w-9 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Biometric Sign-In</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Touch verified. Who is using AskFirst right now?
            </p>

            <div className="mt-8 grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setStep('parent_auth')}
                className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/80 bg-card p-6 transition-all hover:border-primary/50 hover:bg-accent/40"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Parent / Guardian</h3>
                  <p className="text-xs text-muted-foreground">Approve requests & manage budget</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (boundChildId && selectedChild) {
                    setStep('child_pin')
                  } else {
                    setStep('child_picker')
                  }
                }}
                className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/80 bg-card p-6 transition-all hover:border-primary/50 hover:bg-accent/40"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Child</h3>
                  <p className="text-xs text-muted-foreground">Ask for items & view allowance</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2a: Parent Google sign-in */}
        {step === 'parent_auth' && (
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => setStep('role_select')}
              className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>

            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Shield className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold">Parent Sign-In</h2>
              <p className="text-xs text-muted-foreground">Use your Google account to open the parent portal.</p>
            </div>

            <Button className="mt-6 w-full" onClick={onSelectParent}>
              <span aria-hidden="true" className="font-bold">G</span>
              Continue with Google
            </Button>
          </div>
        )}

        {/* Step 2b: Child Profile Picker */}
        {step === 'child_picker' && (
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => setStep('role_select')}
              className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>

            <div className="text-center">
              <h2 className="text-lg font-bold">Who is asking?</h2>
              <p className="text-xs text-muted-foreground">Select your card to sign in</p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {childrenList.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => {
                    setSelectedChild(child)
                    setStep('child_pin')
                  }}
                  className="flex items-center gap-3 rounded-2xl border border-border/80 bg-card p-4 text-left transition-all hover:border-primary/50 hover:bg-accent/40"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-2xl">
                    {child.avatar || '🚀'}
                  </span>
                  <div>
                    <h3 className="font-semibold text-foreground">{child.name}</h3>
                    <p className="text-xs text-muted-foreground">Age {child.age}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Tactile Child PIN Pad */}
        {step === 'child_pin' && selectedChild && (
          <div className="flex flex-col items-center text-center">
            {!boundChildId && (
              <button
                type="button"
                onClick={() => {
                  setPin('')
                  setPinError(null)
                  setStep('child_picker')
                }}
                className="self-start mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Change Child
              </button>
            )}

            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-3xl mb-2">
              {selectedChild.avatar || '🚀'}
            </span>
            <h2 className="text-lg font-bold">Hello, {selectedChild.name}!</h2>
            <p className="text-xs text-muted-foreground">Enter your 4-digit secret code</p>

            {/* PIN Dots Display */}
            <div className="my-6 flex items-center justify-center gap-4">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`h-4 w-4 rounded-full border transition-all ${
                    idx < pin.length
                      ? 'border-primary bg-primary scale-110 shadow-xs shadow-primary/50'
                      : 'border-border bg-muted/40'
                  }`}
                />
              ))}
            </div>

            {pinError && <p className="mb-4 text-xs font-medium text-destructive">{pinError}</p>}

            {/* Tactile Keypad (0-9) */}
            <div className="grid w-full max-w-[260px] grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handlePinInput(digit)}
                  className="flex h-14 items-center justify-center rounded-2xl border border-border/80 bg-card text-xl font-bold transition-all hover:bg-accent/60 active:scale-95"
                >
                  {digit}
                </button>
              ))}
              <div />
              <button
                type="button"
                onClick={() => handlePinInput('0')}
                className="flex h-14 items-center justify-center rounded-2xl border border-border/80 bg-card text-xl font-bold transition-all hover:bg-accent/60 active:scale-95"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                aria-label="Backspace"
                className="flex h-14 items-center justify-center rounded-2xl border border-border/80 bg-card text-muted-foreground transition-all hover:bg-accent/60 active:scale-95 hover:text-foreground"
              >
                <Delete className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
