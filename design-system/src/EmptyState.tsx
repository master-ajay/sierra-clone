import { ReactNode } from 'react'
import { Button } from './Button'

export interface EmptyStateAction {
  label: string
  onClick: () => void
}

export interface EmptyStateProps {
  icon?: ReactNode
  heading: string
  body: string
  action?: EmptyStateAction
}

export function EmptyState({ icon, heading, body, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      {icon && <div className="text-text-muted">{icon}</div>}
      <h3 className="text-base font-semibold text-text-primary">{heading}</h3>
      <p className="max-w-sm text-sm text-text-muted">{body}</p>
      {action && (
        <Button variant="primary" size="sm" onClick={action.onClick} className="mt-2">
          {action.label}
        </Button>
      )}
    </div>
  )
}
