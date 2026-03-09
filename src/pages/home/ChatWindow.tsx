import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, Send, Image as ImageIcon, Smile, MoreVertical, Trash2, Eraser, UserX, Forward, Copy, User, CheckCircle, Check, CheckCheck, Pencil, Trash } from 'lucide-react'
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'
import type { Message } from '../../store/useChatStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { VoiceRecorder } from '../../components/chat/VoiceRecorder'
import { AudioPlayer } from '../../components/chat/AudioPlayer'
import { ReactionPicker } from '../../components/chat/ReactionPicker'
import { X, Reply } from 'lucide-react'

interface Reaction {
    id: string
    message_id: string
    user_id: string
    reaction: string
}

export default function ChatWindow() {
    const { chatId } = useParams()
    const navigate = useNavigate()
    const { user } = useAuthStore()

    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [otherParticipant, setOtherParticipant] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [chatType, setChatType] = useState<'direct' | 'random' | 'group'>('direct')
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isActionLoading, setIsActionLoading] = useState(false)
    const [isTyping, setIsTyping] = useState(false)
    const [otherIsTyping, setOtherIsTyping] = useState(false)
    const typingTimeoutRef = useRef<any>(null)
    const menuRef = useRef<HTMLDivElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const [reactions, setReactions] = useState<Record<string, Reaction[]>>({})
    const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null)
    const [isRecording, setIsRecording] = useState(false)
    const [replyToMessage, setReplyToMessage] = useState<Message | null>(null)
    const [editingMessage, setEditingMessage] = useState<Message | null>(null)
    const [chatWallpaper, setChatWallpaper] = useState<string | null>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const [isBlockedByMe, setIsBlockedByMe] = useState(false)
    const [isBlockingMe, setIsBlockingMe] = useState(false)
    const [blockRecordId, setBlockRecordId] = useState<string | null>(null)

    useEffect(() => {
        if (!user || !chatId) return

        const loadChat = async () => {
            try {
                setIsLoading(true)

                // Load chat details
                const { data: chatData, error: chatError } = await supabase
                    .from('chats')
                    .select('type')
                    .eq('id', chatId)
                    .single()

                if (chatError) throw chatError
                setChatType(chatData.type)

                // Load my participant status
                const { data: myPart, error: myPartError } = await supabase
                    .from('chat_participants')
                    .select('cleared_at, wallpaper_url')
                    .eq('chat_id', chatId)
                    .eq('user_id', user.id)
                    .single()

                if (myPartError) throw myPartError
                const clearedAt = myPart?.cleared_at || '1970-01-01T00:00:00Z'
                setChatWallpaper((myPart as any)?.wallpaper_url || null)

                // Load messages (only since last clear)
                const { data: msgData, error: msgError } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('chat_id', chatId)
                    .gt('created_at', clearedAt)
                    .order('created_at', { ascending: true })

                if (msgError) throw msgError
                setMessages(msgData as Message[])

                // Load other participant details
                const { data: participantData, error: pError } = await supabase
                    .from('chat_participants')
                    .select('users(id, full_name, username, avatar_url, is_online, last_seen)')
                    .eq('chat_id', chatId)
                    .neq('user_id', user.id)
                    .single()

                if (pError) throw pError
                if (participantData) {
                    const otherUser: any = participantData.users
                    setOtherParticipant(otherUser)

                    // Check block status
                    const { data: blockData, error: blockError } = await supabase
                        .from('blocked_users')
                        .select('id, blocker_id, blocked_id')
                        .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${otherUser.id}),and(blocker_id.eq.${otherUser.id},blocked_id.eq.${user.id})`)

                    if (!blockError && blockData) {
                        const byMe = blockData.find(b => b.blocker_id === user.id)
                        const byThem = blockData.find(b => b.blocker_id === otherUser.id)
                        setIsBlockedByMe(!!byMe)
                        setIsBlockingMe(!!byThem)
                        setBlockRecordId(byMe?.id || null)
                    } else {
                        setIsBlockedByMe(false)
                        setIsBlockingMe(false)
                        setBlockRecordId(null)
                    }
                }

                // Load reactions for the loaded messages
                if (msgData && msgData.length > 0) {
                    const messageIds = msgData.map(m => m.id)
                    const { data: reactData, error: reactError } = await supabase
                        .from('message_reactions')
                        .select('*')
                        .in('message_id', messageIds)

                    if (!reactError && reactData) {
                        const reactionsMap: Record<string, Reaction[]> = {}
                        reactData.forEach(r => {
                            if (!reactionsMap[r.message_id]) reactionsMap[r.message_id] = []
                            reactionsMap[r.message_id].push(r as Reaction)
                        })
                        setReactions(reactionsMap)
                    }
                }


                // Mark unread messages as read and delivered
                await supabase
                    .from('messages')
                    .update({ is_read: true, is_delivered: true })
                    .eq('chat_id', chatId)
                    .neq('sender_id', user.id)
                    .eq('is_read', false)

                // Also mark as delivered if not already (even if read)
                await supabase
                    .from('messages')
                    .update({ is_delivered: true })
                    .eq('chat_id', chatId)
                    .neq('sender_id', user.id)
                    .eq('is_delivered', false)

            } catch (error) {
                console.error('Failed to load chat:', error)
            } finally {
                setIsLoading(false)
            }
        }

        loadChat()

        // Subscribe to realtime messages
        const msgChannel = supabase
            .channel(`chat:${chatId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `chat_id=eq.${chatId}`
            }, (payload) => {
                const newMsg = payload.new as Message
                setMessages(prev => {
                    // Avoid duplicates
                    if (prev.some(m => m.id === newMsg.id)) return prev
                    return [...prev, newMsg]
                })

                // If received a message and chat is open, mark it as read and delivered
                if (newMsg.sender_id !== user.id) {
                    supabase
                        .from('messages')
                        .update({ is_read: true, is_delivered: true })
                        .eq('id', newMsg.id)
                        .then()
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'messages',
                filter: `chat_id=eq.${chatId}`
            }, (payload) => {
                const updatedMsg = payload.new as Message
                setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m))
            })
            .on('broadcast', { event: 'typing' }, ({ payload }) => {
                if (payload.userId !== user.id) {
                    setOtherIsTyping(payload.isTyping)
                }
            })
            .subscribe()

        // Subscribe to block changes
        const blockChannel = supabase
            .channel('blocked_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'blocked_users'
            }, () => {
                // We'll reload the chat if block status changes
                const loadChat = async () => {
                    // reuse the load logic if needed or just reload the page
                    window.location.reload()
                }
                loadChat()
            })
            .subscribe()

        // Subscribe to reaction changes
        const reactionChannel = supabase
            .channel(`reactions:${chatId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'message_reactions'
            }, (payload) => {
                console.log('Reaction Realtime event:', payload)
                if (payload.eventType === 'INSERT') {
                    const newReaction = payload.new as Reaction
                    setReactions(prev => {
                        const msgReactions = prev[newReaction.message_id] || []
                        if (msgReactions.some(r => r.id === newReaction.id)) return prev
                        return {
                            ...prev,
                            [newReaction.message_id]: [...msgReactions, newReaction]
                        }
                    })
                } else if (payload.eventType === 'DELETE') {
                    const oldReaction = payload.old as Reaction
                    setReactions(prev => {
                        const msgReactions = prev[oldReaction.message_id] || []
                        return {
                            ...prev,
                            [oldReaction.message_id]: msgReactions.filter(r => r.id !== oldReaction.id)
                        }
                    })
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(msgChannel)
            supabase.removeChannel(blockChannel)
            supabase.removeChannel(reactionChannel)
        }
    }, [chatId, user])


    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim() || !user || !chatId) return

        const textToSend = newMessage.trim()
        setNewMessage('')
        setShowEmojiPicker(false)
        handleTyping(false)

        try {
            if (editingMessage) {
                const { error } = await supabase
                    .from('messages')
                    .update({
                        content: textToSend,
                        is_edited: true
                    })
                    .eq('id', editingMessage.id)

                if (error) throw error
                setEditingMessage(null)
            } else {
                const { error } = await supabase
                    .from('messages')
                    .insert({
                        chat_id: chatId,
                        sender_id: user.id,
                        type: 'text',
                        content: textToSend,
                        reply_to: replyToMessage?.id || null,
                        is_delivered: false,
                        is_read: false
                    })

                if (error) throw error
                setReplyToMessage(null)
            }
        } catch (error: any) {
            console.error('Failed to send message:', error)
            alert(`Failed to send message: ${error.message || 'Unknown error'}`)
        }
    }

    const handleDeleteForEveryone = async (messageId: string) => {
        if (!confirm('Delete this message for everyone?')) return
        try {
            const { error } = await supabase
                .from('messages')
                .update({
                    is_deleted: true,
                    content: '🚫 This message was deleted',
                    image_url: null,
                    voice_url: null
                })
                .eq('id', messageId)
            if (error) throw error
        } catch (error: any) {
            alert(`Failed to delete message: ${error.message}`)
        }
    }

    const handleVoiceSend = async (file: File) => {
        if (!user || !chatId) return

        try {
            const fileName = `${Date.now()}.webm`
            const filePath = `${chatId}/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('voice-messages')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('voice-messages')
                .getPublicUrl(filePath)

            const { error: msgError } = await supabase
                .from('messages')
                .insert({
                    chat_id: chatId,
                    sender_id: user.id,
                    type: 'voice',
                    voice_url: publicUrl,
                    reply_to: replyToMessage?.id || null
                })

            if (msgError) throw msgError
            setReplyToMessage(null)
        } catch (error: any) {
            console.error('Failed to send voice message:', error)
            alert(`Failed to send voice message: ${error.message}`)
        }
    }

    const handleReactionSelect = async (messageId: string, emoji: string) => {
        if (!user) return

        try {
            const existingReactions = reactions[messageId] || []
            const myReaction = existingReactions.find(r => r.user_id === user.id && r.reaction === emoji)

            if (myReaction) {
                // Optimistic Update: remove reaction
                setReactions(prev => ({
                    ...prev,
                    [messageId]: (prev[messageId] || []).filter(r => r.id !== myReaction.id)
                }))

                const { error } = await supabase
                    .from('message_reactions')
                    .delete()
                    .eq('id', myReaction.id)

                if (error) {
                    // Rollback if error
                    setReactions(prev => ({
                        ...prev,
                        [messageId]: [...(prev[messageId] || []), myReaction]
                    }))
                    throw error
                }
            } else {
                // Temporary ID for optimistic update
                const tempId = crypto.randomUUID()
                const optimisticReaction: Reaction = {
                    id: tempId,
                    message_id: messageId,
                    user_id: user.id,
                    reaction: emoji
                }

                // Optimistic Update: add reaction
                setReactions(prev => ({
                    ...prev,
                    [messageId]: [...(prev[messageId] || []), optimisticReaction]
                }))

                const { data, error } = await supabase
                    .from('message_reactions')
                    .insert({
                        message_id: messageId,
                        user_id: user.id,
                        reaction: emoji
                    })
                    .select()
                    .single()

                if (error) {
                    // Rollback if error
                    setReactions(prev => ({
                        ...prev,
                        [messageId]: (prev[messageId] || []).filter(r => r.id !== tempId)
                    }))
                    throw error
                }

                // Replace optimistic reaction with real one
                if (data) {
                    setReactions(prev => ({
                        ...prev,
                        [messageId]: (prev[messageId] || []).map(r => r.id === tempId ? (data as Reaction) : r)
                    }))
                }
            }
        } catch (error: any) {
            console.error('Failed to update reaction:', error)
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !user || !chatId) return

        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random()}.${fileExt}`
            const filePath = `${chatId}/${fileName}`

            // Upload image
            const { error: uploadError } = await supabase.storage
                .from('chat-images')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('chat-images')
                .getPublicUrl(filePath)

            // Send message with image_url
            const { error: msgError } = await supabase
                .from('messages')
                .insert({
                    chat_id: chatId,
                    sender_id: user.id,
                    type: 'image',
                    image_url: publicUrl,
                    reply_to: replyToMessage?.id || null
                })

            if (msgError) throw msgError
            setReplyToMessage(null)
        } catch (error: any) {
            console.error('Failed to upload image:', error)
            alert(`Failed to upload image: ${error.message || 'Unknown error'}`)
        }
    }

    const handleEndChat = async () => {
        if (!chatId || !user) return
        if (!confirm('Are you sure you want to end this random chat?')) return

        try {
            // Mark the random session as ended if it exists
            await supabase
                .from('random_chat_sessions')
                .update({ status: 'ended', disconnected_at: new Date().toISOString() })
                .eq('chat_id', chatId)

            navigate('/search', { replace: true })
        } catch (error) {
            console.error('Failed to end chat:', error)
            navigate('/search', { replace: true })
        }
    }

    const handleClearChat = async () => {
        if (!chatId || !user) return
        if (!confirm('Clear all messages in this chat for you?')) return

        setIsActionLoading(true)
        console.log('Clearing chat for user:', user.id, 'Chat:', chatId)

        try {
            const { data, error, status } = await supabase
                .from('chat_participants')
                .update({ cleared_at: new Date().toISOString() })
                .eq('chat_id', chatId)
                .eq('user_id', user.id)
                .select()

            console.log('Clear response:', { data, error, status })

            if (error) throw error
            if (!data || data.length === 0) {
                throw new Error('Could not update your participant record. You might not have permission or the record does not exist.')
            }

            setMessages([])
            setIsMenuOpen(false)
            alert('Chat cleared successfully for your account.')
        } catch (error: any) {
            console.error('Failed to clear chat:', error)
            alert(`Failed to clear chat: ${error.message || 'Unknown error. Check console.'}`)
        } finally {
            setIsActionLoading(false)
        }
    }

    const handleDeleteChat = async () => {
        if (!chatId || !user) return
        if (!confirm('Delete this chat for you? You will lose access to the history.')) return

        setIsActionLoading(true)
        try {
            const { data, error } = await supabase
                .from('chat_participants')
                .update({
                    is_deleted: true,
                    cleared_at: new Date().toISOString()
                })
                .eq('chat_id', chatId)
                .eq('user_id', user.id)
                .select()

            if (error) throw error
            if (!data || data.length === 0) {
                throw new Error('Could not delete chat. Permission denied.')
            }

            navigate('/', { replace: true })
        } catch (error: any) {
            console.error('Failed to delete chat:', error)
            alert(`Failed to delete chat: ${error.message}`)
        } finally {
            setIsActionLoading(false)
        }
    }

    const handleCopyMessage = (text: string) => {
        navigator.clipboard.writeText(text)
        alert('Message copied to clipboard')
    }

    const handleBlockUser = async () => {
        if (!otherParticipant || !user || !confirm(`Block ${otherParticipant.full_name}?`)) return
        try {
            const { error } = await supabase
                .from('blocked_users')
                .insert({
                    blocker_id: user.id,
                    blocked_id: otherParticipant.id
                })

            if (error) throw error

            // Also hide the chat for the blocker
            await supabase
                .from('chat_participants')
                .update({ is_deleted: true })
                .eq('chat_id', chatId)
                .eq('user_id', user.id)

            alert('User blocked successfully. The chat has been hidden.')
            setIsMenuOpen(false)
            navigate('/', { replace: true })
        } catch (error: any) {
            alert(`Failed to block user: ${error.message}`)
        }
    }

    const handleUnblock = async () => {
        if (!blockRecordId || !otherParticipant || !confirm(`Unblock ${otherParticipant.full_name}?`)) return
        try {
            // Restore visibility for both
            await supabase
                .from('chat_participants')
                .update({ is_deleted: false })
                .eq('chat_id', chatId)

            const { error } = await supabase
                .from('blocked_users')
                .delete()
                .eq('id', blockRecordId)

            if (error) throw error

            setIsBlockedByMe(false)
            setBlockRecordId(null)
            alert('User unblocked. Chat visibility restored.')
        } catch (error: any) {
            alert(`Failed to unblock user: ${error.message}`)
        }
    }



    const handleTyping = (isTyping: boolean) => {
        if (!chatId || !user) return

        supabase.channel(`chat:${chatId}`).send({
            type: 'broadcast',
            event: 'typing',
            payload: { userId: user.id, isTyping }
        })
    }

    const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value)

        if (!isTyping) {
            setIsTyping(true)
            handleTyping(true)
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false)
            handleTyping(false)
        }, 3000)
    }

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center bg-background">
                <span className="text-muted-foreground animate-pulse">Loading conversation...</span>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-transparent mt-safe overflow-hidden relative">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px] z-5 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-sky-500/5 rounded-full blur-[100px] z-5"></div>

            {/* Custom Wallpaper Layer */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                {chatWallpaper?.startsWith('#') ? (
                    <div className="w-full h-full transition-colors duration-500" style={{ backgroundColor: chatWallpaper }}></div>
                ) : chatWallpaper ? (
                    <div
                        className="w-full h-full bg-cover bg-center opacity-50 transition-all duration-500"
                        style={{ backgroundImage: `url(${chatWallpaper})` }}
                    ></div>
                ) : (
                    <div className="w-full h-full bg-background transition-colors duration-500"></div>
                )}
            </div>

            {/* Header */}
            <div className="flex items-center p-4 border-b glass shrink-0 relative z-30">
                <Button variant="ghost" size="icon" className="mr-2" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>

                <div className="flex items-center flex-1 min-w-0">
                    <div className="relative shrink-0 mr-3">
                        {otherParticipant?.avatar_url ? (
                            <img
                                src={otherParticipant?.avatar_url}
                                className="w-10 h-10 rounded-full object-cover bg-secondary"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                                {otherParticipant?.full_name?.charAt(0) || '?'}
                            </div>
                        )}
                        {otherParticipant?.is_online && (
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background"></div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <h2 className="font-semibold text-foreground truncate">{otherParticipant?.full_name || 'Unknown User'}</h2>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            {otherIsTyping ? (
                                <span className="text-primary font-medium flex items-center gap-1 anim-pulse">
                                    <span className="flex gap-0.5">
                                        <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="w-1 h-1 bg-primary rounded-full animate-bounce"></span>
                                    </span>
                                    typing...
                                </span>
                            ) : (
                                otherParticipant?.is_online ? 'Online' : (otherParticipant?.last_seen ? `Last seen ${format(new Date(otherParticipant.last_seen), 'MMM d, HH:mm')}` : '')
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {chatType === 'random' && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleEndChat}
                            className="text-[10px] h-7 px-2 uppercase font-bold tracking-tight"
                        >
                            End Chat
                        </Button>
                    )}

                    <div className="relative" ref={menuRef}>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="text-muted-foreground"
                        >
                            <MoreVertical className="h-5 w-5" />
                        </Button>

                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-card border rounded-xl shadow-xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                {otherParticipant && (
                                    <button
                                        onClick={() => navigate(`/profile/${otherParticipant.id}`)}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                    >
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        View Profile
                                    </button>
                                )}
                                <button
                                    onClick={handleClearChat}
                                    disabled={isActionLoading}
                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                                >
                                    <Eraser className="h-4 w-4 text-muted-foreground" />
                                    {isActionLoading ? 'Please wait...' : 'Clear Chat'}
                                </button>
                                <button
                                    onClick={handleDeleteChat}
                                    disabled={isActionLoading}
                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors border-t disabled:opacity-50"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete Chat
                                </button>
                                {isBlockedByMe ? (
                                    <button
                                        onClick={handleUnblock}
                                        disabled={isActionLoading}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-emerald-500 hover:bg-emerald-500/10 transition-colors border-t disabled:opacity-50"
                                    >
                                        <CheckCircle className="h-4 w-4" />
                                        Unblock User
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleBlockUser}
                                        disabled={isActionLoading}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors border-t disabled:opacity-50"
                                    >
                                        <UserX className="h-4 w-4" />
                                        Block User
                                    </button>
                                )}
                                <div className="border-t py-2 px-4">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Chat Wallpaper</p>
                                    <div className="flex gap-2">
                                        {['#0ea5e9', '#8b5cf6', '#10b981', '#ef4444', ''].map((color, i) => (
                                            <button
                                                key={i}
                                                onClick={async () => {
                                                    const val = color || null
                                                    await supabase.from('chat_participants').update({ wallpaper_url: val }).eq('chat_id', chatId).eq('user_id', user.id)
                                                    setChatWallpaper(val)
                                                }}
                                                className={`w-6 h-6 rounded-full border border-border shadow-sm transform transition-transform hover:scale-110 ${!color ? 'bg-background flex items-center justify-center text-[10px]' : ''}`}
                                                style={{ backgroundColor: color || 'transparent' }}
                                            >
                                                {!color && '✕'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10">
                {messages.map((msg, index) => {
                    const isMine = msg.sender_id === user?.id
                    const showTimestamp = index === 0 || new Date(msg.created_at).getTime() - new Date(messages[index - 1].created_at).getTime() > 300000 // 5 mins

                    return (
                        <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                            {showTimestamp && (
                                <div className="text-xs text-muted-foreground text-center my-4 w-full">
                                    {format(new Date(msg.created_at), 'MMM d, yyyy HH:mm')}
                                </div>
                            )}
                            <div
                                className={`max-w-[75%] rounded-2xl px-4 py-2 relative group ${isMine
                                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                    : 'bg-secondary text-secondary-foreground rounded-tl-sm'
                                    }`}
                                onContextMenu={(e) => {
                                    e.preventDefault()
                                    setActiveReactionMessageId(msg.id)
                                }}
                            >
                                {/* Reaction Picker Overlay */}
                                {activeReactionMessageId === msg.id && (
                                    <div className={`absolute bottom-full mb-2 z-50 ${isMine ? 'right-0' : 'left-0'}`}>
                                        <ReactionPicker
                                            onSelect={(emoji: string) => handleReactionSelect(msg.id, emoji)}
                                            onClose={() => setActiveReactionMessageId(null)}
                                        />
                                    </div>
                                )}

                                {msg.type === 'text' && <p className="break-words">{msg.content}</p>}
                                {msg.type === 'image' && msg.image_url && (
                                    <img src={msg.image_url} alt="Shared image" className="rounded-lg max-w-full h-auto mt-1" />
                                )}
                                {msg.type === 'voice' && msg.voice_url && (
                                    <AudioPlayer url={msg.voice_url} isMine={isMine} />
                                )}

                                {/* Reply Context Rendering */}
                                {msg.reply_to && (
                                    <div className={`mb-2 p-2 rounded-lg text-xs border-l-4 ${isMine ? 'bg-primary-foreground/10 border-primary-foreground/30' : 'bg-secondary-foreground/10 border-secondary-foreground/30'}`}>
                                        {(() => {
                                            const repliedMsg = messages.find(m => m.id === msg.reply_to)
                                            if (!repliedMsg) return <span className="italic opacity-70">Message not found</span>
                                            return (
                                                <div className="flex flex-col gap-0.5 max-w-[200px]">
                                                    <span className="font-bold opacity-80">
                                                        {repliedMsg.sender_id === user?.id ? 'You' : (otherParticipant?.full_name || 'User')}
                                                    </span>
                                                    <span className="truncate opacity-70">
                                                        {repliedMsg.type === 'text' && repliedMsg.content}
                                                        {repliedMsg.type === 'image' && '📷 Image'}
                                                        {repliedMsg.type === 'voice' && '🎤 Voice message'}
                                                    </span>
                                                </div>
                                            )
                                        })()}
                                    </div>
                                )}

                                {/* Reactions Display */}
                                {reactions[msg.id]?.length > 0 && (
                                    <div className={`flex flex-wrap gap-1 mt-2 -mb-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                                        {Object.entries(
                                            reactions[msg.id].reduce((acc, r) => {
                                                acc[r.reaction] = (acc[r.reaction] || 0) + 1
                                                return acc
                                            }, {} as Record<string, number>)
                                        ).map(([emoji, count]) => (
                                            <button
                                                key={emoji}
                                                onClick={() => handleReactionSelect(msg.id, emoji)}
                                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border shadow-sm transition-all hover:scale-110 ${reactions[msg.id].some(r => r.user_id === user?.id && r.reaction === emoji)
                                                    ? 'bg-primary/20 border-primary'
                                                    : 'bg-background/50 border-border'
                                                    }`}
                                            >
                                                <span>{emoji}</span>
                                                <span className="font-bold opacity-70">{count}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className={`text-[10px] mt-1 flex items-center justify-end gap-1.5 ${isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                    {msg.is_edited && !msg.is_deleted && <span className="text-[9px] opacity-70 italic">edited</span>}
                                    <span>{format(new Date(msg.created_at), 'HH:mm')}</span>
                                    {isMine && !msg.is_deleted && (
                                        <span className="flex items-center">
                                            {msg.is_read ? (
                                                <CheckCheck className="h-3 w-3 text-sky-300" />
                                            ) : msg.is_delivered ? (
                                                <CheckCheck className="h-3 w-3" />
                                            ) : (
                                                <Check className="h-3 w-3" />
                                            )}
                                        </span>
                                    )}
                                    <div className="flex items-center gap-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {!msg.is_deleted && (
                                            <>
                                                <button
                                                    onClick={() => setActiveReactionMessageId(msg.id)}
                                                    className="hover:text-primary-foreground transition-colors p-0.5"
                                                    title="Add Reaction"
                                                >
                                                    <Smile className="h-3.5 w-3.5" />
                                                </button>
                                                {msg.type === 'text' && (
                                                    <button
                                                        onClick={() => handleCopyMessage(msg.content || '')}
                                                        className="hover:text-primary-foreground transition-colors p-0.5"
                                                        title="Copy Text"
                                                    >
                                                        <Copy className="h-3 w-3" />
                                                    </button>
                                                )}
                                                {isMine && msg.type === 'text' && (Date.now() - new Date(msg.created_at).getTime() < 15 * 60 * 1000) && (
                                                    <button
                                                        onClick={() => {
                                                            setEditingMessage(msg)
                                                            setNewMessage(msg.content)
                                                        }}
                                                        className="hover:text-primary-foreground transition-colors p-0.5"
                                                        title="Edit Message"
                                                    >
                                                        <Pencil className="h-3 w-3" />
                                                    </button>
                                                )}
                                                {isMine && (
                                                    <button
                                                        onClick={() => handleDeleteForEveryone(msg.id)}
                                                        className="hover:text-primary-foreground transition-colors p-0.5"
                                                        title="Delete for Everyone"
                                                    >
                                                        <Trash className="h-3 w-3 text-destructive-foreground hover:text-red-300" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        const params = new URLSearchParams()
                                                        params.set('forwardContent', msg.content || '')
                                                        params.set('forwardType', msg.type)
                                                        if (msg.image_url) params.set('forwardImage', msg.image_url)
                                                        if (msg.voice_url) params.set('forwardVoice', msg.voice_url)
                                                        navigate(`/search?${params.toString()}`)
                                                    }}
                                                    className="hover:text-primary-foreground transition-colors p-0.5"
                                                    title="Forward Message"
                                                >
                                                    <Forward className="h-3 w-3" />
                                                </button>
                                                <button
                                                    onClick={() => setReplyToMessage(msg)}
                                                    className="hover:text-primary-foreground transition-colors p-0.5"
                                                    title="Reply"
                                                >
                                                    <Reply className="h-3 w-3" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area or Block Message */}
            <div className="p-3 border-t glass-dark shrink-0 relative z-20">
                {(isBlockedByMe || isBlockingMe) ? (
                    <div className="flex flex-col items-center justify-center py-4 px-2 text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-secondary/50 rounded-2xl px-6 py-4 max-w-md w-full border border-border/50">
                            <p className="text-sm font-medium text-foreground mb-2">
                                {isBlockedByMe
                                    ? `You have blocked ${otherParticipant?.full_name || 'this user'}.`
                                    : `${otherParticipant?.full_name || 'This user'} has restricted who can message them.`}
                            </p>
                            {isBlockedByMe && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleUnblock}
                                    className="mt-1 text-xs"
                                >
                                    Unblock
                                </Button>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {editingMessage && (
                            <div className="flex items-center justify-between p-2 mb-2 bg-primary/10 rounded-lg border border-primary/30 animate-in slide-in-from-bottom-2 fade-in">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-1 h-8 bg-primary rounded-full shrink-0"></div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Editing Message</p>
                                        <p className="text-xs text-muted-foreground truncate italic">{editingMessage.content}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 rounded-full hover:bg-muted"
                                    onClick={() => {
                                        setEditingMessage(null)
                                        setNewMessage('')
                                    }}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                        )}
                        {replyToMessage && (
                            <div className="flex items-center justify-between p-2 mb-2 bg-muted/50 rounded-lg border border-border/50 animate-in slide-in-from-bottom-2 fade-in">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-1 h-8 bg-primary rounded-full shrink-0"></div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-primary uppercase tracking-wider">
                                            Replying to {(replyToMessage.sender_id === user?.id && user?.id) ? 'yourself' : otherParticipant?.full_name}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate italic">
                                            {replyToMessage.type === 'text' && replyToMessage.content}
                                            {replyToMessage.type === 'image' && '📷 Image'}
                                            {replyToMessage.type === 'voice' && '🎤 Voice message'}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 rounded-full hover:bg-muted"
                                    onClick={() => setReplyToMessage(null)}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                        )}

                        {showEmojiPicker && (
                            <div className="absolute bottom-full left-0 mb-2 shadow-xl z-50">
                                <Picker
                                    data={data}
                                    onEmojiSelect={(emoji: any) => setNewMessage(prev => prev + emoji.native)}
                                    theme="auto"
                                />
                            </div>
                        )}

                        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground shrink-0"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            >
                                <Smile className="h-5 w-5" />
                            </Button>

                            <label className="cursor-pointer shrink-0">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                />
                                <div className="p-2 text-muted-foreground hover:bg-accent rounded-md transition-colors">
                                    <ImageIcon className="h-5 w-5" />
                                </div>
                            </label>

                            <Input
                                value={newMessage}
                                onChange={onInputChange}
                                placeholder="Type a message..."
                                className="flex-1 rounded-full bg-secondary/50 border-none focus-visible:ring-1"
                                disabled={isRecording}
                            />

                            <div className="flex items-center">
                                <VoiceRecorder
                                    onStart={() => setIsRecording(true)}
                                    onSend={handleVoiceSend}
                                    onCancel={() => setIsRecording(false)}
                                />
                                {!isRecording && (
                                    <Button
                                        type="submit"
                                        size="icon"
                                        className="rounded-full shrink-0 h-10 w-10 ml-2"
                                        disabled={!newMessage.trim()}
                                    >
                                        <Send className="h-4 w-4 ml-1" />
                                    </Button>
                                )}
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    )
}
