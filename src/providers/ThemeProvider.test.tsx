import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ThemeProvider } from './ThemeProvider'
import { useTheme } from '../hooks/useTheme'

function ThemeProbe() {
  const { theme, setTheme } = useTheme()

  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button type="button" onClick={() => setTheme('dark')}>
        Use dark
      </button>
    </div>
  )
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('restores a persisted theme and applies the dark class', async () => {
    localStorage.setItem('microaxis-theme', 'dark')
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
    await waitFor(() => {
      expect(document.documentElement).toHaveClass('dark')
    })
  })

  it('persists a theme change', async () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Use dark' }))

    expect(localStorage.getItem('microaxis-theme')).toBe('dark')
    await waitFor(() => {
      expect(document.documentElement).toHaveClass('dark')
    })
  })
})
