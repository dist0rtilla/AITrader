import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MonitorPage from '../src/pages/MonitorPage'

describe('MonitorPage', () => {
    it('renders monitor and component cards', async () => {
        render(<MonitorPage />)
        expect(await screen.findByText(/Monitor/i)).toBeTruthy()
    })
})
