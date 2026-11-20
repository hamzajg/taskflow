import { ReactNode } from 'react'

export default function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon?: ReactNode
  label: string
  value: ReactNode
  hint?: string
}) {
  return (
    <div className="stat-card">
      {icon && (
        <span className="stat-card-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <div className="stat-card-body">
        <span className="stat-card-label">{label}</span>
        <span className="stat-card-value">{value}</span>
        {hint && <span className="stat-card-hint muted">{hint}</span>}
      </div>
    </div>
  )
}
