const { app, BrowserWindow, shell, ipcMain, session } = require('electron')
const path = require('path')
const https = require('https')
const http = require('http')

let mainWindow = null
let searchWindow = null

function log(level, ...args) {
  const ts = new Date().toISOString()
  console[level](`[JobHunter][${ts}]`, ...args)
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0f172a',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: false,
    },
    autoHideMenuBar: true,
    show: false,
  })

  const indexPath = path.join(__dirname, '..', 'dist', 'index.html')
  const indexUrl = `file://${indexPath.replace(/\\/g, '/')}`
  log('info', 'Loading URL:', indexUrl)

  mainWindow.loadURL(indexUrl).catch(err => {
    log('error', 'loadURL failed:', err.message || err)
  })

  mainWindow.once('ready-to-show', () => {
    log('info', 'ready-to-show fired')
    mainWindow.show()
  })

  mainWindow.webContents.on('crashed', () => log('error', 'Renderer crashed'))
  mainWindow.webContents.on('render-process-gone', (e, details) => {
    log('error', 'Render process gone:', details.reason)
  })
  mainWindow.webContents.on('console-message', (e, level, msg) => {
    log('info', `[Renderer console][${level}]`, msg)
  })
  mainWindow.webContents.on('did-fail-load', (e, errCode, errDesc) => {
    log('warn', `did-fail-load: ${errCode} - ${errDesc}`)
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ─── Platform search configs ─────────────────────────────────────────────────
const PLATFORM_CONFIGS = {
  naukri: {
    name: 'Naukri',
    urlTemplate: (q, loc) =>
      `https://www.naukri.com/jobs-in-bangalore?q=${encodeURIComponent(q)}`,
    searchKeyword: (q) => q.split(' ')[0],
    cssSelector: '.jobTuple',
    titleSel: '.title',
    companySel: '.company',
    locationSel: '.location',
    salarySel: '.salary',
    metaSel: '.meta',
  },
  linkedin: {
    name: 'LinkedIn',
    urlTemplate: (q, loc) =>
      `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(q)}&location=${encodeURIComponent(loc || 'Bangalore')}&f_TPR=r604800&sortBy=DD`,
    cssSelector: '.jobs-search-results__list-item',
    titleSel: '.job-card-list__title',
    companySel: '.job-card-container__company-name',
    locationSel: '.job-card-container__metadata-item',
  },
  indeed: {
    name: 'Indeed',
    urlTemplate: (q, loc) =>
      `https://in.indeed.com/jobs?q=${encodeURIComponent(q)}&l=${encodeURIComponent(loc || 'Bangalore')}&fromage=7&sort=date`,
    cssSelector: '.jobsearch-ResultsResults',
    titleSel: '.jobTitle',
    companySel: '.companyName',
    locationSel: '.companyLocation',
  },
  shine: {
    name: 'Shine',
    urlTemplate: (q, loc) =>
      `https://www.shine.com/job-search/q-${encodeURIComponent(q.split(' ').join('-'))}-in-bangalore/`,
    cssSelector: '.job_c_click',
    titleSel: 'a.cls_flex', // approximate
  },
}

// ─── HTTP fetch (skip CDN, hit search pages) ────────────────────────────────
function fetchUrl(url, timeout = 12000) {
  return new Promise((resolve) => {
    const proto = url.startsWith('https') ? https : http
    let data = ''
    const req = proto.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-IN,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout,
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(fetchUrl(res.headers.location, timeout))
        return
      }
      res.on('data', d => { data += d })
      res.on('end', () => resolve(data))
    })
    req.on('error', () => resolve(''))
    req.on('timeout', () => { req.destroy(); resolve('') })
  })
}

// ─── Parse jobs from HTML ────────────────────────────────────────────────
function parseJobs(html, platform) {
  if (!html || html.length < 200) return []
  const jobs = []
  try {
    if (platform === 'naukri') {
      // Naukri: extract from search results page
      const tuples = html.match(/<article[^>]*class="[^"]*jobTuple[^"]*"[^>]*>([\s\S]*?)<\/article>/gi) || []
      for (const t of tuples.slice(0, 20)) {
        const title = (t.match(/title="([^"]*)"/) || [])[1] ||
          (t.match(/class="[^"]*title[^"]*"[^>]*>([^<]*)/) || [])[1] || 'D365 Developer'
        const company = (t.match(/<a[^>]*class="[^"]*company[^"]*"[^>]*>([^<]*)/) || [])[1] || ''
        const exp = (t.match(/class="[^"]*experience[^"]*"[^>]*>([^<]*)/) || [])[1] || ''
        const salary = (t.match(/class="[^"]*salary[^"]*"[^>]*>([^<]*)/) || [])[1] || ''
        if (title) jobs.push({ title: title.trim(), company: company.trim(), location: 'Bangalore, KA', salary: salary.trim() || '₹ As per profile', source: 'Naukri' })
      }
    } else if (platform === 'linkedin') {
      // LinkedIn jobs
      const cards = html.match(/<div[^>]*data-occludable-job-id[^>]*>([\s\S]*?)<\/div>/gi) || []
      for (const c of cards.slice(0, 20)) {
        const title = (c.match(/<a[^>]*class="[^"]*job-card-list__title[^"]*"[^>]*>([^<]*)/) || [])[1] || 'Job Title'
        const company = (c.match(/class="[^"]*job-card-container__company-name[^"]*"[^>]*>([^<]*)/) || [])[1] || ''
        const loc = (c.match(/class="[^"]*job-card-container__metadata-item[^"]*"[^>]*>([^<]*)/) || [])[1] || 'Bangalore'
        if (title) jobs.push({ title: title.trim(), company: company.trim(), location: loc.trim(), salary: '', source: 'LinkedIn' })
      }
    } else if (platform === 'indeed') {
      // Indeed India
      const cards = html.match(/<div[^>]*class="[^"]*jobCard[^"]*"[^>]*>([\s\S]*?)<\/div>/gi) || []
      for (const c of cards.slice(0, 20)) {
        const title = (c.match(/<a[^>]*class="[^"]*jobTitle[^"]*"[^>]*>([^<]*)/) || [])[1] || ''
        const company = (c.match(/class="[^"]*companyName[^"]*"[^>]*>([^<]*)/) || [])[1] || ''
        const loc = (c.match(/class="[^"]*companyLocation[^"]*"[^>]*>([^<]*)/) || [])[1] || 'Bangalore'
        if (title) jobs.push({ title: title.trim(), company: company.trim(), location: loc.trim(), salary: '', source: 'Indeed' })
      }
    }
  } catch (e) {
    log('warn', 'Parse error for', platform, e.message)
  }
  return jobs
}

// ─── Search all platforms via HTTP ─────────────────────────────────────────
async function searchAllPlatformsHTTP(keywords, location) {
  const query = keywords.join(' ')
  const loc = location || 'Bangalore'
  log('info', 'Searching platforms for:', query)
  const allJobs = []
  const delay = ms => new Promise(r => setTimeout(r, ms))

  for (const [key, cfg] of Object.entries(PLATFORM_CONFIGS)) {
    try {
      const url = cfg.urlTemplate(query, loc)
      log('info', `Fetching ${cfg.name}: ${url}`)
      const html = await fetchUrl(url, 12000)
      const jobs = parseJobs(html, key)
      log('info', `${cfg.name}: found ${jobs.length} jobs`)
      allJobs.push(...jobs)
      await delay(2000)
    } catch (e) {
      log('warn', `${cfg.name} failed:`, e.message)
    }
  }
  return allJobs
}

// ─── IPC Handlers ───────────────────────────────────────────────────────────
ipcMain.handle('search-jobs', async (event, { keywords, location }) => {
  log('info', 'IPC search-jobs received')
  const jobs = await searchAllPlatformsHTTP(keywords, location)
  return jobs
})

ipcMain.handle('open-search-urls', async (event, urls) => {
  log('info', 'Opening URLs in browser:', urls.length)
  for (const url of urls) {
    shell.openExternal(url)
    await new Promise(r => setTimeout(r, 500))
  }
  return true
})

// ─── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  log('info', 'App ready')
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
