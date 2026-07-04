import { SelectHTMLAttributes, useId } from 'react'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: SelectOption[]
  error?: string
}

export function Select({ label, options, error, id, className = '', ...props }: SelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const errorId = error ? `${selectId}-error` : undefined

  const selectClasses = [
    'w-full rounded-md border bg-bg-surface px-3 py-2 text-sm text-text-primary',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary',
    error ? 'border-status-error' : 'border-border',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-medium text-text-primary">
        {label}
      </label>
      <select
        id={selectId}
        className={selectClasses}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-status-error">
          {error}
        </p>
      )}
    </div>
  )
}
