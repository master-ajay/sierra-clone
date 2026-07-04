import { HTMLAttributes } from 'react'

export type BadgeStatus = 'success' | 'warning' | 'error' | 'info'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: BadgeStatus
}

const STATUS_CLASSES: Record<BadgeStatus, string> = {
  success: 'bg-status-success/10 text-status-success',
  warning: 'bg-status-warning/10 text-status-warning',
  error: 'bg-status-error/10 text-status-error',
  info: 'bg-status-info/10 text-status-info',
}

export function Badge({ status, className = '', ...props }: BadgeProps) {
  const classes = [
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
    STATUS_CLASSES[status],
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return <span className={classes} {...props} />
}

export { Badge as StatusPill }
