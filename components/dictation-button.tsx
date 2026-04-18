"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff } from "lucide-react"
import { cn } from "@/lib/utils"

type DictationButtonProps = {
  /** Appends each finalized speech segment (add spaces in the parent if needed). */
  appendText: (snippet: string) => void
  disabled?: boolean
  className?: string
  size?: "default" | "sm" | "lg" | "icon"
}

/**
 * Browser speech-to-text (Web Speech API). Works best in Chrome / Edge over HTTPS.
 * IMAP is not used — this only captures microphone input for prompts.
 */
export function DictationButton({
  appendText,
  disabled,
  className,
  size = "icon",
}: DictationButtonProps) {
  const appendRef = useRef(appendText)
  appendRef.current = appendText

  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const Win = window as Window &
      typeof globalThis & {
        SpeechRecognition?: new () => unknown
        webkitSpeechRecognition?: new () => unknown
      }
    const Ctor = Win.SpeechRecognition ?? Win.webkitSpeechRecognition
    if (!Ctor) {
      setSupported(false)
      return
    }

    const rec = new Ctor()
    rec.continuous = true
    rec.interimResults = false
    rec.lang = typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US"

    rec.onresult = (event: unknown) => {
      const ev = event as {
        resultIndex: number
        results: Array<{ isFinal: boolean; 0: { transcript: string } }>
      }
      let chunk = ""
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) chunk += ev.results[i][0].transcript
      }
      const t = chunk.trim()
      if (t) appendRef.current(t)
    }

    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)

    recRef.current = rec
    setSupported(true)

    return () => {
      try {
        rec.abort()
      } catch {
        /* ignore */
      }
    }
  }, [])

  const toggle = useCallback(() => {
    const rec = recRef.current
    if (!rec || disabled) return
    if (listening) {
      try {
        rec.stop()
      } catch {
        /* ignore */
      }
      setListening(false)
      return
    }
    try {
      rec.start()
      setListening(true)
    } catch {
      setListening(false)
    }
  }, [disabled, listening])

  if (!supported) {
    return null
  }

  return (
    <Button
      type="button"
      variant={listening ? "default" : "outline"}
      size={size}
      className={cn("shrink-0", className)}
      disabled={disabled}
      onClick={toggle}
      title={listening ? "Stop dictation" : "Speak to type (browser mic)"}
      aria-pressed={listening}
      aria-label={listening ? "Stop dictation" : "Start dictation"}
    >
      {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  )
}
