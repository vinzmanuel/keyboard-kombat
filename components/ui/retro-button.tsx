"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type RetroButtonProps = {
  children: ReactNode
  onClick: () => void
  color?: "green" | "red" | "blue" | "purple" | "yellow"
  size?: "sm" | "md" | "lg"
  disabled?: boolean
  className?: string
}

const colorStyles = {
  green: "bg-green-600 border-green-400 text-green-100 shadow-[0_8px_0_0] shadow-green-800",
  red: "bg-red-600 border-red-400 text-red-100 shadow-[0_8px_0_0] shadow-red-900",
  blue: "bg-blue-600 border-blue-400 text-blue-100 shadow-[0_8px_0_0] shadow-blue-900",
  purple: "bg-purple-600 border-purple-400 text-purple-100 shadow-[0_8px_0_0] shadow-purple-800",
  yellow: "bg-yellow-600 border-yellow-400 text-yellow-100 shadow-[0_8px_0_0] shadow-yellow-800",
}

const sizeStyles = {
  sm: "text-base py-2 px-4",
  md: "text-lg py-3 px-5",
  lg: "text-xl py-4 px-6",
}

export default function RetroButton({
  children,
  onClick,
  color = "green",
  size = "md",
  disabled = false,
  className,
}: RetroButtonProps) {
  // Map for hover shadow color
  const hoverShadowMap = {
    green: "hover:shadow-green-800",
    red: "hover:shadow-red-900",
    blue: "hover:shadow-blue-900",
    purple: "hover:shadow-purple-800",
    yellow: "hover:shadow-yellow-800",
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "font-bold uppercase tracking-wider border-3 rounded-md transition-all flex items-center justify-center",
        "active:translate-y-2 active:shadow-none",
        "hover:-translate-y-1 hover:shadow-[0_12px_0_0]",
        hoverShadowMap[color],
        colorStyles[color],
        sizeStyles[size],
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      {children}
    </button>
  )
}
