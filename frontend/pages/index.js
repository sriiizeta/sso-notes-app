import React from 'react'


export default function Home() {
const backend = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || 'http://localhost:3050'
return (
<div style={{display:'flex',minHeight:'100vh',alignItems:'center',justifyContent:'center'}}>
<div style={{maxWidth:640,padding:24,border:'1px solid #eee',borderRadius:8}}>
<h1>Notes App (SSO via Passport.js)</h1>
<p>Sign in with Google to continue.</p>
<a href={`${backend}/auth/google`} style={{display:'inline-block',padding:'10px 14px',background:'#4285F4',color:'#fff',borderRadius:6,textDecoration:'none'}}>Sign in with Google</a>
</div>
</div>
)
}