import { useRouter } from 'next/router'

export default function Home() {
  const backend =
    process.env.NEXT_PUBLIC_BACKEND_ORIGIN ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'http://localhost:3050'

  const router = useRouter()

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #FFF9FB 0%, #F6FDFF 50%, #F8FFF4 100%)',
        fontFamily: 'Segoe UI, Roboto, system-ui, -apple-system, "Helvetica Neue", Arial'
      }}
    >
      <div
        style={{
          width: 'min(920px, 94%)',
          display: 'grid',
          gridTemplateColumns: '1fr 420px',
          gap: 28,
          alignItems: 'center',
          background: 'white',
          padding: '34px',
          borderRadius: 20,
          boxShadow: '0 12px 30px rgba(18, 38, 63, 0.07)'
        }}
      >
        {/* Left Section */}
        <div style={{ paddingRight: 8 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 38,
              color: '#4B5563',
              letterSpacing: '-0.02em'
            }}
          >
            <span
              style={{
                display: 'inline-block',
                marginRight: 10,
                background: 'linear-gradient(90deg,#a3d8f4,#ffd6a5)',
                padding: '6px 12px',
                borderRadius: 14,
                color: '#243746',
                fontWeight: 700
              }}
            >
              My Pastel Notes
            </span>
          </h1>

          <p style={{ marginTop: 14, color: '#6B7280', lineHeight: 1.6, fontSize: 16 }}>
            A lightweight notes app with Single Sign-On. Sign in with Google to save your notes
            safely — pastel vibes guaranteed. ✨
          </p>

          <ul style={{ marginTop: 18, color: '#6B7280', lineHeight: 1.8 }}>
            <li style={{ marginBottom: 6 }}>Quick notes with a calm pastel UI</li>
            <li style={{ marginBottom: 6 }}>Save and delete notes tied to your account</li>
            <li>Secure login with Google SSO</li>
          </ul>
        </div>

        {/* Right Section - Google Sign In */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <a
            href={${backend}/auth/google}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '20px 16px',
              borderRadius: 18,
              background: 'linear-gradient(90deg,#8ecae6,#a3d8f4)',
              color: '#083344',
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: 16,
              boxShadow: '0 6px 18px rgba(131,197,224,0.22)',
              textAlign: 'center'
            }}
          >
            Sign in with Google
          </a>
        </div>
      </div>
    </div>
  )
}