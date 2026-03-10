import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '../../store/useAuthStore'
import { useThemeStore } from '../../store/useThemeStore'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'

export default function AppShell() {
    const { session } = useAuthStore()
    const { theme } = useThemeStore()
    const location = useLocation()

    // Apply theme class whenever it changes (also handled in App.tsx for initial load)
    useEffect(() => {
        const root = document.documentElement
        if (theme === 'dark') {
            root.classList.add('dark')
        } else if (theme === 'light') {
            root.classList.remove('dark')
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
            prefersDark ? root.classList.add('dark') : root.classList.remove('dark')
        }
    }, [theme])

    if (!session) {
        return <Navigate to="/signin" replace />
    }

    // Hide bottom navigation on mobile when in a chat window
    const isChatPage = location.pathname.startsWith('/chat/') ||
        location.pathname.startsWith('/random-chat/')

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden relative">
            {/* Desktop Sidebar */}
            <div className="hidden md:flex flex-col w-64 border-r border-border glass shrink-0">
                <Sidebar />
            </div>

            {/* Main Content Area */}
            <main className={`flex-1 flex flex-col h-full relative overflow-hidden ${isChatPage ? 'pb-0' : 'pb-16'} md:pb-0`}>
                <Outlet />
            </main>

            {/* Mobile Bottom Navigation */}
            {!isChatPage && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-border glass-dark backdrop-blur-xl z-50">
                    <BottomNav />
                </div>
            )}
        </div>
    )
}
