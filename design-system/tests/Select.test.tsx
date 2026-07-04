import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select } from '../src/Select'

const OPTIONS = [
  { value: 'widget', label: 'Widget' },
  { value: 'api', label: 'API' },
]

describe('Select', () => {
  it('renders a label associated with the select', () => {
    render(<Select label="Channel type" options={OPTIONS} />)
    expect(screen.getByLabelText('Channel type')).toBeInTheDocument()
  })

  it('renders every option', () => {
    render(<Select label="Channel type" options={OPTIONS} />)
    expect(screen.getByRole('option', { name: 'Widget' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'API' })).toBeInTheDocument()
  })

  it('reports changes on selection', async () => {
    const onChange = vi.fn()
    render(<Select label="Channel type" options={OPTIONS} onChange={onChange} />)
    await userEvent.selectOptions(screen.getByLabelText('Channel type'), 'api')
    expect(onChange).toHaveBeenCalled()
  })

  it('shows an error message when error is set', () => {
    render(<Select label="Channel type" options={OPTIONS} error="Required" />)
    expect(screen.getByText('Required')).toBeInTheDocument()
  })
})
