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
    <div className="mb-8 p-5 bg-indigo-50 rounded-lg border border-indigo-100">
      <h3 className="text-sm font-semibold text-indigo-900 mb-1">Invite your group!</h3>
      <p className="text-xs text-indigo-700 mb-3">Copy and share this link so others can join and add their preferences.</p>
      <div className="flex gap-2">
        <input 
          type="text" 
          readOnly 
          value={fullUrl} 
          className="flex-1 rounded border border-indigo-200 p-2 text-sm text-gray-700 outline-none bg-white font-mono" 
        />
        <button 
          type="button"
          onClick={handleCopy} 
          className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-indigo-700 transition"
        >
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>
    </div>
  )
}
