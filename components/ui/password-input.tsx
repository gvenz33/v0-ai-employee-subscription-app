"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type PasswordInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  /** Set false to behave like a plain masked input without a toggle */
  showToggle?: boolean
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showToggle = true, disabled, ...props }, ref) => {
    const [show, setShow] = React.useState(false)

    if (!showToggle) {
      return <Input ref={ref} type="password" className={className} disabled={disabled} {...props} />
    }

    return (
      <div className="relative w-full">
        <Input
          ref={ref}
          type={show ? "text" : "password"}
          className={cn("pr-10", className)}
          disabled={disabled}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:text-foreground"
          onClick={() => setShow((v) => !v)}
          disabled={disabled}
          aria-label={show ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    )
  }
)
PasswordInput.displayName = "PasswordInput"

export { PasswordInput }
