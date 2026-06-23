"use client"

/**
 * useMediaRecorder.ts
 *
 * Hook React pour gérer l'enregistrement audio style "WhatsApp".
 * Compatible iOS Safari (audio/mp4) et Android Chrome/WebView (audio/webm).
 * Nettoie les flux MediaStream pour éviter les fuites mémoire et la pastille micro persistante.
 */

import { useState, useRef, useCallback, useEffect } from "react"

interface UseMediaRecorderOptions {
  maxDurationSeconds?: number
  onBlobReady?: (blob: Blob) => void
}

interface UseMediaRecorderReturn {
  isRecording: boolean
  recordingTime: number
  audioBlob: Blob | null
  error: string | null
  startRecording: () => Promise<void>
  stopRecording: () => void
  toggleRecording: () => Promise<void>
  getAudioFile: (filename?: string) => File | null
  reset: () => void
}

function getSupportedMimeType(): string | null {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) {
    return null
  }

  const candidates = [
    "audio/mp4",
    "audio/m4a",
    "audio/aac",
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp3",
    "audio/mpeg",
    "audio/ogg",
    "audio/wav",
  ]

  for (const mimeType of candidates) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType
    }
  }

  return null
}

function isAppleContainer(mimeType: string): boolean {
  const normalized = mimeType.toLowerCase()
  return (
    normalized.startsWith("audio/mp4") ||
    normalized.startsWith("audio/m4a") ||
    normalized.startsWith("audio/aac")
  )
}

export function useMediaRecorder(options: UseMediaRecorderOptions = {}): UseMediaRecorderReturn {
  const { maxDurationSeconds = 60, onBlobReady } = options

  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const mimeTypeRef = useRef<string>("audio/webm") 

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop()
      })
      streamRef.current = null
    }
  }, [])

  const cleanupTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    cleanupStream()
    cleanupTimer()
    setIsRecording(false)
    setRecordingTime(0)
    setAudioBlob(null)
    setError(null)
    mediaRecorderRef.current = null
    chunksRef.current = []
  }, [cleanupStream, cleanupTimer])

  useEffect(() => {
    return () => {
      cleanupStream()
      cleanupTimer()
    }
  }, [cleanupStream, cleanupTimer])

  const startRecording = useCallback(async () => {
    if (isRecording || typeof navigator === "undefined" || !navigator.mediaDevices) {
      setError("L'enregistrement audio n'est pas disponible sur ce navigateur.")
      return
    }

    setError(null)
    setAudioBlob(null)
    chunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      const detectedMimeType = getSupportedMimeType()
      const mimeType = detectedMimeType ?? "audio/webm"
      mimeTypeRef.current = mimeType

      const recorderOptions = detectedMimeType ? { mimeType: detectedMimeType } : {}
      const mediaRecorder = new MediaRecorder(stream, recorderOptions)
      mediaRecorderRef.current = mediaRecorder
      streamRef.current = stream

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        setIsRecording(false)
        cleanupTimer()
        cleanupStream()
        onBlobReady?.(blob)
      }

      mediaRecorder.onerror = () => {
        setError("Une erreur est survenue pendant l'enregistrement.")
        reset()
      }

      mediaRecorder.start(100)
      setIsRecording(true)
      setRecordingTime(0)
      startTimeRef.current = Date.now()

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setRecordingTime(elapsed)

        if (elapsed >= maxDurationSeconds) {
          mediaRecorder.stop()
        }
      }, 1000)
    } catch (err) {
      console.error("MediaRecorder start error:", err)
      setError("Permission micro refusée ou navigateur incompatible.")
      cleanupStream()
    }
  }, [isRecording, maxDurationSeconds, onBlobReady, cleanupStream, cleanupTimer, reset])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
    cleanupTimer()
  }, [cleanupTimer])

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording()
    } else {
      await startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  const getAudioFile = useCallback(
    (filename?: string): File | null => {
      if (!audioBlob) return null

      const extension = isAppleContainer(audioBlob.type) ? "m4a" : "webm"
      const finalFilename = filename || `recording_${Date.now()}.${extension}`

      return new File([audioBlob], finalFilename, { type: audioBlob.type })
    },
    [audioBlob]
  )

  return {
    isRecording,
    recordingTime,
    audioBlob,
    error,
    startRecording,
    stopRecording,
    toggleRecording,
    getAudioFile,
    reset,
  }
}
