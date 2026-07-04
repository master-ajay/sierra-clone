import { HTMLAttributes } from 'react'

export type CardProps = HTMLAttributes<HTMLDivElement>

export function Card({ className = '', ...props }: CardProps) {
  const classes = ['rounded-lg border border-border bg-bg-surface p-5', className]
    .filter(Boolean)
    .join(' ')
  return <div className={classes} {...props} />
}
