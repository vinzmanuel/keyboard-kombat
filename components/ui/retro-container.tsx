import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type RetroContainerProps = {
  children: ReactNode
  className?: string
  variant?: "primary" | "secondary" | "dark"
}

export default function RetroContainer({ children, className, variant = "primary" }: RetroContainerProps) {
  const variantStyles = {
    primary: "bg-gray-900 border-blue-500",
    secondary: "bg-gray-800 border-green-500",
    dark: "bg-black border-purple-500",
  }

  return (
    <div
      className={cn("border-4 rounded-lg p-8 shadow-[0_0_30px_rgba(0,0,255,0.5)]", variantStyles[variant], className)}
    >
      {children}
    </div>
  )
}
