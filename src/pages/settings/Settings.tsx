import { useState, useEffect } from 'react'
import { LogOut, User, Moon, Sun, Lock, Edit2, Camera } from 'lucide-react'
import { differenceInDays, addDays, format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'
import { useThemeStore } from '../../store/useThemeStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export default function Settings() {
    const { user, profile, setProfile } = useAuthStore()
    const { theme, setTheme, color, setColor } = useThemeStore()

    const [isEditingProfile, setIsEditingProfile] = useState(false)
    const [editForm, setEditForm] = useState({
        full_name: profile?.full_name || '',
        username: profile?.username || '',
    })
    const [isUpdating, setIsUpdating] = useState(false)
    const [isPrivate, setIsPrivate] = useState(profile?.is_private || false)
    const [usernameError, setUsernameError] = useState<string | null>(null)

    // Re-sync form when profile loads
    useEffect(() => {
        if (profile) {
            setEditForm({
                full_name: profile.full_name || '',
                username: profile.username || '',
            })
            setIsPrivate(profile.is_private || false)
        }
    }, [profile])

    // Apply dark/light mode
    const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
        const root = document.documentElement
        if (newTheme === 'dark') {
            root.classList.add('dark')
        } else if (newTheme === 'light') {
            root.classList.remove('dark')
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
            prefersDark ? root.classList.add('dark') : root.classList.remove('dark')
        }
        setTheme(newTheme)
    }

    // Calculate username cooldown
    const getUsernameCooldownInfo = () => {
        const changedAt = (profile as any)?.username_changed_at
        if (!changedAt) return null
        const changedDate = new Date(changedAt)
        const now = new Date()
        const daysSince = differenceInDays(now, changedDate)
        if (daysSince >= 5) return null // cooldown passed
        const nextChangeDate = addDays(changedDate, 5)
        const daysLeft = 5 - daysSince
        return { daysLeft, nextChangeDate }
    }

    const cooldownInfo = getUsernameCooldownInfo()

    const handleSignOut = async () => {
        if (user) {
            await supabase.from('users').update({ is_online: false }).eq('id', user.id)
        }
        await supabase.auth.signOut()
    }

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        setUsernameError(null)

        // Check username cooldown
        if (editForm.username !== profile?.username) {
            if (cooldownInfo) {
                setUsernameError(
                    `You can change your username in ${cooldownInfo.daysLeft} day${cooldownInfo.daysLeft > 1 ? 's' : ''} (after ${format(cooldownInfo.nextChangeDate, 'MMM d, yyyy')}).`
                )
                return
            }
        }

        try {
            setIsUpdating(true)
            const updateData: any = { full_name: editForm.full_name }
            if (editForm.username !== profile?.username) {
                updateData.username = editForm.username
                updateData.username_changed_at = new Date().toISOString()
            }

            const { data, error } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', user.id)
                .select()
                .single()

            if (error) {
                if (error.code === '23505') {
                    setUsernameError('That username is already taken. Please choose another.')
                } else {
                    throw error
                }
                return
            }
            if (data) setProfile(data)
            setIsEditingProfile(false)
        } catch (error) {
            console.error('Failed to update profile:', error)
            alert('Failed to update profile.')
        } finally {
            setIsUpdating(false)
        }
    }

    const togglePrivacy = async () => {
        if (!user) return
        const newPrivacy = !isPrivate
        setIsPrivate(newPrivacy)
        try {
            const { error } = await supabase
                .from('users')
                .update({ is_private: newPrivacy })
                .eq('id', user.id)
            if (error) throw error
            if (profile) setProfile({ ...profile, is_private: newPrivacy })
        } catch (error) {
            console.error('Failed to update privacy:', error)
            setIsPrivate(!newPrivacy)
        }
    }

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !user) return

        try {
            setIsUpdating(true)
            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}-${Date.now()}.${fileExt}`

            // Upload to avatars bucket (no folder prefix — bucket is 'avatars')
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, { upsert: true })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName)

            const { data: updatedProfile, error: updateError } = await supabase
                .from('users')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id)
                .select()
                .single()

            if (updateError) throw updateError
            if (updatedProfile) setProfile(updatedProfile)
        } catch (error) {
            console.error('Failed to upload avatar:', error)
            alert('Failed to upload avatar. Check storage bucket permissions.')
        } finally {
            setIsUpdating(false)
        }
    }

    const colorOptions = [
        { id: 'sky-blue', label: 'Sky Blue', bg: 'bg-sky-500' },
        { id: 'violet', label: 'Violet', bg: 'bg-violet-500' },
        { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-500' },
        { id: 'rose', label: 'Rose', bg: 'bg-rose-500' },
        { id: 'amber', label: 'Amber', bg: 'bg-amber-500' },
    ]

    return (
        <div className="flex flex-col h-full bg-background overflow-y-auto">
            <div className="p-4 border-b border-border shrink-0">
                <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            </div>

            <div className="p-4 space-y-5 pb-24">

                {/* Profile Section */}
                <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold flex items-center gap-2">
                            <User className="w-5 h-5 text-primary" /> Profile
                        </h2>
                        {!isEditingProfile && (
                            <Button variant="ghost" size="sm" onClick={() => setIsEditingProfile(true)}>
                                <Edit2 className="w-4 h-4 mr-1" /> Edit
                            </Button>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-4">
                        <div className="relative group shrink-0">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} className="w-24 h-24 rounded-full object-cover border-4 border-background shadow-md bg-secondary" alt="Avatar" />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-3xl border-4 border-background shadow-md">
                                    {profile?.full_name?.charAt(0) || '?'}
                                </div>
                            )}
                            <label className="absolute inset-0 bg-black/50 text-white rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer gap-1">
                                <Camera className="w-5 h-5" />
                                <span className="text-[10px] font-medium">Change</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={isUpdating} />
                            </label>
                        </div>

                        {!isEditingProfile ? (
                            <div className="text-center sm:text-left">
                                <h3 className="text-xl font-bold">{profile?.full_name || 'Loading...'}</h3>
                                <p className="text-muted-foreground">@{profile?.username || ''}</p>
                                <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
                            </div>
                        ) : (
                            <form onSubmit={handleUpdateProfile} className="flex-1 w-full space-y-3">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Full Name</label>
                                    <Input
                                        value={editForm.full_name}
                                        onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                                        placeholder="Full Name"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Username</label>
                                    <Input
                                        value={editForm.username}
                                        onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                                        placeholder="username"
                                        required
                                        disabled={!!cooldownInfo}
                                    />
                                    {cooldownInfo && (
                                        <p className="text-xs text-amber-500">
                                            Username locked for {cooldownInfo.daysLeft} more day{cooldownInfo.daysLeft > 1 ? 's' : ''}. Available after {format(cooldownInfo.nextChangeDate, 'MMM d, yyyy')}.
                                        </p>
                                    )}
                                    {usernameError && <p className="text-xs text-destructive">{usernameError}</p>}
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <Button type="button" variant="outline" size="sm" onClick={() => {
                                        setIsEditingProfile(false)
                                        setEditForm({ full_name: profile?.full_name || '', username: profile?.username || '' })
                                        setUsernameError(null)
                                    }}>Cancel</Button>
                                    <Button type="submit" size="sm" disabled={isUpdating}>{isUpdating ? 'Saving...' : 'Save'}</Button>
                                </div>
                            </form>
                        )}
                    </div>
                </section>

                {/* Appearance Section */}
                <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                    <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
                        {theme === 'dark' ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
                        Appearance
                    </h2>

                    <div className="space-y-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-sm">Theme Mode</p>
                                <p className="text-xs text-muted-foreground">Toggle between light and dark</p>
                            </div>
                            <div className="flex bg-secondary p-1 rounded-lg gap-1">
                                {(['light', 'dark'] as const).map((t) => (
                                    <button
                                        key={t}
                                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${theme === t ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                        onClick={() => applyTheme(t)}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <p className="font-medium text-sm mb-3">Accent Color</p>
                            <div className="flex gap-3">
                                {colorOptions.map(colorItem => (
                                    <button
                                        key={colorItem.id}
                                        title={colorItem.label}
                                        onClick={() => setColor(colorItem.id)}
                                        className={`w-8 h-8 rounded-full ${colorItem.bg} flex items-center justify-center transition-transform ${color === colorItem.id ? 'ring-2 ring-offset-2 ring-ring scale-110' : 'hover:scale-105'}`}
                                    >
                                        {color === colorItem.id && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Privacy Section */}
                <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                    <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
                        <Lock className="w-5 h-5 text-primary" /> Privacy & Security
                    </h2>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-sm">Private Account</p>
                                <p className="text-xs text-muted-foreground">Only contacts can see your full profile</p>
                            </div>
                            <button
                                onClick={togglePrivacy}
                                className={`relative w-11 h-6 rounded-full transition-colors ${isPrivate ? 'bg-primary' : 'bg-muted'}`}
                            >
                                <span
                                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${isPrivate ? 'left-6' : 'left-1'}`}
                                />
                            </button>
                        </div>

                        <div className="pt-4 border-t border-border">
                            <h3 className="text-sm font-semibold mb-3">Blocked Users</h3>
                            <BlockedUsersList />
                        </div>
                    </div>
                </section>


                {/* Sign Out */}
                <Button
                    variant="destructive"
                    className="w-full flex items-center justify-center gap-2"
                    onClick={handleSignOut}
                >
                    <LogOut className="w-4 h-4" /> Sign Out
                </Button>

            </div>
        </div>
    )
}

function BlockedUsersList() {
    const { user } = useAuthStore()
    const [blockedUsers, setBlockedUsers] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchBlocked = async () => {
        if (!user) return
        try {
            setIsLoading(true)
            const { data, error } = await supabase
                .from('blocked_users')
                .select(`
                    id, 
                    blocked_id, 
                    profiles:users!blocked_users_blocked_id_fkey(full_name, username, avatar_url)
                `)
                .eq('blocker_id', user.id)


            if (error) {
                console.error('Fetch blocked error:', error)
                throw error
            }
            setBlockedUsers(data || [])
        } catch (error) {
            console.error('Failed to fetch blocked users:', error)
        } finally {
            setIsLoading(false)
        }
    }


    useEffect(() => {
        fetchBlocked()

        const channel = supabase
            .channel('settings_blocked_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'blocked_users',
                filter: `blocker_id=eq.${user?.id}`
            }, () => {
                fetchBlocked()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user])

    const handleUnblock = async (id: string, name: string) => {
        if (!confirm(`Unblock ${name}?`)) return
        try {
            // Get the record first to know who was blocked
            const { data: blockData } = await supabase
                .from('blocked_users')
                .select('blocker_id, blocked_id')
                .eq('id', id)
                .single()

            if (blockData) {
                // Restore visibility for both participants in their direct chat
                // 1. Find the direct chat between these two
                const { data: chats } = await supabase
                    .from('chat_participants')
                    .select('chat_id')
                    .eq('user_id', blockData.blocker_id)

                const chatIds = chats?.map(c => c.chat_id) || []

                if (chatIds.length > 0) {
                    const { data: commonChat } = await supabase
                        .from('chat_participants')
                        .select('chat_id')
                        .in('chat_id', chatIds)
                        .eq('user_id', blockData.blocked_id)
                        .single()

                    if (commonChat) {
                        // Reset is_deleted for both
                        await supabase
                            .from('chat_participants')
                            .update({ is_deleted: false })
                            .eq('chat_id', commonChat.chat_id)
                    }
                }
            }

            const { error } = await supabase
                .from('blocked_users')
                .delete()
                .eq('id', id)

            if (error) throw error
            setBlockedUsers(prev => prev.filter(u => u.id !== id))
            alert(`${name} unblocked. Chat visibility restored.`)
        } catch (error) {
            console.error('Failed to unblock user:', error)
            alert('Failed to unblock user.')
        }
    }


    if (isLoading) return <p className="text-xs text-muted-foreground animate-pulse">Loading blocked list...</p>
    if (blockedUsers.length === 0) return <p className="text-xs text-muted-foreground italic">No blocked users.</p>

    return (
        <div className="space-y-3">
            {blockedUsers.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-secondary/30 p-2 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs text-primary overflow-hidden">
                            {item.profiles?.avatar_url ? (
                                <img src={item.profiles.avatar_url} className="w-full h-full object-cover" />
                            ) : (
                                item.profiles?.full_name?.charAt(0) || '?'
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold truncate">{item.profiles?.full_name || 'Loading...'}</p>
                            <p className="text-[10px] text-muted-foreground truncate">@{item.profiles?.username || 'user'}</p>
                        </div>


                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px] text-destructive hover:bg-destructive/10"
                        onClick={() => handleUnblock(item.id, item.profiles?.full_name)}

                    >
                        Unblock
                    </Button>
                </div>
            ))}
        </div>
    )
}

