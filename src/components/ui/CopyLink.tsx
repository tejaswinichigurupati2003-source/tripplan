'use client'

import { useState, useEffect } from 'react'

export default function CopyLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false)
  const [fullUrl, setFullUrl] = useState('')

  useEffect(() => {
    setFullUrl(window.location.origin + path)
  }, [path])

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!fullUrl) return null

  return (
    <div className="mb-8 p-5 bg-accent-soft/40 rounded-2xl border border-card-border">
      <h3 className="text-sm font-semibold text-ink mb-1">Invite your group!</h3>
      <p className="text-xs text-muted mb-3">Copy and share this link so others can join and add their preferences.</p>
      <div className="flex gap-2">
        <input
          type="text"
          readOnly
          value={fullUrl}
          className="flex-1 rounded-xl border border-card-border p-2 text-sm text-ink outline-none bg-white font-mono"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="bg-ink text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-ink/90 transition"
        >
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>
    </div>
  )
}
