import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { Table } from '../src/Table'

interface Row {
  id: string
  name: string
  status: string
}

const columns = [
  { key: 'name', header: 'Name' },
  { key: 'status', header: 'Status' },
]

const data: Row[] = [
  { id: '1', name: 'Support Bot', status: 'active' },
  { id: '2', name: 'Sales Bot', status: 'paused' },
]

describe('Table', () => {
  it('renders a header cell for every column', () => {
    render(<Table columns={columns} data={data} rowKey="id" />)
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument()
  })

  it('renders one row per data item', () => {
    render(<Table columns={columns} data={data} rowKey="id" />)
    expect(screen.getAllByRole('row')).toHaveLength(data.length + 1) // + header row
  })

  it('renders each column value in its row', () => {
    render(<Table columns={columns} data={data} rowKey="id" />)
    const rows = screen.getAllByRole('row')
    expect(within(rows[1]).getByText('Support Bot')).toBeInTheDocument()
    expect(within(rows[1]).getByText('active')).toBeInTheDocument()
  })

  it('supports a custom cell renderer per column', () => {
    const customColumns = [
      { key: 'name', header: 'Name' },
      {
        key: 'status',
        header: 'Status',
        render: (row: Row) => <strong>{row.status.toUpperCase()}</strong>,
      },
    ]
    render(<Table columns={customColumns} data={data} rowKey="id" />)
    expect(screen.getByText('ACTIVE')).toBeInTheDocument()
  })

  it('renders an empty-state row when data is empty', () => {
    render(<Table columns={columns} data={[]} rowKey="id" emptyMessage="No agents yet" />)
    expect(screen.getByText('No agents yet')).toBeInTheDocument()
  })
})
