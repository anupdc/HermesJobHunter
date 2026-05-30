import { useState } from 'react'
import { useProfile } from './ProfileContext'

const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)
const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
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
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
)

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const SCHEDULE_PRESETS = [
  { label: 'Morning 7 AM', time: '07:00' },
  { label: 'Morning 8 AM', time: '08:00' },
  { label: 'Midday 12 PM', time: '12:00' },
  { label: 'Evening 6 PM', time: '18:00' },
]

export default function SchedulePanel({ onClose }) {
  const { schedule, updateSchedule } = useProfile()
  const [tempTime, setTempTime] = useState(schedule.searchTime || '07:00')

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

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content schedule-modal">
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

        {/* Last Run Info */}
        {schedule.lastRun && (
          <div className="schedule-info">
            <CheckCircleIcon />
            <span>Last search ran: {new Date(schedule.lastRun).toLocaleString()}</span>
          </div>
        )}

        {schedule.enabled && (
          <div className="schedule-summary">
            <p className="text-sm text-slate-300">
              Daily search scheduled for <span className="text-sky-400 font-bold">{schedule.searchTime}</span> on{" "}
              <span className="text-sky-400">{(schedule.searchDays || []).join(', ')}</span>
            </p>
          </div>
        )}

        <div className="modal-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
          <button className="btn-primary px-5 py-2 rounded-lg text-sm" onClick={onClose}>
            Save & Close
          </button>
        </div>
      </div>
    </div>
  )
}