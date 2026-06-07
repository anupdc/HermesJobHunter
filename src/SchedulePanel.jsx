import { useState, useEffect } from 'react'
import { useProfile } from './ProfileContext'

const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)
const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
)
const CheckCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
)
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
)
const GlobeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
)
const CronIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 8 14"/>
  </svg>
)

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const SCHEDULE_PRESETS = [
  { label: 'Morning 7 AM', time: '07:00' },
  { label: 'Morning 8 AM', time: '08:00' },
  { label: 'Midday 12 PM', time: '12:00' },
  { label: 'Evening 6 PM', time: '18:00' },
]

const API_BASE = 'http://172.16.3.2:18081'

export default function SchedulePanel({ onClose }) {
  const { schedule, updateSchedule } = useProfile()
  const [tempTime, setTempTime] = useState(schedule.searchTime || '07:00')
  const [activeCrons, setActiveCrons] = useState([])
  const [loadingCrons, setLoadingCrons] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // Load active cron jobs from scheduler API
  useEffect(() => {
    fetchActiveCrons()
  }, [])

  const fetchActiveCrons = async () => {
    setLoadingCrons(true)
    try {
      const res = await fetch(`${API_BASE}/schedule`)
      if (res.ok) {
        const data = await res.json()
        setActiveCrons(data.activeCrons || [])
      }
    } catch {}
    setLoadingCrons(false)
  }

  const toggleDay = (day) => {
    const current = schedule.searchDays || []
    const updated = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day]
    updateSchedule({ searchDays: updated })
  }

  const handleToggle = () => {
    updateSchedule({ enabled: !schedule.enabled })
  }

  const handleTimeChange = (e) => {
    const val = e.target.value
    setTempTime(val)
    updateSchedule({ searchTime: val })
  }

  const applyPreset = (time) => {
    setTempTime(time)
    updateSchedule({ searchTime: time })
  }

  // Save schedule to Hermes cron API
  const handleSave = async () => {
    setSyncing(true)
    try {
      await fetch(`${API_BASE}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchTime: schedule.searchTime || '07:00',
          searchDays: schedule.searchDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          enabled: schedule.enabled
        })
      })
      updateSchedule({ lastRun: new Date().toISOString() })
      await fetchActiveCrons()
    } catch (e) {
      console.warn('Scheduler API sync failed:', e)
    }
    setSyncing(false)
    onClose()
  }

  // Delete all job search cron jobs
  const handleDeleteAllCrons = async () => {
    if (!confirm('Delete all scheduled job search cron jobs? This cannot be undone.')) return
    setDeleting(true)
    try {
      await fetch(`${API_BASE}/schedule`, { method: 'DELETE' })
      setActiveCrons([])
      updateSchedule({ enabled: false })
      showToast && showToast('All cron jobs deleted')
    } catch (e) {
      console.warn('Delete failed:', e)
    }
    setDeleting(false)
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content schedule-modal" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="modal-icon"><CalendarIcon /></div>
            <div>
              <h2 className="text-lg font-bold text-white">Job Search Schedule</h2>
              <p className="text-sm text-slate-400">Automate your job search at preferred times</p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close">✕</button>
        </div>

        {/* Enable Toggle */}
        <div className="schedule-toggle-section">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`schedule-toggle-icon ${schedule.enabled ? 'active' : ''}`}>
                <BellIcon />
              </div>
              <div>
                <p className="text-white font-medium">Auto Search {schedule.enabled ? 'Enabled' : 'Disabled'}</p>
                <p className="text-xs text-slate-500">Automatically search for new jobs at your preferred time</p>
              </div>
            </div>
            <button
              className={`toggle-switch ${schedule.enabled ? 'on' : 'off'}`}
              onClick={handleToggle}
            >
              <span className="toggle-knob" />
            </button>
          </div>
        </div>

        {/* Time Selection */}
        <div className="schedule-section">
          <h3 className="schedule-section-title"><ClockIcon /> Preferred Search Time</h3>
          <div className="schedule-presets">
            {SCHEDULE_PRESETS.map(preset => (
              <button
                key={preset.label}
                className={`preset-btn ${tempTime === preset.time ? 'active' : ''}`}
                onClick={() => applyPreset(preset.time)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="time-input-row">
            <label className="text-sm text-slate-400">Custom time:</label>
            <input
              type="time"
              value={tempTime}
              onChange={handleTimeChange}
              className="time-input"
            />
          </div>
        </div>

        {/* Days Selection */}
        <div className="schedule-section">
          <h3 className="schedule-section-title">Active Days</h3>
          <div className="days-grid">
            {DAYS.map(day => {
              const isActive = (schedule.searchDays || []).includes(day)
              return (
                <button
                  key={day}
                  className={`day-btn ${isActive ? 'active' : ''}`}
                  onClick={() => toggleDay(day)}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>

        {/* Active Cron Jobs */}
        <div className="schedule-section">
          <h3 className="schedule-section-title flex items-center gap-2">
            <CronIcon /> Active Cron Jobs
            <button
              className="ml-auto text-xs px-2 py-1 rounded flex items-center gap-1"
              style={{
                background: 'rgba(239,68,68,0.15)',
                color: '#f87171',
                border: '1px solid rgba(239,68,68,0.3)'
              }}
              onClick={handleDeleteAllCrons}
              disabled={deleting || loadingCrons}
            >
              <TrashIcon /> {deleting ? 'Deleting...' : 'Delete All Cron Jobs'}
            </button>
          </h3>

          {loadingCrons ? (
            <div className="spinner" style={{ width: '24px', height: '24px', borderWidth: '2px', margin: '8px auto' }} />
          ) : activeCrons.length > 0 ? (
            <div className="active-crons-list">
              {activeCrons.map((c, i) => (
                <div key={i} className="cron-item">
                  <CronIcon />
                  <code className="text-xs text-slate-400">{c.raw}</code>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <GlobeIcon />
              <div>
                <p className="text-sm text-slate-400">No active cron jobs</p>
                <p className="text-xs text-slate-600">Enable the schedule above and save to create one</p>
              </div>
            </div>
          )}
        </div>

        {/* Last Run Info */}
        {schedule.lastRun && (
          <div className="schedule-info">
            <CheckCircleIcon />
            <span>Last sync: {new Date(schedule.lastRun).toLocaleString()}</span>
          </div>
        )}

        {schedule.enabled && (
          <div className="schedule-summary">
            <p className="text-sm text-slate-300">
              Daily search scheduled for <span className="text-sky-400 font-bold">{schedule.searchTime}</span> on{' '}
              <span className="text-sky-400">{(schedule.searchDays || []).join(', ')}</span>
            </p>
          </div>
        )}

        <div className="modal-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
          <button
            className="btn-primary px-5 py-2 rounded-lg text-sm flex items-center gap-2"
            onClick={handleSave}
            disabled={syncing}
          >
            {syncing ? 'Syncing...' : 'Save & Sync to Server'}
          </button>
        </div>
      </div>
    </div>
  )
}
