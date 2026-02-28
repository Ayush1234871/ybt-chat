import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'
import { Input } from '../../components/ui/Input'
import { useChatStore } from '../../store/useChatStore'

export default function Home() {
    const { user } = useAuthStore()
    const { chats, setChats } = useChatStore()
    const [searchQuery, setSearchQuery] = useState('')
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (!user) return

        const loadChats = async () => {
            try {
                setIsLoading(true)

                // Fetch blocked users to filter them out
                const { data: blockedData } = await supabase
                    .from('blocked_users')
                    .select('blocked_id')
                    .eq('blocker_id', user.id)

                const blockedUserIds = blockedData?.map(b => b.blocked_id) || []

                // Fetch all chat basic info
                const { data: participantData, error: pError } = await supabase
                    .from('chat_participants')
                    .select('chat_id, cleared_at')
                    .eq('user_id', user.id)
                    .eq('is_deleted', false)

                if (pError) throw pError

                if (!participantData?.length) {
                    setChats([])
                    return
                }

                const chatIds = participantData.map(p => p.chat_id)

                // Fetch full chat details including other participants and latest message
                const { data: chatData, error: cError } = await supabase
                    .from('chats')
                    .select(`
            id,
            type,
            created_at,
            participants:chat_participants(user_id, users(full_name, username, avatar_url, is_online)),
            messages(id, content, type, is_read, sender_id, created_at)
          `)
                    .in('id', chatIds)
                    .order('created_at', { referencedTable: 'messages', ascending: false })
                    .limit(1, { referencedTable: 'messages' })

                if (cError) throw cError

                // Process chats to inject our cleared_at and filter messages
                const processedChats = chatData.map((chat: any) => {
                    const myParticipantInfo = participantData.find(p => p.chat_id === chat.id)
                    const clearedAt = myParticipantInfo?.cleared_at || '1970-01-01T00:00:00Z'

                    // Filter messages to only those newer than cleared_at
                    const filteredMessages = chat.messages.filter((m: any) =>
                        new Date(m.created_at) > new Date(clearedAt)
                    )

                    return {
                        ...chat,
                        messages: filteredMessages
                    }
                })

                // Final filter: remove chats where the other user is blocked
                const visibleChats = processedChats.filter((chat: any) => {
                    const otherId = chat.participants.find((p: any) => p.user_id !== user.id)?.user_id
                    return !blockedUserIds.includes(otherId)
                })

                setChats(visibleChats as any)
            } catch (error) {
                console.error('Failed to load chats:', error)
            } finally {
                setIsLoading(false)
            }
        }

        loadChats()

        // Realtime Subscription
        const channel = supabase
            .channel('home_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'chat_participants', filter: `user_id=eq.${user.id}` },
                () => loadChats()
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                () => loadChats()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'blocked_users', filter: `blocker_id=eq.${user.id}` },
                () => loadChats()
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user, setChats])

    const filteredChats = chats.filter(chat => {
        if (!searchQuery) return true
        const otherParticipant = chat.participants.find((p: any) => p.user_id !== user?.id)?.users
        return otherParticipant?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            otherParticipant?.username.toLowerCase().includes(searchQuery.toLowerCase())
    })

    // Sort chats by latest message created_at
    const sortedChats = [...filteredChats].sort((a, b) => {
        // Supabase can return joined records as arrays.
        const getLatestMessageTime = (chat: any) => {
            const msgs = chat.messages
            if (Array.isArray(msgs) && msgs.length > 0) {
                // Handle potentially nested array [[{...}]] or [{...}]
                const latestMsg = Array.isArray(msgs[0]) ? msgs[0][0] : msgs[0]
                return latestMsg?.created_at || chat.created_at
            }
            return chat.created_at
        }

        const timeA = getLatestMessageTime(a)
        const timeB = getLatestMessageTime(b)

        return new Date(timeB).getTime() - new Date(timeA).getTime()
    })

    return (
        <div className="flex flex-col h-full bg-background mt-safe">
            <div className="p-4 border-b shrink-0 flex items-center justify-between bg-card/50">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Chats</h1>
                    <p className="text-[10px] text-muted-foreground">Logged in as: {user?.email}</p>
                </div>
            </div>

            <div className="p-4 shrink-0">
                <Input
                    type="text"
                    placeholder="Search contacts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-secondary/50 border-none"
                />
            </div>

            <div className="flex-1 overflow-y-auto w-full">
                {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                        <span className="text-muted-foreground animate-pulse">Loading chats...</span>
                    </div>
                ) : sortedChats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center mt-10">
                        <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                            <span className="text-2xl">💬</span>
                        </div>
                        <h3 className="text-lg font-medium mb-2">No chats yet</h3>
                        <p className="text-muted-foreground mb-6">
                            Start a new conversation with a contact or try a random chat.
                        </p>
                        <Link to="/search" className="text-primary hover:underline font-medium">
                            Start new chat
                        </Link>
                    </div>
                ) : (
                    <div className="divide-y divide-border/50">
                        {sortedChats.map(chat => {
                            const otherParticipantInfo = chat.participants.find((p: any) => p.user_id !== user?.id)?.users
                            const msgs = chat.messages
                            const latestMessage = Array.isArray(msgs) && msgs.length > 0
                                ? (Array.isArray(msgs[0]) ? msgs[0][0] : msgs[0])
                                : null

                            const isUnread = latestMessage && !latestMessage.is_read && latestMessage.sender_id !== user?.id

                            return (
                                <Link
                                    key={chat.id}
                                    to={`/chat/${chat.id}`}
                                    className="flex items-center p-4 hover:bg-secondary/40 transition-colors"
                                >
                                    <div className="relative shrink-0">
                                        {otherParticipantInfo?.avatar_url ? (
                                            <img
                                                src={otherParticipantInfo.avatar_url}
                                                alt={otherParticipantInfo.full_name}
                                                className="w-14 h-14 rounded-full object-cover bg-secondary"
                                            />
                                        ) : (
                                            <div className="w-14 h-14 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-lg">
                                                {otherParticipantInfo?.full_name?.charAt(0) || '?'}
                                            </div>
                                        )}
                                        {otherParticipantInfo?.is_online && (
                                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background"></div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0 ml-4">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className="text-base font-semibold truncate pr-2 text-foreground">
                                                {otherParticipantInfo?.full_name || 'Unknown User'}
                                            </h3>
                                            <span className="text-xs shrink-0 text-muted-foreground">
                                                {latestMessage?.created_at ? format(new Date(latestMessage.created_at), 'HH:mm') : format(new Date(chat.created_at), 'MMM d')}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <p className={`text-sm truncate ${isUnread ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                                                {latestMessage?.type === 'image' ? '📷 Image' : (latestMessage?.content || 'No messages yet')}
                                            </p>
                                            {isUnread && (
                                                <div className="w-2.5 h-2.5 bg-primary rounded-full shrink-0 ml-2"></div>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
