import { NavLink } from 'react-router-dom'
import { MessageCircle, Search, Circle, Settings } from 'lucide-react'

const navItems = [
    { to: '/', label: 'Chats', icon: MessageCircle, end: true },
    { to: '/search', label: 'Search', icon: Search },
    { to: '/status', label: 'Status', icon: Circle },
    { to: '/settings', label: 'Settings', icon: Settings },
]

export default function BottomNav() {
    return (
        <div className="flex justify-around items-center h-full px-2">
            {navItems.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'
                        }`
                    }
                >
                    {({ isActive }) => (
                        <>
                            <div className={`p-1 rounded-xl transition-colors ${isActive ? 'bg-primary/10' : ''}`}>
                                <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                            </div>
                            <span className={`text-[10px] font-medium ${isActive ? 'text-primary' : ''}`}>
                                {label}
                            </span>
                        </>
                    )}
                </NavLink>
            ))}
        </div>
    )
}
