import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'
import { Smile, Send } from 'lucide-react'
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
                        <div className="absolute top-16 left-0 z-50 shadow-xl">
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
                        {statuses.map(status => {
                            const isMine = status.user_id === user?.id
                            const userInfo = status.users
                            const statusColor = statusColors.find(c => c.id === status.background_color)

                            return (
                                <div key={status.id} className={`flex gap-4 p-4 rounded-xl border shadow-sm transition-colors ${statusColor ? statusColor.class + ' !border-none text-white' : 'bg-card'}`}>
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


                                        {isMine && (
                                            <div className="mt-2 flex justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className={`h-7 px-2 text-xs ${statusColor ? 'text-white hover:bg-white/20' : 'text-destructive'}`}
                                                    onClick={() => handleDelete(status.id)}
                                                >
                                                    Delete
                                                </Button>
                                            </div>

                                        )}
                                    </div>
                                </div>
                            )
                        })}
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
