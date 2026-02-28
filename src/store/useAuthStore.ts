import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'

export interface UserProfile {
    id: string
    full_name: string
    username: string
    email: string
    avatar_url?: string
    is_private: boolean
    is_online: boolean
    last_seen: string
    is_banned: boolean
    status: string
}

interface AuthState {
    user: User | null
    profile: UserProfile | null
    session: Session | null
    isAdmin: boolean
    setUser: (user: User | null) => void
    setProfile: (profile: UserProfile | null) => void
    setSession: (session: Session | null) => void
    setIsAdmin: (isAdmin: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    profile: null,
    session: null,
    isAdmin: false,
    setUser: (user) => set({ user }),
    setProfile: (profile) => set({ profile }),
    setSession: (session) => set({ session }),
    setIsAdmin: (isAdmin) => set({ isAdmin }),
}))
