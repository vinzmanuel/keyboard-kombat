import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type RetroTitleProps = {
  children: ReactNode
  className?: string
  size?: "sm" | "md" | "lg"
}

export default function RetroTitle({ children, className, size = "lg" }: RetroTitleProps) {
  const sizeStyles = {
    sm: "text-3xl",
    md: "text-4xl",
    lg: "text-6xl",
  }

  return (
    <h1
      className={cn(
        "font-bold uppercase tracking-widest text-center",
        "text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-500 to-green-500",
        "drop-shadow-[0_3px_3px_rgba(255,0,0,0.8)]",
        sizeStyles[size],
        className,
      )}
    >
      {children}
    </h1>
  )
}
