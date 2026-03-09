import { useState, useEffect, useRef } from 'react'
import { formatDistanceToNow } from 'date-fns'
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'
import { Smile, Send, Eye, Users, Trash2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'
import { Button } from '../../components/ui/Button'


export default function StatusFeed() {
    const { user } = useAuthStore()
    const [statuses, setStatuses] = useState<any[]>([])
    const [newStatus, setNewStatus] = useState('')
    const [visibility, setVisibility] = useState('anyone')
    const [bgColor, setBgColor] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const emojiPickerRef = useRef<HTMLDivElement>(null)

    const statusColors = [
        { id: 'blue', class: 'bg-blue-500' },
        { id: 'purple', class: 'bg-purple-500' },
        { id: 'green', class: 'bg-green-500' },
        { id: 'red', class: 'bg-red-500' },
        { id: 'orange', class: 'bg-orange-500' },
        { id: 'pink', class: 'bg-pink-500' },
    ]

    useEffect(() => {
        if (!user) return

        const fetchStatuses = async () => {
            try {
                setIsLoading(true)
                // Fetch statuses where visibility is anyone, or where user is in our contacts (chats we have together)
                // For simplicity right now, we just pull 'anyone' statuses + our own active statuses
                // plus contacts' logic could be extended.
                const { data, error } = await supabase
                    .from('statuses')
                    .select('*, users(full_name, avatar_url, username)')
                    .gt('expires_at', new Date().toISOString()) // Only non-expired
                    .or(`visibility.eq.anyone,user_id.eq.${user.id}`)
                    .order('created_at', { ascending: false })

                if (error) throw error
                setStatuses(data || [])
            } catch (error) {
                console.error('Failed to load statuses:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchStatuses()
    }, [user])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false)
            }
        }

        if (showEmojiPicker) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showEmojiPicker])

    const handlePostStatus = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newStatus.trim() || !user) return

        const expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + 24) // 24 hours from now

        try {
            const { data, error } = await supabase
                .from('statuses')
                .insert({
                    user_id: user.id,
                    content: newStatus.trim(),
                    visibility,
                    expires_at: expiresAt.toISOString(),
                    background_color: bgColor
                })
                .select('*, users(full_name, avatar_url, username)')
                .single()

            if (error) throw error

            setStatuses(prev => [data, ...prev])
            setNewStatus('')
            setBgColor(null)
            setShowEmojiPicker(false)
        } catch (error) {
            console.error('Failed to post status:', error)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await supabase.from('statuses').delete().eq('id', id)
            setStatuses(prev => prev.filter(s => s.id !== id))
        } catch (error) {
            console.error('Failed to delete status:', error)
        }
    }

    return (
        <div className="flex flex-col h-full bg-background mt-safe">
            <div className="p-4 border-b shrink-0 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground">Status Updates</h1>
            </div>

            <div className="p-4 shrink-0 bg-secondary/20">
                <h2 className="text-sm font-semibold mb-3 text-muted-foreground">My Status</h2>

                <div className={`bg-card border rounded-xl p-3 shadow-sm relative transition-colors ${bgColor ? statusColors.find(c => c.id === bgColor)?.class + ' !border-none' : ''}`}>
                    <form onSubmit={handlePostStatus} className="flex flex-col gap-3">
                        <textarea
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            placeholder="What's on your mind?"
                            maxLength={500}
                            className={`w-full min-h-[100px] p-3 resize-none border-none bg-transparent outline-none text-lg font-medium placeholder:text-muted-foreground/60 ${bgColor ? 'text-white placeholder:text-white/60' : 'text-foreground'}`}
                        />

                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <button
                                type="button"
                                onClick={() => setBgColor(null)}
                                className={`w-6 h-6 rounded-full border-2 border-white/20 flex items-center justify-center text-[10px] ${!bgColor ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                                title="Default"
                            >
                                ✕
                            </button>
                            {statusColors.map(color => (
                                <button
                                    key={color.id}
                                    type="button"
                                    onClick={() => setBgColor(color.id)}
                                    className={`w-6 h-6 rounded-full ${color.class} border-2 border-white/20 transition-transform hover:scale-110 ${bgColor === color.id ? 'ring-2 ring-white ring-offset-1 scale-110' : ''}`}
                                />
                            ))}
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className={bgColor ? 'text-white hover:bg-white/20' : 'text-muted-foreground'}
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                >
                                    <Smile className="h-5 w-5" />
                                </Button>

                                <select
                                    className={`bg-transparent text-sm outline-none ${bgColor ? 'text-white' : 'text-muted-foreground'}`}
                                    value={visibility}
                                    onChange={(e) => setVisibility(e.target.value)}
                                >
                                    <option value="anyone" className="text-black">Anyone</option>
                                    <option value="contacts" className="text-black">Contacts Only</option>
                                </select>
                            </div>

                            <Button
                                type="submit"
                                size="sm"
                                disabled={!newStatus.trim()}
                                variant={bgColor ? 'secondary' : 'default'}
                                className={bgColor ? 'bg-white text-black hover:bg-white/90' : ''}
                            >
                                <Send className="h-4 w-4 mr-2" /> Post
                            </Button>
                        </div>
                    </form>

                    {showEmojiPicker && (
                        <div ref={emojiPickerRef} className="absolute top-16 left-0 z-50 shadow-xl">
                            <Picker
                                data={data}
                                onEmojiSelect={(emoji: any) => setNewStatus(prev => prev + emoji.native)}
                                theme="auto"
                            />
                        </div>
                    )}
                </div>
            </div>


            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <h2 className="text-sm font-semibold text-muted-foreground mb-2">Recent Updates</h2>

                {isLoading ? (
                    <div className="flex justify-center p-4">
                        <span className="text-muted-foreground animate-pulse text-sm">Loading statuses...</span>
                    </div>
                ) : statuses.length > 0 ? (
                    <div className="space-y-4">
                        {statuses.map(status => (
                            <StatusItem
                                key={status.id}
                                status={status}
                                userId={user?.id}
                                onDelete={handleDelete}
                                statusColors={statusColors}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center p-8 text-muted-foreground">
                        No recent status updates from anyone. Be the first to post!
                    </div>
                )}
            </div>
        </div>
    )
}

function StatusItem({ status, userId, onDelete, statusColors }: any) {
    const [viewCount, setViewCount] = useState(0)
    const [showViewers, setShowViewers] = useState(false)
    const [viewers, setViewers] = useState<any[]>([])
    const isMine = status.user_id === userId
    const statusColor = statusColors.find((c: any) => c.id === status.background_color)

    useEffect(() => {
        // Track view if not mine
        if (!isMine && userId) {
            supabase
                .from('status_views')
                .upsert({ status_id: status.id, viewer_id: userId }, { onConflict: 'status_id,viewer_id' })
                .then(() => { })
        }

        // Fetch view count
        const fetchViewCount = async () => {
            const { count } = await supabase
                .from('status_views')
                .select('*', { count: 'exact', head: true })
                .eq('status_id', status.id)
            setViewCount(count || 0)
        }
        fetchViewCount()
    }, [status.id, isMine, userId])

    const fetchViewers = async () => {
        const { data, error } = await supabase
            .from('status_views')
            .select('*, viewer:users!status_views_viewer_id_fkey(full_name, avatar_url, username)')
            .eq('status_id', status.id)
            .order('viewed_at', { ascending: false })

        if (!error) setViewers(data || [])
        setShowViewers(true)
    }

    const userInfo = status.users

    return (
        <div className={`relative flex gap-4 p-4 rounded-xl border shadow-sm transition-colors ${statusColor ? statusColor.class + ' !border-none text-white' : 'bg-card'}`}>
            <div className="shrink-0 relative">
                <div className={`w-12 h-12 rounded-full ring-2 ring-primary ring-offset-2 ring-offset-background p-[2px] ${statusColor ? 'ring-white/50 ring-offset-transparent' : ''}`}>
                    {userInfo?.avatar_url ? (
                        <img
                            src={userInfo.avatar_url}
                            className="w-full h-full rounded-full object-cover bg-secondary"
                        />
                    ) : (
                        <div className={`w-full h-full rounded-full flex items-center justify-center font-bold ${statusColor ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'}`}>
                            {userInfo?.full_name?.charAt(0) || '?'}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                    <h3 className={`font-semibold truncate max-w-[70%] ${statusColor ? 'text-white' : 'text-foreground'}`}>
                        {isMine ? 'You' : userInfo?.full_name}
                    </h3>
                    <span className={`text-xs shrink-0 mt-1 ${statusColor ? 'text-white/70' : 'text-muted-foreground'}`}>
                        {formatDistanceToNow(new Date(status.created_at))} ago
                    </span>
                </div>

                <p className={`text-sm break-words whitespace-pre-wrap ${statusColor ? 'text-white text-lg font-medium leading-relaxed' : 'text-foreground'}`}>
                    {status.content}
                </p>

                <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {isMine && (
                            <button
                                onClick={fetchViewers}
                                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${statusColor ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-secondary hover:bg-muted text-muted-foreground'}`}
                            >
                                <Eye className="h-3 w-3" />
                                <span>{viewCount} views</span>
                            </button>
                        )}
                        {!isMine && (
                            <div className={`flex items-center gap-1 text-xs opacity-70 ${statusColor ? 'text-white' : 'text-muted-foreground'}`}>
                                <Eye className="h-3 w-3" />
                                <span>Seen</span>
                            </div>
                        )}
                    </div>

                    {isMine && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`h-7 px-2 text-xs ${statusColor ? 'text-white hover:bg-white/20' : 'text-destructive'}`}
                            onClick={() => onDelete(status.id)}
                        >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Delete
                        </Button>
                    )}
                </div>
            </div>

            {/* Viewers Modal */}
            {showViewers && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-card border w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="font-bold flex items-center gap-2">
                                <Users className="h-4 w-4 text-primary" />
                                Viewed by ({viewers.length})
                            </h3>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowViewers(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto p-2">
                            {viewers.length > 0 ? viewers.map((view) => (
                                <div key={view.id} className="flex items-center gap-3 p-2 hover:bg-secondary/50 rounded-xl transition-colors">
                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary shrink-0">
                                        {view.viewer?.avatar_url ? (
                                            <img src={view.viewer.avatar_url} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center font-bold text-primary">
                                                {view.viewer?.full_name?.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-sm truncate">{view.viewer?.full_name}</p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {formatDistanceToNow(new Date(view.viewed_at))} ago
                                        </p>
                                    </div>
                                </div>
                            )) : (
                                <div className="py-8 text-center text-muted-foreground text-sm">
                                    No views yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
