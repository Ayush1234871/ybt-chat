import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MessageSquare, UserX, CheckCircle, Shield, ShieldOff, Calendar, AtSign } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'
import { Button } from '../../components/ui/Button'

export default function UserProfile() {
    const { userId } = useParams()
    const navigate = useNavigate()
    const { user: currentUser } = useAuthStore()

    const [profile, setProfile] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isBlockedByMe, setIsBlockedByMe] = useState(false)
    const [blockRecordId, setBlockRecordId] = useState<string | null>(null)
    const [isActionLoading, setIsActionLoading] = useState(false)

    useEffect(() => {
        if (!userId || !currentUser) return

        const loadProfile = async () => {
            try {
                setIsLoading(true)

                // Load user profile
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', userId)
                    .single()

                if (error) throw error
                setProfile(data)

                // Check block status
                const { data: blockData, error: blockError } = await supabase
                    .from('blocked_users')
                    .select('id')
                    .eq('blocker_id', currentUser.id)
                    .eq('blocked_id', userId)
                    .maybeSingle()

                if (!blockError && blockData) {
                    setIsBlockedByMe(true)
                    setBlockRecordId(blockData.id)
                } else {
                    setIsBlockedByMe(false)
                    setBlockRecordId(null)
                }
            } catch (error) {
                console.error('Failed to load profile:', error)
            } finally {
                setIsLoading(false)
            }
        }

        loadProfile()
    }, [userId, currentUser])

    const handleStartChat = async () => {
        if (!currentUser || !userId) return

        setIsActionLoading(true)
        try {
            const { data: chatId, error: rpcError } = await supabase
                .rpc('get_or_create_direct_chat', {
                    user_a_id: currentUser.id,
                    user_b_id: userId
                })

            if (rpcError) throw rpcError
            navigate(`/chat/${chatId}`)
        } catch (error: any) {
            console.error('Failed to start chat:', error)
            alert(`Failed to start chat: ${error.message}`)
        } finally {
            setIsActionLoading(false)
        }
    }

    const handleBlockToggle = async () => {
        if (!profile || !currentUser) return

        setIsActionLoading(true)
        try {
            if (isBlockedByMe && blockRecordId) {
                // Unblock
                const { error } = await supabase
                    .from('blocked_users')
                    .delete()
                    .eq('id', blockRecordId)

                if (error) throw error
                setIsBlockedByMe(false)
                setBlockRecordId(null)
            } else {
                // Block
                if (!confirm(`Are you sure you want to block ${profile.full_name}?`)) return

                const { data, error } = await supabase
                    .from('blocked_users')
                    .insert({
                        blocker_id: currentUser.id,
                        blocked_id: profile.id
                    })
                    .select()
                    .single()

                if (error) throw error
                setIsBlockedByMe(true)
                setBlockRecordId(data.id)

                // Hide chat if exists
                const { data: chatData } = await supabase.rpc('get_or_create_direct_chat', {
                    user_a_id: currentUser.id,
                    user_b_id: userId
                })

                if (chatData) {
                    await supabase
                        .from('chat_participants')
                        .update({ is_deleted: true })
                        .eq('chat_id', chatData)
                        .eq('user_id', currentUser.id)
                }
            }
        } catch (error: any) {
            console.error('Block action failed:', error)
            alert(`Action failed: ${error.message}`)
        } finally {
            setIsActionLoading(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    <span className="text-muted-foreground animate-pulse">Loading profile...</span>
                </div>
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="flex h-full flex-col items-center justify-center bg-background p-6 text-center">
                <ShieldOff className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <h2 className="text-xl font-bold mb-2">User Not Found</h2>
                <p className="text-muted-foreground mb-6">The user you're looking for doesn't exist or is unavailable.</p>
                <Button onClick={() => navigate(-1)}>Go Back</Button>
            </div>
        )
    }

    const isOwnProfile = currentUser?.id === profile.id

    return (
        <div className="flex flex-col h-full bg-background overflow-y-auto pb-20">
            {/* Header */}
            <div className="sticky top-0 z-20 flex items-center p-4 glass border-b">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-2">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-lg font-bold truncate">Profile</h1>
            </div>

            {/* Profile Hero */}
            <div className="relative pt-10 pb-8 px-4 flex flex-col items-center text-center">
                {/* Background Blobs */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-60 bg-gradient-to-b from-primary/10 to-transparent -z-10 blur-3xl rounded-full"></div>

                <div className="relative mb-6">
                    {profile.avatar_url ? (
                        <img
                            src={profile.avatar_url}
                            alt={profile.full_name}
                            className="w-32 h-32 rounded-full object-cover border-4 border-background shadow-2xl bg-secondary"
                        />
                    ) : (
                        <div className="w-32 h-32 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-4xl border-4 border-background shadow-2xl">
                            {profile.full_name?.charAt(0) || '?'}
                        </div>
                    )}
                    {profile.is_online && (
                        <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-background shadow-lg"></div>
                    )}
                </div>

                <h2 className="text-2xl font-bold text-foreground mb-1">{profile.full_name}</h2>
                <p className="text-muted-foreground flex items-center gap-1 mb-4">
                    <AtSign className="w-3.5 h-3.5" /> {profile.username}
                </p>

                <div className="flex flex-wrap justify-center gap-2 mt-2">
                    {!isOwnProfile && (
                        <>
                            <Button
                                onClick={handleStartChat}
                                disabled={isActionLoading || isBlockedByMe}
                                className="rounded-full px-6 gap-2"
                            >
                                <MessageSquare className="w-4 h-4" /> Message
                            </Button>
                            <Button
                                variant={isBlockedByMe ? "outline" : "destructive"}
                                onClick={handleBlockToggle}
                                disabled={isActionLoading}
                                className="rounded-full px-6 gap-2"
                            >
                                {isBlockedByMe ? (
                                    <><CheckCircle className="w-4 h-4" /> Unblock</>
                                ) : (
                                    <><UserX className="w-4 h-4" /> Block</>
                                )}
                            </Button>
                        </>
                    )}
                    {isOwnProfile && (
                        <Button variant="outline" onClick={() => navigate('/settings')} className="rounded-full px-6">
                            Edit Profile
                        </Button>
                    )}
                </div>
            </div>

            {/* Info Sections */}
            <div className="px-4 max-w-2xl mx-auto w-full space-y-4">
                <div className="bg-card/50 border border-border/50 rounded-2xl p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-1">Information</h3>

                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center text-primary">
                                <Shield className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Privacy Status</p>
                                <p className="font-medium">{profile.is_private ? 'Private Account' : 'Public Account'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center text-primary">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Joined</p>
                                <p className="font-medium">{format(new Date(profile.created_at || new Date()), 'MMMM d, yyyy')}</p>
                            </div>
                        </div>

                        {profile.last_seen && !profile.is_online && (
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center text-primary">
                                    <ShieldOff className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Last Seen</p>
                                    <p className="font-medium">{format(new Date(profile.last_seen), 'MMM d, HH:mm')}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* About section */}
                <div className="bg-card/50 border border-border/50 rounded-2xl p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-1">About</h3>
                    <p className="text-sm text-foreground leading-relaxed italic">
                        "{profile.about || 'Hey! I\'m using YBT Chat.'}"
                    </p>
                </div>

                {profile.is_private && (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                        <Shield className="w-8 h-8 mb-2 opacity-20" />
                        <p className="text-xs">This profile is private</p>
                    </div>
                )}
            </div>
        </div>
    )
}
