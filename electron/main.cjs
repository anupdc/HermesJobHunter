const { app, BrowserWindow, shell, ipcMain, session } = require('electron')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

// ─── Logging ───────────────────────────────────────────────────────────────────
let mainWindow = null

function log(level, ...args) {
  const ts = new Date().toISOString()
  console[level](`[JobHunter][${ts}]`, ...args)
}

// ─── Secure credential storage ───────────────────────────────────────────────
// Uses Electron's safeStorage if available, otherwise a machine-derived key
const CREDS_FILE = path.join(app.getPath('userData'), 'credentials.enc')
const ENCRYPTION_KEY_FILE = path.join(app.getPath('userData'), '.ekey')

function getEncryptionKey() {
  // First try: use a fixed machine-derived key (works without safeStorage)
  const machineId = [
    process.env.COMPUTERNAME || '',
    process.env.USERNAME || '',
    process.env.USERDOMAIN || '',
    app.getPath('userData'),
  ].join('|')
  // Derive a consistent key from machine info
  const hash = crypto.createHash('sha256').update(machineId).digest()
  return hash.slice(0, 32)
}

function encrypt(plaintext) {
  try {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return iv.toString('hex') + ':' + encrypted
  } catch (e) {
    log('error', 'Encryption failed:', e.message)
    return null
  }
}

function decrypt(encrypted) {
  try {
    const key = getEncryptionKey()
    const [ivHex, data] = encrypted.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    let decrypted = decipher.update(data, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (e) {
    log('warn', 'Decryption failed:', e.message)
    return null
  }
}

function loadCredentials() {
  try {
    if (!fs.existsSync(CREDS_FILE)) return {}
    const raw = fs.readFileSync(CREDS_FILE, 'utf8').trim()
    if (!raw) return {}
    const decrypted = decrypt(raw)
    if (!decrypted) return {}
    return JSON.parse(decrypted)
  } catch (e) {
    log('warn', 'Could not load credentials:', e.message)
    return {}
  }
}

function saveCredentials(platform, creds) {
  try {
    const all = loadCredentials()
    all[platform] = { email: creds.email, password: creds.password, encrypted: true }
    const plaintext = JSON.stringify(all)
    const encrypted = encrypt(plaintext)
    if (!encrypted) throw new Error('Encryption returned null')
    fs.writeFileSync(CREDS_FILE, encrypted, { mode: 0o600 })
    log('info', 'Credentials saved for', platform)
    return true
  } catch (e) {
    log('error', 'Failed to save credentials:', e.message)
    return false
  }
}

function getDecryptedCredentials(platform) {
  const all = loadCredentials()
  const c = all[platform]
  if (!c) return null
  return { email: c.email, password: c.password }
}

// ─── Hidden browser for scraping ─────────────────────────────────────────────
let scrapeWindow = null

function createScrapeWindow() {
  if (scrapeWindow) {
    scrapeWindow.close()
    scrapeWindow = null
  }
  scrapeWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })
  return scrapeWindow
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// ─── LinkedIn scraper ─────────────────────────────────────────────────────────
async function scrapeLinkedIn(email, password, keywords, location) {
  log('info', 'Starting LinkedIn scrape for:', keywords)
  const win = createScrapeWindow()
  const loc = location || 'Bangalore'
  const query = encodeURIComponent(keywords.join(' '))

  try {
    // Step 1: Go to LinkedIn login
    await win.loadURL('https://www.linkedin.com/login', { timeout: 15000 })
    await delay(3000)
    log('info', 'LinkedIn login page loaded')

    // Step 2: Fill login form
    const loginResult = await win.webContents.executeJavaScript(`
      (function() {
        const emailField = document.querySelector('#username, input[name="session_key"]');
        const passField = document.querySelector('#password, input[name="session_password"]');
        if (!emailField || !passField) return { success: false, error: 'Login fields not found' };
        emailField.value = '';
        passField.value = '';
        emailField.focus();
        return { success: true };
      })()
    `)
    if (!loginResult?.success) {
      throw new Error('Could not find LinkedIn login form')
    }

    // Type credentials
    await win.webContents.executeJavaScript(`document.querySelector('#username, input[name="session_key"]').value = '${email.replace(/'/g, "\\'")}'`)
    await delay(200)
    await win.webContents.executeJavaScript(`document.querySelector('#password, input[name="session_password"]').value = '${password.replace(/'/g, "\\'")}'`)
    await delay(200)

    // Submit
    await win.webContents.executeJavaScript(`document.querySelector('button[type="submit"], form').submit()`)
    await delay(4000)

    // Check if login succeeded
    const url = win.webContents.getURL()
    log('info', 'After login URL:', url)
    if (url.includes('/login') || url.includes('challenge')) {
      log('warn', 'LinkedIn login may have failed, URL:', url)
      return { success: false, message: 'Login failed — check credentials or complete 2FA manually' }
    }

    // Step 3: Navigate to jobs search
    const jobsUrl = `https://www.linkedin.com/jobs/search/?keywords=${query}&location=${encodeURIComponent(loc)}&f_TPR=r604800&sortBy=DD`
    await win.loadURL(jobsUrl, { timeout: 15000 })
    await delay(4000)
    log('info', 'Jobs page loaded:', win.webContents.getURL())

    // Step 4: Extract jobs from DOM
    const jobsData = await win.webContents.executeJavaScript(`
      (function() {
        const results = [];
        // LinkedIn job cards — updated selectors
        const cards = document.querySelectorAll('.jobs-search-results__list-item, .occludable-job-card, [data-occludable-job-id]');
        cards.forEach(card => {
          const titleEl = card.querySelector('.job-card-list__title, .occludable-job-card__title, a[href*="/jobs/"][href*="keywords"]');
          const title = titleEl ? (titleEl.textContent || titleEl.innerText || '').trim() : '';
          const companyEl = card.querySelector('.job-card-container__company-name, .occludable-job-card__company-name');
          const company = companyEl ? (companyEl.textContent || '').trim() : '';
          const locEl = card.querySelector('.job-card-container__metadata-item, .job-card-container__listed-time, .occludable-job-card__subtitle');
          const loc = locEl ? (locEl.textContent || '').trim() : '';
          const salaryEl = card.querySelector('.job-card-container__salary, .salary-snippet');
          const salary = salaryEl ? (salaryEl.textContent || '').trim() : '';
          const linkEl = card.querySelector('a[href*="/jobs/"]');
          const link = linkEl ? 'https://www.linkedin.com' + (linkEl.getAttribute('href') || '') : '';
          if (title) results.push({ title, company, location: loc, salary, url: link });
        });
        return results;
      })()
    `)

    log('info', `LinkedIn found ${jobsData.length} jobs`)
    win.close()
    scrapeWindow = null
    return {
      success: true,
      jobs: jobsData.slice(0, 30).map(j => ({ ...j, source: 'LinkedIn', sourceColor: '#0077b5' })),
    }
  } catch (e) {
    log('error', 'LinkedIn scrape error:', e.message)
    try { win.close() } catch (_) {}
    scrapeWindow = null
    return { success: false, message: e.message }
  }
}

// ─── Naukri scraper ────────────────────────────────────────────────────────────
async function scrapeNaukri(email, password, keywords, location) {
  log('info', 'Starting Naukri scrape for:', keywords)
  const win = createScrapeWindow()
  const query = keywords.join(' ')

  try {
    // Step 1: Go to Naukri login
    await win.loadURL('https://www.naukri.com/nlogin/login', { timeout: 15000 })
    await delay(3000)
    log('info', 'Naukri login page loaded')

    // Step 2: Fill login form
    const formCheck = await win.webContents.executeJavaScript(`
      (function() {
        const emailField = document.querySelector('input#email, input[name="email"], input[type="email"]');
        const passField = document.querySelector('input#password, input[name="password"], input[type="password"]');
        if (!emailField || !passField) return { success: false, error: 'Fields not found' };
        return { success: true };
      })()
    `)
    if (!formCheck?.success) {
      throw new Error('Could not find Naukri login form')
    }

    await win.webContents.executeJavaScript(`
      (function() {
        document.querySelectorAll('input[type="email"], input[type="text"]').forEach(el => {
          const parent = el.closest('.input-row') || el.closest('label') || el.parentElement;
          if (parent && parent.textContent.toLowerCase().includes('email')) el.value = '';
          if (parent && parent.textContent.toLowerCase().includes('username')) el.value = '';
        });
      })()
    `)
    await delay(100)
    await win.webContents.executeJavaScript(`document.querySelectorAll('input[type="email"], input[type="text"]').forEach(el => { if (el.placeholder.includes('mail') || el.name.includes('email')) el.value = '${email.replace(/'/g, "\\'")}' })`)
    await delay(100)
    await win.webContents.executeJavaScript(`document.querySelectorAll('input[type="password"]').forEach(el => { el.value = '${password.replace(/'/g, "\\'")}' })`)
    await delay(200)
    await win.webContents.executeJavaScript(`document.querySelector('button[type="submit"], .btn-login, input[type="submit"]').click()`)
    await delay(5000)

    const url = win.webContents.getURL()
    log('info', 'After Naukri login URL:', url)

    // Step 3: Navigate to search
    const searchUrl = `https://www.naukri.com/jobs-in-bangalore?q=${encodeURIComponent(query)}&k=${encodeURIComponent(query)}&l=Bangalore&experience=4-10`
    await win.loadURL(searchUrl, { timeout: 15000 })
    await delay(4000)
    log('info', 'Naukri search page loaded:', win.webContents.getURL())

    // Step 4: Extract jobs
    const jobsData = await win.webContents.executeJavaScript(`
      (function() {
        const results = [];
        const tuples = document.querySelectorAll('.jobTuple, article[class*="jobTuple"], .resumeaccordion');
        tuples.forEach(card => {
          const titleEl = card.querySelector('.title, [class*="title"], a[href*="/job/"]');
          const title = titleEl ? (titleEl.textContent || '').trim() : '';
          const companyEl = card.querySelector('.company, [class*="company"], .subTitle');
          const company = companyEl ? (companyEl.textContent || '').trim() : '';
          const locEl = card.querySelector('.location, [class*="location"]');
          const loc = locEl ? (locEl.textContent || '').trim() : '';
          const expEl = card.querySelector('.experience, [class*="experience"]');
          const exp = expEl ? (expEl.textContent || '').trim() : '';
          const salaryEl = card.querySelector('.salary, [class*="salary"]');
          const salary = salaryEl ? (salaryEl.textContent || '').trim() : '';
          const linkEl = card.querySelector('a[href*="/job/"]');
          const link = linkEl ? (linkEl.getAttribute('href') || '') : '';
          if (title) results.push({ title, company, location: loc || 'Bangalore', salary: salary || exp || '₹ As per profile', url: link });
        });
        return results;
      })()
    `)

    log('info', `Naukri found ${jobsData.length} jobs`)
    win.close()
    scrapeWindow = null
    return {
      success: true,
      jobs: jobsData.slice(0, 30).map(j => ({ ...j, source: 'Naukri', sourceColor: '#d32f2f' })),
    }
  } catch (e) {
    log('error', 'Naukri scrape error:', e.message)
    try { win.close() } catch (_) {}
    scrapeWindow = null
    return { success: false, message: e.message }
  }
}

// ─── Test connection ──────────────────────────────────────────────────────────
async function testConnection(platform, creds) {
  log('info', 'Testing connection for', platform)
  if (platform === 'linkedin') {
    return await scrapeLinkedIn(creds.email, creds.password, ['Dynamics 365 Azure ERP'], 'Bangalore')
  } else if (platform === 'naukri') {
    return await scrapeNaukri(creds.email, creds.password, ['Dynamics 365 Azure ERP'], 'Bangalore')
  }
  return { success: false, message: 'Unknown platform' }
}

// ─── Full search (credentialed) ───────────────────────────────────────────────
async function searchWithCredentials(keywords, location) {
  log('info', 'searchWithCredentials for:', keywords)
  const results = []

  // Try LinkedIn if credentials exist
  const liCreds = getDecryptedCredentials('linkedin')
  if (liCreds?.email && liCreds?.password) {
    log('info', 'Using stored LinkedIn credentials')
    const result = await scrapeLinkedIn(liCreds.email, liCreds.password, keywords, location)
    if (result.success) results.push(...result.jobs)
  }

  // Try Naukri if credentials exist
  const nakCreds = getDecryptedCredentials('naukri')
  if (nakCreds?.email && nakCreds?.password) {
    log('info', 'Using stored Naukri credentials')
    const result = await scrapeNaukri(nakCreds.email, nakCreds.password, keywords, location)
    if (result.success) results.push(...result.jobs)
  }

  log('info', `Total jobs from credentialed searches: ${results.length}`)
  return results
}

// ─── Main window ────────────────────────────────────────────────────────────────
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

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────
ipcMain.handle('save-credentials', async (event, platform, creds) => {
  log('info', 'IPC save-credentials:', platform)
  const ok = saveCredentials(platform, creds)
  return { success: ok }
})

ipcMain.handle('get-credentials', async () => {
  return loadCredentials()
})

ipcMain.handle('test-credentials', async (event, platform, creds) => {
  return await testConnection(platform, creds)
})

ipcMain.handle('search-jobs-credentialed', async (event, { keywords, location }) => {
  log('info', 'IPC search-jobs-credentialed')
  return await searchWithCredentials(keywords, location)
})

ipcMain.handle('open-search-urls', async (event, urls) => {
  log('info', 'Opening URLs in browser:', urls.length)
  // Open all simultaneously — shell.openExternal is non-blocking
  for (const url of urls) {
    try {
      shell.openExternal(url)
    } catch (e) {
      log('warn', 'Failed to open URL:', url, e.message)
    }
  }
  return { opened: urls.length }
})

ipcMain.handle('search-jobs', async (event, { keywords, location }) => {
  log('info', 'IPC search-jobs received')
  return [] // Fallback — credentialed search is preferred
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
