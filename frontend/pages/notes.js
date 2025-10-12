import useSWR from 'swr'
import { useState } from 'react'


const fetcher = (url) => fetch(url, { credentials: 'include' }).then(r => r.json())


export default function Notes() {
const backend = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || 'http://localhost:3050'
const { data: notes, mutate } = useSWR(backend + '/api/notes', fetcher)
const [text, setText] = useState('')


async function add() {
if (!text.trim()) return
await fetch(backend + '/api/notes', { method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ text }) })
setText('')
mutate()
}


async function remove(id) {
if (!confirm('Delete?')) return
await fetch(backend + '/api/notes/' + id, { method: 'DELETE', credentials: 'include' })
mutate()
}


if (!notes) return <div>Loading...</div>
if (notes.error) return <div>{notes.error}</div>


return (
<div style={{maxWidth:800,margin:'40px auto'}}>
<div style={{display:'flex',gap:8,marginBottom:12}}>
<input value={text} onChange={(e)=>setText(e.target.value)} placeholder="Write a note..." style={{flex:1,padding:8}} />
<button onClick={add}>Add</button>
<a href={backend + '/auth/logout'} style={{marginLeft:8}}>Logout</a>
</div>
<div>
{notes.length === 0 ? <p>No notes yet</p> : notes.map(n => (
<div key={n._id} style={{padding:10,border:'1px solid #eee',marginBottom:8,display:'flex',justifyContent:'space-between'}}>
<div>{n.text}<div style={{fontSize:12,color:'#666'}}>{new Date(n.createdAt).toLocaleString()}</div></div>
<div><button onClick={()=>remove(n._id)}>Delete</button></div>
</div>
))}
</div>
</div>
)
}