import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MetricCard } from '../src/MetricCard'

describe('MetricCard', () => {
  it('renders the label and value', () => {
    render(<MetricCard label="Total sessions" value={128} />)
    expect(screen.getByText('Total sessions')).toBeInTheDocument()
    expect(screen.getByText('128')).toBeInTheDocument()
  })

  it('accepts a string value', () => {
    render(<MetricCard label="Block rate" value="4%" />)
    expect(screen.getByText('4%')).toBeInTheDocument()
  })

  it('renders an upward trend with the success color', () => {
    render(<MetricCard label="Sessions" value={10} trend={{ direction: 'up', value: '+12%' }} />)
    const trend = screen.getByText('+12%')
    expect(trend.className).toMatch(/status-success/)
  })

  it('renders a downward trend with the error color', () => {
    render(<MetricCard label="Sessions" value={10} trend={{ direction: 'down', value: '-8%' }} />)
    const trend = screen.getByText('-8%')
    expect(trend.className).toMatch(/status-error/)
  })

  it('renders no trend indicator when trend is omitted', () => {
    render(<MetricCard label="Sessions" value={10} />)
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })
})
