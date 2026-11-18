import { ReactNode } from 'react'

export default function Alert({
  tone = 'danger',
  children,
}: {
  tone?: 'danger' | 'success' | 'info' | 'warning'
  children: ReactNode
}) {
  return (
    <div className={`alert alert-${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      {children}
    </div>
  )
}
