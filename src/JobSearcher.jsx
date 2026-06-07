import { useState } from 'react'

const SearchIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>)
const CheckIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>)
const GlobeIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>)
const SpinnerIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1"/></svg>)
const AlertIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>)

const PLATFORMS = [
  {
    name: 'Naukri',
    short: 'naukri',
    label: 'Naukri.com',
    description: "India's largest job board — 5M+ jobs",
    color: '#d32f2f',
    searchTemplate: 'https://www.naukri.com/jobs-in-bangalore?q={query}&k={query}&l=Bangalore',
    icon: '🇮🇳',
    strength: "Best for Indian D365/Azure/ERP roles. Recruiters actively search here.",
  },
  {
    name: 'LinkedIn',
    short: 'linkedin',
    label: 'LinkedIn Jobs',
    description: "Global + India listings — 20M+ jobs",
    color: '#0077b5',
    searchTemplate: 'https://www.linkedin.com/jobs/search/?keywords={query}&location=Bangalore&f_TPR=r604800&sortBy=DD',
    icon: '💼',
    strength: "Best for senior/lead roles. Your network visibility helps.",
  },
  {
    name: 'Indeed India',
    short: 'indeed',
    label: 'Indeed India',
    description: "Aggregator — 2M+ Indian listings",
    color: '#2164f3',
    searchTemplate: 'https://in.indeed.com/jobs?q={query}&l=Bangalore&fromage=7&sort=date',
    icon: '✅',
    strength: 'Aggregates from company career pages. Good for salary filtering.',
  },
  {
    name: 'Shine',
    short: 'shine',
    label: 'Shine.com',
    description: "India's #2 job portal — 3M+ jobs",
    color: '#f59e0b',
    searchTemplate: 'https://www.shine.com/job-search/q-{query}-in-bangalore-4-10-years-exp/',
    icon: '✨',
    strength: "Good for mid-level D365 roles. Less crowded than Naukri.",
  },
  {
    name: 'Foundit',
    short: 'foundit',
    label: 'Foundit (Monster)',
    description: "India's #3 — strong for tech roles",
    color: '#22c55e',
    searchTemplate: 'https://www.foundit.in/s/jobs?q={query}&l=Bangalore&exp=4,15',
    icon: '🎯',
    strength: "Direct recruiter contact info. Good for senior D365 roles.",
  },
  {
    name: 'FreshersLive',
    short: 'freshers',
    label: 'FreshersLive',
    description: "Freshers + 0-5 yrs — 50K+ jobs/day",
    color: '#8b5cf6',
    searchTemplate: 'https://www.fresherslive.com/search/{query}-jobs-in-bangalore',
    icon: '🌱',
    strength: 'Good for early-career D365 moves or first ERP roles.',
  },
  {
    name: 'Wellfound',
    short: 'wellfound',
    label: 'Wellfound (AngelList)',
    description: "Startups + mid-stage companies",
    color: '#f97316',
    searchTemplate: 'https://wellfound.com/jobs?query={query}&location=Bangalore',
    icon: '🏭',
    strength: "Startups in Bangalore need Azure/D365 integrators. Equity-focused.",
  },
]

function buildSearchUrl(template, keywords) {
  return template.replace('{query}', encodeURIComponent(keywords.join(' ')))
}

export default function JobSearcher({ profile }) {
  const [searching, setSearching] = useState(false)
  const [searchDone, setSearchDone] = useState(false)
  const [jobCount, setJobCount] = useState(null)
  const [searchMode, setSearchMode] = useState(null) // 'background' | 'browser-fallback' | 'error'

  const searchQuery = [
    ...(profile.keywords || ['Dynamics 365', 'D365 F&O', 'Azure', 'ERP Developer', 'X++']),
    ...(profile.skills || []).slice(0, 3),
  ]
  const keywords = [...new Set(searchQuery)].filter(Boolean)

  const handleSearchAll = async () => {
    setSearching(true)
    setJobCount(null)
    setSearchMode(null)

    // Background scrape first using stored credentials
    let foundJobs = []
    let scrapeWorked = false

    if (window.electronAPI?.searchJobsCredentialed) {
      try {
        const jobs = await window.electronAPI.searchJobsCredentialed(keywords, 'Bangalore')
        if (jobs && jobs.length > 0) {
          foundJobs = jobs
          scrapeWorked = true
          setJobCount(jobs.length)
          setSearchDone(true)
          window.dispatchEvent(new CustomEvent('jobs-found', { detail: jobs }))
          console.log(`Background scrape found ${jobs.length} jobs`)
        }
      } catch (e) {
        console.error('Credentialed search failed:', e)
      }
    }

    // If background scrape found nothing, open browser tabs as fallback
    if (!scrapeWorked) {
      setSearchMode('browser-fallback')
      const urls = PLATFORMS.map(p => buildSearchUrl(p.searchTemplate, keywords))
      if (window.electronAPI?.openSearchUrls) {
        await window.electronAPI.openSearchUrls(urls)
      } else {
        urls.forEach(url => window.open(url, '_blank'))
      }
    } else {
      setSearchMode('background')
    }

    setSearching(false)
    setTimeout(() => setSearchDone(false), 10000)
  }

  const handleSearchOne = (platform) => {
    const url = buildSearchUrl(platform.searchTemplate, keywords)
    if (window.electronAPI?.openSearchUrls) {
      window.electronAPI.openSearchUrls([url])
    } else {
      window.open(url, '_blank')
    }
  }

  const combinedKeywords = keywords.slice(0, 6)

  return (
    <div className="jobsearcher">
      <div className="jobsearcher-header">
        <h3 className="jobsearcher-title">Search All Platforms</h3>
        <p className="jobsearcher-subtitle">
          Searches LinkedIn + Naukri in the background using your stored credentials — or opens browser tabs if blocked.
        </p>
      </div>

      <div className="jobsearcher-keywords">
        <span className="jk-label">Searching for:</span>
        <div className="jk-tags">
          {combinedKeywords.map(k => <span key={k} className="jk-tag">{k}</span>)}
        </div>
      </div>

      <div className="jobsearcher-grid">
        {PLATFORMS.map(platform => (
          <div key={platform.short} className="js-card" style={{ '--card-color': platform.color }}>
            <div className="js-card-header">
              <span className="js-icon">{platform.icon}</span>
              <div className="js-card-info">
                <span className="js-name">{platform.name}</span>
                <span className="js-desc">{platform.description}</span>
              </div>
            </div>
            <p className="js-strength">{platform.strength}</p>
            <button className="js-search-btn" onClick={() => handleSearchOne(platform)}>
              <SearchIcon /> Search
            </button>
          </div>
        ))}
      </div>

      <button
        className={`js-search-all-btn ${searching ? 'loading' : ''} ${searchDone ? 'done' : ''}`}
        onClick={handleSearchAll}
        disabled={searching}
      >
        {searching ? <><SpinnerIcon /> Searching in background... </> :
         searchDone && searchMode === 'background' ? <><CheckIcon /> Done! {jobCount} jobs pulled from LinkedIn + Naukri </> :
         searchDone && searchMode === 'browser-fallback' ? <><GlobeIcon /> Opened 7 tabs in browser (LinkedIn blocked automated access) </> :
         <><GlobeIcon /> Search All Platforms — Background </>}
      </button>

      {searchDone && searchMode === 'browser-fallback' && (
        <p className="js-note" style={{ color: '#f59e0b', marginTop: 4 }}>
          💡 Tip: Save LinkedIn + Naukri credentials in "Account Login" — background search won't need browser tabs
        </p>
      )}

      {searchDone && searchMode === 'background' && (
        <p className="js-note" style={{ color: '#4ade80', marginTop: 4 }}>
          ✅ Jobs pulled directly from your LinkedIn + Naukri accounts and added to the app
        </p>
      )}
    </div>
  )
}
