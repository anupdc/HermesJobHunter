import { useState } from 'react'
import Scheduler from './Scheduler'
import ProfileEditor from './ProfileEditor'
import JobSearcher from './JobSearcher'
import CredentialsManager from './CredentialsManager'
import { useProfile } from './ProfileContext'

const SettingsIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>)
const ChevronIcon = ({ open }) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}><polyline points="6 9 12 15 18 9"/></svg>)
const UserIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>)
const BellIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>)
const SearchIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>)
const KeyIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>)

export default function Settings() {
  const [openSection, setOpenSection] = useState('credentials')
  const { profile } = useProfile()

  const sections = [
    {
      id: 'credentials',
      label: 'Account Login',
      icon: <KeyIcon />,
      description: 'Save your LinkedIn and Naukri credentials to enable direct in-app job search.',
      component: <CredentialsManager />,
    },
    {
      id: 'search',
      label: 'Search All Platforms',
      icon: <SearchIcon />,
      description: 'Search Naukri, LinkedIn, Indeed India, Shine, Foundit and more — opens pre-filled in your browser.',
      component: <JobSearcher profile={profile} />,
    },
    {
      id: 'scheduler',
      label: 'Job Alerts & Scheduler',
      icon: <BellIcon />,
      description: 'Manage automated job search schedules — daily, weekly, or monthly notifications.',
      component: <Scheduler standalone={false} />,
    },
    {
      id: 'profile',
      label: 'Profile & Preferences',
      icon: <UserIcon />,
      description: 'Your skills, location preferences, salary expectations, and resume.',
      component: <ProfileEditor standalone={false} />,
    },
  ]

  const toggle = (id) => setOpenSection(openSection === id ? null : id)

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2 className="settings-title">Settings</h2>
        <p className="settings-subtitle">Manage your job search preferences and schedules</p>
      </div>

      <div className="settings-sections">
        {sections.map(section => (
          <div key={section.id} className={`settings-section ${openSection === section.id ? 'open' : ''}`}>
            <button className="settings-section-header" onClick={() => toggle(section.id)}>
              <div className="settings-section-left">
                <span className="settings-section-icon">{section.icon}</span>
                <div className="settings-section-info">
                  <span className="settings-section-label">{section.label}</span>
                  <span className="settings-section-desc">{section.description}</span>
                </div>
              </div>
              <ChevronIcon open={openSection === section.id} />
            </button>

            {openSection === section.id && (
              <div className="settings-section-body">
                {section.component}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
