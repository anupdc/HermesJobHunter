import { useState, useEffect, useRef } from 'react'
import './App.css'

// ─── Icons (inline SVG) ────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
)
const BriefcaseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>
)
const BookmarkIcon = ({ filled }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
  </svg>
)
const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
)
const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)
const StarIcon = ({ filled }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "#fbbf24" : "none"} stroke={filled ? "#fbbf24" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)
const LocationIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
)
const DollarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
)
const BuildingIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>
  </svg>
)
const ZapIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
)
const CheckCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
)
const ExternalLinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
)
const SparklesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
  </svg>
)

// ─── Sample Data ────────────────────────────────────────────────────────────
const SAMPLE_JOBS = [
  { id: 1, title: "D365 F&O Senior Developer", company: "HPE", location: "Bengaluru, Karnataka", salary: "₹25-35 LPA", type: "Full-time", posted: "2 days ago", match: 96, tags: ["D365 F&O", "X++", "Azure"], description: "Lead D365 F&O implementation and customization for enterprise clients. Focus on Finance & Operations modules, Azure integration, and performance optimization.", url: "#" },
  { id: 2, title: "Azure DevOps Engineer - Dynamics 365", company: "Cognizant", location: "Bengaluru, Karnataka", salary: "₹18-28 LPA", type: "Full-time", posted: "1 day ago", match: 93, tags: ["Azure DevOps", "CI/CD", "D365"], description: "Design and implement CI/CD pipelines for D365 F&O projects. Manage LCS deployments, environment updates, and build automation.", url: "#" },
  { id: 3, title: "Power Platform Consultant", company: "Microsoft", location: "Remote / Hyderabad", salary: "₹22-32 LPA", type: "Full-time", posted: "3 days ago", match: 89, tags: ["Power Platform", "Power Automate", "Canvas Apps"], description: "Design low-code solutions using Power Platform to integrate with D365 F&O. Build Canvas Apps, automate workflows, and implement Copilot features.", url: "#" },
  { id: 4, title: "Dynamics 365 Technical Lead", company: "Accenture", location: "Bengaluru, Karnataka", salary: "₹30-40 LPA", type: "Full-time", posted: "5 days ago", match: 91, tags: ["D365 F&O", "X++", "C#", "Team Lead"], description: "Lead a team of D365 F&O developers for a major retail client. Architect solutions, conduct code reviews, and drive performance improvements.", url: "#" },
  { id: 5, title: "Microsoft Fabric Data Engineer", company: "Infosys", location: "Bengaluru, Karnataka", salary: "₹20-30 LPA", type: "Full-time", posted: "1 week ago", match: 85, tags: ["Microsoft Fabric", "Power BI", "Data Lake"], description: "Build modern data pipelines replacing D365 BYOD with Microsoft Fabric. Design data models and create real-time reporting solutions.", url: "#" },
  { id: 6, title: "D365 F&O Functional Consultant", company: "IBM", location: "Pune / Bengaluru", salary: "₹16-24 LPA", type: "Full-time", posted: "4 days ago", match: 88, tags: ["D365 F&O", "Retail", "WMS"], description: "Implement D365 Retail and WMS modules for manufacturing clients. Configure business processes, train end users, and manage UAT.", url: "#" },
]

const PROFILE = {
  name: "Anup Chandavar",
  title: "D365 F&O Technical Consultant",
  email: "anupchandavar21@gmail.com",
  phone: "+91 8722690223",
  location: "Bengaluru, Karnataka",
  experience: "7+ Years",
  skills: ["Dynamics 365 F&O", "Azure DevOps", "X++", "C#", "Power Platform", "Microsoft Fabric", "SQL Server", "Azure Functions"],
  summary: "D365 F&O Developer / Technical Consultant with 7+ years of experience specializing in complex ERP architecture, high-impact performance engineering, and modern Azure-based cloud integration."
}

// ─── Star Rating ────────────────────────────────────────────────────────────
function MatchBar({ score }) {
  const color = score >= 90 ? '#4ade80' : score >= 75 ? '#fbbf24' : '#f87171'
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <StarIcon key={i} filled={i < Math.round(score / 20)} />
        ))}
      </div>
      <span className="text-xs font-mono font-bold" style={{ color }}>{score}%</span>
    </div>
  )
}

// ─── Job Card ───────────────────────────────────────────────────────────────
function JobCard({ job, saved, onToggleSave, index }) {
  return (
    <div className="job-card animate-fade-in" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-base font-semibold text-white mb-1 leading-tight">{job.title}</h3>
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
            <BuildingIcon /> <span>{job.company}</span>
            <span className="text-slate-600">•</span>
            <LocationIcon /> <span>{job.location}</span>
          </div>
        </div>
        <button onClick={() => onToggleSave(job.id)} className="save-btn" title={saved ? "Remove from saved" : "Save job"}>
          <BookmarkIcon filled={saved} />
        </button>
      </div>

      <p className="text-sm text-slate-400 mb-3 leading-relaxed line-clamp-2">{job.description}</p>

      <div className="flex flex-wrap gap-2 mb-3">
        {job.tags.map(tag => (
          <span key={tag} className="tag-pill">{tag}</span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{job.posted}</span>
          <span className="text-xs text-slate-500 flex items-center gap-1"><DollarIcon /> {job.salary}</span>
        </div>
        <MatchBar score={job.match} />
      </div>

      <div className="flex gap-2 mt-3">
        <a href={job.url} className="btn-primary flex-1 text-center text-sm py-2 rounded-lg font-medium transition-all">
          Apply Now <ExternalLinkIcon />
        </a>
        <button onClick={() => onToggleSave(job.id)} className="btn-secondary px-3 py-2 rounded-lg text-sm transition-all">
          {saved ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  )
}

// ─── Dashboard Stats ────────────────────────────────────────────────────────
function StatsGrid({ jobs }) {
  const stats = [
    { label: "Total Jobs Found", value: jobs.length, icon: <BriefcaseIcon />, color: "#38bdf8" },
    { label: "90%+ Match", value: jobs.filter(j => j.match >= 90).length, icon: <StarIcon filled />, color: "#4ade80" },
    { label: "Saved Jobs", value: 0, icon: <BookmarkIcon filled />, color: "#fbbf24" },
    { label: "Applications Sent", value: 0, icon: <CheckCircleIcon />, color: "#a78bfa" },
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

// ─── Profile Tab ────────────────────────────────────────────────────────────
function ProfileTab() {
  return (
    <div className="profile-tab animate-fade-in">
      <div className="profile-header">
        <div className="profile-avatar">
          {PROFILE.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{PROFILE.name}</h2>
          <p className="text-sky-400 font-medium">{PROFILE.title}</p>
          <p className="text-slate-400 text-sm mt-1 flex items-center gap-1"><LocationIcon /> {PROFILE.location}</p>
        </div>
      </div>

      <div className="profile-card">
        <h3 className="section-title">Contact</h3>
        <div className="space-y-2 text-sm text-slate-300">
          <div className="flex items-center gap-3"><span className="text-slate-500 w-20">Email</span><span>{PROFILE.email}</span></div>
          <div className="flex items-center gap-3"><span className="text-slate-500 w-20">Phone</span><span>{PROFILE.phone}</span></div>
          <div className="flex items-center gap-3"><span className="text-slate-500 w-20">Experience</span><span className="text-sky-400 font-semibold">{PROFILE.experience}</span></div>
        </div>
      </div>

      <div className="profile-card">
        <h3 className="section-title">Summary</h3>
        <p className="text-sm text-slate-300 leading-relaxed">{PROFILE.summary}</p>
      </div>

      <div className="profile-card">
        <h3 className="section-title">Top Skills</h3>
        <div className="flex flex-wrap gap-2">
          {PROFILE.skills.map(skill => (
            <span key={skill} className="skill-badge">{skill}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Search Bar ─────────────────────────────────────────────────────────────
function SearchBar({ query, setQuery, onSearch }) {
  const inputRef = useRef()
  return (
    <div className="search-container">
      <div className="search-icon"><SearchIcon /></div>
      <input
        ref={inputRef}
        type="text"
        className="search-input"
        placeholder="Search jobs... try 'D365 F&O', 'Azure DevOps', 'Power Platform'..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onSearch()}
      />
      <button className="search-btn" onClick={onSearch}>
        Search
      </button>
    </div>
  )
}

// ─── Filter Chips ───────────────────────────────────────────────────────────
function FilterChips({ filters, active, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map(f => (
        <button
          key={f}
          onClick={() => onToggle(f)}
          className={`filter-chip ${active.includes(f) ? 'active' : ''}`}
        >
          {f}
        </button>
      ))}
    </div>
  )
}

// ─── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [jobs, setJobs] = useState(SAMPLE_JOBS)
  const [savedJobs, setSavedJobs] = useState(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  const FILTERS = ['D365 F&O', 'Azure', 'Power Platform', 'Remote', 'Senior', 'Lead', 'Developer']

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 2500)
  }

  const toggleSave = (id) => {
    setSavedJobs(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else { next.add(id); showToast('Job saved!') }
      return next
    })
  }

  const toggleFilter = (f) => {
    setActiveFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])
  }

  const handleSearch = () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    setTimeout(() => {
      const q = searchQuery.toLowerCase()
      const filtered = SAMPLE_JOBS.filter(j =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.tags.some(t => t.toLowerCase().includes(q)) ||
        j.description.toLowerCase().includes(q)
      )
      setJobs(filtered.length ? filtered : SAMPLE_JOBS)
      setIsSearching(false)
      showToast(filtered.length ? `Found ${filtered.length} jobs!` : 'No exact matches, showing all jobs')
    }, 1200)
  }

  const filteredJobs = activeFilters.length
    ? jobs.filter(j => activeFilters.some(f => j.tags.includes(f) || j.title.includes(f)))
    : jobs

  const tabs = [
    { id: 'home', label: 'Home', icon: <HomeIcon /> },
    { id: 'jobs', label: 'Jobs', icon: <BriefcaseIcon /> },
    { id: 'saved', label: 'Saved', icon: <BookmarkIcon filled={false} /> },
    { id: 'profile', label: 'Profile', icon: <UserIcon /> },
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
              {tab.id === 'saved' && savedJobs.size > 0 && (
                <span className="nav-badge">{savedJobs.size}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div className="home-tab animate-fade-in">
            <div className="hero-section">
              <div className="hero-glow" />
              <h1 className="hero-title">
                Welcome back, <span className="text-sky-400">{PROFILE.name.split(' ')[0]}</span>
              </h1>
              <p className="hero-subtitle">
                {PROFILE.title} • {PROFILE.experience} experience
              </p>
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
                  <span className="text-2xl font-bold text-yellow-400">{PROFILE.skills.length}</span>
                  <span className="text-xs text-slate-400">Top Skills</span>
                </div>
              </div>
            </div>

            <SearchBar query={searchQuery} setQuery={setSearchQuery} onSearch={handleSearch} />

            <div className="home-section">
              <h2 className="section-heading">
                <ZapIcon />
                Top Matching Jobs
              </h2>
              <div className="jobs-grid">
                {jobs.filter(j => j.match >= 90).slice(0, 3).map((job, i) => (
                  <JobCard key={job.id} job={job} saved={savedJobs.has(job.id)} onToggleSave={toggleSave} index={i} />
                ))}
              </div>
            </div>

            <div className="home-section">
              <h2 className="section-heading">
                <BriefcaseIcon />
                Recently Posted
              </h2>
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
            <SearchBar query={searchQuery} setQuery={setSearchQuery} onSearch={handleSearch} />

            <div className="mb-4">
              <p className="text-xs text-slate-500 mb-2">Quick filters</p>
              <FilterChips filters={FILTERS} active={activeFilters} onToggle={toggleFilter} />
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
                <button className="btn-primary mt-4 px-6 py-2 rounded-lg text-sm" onClick={() => { setActiveFilters([]); setSearchQuery('') }}>
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-500 mb-4">{displayJobs.length} jobs found</p>
                <div className="jobs-list">
                  {displayJobs.map((job, i) => (
                    <JobCard key={job.id} job={job} saved={savedJobs.has(job.id)} onToggleSave={toggleSave} index={i} />
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
                  <JobCard key={job.id} job={job} saved={true} onToggleSave={toggleSave} index={i} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && <ProfileTab />}
      </main>

      {/* Toast */}
      {toastMsg && (
        <div className="toast animate-fade-in">
          <CheckCircleIcon />
          {toastMsg}
        </div>
      )}
    </div>
  )
}