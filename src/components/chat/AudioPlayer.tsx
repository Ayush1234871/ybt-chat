import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2 } from 'lucide-react'
import { Button } from '../ui/Button'

interface AudioPlayerProps {
    url: string
    isMine: boolean
}

export function AudioPlayer({ url, isMine }: AudioPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return

        const updateTime = () => setCurrentTime(audio.currentTime)
        const updateDuration = () => setDuration(audio.duration)
        const onEnded = () => setIsPlaying(false)

        audio.addEventListener('timeupdate', updateTime)
        audio.addEventListener('loadedmetadata', updateDuration)
        audio.addEventListener('ended', onEnded)

        return () => {
            audio.removeEventListener('timeupdate', updateTime)
            audio.removeEventListener('loadedmetadata', updateDuration)
            audio.removeEventListener('ended', onEnded)
        }
    }, [url])

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause()
            } else {
                audioRef.current.play()
            }
            setIsPlaying(!isPlaying)
        }
    }

    const formatTime = (seconds: number) => {
        if (isNaN(seconds)) return '0:00'
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const progress = (currentTime / duration) * 100 || 0

    return (
        <div className={`flex items-center gap-3 py-1 pr-2 min-w-[200px] ${isMine ? 'text-primary-foreground' : 'text-foreground'}`}>
            <audio ref={audioRef} src={url} preload="metadata" />

            <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 rounded-full shrink-0 ${isMine ? 'hover:bg-primary-foreground/10 text-primary-foreground' : 'hover:bg-secondary text-primary'}`}
                onClick={togglePlay}
            >
                {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
            </Button>

            <div className="flex-1 flex flex-col gap-1">
                <div className="h-1.5 w-full bg-black/10 rounded-full overflow-hidden relative">
                    <div
                        className={`absolute top-0 left-0 h-full rounded-full ${isMine ? 'bg-primary-foreground/60' : 'bg-primary'}`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex justify-between items-center text-[10px] opacity-70 font-mono">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            <Volume2 className="h-3.5 w-3.5 opacity-50 shrink-0" />
        </div>
    )
}
