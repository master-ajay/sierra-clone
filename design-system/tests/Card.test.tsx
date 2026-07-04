import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card } from '../src/Card'

describe('Card', () => {
  it('renders children inside a surface container', () => {
    render(<Card>Content</Card>)
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('applies surface background, border, and radius classes', () => {
    render(<Card data-testid="card">Content</Card>)
    const card = screen.getByTestId('card')
    expect(card.className).toMatch(/bg-bg-surface/)
    expect(card.className).toMatch(/border/)
    expect(card.className).toMatch(/rounded/)
  })

  it('passes through a className', () => {
    render(
      <Card data-testid="card" className="extra">
        Content
      </Card>
    )
    expect(screen.getByTestId('card')).toHaveClass('extra')
  })
})
