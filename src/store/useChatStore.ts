import { create } from 'zustand'

export interface Message {
    id: string
    chat_id: string
    sender_id: string
    type: string
    content: string
    image_url: string | null
    voice_url?: string | null
    file_url?: string | null
    file_name?: string | null
    file_size?: number | null
    reply_to?: string | null
    is_read: boolean
    is_delivered: boolean
    is_edited: boolean
    is_deleted: boolean
    created_at: string
}

export interface Chat {
    id: string
    type: string
    created_at: string
    participants: any[]
    messages: Message[]
}

interface ChatState {
    activeChatId: string | null
    chats: Chat[]
    setActiveChatId: (id: string | null) => void
    setChats: (chats: Chat[]) => void
    addChat: (chat: Chat) => void
}

export const useChatStore = create<ChatState>((set) => ({
    activeChatId: null,
    chats: [],
    setActiveChatId: (id) => set({ activeChatId: id }),
    setChats: (chats) => set({ chats }),
    addChat: (chat) => set((state) => ({ chats: [...state.chats, chat] })),
}))
