import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmptyState } from '../src/EmptyState'

describe('EmptyState', () => {
  it('renders a heading and body', () => {
    render(<EmptyState heading="No channels yet" body="Create your first channel to get started." />)
    expect(screen.getByRole('heading', { name: 'No channels yet' })).toBeInTheDocument()
    expect(screen.getByText('Create your first channel to get started.')).toBeInTheDocument()
  })

  it('renders an optional icon slot', () => {
    render(
      <EmptyState heading="No channels" body="Body" icon={<svg data-testid="icon" />} />
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('renders an optional action button and fires its click handler', async () => {
    const onClick = vi.fn()
    render(
      <EmptyState
        heading="No channels"
        body="Body"
        action={{ label: 'Create channel', onClick }}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Create channel' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('renders no action button when none is given', () => {
    render(<EmptyState heading="No channels" body="Body" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
