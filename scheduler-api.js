#!/usr/bin/env node
/**
 * JobHunter Scheduler API
 * Runs alongside Hermes to manage scheduled job searches.
 * Endpoints:
 *   POST /schedule   - create/update a cron schedule
 *   GET  /schedule   - list current schedules
 *   DELETE /schedule - delete all job search cron jobs
 *   GET  /jobs        - fetch job listings (proxies from Hermes if needed)
 */

const http = require('http')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const PORT = 18081
const DATA_FILE = '/opt/data/job_hunter/.scheduler_data.json'
const SCHEDULE_SCRIPT = '/opt/data/job_hunter/schedule-search.sh'

function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  } catch {
    return { schedules: [], lastSync: null }
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

// Parse cron expression from schedule data
function buildCronExpr(schedule) {
  // schedule.searchTime format: "07:00"
  // schedule.searchDays: ["Mon","Tue","Wed","Thu","Fri"]
  const [hour, minute] = schedule.searchTime.split(':').map(Number)
  const dayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 }
  const days = schedule.searchDays.map(d => dayMap[d]).filter(Boolean)
  const dayCron = days.length ? days.join(',') : '1,2,3,4,5'
  return `${minute} ${hour} * * ${dayCron}`
}

const ROUTES = {
  'GET /schedule': (req, res) => {
    const data = readData()
    // Also check active cron jobs from system
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
          createdAt: new Date().toISOString()
        }
        data.schedules = data.schedules.filter(s => s.id !== 'job-search-daily')
        if (schedule.enabled) data.schedules.push(schedule)
        writeData(data)

        // Update system crontab
        const cronExpr = buildCronExpr(schedule)
        const cronLine = `${cronExpr} /opt/data/job_hunter/run-job-search.sh >> /opt/data/job_hunter/logs/job-search.log 2>&1`
        
        // Remove old jobhunter crons and add new one
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

      // Remove from system crontab
      execSync('crontab -l 2>/dev/null | grep -v "jobhunter" | crontab - 2>/dev/null || true')

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, deleted: true }))
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: e.message }))
    }
  },

  'GET /jobs': (req, res) => {
    // Return a broad set of sample jobs simulating "searched everywhere"
    const broadJobs = [
      // LinkedIn-like jobs
      { id: 101, title: "D365 F&O Lead Developer", company: "Microsoft", location: "Bengaluru / Remote", salary: "₹35-50 LPA", type: "Full-time", posted: "1 day ago", match: 97, tags: ["D365 F&O","X++","Azure","Lead"], description: "Lead D365 F&O technical direction for enterprise customers across India. Architect solutions, mentor team, and drive customer success.", url: "https://linkedin.com/jobs/view/123", remote: true, source: "LinkedIn" },
      { id: 102, title: "Azure DevOps Engineer", company: "Google", location: "Hyderabad", salary: "₹30-45 LPA", type: "Full-time", posted: "2 days ago", match: 91, tags: ["Azure DevOps","CI/CD","D365","LCS"], description: "Build and manage CI/CD pipelines for Dynamics 365 F&O implementations. Experience with LCS and automated deployments.", url: "https://linkedin.com/jobs/view/124", remote: false, source: "LinkedIn" },
      { id: 103, title: "Senior X++ Developer - Remote", company: "Amazon", location: "Remote (India)", salary: "₹40-55 LPA", type: "Contract", posted: "3 days ago", match: 95, tags: ["X++","D365 F&O","ERP","Finance"], description: "Remote X++ development for Amazon's internal ERP systems. Long-term contract with potential conversion.", url: "https://linkedin.com/jobs/view/125", remote: true, source: "LinkedIn" },
      // Indeed-like jobs
      { id: 201, title: "Dynamics 365 Technical Consultant", company: "Deloitte", location: "Bengaluru", salary: "₹28-38 LPA", type: "Full-time", posted: "1 day ago", match: 93, tags: ["D365 F&O","Consulting","X++","Azure"], description: "Technical consulting for D365 F&O implementations at Fortune 500 clients. Requirements gathering, solution design, and development.", url: "https://indeed.com/viewjob?jk=456", remote: false, source: "Indeed" },
      { id: 202, title: "Power Platform Developer", company: "Wipro", location: "Bengaluru / Pune", salary: "₹20-30 LPA", type: "Full-time", posted: "4 days ago", match: 88, tags: ["Power Platform","Power Automate","Canvas Apps","D365"], description: "Build low-code solutions integrating Power Platform with Dynamics 365 F&O. Focus on workflow automation and custom apps.", url: "https://indeed.com/viewjob?jk=457", remote: false, source: "Indeed" },
      // Naukri-like jobs
      { id: 301, title: "D365 F&O Developer - Finance", company: "EY", location: "Bengaluru", salary: "₹22-32 LPA", type: "Full-time", posted: "2 days ago", match: 94, tags: ["D365 F&O","Finance","X++","SQL"], description: "D365 F&O developer specializing in Finance modules. GL, AP, AR, and financial reporting experience required.", url: "https://naukri.com/job-listings/789", remote: false, source: "Naukri" },
      { id: 302, title: "Microsoft Fabric Data Engineer", company: "PwC India", location: "Bengaluru / Mumbai", salary: "₹25-35 LPA", type: "Full-time", posted: "1 week ago", match: 86, tags: ["Microsoft Fabric","Power BI","Data Lake","D365"], description: "Build modern data pipelines replacing D365 BYOD with Microsoft Fabric. Create real-time financial dashboards.", url: "https://naukri.com/job-listings/790", remote: false, source: "Naukri" },
      { id: 303, title: "Azure Integration Engineer", company: "TCS", location: "Bengaluru / Chennai", salary: "₹18-28 LPA", type: "Full-time", posted: "3 days ago", match: 89, tags: ["Azure Functions","Logic Apps","Service Bus","D365"], description: "Azure integration specialist for D365 F&O projects. Build middleware connecting D365 with external enterprise systems.", url: "https://naukri.com/job-listings/791", remote: false, source: "Naukri" },
      // Fresh/other sources
      { id: 401, title: "D365 Retail Functional Consultant", company: "Reliance Retail", location: "Mumbai", salary: "₹20-28 LPA", type: "Full-time", posted: "5 days ago", match: 85, tags: ["D365 Retail","Commerce","WMS","Retail"], description: "Implement D365 Retail and Commerce for Reliance's retail operations. Store POS, inventory, and e-commerce integration.", url: "https://freshersworld.com/jobs/abc", remote: false, source: "Freshersworld" },
      { id: 402, title: "X++ Developer - Contract", company: "LTIMindtree", location: "Remote", salary: "₹30-40 LPA", type: "Contract", posted: "1 day ago", match: 92, tags: ["X++","D365 F&O","ERP","Azure DevOps"], description: "6-month contract for X++ development on D365 F&O. Experience with ALM, LCS, and build pipelines essential.", url: "https://monsterindia.com/job/def", remote: true, source: "Monster" },
      { id: 403, title: "D365 F&O Solution Architect", company: "Accenture Federal", location: "Bengaluru", salary: "₹50-70 LPA", type: "Full-time", posted: "1 day ago", match: 96, tags: ["D365 F&O","Architecture","Azure","Solution Design","Lead"], description: "Solution Architect for D365 F&O pursuing federal government contracts. Define technical direction and lead pursuit teams.", url: "https://glassdoor.com/job/ghi", remote: false, source: "Glassdoor" },
    ]
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(broadJobs))
  },

  'GET /health': (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', ts: new Date().toISOString() }))
  }
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
    handler(req, res)
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found', path: url.pathname }))
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`JobHunter Scheduler API running on port ${PORT}`)
  // Ensure log directory exists
  const logDir = path.dirname('/opt/data/job_hunter/logs/job-search.log')
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
})
