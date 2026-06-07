import { useState } from 'react'
import { useProfile } from './ProfileContext'

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
)

function Field({ label, value, onChange, type = 'text', options, multiline, placeholder }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value || '')

  const save = () => { onChange(val); setEditing(false) }
  const cancel = () => { setVal(value || ''); setEditing(false) }

  if (editing) {
    return (
      <div className="pf-field-edit">
        <label className="pf-field-label">{label}</label>
        {multiline ? (
          <textarea
            className="pf-textarea"
            value={val}
            onChange={e => setVal(e.target.value)}
            rows={4}
            placeholder={placeholder}
          />
        ) : options ? (
          <select className="pf-select" value={val} onChange={e => { setVal(e.target.value); onChange(e.target.value) }}>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input
            className="pf-input"
            type={type}
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder={placeholder}
            onBlur={save}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
            autoFocus
          />
        )}
        <div className="pf-field-actions">
          <button className="pf-btn-save" onClick={save}>Save</button>
          <button className="pf-btn-cancel" onClick={cancel}>Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div className="pf-field">
      <span className="pf-field-label">{label}</span>
      <span className="pf-field-value">{value || <em className="text-slate-600">Not set</em>}</span>
      <button className="pf-edit-btn" onClick={() => setEditing(true)}><EditIcon /></button>
    </div>
  )
}

export default function ProfileEditor() {
  const { profile, updateProfile, DEFAULT_PROFILE } = useProfile()
  const [newSkill, setNewSkill] = useState('')
  const [section, setSection] = useState('contact') // contact | summary | skills | experience | salary | resume

  const sections = [
    { id: 'contact', label: 'Contact' },
    { id: 'summary', label: 'Summary' },
    { id: 'salary', label: 'Salary & Preferences' },
    { id: 'skills', label: 'Skills' },
    { id: 'experience', label: 'Experience' },
    { id: 'resume', label: 'Resume & Cover Letter' },
    { id: 'llm', label: 'AI Settings' },
    { id: 'schedule', label: 'Search Schedule' },
  ]

  const addSkill = () => {
    if (!newSkill.trim()) return
    const skills = profile.skills || []
    if (!skills.includes(newSkill.trim())) {
      updateProfile({ skills: [...skills, newSkill.trim()] })
    }
    setNewSkill('')
  }

  const removeSkill = (s) => {
    updateProfile({ skills: profile.skills.filter(skill => skill !== s) })
  }

  const updateSummary = (val) => updateProfile({ summary: val })

  return (
    <div className="profile-editor animate-fade-in">
      <div className="pe-sidebar">
        {sections.map(sec => (
          <button
            key={sec.id}
            className={`pe-nav-item ${section === sec.id ? 'active' : ''}`}
            onClick={() => setSection(sec.id)}
          >
            {sec.label}
          </button>
        ))}
      </div>

      <div className="pe-main">
        {section === 'contact' && (
          <div className="pe-section">
            <h3 className="pe-section-title">Contact Information</h3>
            <div className="pe-fields">
              <Field label="Full Name" value={profile.name} onChange={v => updateProfile({ name: v })} placeholder="Your full name" />
              <Field label="Job Title" value={profile.title} onChange={v => updateProfile({ title: v })} placeholder="Current title" />
              <Field label="Email" value={profile.email} onChange={v => updateProfile({ email: v })} type="email" placeholder="email@example.com" />
              <Field label="Phone" value={profile.phone} onChange={v => updateProfile({ phone: v })} placeholder="+91 ..." />
              <Field label="Location" value={profile.location} onChange={v => updateProfile({ location: v })} placeholder="City, State" />
              <Field label="LinkedIn" value={profile.linkedIn} onChange={v => updateProfile({ linkedIn: v })} placeholder="linkedin.com/in/..." />
              <Field label="Portfolio" value={profile.portfolio} onChange={v => updateProfile({ portfolio: v })} placeholder="Portfolio URL" />
            </div>
          </div>
        )}

        {section === 'summary' && (
          <div className="pe-section">
            <h3 className="pe-section-title">Professional Summary</h3>
            <p className="text-xs text-slate-500 mb-3">Shown at the top of your tailored resume</p>
            <Field
              label="Summary"
              value={profile.summary}
              onChange={updateSummary}
              multiline
              placeholder="Brief professional summary highlighting your key strengths..."
            />
          </div>
        )}

        {section === 'salary' && (
          <div className="pe-section">
            <h3 className="pe-section-title">Salary & Job Preferences</h3>
            <div className="pe-fields">
              <Field
                label="Expected Salary"
                value={profile.expectedSalary}
                onChange={v => updateProfile({ expectedSalary: v })}
                placeholder="e.g. ₹25-35 LPA"
              />
              <Field
                label="Notice Period"
                value={profile.noticePeriod}
                onChange={v => updateProfile({ noticePeriod: v })}
                options={['Immediately', '15 days', '30 days', '45 days', '60 days', '90 days']}
              />
              <Field
                label="Preferred Job Type"
                value={profile.preferredJobType}
                onChange={v => updateProfile({ preferredJobType: v })}
                options={['Full-time', 'Contract', 'Part-time', 'Freelance']}
              />
              <div className="pf-field">
                <span className="pf-field-label">Remote Only</span>
                <button
                  className={`toggle-switch ${profile.remoteOnly ? 'on' : 'off'}`}
                  onClick={() => updateProfile({ remoteOnly: !profile.remoteOnly })}
                  style={{ marginLeft: 'auto' }}
                >
                  <span className="toggle-knob" />
                </button>
              </div>
              <div className="pf-field">
                <span className="pf-field-label">Preferred Locations</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', flex: 1 }}>
                  {profile.preferredLocations?.map(loc => (
                    <span key={loc} className="skill-badge" style={{ cursor: 'pointer' }} onClick={() => updateProfile({ preferredLocations: profile.preferredLocations.filter(l => l !== loc) })}>
                      {loc} ✕
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {section === 'skills' && (
          <div className="pe-section">
            <h3 className="pe-section-title">Skills</h3>
            <p className="text-xs text-slate-500 mb-3">Add/remove skills used for ATS matching</p>
            <div className="pe-skills-grid">
              {(profile.skills || []).map(skill => (
                <span key={skill} className="skill-badge pe-skill">
                  {skill}
                  <button className="skill-remove" onClick={() => removeSkill(skill)}><TrashIcon /></button>
                </span>
              ))}
            </div>
            <div className="pe-add-skill">
              <input
                className="pf-input"
                placeholder="Add a skill..."
                value={newSkill}
                onChange={e => setNewSkill(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSkill()}
              />
              <button className="btn-primary px-3 py-1.5 rounded-lg text-sm" onClick={addSkill}>
                <PlusIcon /> Add
              </button>
            </div>
          </div>
        )}

        {section === 'experience' && (
          <div className="pe-section">
            <h3 className="pe-section-title">Experience</h3>
            <div className="pe-fields">
              <Field label="Total Experience" value={profile.experience} onChange={v => updateProfile({ experience: v })} placeholder="e.g. 7 Years" />
              <Field label="Education" value={profile.education?.[0]?.degree || ''} onChange={v => updateProfile({ education: [{ degree: v, institution: profile.education?.[0]?.institution || '', year: profile.education?.[0]?.year || '' }] })} placeholder="Degree" />
              <Field label="Certifications" value={profile.certifications?.join(', ') || ''} onChange={v => updateProfile({ certifications: v.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="Comma-separated" />
            </div>
          </div>
        )}

        {section === 'resume' && (
          <div className="pe-section">
            <h3 className="pe-section-title">Resume & Cover Letter</h3>
            <p className="text-xs text-slate-500 mb-3">Your base resume content — AI will tailor it per job</p>
            <Field
              label="Resume Content"
              value={profile.resumeText}
              onChange={v => updateProfile({ resumeText: v })}
              multiline
              placeholder="Paste your full resume text here..."
            />
            <div style={{ marginTop: '16px' }}>
              <Field
                label="Cover Letter Template"
                value={profile.coverLetterTemplate}
                onChange={v => updateProfile({ coverLetterTemplate: v })}
                multiline
                placeholder="Use {JOB_TITLE}, {COMPANY}, {PERSONALIZATION_REASON}, {APPLICANT_NAME} as placeholders"
              />
            </div>
          </div>
        )}

        {section === 'llm' && (
          <div className="pe-section">
            <h3 className="pe-section-title">AI Resume Tailoring</h3>
            <p className="text-xs text-slate-500 mb-3">Configure AI to automatically tailor your resume for each job</p>

            <div className="pe-fields">
              <div className="pf-field">
                <span className="pf-field-label">AI Provider</span>
                <select
                  className="pf-select"
                  style={{ marginLeft: 'auto', minWidth: '160px' }}
                  value={profile.llmProvider || 'openai'}
                  onChange={e => updateProfile({ llmProvider: e.target.value })}
                >
                  <option value="openai">OpenAI (GPT-4o)</option>
                  <option value="gemini">Google Gemini (2.0 Flash)</option>
                </select>
              </div>

              <div className="pf-field" style={{ flexDirection: 'column', gap: '8px' }}>
                <span className="pf-field-label">
                  API Key
                  <span className="text-xs text-slate-600 ml-2">(stored locally, never sent to our servers)</span>
                </span>
                <input
                  className="pf-input"
                  type="password"
                  placeholder={profile.llmProvider === 'gemini' ? 'AIza...' : 'sk-...'}
                  value={profile.llmApiKey || ''}
                  onChange={e => updateProfile({ llmApiKey: e.target.value })}
                />
                {profile.llmProvider === 'openai' && (
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-xs text-sky-400 hover:underline">
                    Get OpenAI API Key →
                  </a>
                )}
                {profile.llmProvider === 'gemini' && (
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-sky-400 hover:underline">
                    Get Gemini API Key →
                  </a>
                )}
              </div>

              <div className="pf-field">
                <span className="pf-field-label">Gmail Notifications</span>
                <p className="text-xs text-slate-500" style={{ margin: '4px 0 8px' }}>Send applied job details to your Gmail</p>
                <button
                  className={`toggle-switch ${profile.gmailNotifications ? 'on' : 'off'}`}
                  onClick={() => updateProfile({ gmailNotifications: !profile.gmailNotifications })}
                  style={{ marginLeft: 'auto' }}
                >
                  <span className="toggle-knob" />
                </button>
              </div>
            </div>

            {profile.llmApiKey ? (
              <div className="schedule-info" style={{ marginTop: '12px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}>
                <span style={{ color: '#4ade80' }}>✓</span>
                <span className="text-green-400 text-sm">AI resume tailoring is ready! When you apply to jobs, the AI will automatically rewrite your resume for each position.</span>
              </div>
            ) : (
              <div className="schedule-info" style={{ marginTop: '12px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}>
                <span style={{ color: '#fbbf24' }}>⚠</span>
                <span className="text-yellow-400 text-sm">Add your API key above to enable AI-powered resume tailoring. Without it, the app uses basic keyword matching.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}