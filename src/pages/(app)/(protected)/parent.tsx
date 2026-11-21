import { ShieldAlert } from 'lucide-react'
import { useUser } from 'deepspace'
import ParentPortal from '@/components/ParentPortal'

export default function ParentPage() {
  const { user, isLoading } = useUser()

  if (isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">Loading account…</div>
  }

  if (user?.role !== 'admin') {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-warning/10 text-warning">
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-semibold">Parent access required</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Sign in with the parent account to review family purchase requests.</p>
      </div>
    )
  }

  return <ParentPortal />
}
