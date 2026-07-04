import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '../src/Input'

describe('Input', () => {
  it('renders a label associated with the input', () => {
    render(<Input label="Agent name" />)
    expect(screen.getByLabelText('Agent name')).toBeInTheDocument()
  })

  it('accepts typed input and reports changes', async () => {
    const onChange = vi.fn()
    render(<Input label="Agent name" onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Agent name'), 'Support Bot')
    expect(onChange).toHaveBeenCalled()
  })

  it('shows an error message and error-state styling when error is set', () => {
    render(<Input label="Agent name" error="Name is required" />)
    expect(screen.getByText('Name is required')).toBeInTheDocument()
    expect(screen.getByLabelText('Agent name').className).toMatch(/status-error/)
  })

  it('does not render an error message when no error is given', () => {
    render(<Input label="Agent name" />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('has a focus ring class for keyboard accessibility', () => {
    render(<Input label="Agent name" />)
    expect(screen.getByLabelText('Agent name').className).toMatch(/focus-visible|focus:/)
  })
})
