"use client"

import { useCallback, useState } from "react"
import { Mic, Square, Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useMediaRecorder } from "@/hooks/useMediaRecorder"

interface AudioRecorderProps {
  onTranscription: (text: string) => void
  disabled?: boolean
}

export function AudioRecorder({ onTranscription, disabled }: AudioRecorderProps) {
  const { t } = useTranslation()
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null)

  const handleBlobReady = useCallback(
    async (blob: Blob) => {
      setIsProcessing(true)
      const formData = new FormData()
      const normalizedType = blob.type.toLowerCase()
      const isAppleContainer =
        normalizedType.startsWith("audio/mp4") ||
        normalizedType.startsWith("audio/m4a") ||
        normalizedType.startsWith("audio/aac")
      const extension = isAppleContainer ? "m4a" : "webm"
      const filename = `recording.${extension}`
      formData.append("audio", blob, filename)

      try {
        setTranscriptionError(null)
        const response = await fetch("/api/chat/voice-to-text", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error("Transcription failed")
        }

        const data = await response.json()
        onTranscription(data.text || "")
      } catch (error) {
        console.error("Transcription error:", error)
        setTranscriptionError(t("errors.whisper_failed"))
      } finally {
        setIsProcessing(false)
      }
    },
    [onTranscription, t]
  )

  const {
    isRecording,
    recordingTime,
    error,
    startRecording,
    stopRecording,
  } = useMediaRecorder({
    maxDurationSeconds: 60,
    onBlobReady: handleBlobReady,
  })

  const handlePointerDown = (event: React.PointerEvent) => {
    event.preventDefault()
    setTranscriptionError(null)
    startRecording()
  }

  const handlePointerUp = (event: React.PointerEvent) => {
    event.preventDefault()
    stopRecording()
  }

  const handlePointerLeave = (event: React.PointerEvent) => {
    event.preventDefault()
    if (isRecording) {
      stopRecording()
    }
  }

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onContextMenu={(e) => e.preventDefault()}
      disabled={disabled || isProcessing}
      className={`relative flex items-center justify-center h-14 w-14 rounded-full text-white shadow-lg select-none touch-none transition active:scale-90 ${
        isRecording ? "bg-red-500 animate-pulse" : "bg-green-600 hover:bg-green-700"
      }`}
      aria-label={isRecording ? t("chat.stop") : t("chat.record")}
    >
      {isProcessing ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : isRecording ? (
        <Square className="h-6 w-6" />
      ) : (
        <Mic className="h-6 w-6" />
      )}
      {isRecording && recordingTime > 0 && (
        <span className="absolute -top-2 -right-2 flex h-6 w-10 items-center justify-center rounded-full bg-black/70 text-xs text-white">
          {recordingTime}s
        </span>
      )}
      {error && (
        <span className="absolute -bottom-8 left-1/2 z-10 w-48 -translate-x-1/2 rounded-md bg-red-500 px-2 py-1 text-xs text-white">
          {error}
        </span>
      )}
      {transcriptionError && (
        <span className="absolute -bottom-16 left-1/2 z-10 w-56 -translate-x-1/2 rounded-md bg-red-500 px-2 py-1 text-xs text-white">
          {transcriptionError}
        </span>
      )}
    </button>
  )
}
