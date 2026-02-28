import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Search as SearchIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'
import { Button } from '../../components/ui/Button'

export default function RandomChat() {
    const { sessionId } = useParams()
    const navigate = useNavigate()
    const { user } = useAuthStore()

    const [status, setStatus] = useState<'waiting' | 'connected' | 'ended'>('waiting')
    const [chatId, setChatId] = useState<string | null>(null)

    useEffect(() => {
        if (!sessionId || !user) return

        // Immediately try to match this session if we are joining another session
        const tryMatch = async () => {
            try {
                // 1. See if there's someone else waiting where we are NOT user1
                const { data: waitingSession } = await supabase
                    .from('random_chat_sessions')
                    .select('*')
                    .eq('status', 'waiting')
                    .neq('user1_id', user.id)
                    .order('created_at', { ascending: true })
                    .limit(1)
                    .single()

                if (waitingSession) {
                    // We found someone waiting! Let's connect.
                    // First, create the chat room
                    const { data: newChat, error: chatError } = await supabase
                        .from('chats')
                        .insert({
                            type: 'random',
                            created_by: user.id
                        })
                        .select()
                        .single()

                    if (chatError) throw chatError

                    // Add both to chat participants
                    const { error: partError } = await supabase.from('chat_participants').insert([
                        { chat_id: newChat.id, user_id: waitingSession.user1_id },
                        { chat_id: newChat.id, user_id: user.id }
                    ])

                    if (partError) throw partError

                    // Update the waiting session to connected
                    const { error: updateError } = await supabase
                        .from('random_chat_sessions')
                        .update({
                            user2_id: user.id,
                            status: 'connected',
                            chat_id: newChat.id,
                            connected_at: new Date().toISOString()
                        })
                        .eq('id', waitingSession.id)

                    if (updateError) throw updateError

                    // End our dummy session
                    await supabase
                        .from('random_chat_sessions')
                        .update({ status: 'ended' })
                        .eq('id', sessionId)

                    setChatId(newChat.id)
                    setStatus('connected')
                }
            } catch (error: any) {
                console.error('Matchmaking error:', error)
                alert(`Matchmaking failed: ${error.message || 'Unknown error'}`)
                navigate('/search')
            }
        }

        // Only try to match if we just arrived
        if (status === 'waiting') {
            tryMatch()
        }

        // Subscribe to changes on OUR session ID to see if someone matches US
        const channel = supabase
            .channel(`random_session:${sessionId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'random_chat_sessions',
                filter: `id=eq.${sessionId}`
            }, (payload) => {
                const updatedSession = payload.new
                if (updatedSession.status === 'connected' && updatedSession.chat_id) {
                    setChatId(updatedSession.chat_id)
                    setStatus('connected')
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [sessionId, user, status, navigate])

    const handleGoToChat = () => {
        if (chatId) {
            navigate(`/chat/${chatId}`, { replace: true })
        }
    }

    const handleCancel = async () => {
        if (sessionId) {
            await supabase
                .from('random_chat_sessions')
                .update({ status: 'ended' })
                .eq('id', sessionId)
        }
        navigate('/search')
    }

    return (
        <div className="flex flex-col h-full bg-background mt-safe">
            <div className="p-4 border-b shrink-0 flex items-center">
                <Button variant="ghost" size="icon" className="mr-2" onClick={handleCancel}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-xl font-bold text-foreground">Random Matchmaking</h1>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                {status === 'waiting' && (
                    <>
                        <div className="relative">
                            <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center animate-pulse">
                                <SearchIcon className="h-10 w-10 text-primary" />
                            </div>
                            <div className="absolute top-0 right-0 w-6 h-6 bg-background rounded-full flex items-center justify-center">
                                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            </div>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold mb-2">Looking for a partner...</h2>
                            <p className="text-muted-foreground">Please wait while we connect you with a random user.</p>
                        </div>

                        <Button variant="outline" onClick={handleCancel} className="mt-8">
                            Cancel Search
                        </Button>
                    </>
                )}

                {status === 'connected' && (
                    <>
                        <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center">
                            <span className="text-4xl">🎉</span>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold mb-2 text-green-500">Match Found!</h2>
                            <p className="text-muted-foreground">You are now connected to a stranger. Say hi!</p>
                        </div>

                        <Button onClick={handleGoToChat} className="w-full max-w-sm mt-8" size="lg">
                            Go to Chat
                        </Button>
                    </>
                )}
            </div>
        </div>
    )
}
