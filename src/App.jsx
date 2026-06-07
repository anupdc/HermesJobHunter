import { useState, useEffect, useRef } from 'react'
import { ProfileProvider, useProfile } from './ProfileContext'
import ResumeModal from './ResumeModal'
import SchedulePanel from './SchedulePanel'
import ProfileEditor from './ProfileEditor'
import Scheduler from './Scheduler'
import Settings from './Settings'
import './App.css'
import './scheduler-styles.css'

// ─── Icons (inline SVG) ────────────────────────────────────────────────────
const SearchIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>)
const BriefcaseIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>)
const BookmarkIcon = ({ filled }) => (<svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>)
const UserIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>)
const HomeIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>)
const StarIcon = ({ filled }) => (<svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "#fbbf24" : "none"} stroke={filled ? "#fbbf24" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>)
const LocationIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>)
const DollarIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>)
const BuildingIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/></svg>)
const ZapIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>)
const CheckCircleIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>)
const ExternalLinkIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>)
const SparklesIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>)
const ClockIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>)
const CalendarIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>)
const FilterIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>)
const BoltIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m13 2-2 6.5h6"/><path d="M11.5 8.5 6 18h4l-1 4h5l.5-4.5L20 18h-4"/></svg>)
const SettingsGearIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>)
const SendIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>)

// ─── Sample Jobs (enhanced) ─────────────────────────────────────────────────
const SAMPLE_JOBS = [
  { id: 1, title: "D365 F&O Senior Developer", company: "HPE", location: "Bengaluru, Karnataka", salary: "₹25-35 LPA", type: "Full-time", posted: "2 days ago", match: 96, tags: ["D365 F&O", "X++", "Azure"], description: "Lead D365 F&O implementation and customization for enterprise clients. Focus on Finance & Operations modules, Azure integration, and performance optimization.", url: "#", remote: false },
  { id: 2, title: "Azure DevOps Engineer - Dynamics 365", company: "Cognizant", location: "Bengaluru, Karnataka", salary: "₹18-28 LPA", type: "Full-time", posted: "1 day ago", match: 93, tags: ["Azure DevOps", "CI/CD", "D365"], description: "Design and implement CI/CD pipelines for D365 F&O projects. Manage LCS deployments, environment updates, and build automation.", url: "#", remote: false },
  { id: 3, title: "Power Platform Consultant", company: "Microsoft", location: "Remote / Hyderabad", salary: "₹22-32 LPA", type: "Full-time", posted: "3 days ago", match: 89, tags: ["Power Platform", "Power Automate", "Canvas Apps"], description: "Design low-code solutions using Power Platform to integrate with D365 F&O. Build Canvas Apps, automate workflows, and implement Copilot features.", url: "#", remote: true },
  { id: 4, title: "Dynamics 365 Technical Lead", company: "Accenture", location: "Bengaluru, Karnataka", salary: "₹30-40 LPA", type: "Full-time", posted: "5 days ago", match: 91, tags: ["D365 F&O", "X++", "C#", "Team Lead"], description: "Lead a team of D365 F&O developers for a major retail client. Architect solutions, conduct code reviews, and drive performance improvements.", url: "#", remote: false },
  { id: 5, title: "Microsoft Fabric Data Engineer", company: "Infosys", location: "Bengaluru, Karnataka", salary: "₹20-30 LPA", type: "Full-time", posted: "1 week ago", match: 85, tags: ["Microsoft Fabric", "Power BI", "Data Lake"], description: "Build modern data pipelines replacing D365 BYOD with Microsoft Fabric. Design data models and create real-time reporting solutions.", url: "#", remote: false },
  { id: 6, title: "D365 F&O Functional Consultant", company: "IBM", location: "Pune / Bengaluru", salary: "₹16-24 LPA", type: "Full-time", posted: "4 days ago", match: 88, tags: ["D365 F&O", "Retail", "WMS"], description: "Implement D365 Retail and WMS modules for manufacturing clients. Configure business processes, train end users, and manage UAT.", url: "#", remote: false },
  { id: 7, title: "Senior X++ Developer - Remote", company: "Infosys", location: "Remote", salary: "₹28-38 LPA", type: "Contract", posted: "1 day ago", match: 94, tags: ["X++", "D365 F&O", "ERP", "Azure"], description: "Remote contract role for D365 F&O X++ development. Working on financial modules, custom reporting, and data entity development.", url: "#", remote: true },
  { id: 8, title: "Azure Integration Engineer", company: "TCS", location: "Bengaluru / Mumbai", salary: "₹20-28 LPA", type: "Full-time", posted: "3 days ago", match: 87, tags: ["Azure Functions", "Logic Apps", "Azure Service Bus", "D365"], description: "Build Azure-based integrations connecting D365 F&O with external systems using Logic Apps, Azure Functions, and Service Bus.", url: "#", remote: false },
]

// ─── Match Bar ──────────────────────────────────────────────────────────────
function MatchBar({ score }) {
  const color = score >= 90 ? '#4ade80' : score >= 75 ? '#fbbf24' : '#f87171'
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">{[...Array(5)].map((_, i) => (<StarIcon key={i} filled={i < Math.round(score / 20)} />))}</div>
      <span className="text-xs font-mono font-bold" style={{ color }}>{score}%</span>
    </div>
  )
}

// ─── Job Card (enhanced) ─────────────────────────────────────────────────────
function JobCard({ job, saved, onToggleSave, onApply, index }) {
  return (
    <div className="job-card animate-fade-in" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-base font-semibold text-white mb-1 leading-tight">{job.title}</h3>
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <BuildingIcon /> <span>{job.company}</span>
            <span className="text-slate-600">•</span>
            <LocationIcon /> <span>{job.location}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{job.type}</span>
            {job.remote && <span className="tag-pill" style={{ background: '#065f46', color: '#4ade80' }}>Remote</span>}
          </div>
        </div>
        <button onClick={() => onToggleSave(job.id)} className="save-btn" title={saved ? "Remove from saved" : "Save job"}>
          <BookmarkIcon filled={saved} />
        </button>
      </div>

      <p className="text-sm text-slate-400 mb-3 leading-relaxed line-clamp-2">{job.description}</p>

      <div className="flex flex-wrap gap-2 mb-3">
        {job.tags.map(tag => (<span key={tag} className="tag-pill">{tag}</span>))}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{job.posted}</span>
          <span className="text-xs text-slate-500 flex items-center gap-1"><DollarIcon /> {job.salary}</span>
          <span className="source-badge" data-source={job.source}>{job.source}</span>
        </div>
        <MatchBar score={job.match} />
      </div>

      <div className="flex gap-2 mt-3">
        <button className="btn-primary flex-1 text-center text-sm py-2 rounded-lg font-medium transition-all" onClick={() => onApply(job)}>
          Apply Now <SendIcon />
        </button>
        {job.url && job.url !== '#' && (
          <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn-secondary px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-1" title="Open on {job.source}">
            <ExternalLinkIcon /> Web
          </a>
        )}
        <button onClick={() => onToggleSave(job.id)} className="btn-secondary px-3 py-2 rounded-lg text-sm transition-all">
          {saved ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  )
}

// ─── Stats Grid ─────────────────────────────────────────────────────────────
function StatsGrid({ jobs, appliedCount, savedCount }) {
  const stats = [
    { label: "Total Jobs Found", value: jobs.length, icon: <BriefcaseIcon />, color: "#38bdf8" },
    { label: "90%+ Match", value: jobs.filter(j => j.match >= 90).length, icon: <StarIcon filled />, color: "#4ade80" },
    { label: "Saved Jobs", value: savedCount, icon: <BookmarkIcon filled />, color: "#fbbf24" },
    { label: "Applications Sent", value: appliedCount, icon: <CheckCircleIcon />, color: "#a78bfa" },
  ]
  return (
    <div className="stats-grid">
      {stats.map((s, i) => (
        <div key={s.label} className="stat-card animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
          <div className="stat-icon" style={{ color: s.color, background: `${s.color}15` }}>{s.icon}</div>
          <div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Enhanced Search Bar ────────────────────────────────────────────────────
function SearchBar({ query, setQuery, onSearch, locationFilter, setLocationFilter, salaryFilter, setSalaryFilter, onSearchNow, onSearchEverywhere }) {
  const inputRef = useRef()
  return (
    <div className="search-container">
      <div className="search-icon"><SearchIcon /></div>
      <input
        ref={inputRef}
        type="text"
        className="search-input"
        placeholder="Search jobs... try 'D365 F&O', 'Azure DevOps', 'X++'..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onSearch()}
      />
      <button className="search-btn" onClick={onSearch}>Search</button>
      <button className="search-now-btn" onClick={onSearchNow} title="Search Now">⚡ Now</button>
      <button
        className="search-everywhere-btn"
        onClick={onSearchEverywhere}
        title="Search LinkedIn, Indeed, Naukri, Glassdoor & more"
      >
        🌐 Everywhere
      </button>
    </div>
  )
}

// ─── Filter Panel ────────────────────────────────────────────────────────────
function FilterPanel({ locationFilter, setLocationFilter, salaryFilter, setSalaryFilter, jobTypeFilter, setJobTypeFilter, onReset }) {
  return (
    <div className="filter-panel">
      <div className="filter-row">
        <div className="filter-group">
          <label className="filter-label"><LocationIcon /> Location</label>
          <select className="filter-select" value={locationFilter} onChange={e => setLocationFilter(e.target.value)}>
            <option value="">All Locations</option>
            <option value="Bengaluru">Bengaluru</option>
            <option value="Remote">Remote Only</option>
            <option value="Pune">Pune</option>
            <option value="Hyderabad">Hyderabad</option>
            <option value="Mumbai">Mumbai</option>
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label"><DollarIcon /> Salary Range</label>
          <select className="filter-select" value={salaryFilter} onChange={e => setSalaryFilter(e.target.value)}>
            <option value="">Any Salary</option>
            <option value="15-20">₹15-20 LPA</option>
            <option value="20-30">₹20-30 LPA</option>
            <option value="30-40">₹30-40 LPA</option>
            <option value="40+">₹40+ LPA</option>
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label"><BriefcaseIcon /> Job Type</label>
          <select className="filter-select" value={jobTypeFilter} onChange={e => setJobTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            <option value="Full-time">Full-time</option>
            <option value="Contract">Contract</option>
            <option value="Remote">Remote</option>
          </select>
        </div>
        <button className="filter-reset" onClick={onReset}>Reset</button>
      </div>
    </div>
  )
}

// ─── Schedule Summary (nav badge) ────────────────────────────────────────────
function ScheduleBadge({ schedule }) {
  if (!schedule.enabled) return null
  return (
    <div className="schedule-badge" title={`Auto-search at ${schedule.searchTime} on ${(schedule.searchDays || []).join(', ')}`}>
      <ClockIcon />
      <span>{schedule.searchTime}</span>
    </div>
  )
}

// ─── Main App ───────────────────────────────────────────────────────────────
function AppInner() {
  const { profile, appliedJobs, savedJobs, toggleSavedJob, schedule } = useProfile()
  const [activeTab, setActiveTab] = useState('home')
  const [jobs, setJobs] = useState(SAMPLE_JOBS)
  const [searchQuery, setSearchQuery] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [salaryFilter, setSalaryFilter] = useState('')
  const [jobTypeFilter, setJobTypeFilter] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [showApplyModal, setShowApplyModal] = useState(null) // job being applied
  const [showSchedule, setShowSchedule] = useState(false)
  const [appliedJobIds, setAppliedJobIds] = useState(new Set(appliedJobs.map(a => a.jobId)))

  // Sync applied jobs
  useEffect(() => {
    setAppliedJobIds(new Set(appliedJobs.map(a => a.jobId)))
  }, [appliedJobs])

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 2500)
  }

  const toggleSave = (id) => {
    toggleSavedJob(id)
    const isNowSaved = savedJobs.has(id)
    showToast(isNowSaved ? 'Job saved!' : 'Job removed from saved')
  }

  const applyJob = (job) => {
    setShowApplyModal(job)
  }

  const handleApplied = () => {
    if (showApplyModal) {
      setAppliedJobIds(prev => new Set([...prev, showApplyModal.id]))
      showToast(`Application sent to ${showApplyModal.company}!`)
    }
  }

  const applyFilters = (jobList) => {
    let result = jobList
    if (locationFilter === 'Remote') result = result.filter(j => j.remote || j.location.toLowerCase().includes('remote'))
    else if (locationFilter) result = result.filter(j => j.location.includes(locationFilter))
    if (salaryFilter) {
      const ranges = { '15-20': [15, 20], '20-30': [20, 30], '30-40': [30, 40], '40+': [40, 999] }
      const [min, max] = ranges[salaryFilter] || [0, 0]
      result = result.filter(j => {
        const match = j.salary.match(/₹(\d+)-(\d+)/)
        if (!match) return true
        const val = (parseInt(match[1]) + parseInt(match[2])) / 2
        return val >= min && val <= max
      })
    }
    if (jobTypeFilter) result = result.filter(j => j.type === jobTypeFilter || (jobTypeFilter === 'Remote' && j.remote))
    return result
  }

  const handleSearch = () => {
    if (!searchQuery.trim() && !locationFilter && !salaryFilter && !jobTypeFilter) return
    setIsSearching(true)
    setTimeout(() => {
      let filtered = SAMPLE_JOBS
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        filtered = SAMPLE_JOBS.filter(j =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.tags.some(t => t.toLowerCase().includes(q)) ||
          j.description.toLowerCase().includes(q)
        )
      }
      filtered = applyFilters(filtered)
      setJobs(filtered.length ? filtered : SAMPLE_JOBS)
      setIsSearching(false)
      showToast(filtered.length ? `Found ${filtered.length} jobs!` : 'No exact matches, showing all jobs')
    }, 1200)
  }

  const handleSearchNow = () => {
    setIsSearching(true)
    const profile = { name: 'Anup Chandavar', title: 'D365 F&O Technical Consultant', experience: '7+ years',
      skills: ['Dynamics 365 F&O','D365 F&O','X++','C#','.NET','Azure DevOps','Azure','CI/CD','LCS','ALM',
        'Microsoft Fabric','Power BI','SQL Server','Power Platform','Power Automate','Canvas Apps',
        'Azure Functions','Logic Apps','Service Bus','ERP','Finance','Retail','Commerce','WMS'],
      preferredLocations: ['Bengaluru','Bangalore','Remote','Hyderabad','Pune','Mumbai','Chennai'],
      preferredJobType: 'Full-time', remotePreference: 'Hybrid', expectedSalary: '₹25-40 LPA' }
    const profileB64 = btoa(JSON.stringify(profile))
    const q = encodeURIComponent(searchQuery || 'D365 Azure Dynamics 365 F&O')
    fetch(`http://172.16.3.2:18081/search?q=${q}&l=Bangalore&profile=${profileB64}`)
      .then(r => r.json())
      .then(data => {
        const filtered = applyFilters(data.jobs || [])
        setJobs(filtered.length ? filtered : (data.jobs || []))
        setIsSearching(false)
        showToast(filtered.length ? `Found ${filtered.length} jobs!` : 'No matching jobs found')
      })
      .catch(() => {
        const filtered = applyFilters([...SAMPLE_JOBS])
        setJobs(filtered.length ? filtered : SAMPLE_JOBS)
        setIsSearching(false)
        showToast('Search complete (fallback jobs)')
      })
  }

  const handleSearchEverywhere = async () => {
    setIsSearching(true)
    const profile = { name: 'Anup Chandavar', title: 'D365 F&O Technical Consultant', experience: '7+ years',
      skills: ['Dynamics 365 F&O','D365 F&O','X++','C#','.NET','Azure DevOps','Azure','CI/CD','LCS','ALM',
        'Microsoft Fabric','Power BI','SQL Server','Power Platform','Power Automate','Canvas Apps',
        'Azure Functions','Logic Apps','Service Bus','ERP','Finance','Retail','Commerce','WMS'],
      preferredLocations: ['Bengaluru','Bangalore','Remote','Hyderabad','Pune','Mumbai','Chennai'],
      preferredJobType: 'Full-time', remotePreference: 'Hybrid', expectedSalary: '₹25-40 LPA' }
    const profileB64 = btoa(JSON.stringify(profile))
    try {
      const res = await fetch(`http://172.16.3.2:18081/jobs?profile=${profileB64}&limit=25`)
      if (!res.ok) throw new Error('API unreachable')
      const data = await res.json()
      const filtered = applyFilters(data.jobs || [])
      setJobs(filtered.length ? filtered : (data.jobs || []))
      showToast(filtered.length ? `Found ${filtered.length} jobs for you!` : 'No matching jobs found')
    } catch {
      const filtered = applyFilters([...SAMPLE_JOBS])
      setJobs(filtered.length ? filtered : SAMPLE_JOBS)
      showToast('Showing matched jobs (offline mode)')
    } finally {
      setIsSearching(false)
    }
  }

  const resetFilters = () => {
    setLocationFilter('')
    setSalaryFilter('')
    setJobTypeFilter('')
    setSearchQuery('')
    setJobs(SAMPLE_JOBS)
  }

  const filteredJobs = applyFilters(jobs)

  const tabs = [
    { id: 'home', label: 'Home', icon: <HomeIcon /> },
    { id: 'jobs', label: 'Jobs', icon: <BriefcaseIcon /> },
    { id: 'saved', label: 'Saved', icon: <BookmarkIcon filled={false} /> },
    { id: 'settings', label: 'Settings', icon: <SettingsGearIcon /> },
  ]

  const displayJobs = activeTab === 'saved'
    ? SAMPLE_JOBS.filter(j => savedJobs.has(j.id))
    : filteredJobs

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <nav className="top-nav">
        <div className="nav-brand">
          <div className="brand-icon"><SparklesIcon /></div>
          <span className="brand-text">JobHunter</span>
          <span className="brand-badge">AI-Powered</span>
        </div>
        <div className="nav-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            >
              <span className="nav-tab-icon">{tab.icon}</span>
              <span className="nav-tab-label">{tab.label}</span>
              {tab.id === 'saved' && savedJobs.size > 0 && <span className="nav-badge">{savedJobs.size}</span>}
            </button>
          ))}
        </div>
        <ScheduleBadge schedule={schedule} />
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div className="home-tab animate-fade-in">
            <div className="hero-section">
              <div className="hero-glow" />
              <h1 className="hero-title">
                Welcome back, <span className="text-sky-400">{profile.name.split(' ')[0]}</span>
              </h1>
              <p className="hero-subtitle">{profile.title} • {profile.experience} experience</p>
              <div className="hero-stats">
                <div className="hero-stat">
                  <span className="text-2xl font-bold text-sky-400">{jobs.filter(j => j.match >= 90).length}</span>
                  <span className="text-xs text-slate-400">90%+ Matches</span>
                </div>
                <div className="hero-stat-divider" />
                <div className="hero-stat">
                  <span className="text-2xl font-bold text-green-400">{jobs.length}</span>
                  <span className="text-xs text-slate-400">Jobs Found</span>
                </div>
                <div className="hero-stat-divider" />
                <div className="hero-stat">
                  <span className="text-2xl font-bold text-purple-400">{appliedJobIds.size}</span>
                  <span className="text-xs text-slate-400">Applied</span>
                </div>
                <div className="hero-stat-divider" />
                <div className="hero-stat">
                  <span className="text-2xl font-bold text-yellow-400">{profile.expectedSalary || '—'}</span>
                  <span className="text-xs text-slate-400">Expected</span>
                </div>
              </div>
              {schedule.enabled && (
                <div className="hero-schedule-note">
                  <ClockIcon /> Auto-search at {schedule.searchTime} on {(schedule.searchDays || []).join(', ')}
                </div>
              )}
            </div>

            <SearchBar
              query={searchQuery} setQuery={setSearchQuery}
              onSearch={handleSearch}
              locationFilter={locationFilter} setLocationFilter={setLocationFilter}
              salaryFilter={salaryFilter} setSalaryFilter={setSalaryFilter}
              onSearchNow={handleSearchNow}
              onSearchEverywhere={handleSearchEverywhere}
            />
            <FilterPanel
              locationFilter={locationFilter} setLocationFilter={setLocationFilter}
              salaryFilter={salaryFilter} setSalaryFilter={setSalaryFilter}
              jobTypeFilter={jobTypeFilter} setJobTypeFilter={setJobTypeFilter}
              onReset={resetFilters}
            />

            <div className="home-section">
              <h2 className="section-heading"><ZapIcon /> Top Matching Jobs</h2>
              <div className="jobs-grid">
                {jobs.filter(j => j.match >= 90).slice(0, 3).map((job, i) => (
                  <JobCard key={job.id} job={job} saved={savedJobs.has(job.id)} onToggleSave={toggleSave} onApply={applyJob} index={i} />
                ))}
              </div>
            </div>

            <div className="home-section">
              <h2 className="section-heading"><BriefcaseIcon /> Recently Posted</h2>
              <div className="recent-list">
                {jobs.slice(0, 4).map((job, i) => (
                  <div key={job.id} className="recent-item animate-slide-in" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{job.title}</div>
                      <div className="text-xs text-slate-400">{job.company} · {job.location}</div>
                    </div>
                    <MatchBar score={job.match} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* JOBS TAB */}
        {activeTab === 'jobs' && (
          <div className="jobs-tab animate-fade-in">
            <SearchBar
              query={searchQuery} setQuery={setSearchQuery}
              onSearch={handleSearch}
              locationFilter={locationFilter} setLocationFilter={setLocationFilter}
              salaryFilter={salaryFilter} setSalaryFilter={setSalaryFilter}
              onSearchNow={handleSearchNow}
              onSearchEverywhere={handleSearchEverywhere}
            />
            <FilterPanel
              locationFilter={locationFilter} setLocationFilter={setLocationFilter}
              salaryFilter={salaryFilter} setSalaryFilter={setSalaryFilter}
              jobTypeFilter={jobTypeFilter} setJobTypeFilter={setJobTypeFilter}
              onReset={resetFilters}
            />

            {/* ─── Search Platforms Bar ──────────────────────────────── */}
            <div className="search-sources-bar">
              <span className="search-sources-label">Search on:</span>
              <a className="source-link naukri" href="https://www.naukri.com/jobs-in-bangalore?q=D365+Azure+Dynamics+F%26O+X%2B%2B" target="_blank" rel="noopener noreferrer">
                <BuildingIcon /> Naukri
              </a>
              <a className="source-link linkedin" href="https://www.linkedin.com/jobs/search/?keywords=D365%20Azure%20Dynamics%20365%20F%26O&location=Bangalore" target="_blank" rel="noopener noreferrer">
                <BuildingIcon /> LinkedIn
              </a>
              <a className="source-link indeed" href="https://in.indeed.com/jobs?q=D365%20Azure%20Dynamics%20365%20F%26O&l=Bangalore" target="_blank" rel="noopener noreferrer">
                <BuildingIcon /> Indeed
              </a>
              <a className="source-link shine" href="https://www.shine.com/job-search/D365-Azure-Dynamics-F-O-X++-Bangalore" target="_blank" rel="noopener noreferrer">
                <BuildingIcon /> Shine
              </a>
              <a className="source-link foundit" href="https://www.foundit.in/jobs/D365-Azure-Dynamics-in-Bangalore" target="_blank" rel="noopener noreferrer">
                <BuildingIcon /> Foundit
              </a>
            </div>

            {isSearching ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="spinner" />
                <p className="text-slate-400 text-sm">Searching for jobs...</p>
              </div>
            ) : displayJobs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><SearchIcon /></div>
                <p className="text-slate-400 mt-3">No jobs found with current filters</p>
                <button className="btn-primary mt-4 px-6 py-2 rounded-lg text-sm" onClick={resetFilters}>
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-500 mb-4">{displayJobs.length} jobs found</p>
                <div className="jobs-list">
                  {displayJobs.map((job, i) => (
                    <JobCard key={job.id} job={job} saved={savedJobs.has(job.id)} onToggleSave={toggleSave} onApply={applyJob} index={i} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* SAVED TAB */}
        {activeTab === 'saved' && (
          <div className="saved-tab animate-fade-in">
            <div className="saved-header">
              <h2 className="text-lg font-bold text-white">Saved Jobs</h2>
              <span className="text-sm text-slate-400">{savedJobs.size} jobs</span>
            </div>
            {displayJobs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><BookmarkIcon filled={false} /></div>
                <p className="text-slate-400 mt-3">No saved jobs yet</p>
                <button className="btn-primary mt-4 px-6 py-2 rounded-lg text-sm" onClick={() => setActiveTab('jobs')}>
                  Browse Jobs
                </button>
              </div>
            ) : (
              <div className="jobs-list">
                {displayJobs.map((job, i) => (
                  <JobCard key={job.id} job={job} saved={true} onToggleSave={toggleSave} onApply={applyJob} index={i} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && <Settings />}
      </main>

      {/* Modals */}
      {showApplyModal && (
        <ResumeModal
          job={showApplyModal}
          onClose={() => setShowApplyModal(null)}
          onApplied={handleApplied}
        />
      )}
      {showSchedule && <SchedulePanel onClose={() => setShowSchedule(false)} />}

      {/* Toast */}
      {toastMsg && (
        <div className="toast animate-fade-in">
          <CheckCircleIcon /> {toastMsg}
        </div>
      )}
    </div>
  )
}

// ─── Root App with Provider ──────────────────────────────────────────────────
export default function App() {
  return (
    <ProfileProvider>
      <AppInner />
    </ProfileProvider>
  )
}