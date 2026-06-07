import { useState } from 'react'
import { useProfile } from './ProfileContext'

const LockIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>)
const EyeIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>)
const EyeOffIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>)
const CheckCircleIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>)
const BugIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m8 2 1.88 1.88M14.12 3.88 16 2M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M6 17H2M18.47 9c-1.93-.2-3.53-1.9-3.53-4M18 13h4M18 17h4M12 9v9"/></svg>)

export default function CredentialsManager() {
  const [linkedin, setLinkedin] = useState({ email: '', password: '' })
  const [naukri, setNaukri] = useState({ email: '', password: '' })
  const [saved, setSaved] = useState({})
  const [showPass, setShowPass] = useState({ linkedin: false, naukri: false })
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const [debug, setDebug] = useState(null)
  const [debugLoading, setDebugLoading] = useState(false)

  // Load saved credentials on mount
  useState(() => {
    if (window.electronAPI?.getCredentials) {
      window.electronAPI.getCredentials().then(creds => {
        console.log('[CredsManager] Loaded creds:', JSON.stringify(creds))
        if (creds?.linkedin) setLinkedin({ email: creds.linkedin.email || '', password: '' })
        if (creds?.naukri) setNaukri({ email: creds.naukri.email || '', password: '' })
        const s = {}
        if (creds?.linkedin?.email) s.linkedin = true
        if (creds?.naukri?.email) s.naukri = true
        setSaved(s)
      })
    }
  })

  const handleSave = async (platform) => {
    const creds = platform === 'linkedin' ? linkedin : naukri
    if (!creds.email || !creds.password) { setStatus({ type: 'error', message: 'Enter both email and password.' }); return }
    setSaving(true)
    setStatus(null)
    try {
      if (window.electronAPI?.saveCredentials) {
        const result = await window.electronAPI.saveCredentials(platform, { email: creds.email, password: creds.password })
        console.log('[CredsManager] Save result:', JSON.stringify(result))
        if (result.success) {
          setSaved(prev => ({ ...prev, [platform]: true }))
          setStatus({ type: 'success', message: '✅ Saved and verified! Try "Search All Platforms — Background" now.' })
        } else {
          setStatus({ type: 'error', message: '❌ Save failed. Check console for details.' })
        }
      }
    } catch (e) {
      console.error('[CredsManager] Save error:', e)
      setStatus({ type: 'error', message: '❌ Error: ' + e.message })
    }
    setSaving(false)
  }

  const handleDebug = async () => {
    setDebugLoading(true)
    setDebug(null)
    try {
      const creds = await window.electronAPI?.getCredentials()
      const raw = await window.electronAPI?.getRawCredentials?.()
      setDebug({ creds: JSON.stringify(creds), raw: raw || 'no raw API' })
    } catch (e) {
      setDebug({ error: e.message })
    }
    setDebugLoading(false)
  }

  const linkedinStatus = saved.linkedin
    ? { label: 'Saved', color: '#22c55e', icon: <CheckCircleIcon /> }
    : { label: 'Not saved', color: '#64748b', icon: null }

  const naukriStatus = saved.naukri
    ? { label: 'Saved', color: '#22c55e', icon: <CheckCircleIcon /> }
    : { label: 'Not saved', color: '#64748b', icon: null }

  return (
    <div className="creds-manager">
      <div className="creds-info">
        <LockIcon />
        <p>Credentials are encrypted and stored locally on your machine only. Never sent to any server.</p>
      </div>

      {status && (
        <div className={`creds-status-msg ${status.type}`}>
          {status.message}
        </div>
      )}

      {/* LinkedIn */}
      <div className="creds-card">
        <div className="creds-card-header">
          <div className="creds-platform">
            <span className="creds-emoji">💼</span>
            <div>
              <span className="creds-name">LinkedIn</span>
              <span className="creds-status" style={{ color: linkedinStatus.color }}>
                {linkedinStatus.icon} {linkedinStatus.label}
              </span>
            </div>
          </div>
        </div>

        <div className="creds-fields">
          <div className="creds-field">
            <label>Email</label>
            <input type="email" placeholder="anupchandavar21@gmail.com" value={linkedin.email}
              onChange={e => setLinkedin(l => ({ ...l, email: e.target.value }))} className="creds-input" />
          </div>
          <div className="creds-field">
            <label>Password</label>
            <div className="creds-password-wrap">
              <input type={showPass.linkedin ? 'text' : 'password'} placeholder="••••••••••••"
                value={linkedin.password}
                onChange={e => setLinkedin(l => ({ ...l, password: e.target.value }))} className="creds-input" />
              <button className="creds-eye" onClick={() => setShowPass(p => ({ ...p, linkedin: !p.linkedin }))}>
                {showPass.linkedin ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
        </div>

        <div className="creds-actions">
          <button className="creds-save-btn" onClick={() => handleSave('linkedin')}
            disabled={saving || !linkedin.email || !linkedin.password}>
            {saving ? 'Saving...' : saved.linkedin ? 'Update' : 'Save'}
          </button>
          <button className="creds-debug-btn" onClick={handleDebug} disabled={debugLoading} style={{ marginLeft: 8 }}>
            {debugLoading ? '...' : <><BugIcon /> Debug</>}
          </button>
        </div>
      </div>

      {/* Naukri */}
      <div className="creds-card" style={{ marginTop: 12 }}>
        <div className="creds-card-header">
          <div className="creds-platform">
            <span className="creds-emoji">🔍</span>
            <div>
              <span className="creds-name">Naukri</span>
              <span className="creds-status" style={{ color: naukriStatus.color }}>
                {naukriStatus.icon} {naukriStatus.label}
              </span>
            </div>
          </div>
        </div>

        <div className="creds-fields">
          <div className="creds-field">
            <label>Email</label>
            <input type="email" placeholder="your@email.com" value={naukri.email}
              onChange={e => setNaukri(n => ({ ...n, email: e.target.value }))} className="creds-input" />
          </div>
          <div className="creds-field">
            <label>Password</label>
            <div className="creds-password-wrap">
              <input type={showPass.naukri ? 'text' : 'password'} placeholder="••••••••••••"
                value={naukri.password}
                onChange={e => setNaukri(n => ({ ...n, password: e.target.value }))} className="creds-input" />
              <button className="creds-eye" onClick={() => setShowPass(p => ({ ...p, naukri: !p.naukri }))}>
                {showPass.naukri ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
        </div>

        <div className="creds-actions">
          <button className="creds-save-btn" onClick={() => handleSave('naukri')}
            disabled={saving || !naukri.email || !naukri.password}>
            {saving ? 'Saving...' : saved.naukri ? 'Update' : 'Save'}
          </button>
        </div>
      </div>

      {debug && (
        <div className="creds-card" style={{ marginTop: 12, background: '#0f1419', border: '1px solid #1a2332' }}>
          <div className="creds-card-header" style={{ borderBottom: '1px solid #1a2332', marginBottom: 10 }}>
            <span className="creds-name" style={{ color: '#f59e0b' }}>🔧 Debug Info</span>
          </div>
          {debug.error ? <p style={{ color: '#f87171', fontSize: 12 }}>Error: {debug.error}</p> : (
            <>
              <p style={{ color: '#86efac', fontSize: 12, marginBottom: 4, wordBreak: 'break-all' }}>
                <strong>getCredentials() returned:</strong><br />{debug.creds}
              </p>
              <p style={{ color: '#60a5fa', fontSize: 12, wordBreak: 'break-all' }}>
                <strong>getRawCredentials() returned:</strong><br />{debug.raw}
              </p>
            </>
          )}
        </div>
      )}

      <p className="creds-note">
        💡 Credentials enable the app to search LinkedIn & Naukri directly with your account — getting you personalized job results.
      </p>
    </div>
  )
}