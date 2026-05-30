import { useState, useEffect } from 'react'
import { useProfile } from './ProfileContext'

// ─── ATS Resume & Cover Letter Tailoring ───────────────────────────────────

function generateATSTailoredResume(originalResume, job, profile) {
  // Extract key skills from job tags
  const jobSkills = job.tags || []
  // Simple keyword extraction from job description
  const descWords = (job.description || '').toLowerCase().split(/\s+/)
  const skillKeywords = ['x++', 'azure', 'd365', 'power platform', 'sql', 'c#', '.net',
    'devops', 'ci/cd', 'logic apps', 'odata', 'fabric', 'power bi', 'erp',
    'finance', 'retail', 'wms', 'supply chain', 'integration', 'api']

  const mentionedSkills = skillKeywords.filter(s => descWords.some(w => w.includes(s.split(' ')[0])))
  const relevantSkills = [...new Set([...jobSkills, ...mentionedSkills])]

  // Build ATS-optimized sections
  const lines = originalResume.split('\n')
  const sections = { summary: [], experience: [], skills: [], education: [], certs: [], other: [] }
  let current = 'other'
  for (const line of lines) {
    const ul = line.trim().toUpperCase()
    if (ul.includes('SUMMARY') || ul.includes('PROFILE')) current = 'summary'
    else if (ul.includes('EXPERIENCE') || ul.includes('EMPLOYMENT')) current = 'experience'
    else if (ul.includes('SKILL')) current = 'skills'
    else if (ul.includes('EDUCATION')) current = 'education'
    else if (ul.includes('CERT') || ul.includes('LICENSE')) current = 'certs'
    sections[current].push(line)
  }

  // Rebuild with job-specific keyword density
  let output = []
  // Header
  output.push(profile.name.toUpperCase())
  output.push(`${profile.title} | ${profile.experience} Experience`)
  output.push(`${profile.email} | ${profile.phone} | ${profile.location}`)
  output.push('')

  // ATS Summary - inject job-specific keywords
  const atsSummary = sections.summary.join('\n').replace(
    /(D365 F&O Developer.*?)(?=\n[A-Z])/si,
    (match) => match + ` Proficient in ${relevantSkills.slice(0, 5).join(', ')}.`
  )
  output.push(atsSummary || `SUMMARY\n${profile.summary}`)
  output.push('')

  // Experience - highlight matching skills
  if (sections.experience.length > 0) {
    const expBlock = sections.experience.join('\n')
    // Inject job keywords where relevant
    let enhanced = expBlock
    if (mentionedSkills.some(s => s.includes('devops') || s.includes('azure'))) {
      enhanced = enhanced.replace(
        /(Azure DevOps|CI\/CD|LCS)/g,
        (m) => `**${m}** (ATS HIGHLIGHTED)`
      )
    }
    output.push(enhanced)
    output.push('')
  }

  // Skills - prioritize job-relevant
  const allSkills = profile.skills || []
  const reorderedSkills = [
    ...relevantSkills.filter(s => allSkills.map(as => as.toLowerCase()).includes(s.toLowerCase())),
    ...allSkills.filter(s => !relevantSkills.map(rs => rs.toLowerCase()).includes(s.toLowerCase()))
  ]
  output.push(`SKILLS\n${reorderedSkills.join(' • ')}`)
  output.push('')

  if (sections.education.length > 0) output.push(sections.education.join('\n'))
  if (sections.certs.length > 0) output.push(sections.certs.join('\n'))

  return output.join('\n')
}

function generateTailoredCoverLetter(template, job, profile) {
  const personalization = [
    `Your focus on ${job.tags?.[0] || 'enterprise solutions'} aligns directly with my recent work at HPE implementing D365 F&O for Fortune 500 clients.`,
    `I have hands-on experience with ${job.tags?.slice(0, 2).join(' and ') || 'D365 F&O'} which matches your requirements perfectly.`,
    `The ${job.company} commitment to innovation in ${job.tags?.[0] || 'technology'} matches my passion for cutting-edge ERP solutions.`,
  ]
  const reason = personalization[Math.floor(Math.random() * personalization.length)]

  return template
    .replace(/\{JOB_TITLE\}/g, job.title)
    .replace(/\{COMPANY\}/g, job.company)
    .replace(/\{EXPERIENCE\}/g, profile.experience || '7+ years')
    .replace(/\{PERSONALIZATION_REASON\}/g, reason)
    .replace(/\{APPLICANT_NAME\}/g, profile.name)
}

// ─── Icons ─────────────────────────────────────────────────────────────────

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const FileTextIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
  </svg>
)
const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
)
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const SparkleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
  </svg>
)

// ─── ResumeModal ────────────────────────────────────────────────────────────

export default function ResumeModal({ job, onClose, onApplied }) {
  const { profile, addAppliedJob } = useProfile()
  const [step, setStep] = useState('generating') // generating | review | confirmed
  const [tailoredResume, setTailoredResume] = useState('')
  const [tailoredCover, setTailoredCover] = useState('')
  const [resumeApproved, setResumeApproved] = useState(false)
  const [coverApproved, setCoverApproved] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    // Simulate AI generation with realistic delay
    const timer = setTimeout(() => {
      const resume = generateATSTailoredResume(profile.resumeText, job, profile)
      const cover = generateTailoredCoverLetter(profile.coverLetterTemplate, job, profile)
      setTailoredResume(resume)
      setTailoredCover(cover)
      setStep('review')
    }, 2500)
    return () => clearTimeout(timer)
  }, [job])

  const handleApply = () => {
    if (!resumeApproved || !coverApproved) return
    addAppliedJob(job.id, tailoredResume, tailoredCover)
    setStep('confirmed')
    setTimeout(() => {
      onApplied()
      onClose()
    }, 1800)
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content resume-modal">
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="text-lg font-bold text-white">Apply to {job.company}</h2>
            <p className="text-sm text-slate-400">{job.title}</p>
          </div>
          <button onClick={onClose} className="modal-close"><CloseIcon /></button>
        </div>

        {/* Generating State */}
        {step === 'generating' && (
          <div className="modal-generating">
            <div className="modal-sparkle">
              <SparkleIcon />
            </div>
            <p className="text-sky-400 font-medium mt-4 mb-2">AI is tailoring your application...</p>
            <p className="text-slate-400 text-sm">Optimizing resume for ATS and crafting cover letter</p>
            <div className="spinner mt-6" />
          </div>
        )}

        {/* Review State */}
        {step === 'review' && (
          <>
            <div className="modal-tabs">
              <button
                className={`modal-tab ${resumeApproved ? 'tab-approved' : ''}`}
                onClick={() => setResumeApproved(!resumeApproved)}
              >
                <FileTextIcon /> Resume {resumeApproved && <span className="tab-check"><CheckIcon /></span>}
              </button>
              <button
                className={`modal-tab ${coverApproved ? 'tab-approved' : ''}`}
                onClick={() => setCoverApproved(!coverApproved)}
              >
                <FileTextIcon /> Cover Letter {coverApproved && <span className="tab-check"><CheckIcon /></span>}
              </button>
            </div>

            <div className="modal-body">
              {resumeApproved && !coverApproved && (
                <div className="doc-section">
                  <p className="doc-label">Resume - ATS Optimized</p>
                  <pre className="doc-content">{tailoredResume}</pre>
                </div>
              )}
              {!resumeApproved && coverApproved && (
                <div className="doc-section">
                  <p className="doc-label">Cover Letter</p>
                  <pre className="doc-content">{tailoredCover}</pre>
                </div>
              )}
              {(resumeApproved === coverApproved) && (
                <>
                  <div className="doc-section">
                    <div className="flex justify-between items-center mb-2">
                      <p className="doc-label">Resume - ATS Optimized</p>
                      <button
                        className={`doc-toggle ${resumeApproved ? 'text-green-400' : 'text-slate-500'}`}
                        onClick={() => setResumeApproved(!resumeApproved)}
                      >
                        {resumeApproved ? 'OK Approved' : 'Approve'}
                      </button>
                    </div>
                    <pre className="doc-content">{tailoredResume}</pre>
                  </div>
                  <div className="doc-divider" />
                  <div className="doc-section">
                    <div className="flex justify-between items-center mb-2">
                      <p className="doc-label">Cover Letter</p>
                      <button
                        className={`doc-toggle ${coverApproved ? 'text-green-400' : 'text-slate-500'}`}
                        onClick={() => setCoverApproved(!coverApproved)}
                      >
                        {coverApproved ? 'OK Approved' : 'Approve'}
                      </button>
                    </div>
                    <pre className="doc-content">{tailoredCover}</pre>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <p className="text-xs text-slate-500 flex-1">
                {(!resumeApproved || !coverApproved) ? (
                  `Approve both documents to enable Apply (${!resumeApproved ? 'resume' : ''}${!resumeApproved && !coverApproved ? ' & ' : ''}${!coverApproved ? 'cover letter' : ''} pending)`
                ) : (
                  'Both documents approved - ready to apply!'
                )}
              </p>
              <button
                className={`btn-primary px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${resumeApproved && coverApproved ? '' : 'btn-disabled'}`}
                onClick={handleApply}
                disabled={!resumeApproved || !coverApproved}
              >
                <SendIcon /> Apply Now
              </button>
            </div>
          </>
        )}

        {/* Confirmed State */}
        {step === 'confirmed' && (
          <div className="modal-generating">
            <div className="modal-success-icon"><CheckIcon /></div>
            <p className="text-green-400 font-bold text-lg mt-4">Application Sent!</p>
            <p className="text-slate-400 text-sm mt-2">Your tailored application has been submitted to {job.company}</p>
          </div>
        )}
      </div>
    </div>
  )
}