'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function NavigationProgress() {
  const pathname = usePathname()
  const [animKey, setAnimKey] = useState(0)

  useEffect(() => {
    setAnimKey((k) => k + 1)
  }, [pathname])

  return (
    <div
      key={animKey}
      className="fixed top-0 inset-x-0 z-[300] h-[2px] pointer-events-none overflow-hidden"
    >
      <div
        className="h-full bg-gradient-to-r from-purple-600 via-purple-400 to-purple-600"
        style={{ animation: 'navProgress 0.45s cubic-bezier(0.4, 0, 0.2, 1) forwards' }}
      />
    </div>
  )
}
