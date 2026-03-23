'use client'

import { useState, useRef, useEffect } from 'react'

export type GroupedOption = { label: string; items: string[] }

interface ComboboxProps {
  options?: string[]
  groups?: GroupedOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export default function Combobox({ options = [], groups, value, onChange, placeholder = '', disabled = false }: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [highlighted, setHighlighted] = useState(0)

  // Flatten groups into selectable items, keeping track of indices
  const allItems: string[] = groups
    ? groups.flatMap((g) => g.items)
    : options

  const filtered = query.trim()
    ? allItems.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : allItems

  useEffect(() => {
    setHighlighted(0)
  }, [query])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const select = (option: string) => {
    onChange(option)
    setOpen(false)
    setQuery('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true)
        e.preventDefault()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[highlighted]) select(filtered[highlighted])
      else if (query.trim()) { onChange(query.trim()); setOpen(false); setQuery('') }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  useEffect(() => {
    if (open && listRef.current) {
      const item = listRef.current.children[highlighted] as HTMLElement
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlighted, open])

  const inputClass = "w-full bg-transparent border border-white/10 rounded-md px-2.5 py-1.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/60 transition-colors"

  const renderList = () => {
    if (filtered.length === 0) {
      return <li className="px-3 py-2 text-xs text-white/30 text-center">Aucun résultat</li>
    }

    // Si recherche active ou pas de groupes → affichage plat
    if (query.trim() || !groups) {
      return filtered.map((option, i) => (
        <li
          key={option}
          onMouseDown={(e) => { e.preventDefault(); select(option) }}
          onMouseEnter={() => setHighlighted(i)}
          className={`px-3 py-1.5 text-sm cursor-pointer transition-colors ${
            i === highlighted ? 'bg-purple-600/30 text-white' : 'text-white/80 hover:bg-white/5'
          } ${option === value ? 'font-medium' : ''}`}
        >
          {option}
        </li>
      ))
    }

    // Affichage groupé
    let globalIndex = 0
    return groups.map((group) => (
      <li key={group.label}>
        <div className="px-3 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-widest text-purple-400/70 select-none">
          {group.label}
        </div>
        <ul>
          {group.items.map((option) => {
            const i = globalIndex++
            return (
              <li
                key={option}
                onMouseDown={(e) => { e.preventDefault(); select(option) }}
                onMouseEnter={() => setHighlighted(i)}
                className={`px-3 py-1.5 text-sm cursor-pointer transition-colors ${
                  i === highlighted ? 'bg-purple-600/30 text-white' : 'text-white/80 hover:bg-white/5'
                } ${option === value ? 'font-medium' : ''}`}
              >
                {option}
              </li>
            )
          })}
        </ul>
      </li>
    ))
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          placeholder={open ? 'Rechercher...' : (value || placeholder)}
          value={open ? query : (value || '')}
          onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className={`${inputClass} pr-7 ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
          autoComplete="off"
        />
        <button
          type="button"
          disabled={disabled}
          tabIndex={-1}
          onClick={() => { setOpen((o) => !o); inputRef.current?.focus() }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {open && (
        <ul
          ref={listRef}
          className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-[#1a1a26] border border-white/10 rounded-lg shadow-xl py-1"
        >
          {renderList()}
        </ul>
      )}
    </div>
  )
}
