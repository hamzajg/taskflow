import { ReactNode } from 'react'

export default function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger'
  children: ReactNode
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}
