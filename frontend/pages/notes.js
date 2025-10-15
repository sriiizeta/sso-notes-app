import useSWR from 'swr'
import { useState } from 'react'

const fetcher = async (url) => {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Fetch failed')
  }
  return res.json()
}

export default function Notes() {
  const backend = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || 'http://localhost:3050'
  const { data: notes, error, mutate } = useSWR(backend + '/api/notes', fetcher)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  async function add() {
    if (!text.trim()) return
    setLoading(true)
    try {
      await fetch(backend + '/api/notes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      setText('')
      mutate()
    } finally {
      setLoading(false)
    }
  }

  async function remove(id) {
    if (!confirm('Delete this note?')) return
    await fetch(backend + '/api/notes/' + id, { method: 'DELETE', credentials: 'include' })
    mutate()
  }

  if (error) {
    if (error.message.includes('Not authenticated')) {
      if (typeof window !== 'undefined') window.location.href = `${backend}/auth/google`
      return <div>Redirecting to login...</div>
    }
    return <div>Error: {error.message}</div>
  }

  if (!notes) return <div>Loading...</div>

  return (
    <div
      style={{
        maxWidth: 700,
        margin: '60px auto',
        background: '#fdfdfd',
        padding: '30px 40px',
        borderRadius: 20,
        boxShadow: '0 0 10px rgba(0,0,0,0.1)',
        fontFamily: 'Segoe UI, sans-serif'
      }}
    >
      <h2 style={{ textAlign: 'center', color: '#5A5A5A', marginBottom: 20 }}>📝 My Pastel Notes</h2>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a note..."
          style={{
            flex: 1,
            padding: '10px 14px',
            border: '1px solid #ddd',
            borderRadius: 12,
            outline: 'none',
            fontSize: 15,
            backgroundColor: '#fffafc'
          }}
        />
        <button
          onClick={add}
          disabled={loading}
          style={{
            backgroundColor: '#a3d8f4',
            border: 'none',
            padding: '10px 18px',
            borderRadius: 20,
            cursor: 'pointer',
            transition: '0.2s',
            fontWeight: '600',
            color: '#333',
            opacity: loading ? 0.6 : 1
          }}
          onMouseOver={(e) => (e.target.style.backgroundColor = '#8ecae6')}
          onMouseOut={(e) => (e.target.style.backgroundColor = '#a3d8f4')}
        >
          ➕ {loading ? 'Adding...' : 'Add'}
        </button>
        <a
          href={backend + '/auth/logout'}
          style={{
            textDecoration: 'none',
            padding: '10px 18px',
            borderRadius: 20,
            backgroundColor: '#ffd6a5',
            color: '#333',
            fontWeight: '600'
          }}
        >
          Logout
        </a>
      </div>

      <div>
        {notes.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#888' }}>No notes yet 🌿</p>
        ) : (
          <ul style={{ listStyleType: 'disc', paddingLeft: 20 }}>
            {notes.map((n) => (
              <li
                key={n._id}
                style={{
                  background: '#f0f7f4',
                  padding: '12px 15px',
                  borderRadius: 14,
                  marginBottom: 10,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: 16, color: '#333' }}>{n.text}</div>
                  <div style={{ fontSize: 12, color: '#777', marginTop: 4 }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => remove(n._id)}
                  style={{
                    backgroundColor: '#ffadad',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: 14,
                    cursor: 'pointer',
                    transition: '0.2s',
                    fontWeight: '600'
                  }}
                  onMouseOver={(e) => (e.target.style.backgroundColor = '#ff8585')}
                  onMouseOut={(e) => (e.target.style.backgroundColor = '#ffadad')}
                >
                  🗑 Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}