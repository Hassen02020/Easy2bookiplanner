"use client"

import { useState, useRef, useCallback } from "react"
import { Mic, Square } from "lucide-react"
import { useTranslation } from "react-i18next"

interface AudioRecorderProps {
  onTranscription: (text: string) => void
  disabled?: boolean
}

function getSupportedMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/m4a",
    "audio/aac",
    "audio/ogg",
  ]

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }

  return "audio/webm"
}

export function AudioRecorder({ onTranscription, disabled }: AudioRecorderProps) {
  const { t } = useTranslation()
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getSupportedMimeType()
      const mediaRecorder = new MediaRecorder(stream, { mimeType })

      streamRef.current = stream
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType })
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null

        await sendAudio(audioBlob)
      }

      mediaRecorder.start(100)
      setIsRecording(true)
    } catch (error) {
      console.error("Failed to start recording:", error)
      alert(t("errors.audio_not_supported"))
    }
  }, [t])

  const stopRecording = useCallback(() => {
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current)
      stopTimeoutRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [])

  const handlePointerDown = (event: React.PointerEvent) => {
    event.preventDefault()
    startRecording()
  }

  const handlePointerUp = (event: React.PointerEvent) => {
    event.preventDefault()
    stopTimeoutRef.current = setTimeout(() => stopRecording(), 150)
  }

  const handlePointerLeave = (event: React.PointerEvent) => {
    event.preventDefault()
    if (isRecording) {
      stopRecording()
    }
  }

  const sendAudio = async (audioBlob: Blob) => {
    setIsProcessing(true)
    try {
      const formData = new FormData()
      const normalizedType = audioBlob.type.toLowerCase()
      const isAppleContainer =
        normalizedType.startsWith("audio/mp4") ||
        normalizedType.startsWith("audio/m4a") ||
        normalizedType.startsWith("audio/aac")
      const extension = isAppleContainer ? "m4a" : "webm"
      const filename = `recording.${extension}`
      formData.append("audio", audioBlob, filename)

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
      alert(t("errors.whisper_failed"))
    } finally {
      setIsProcessing(false)
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
      className={`flex items-center justify-center h-14 w-14 rounded-full text-white shadow-lg select-none touch-none transition active:scale-90 ${
        isRecording ? "bg-red-500 animate-pulse" : "bg-green-600 hover:bg-green-700"
      }`}
      aria-label={isRecording ? t("chat.stop") : t("chat.record")}
    >
      {isRecording ? <Square className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
    </button>
  )
}
