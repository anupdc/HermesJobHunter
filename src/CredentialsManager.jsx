import { useState, useEffect } from 'react'
import { useProfile } from './ProfileContext'

const LockIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>)
const EyeIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>)
const EyeOffIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>)
const CheckCircleIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>)

export default function CredentialsManager({ onTestConnection }) {
  const [linkedin, setLinkedin] = useState({ email: '', password: '' })
  const [naukri, setNaukri] = useState({ email: '', password: '' })
  const [saved, setSaved] = useState({})
  const [showPass, setShowPass] = useState({ linkedin: false, naukri: false })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState({ linkedin: false, naukri: false })
  const [testResult, setTestResult] = useState({ linkedin: null, naukri: null })
  const { profile } = useProfile()

  // Load saved credentials from electron store on mount
  useEffect(() => {
    if (window.electronAPI?.getCredentials) {
      window.electronAPI.getCredentials().then(creds => {
        if (creds?.linkedin) setLinkedin({ email: creds.linkedin.email || '', password: '' })
        if (creds?.naukri) setNaukri({ email: creds.naukri.email || '', password: '' })
        // Check which are saved (have encrypted data)
        const s = {}
        if (creds?.linkedin?.encrypted) s.linkedin = true
        if (creds?.naukri?.encrypted) s.naukri = true
        setSaved(s)
      })
    }
  }, [])

  const handleSave = async (platform) => {
    setSaving(true)
    const creds = platform === 'linkedin' ? linkedin : naukri
    if (!creds.email || !creds.password) {
      alert('Please enter both email and password')
      setSaving(false)
      return
    }
    try {
      if (window.electronAPI?.saveCredentials) {
        await window.electronAPI.saveCredentials(platform, { email: creds.email, password: creds.password })
        setSaved(prev => ({ ...prev, [platform]: true }))
      }
    } catch (e) {
      console.error('Save failed:', e)
    }
    setSaving(false)
  }

  const handleTest = async (platform) => {
    setTesting(prev => ({ ...prev, [platform]: true }))
    setTestResult(prev => ({ ...prev, [platform]: null }))
    try {
      const creds = platform === 'linkedin' ? linkedin : naukri
      if (window.electronAPI?.testCredentials) {
        const result = await window.electronAPI.testCredentials(platform, creds)
        setTestResult(prev => ({ ...prev, [platform]: result }))
      }
    } catch (e) {
      setTestResult(prev => ({ ...prev, [platform]: { success: false, message: e.message } }))
    }
    setTesting(prev => ({ ...prev, [platform]: false }))
  }

  const linkedinStatus = saved.linkedin
    ? { label: 'Saved', color: '#22c55e', icon: <CheckCircleIcon /> }
    : testResult.linkedin?.success ? { label: 'Connected', color: '#22c55e', icon: <CheckCircleIcon /> }
    : testResult.linkedin ? { label: 'Failed', color: '#ef4444', icon: null }
    : { label: 'Not saved', color: '#64748b', icon: null }

  const naukriStatus = saved.naukri
    ? { label: 'Saved', color: '#22c55e', icon: <CheckCircleIcon /> }
    : testResult.naukri?.success ? { label: 'Connected', color: '#22c55e', icon: <CheckCircleIcon /> }
    : testResult.naukri ? { label: 'Failed', color: '#ef4444', icon: null }
    : { label: 'Not saved', color: '#64748b', icon: null }

  return (
    <div className="creds-manager">
      <div className="creds-info">
        <LockIcon />
        <p>Credentials are encrypted and stored locally on your machine only. Never sent to any server.</p>
      </div>

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
            <input
              type="email"
              placeholder="anupchandavar21@gmail.com"
              value={linkedin.email}
              onChange={e => setLinkedin(l => ({ ...l, email: e.target.value }))}
              className="creds-input"
            />
          </div>
          <div className="creds-field">
            <label>Password</label>
            <div className="creds-password-wrap">
              <input
                type={showPass.linkedin ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={linkedin.password}
                onChange={e => setLinkedin(l => ({ ...l, password: e.target.value }))}
                className="creds-input"
              />
              <button className="creds-eye" onClick={() => setShowPass(p => ({ ...p, linkedin: !p.linkedin }))}>
                {showPass.linkedin ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
        </div>

        {testResult.linkedin && (
          <div className={`creds-test-result ${testResult.linkedin.success ? 'success' : 'error'}`}>
            {testResult.linkedin.message}
          </div>
        )}

        <div className="creds-actions">
          <button
            className="creds-test-btn"
            onClick={() => handleTest('linkedin')}
            disabled={testing.linkedin || !linkedin.email || !linkedin.password}
          >
            {testing.linkedin ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            className="creds-save-btn"
            onClick={() => handleSave('linkedin')}
            disabled={saving || !linkedin.email || !linkedin.password}
          >
            {saving ? 'Saving...' : saved.linkedin ? 'Update' : 'Save'}
          </button>
        </div>
      </div>

      {/* Naukri */}
      <div className="creds-card">
        <div className="creds-card-header">
          <div className="creds-platform">
            <span className="creds-emoji">🇮🇳</span>
            <div>
              <span className="creds-name">Naukri.com</span>
              <span className="creds-status" style={{ color: naukriStatus.color }}>
                {naukriStatus.icon} {naukriStatus.label}
              </span>
            </div>
          </div>
        </div>

        <div className="creds-fields">
          <div className="creds-field">
            <label>Email / Username</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={naukri.email}
              onChange={e => setNaukri(n => ({ ...n, email: e.target.value }))}
              className="creds-input"
            />
          </div>
          <div className="creds-field">
            <label>Password</label>
            <div className="creds-password-wrap">
              <input
                type={showPass.naukri ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={naukri.password}
                onChange={e => setNaukri(n => ({ ...n, password: e.target.value }))}
                className="creds-input"
              />
              <button className="creds-eye" onClick={() => setShowPass(p => ({ ...p, naukri: !p.naukri }))}>
                {showPass.naukri ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
        </div>

        {testResult.naukri && (
          <div className={`creds-test-result ${testResult.naukri.success ? 'success' : 'error'}`}>
            {testResult.naukri.message}
          </div>
        )}

        <div className="creds-actions">
          <button
            className="creds-test-btn"
            onClick={() => handleTest('naukri')}
            disabled={testing.naukri || !naukri.email || !naukri.password}
          >
            {testing.naukri ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            className="creds-save-btn"
            onClick={() => handleSave('naukri')}
            disabled={saving || !naukri.email || !naukri.password}
          >
            {saving ? 'Saving...' : saved.naukri ? 'Update' : 'Save'}
          </button>
        </div>
      </div>

      <p className="creds-note">
        💡 Credentials enable the app to search LinkedIn & Naukri directly with your account — getting you personalized job results.
      </p>
    </div>
  )
}