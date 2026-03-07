import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Trash2, Send, X } from 'lucide-react'
import { Button } from '../ui/Button'

interface VoiceRecorderProps {
    onStart: () => void
    onSend: (file: File) => Promise<void>
    onCancel: () => void
}

export function VoiceRecorder({ onStart, onSend, onCancel }: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false)
    const [recordingTime, setRecordingTime] = useState(0)
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const timerRef = useRef<any>(null)

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop()
            }
        }
    }, [])

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const recorder = new MediaRecorder(stream)
            mediaRecorderRef.current = recorder
            chunksRef.current = []

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data)
                }
            }

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' })
                setAudioBlob(blob)
                stream.getTracks().forEach(track => track.stop())
            }

            recorder.start()
            setIsRecording(true)
            onStart()
            setRecordingTime(0)
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1)
            }, 1000)
        } catch (err) {
            console.error('Failed to start recording:', err)
            alert('Could not access microphone. Please ensure permissions are granted.')
            onCancel()
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const handleSend = async () => {
        if (audioBlob) {
            const file = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' })
            await onSend(file)
            setAudioBlob(null)
            onCancel()
        }
    }

    if (!isRecording && !audioBlob) {
        return (
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-primary hover:bg-primary/10 rounded-full"
                onClick={startRecording}
            >
                <Mic className="h-5 w-5" />
            </Button>
        )
    }

    return (
        <div className="flex items-center gap-3 bg-secondary/80 backdrop-blur-sm px-4 py-2 rounded-full absolute inset-x-2 bottom-2 z-50 animate-in slide-in-from-bottom-2">
            {isRecording ? (
                <>
                    <div className="flex items-center gap-2 flex-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-sm font-mono text-foreground">{formatTime(recordingTime)}</span>
                        <div className="flex-1 h-1 bg-primary/20 rounded-full overflow-hidden">
                            <div className="h-full bg-primary animate-progress" style={{ width: '100%' }} />
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 rounded-full"
                        onClick={stopRecording}
                    >
                        <Square className="h-4 w-4 fill-current" />
                    </Button>
                </>
            ) : (
                <>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:bg-muted rounded-full"
                        onClick={() => {
                            setAudioBlob(null)
                            onCancel()
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="flex-1 flex items-center justify-center">
                        <span className="text-sm font-medium">Voice message recorded ({formatTime(recordingTime)})</span>
                    </div>
                    <Button
                        type="button"
                        className="rounded-full h-8 w-8 p-0"
                        onClick={handleSend}
                    >
                        <Send className="h-3 w-3 ml-0.5" />
                    </Button>
                </>
            )}
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground rounded-full h-8 w-8 p-0"
                onClick={() => {
                    if (isRecording) stopRecording()
                    setAudioBlob(null)
                    onCancel()
                }}
            >
                <X className="h-4 w-4" />
            </Button>
        </div>
    )
}
