import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../src/Button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Save agent</Button>)
    expect(screen.getByRole('button', { name: 'Save agent' })).toBeInTheDocument()
  })

  it('defaults to the primary variant', () => {
    render(<Button>Click</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-brand-primary')
  })

  it('applies the secondary variant', () => {
    render(<Button variant="secondary">Click</Button>)
    const btn = screen.getByRole('button')
    expect(btn).not.toHaveClass('bg-brand-primary')
    expect(btn.className).toMatch(/border/)
  })

  it('applies the ghost variant', () => {
    render(<Button variant="ghost">Click</Button>)
    const btn = screen.getByRole('button')
    expect(btn).not.toHaveClass('bg-brand-primary')
  })

  it('applies the destructive variant using the error status color', () => {
    render(<Button variant="destructive">Delete</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-status-error')
  })

  it('applies the sm size', () => {
    render(<Button size="sm">Click</Button>)
    expect(screen.getByRole('button').className).toMatch(/text-xs|px-2/)
  })

  it('defaults to the md size', () => {
    render(<Button>Click</Button>)
    expect(screen.getByRole('button').className).toMatch(/text-sm|px-4/)
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('is disabled when the disabled prop is set, and does not fire onClick', async () => {
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} disabled>
        Click
      </Button>
    )
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    await userEvent.click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('has a visible focus ring class for keyboard accessibility', () => {
    render(<Button>Click</Button>)
    expect(screen.getByRole('button').className).toMatch(/focus-visible/)
  })

  it('passes through a className for one-off overrides', () => {
    render(<Button className="my-extra-class">Click</Button>)
    expect(screen.getByRole('button')).toHaveClass('my-extra-class')
  })
})
