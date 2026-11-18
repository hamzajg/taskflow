import { InputHTMLAttributes, ReactNode } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: ReactNode
}

export default function Input({ label, hint, id, className = '', ...rest }: Props) {
  const inputId = id ?? `in-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <label className={`field ${className}`} htmlFor={inputId}>
      <span className="field-label">{label}</span>
      <input id={inputId} className="field-input" {...rest} />
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}
