import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProtectedRoute from '../components/common/ProtectedRoute'
import { user } from '../test/fixtures'
import { renderWithProviders } from '../test/renderApp'
import AuthPage from './AuthPage'
import SettingsPage from './SettingsPage'

vi.mock('../services/authService', () => ({
  registerUser: vi.fn(),
  loginUser: vi.fn(),
  fetchCurrentUser: vi.fn(),
  changePasswordRequest: vi.fn(),
  deleteAccountRequest: vi.fn(),
}))
import { changePasswordRequest, deleteAccountRequest, fetchCurrentUser, loginUser, registerUser } from '../services/authService'

const session = { access_token: 'tok', token_type: 'bearer', expires_in: 1800, user }

function Shell() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/analyze" element={<p>Analyze page</p>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
    </Routes>
  )
}

describe('authentication', () => {
  beforeEach(() => vi.clearAllMocks())

  it('signs in and leaves the login page', async () => {
    loginUser.mockResolvedValue(session)
    renderWithProviders(<Shell />, { route: '/login' })
    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'correct-horse-battery')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Analyze page')).toBeInTheDocument()
    expect(loginUser).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'correct-horse-battery' })
    expect(sessionStorage.getItem('veritas.token')).toBe('tok')
  })

  it('shows the server error for wrong credentials and stays on the page', async () => {
    loginUser.mockRejectedValue({ response: { status: 401, data: { error: { code: 'UNAUTHORIZED', message: 'Incorrect email or password' } } } })
    renderWithProviders(<Shell />, { route: '/login' })
    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-password')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password')
    expect(sessionStorage.getItem('veritas.token')).toBeNull()
  })

  it('validates inline without calling the API', async () => {
    renderWithProviders(<Shell />, { route: '/register' })
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email')
    await userEvent.type(screen.getByLabelText('Password'), 'short')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(screen.getByText('Use at least 10 characters.', { selector: 'p[role="alert"]' })).toBeInTheDocument()
    expect(registerUser).not.toHaveBeenCalled()
  })

  it('creates an account with an optional name', async () => {
    registerUser.mockResolvedValue(session)
    renderWithProviders(<Shell />, { route: '/register' })
    await userEvent.type(screen.getByLabelText(/Name/), 'Ada')
    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'a-long-test-password')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('Analyze page')).toBeInTheDocument()
    expect(registerUser).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'a-long-test-password', full_name: 'Ada' })
  })

  it('toggles password visibility with an accessible control', async () => {
    renderWithProviders(<Shell />, { route: '/login' })
    const field = screen.getByLabelText('Password')
    expect(field).toHaveAttribute('type', 'password')
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(field).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('redirects anonymous visitors from a protected page to login', async () => {
    renderWithProviders(<Shell />, { route: '/settings' })
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('restores a stored session on load by asking the API who it belongs to', async () => {
    sessionStorage.setItem('veritas.token', 'stored-token')
    fetchCurrentUser.mockResolvedValue(user)
    vi.resetModules()
    const { renderWithProviders: render2 } = await import('../test/renderApp')
    const { default: Settings2 } = await import('./SettingsPage')
    const { default: Protected2 } = await import('../components/common/ProtectedRoute')
    render2(<Routes><Route path="/settings" element={<Protected2><Settings2 /></Protected2>} /></Routes>, { route: '/settings' })
    expect(await screen.findByText('ada@example.com')).toBeInTheDocument()
  })
})

describe('settings', () => {
  async function signedInSettings() {
    sessionStorage.setItem('veritas.token', 'tok')
    fetchCurrentUser.mockResolvedValue(user)
    vi.resetModules()
    const { renderWithProviders: render2 } = await import('../test/renderApp')
    const { default: Settings2 } = await import('./SettingsPage')
    const { default: Protected2 } = await import('../components/common/ProtectedRoute')
    const { default: Auth2 } = await import('./AuthPage')
    render2(
      <Routes>
        <Route path="/settings" element={<Protected2><Settings2 /></Protected2>} />
        <Route path="/login" element={<Auth2 mode="login" />} />
      </Routes>,
      { route: '/settings' },
    )
    await screen.findByRole('heading', { name: 'Password' })
  }

  beforeEach(() => vi.clearAllMocks())

  it('rejects mismatched new passwords without calling the API', async () => {
    await signedInSettings()
    await userEvent.type(screen.getByLabelText('Current password'), 'old-password-123')
    await userEvent.type(screen.getByLabelText('New password'), 'brand-new-password')
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'different-password')
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('do not match')
    expect(changePasswordRequest).not.toHaveBeenCalled()
  })

  it('changes the password, swaps in the new token and confirms with a toast', async () => {
    changePasswordRequest.mockResolvedValue({ ...session, access_token: 'fresh-token' })
    await signedInSettings()
    await userEvent.type(screen.getByLabelText('Current password'), 'old-password-123')
    await userEvent.type(screen.getByLabelText('New password'), 'brand-new-password')
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'brand-new-password')
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }))
    expect(await screen.findByText('Password changed')).toBeInTheDocument()
    expect(changePasswordRequest).toHaveBeenCalledWith('old-password-123', 'brand-new-password')
    expect(sessionStorage.getItem('veritas.token')).toBe('fresh-token')
  })

  it('asks for the password and an explicit confirmation in a dialog before deleting the account', async () => {
    deleteAccountRequest.mockResolvedValue({})
    await signedInSettings()
    await userEvent.click(screen.getByRole('button', { name: 'Delete my account' }))
    const dialog = await screen.findByRole('dialog', { name: 'Delete your account?' })
    const confirm = within(dialog).getByRole('button', { name: 'Permanently delete' })
    expect(confirm).toBeDisabled()
    await userEvent.type(within(dialog).getByLabelText('Confirm with your password'), 'old-password-123')
    expect(confirm).toBeDisabled()
    await userEvent.click(within(dialog).getByRole('checkbox'))
    expect(confirm).toBeEnabled()
    await userEvent.click(confirm)
    await waitFor(() => expect(deleteAccountRequest).toHaveBeenCalledWith('old-password-123'))
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(sessionStorage.getItem('veritas.token')).toBeNull()
  })

  it('keeps the account and shows the error when the delete password is wrong', async () => {
    deleteAccountRequest.mockRejectedValue({ response: { status: 401, data: { error: { code: 'UNAUTHORIZED', message: 'Incorrect password' } } } })
    await signedInSettings()
    await userEvent.click(screen.getByRole('button', { name: 'Delete my account' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Confirm with your password'), 'wrong-password')
    await userEvent.click(within(dialog).getByRole('checkbox'))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Permanently delete' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Incorrect password')
    expect(sessionStorage.getItem('veritas.token')).toBe('tok')
  })

  it('closes the delete dialog with Escape without deleting', async () => {
    await signedInSettings()
    await userEvent.click(screen.getByRole('button', { name: 'Delete my account' }))
    await screen.findByRole('dialog')
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(deleteAccountRequest).not.toHaveBeenCalled()
  })
})
