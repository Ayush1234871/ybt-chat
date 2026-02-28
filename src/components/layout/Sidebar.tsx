import { NavLink } from 'react-router-dom'
import { MessageCircle, Search, Circle, Settings, LogOut } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'

const navItems = [
    { to: '/', label: 'Chats', icon: MessageCircle, end: true },
    { to: '/search', label: 'Search', icon: Search },
    { to: '/status', label: 'Status', icon: Circle },
    { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
    const { profile } = useAuthStore()

    const handleSignOut = async () => {
        await supabase.auth.signOut()
    }

    return (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="px-6 py-5 border-b border-border">
                <h1 className="text-xl font-bold text-primary tracking-tight">YBT Chat</h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navItems.map(({ to, label, icon: Icon, end }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={end}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary' : ''}`} />
                                <span>{label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* User Profile at Bottom */}
            <div className="p-4 border-t border-border">
                <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                        {profile?.avatar_url ? (
                            <img
                                src={profile.avatar_url}
                                className="w-9 h-9 rounded-full object-cover bg-secondary"
                                alt={profile.full_name}
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                                {profile?.full_name?.charAt(0) || '?'}
                            </div>
                        )}
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{profile?.full_name || 'Loading...'}</p>
                        <p className="text-xs text-muted-foreground truncate">@{profile?.username || ''}</p>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Sign out"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
