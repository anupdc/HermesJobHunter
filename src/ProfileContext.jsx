import { createContext, useContext, useState, useEffect } from 'react'

const ProfileContext = createContext()

const DEFAULT_PROFILE = {
  name: "Anup Chandavar",
  title: "D365 F&O Technical Consultant",
  email: "anupchandavar21@gmail.com",
  phone: "+91 8722690223",
  location: "Bengaluru, Karnataka",
  linkedIn: "",
  portfolio: "",
  experience: "7 Years",
  noticePeriod: "30 days",
  expectedSalary: "₹25-35 LPA",
  salaryCurrency: "INR",
  preferredJobType: "Full-time",
  preferredLocations: ["Bengaluru, Karnataka", "Remote"],
  remoteOnly: false,
  skills: [
    "Dynamics 365 F&O", "X++", "C#", ".NET", "Azure DevOps",
    "Power Platform", "Microsoft Fabric", "Power BI", "SQL Server",
    "Azure Functions", "Logic Apps", "OData", "Visual Studio",
    "LCS", "CI/CD", "Electron"
  ],
  summary: "D365 F&O Developer / Technical Consultant with 7+ years of experience specializing in complex ERP architecture, high-impact performance engineering, and modern Azure-based cloud integration. Proven expertise in leading enterprise-level implementations, optimizing system performance, and delivering scalable solutions across finance, retail, and manufacturing domains.",
  education: [
    { degree: "B.E. in Computer Science and Engineering", institution: "VTU Mangaluru", year: "2018" }
  ],
  certifications: ["AZ-400 Microsoft DevOps Engineer Expert", "AZ-103 Microsoft Azure Administrator", "MB6-894 D365 Finance & Operations Development"],
  languages: ["English", "Kannada", "Hindi"],
  // LLM Settings for AI resume tailoring
  llmProvider: 'openai', // 'openai' | 'gemini'
  llmApiKey: '',
  gmailNotifications: true, // send email when job is applied
  // Resume content
  resumeText: `Anup Chandavar
D365 F&O Technical Consultant | Azure Certified Expert
Bengaluru, Karnataka | anupchandavar21@gmail.com | +91 8722690223

SUMMARY
D365 F&O Developer / Technical Consultant with 7+ years of experience specializing in complex ERP architecture, high-impact performance engineering, and modern Azure-based cloud integration.

EXPERIENCE
HPE — D365 F&O Technical Consultant (Mar 2023 - Present)
• Lead D365 F&O implementation and customization for enterprise clients
• Azure DevOps CI/CD pipeline design and implementation
• Performance optimization and code review

Cognizant — D365 F&O Technical Consultant (Jan 2021 - Feb 2023)
• Worked on Columbia Sportswear D365 F&O implementation
• Azure integration and Logic Apps development
• X++ development and ALM management

Alpha Variance Solutions — Team Lead (Sept 2019 - Jan 2021)
• Led team of 5 developers for multiple retail clients
• FarhaadXXL, Rag & Bone, Clever Devices, Louis Vuitton LVMH projects

SKILLS
D365 F&O, X++, C#, Azure DevOps, Power Platform, Microsoft Fabric, SQL Server, Azure Functions, Logic Apps, OData, LCS

CERTIFICATIONS
AZ-400, AZ-103, MB6-894`,
  coverLetterTemplate: `Dear Hiring Manager,

I am writing to express my strong interest in the {JOB_TITLE} position at {COMPANY}. With {EXPERIENCE} of experience in Dynamics 365 F&O and a proven track record in enterprise ERP implementations, I am confident I would be a valuable addition to your team.

My key qualifications include:
• Extensive experience in D365 F&O X++ development and customization
• Azure DevOps and CI/CD pipeline expertise for ERP deployments
• Strong background in Power Platform and Azure integration

I am particularly excited about this opportunity because {PERSONALIZATION_REASON}.

Thank you for considering my application. I look forward to discussing how my skills and experience align with your needs.

Best regards,
{APPLICANT_NAME}`,
}

const DEFAULT_SCHEDULE = {
  enabled: false,
  searchTime: "07:00",
  searchDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  lastRun: null,
}

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(() => {
    try {
      const stored = localStorage.getItem('jh_profile')
      return stored ? JSON.parse(stored) : DEFAULT_PROFILE
    } catch { return DEFAULT_PROFILE }
  })
  const [schedule, setSchedule] = useState(() => {
    try {
      const stored = localStorage.getItem('jh_schedule')
      return stored ? JSON.parse(stored) : DEFAULT_SCHEDULE
    } catch { return DEFAULT_SCHEDULE }
  })
  const [appliedJobs, setAppliedJobs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jh_applied') || '[]') } catch { return [] }
  })
  const [savedJobs, setSavedJobs] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('jh_saved') || '[]')) } catch { return new Set() }
  })

  useEffect(() => { localStorage.setItem('jh_profile', JSON.stringify(profile)) }, [profile])
  useEffect(() => { localStorage.setItem('jh_schedule', JSON.stringify(schedule)) }, [schedule])
  useEffect(() => { localStorage.setItem('jh_applied', JSON.stringify(appliedJobs)) }, [appliedJobs])
  useEffect(() => { localStorage.setItem('jh_saved', JSON.stringify([...savedJobs])) }, [savedJobs])

  const updateProfile = (updates) => setProfile(p => ({ ...p, ...updates }))
  const updateSchedule = (updates) => setSchedule(s => ({ ...s, ...updates }))
  const addAppliedJob = (jobId, tailoredResume, tailoredCoverLetter) => {
    setAppliedJobs(a => [...a, { jobId, date: new Date().toISOString(), tailoredResume, tailoredCoverLetter }])
    setAppliedJobs(a => {
      const updated = [...a, { jobId, date: new Date().toISOString(), tailoredResume, tailoredCoverLetter }]
      localStorage.setItem('jh_applied', JSON.stringify(updated))
      return updated
    })
  }
  const toggleSavedJob = (jobId) => {
    setSavedJobs(s => {
      const next = new Set(s)
      if (next.has(jobId)) next.delete(jobId)
      else next.add(jobId)
      return next
    })
  }

  return (
    <ProfileContext.Provider value={{
      profile, updateProfile, schedule, updateSchedule,
      appliedJobs, addAppliedJob, savedJobs, toggleSavedJob,
      DEFAULT_PROFILE, DEFAULT_SCHEDULE,
    }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider')
  return ctx
}