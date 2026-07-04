import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ToastProvider, useToast } from '../src/Toast'

function TestHarness() {
  const { showToast } = useToast()
  return (
    <button
      onClick={() => showToast({ message: 'Agent saved', variant: 'success' })}
    >
      Trigger
    </button>
  )
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows a toast after showToast is called', async () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>
    )
    act(() => {
      screen.getByRole('button', { name: 'Trigger' }).click()
    })
    expect(screen.getByText('Agent saved')).toBeInTheDocument()
  })

  it('stacks multiple toasts', () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>
    )
    const trigger = screen.getByRole('button', { name: 'Trigger' })
    act(() => trigger.click())
    act(() => trigger.click())
    expect(screen.getAllByText('Agent saved')).toHaveLength(2)
  })

  it('auto-dismisses a toast after its duration elapses', () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>
    )
    act(() => {
      screen.getByRole('button', { name: 'Trigger' }).click()
    })
    expect(screen.getByText('Agent saved')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.queryByText('Agent saved')).not.toBeInTheDocument()
  })

  it('renders toasts in a live region for accessibility', () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>
    )
    act(() => {
      screen.getByRole('button', { name: 'Trigger' }).click()
    })
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
