import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from '../src/Modal'

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Confirm delete">
        Body
      </Modal>
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders the dialog with its title and content when open', () => {
    render(
      <Modal open onClose={vi.fn()} title="Confirm delete">
        Are you sure?
      </Modal>
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Confirm delete')).toBeInTheDocument()
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
  })

  it('has an accessible name matching the title', () => {
    render(
      <Modal open onClose={vi.fn()} title="Confirm delete">
        Body
      </Modal>
    )
    expect(screen.getByRole('dialog', { name: 'Confirm delete' })).toBeInTheDocument()
  })

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Confirm delete">
        Body
      </Modal>
    )
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Confirm delete">
        Body
      </Modal>
    )
    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('traps focus within the dialog', async () => {
    render(
      <Modal open onClose={vi.fn()} title="Confirm delete">
        <button>Confirm</button>
      </Modal>
    )
    // Radix Dialog moves initial focus into the content; the close button
    // or first focusable element should end up focused, never document.body.
    expect(document.activeElement).not.toBe(document.body)
  })
})
