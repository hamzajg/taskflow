import { SelectHTMLAttributes } from 'react'

interface Option {
  value: string
  label: string
}

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: Option[]
}

export default function Select({ label, options, id, className = '', ...rest }: Props) {
  const selectId = id ?? `sel-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <label className={`field ${className}`} htmlFor={selectId}>
      <span className="field-label">{label}</span>
      <select id={selectId} className="field-input" {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
