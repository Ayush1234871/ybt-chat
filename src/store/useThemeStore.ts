import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const ACCENT_COLORS: Record<string, { hsl: string; ring: string }> = {
    'sky-blue': { hsl: '199 89% 48%', ring: '199 89% 48%' },
    'violet': { hsl: '262 83% 58%', ring: '262 83% 58%' },
    'emerald': { hsl: '160 84% 39%', ring: '160 84% 39%' },
    'rose': { hsl: '346 87% 60%', ring: '346 87% 60%' },
    'amber': { hsl: '38 92% 50%', ring: '38 92% 50%' },
}

interface ThemeState {
    theme: 'light' | 'dark' | 'system'
    color: string
    setTheme: (theme: 'light' | 'dark' | 'system') => void
    setColor: (color: string) => void
}


export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            theme: 'system',
            color: 'sky-blue',
            setTheme: (theme) => set({ theme }),
            setColor: (color) => set({ color }),
        }),
        {
            name: 'theme-storage',
        }
    )
)
