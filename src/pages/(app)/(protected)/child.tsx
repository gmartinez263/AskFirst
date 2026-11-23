import ChildPortal from '@/components/ChildPortal'
import { useLocation } from 'react-router-dom'

export default function ChildPage() {
  const location = useLocation()
  const childProfileId = new URLSearchParams(location.search).get('profile')

  return <ChildPortal childProfileId={childProfileId} />
}
