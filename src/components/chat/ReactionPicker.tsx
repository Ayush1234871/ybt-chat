import { Button } from '../ui/Button'

interface ReactionPickerProps {
    onSelect: (emoji: string) => void
    onClose: () => void
}

const COMMON_REACTIONS = ['❤️', '😂', '👍', '😮', '🙏', '🔥', '😢', '💯']

export function ReactionPicker({ onSelect, onClose }: ReactionPickerProps) {
    return (
        <div className="flex items-center gap-1 p-1 bg-card border rounded-full shadow-xl animate-in fade-in zoom-in duration-200">
            {COMMON_REACTIONS.map(emoji => (
                <Button
                    key={emoji}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-muted text-lg p-0"
                    onClick={() => {
                        onSelect(emoji)
                        onClose()
                    }}
                >
                    {emoji}
                </Button>
            ))}
        </div>
    )
}
