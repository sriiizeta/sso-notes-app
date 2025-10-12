// frontend/pages/notes.js
import useSWR from 'swr'
import { useState } from 'react'
import { useRouter } from 'next/router'

const fetcher = (url) => fetch(url, { credentials: 'include' }).then(r => r.json())

export default function Notes() {
  const backend = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3050'
  const { data: notes, mutate } = useSWR(backend + '/api/notes', fetcher, { revalidateOnFocus: false })
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()

  // if not logged in, server returns 401 -> notes will be { error } or the fetch will throw JSON
  // you'll want to guard routes on the client (optional): redirect to home if unauthenticated
  // but here we show basic behavior and rely on server redirect during login flow.

  async function add() {
    setError(null)
    const trimmed = text.trim()
    if (!trimmed) return

    const tempId = 'temp-' + Date.now()
    const optimisticNote = { _id: tempId, text: trimmed, createdAt: new Date().toISOString() }
    // optimistic update
    mutate(old => (old ? [optimisticNote, ...old] : [optimisticNote]), false)

    setText('')
    setSaving(true)
    try {
      const res = await fetch(backend + '/api/notes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed })
      })

      if (!res.ok) {
        // revert
        mutate()
        const body = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(body.error || res.statusText)
      }

      const saved = await res.json()
      // replace optimistic with saved
      mutate(old => {
        if (!old) return [saved]
        return old.map(n => (n._id === tempId ? saved : n))
      }, false)
    } catch (err) {
      console.error('Add note failed', err)
      setError(err.message || 'Failed to add note')
      mutate() // revalidate
    } finally {
      setSaving(false)
    }
  }

  async function remove(id) {
    if (!confirm('Delete?')) return
    const previous = notes
    mutate(old => old.filter(n => n._id !== id), false)
    try {
      const res = await fetch(backend + '/api/notes/' + id, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) {
        throw new Error('Delete failed')
      }
    } catch (err) {
      console.error(err)
      mutate(previous, false)
      alert('Delete failed')
    }
  }

  if (!notes) return <div style={{ padding: 24 }}>Loading...</div>
  if (notes.error) {
    // if server responded with { error: 'Not authenticated' } redirect to home to login
    if (notes.error === 'Not authenticated') {
      // optional: redirect to index which has sign-in link
      if (typeof window !== 'undefined') router.push('/')
      return <div style={{ padding: 24 }}>Redirecting to login...</div>
    }
    return <div style={{ padding: 24 }}>{notes.error}</div>
  }

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: 16 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a note..." style={{ flex: 1, padding: 8 }} />
        <button onClick={add} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving…' : 'Add'}
        </button>
        <a href={backend + '/auth/logout'} style={{ marginLeft: 8 }}>Logout</a>
      </div>

      {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}

      <div>
        {notes.length === 0 ? <p>No notes yet</p> : notes.map(n => (
          <div key={n._id} style={{ padding: 10, border: '1px solid #eee', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <div>
              {n.text}
              <div style={{ fontSize: 12, color: '#666' }}>{new Date(n.createdAt).toLocaleString()}</div>
            </div>
            <div><button onClick={() => remove(n._id)}>Delete</button></div>
          </div>
        ))}
      </div>
    </div>
  )
}
