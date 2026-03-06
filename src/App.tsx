import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { useAuthStore } from './store/useAuthStore'
import { useThemeStore } from './store/useThemeStore'

// Components
import SplashScreen from './components/common/SplashScreen'

// Layouts
import AppShell from './components/layout/AppShell'

// Pages
import SignIn from './pages/auth/SignIn'
import SignUp from './pages/auth/SignUp'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import Home from './pages/home/Home'
import ChatWindow from './pages/home/ChatWindow'
import Search from './pages/search/Search'
import RandomChat from './pages/search/RandomChat'
import StatusFeed from './pages/status/StatusFeed'
import Settings from './pages/settings/Settings'
import UserProfile from './pages/home/UserProfile'
import AdminLogin from './pages/admin/AdminLogin'
import Dashboard from './pages/admin/Dashboard'

function App() {
  const { setSession, setUser, setProfile, user } = useAuthStore()
  const { theme } = useThemeStore()
  const [showSplash, setShowSplash] = useState(true)

  // Handle Splash Screen
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false)
    }, 3500)
    return () => clearTimeout(timer)
  }, [])

  // Apply dark mode class to document
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'light') {
      root.classList.remove('dark')
    } else {
      // system
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
  }, [theme])

  const { color } = useThemeStore()

  // Inject accent color CSS variables
  useEffect(() => {
    const root = document.documentElement
    import('./store/useThemeStore').then(mod => {
      const selected = mod.ACCENT_COLORS[color] || mod.ACCENT_COLORS['sky-blue']
      root.style.setProperty('--primary', selected.hsl)
      root.style.setProperty('--ring', selected.ring)
    })
  }, [color])


  // Auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [setSession, setUser])

  // Load user profile whenever user changes
  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }

    const loadProfile = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!error && data) {
        // Check if user is banned
        if (data.is_banned) {
          alert('Your account has been banned. Please contact support.')
          await supabase.auth.signOut()
          return
        }
        setProfile(data)
      }
    }

    loadProfile()

    // Set user online
    supabase
      .from('users')
      .update({ is_online: true, last_seen: new Date().toISOString() })
      .eq('id', user.id)
      .then()

    // Set user offline on page unload
    const handleUnload = () => {
      if (user) {
        navigator.sendBeacon(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/users?id=eq.${user.id}`,
          JSON.stringify({ is_online: false, last_seen: new Date().toISOString() })
        )
      }
    }

    window.addEventListener('beforeunload', handleUnload)

    return () => {
      window.removeEventListener('beforeunload', handleUnload)
      // Mark offline on component cleanup (tab switch, etc.)
      if (user) {
        supabase
          .from('users')
          .update({ is_online: false, last_seen: new Date().toISOString() })
          .eq('id', user.id)
          .then()
      }
    }
  }, [user, setProfile])

  if (showSplash) {
    return <SplashScreen />
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public / Auth Routes */}
        <Route
          path="/signin"
          element={user ? <Navigate to="/" replace /> : <SignIn />}
        />
        <Route
          path="/signup"
          element={user ? <Navigate to="/" replace /> : <SignUp />}
        />
        <Route
          path="/forgot-password"
          element={user ? <Navigate to="/" replace /> : <ForgotPassword />}
        />
        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />

        {/* Admin Routes */}
        <Route path="/1234/admin" element={<AdminLogin />} />
        <Route path="/1234/admin/dashboard" element={<Dashboard />} />

        {/* Protected App Routes */}
        <Route path="/" element={<AppShell />}>
          <Route index element={<Home />} />
          <Route path="chat/:chatId" element={<ChatWindow />} />
          <Route path="search" element={<Search />} />
          <Route path="random-chat/:sessionId" element={<RandomChat />} />
          <Route path="status" element={<StatusFeed />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile/:userId" element={<UserProfile />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
