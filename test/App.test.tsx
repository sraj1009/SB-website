import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import App from '../App'

// Mock the components that might cause issues
vi.mock('../components/InteractiveParticles', () => ({
  default: () => <div data-testid="interactive-particles">Particles</div>
}))

vi.mock('../components/RoamingBee', () => ({
  default: () => <div data-testid="roaming-bee">Bee</div>
}))

vi.mock('../services/api', () => ({
  default: {
    products: {
      getAll: vi.fn().mockResolvedValue({ products: [] }),
      getByCategory: vi.fn().mockResolvedValue({ products: [] })
    }
  }
}))

describe('App Component', () => {
  it('renders without crashing', () => {
    render(<App />)
    // Look for any element that would indicate the app loaded
    expect(document.body).toBeInTheDocument()
  })

  it('displays navigation elements', () => {
    render(<App />)
    // Check for navigation elements
    expect(document.querySelector('nav')).toBeInTheDocument()
  })
})
