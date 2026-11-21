import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../components/ui/Toast'

/** Renders UI inside a router, the toast provider and the auth provider. */
export function renderWithProviders(ui, { route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>{ui}</ToastProvider>
    </MemoryRouter>,
  )
}
