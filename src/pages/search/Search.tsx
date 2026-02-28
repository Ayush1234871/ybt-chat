import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search as SearchIcon, Shuffle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

export default function Search() {
    const { user } = useAuthStore()
    const navigate = useNavigate()
    const searchParams = new URL(window.location.href).searchParams
    const forwardContent = searchParams.get('forwardContent')
    const forwardType = searchParams.get('forwardType')
    const forwardImage = searchParams.get('forwardImage')

    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isRandomChatting, setIsRandomChatting] = useState(false)

    useEffect(() => {
        if (!searchQuery.trim() || !user) {
            setSearchResults([])
            return
        }

        const delayDebounceFn = setTimeout(async () => {
            try {
                setIsLoading(true)
                const { data, error } = await supabase
                    .from('users')
                    .select('id, full_name, username, avatar_url, is_private, is_online')
                    .neq('id', user.id)
                    .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
                    .limit(20)

                if (error) throw error
                setSearchResults(data || [])
            } catch (error) {
                console.error('Search error:', error)
            } finally {
                setIsLoading(false)
            }
        }, 500)

        return () => clearTimeout(delayDebounceFn)
    }, [searchQuery, user])

    const handleStartChat = async (targetUserId: string) => {
        if (!user) return

        try {
            // 1. Get or Create a direct chat atomically
            const { data: chatId, error: rpcError } = await supabase
                .rpc('get_or_create_direct_chat', {
                    user_a_id: user.id,
                    user_b_id: targetUserId
                })

            if (rpcError) throw rpcError
            if (!chatId) throw new Error('Failed to create or retrieve chat.')

            // 2. Handle forwarding if needed
            if (forwardContent || forwardImage) {
                const { error: sendError } = await supabase
                    .from('messages')
                    .insert({
                        chat_id: chatId,
                        sender_id: user.id,
                        type: forwardType || 'text',
                        content: forwardContent || '',
                        image_url: forwardImage || null
                    })

                if (sendError) throw sendError
                alert('Message forwarded successfully!')
            }

            navigate(`/chat/${chatId}`)
        } catch (error: any) {
            console.error('Failed to create/open chat:', error)
            alert(`Failed to start chat: ${error.message || 'Unknown error'}`)
        }
    }

    const handleStartRandomChat = async () => {
        if (!user) return
        setIsRandomChatting(true)

        try {
            // Create a random chat session placeholder where we wait
            const { data: session, error } = await supabase
                .from('random_chat_sessions')
                .insert({
                    user1_id: user.id,
                    status: 'waiting'
                })
                .select()
                .single()

            if (error) throw error

            // Navigate to the matching screen where we listen for someone joining
            navigate(`/random-chat/${session.id}`)
        } catch (error: any) {
            console.error('Failed to start random chat:', error)
            alert(`Failed to start random matchmaking: ${error.message || 'Unknown error'}`)
            setIsRandomChatting(false)
        }
    }

    return (
        <div className="flex flex-col h-full bg-background mt-safe">
            <div className="p-4 border-b shrink-0 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground">Find Contacts</h1>
            </div>

            <div className="p-4 shrink-0 space-y-4">
                {/* Random Chat Feature */}
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-3">
                        <Shuffle className="h-6 w-6" />
                    </div>
                    <h2 className="font-semibold text-foreground mb-1">Random Chat</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                        Connect with someone randomly chosen from around the world.
                    </p>
                    <Button
                        onClick={handleStartRandomChat}
                        disabled={isRandomChatting}
                        className="w-full sm:w-auto"
                    >
                        {isRandomChatting ? 'Connecting...' : 'Start Random Chat'}
                    </Button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search by username or name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-secondary/50 border-none"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto w-full p-2">
                {isLoading ? (
                    <div className="flex justify-center p-4">
                        <span className="text-muted-foreground animate-pulse text-sm">Searching...</span>
                    </div>
                ) : searchResults.length > 0 ? (
                    <div className="divide-y divide-border/50">
                        {searchResults.map(resultUser => (
                            <div
                                key={resultUser.id}
                                className="flex items-center justify-between p-3 hover:bg-secondary/40 rounded-lg transition-colors cursor-pointer"
                                onClick={() => handleStartChat(resultUser.id)}
                            >
                                <div className="flex items-center">
                                    <div className="relative shrink-0">
                                        {resultUser.avatar_url ? (
                                            <img
                                                src={resultUser.avatar_url}
                                                className="w-12 h-12 rounded-full object-cover bg-secondary"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-lg">
                                                {resultUser.full_name?.charAt(0) || '?'}
                                            </div>
                                        )}
                                        {resultUser.is_online && (
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                                        )}
                                    </div>

                                    <div className="ml-4">
                                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                                            {resultUser.is_private ? 'Private Profile' : resultUser.full_name}
                                            {resultUser.is_private && <span className="text-[10px] uppercase bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">Private</span>}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">@{resultUser.username}</p>
                                    </div>
                                </div>

                                <Button variant="ghost" size="sm" className="shrink-0 text-primary">
                                    Message
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : searchQuery.trim() ? (
                    <div className="text-center p-8 text-muted-foreground">
                        No users found matching "{searchQuery}"
                    </div>
                ) : null}
            </div>
        </div>
    )
}
