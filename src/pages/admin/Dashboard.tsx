import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Users, MessageSquare, BarChart3, LogOut, ShieldAlert,
    Ban, CheckCircle, Search, RefreshCw, UserX
} from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

type AdminUser = {
    id: string
    full_name: string
    username: string
    email: string
    avatar_url: string | null
    is_online: boolean
    is_banned: boolean
    status: string
    created_at: string
    last_seen: string | null
}

export default function Dashboard() {
    const navigate = useNavigate()
    const { setIsAdmin, isAdmin, user } = useAuthStore()

    const [stats, setStats] = useState({
        totalUsers: 0,
        activeChats: 0,
        totalMessages: 0,
        bannedUsers: 0,
        activeStatuses: 0,
    })
    const [users, setUsers] = useState<AdminUser[]>([])
    const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'overview' | 'users'>('overview')
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    useEffect(() => {
        if (!isAdmin && user) {
            const verifyAdmin = async () => {
                const { data } = await supabase.from('admin_users').select('id').eq('auth_user_id', user.id).single()
                if (!data) {
                    navigate('/1234/admin', { replace: true })
                } else {
                    setIsAdmin(true)
                }
            }
            verifyAdmin()
        } else if (!user) {
            navigate('/1234/admin', { replace: true })
        }
    }, [isAdmin, user, navigate, setIsAdmin])

    const fetchAllData = async () => {
        try {
            setIsLoading(true)

            const [usersRes, chatsRes, msgsRes, bannedRes, statusesRes] = await Promise.all([
                supabase.from('users').select('*', { count: 'exact', head: true }),
                supabase.from('chats').select('*', { count: 'exact', head: true }),
                supabase.from('messages').select('*', { count: 'exact', head: true }),
                supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_banned', true),
                supabase.from('statuses').select('*', { count: 'exact', head: true }).gt('expires_at', new Date().toISOString()),
            ])

            setStats({
                totalUsers: usersRes.count || 0,
                activeChats: chatsRes.count || 0,
                totalMessages: msgsRes.count || 0,
                bannedUsers: bannedRes.count || 0,
                activeStatuses: statusesRes.count || 0,
            })

            const { data: usersData, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100)

            if (error) throw error
            const usersList = usersData || []
            setUsers(usersList)
            setFilteredUsers(usersList)
        } catch (error) {
            console.error('Admin fetch error:', error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (isAdmin) fetchAllData()
    }, [isAdmin])

    // Filter users by search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredUsers(users)
        } else {
            const q = searchQuery.toLowerCase()
            setFilteredUsers(users.filter(u =>
                u.username?.toLowerCase().includes(q) ||
                u.full_name?.toLowerCase().includes(q) ||
                u.email?.toLowerCase().includes(q)
            ))
        }
    }, [searchQuery, users])

    const handleToggleBan = async (targetUser: AdminUser) => {
        setActionLoading(targetUser.id)
        try {
            const newBanned = !targetUser.is_banned
            const { error } = await supabase
                .from('users')
                .update({ is_banned: newBanned, status: newBanned ? 'suspended' : 'active' })
                .eq('id', targetUser.id)

            if (error) throw error

            setUsers(prev => prev.map(u =>
                u.id === targetUser.id ? { ...u, is_banned: newBanned, status: newBanned ? 'suspended' : 'active' } : u
            ))
            setStats(prev => ({
                ...prev,
                bannedUsers: newBanned ? prev.bannedUsers + 1 : prev.bannedUsers - 1,
            }))
        } catch (error) {
            console.error('Ban toggle error:', error)
            alert('Failed to update user ban status.')
        } finally {
            setActionLoading(null)
        }
    }

    const handleDeleteUser = async (targetUser: AdminUser) => {
        if (!window.confirm(`Delete user @${targetUser.username}? This cannot be undone.`)) return
        setActionLoading(targetUser.id)
        try {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', targetUser.id)

            if (error) throw error
            setUsers(prev => prev.filter(u => u.id !== targetUser.id))
            setStats(prev => ({ ...prev, totalUsers: prev.totalUsers - 1 }))
        } catch (error) {
            console.error('Delete error:', error)
            alert('Failed to delete user.')
        } finally {
            setActionLoading(null)
        }
    }

    const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
    const [editForm, setEditForm] = useState({ full_name: '', username: '' })

    const handleEditUser = (u: AdminUser) => {
        setEditingUser(u)
        setEditForm({ full_name: u.full_name || '', username: u.username || '' })
    }

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingUser) return
        setActionLoading(editingUser.id)
        try {
            const { error } = await supabase
                .from('users')
                .update({ full_name: editForm.full_name, username: editForm.username })
                .eq('id', editingUser.id)

            if (error) throw error
            setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, full_name: editForm.full_name, username: editForm.username } : u))
            setEditingUser(null)
        } catch (error) {
            console.error('Update error:', error)
            alert('Failed to update user. Check if username is taken.')
        } finally {
            setActionLoading(null)
        }
    }



    const handleLogout = async () => {
        await supabase.auth.signOut()
        setIsAdmin(false)
        navigate('/1234/admin', { replace: true })
    }

    if (!isAdmin) return null

    const statCards = [
        { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-400' },
        { label: 'Total Chats', value: stats.activeChats, icon: MessageSquare, color: 'text-emerald-400' },
        { label: 'Total Messages', value: stats.totalMessages, icon: BarChart3, color: 'text-amber-400' },
        { label: 'Banned Users', value: stats.bannedUsers, icon: Ban, color: 'text-red-400' },
        { label: 'Active Statuses', value: stats.activeStatuses, icon: CheckCircle, color: 'text-purple-400' },
    ]

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row">
            {/* Sidebar */}
            <div className="w-full md:w-56 bg-zinc-900 border-r border-zinc-800 shrink-0 p-4 flex flex-col gap-2 md:h-screen md:sticky md:top-0">
                <div className="flex items-center gap-3 mb-6 px-2">
                    <ShieldAlert className="w-7 h-7 text-red-500" />
                    <h1 className="text-lg font-bold">Admin</h1>
                </div>

                <nav className="space-y-1 flex-1">
                    {[
                        { label: 'Overview', tab: 'overview' as const, icon: BarChart3 },
                        { label: 'User Management', tab: 'users' as const, icon: Users },
                    ].map(({ label, tab, icon: Icon }) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${activeTab === tab ? 'bg-red-950/50 text-red-400 border border-red-900/50' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'}`}
                        >
                            <Icon className="w-4 h-4 shrink-0" />
                            {label}
                        </button>
                    ))}
                </nav>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-red-950/30 transition-colors text-left"
                >
                    <LogOut className="w-4 h-4" /> Sign Out
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 overflow-y-auto">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold">Dashboard Overview</h2>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                                onClick={fetchAllData}
                                disabled={isLoading}
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                            {statCards.map(({ label, value, icon: Icon, color }) => (
                                <div key={label} className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-sm text-zinc-400 font-medium">{label}</p>
                                        <Icon className={`w-5 h-5 ${color}`} />
                                    </div>
                                    <p className="text-3xl font-bold">{isLoading ? '...' : value.toLocaleString()}</p>
                                </div>
                            ))}
                        </div>

                        {/* Recent users preview */}
                        <h3 className="text-lg font-bold mb-3">Recent Registrations</h3>
                        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                            {users.slice(0, 5).map(u => (
                                <div key={u.id} className="flex items-center gap-4 px-5 py-4 border-b border-zinc-800 last:border-0">
                                    <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 font-bold text-sm text-zinc-400 overflow-hidden">
                                        {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" alt="" /> : u.full_name?.charAt(0) || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{u.full_name}</p>
                                        <p className="text-xs text-zinc-500">@{u.username}</p>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.is_banned ? 'bg-red-500/10 text-red-400' : u.is_online ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                        {u.is_banned ? 'Banned' : u.is_online ? 'Online' : 'Offline'}
                                    </span>
                                    <span className="text-xs text-zinc-600 hidden sm:block">{format(new Date(u.created_at), 'MMM d, yyyy')}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                            <h2 className="text-2xl font-bold">User Management</h2>
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <Input
                                    type="text"
                                    placeholder="Search users..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-red-500"
                                />
                            </div>
                        </div>

                        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-zinc-950 border-b border-zinc-800">
                                        <tr>
                                            <th className="px-5 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">User</th>
                                            <th className="px-5 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden sm:table-cell">Email</th>
                                            <th className="px-5 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden md:table-cell">Joined</th>
                                            <th className="px-5 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status</th>
                                            <th className="px-5 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800">
                                        {isLoading ? (
                                            <tr>
                                                <td colSpan={5} className="px-5 py-10 text-center text-zinc-500">
                                                    <RefreshCw className="inline w-5 h-5 animate-spin mr-2" />
                                                    Loading users...
                                                </td>
                                            </tr>
                                        ) : filteredUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-5 py-10 text-center text-zinc-500">
                                                    No users found.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredUsers.map(u => (
                                                <tr key={u.id} className={`hover:bg-zinc-800/50 transition-colors ${u.is_banned ? 'opacity-60' : ''}`}>
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-400 shrink-0 overflow-hidden">
                                                                {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" alt="" /> : u.full_name?.charAt(0) || '?'}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-medium truncate">{u.full_name}</p>
                                                                <p className="text-xs text-zinc-500">@{u.username}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4 text-zinc-400 hidden sm:table-cell truncate max-w-[160px]">{u.email}</td>
                                                    <td className="px-5 py-4 text-zinc-500 text-xs hidden md:table-cell">
                                                        {format(new Date(u.created_at), 'MMM d, yyyy')}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${u.is_banned ? 'bg-red-500/10 text-red-400' : u.is_online ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                                                            {u.is_banned ? 'Banned' : u.is_online ? 'Online' : 'Offline'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                disabled={actionLoading === u.id}
                                                                onClick={() => handleEditUser(u)}
                                                                className="h-8 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                                            >
                                                                Edit
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                disabled={actionLoading === u.id}
                                                                onClick={() => handleToggleBan(u)}
                                                                className={`h-8 text-xs ${u.is_banned ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10' : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'}`}
                                                            >
                                                                {u.is_banned ? (
                                                                    <><CheckCircle className="w-3.5 h-3.5 mr-1" /> Unban</>
                                                                ) : (
                                                                    <><Ban className="w-3.5 h-3.5 mr-1" /> Ban</>
                                                                )}
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                disabled={actionLoading === u.id}
                                                                onClick={() => handleDeleteUser(u)}
                                                                className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                            >
                                                                <UserX className="w-3.5 h-3.5 mr-1" /> Delete
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {filteredUsers.length > 0 && (
                                <div className="px-5 py-3 border-t border-zinc-800 text-xs text-zinc-500">
                                    Showing {filteredUsers.length} of {users.length} users
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Edit User Modal */}
                {editingUser && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold">Edit User Profile</h3>
                                <button onClick={() => setEditingUser(null)} className="text-zinc-500 hover:text-zinc-300">
                                    ✕
                                </button>
                            </div>
                            <form onSubmit={handleUpdateUser} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm text-zinc-400">Full Name</label>
                                    <Input
                                        value={editForm.full_name}
                                        onChange={e => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                                        className="bg-zinc-950 border-zinc-800 text-zinc-100"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm text-zinc-400">Username</label>
                                    <Input
                                        value={editForm.username}
                                        onChange={e => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                                        className="bg-zinc-950 border-zinc-800 text-zinc-100"
                                        required
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800 mt-4">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setEditingUser(null)}
                                        className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={actionLoading === editingUser.id}
                                        className="bg-red-600 hover:bg-red-500 text-white px-6"
                                    >
                                        {actionLoading === editingUser.id ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

