import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

const DEEP_LINK_KEYS = ['open', 'lead', 'version', 'user', 'member', 'payroll', 'from']

export function useDetailBack(onClose: () => void) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const cancel = () => {
    const next = new URLSearchParams(searchParams)
    for (const key of DEEP_LINK_KEYS) next.delete(key)
    if (next.toString() !== searchParams.toString()) {
      navigate({ pathname: location.pathname, search: next.toString() }, { replace: true })
    }
    onClose()
  }

  const back = () => {
    if (searchParams.get('from') === 'notifications') {
      navigate('/admin/notifications')
      return
    }
    if (window.history.length > 1 && [...searchParams.keys()].length) {
      navigate(-1)
      return
    }
    cancel()
  }

  return { back, cancel }
}
