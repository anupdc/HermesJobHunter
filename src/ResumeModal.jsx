import { useState, useEffect, useRef } from 'react'
import { useProfile } from './ProfileContext'

// ─── LLM Integration ─────────────────────────────────────────────────────────

async function callOpenAI(apiKey, resumeText, job, profile) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 2000,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: `You are an expert ATS resume writer and cover letter composer. 
Your task: Given a candidate's resume and a job description, produce:
1. An ATS-optimized resume tailored to the job (emphasize matching keywords, quantify achievements, use ATS-friendly formatting)
2. A personalized cover letter

Format your response STRICTLY as:
---
TAILORED_RESUME:
[full tailored resume here - name/contact header, SUMMARY, EXPERIENCE (with ATS keywords highlighted), SKILLS (relevant skills first), EDUCATION, CERTIFICATIONS]
---
COVER_LETTER:
[personalized cover letter - 3-4 paragraphs, specific to the company and role]
---
Do NOT use any prefix like "Here is" or "Certainly". Start immediately with TAILORED_RESUME:`
        },
        {
          role: 'user',
          content: `CANDIDATE RESUME:
${resumeText}

TARGET JOB:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Salary: ${job.salary}
Description: ${job.description}
Tags/Requirements: ${(job.tags || []).join(', ')}

Candidate Profile:
- Name: ${profile.name}
- Email: ${profile.email}
- Phone: ${profile.phone}
- Experience: ${profile.experience}
- Location: ${profile.location}
- Title: ${profile.title}
- Summary: ${profile.summary}

Please produce the ATS-tailored resume and cover letter.`
        }
      ]
    })
  })
  if (!response.ok) throw new Error(`OpenAI error: ${response.status}`)
  const data = await response.json()
  return data.choices[0].message.content
}

async function callGemini(apiKey, resumeText, job, profile) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are an expert ATS resume writer and cover letter composer.
Given a candidate's resume and a job description, produce:
1. An ATS-optimized resume tailored to the job (emphasize matching keywords, quantify achievements, use ATS-friendly formatting)
2. A personalized cover letter

Format your response STRICTLY as:
---
TAILORED_RESUME:
[full tailored resume here - name/contact header, SUMMARY, EXPERIENCE (with ATS keywords), SKILLS (relevant skills first), EDUCATION, CERTIFICATIONS]
---
COVER_LETTER:
[personalized cover letter - 3-4 paragraphs, specific to the company and role]
---
CANDIDATE RESUME:
${resumeText}

TARGET JOB:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Salary: ${job.salary}
Description: ${job.description}
Tags/Requirements: ${(job.tags || []).join(', ')}

Candidate Profile:
- Name: ${profile.name}
- Email: ${profile.email}
- Phone: ${profile.phone}
- Experience: ${profile.experience}
- Location: ${profile.location}
- Title: ${profile.title}`
          }]
        }],
        generationConfig: { maxOutputTokens: 2000, temperature: 0.7 }
      })
    }
  )
  if (!response.ok) throw new Error(`Gemini error: ${response.status}`)
  const data = await response.json()
  return data.candidates[0].content.parts[0].text
}

function parseLLMResponse(raw) {
  // Parse the TAILORED_RESUME and COVER_LETTER sections from LLM output
  const resumeMatch = raw.match(/---[\s\n]*TAILORED_RESUME:([\s\S]*?)---[\s\n]*COVER_LETTER:/i)
  const coverMatch = raw.match(/COVER_LETTER:([\s\S]*)$/i)

  let tailoredResume = raw // fallback to full raw
  let tailoredCover = ''

  if (resumeMatch) tailoredResume = resumeMatch[1].trim()
  if (coverMatch) tailoredCover = coverMatch[1].trim()

  // If parsing failed, try simpler pattern
  if (!resumeMatch || !coverMatch) {
    const parts = raw.split('---')
    if (parts.length >= 3) {
      tailoredResume = parts[1].replace(/TAILORED_RESUME:/gi, '').trim()
      tailoredCover = parts[2].replace(/COVER_LETTER:/gi, '').replace(/^\s*/, '').trim()
    }
  }

  return { tailoredResume, tailoredCover }
}

// ─── Fallback rule-based tailoring ────────────────────────────────────────────

function generateFallbackResume(originalResume, job, profile) {
  const jobSkills = job.tags || []
  const descWords = (job.description || '').toLowerCase().split(/\s+/)
  const skillKeywords = [
    'x++', 'azure', 'd365', 'power platform', 'sql', 'c#', '.net',
    'devops', 'ci/cd', 'logic apps', 'odata', 'fabric', 'power bi', 'erp',
    'finance', 'retail', 'wms', 'supply chain', 'integration', 'api',
    'dynamics', 'lcs', '.net', 'visual studio', 'service bus', 'functions'
  ]
  const mentionedSkills = skillKeywords.filter(s => descWords.some(w => w.includes(s.split(' ')[0])))
  const relevantSkills = [...new Set([...jobSkills, ...mentionedSkills])]

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

  let output = []
  output.push(profile.name.toUpperCase())
  output.push(`${profile.title} | ${profile.experience} Experience`)
  output.push(`${profile.email} | ${profile.phone} | ${profile.location}`)
  output.push('')

  const atsSummary = sections.summary.join('\n').replace(
    /(D365 F&O Developer.*?)(?=\n[A-Z])/si,
    (match) => match + ` Proficient in ${relevantSkills.slice(0, 5).join(', ')}.`
  )
  output.push(atsSummary || `SUMMARY\n${profile.summary}`)
  output.push('')

  if (sections.experience.length > 0) {
    const expBlock = sections.experience.join('\n')
    let enhanced = expBlock
    if (mentionedSkills.some(s => s.includes('devops') || s.includes('azure'))) {
      enhanced = enhanced.replace(/(Azure DevOps|CI\/CD|LCS)/g, (m) => `${m} (ATS HIGHLIGHTED)`)
    }
    output.push(enhanced)
    output.push('')
  }

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

function generateFallbackCover(template, job, profile) {
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

// ─── Email notification ───────────────────────────────────────────────────────

async function sendGmailNotification(profile, job, tailoredResume, tailoredCover) {
  try {
    const subject = `JobHunter: Applied to ${job.title} at ${job.company}`
    const body = `
Applied Job Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Position: ${job.title}
Company: ${job.company}
Location: ${job.location}
Salary: ${job.salary}
Type: ${job.type}
Posted: ${job.posted}
Match Score: ${job.match}%
Remote: ${job.remote ? 'Yes' : 'No'}
Tags: ${(job.tags || []).join(', ')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Applied at: ${new Date().toLocaleString()}
Your tailored resume and cover letter are saved in the JobHunter app.
    `.trim()

    const API_BASE = 'http://172.16.3.2:18081'
    const res = await fetch(`${API_BASE}/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: profile.email,
        subject,
        body,
        from: profile.email
      })
    })
    if (!res.ok) throw new Error(`Email API error: ${res.status}`)
    const result = await res.json()
    if (result.error) throw new Error(result.error)
    return true
  } catch (e) {
    console.warn('Gmail notification failed:', e.message)
    return false
  }
}

// ─── Icons ────────────────────────────────────────────────────────────────────

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
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
)
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

// ─── ResumeModal ────────────────────────────────────────────────────────────────

export default function ResumeModal({ job, onClose, onApplied }) {
  const { profile, addAppliedJob } = useProfile()
  const [step, setStep] = useState('generating') // generating | review | confirmed
  const [tailoredResume, setTailoredResume] = useState('')
  const [tailoredCover, setTailoredCover] = useState('')
  const [resumeApproved, setResumeApproved] = useState(false)
  const [coverApproved, setCoverApproved] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatingLabel, setGeneratingLabel] = useState('')
  const [error, setError] = useState('')
  // Editable states
  const [editingResume, setEditingResume] = useState(false)
  const [editingCover, setEditingCover] = useState(false)
  const [resumeDraft, setResumeDraft] = useState('')
  const [coverDraft, setCoverDraft] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const resumeRef = useRef()
  const coverRef = useRef()

  const generateDocs = async () => {
    setGenerating(true)
    setError('')
    setGeneratingLabel('Initializing AI...')
    setStep('generating')

    try {
      const hasApiKey = profile.llmApiKey && profile.llmApiKey.trim().length > 0

      if (hasApiKey && profile.llmProvider === 'gemini') {
        setGeneratingLabel('Calling Gemini AI...')
        const raw = await callGemini(profile.llmApiKey.trim(), profile.resumeText, job, profile)
        const parsed = parseLLMResponse(raw)
        setTailoredResume(parsed.tailoredResume || generateFallbackResume(profile.resumeText, job, profile))
        setTailoredCover(parsed.tailoredCover || generateFallbackCover(profile.coverLetterTemplate, job, profile))
      } else if (hasApiKey && profile.llmProvider === 'openai') {
        setGeneratingLabel('Calling OpenAI GPT-4o...')
        const raw = await callOpenAI(profile.llmApiKey.trim(), profile.resumeText, job, profile)
        const parsed = parseLLMResponse(raw)
        setTailoredResume(parsed.tailoredResume || generateFallbackResume(profile.resumeText, job, profile))
        setTailoredCover(parsed.tailoredCover || generateFallbackCover(profile.coverLetterTemplate, job, profile))
      } else {
        setGeneratingLabel('Tailoring resume (basic mode)...')
        await new Promise(r => setTimeout(r, 1800))
        setTailoredResume(generateFallbackResume(profile.resumeText, job, profile))
        setTailoredCover(generateFallbackCover(profile.coverLetterTemplate, job, profile))
      }

      setResumeDraft('')
      setCoverDraft('')
      setEditingResume(false)
      setEditingCover(false)
      setResumeApproved(false)
      setCoverApproved(false)
      setStep('review')
    } catch (e) {
      console.error('Generation failed, falling back:', e)
      setGeneratingLabel('Falling back to basic tailoring...')
      await new Promise(r => setTimeout(r, 1000))
      setTailoredResume(generateFallbackResume(profile.resumeText, job, profile))
      setTailoredCover(generateFallbackCover(profile.coverLetterTemplate, job, profile))
      setResumeDraft('')
      setCoverDraft('')
      setEditingResume(false)
      setEditingCover(false)
      setResumeApproved(false)
      setCoverApproved(false)
      setStep('review')
    } finally {
      setGenerating(false)
    }
  }

  useEffect(() => {
    generateDocs()
  }, [job])

  const handleApply = async () => {
    if (!resumeApproved || !coverApproved) return
    // Use edited drafts if available, otherwise use AI result
    const finalResume = resumeDraft || tailoredResume
    const finalCover = coverDraft || tailoredCover

    addAppliedJob(job.id, finalResume, finalCover)

    // Send Gmail notification if enabled
    if (profile.gmailNotifications) {
      setEmailSent(true)
      await sendGmailNotification(profile, job, finalResume, finalCover)
    }

    setStep('confirmed')
    setTimeout(() => {
      onApplied()
      onClose()
    }, 2000)
  }

  const activeResume = resumeDraft || tailoredResume
  const activeCover = coverDraft || tailoredCover
  const isDrafting = (k) => k === 'resume' ? editingResume : editingCover
  const setDrafting = (k, v) => k === 'resume' ? setEditingResume(v) : setEditingCover(v)
  const draftVal = (k) => k === 'resume' ? resumeDraft : coverDraft
  const setDraftVal = (k, v) => k === 'resume' ? setResumeDraft(v) : setCoverDraft(v)

  const DocPanel = ({ type }) => {
    const isResume = type === 'resume'
    const label = isResume ? 'Resume' : 'Cover Letter'
    const content = isResume ? activeResume : activeCover
    const approved = isResume ? resumeApproved : coverApproved
    const setApproved = isResume ? setResumeApproved : setCoverApproved
    const isEditing = isDrafting(type)
    const currentDraft = draftVal(type)

    return (
      <div className="doc-section">
        <div className="flex justify-between items-center mb-2">
          <p className="doc-label">{label} {isResume ? '- ATS Optimized' : ''}</p>
          <div className="flex gap-2">
            <button
              className={`doc-toggle text-xs flex items-center gap-1 ${isEditing ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
              onClick={() => { setDraftVal(type, content); setDrafting(type, !isEditing) }}
            >
              <EditIcon /> {isEditing ? 'Cancel Edit' : 'Edit'}
            </button>
            <button
              className={`doc-toggle ${approved ? 'text-green-400' : 'text-slate-500'}`}
              onClick={() => setApproved(!approved)}
            >
              {approved ? <><CheckIcon /> Approved</> : 'Approve'}
            </button>
          </div>
        </div>

        {isEditing ? (
          <textarea
            ref={isResume ? resumeRef : coverRef}
            className="doc-textarea"
            value={currentDraft}
            onChange={e => setDraftVal(type, e.target.value)}
            rows={18}
            spellCheck={false}
          />
        ) : (
          <pre className="doc-content">{content}</pre>
        )}

        {isEditing && (
          <div className="mt-2 flex gap-2">
            <button
              className="btn-primary px-3 py-1.5 rounded-lg text-xs"
              onClick={() => {
                setDrafting(type, false)
                setApproved(false)
              }}
            >
              Save & Reset Approval
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content resume-modal" style={{ maxWidth: '720px' }}>
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
            <div className="modal-sparkle"><SparkleIcon /></div>
            <p className="text-sky-400 font-medium mt-4 mb-2">AI is tailoring your application...</p>
            <p className="text-slate-400 text-sm">{generatingLabel}</p>
            <div className="spinner mt-6" />
            <button
              className="mt-6 text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 mx-auto"
              onClick={() => { setGenerating(false); setStep('review') }}
            >
              Skip / Cancel
            </button>
          </div>
        )}

        {/* Review State */}
        {step === 'review' && (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
              <div className="flex items-center gap-2">
                <button
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
                  style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)' }}
                  onClick={generateDocs}
                  disabled={generating}
                >
                  <RefreshIcon /> {generating ? 'Regenerating...' : 'Recreate Resume for Job'}
                </button>
                <span className="text-xs text-slate-500">
                  {generating ? generatingLabel : 'Edit documents below, then approve each'}
                </span>
              </div>
              {emailSent && (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <CheckIcon /> Email notification sent
                </span>
              )}
            </div>

            <div className="modal-body" style={{ maxHeight: '460px', overflowY: 'auto' }}>
              {/* Resume tab */}
              <DocPanel type="resume" />

              <div className="doc-divider" />

              {/* Cover Letter tab */}
              <DocPanel type="cover" />
            </div>

            <div className="modal-footer">
              <p className="text-xs text-slate-500 flex-1">
                {!profile.llmApiKey && (
                  <span className="text-yellow-400">⚠ Basic tailoring only — add API key in Profile → AI Settings for AI-powered tailoring. </span>
                )}
                {(!resumeApproved || !coverApproved)
                  ? `Approve both to apply (${!resumeApproved ? 'resume' : ''}${!resumeApproved && !coverApproved ? ' + ' : ''}${!coverApproved ? 'cover letter' : ''})`
                  : 'Both approved — ready to apply!'
                }
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
            <p className="text-slate-400 text-sm mt-2">
              Applied to {job.company} · {job.title}
              {emailSent && <span className="block mt-1 text-sky-400">📧 Notification sent to {profile.email}</span>}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
