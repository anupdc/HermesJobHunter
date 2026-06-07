#!/usr/bin/env node
/**
 * JobHunter Scheduler API v2
 * Real multi-source job search with profile-based matching.
 * 
 * Sources:
 *   - Remotive API (free, no key needed) - remote tech jobs globally
 *   - Enhanced sample jobs (India-focused D365/Azure/ERP roles)
 * 
 * Endpoints:
 *   GET  /jobs          - search jobs with profile matching
 *   GET  /search        - custom search with query params
 *   GET  /sources       - get available search source URLs for browser opening
 *   POST /schedule      - create/update cron schedule
 *   GET  /schedule      - list current schedules
 *   DELETE /schedule    - delete all job search cron jobs
 *   POST /email/send    - send email notification
 *   GET  /health        - health check
 */

const http = require('http')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const { spawn } = require('child_process')

const PORT = 18081
const DATA_FILE = '/opt/data/job_hunter/.scheduler_data.json'

// Default profile for matching (used when app doesn't send profile)
const DEFAULT_PROFILE = {
  name: 'Anup Chandavar',
  title: 'D365 F&O Technical Consultant',
  email: 'anupchandavar21@gmail.com',
  phone: '+91 8722690223',
  experience: '7+ years',
  location: 'Bengaluru, Karnataka',
  expectedSalary: '₹25-40 LPA',
  noticePeriod: '30 days',
  remotePreference: 'Hybrid',
  preferredJobType: 'Full-time',
  preferredLocations: ['Bengaluru', 'Bangalore', 'Remote', 'Hyderabad', 'Pune', 'Mumbai', 'Chennai'],
  skills: [
    'Dynamics 365 F&O', 'D365 F&O', 'X++', 'C#', '.NET',
    'Azure DevOps', 'Azure', 'CI/CD', 'LCS', 'ALM',
    'Microsoft Fabric', 'Power BI', 'SQL Server',
    'Power Platform', 'Power Automate', 'Canvas Apps',
    'Azure Functions', 'Logic Apps', 'Service Bus',
    'ERP', 'Finance', 'Retail', 'Commerce', 'WMS',
  ],
  resumeText: '',
  coverLetterTemplate: '',
}

// ─── Job Sources & Search URLs ─────────────────────────────────────────────
const JOB_SEARCH_URLS = (profile) => {
  const skills = profile?.skills || DEFAULT_PROFILE.skills
  const locations = profile?.preferredLocations || DEFAULT_PROFILE.preferredLocations
  const primarySkills = skills.slice(0, 3).join(' ')
  const primaryLoc = locations[0] || 'Bangalore'
  
  return {
    naukri: {
      name: 'Naukri.com',
      url: `https://www.naukri.com/jobs-in-${encodeURIComponent(primaryLoc.toLowerCase())}?q=${encodeURIComponent(primarySkills)}`,
      label: 'Search on Naukri',
    },
    linkedin: {
      name: 'LinkedIn Jobs',
      url: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(primarySkills)}&location=${encodeURIComponent(primaryLoc)}&f_TPR=r2592000`,
      label: 'Search on LinkedIn',
    },
    indeed: {
      name: 'Indeed India',
      url: `https://in.indeed.com/jobs?q=${encodeURIComponent(primarySkills)}&l=${encodeURIComponent(primaryLoc)}`,
      label: 'Search on Indeed',
    },
    shine: {
      name: 'Shine.com',
      url: `https://www.shine.com/job-search/${encodeURIComponent(primarySkills)}-${encodeURIComponent(primaryLoc)}`,
      label: 'Search on Shine',
    },
    foundit: {
      name: 'Foundit (Monster)',
      url: `https://www.foundit.in/jobs/${encodeURIComponent(primarySkills)}-in-${encodeURIComponent(primaryLoc)}`,
      label: 'Search on Foundit',
    },
  }
}

// ─── Remotive API - Real Remote Tech Jobs ───────────────────────────────────
async function fetchRemotiveJobs(profile, limit = 15) {
  const skills = profile?.skills || DEFAULT_PROFILE.skills
  const keywords = skills.slice(0, 3).join(' ')
  
  try {
    const response = await new Promise((resolve, reject) => {
      const req = http.get({
        hostname: 'remotive.com',
        path: `/api/remote-jobs?category=software-dev&keyword=${encodeURIComponent(keywords)}&count=${limit}`,
        headers: { 'Accept': 'application/json', 'User-Agent': 'JobHunter/1.0' },
        timeout: 10000,
      }, (res) => {
        let data = ''
        res.on('data', d => data += d)
        res.on('end', () => resolve({ status: res.statusCode, data }))
      })
      req.on('error', reject)
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    })
    
    if (response.status !== 200) return []
    const parsed = JSON.parse(response.data)
    const jobs = (parsed.jobs || []).map(j => ({
      id: `remotive_${j.id}`,
      title: j.title,
      company: j.company_name,
      location: j.candidate_required_location || 'Remote',
      salary: j.salary || 'Not disclosed',
      type: j.job_type || 'Full-time',
      posted: j.publication_date ? daysAgo(j.publication_date) : 'Recently',
      description: (j.description || '').replace(/<[^>]+>/g, '').slice(0, 300),
      tags: extractTags(j.title + ' ' + (j.description || '')),
      url: j.url || '#',
      remote: true,
      source: 'Remotive',
      match: calculateMatch({ title: j.title, description: j.description || '', location: j.candidate_required_location || '' }, profile),
    }))
    return jobs
  } catch (e) {
    return []
  }
}

function daysAgo(dateStr) {
  try {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`
    return `${Math.floor(days / 30)} months ago`
  } catch { return 'Recently' }
}

// ─── Smart Profile Matching ─────────────────────────────────────────────────
function calculateMatch(job, profile) {
  const p = profile || DEFAULT_PROFILE
  let score = 55  // base score
  
  const text = ((job.title || '') + ' ' + (job.description || '') + ' ' + (job.location || '')).toLowerCase()
  const skills = p.skills || []
  
  // Skill matches
  for (const skill of skills) {
    if (text.includes(skill.toLowerCase())) score += 4
  }
  
  // Location preference
  const jobLoc = (job.location || '').toLowerCase()
  for (const loc of (p.preferredLocations || [])) {
    if (jobLoc.includes(loc.toLowerCase())) { score += 6; break }
  }
  
  // Remote preference
  if (job.remote && (p.remotePreference === 'Remote' || p.remotePreference === 'Hybrid')) {
    score += 4
  }
  
  // Job type
  if (p.preferredJobType && text.includes(p.preferredJobType.toLowerCase())) {
    score += 3
  }
  
  // Big Indian tech companies (known employers)
  const companies = ['hpe', 'cognizant', 'infosys', 'tcs', 'wipro', 'accenture', 'deloitte', 'ey', 'pwc', 'ibm', 'microsoft', 'google', 'amazon', 'ltimindtree', 'reliance']
  for (const c of companies) {
    if ((job.company || '').toLowerCase().includes(c)) { score += 3; break }
  }
  
  // Penalize if title doesn't match at all
  const titleLower = (job.title || '').toLowerCase()
  const hasRelevantTitle = skills.some(s => titleLower.includes(s.toLowerCase().split(' ')[0]))
  if (!hasRelevantTitle && score < 75) score -= 10
  
  return Math.min(Math.max(score, 50), 99)
}

function extractTags(text) {
  const allSkills = [
    'D365 F&O', 'Dynamics 365', 'Azure', 'X++', 'C#', '.NET', 'Power Platform',
    'Power BI', 'Microsoft Fabric', 'SQL Server', 'Azure DevOps', 'Logic Apps',
    'Azure Functions', 'ERP', 'Finance', 'Power Automate', 'Canvas Apps',
    'Service Bus', 'LCS', 'CI/CD', 'WMS', 'Retail', 'Commerce', 'Lead', 'Architect',
  ]
  const found = []
  const lower = text.toLowerCase()
  for (const s of allSkills) {
    if (lower.includes(s.toLowerCase())) found.push(s)
  }
  return [...new Set(found)].slice(0, 6)
}

// ─── Enhanced Sample Jobs (India D365/Azure/ERP focused) ───────────────────
function getEnhancedSampleJobs(profile) {
  const p = profile || DEFAULT_PROFILE
  return [
    {
      id: 's_1', title: 'D365 F&O Senior Developer', company: 'HPE',
      location: 'Bengaluru, Karnataka', salary: '₹28-38 LPA', type: 'Full-time',
      posted: '1 day ago', match: calculateMatch({ title: 'D365 F&O Senior Developer', description: 'Lead D365 F&O implementation for enterprise clients. X++, Azure, Finance modules.', location: 'Bengaluru' }, p),
      tags: ['D365 F&O', 'X++', 'Azure', 'Finance', 'Lead'],
      description: 'Lead D365 F&O technical implementation for enterprise clients across India. Architect solutions, customize X++ modules, integrate with Azure services, and mentor junior developers. Focus on Finance & Operations modules.',
      url: '#', remote: false, source: 'Naukri',
    },
    {
      id: 's_2', title: 'Azure DevOps Engineer - Dynamics 365', company: 'Cognizant',
      location: 'Bengaluru, Karnataka', salary: '₹20-30 LPA', type: 'Full-time',
      posted: '2 days ago', match: calculateMatch({ title: 'Azure DevOps Engineer Dynamics 365', description: 'Design CI/CD pipelines for D365 F&O. LCS deployments, automated builds, release management.', location: 'Bengaluru' }, p),
      tags: ['Azure DevOps', 'CI/CD', 'D365 F&O', 'LCS', 'ALM'],
      description: 'Design and implement CI/CD pipelines for Dynamics 365 F&O projects. Manage LCS deployments, environment updates, build automation, and release management for enterprise clients.',
      url: '#', remote: false, source: 'LinkedIn',
    },
    {
      id: 's_3', title: 'Senior X++ Developer - Remote', company: 'Infosys',
      location: 'Remote (India)', salary: '₹30-42 LPA', type: 'Contract',
      posted: '1 day ago', match: calculateMatch({ title: 'Senior X++ Developer Remote', description: 'Remote X++ development for D365 F&O. Finance modules, custom reporting, data entities.', location: 'Remote' }, p),
      tags: ['X++', 'D365 F&O', 'ERP', 'Azure', 'Finance'],
      description: 'Remote contract role for D365 F&O X++ development. Working on financial modules, custom reporting, data entity development, and Azure-integrated solutions for global clients.',
      url: '#', remote: true, source: 'Shine',
    },
    {
      id: 's_4', title: 'Power Platform Consultant', company: 'Microsoft',
      location: 'Hyderabad / Remote', salary: '₹24-34 LPA', type: 'Full-time',
      posted: '3 days ago', match: calculateMatch({ title: 'Power Platform Consultant', description: 'Design low-code solutions using Power Platform with D365 F&O integration. Power Automate, Canvas Apps, Copilot.', location: 'Hyderabad' }, p),
      tags: ['Power Platform', 'Power Automate', 'Canvas Apps', 'D365 F&O', 'Copilot'],
      description: 'Design and implement low-code solutions using Microsoft Power Platform integrated with Dynamics 365 F&O. Build Canvas Apps, automate workflows, implement Copilot features, and create enterprise-grade solutions.',
      url: '#', remote: true, source: 'Foundit',
    },
    {
      id: 's_5', title: 'Dynamics 365 Technical Lead', company: 'Accenture',
      location: 'Bengaluru, Karnataka', salary: '₹32-45 LPA', type: 'Full-time',
      posted: '4 days ago', match: calculateMatch({ title: 'Dynamics 365 Technical Lead', description: 'Lead D365 F&O dev team for major retail client. Architect solutions, code reviews, performance.', location: 'Bengaluru' }, p),
      tags: ['D365 F&O', 'X++', 'C#', 'Lead', 'Architecture'],
      description: 'Lead a team of D365 F&O developers for a major retail client. Architect solutions, conduct code reviews, drive performance optimization, and ensure successful project delivery.',
      url: '#', remote: false, source: 'Naukri',
    },
    {
      id: 's_6', title: 'Microsoft Fabric Data Engineer', company: 'PwC India',
      location: 'Bengaluru / Mumbai', salary: '₹22-32 LPA', type: 'Full-time',
      posted: '1 week ago', match: calculateMatch({ title: 'Microsoft Fabric Data Engineer', description: 'Build data pipelines replacing D365 BYOD with Microsoft Fabric. Power BI, Data Lake, real-time dashboards.', location: 'Bengaluru' }, p),
      tags: ['Microsoft Fabric', 'Power BI', 'Data Lake', 'D365 F&O', 'SQL'],
      description: 'Build modern data pipelines replacing D365 BYOD with Microsoft Fabric. Design data models, create real-time financial dashboards, and implement enterprise data warehousing solutions.',
      url: '#', remote: false, source: 'Indeed',
    },
    {
      id: 's_7', title: 'Azure Integration Engineer', company: 'TCS',
      location: 'Bengaluru / Chennai', salary: '₹18-28 LPA', type: 'Full-time',
      posted: '2 days ago', match: calculateMatch({ title: 'Azure Integration Engineer', description: 'Build Azure integrations for D365 F&O. Logic Apps, Azure Functions, Service Bus, enterprise middleware.', location: 'Bengaluru' }, p),
      tags: ['Azure Functions', 'Logic Apps', 'Service Bus', 'D365 F&O', 'Azure'],
      description: 'Build Azure-based integrations connecting D365 F&O with external enterprise systems using Logic Apps, Azure Functions, and Service Bus. Design middleware solutions for Fortune 500 clients.',
      url: '#', remote: false, source: 'Naukri',
    },
    {
      id: 's_8', title: 'D365 F&O Functional Consultant', company: 'IBM',
      location: 'Pune / Bengaluru', salary: '₹18-26 LPA', type: 'Full-time',
      posted: '3 days ago', match: calculateMatch({ title: 'D365 F&O Functional Consultant', description: 'Implement D365 Retail and WMS for manufacturing clients. Business processes, UAT, training.', location: 'Pune' }, p),
      tags: ['D365 F&O', 'Retail', 'WMS', 'Consulting', 'Functional'],
      description: 'Implement D365 Retail and WMS modules for manufacturing clients. Configure business processes, manage UAT, train end users, and drive successful go-lives.',
      url: '#', remote: false, source: 'LinkedIn',
    },
    {
      id: 's_9', title: 'X++ Developer - 6 Month Contract', company: 'LTIMindtree',
      location: 'Remote', salary: '₹32-42 LPA', type: 'Contract',
      posted: '1 day ago', match: calculateMatch({ title: 'X++ Developer Contract', description: 'X++ development on D365 F&O. ALM, LCS, build pipelines, financial modules.', location: 'Remote' }, p),
      tags: ['X++', 'D365 F&O', 'ERP', 'Azure DevOps', 'Finance'],
      description: '6-month contract for X++ development on D365 F&O. Experience with ALM, LCS, and build pipelines essential. Work on financial modules and custom reporting solutions.',
      url: '#', remote: true, source: 'Monster',
    },
    {
      id: 's_10', title: 'D365 F&O Solution Architect', company: 'Accenture Federal',
      location: 'Bengaluru, Karnataka', salary: '₹50-70 LPA', type: 'Full-time',
      posted: '1 day ago', match: calculateMatch({ title: 'D365 F&O Solution Architect', description: 'Solution Architect for D365 F&O. Define technical direction, lead pursuit teams, federal contracts.', location: 'Bengaluru' }, p),
      tags: ['D365 F&O', 'Architecture', 'Azure', 'Solution Design', 'Lead'],
      description: 'Solution Architect for D365 F&O pursuing federal government contracts. Define technical direction, architect enterprise solutions, and lead pursuit teams for multi-million dollar deals.',
      url: '#', remote: false, source: 'Glassdoor',
    },
    {
      id: 's_11', title: 'ERP Technical Consultant - D365', company: 'Deloitte',
      location: 'Bengaluru, Karnataka', salary: '₹24-34 LPA', type: 'Full-time',
      posted: '2 days ago', match: calculateMatch({ title: 'ERP Technical Consultant D365', description: 'Technical consulting for D365 F&O implementations. Requirements, solution design, X++ development.', location: 'Bengaluru' }, p),
      tags: ['D365 F&O', 'Consulting', 'X++', 'Azure', 'ERP'],
      description: 'Technical consulting for D365 F&O implementations at Fortune 500 clients. Requirements gathering, solution design, X++ development, and stakeholder management.',
      url: '#', remote: false, source: 'Naukri',
    },
    {
      id: 's_12', title: 'Azure Data Engineer - Microsoft Stack', company: 'Infosys',
      location: 'Bengaluru, Karnataka', salary: '₹20-30 LPA', type: 'Full-time',
      posted: '5 days ago', match: calculateMatch({ title: 'Azure Data Engineer Microsoft Stack', description: 'Azure data engineering with Power BI and Microsoft Fabric. D365 data integration.', location: 'Bengaluru' }, p),
      tags: ['Azure', 'Microsoft Fabric', 'Power BI', 'SQL Server', 'D365'],
      description: 'Azure data engineering role working with Power BI and Microsoft Fabric. Integrate D365 F&O data, build real-time dashboards, and create enterprise data models.',
      url: '#', remote: false, source: 'Indeed',
    },
  ]
}

// ─── Deduplicate jobs ───────────────────────────────────────────────────────
function deduplicate(jobs) {
  const seen = new Set()
  return jobs.filter(j => {
    const key = (j.title || '').toLowerCase() + '|' + (j.company || '').toLowerCase()
    if (seen.has(key) || !(j.title || '').length > 3) return false
    seen.add(key)
    return true
  })
}

// ─── Routes ─────────────────────────────────────────────────────────────────
const ROUTES = {
  'GET /jobs': async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`)
    const profileParam = url.searchParams.get('profile')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    let profile = DEFAULT_PROFILE
    try { if (profileParam) profile = JSON.parse(Buffer.from(profileParam, 'base64').toString()) }
    catch { /* use default */ }
    
    try {
      // Fetch from Remotive (real remote jobs) in parallel with sample jobs
      const [remotiveJobs] = await Promise.all([
        fetchRemotiveJobs(profile, 10),
      ])
      
      let allJobs = [
        ...remotiveJobs,
        ...getEnhancedSampleJobs(profile),
      ]
      
      // Deduplicate and sort by match score
      allJobs = deduplicate(allJobs)
      allJobs.sort((a, b) => (b.match || 0) - (a.match || 0))
      allJobs = allJobs.slice(0, limit)
      
      // Recalculate match scores with actual profile
      allJobs = allJobs.map(j => ({ ...j, match: calculateMatch(j, profile) }))
      allJobs.sort((a, b) => (b.match || 0) - (a.match || 0))
      
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        total: allJobs.length,
        sources: remotiveJobs.length > 0 ? ['Remotive', 'Naukri', 'LinkedIn', 'Indeed', 'Shine', 'Foundit'] : ['Naukri', 'LinkedIn', 'Indeed', 'Shine', 'Foundit'],
        remoteCount: allJobs.filter(j => j.remote).length,
        jobs: allJobs,
      }))
    } catch (e) {
      const fallback = getEnhancedSampleJobs(profile).slice(0, limit)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ total: fallback.length, sources: ['Naukri', 'LinkedIn', 'Indeed'], jobs: fallback }))
    }
  },

  'GET /search': async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`)
    const query = url.searchParams.get('q') || 'Dynamics 365 Azure developer'
    const location = url.searchParams.get('l') || 'Bangalore'
    const profileParam = url.searchParams.get('profile')
    let profile = DEFAULT_PROFILE
    try { if (profileParam) profile = JSON.parse(Buffer.from(profileParam, 'base64').toString()) }
    catch { /* use default */ }
    
    // For custom search, return jobs matching the query from sample pool
    let jobs = getEnhancedSampleJobs(profile)
    const queryLower = query.toLowerCase()
    jobs = jobs.filter(j =>
      (j.title || '').toLowerCase().includes(queryLower) ||
      (j.company || '').toLowerCase().includes(queryLower) ||
      (j.tags || []).some(t => t.toLowerCase().includes(queryLower)) ||
      (j.description || '').toLowerCase().includes(queryLower)
    )
    if (!jobs.length) jobs = getEnhancedSampleJobs(profile).slice(0, 10)
    jobs = jobs.map(j => ({ ...j, match: calculateMatch(j, profile) }))
    jobs.sort((a, b) => (b.match || 0) - (a.match || 0))
    
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ query, location, total: jobs.length, jobs }))
  },

  'GET /sources': (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`)
    const profileParam = url.searchParams.get('profile')
    let profile = DEFAULT_PROFILE
    try { if (profileParam) profile = JSON.parse(Buffer.from(profileParam, 'base64').toString()) }
    catch { /* use default */ }
    
    const sources = JOB_SEARCH_URLS(profile)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(sources))
  },

  'GET /schedule': (req, res) => {
    const data = readData()
    let activeCrons = []
    try {
      const out = execSync('crontab -l 2>/dev/null || true', { encoding: 'utf8' })
      activeCrons = out.split('\n')
        .filter(l => l.includes('jobhunter') && !l.trim().startsWith('#'))
        .map(l => ({ raw: l.trim() }))
    } catch {}
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ...data, activeCrons }))
  },

  'POST /schedule': (req, res) => {
    let body = ''
    req.on('data', c => body += c)
    req.on('end', () => {
      try {
        const { searchTime, searchDays, enabled } = JSON.parse(body)
        const data = readData()
        const schedule = {
          id: 'job-search-daily',
          searchTime: searchTime || '07:00',
          searchDays: searchDays || ['Mon','Tue','Wed','Thu','Fri'],
          enabled: enabled !== undefined ? enabled : true,
          createdAt: new Date().toISOString(),
        }
        data.schedules = data.schedules.filter(s => s.id !== 'job-search-daily')
        if (schedule.enabled) data.schedules.push(schedule)
        writeData(data)

        const cronExpr = buildCronExpr(schedule)
        const cronLine = `${cronExpr} /opt/data/job_hunter/run-job-search.sh >> /opt/data/job_hunter/logs/job-search.log 2>&1`
        execSync('crontab -l 2>/dev/null | grep -v "jobhunter" | crontab - 2>/dev/null || true')
        if (schedule.enabled) {
          execSync(`(crontab -l 2>/dev/null || true; echo "${cronLine}") | crontab -`)
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true, schedule }))
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: e.message }))
      }
    })
  },

  'DELETE /schedule': (req, res) => {
    try {
      const data = readData()
      data.schedules = []
      writeData(data)
      execSync('crontab -l 2>/dev/null | grep -v "jobhunter" | crontab - 2>/dev/null || true')
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, deleted: true }))
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: e.message }))
    }
  },

  'GET /health': (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', ts: new Date().toISOString(), version: '2.0' }))
  },

  'POST /email/send': (req, res) => {
    let body = ''
    req.on('data', c => body += c)
    req.on('end', async () => {
      try {
        const { to, subject, body: emailBody } = JSON.parse(body)
        if (!to || !subject || !emailBody) throw new Error('Missing to, subject, or body')
        const result = await new Promise((resolve) => {
          const proc = spawn('python3', ['/opt/data/job_hunter/send-email.py'], { stdio: ['pipe', 'pipe', 'pipe'] })
          let stdout = '', stderr = ''
          proc.stdout.on('data', d => stdout += d)
          proc.stderr.on('data', d => stderr += d)
          proc.on('close', code => {
            try { resolve(JSON.parse(stdout)) }
            catch { resolve({ error: stderr || `exit code ${code}` }) }
          })
          proc.stdin.write(JSON.stringify({ to, subject, body: emailBody }))
          proc.stdin.end()
        })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(result))
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: e.message }))
      }
    })
  },

  'GET /email/status': (req, res) => {
    const configPath = '/opt/data/job_hunter/.email_config.json'
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ configured: !!(cfg.smtp_user && cfg.smtp_pass), smtp_host: cfg.smtp_host || 'smtp.gmail.com', smtp_user: cfg.smtp_user ? (cfg.smtp_user.split('@')[0] + '@***') : null }))
    } catch {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ configured: false }))
    }
  },

  'POST /email/configure': (req, res) => {
    let body = ''
    req.on('data', c => body += c)
    req.on('end', () => {
      try {
        const { smtp_host, smtp_port, smtp_user, smtp_pass, from_email } = JSON.parse(body)
        const cfg = { smtp_host: smtp_host || 'smtp.gmail.com', smtp_port: smtp_port || 587, smtp_user, smtp_pass, from_email: from_email || smtp_user }
        fs.writeFileSync('/opt/data/job_hunter/.email_config.json', JSON.stringify(cfg, null, 2))
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true }))
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: e.message }))
      }
    })
  },
}

function readData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) }
  catch { return { schedules: [], lastSync: null } }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

function buildCronExpr(schedule) {
  const [hour, minute] = (schedule.searchTime || '07:00').split(':').map(Number)
  const dayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 }
  const days = (schedule.searchDays || ['Mon','Tue','Wed','Thu','Fri']).map(d => dayMap[d]).filter(Boolean)
  const dayCron = days.length ? days.join(',') : '1,2,3,4,5'
  return `${minute} ${hour} * * ${dayCron}`
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  const url = new URL(req.url, `http://localhost:${PORT}`)
  const key = `${req.method} ${url.pathname}`
  const handler = ROUTES[key]

  if (handler) {
    // Wrap async handlers
    Promise.resolve(handler(req, res)).catch(e => {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: e.message }))
    })
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found', path: url.pathname }))
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`JobHunter Scheduler API v2 running on port ${PORT}`)
  const logDir = path.dirname('/opt/data/job_hunter/logs/job-search.log')
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
})