import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '../src/Badge'

describe('Badge', () => {
  it('renders its label', () => {
    render(<Badge status="success">Active</Badge>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('colors the success status with the success token', () => {
    render(<Badge status="success">Active</Badge>)
    expect(screen.getByText('Active').className).toMatch(/status-success/)
  })

  it('colors the warning status with the warning token', () => {
    render(<Badge status="warning">Paused</Badge>)
    expect(screen.getByText('Paused').className).toMatch(/status-warning/)
  })

  it('colors the error status with the error token', () => {
    render(<Badge status="error">Blocked</Badge>)
    expect(screen.getByText('Blocked').className).toMatch(/status-error/)
  })

  it('colors the info status with the info token', () => {
    render(<Badge status="info">Pending</Badge>)
    expect(screen.getByText('Pending').className).toMatch(/status-info/)
  })

  it('is a pill shape (fully rounded)', () => {
    render(<Badge status="success">Active</Badge>)
    expect(screen.getByText('Active').className).toMatch(/rounded-full/)
  })
})
