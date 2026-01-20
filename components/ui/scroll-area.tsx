"use client"

import * as React from "react"

export interface ScrollAreaProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export function ScrollArea({
  className = "",
  children,
  ...props
}: ScrollAreaProps) {
  return (
    <div
      className={`relative overflow-auto ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
