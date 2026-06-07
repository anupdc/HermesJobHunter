import { useState, useEffect } from 'react'

// ─── Icons ─────────────────────────────────────────────────────────────────────
const ClockIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>)
const CalendarIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>)
const TrashIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>)
const BellIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>)
const PlusIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>)
const CheckIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>)
const RepeatIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>)
const ZapIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>)

const FREQUENCIES = [
  { id: 'hourly', label: 'Every Hour', icon: '🕐' },
  { id: 'daily', label: 'Daily', icon: '📅' },
  { id: 'weekly', label: 'Weekly', icon: '📆' },
  { id: 'monthly', label: 'Monthly', icon: '🗓️' },
]

const JOB_TYPES = [
  { id: 'search', label: 'Job Search', description: 'Search for matching jobs based on your profile' },
  { id: 'reminder', label: 'Job Alert', description: 'Remind you to check applications and follow-ups' },
  { id: 'digest', label: 'Daily Digest', description: 'Send a summary of new jobs to your email' },
]

const DEFAULT_JOBS = [
  {
    id: 'job-1',
    name: 'Daily D365 Job Search',
    type: 'search',
    frequency: 'daily',
    enabled: true,
    time: '09:00',
    createdAt: Date.now() - 7 * 86400000,
    platforms: ['naukri', 'linkedin', 'indeed'],
    lastRun: Date.now() - 86400000,
    nextRun: Date.now(),
    runCount: 14,
  },
  {
    id: 'job-2',
    name: 'Weekly Microsoft Role Check',
    type: 'search',
    frequency: 'weekly',
    enabled: false,
    time: '10:00',
    dayOfWeek: 1, // Monday
    createdAt: Date.now() - 14 * 86400000,
    platforms: ['linkedin', 'naukri'],
    lastRun: null,
    nextRun: null,
    runCount: 2,
  },
]

function loadJobs() {
  try {
    const stored = localStorage.getItem('hermes-scheduled-jobs')
    if (stored) return JSON.parse(stored)
  } catch {}
  return DEFAULT_JOBS
}

function saveJobs(jobs) {
  localStorage.setItem('hermes-scheduled-jobs', JSON.stringify(jobs))
}

function calcNextRun(job) {
  const now = Date.now()
  const [h, m] = (job.time || '09:00').split(':').map(Number)
  let next = new Date()
  next.setHours(h, m, 0, 0)
  if (next.getTime() <= now) next.setDate(next.getDate() + 1)

  if (job.frequency === 'weekly') {
    const targetDay = job.dayOfWeek ?? 1
    const daysUntil = (targetDay - next.getDay() + 7) % 7 || 7
    next.setDate(next.getDate() + daysUntil)
  } else if (job.frequency === 'monthly') {
    next.setMonth(next.getMonth() + 1)
  } else if (job.frequency === 'hourly') {
    next = new Date()
    next.setMinutes(next.getMinutes() + 60)
  }

  return next.getTime()
}

function formatNextRun(ts) {
  if (!ts) return 'Not scheduled'
  const d = new Date(ts)
  const diff = ts - Date.now()
  if (diff < 0) return 'Due now'
  const hours = Math.floor(diff / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  if (hours > 24) return `in ${Math.floor(hours / 24)}d ${hours % 24}h`
  if (hours > 0) return `in ${hours}h ${mins}m`
  return `in ${mins}m`
}

function formatLastRun(ts) {
  if (!ts) return 'Never'
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// ─── Create Job Modal ──────────────────────────────────────────────────────────
function CreateJobModal({ onSave, onClose }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('search')
  const [frequency, setFrequency] = useState('daily')
  const [time, setTime] = useState('09:00')
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [dayOfMonth, setDayOfMonth] = useState(1)
  const [platforms, setPlatforms] = useState(['naukri'])

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const togglePlatform = (p) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  const handleSubmit = () => {
    if (!name.trim()) return
    const job = {
      id: `job-${Date.now()}`,
      name: name.trim(),
      type,
      frequency,
      time,
      dayOfWeek: frequency === 'weekly' ? dayOfWeek : undefined,
      dayOfMonth: frequency === 'monthly' ? dayOfMonth : undefined,
      platforms,
      enabled: true,
      createdAt: Date.now(),
      lastRun: null,
      nextRun: null,
      runCount: 0,
    }
    job.nextRun = calcNextRun(job)
    onSave(job)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content scheduler-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-lg font-bold text-white">Create Scheduled Job</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Job Name */}
          <div className="form-group">
            <label className="form-label">Job Name</label>
            <input
              className="form-input"
              placeholder="e.g. Daily D365 Job Search"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* Job Type */}
          <div className="form-group">
            <label className="form-label">Job Type</label>
            <div className="flex flex-col gap-2">
              {JOB_TYPES.map(jt => (
                <button
                  key={jt.id}
                  onClick={() => setType(jt.id)}
                  className={`job-type-btn ${type === jt.id ? 'active' : ''}`}
                >
                  <span className="font-semibold">{jt.label}</span>
                  <span className="text-xs text-slate-400">{jt.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div className="form-group">
            <label className="form-label">Frequency</label>
            <div className="flex gap-2 flex-wrap">
              {FREQUENCIES.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFrequency(f.id)}
                  className={`freq-btn ${frequency === f.id ? 'active' : ''}`}
                >
                  <span>{f.icon}</span> {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Day of week (for weekly) */}
          {frequency === 'weekly' && (
            <div className="form-group">
              <label className="form-label">Day of Week</label>
              <div className="flex gap-2 flex-wrap">
                {DAYS.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => setDayOfWeek(i)}
                    className={`day-btn ${dayOfWeek === i ? 'active' : ''}`}
                  >
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Day of month (for monthly) */}
          {frequency === 'monthly' && (
            <div className="form-group">
              <label className="form-label">Day of Month</label>
              <input
                type="number"
                min="1"
                max="31"
                className="form-input w-24"
                value={dayOfMonth}
                onChange={e => setDayOfMonth(Number(e.target.value))}
              />
            </div>
          )}

          {/* Time */}
          {frequency !== 'hourly' && (
            <div className="form-group">
              <label className="form-label">Time</label>
              <input
                type="time"
                className="form-input"
                value={time}
                onChange={e => setTime(e.target.value)}
              />
            </div>
          )}

          {/* Platforms */}
          <div className="form-group">
            <label className="form-label">Platforms</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { id: 'naukri', label: 'Naukri', color: '#47a048' },
                { id: 'linkedin', label: 'LinkedIn', color: '#0077b4' },
                { id: 'indeed', label: 'Indeed', color: '#2164f3' },
                { id: 'shine', label: 'Shine', color: '#f4a619' },
                { id: 'foundit', label: 'Foundit', color: '#e53e3e' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => togglePlatform(p.id)}
                  className={`platform-chip ${platforms.includes(p.id) ? 'active' : ''}`}
                  style={platforms.includes(p.id) ? { borderColor: p.color, color: p.color } : {}}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={!name.trim()}>
            <PlusIcon /> Create Job
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Job Row ─────────────────────────────────────────────────────────────────
function JobRow({ job, onToggle, onDelete, onRunNow }) {
  const [expanded, setExpanded] = useState(false)
  const next = calcNextRun(job)

  const freqLabel = {
    hourly: 'Every Hour',
    daily: 'Daily',
    weekly: `Every ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][job.dayOfWeek ?? 1]}`,
    monthly: (() => {
      const d = job.dayOfMonth ?? 1
      const suffix = (d % 100 >= 11 && d % 100 <= 13) ? 'th' : ([, 'st', 'nd', 'rd'])[d % 10] || 'th'
      return `Monthly on the ${d}${suffix}`
    })(),
  }[job.frequency] || job.frequency

  const platformLabels = {
    naukri: 'Naukri', linkedin: 'LinkedIn', indeed: 'Indeed', shine: 'Shine', foundit: 'Foundit'
  }

  return (
    <div className={`scheduled-job-row ${job.enabled ? 'enabled' : 'disabled'}`}>
      <div className="sj-header" onClick={() => setExpanded(!expanded)}>
        <div className="sj-left">
          <button
            className={`toggle-switch ${job.enabled ? 'on' : 'off'}`}
            onClick={e => { e.stopPropagation(); onToggle(job.id) }}
          >
            <span className="toggle-knob" />
          </button>
          <div className="sj-info">
            <span className="sj-name">{job.name}</span>
            <span className="sj-meta">
              <RepeatIcon /> {freqLabel}
              {job.time && ` @ ${job.time}`}
            </span>
          </div>
        </div>
        <div className="sj-right">
          <div className="sj-stats">
            <span className={`sj-status ${job.enabled ? 'status-active' : 'status-paused'}`}>
              {job.enabled ? 'Active' : 'Paused'}
            </span>
            <span className="sj-runcount">⟳ {job.runCount}</span>
          </div>
          <button className="sj-expand-btn" onClick={e => { e.stopPropagation(); setExpanded(!expanded) }}>
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="sj-details">
          <div className="sj-detail-grid">
            <div className="sj-detail-item">
              <span className="sj-detail-label"><CalendarIcon /> Next Run</span>
              <span className="sj-detail-value">{formatNextRun(next)}</span>
            </div>
            <div className="sj-detail-item">
              <span className="sj-detail-label"><ClockIcon /> Last Run</span>
              <span className="sj-detail-value">{formatLastRun(job.lastRun)}</span>
            </div>
            <div className="sj-detail-item">
              <span className="sj-detail-label"><RepeatIcon /> Type</span>
              <span className="sj-detail-value">{JOB_TYPES.find(j => j.id === job.type)?.label}</span>
            </div>
            <div className="sj-detail-item">
              <span className="sj-detail-label"><ZapIcon /> Platforms</span>
              <span className="sj-detail-value">
                {job.platforms.map(p => platformLabels[p] || p).join(', ')}
              </span>
            </div>
          </div>
          <div className="sj-actions">
            <button className="btn-ghost text-xs" onClick={() => onRunNow(job.id)}>
              <ZapIcon /> Run Now
            </button>
            <button className="btn-danger text-xs" onClick={() => onDelete(job.id)}>
              <TrashIcon /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Scheduler Page ──────────────────────────────────────────────────────
export default function Scheduler() {
  const [jobs, setJobs] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    setJobs(loadJobs())
  }, [])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const handleToggle = (id) => {
    const updated = jobs.map(j => j.id === id ? { ...j, enabled: !j.enabled } : j)
    setJobs(updated)
    saveJobs(updated)
    const job = updated.find(j => j.id === id)
    showToast(job.enabled ? `✓ "${job.name}" activated` : `⏸ "${job.name}" paused`)
  }

  const handleDelete = (id) => {
    const job = jobs.find(j => j.id === id)
    const updated = jobs.filter(j => j.id !== id)
    setJobs(updated)
    saveJobs(updated)
    showToast(`Deleted "${job.name}"`)
  }

  const handleSave = (job) => {
    const updated = [job, ...jobs]
    setJobs(updated)
    saveJobs(updated)
    setShowCreate(false)
    showToast(`✓ Created "${job.name}"`)
  }

  const handleRunNow = (id) => {
    const updated = jobs.map(j => j.id === id ? { ...j, lastRun: Date.now(), runCount: j.runCount + 1 } : j)
    setJobs(updated)
    saveJobs(updated)
    const job = updated.find(j => j.id === id)
    showToast(`🔄 "${job.name}" triggered — check your browser/email`)
  }

  const activeJobs = jobs.filter(j => j.enabled)
  const pausedJobs = jobs.filter(j => !j.enabled)

  return (
    <div className="scheduler-page animate-fade-in">
      <div className="scheduler-header">
        <div>
          <h1 className="scheduler-title">Scheduler</h1>
          <p className="scheduler-subtitle">
            {activeJobs.length} active · {pausedJobs.length} paused · {jobs.length} total
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <PlusIcon /> New Job
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="scheduler-empty">
          <div className="empty-icon"><BellIcon /></div>
          <h3 className="text-lg font-bold text-white mb-2">No scheduled jobs yet</h3>
          <p className="text-slate-400 text-sm mb-6">
            Create your first job to automatically search for D365 F&O roles on your schedule.
          </p>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <PlusIcon /> Create First Job
          </button>
        </div>
      ) : (
        <div className="scheduler-sections">
          {activeJobs.length > 0 && (
            <div className="scheduler-section">
              <h2 className="section-title">
                <span className="status-dot status-active" /> Active Jobs
              </h2>
              {activeJobs.map(job => (
                <JobRow
                  key={job.id}
                  job={job}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onRunNow={handleRunNow}
                />
              ))}
            </div>
          )}

          {pausedJobs.length > 0 && (
            <div className="scheduler-section">
              <h2 className="section-title">
                <span className="status-dot status-paused" /> Paused Jobs
              </h2>
              {pausedJobs.map(job => (
                <JobRow
                  key={job.id}
                  job={job}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onRunNow={handleRunNow}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info Banner */}
      <div className="scheduler-info-banner">
        <div className="info-banner-icon"><ZapIcon /></div>
        <div>
          <strong>Pro Tip:</strong> Jobs run in the background via Hermes cron. Make sure Hermes Agent is running for scheduled searches to trigger. Open platform links in your browser where you're already logged in.
        </div>
      </div>

      {showCreate && (
        <CreateJobModal onSave={handleSave} onClose={() => setShowCreate(false)} />
      )}

      {toast && (
        <div className="toast-notification">{toast}</div>
      )}
    </div>
  )
}
