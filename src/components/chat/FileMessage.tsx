import { FileText, File, FileArchive, Download, ExternalLink } from 'lucide-react'

interface FileMessageProps {
    fileUrl: string
    fileName: string
    fileSize?: number
}

export const FileMessage = ({ fileUrl, fileName, fileSize }: FileMessageProps) => {
    const extension = fileName.split('.').pop()?.toLowerCase()

    const getIcon = () => {
        switch (extension) {
            case 'pdf':
                return <FileText className="h-10 w-10 text-rose-500" />
            case 'zip':
            case 'rar':
            case '7z':
                return <FileArchive className="h-10 w-10 text-amber-500" />
            case 'doc':
            case 'docx':
                return <FileText className="h-10 w-10 text-blue-500" />
            default:
                return <File className="h-10 w-10 text-muted-foreground" />
        }
    }

    const formatSize = (bytes?: number) => {
        if (!bytes) return ''
        const units = ['B', 'KB', 'MB', 'GB']
        let size = bytes
        let unitIndex = 0
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024
            unitIndex++
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`
    }

    return (
        <div className="flex flex-col gap-2 p-3 bg-secondary/30 rounded-2xl border border-border/50 max-w-xs transition-all hover:bg-secondary/40 shadow-sm">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-background rounded-xl shadow-inner">
                    {getIcon()}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate" title={fileName}>
                        {fileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {extension?.toUpperCase()} {formatSize(fileSize) && `• ${formatSize(fileSize)}`}
                    </p>
                </div>
            </div>

            <div className="flex gap-2 mt-1">
                <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity active:scale-[0.98]"
                >
                    <Download className="h-3.5 w-3.5" />
                    Download
                </a>
                <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center p-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                    title="Open in new tab"
                >
                    <ExternalLink className="h-3.5 w-3.5" />
                </a>
            </div>
        </div>
    )
}
