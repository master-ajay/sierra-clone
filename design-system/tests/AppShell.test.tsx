import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppShell } from '../src/AppShell'

const nav = [
  { label: 'Dashboard', href: '/', active: true },
  { label: 'Sessions', href: '/sessions', active: false },
]

describe('AppShell', () => {
  it('renders every nav item as a link', () => {
    render(
      <AppShell nav={nav} productName="Explorer" title="Dashboard">
        <p>Body content</p>
      </AppShell>
    )
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Sessions' })).toHaveAttribute('href', '/sessions')
  })

  it('marks the active nav item distinctly', () => {
    render(
      <AppShell nav={nav} productName="Explorer" title="Dashboard">
        <p>Body</p>
      </AppShell>
    )
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Sessions' })).not.toHaveAttribute('aria-current')
  })

  it('renders the product name in the sidebar', () => {
    render(
      <AppShell nav={nav} productName="Explorer" title="Dashboard">
        <p>Body</p>
      </AppShell>
    )
    expect(screen.getByText('Explorer')).toBeInTheDocument()
  })

  it('renders the page title in the topbar', () => {
    render(
      <AppShell nav={nav} productName="Explorer" title="Session detail">
        <p>Body</p>
      </AppShell>
    )
    expect(screen.getByRole('heading', { name: 'Session detail' })).toBeInTheDocument()
  })

  it('renders an optional actions slot in the topbar', () => {
    render(
      <AppShell nav={nav} productName="Explorer" title="Dashboard" actions={<button>Export</button>}>
        <p>Body</p>
      </AppShell>
    )
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument()
  })

  it('renders children in the main content area', () => {
    render(
      <AppShell nav={nav} productName="Explorer" title="Dashboard">
        <p>Body content</p>
      </AppShell>
    )
    expect(screen.getByText('Body content')).toBeInTheDocument()
  })
})
