"use client"

import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff } from "lucide-react"
import { cn } from "@/lib/utils"

type DictationButtonProps = {
  /** Appends each finalized speech segment (add spaces in the parent if needed). */
  appendText: (snippet: string) => void
  disabled?: boolean
  className?: string
  size?: "default" | "sm" | "lg" | "icon"
  /**
   * Wrapper that contains both this mic control and the field you type into (label row + textarea).
   */
  gestureRestartRoot?: HTMLElement | null
  /**
   * Focused before recognition starts. Brave/Chromium often abort the session when focus moves
   * from the mic button into the field; starting after the field already has focus avoids that.
   */
  speechFieldRef?: RefObject<HTMLInputElement | HTMLTextAreaElement | null>
}

/**
 * Browser speech-to-text (Web Speech API). Works best in Chromium (Chrome, Edge, Brave) over HTTPS.
 */
export function DictationButton({
  appendText,
  disabled,
  className,
  size = "icon",
  gestureRestartRoot = null,
  speechFieldRef,
}: DictationButtonProps) {
  const appendRef = useRef(appendText)
  appendRef.current = appendText

  const [supported, setSupported] = useState(false)
  /** User wants dictation on (mic icon); kept true across Brave focus glitches until explicit stop or fatal error. */
  const [micOn, setMicOn] = useState(false)
  const activeIntentRef = useRef(false)
  const resumePollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null)

  const clearResumePoll = useCallback(() => {
    if (resumePollRef.current != null) {
      clearInterval(resumePollRef.current)
      resumePollRef.current = null
    }
  }, [])

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

    rec.onerror = (event: Event) => {
      const code = (event as { error?: string }).error
      if (code === "not-allowed" || code === "service-not-allowed" || code === "audio-capture") {
        clearResumePoll()
        activeIntentRef.current = false
        setMicOn(false)
      }
    }

    rec.onstart = () => {
      clearResumePoll()
    }

    const startResumePoll = () => {
      clearResumePoll()
      let ticks = 0
      resumePollRef.current = window.setInterval(() => {
        ticks++
        if (!activeIntentRef.current || ticks > 80) {
          clearResumePoll()
          if (ticks > 80 && activeIntentRef.current) {
            activeIntentRef.current = false
            setMicOn(false)
          }
          return
        }
        try {
          rec.start()
        } catch {
          /* between sessions or invalid state — try again */
        }
      }, 120)
    }

    const tryRestartAfterEnd = (attempt: number) => {
      if (!activeIntentRef.current) return
      try {
        rec.start()
      } catch {
        if (attempt < 16) {
          window.setTimeout(() => tryRestartAfterEnd(attempt + 1), 35 + attempt * 25)
        } else {
          startResumePoll()
        }
      }
    }

    rec.onend = () => {
      if (!activeIntentRef.current) {
        clearResumePoll()
        setMicOn(false)
        return
      }
      // Keep mic UI on; Brave often ends the session on focus — retry then poll until onstart clears poll.
      window.setTimeout(() => tryRestartAfterEnd(0), 0)
      window.setTimeout(() => tryRestartAfterEnd(0), 100)
    }

    recRef.current = rec
    setSupported(true)

    return () => {
      clearResumePoll()
      activeIntentRef.current = false
      try {
        rec.abort()
      } catch {
        /* ignore */
      }
    }
  }, [clearResumePoll])

  useEffect(() => {
    const root = gestureRestartRoot
    if (!supported || !root) return

    const resumeFromGesture = () => {
      if (!activeIntentRef.current) return
      const recognition = recRef.current
      if (!recognition) return
      const tryOnce = () => {
        try {
          recognition.start()
          return true
        } catch {
          return false
        }
      }
      if (tryOnce()) return
      requestAnimationFrame(() => {
        if (tryOnce()) return
        requestAnimationFrame(() => {
          if (tryOnce()) return
          requestAnimationFrame(() => tryOnce())
        })
      })
    }

    root.addEventListener("pointerdown", resumeFromGesture, true)
    root.addEventListener("mousedown", resumeFromGesture, true)
    root.addEventListener("focusin", resumeFromGesture, true)
    root.addEventListener("pointerdown", resumeFromGesture, false)
    root.addEventListener("focusin", resumeFromGesture, false)

    return () => {
      root.removeEventListener("pointerdown", resumeFromGesture, true)
      root.removeEventListener("mousedown", resumeFromGesture, true)
      root.removeEventListener("focusin", resumeFromGesture, true)
      root.removeEventListener("pointerdown", resumeFromGesture, false)
      root.removeEventListener("focusin", resumeFromGesture, false)
    }
  }, [supported, gestureRestartRoot])

  const toggle = useCallback(() => {
    const rec = recRef.current
    if (!rec || disabled) return
    if (micOn) {
      clearResumePoll()
      activeIntentRef.current = false
      try {
        rec.stop()
      } catch {
        /* ignore */
      }
      setMicOn(false)
      return
    }

    activeIntentRef.current = true
    setMicOn(true)

    const field = speechFieldRef?.current
    if (field) {
      try {
        field.focus({ preventScroll: true })
      } catch {
        /* ignore */
      }
    }

    const tryKick = (attempt: number) => {
      if (!activeIntentRef.current) return
      try {
        rec.start()
      } catch {
        if (attempt < 12) {
          window.setTimeout(() => tryKick(attempt + 1), 45 + attempt * 20)
        } else {
          activeIntentRef.current = false
          setMicOn(false)
        }
      }
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => tryKick(0))
    })
  }, [clearResumePoll, disabled, micOn, speechFieldRef])

  if (!supported) {
    return null
  }

  return (
    <Button
      type="button"
      variant={micOn ? "default" : "outline"}
      size={size}
      className={cn("shrink-0", className)}
      disabled={disabled}
      onClick={toggle}
      title={
        micOn
          ? "Stop dictation"
          : "Speak to type — the instructions field is focused first so dictation keeps running in Brave/Chrome"
      }
      aria-pressed={micOn}
      aria-label={micOn ? "Stop dictation" : "Start dictation"}
    >
      {micOn ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  )
}
