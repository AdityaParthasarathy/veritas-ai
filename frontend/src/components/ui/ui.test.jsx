import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test/renderApp'
import CommandPalette from '../layout/CommandPalette'
import Button from './Button'
import Menu from './Menu'
import Modal from './Modal'
import Reveal from './Reveal'
import Tabs from './Tabs'
import Tooltip from './Tooltip'
import { ToastProvider, useToast } from './Toast'

describe('Modal', () => {
  function Harness({ onClose = () => {} }) {
    const [open, setOpen] = useState(false)
    return (
      <>
        <button onClick={() => setOpen(true)}>Open dialog</button>
        <Modal
          open={open}
          onClose={() => {
            onClose()
            setOpen(false)
          }}
          title="Confirm"
          footer={<button>Second action</button>}
        >
          <input aria-label="Inside field" />
        </Modal>
      </>
    )
  }

  it('moves focus in, traps Tab, closes on Escape and returns focus to the opener', async () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    const opener = screen.getByRole('button', { name: 'Open dialog' })
    await userEvent.click(opener)

    const dialog = await screen.findByRole('dialog', { name: 'Confirm' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    await waitFor(() => expect(dialog).toContainElement(document.activeElement))

    // Tab cycles within the dialog: close button, field, footer action, then back to the close button.
    const seen = new Set()
    for (let i = 0; i < 6; i += 1) {
      await userEvent.tab()
      expect(dialog).toContainElement(document.activeElement)
      seen.add(document.activeElement.getAttribute('aria-label') ?? document.activeElement.textContent)
    }
    expect(seen.size).toBeGreaterThanOrEqual(3)

    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(opener).toHaveFocus())
  })

  it('locks page scroll while open and restores it afterwards', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Open dialog' }))
    expect(document.body.style.overflow).toBe('hidden')
    await userEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})

describe('Tabs', () => {
  const tabs = [
    { id: 'a', label: 'Alpha' },
    { id: 'b', label: 'Beta', count: 3 },
    { id: 'c', label: 'Gamma' },
  ]
  function Harness() {
    const [value, setValue] = useState('a')
    return <Tabs tabs={tabs} value={value} onChange={setValue} label="Sections" idPrefix="t" />
  }

  it('selects with arrow keys, Home and End, keeping a single tab stop', async () => {
    render(<Harness />)
    const first = screen.getByRole('tab', { name: 'Alpha' })
    first.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /Beta/ })).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Gamma' })).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{Home}')
    expect(first).toHaveAttribute('aria-selected', 'true')
    expect(screen.getAllByRole('tab').filter((t) => t.tabIndex === 0)).toHaveLength(1)
  })
})

describe('Menu', () => {
  it('opens, moves with arrows, activates, and closes on Escape returning focus', async () => {
    const onSelect = vi.fn()
    renderWithProviders(<Menu label="Account menu" trigger="Account" items={[{ label: 'Settings', to: '/settings' }, { label: 'Sign out', onSelect }]} />)
    const trigger = screen.getByRole('button', { name: 'Account menu' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(await screen.findByRole('menuitem', { name: 'Settings' })).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()

    await userEvent.click(trigger)
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(onSelect).toHaveBeenCalledTimes(1)
  })
})

describe('Tooltip', () => {
  it('appears on keyboard focus, is described by the child, and Escape dismisses it', async () => {
    render(
      <Tooltip text="Explains the thing">
        <button>Trigger</button>
      </Tooltip>,
    )
    await userEvent.tab()
    const tip = await screen.findByRole('tooltip')
    expect(tip).toHaveTextContent('Explains the thing')
    expect(screen.getByRole('button', { name: 'Trigger' })).toHaveAttribute('aria-describedby', tip.id)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})

describe('Toast', () => {
  afterEach(() => vi.useRealTimers())

  function Trigger() {
    const toast = useToast()
    return <button onClick={() => toast({ title: 'Saved', description: 'All good' })}>Notify</button>
  }

  it('announces politely and dismisses itself', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Notify' }))
    expect(screen.getByRole('status')).toHaveTextContent('Saved')
    await act(async () => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

describe('Button', () => {
  it('blocks activation and exposes busy state while loading', async () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('renders a router link when given `to`', () => {
    renderWithProviders(<Button to="/analyze">Go</Button>)
    expect(screen.getByRole('link', { name: 'Go' })).toHaveAttribute('href', '/analyze')
  })
})

describe('Reveal', () => {
  it('keeps content visible when IntersectionObserver is unavailable', () => {
    render(<Reveal>Always readable</Reveal>)
    expect(screen.getByText('Always readable')).not.toHaveClass('is-pending')
  })
})

describe('CommandPalette', () => {
  function Where() {
    const location = useLocation()
    return <p data-testid="where">{`${location.pathname}|${JSON.stringify(location.state)}`}</p>
  }

  it('filters, runs the highlighted command with Enter and closes', async () => {
    const onClose = vi.fn()
    renderWithProviders(
      <>
        <CommandPalette open onClose={onClose} />
        <Routes>
          <Route path="*" element={<Where />} />
        </Routes>
      </>,
    )
    const input = screen.getByRole('combobox', { name: 'Search destinations and actions' })
    await waitFor(() => expect(input).toHaveFocus())
    await userEvent.type(input, 'sourdough')
    expect(screen.getAllByRole('option')).toHaveLength(1)
    await userEvent.keyboard('{Enter}')
    expect(onClose).toHaveBeenCalled()
    expect(screen.getByTestId('where')).toHaveTextContent('/analyze|{"example":"04-out-of-domain"}')
  })

  it('shows an empty message and closes with Escape', async () => {
    const onClose = vi.fn()
    renderWithProviders(<CommandPalette open onClose={onClose} />)
    await userEvent.type(screen.getByRole('combobox'), 'zzzzqq')
    expect(screen.getByText(/Nothing matches/)).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})
