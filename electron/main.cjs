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
const CREDS_FILE = path.join(app.getPath('userData'), 'credentials.enc')

function getEncryptionKey() {
  // Use only fixed machine identifiers — NOT app.getPath which can differ dev vs packaged
  const machineId = [
    process.env.COMPUTERNAME || '',
    process.env.USERNAME || '',
    process.env.USERDOMAIN || '',
    'HermesJobHunter-Credentials-v1', // fixed salt — stable across runs
  ].join('|')
  return crypto.createHash('sha256').update(machineId).digest().slice(0, 32)
}

function encrypt(plaintext) {
  try {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return iv.toString('hex') + ':' + encrypted
  } catch (e) { log('error', 'Encryption failed:', e.message); return null }
}

function decrypt(encrypted) {
  try {
    const key = getEncryptionKey()
    const [ivHex, data] = encrypted.split(':')
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'))
    let decrypted = decipher.update(data, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (e) { log('warn', 'Decryption failed:', e.message); return null }
}

function loadCredentials() {
  try {
    if (!fs.existsSync(CREDS_FILE)) return {}
    const raw = fs.readFileSync(CREDS_FILE, 'utf8').trim()
    if (!raw) return {}
    const decrypted = decrypt(raw)
    if (!decrypted) return {}
    return JSON.parse(decrypted)
  } catch (e) { log('warn', 'Could not load credentials:', e.message); return {} }
}

function saveCredentials(platform, creds) {
  try {
    const all = loadCredentials()
    all[platform] = { email: creds.email, password: creds.password, encrypted: true }
    const encrypted = encrypt(JSON.stringify(all))
    if (!encrypted) throw new Error('Encryption returned null')
    fs.writeFileSync(CREDS_FILE, encrypted, { mode: 0o600 })
    log('info', 'Credentials saved for', platform)
    return true
  } catch (e) { log('error', 'Failed to save credentials:', e.message); return false }
}

function getDecryptedCredentials(platform) {
  const c = loadCredentials()[platform]
  if (!c) return null
  return { email: c.email, password: c.password }
}

// ─── Stealth mode: disable features LinkedIn uses to detect bots ─────────────
function applyStealth(session) {
  // Randomize user agent (real Chrome on Windows)
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
  session.setUserAgent(ua)

  // Remove webdriver property
  session.webRequest.onHeadersReceived((details, callback) => {
    callback({ responseHeaders: details.responseHeaders })
  })

  // Inject script to hide automation flags BEFORE any page loads
  session.setPreloadScript(path.join(__dirname, 'stealth.cjs'))
}

// ─── Stealth preload — runs before every page load ──────────────────────────
function createStealthPreload() {
  const stealthPath = path.join(__dirname, 'stealth.cjs')
  fs.writeFileSync(stealthPath, `
    Object.defineProperty(navigator, 'webdriver', { get: () => false })
    window.chrome = { runtime: {} }
    delete navigator.__proto__.webdriver
    document.__proto__.cdc_adoQpoasnfa76pfcZLmcfl_Array = undefined
    document.__proto__.cdc_adoQpoasnfa76pfcZLmcfl_Promise = undefined
    document.__proto__.cdc_adoQpoasnfa76pfcZLmcfl_String = undefined
  `, 'utf8')
  return stealthPath
}

// ─── Hidden browser for scraping ─────────────────────────────────────────────
let scrapeWindow = null

function createScrapeWindow() {
  if (scrapeWindow) {
    try { scrapeWindow.close() } catch (_) {}
    scrapeWindow = null
  }

  const sp = createStealthPreload()
  const ses = session.fromPartition('scrape-session-' + Date.now())

  // Apply stealth to this session
  ses.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36')
  ses.setPreloadScript(sp)

  scrapeWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      session: ses,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  return scrapeWindow
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

// ─── Robust wait for element ────────────────────────────────────────────────
async function waitForSelector(win, selector, timeout = 10000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const found = await win.webContents.executeJavaScript(`
      document.querySelector('${selector}') !== null
    `)
    if (found) return true
    await delay(500)
  }
  return false
}

// ─── LinkedIn scraper (stealth + robust) ────────────────────────────────────
async function scrapeLinkedIn(email, password, keywords, location) {
  log('info', 'Starting LinkedIn scrape for:', keywords)
  const win = createScrapeWindow()
  const loc = location || 'Bangalore'
  const query = encodeURIComponent(keywords.join(' '))

  try {
    // Step 1: Navigate to login page
    await win.loadURL('https://www.linkedin.com/login', { timeout: 20000 })
    await delay(2500)
    log('info', 'Login page URL:', win.webContents.getURL())

    // Check for any blocking pages first
    const pageText = await win.webContents.executeJavaScript(`document.body?.innerText || ''`)
    if (pageText.includes('unusual traffic') || pageText.includes('captcha') || pageText.includes('Verify')) {
      log('warn', 'LinkedIn showing blocking page')
      win.close(); scrapeWindow = null
      return { success: false, message: 'LinkedIn blocked — please log in via browser tab', blocked: true }
    }

    // Step 2: Try multiple possible selectors for email field
    const fieldCheck = await win.webContents.executeJavaScript(`
      (function() {
        const selectors = ['#username', 'input[name="session_key"]', 'input[type="email"]', '#ap_email']
        for (const s of selectors) {
          const el = document.querySelector(s)
          if (el) return { found: true, selector: s, type: el.type, name: el.name }
        }
        return { found: false }
      })()
    `)
    log('info', 'Email field check:', JSON.stringify(fieldCheck))

    if (!fieldCheck?.found) {
      // Maybe already logged in? Check URL
      const url = win.webContents.getURL()
      if (!url.includes('/login')) {
        log('info', 'Already logged in, proceeding to jobs search')
      } else {
        throw new Error('Could not find login fields')
      }
    }

    // Step 3: Fill credentials using found selector
    const emailSel = fieldCheck?.selector || '#username'
    const passSel = '#password'

    await win.webContents.executeJavaScript(`
      (function() {
        const em = document.querySelector('${emailSel}');
        const pw = document.querySelector('${passSel}');
        if (em) { em.value = ''; em.dispatchEvent(new Event('input', {bubbles:true})); }
        if (pw) { pw.value = ''; pw.dispatchEvent(new Event('input', {bubbles:true})); }
      })()
    `)
    await delay(200)

    // Type email character by character (more human)
    for (const char of email) {
      await win.webContents.executeJavaScript(`
        (function() {
          const el = document.querySelector('${emailSel}');
          if (el) {
            el.focus();
            el.value += '${char}';
            el.dispatchEvent(new Event('input', {bubbles:true}));
          }
        })()
      `)
      await delay(30 + Math.random() * 20)
    }
    await delay(200)

    // Type password
    for (const char of password) {
      await win.webContents.executeJavaScript(`
        (function() {
          const el = document.querySelector('${passSel}');
          if (el) {
            el.focus();
            el.value += '${char}';
            el.dispatchEvent(new Event('input', {bubbles:true}));
          }
        })()
      `)
      await delay(30 + Math.random() * 20)
    }
    await delay(300)

    // Submit form
    await win.webContents.executeJavaScript(`
      (function() {
        const btn = document.querySelector('button[type="submit"]');
        if (btn) btn.click();
        else document.querySelector('form')?.submit();
      })()
    `)
    await delay(5000) // Wait for redirect

    const postLoginUrl = win.webContents.getURL()
    log('info', 'Post-login URL:', postLoginUrl)

    // Detect login failure
    if (postLoginUrl.includes('/login') || postLoginUrl.includes('challenge') || postLoginUrl.includes('checkpoint')) {
      log('warn', 'LinkedIn login failed, URL indicates challenge')
      win.close(); scrapeWindow = null
      return { success: false, message: 'Login failed — check credentials or complete 2FA in browser', blocked: true }
    }

    // Step 4: Navigate to jobs search
    const jobsUrl = `https://www.linkedin.com/jobs/search/?keywords=${query}&location=${encodeURIComponent(loc)}&f_TPR=r604800&sortBy=DD&distance=25`
    await win.loadURL(jobsUrl, { timeout: 20000 })
    await delay(5000) // Wait for jobs to render
    log('info', 'Jobs page URL:', win.webContents.getURL())

    // Step 5: Scroll to load more jobs (LinkedIn loads jobs on scroll)
    for (let scroll = 0; scroll < 3; scroll++) {
      await win.webContents.executeJavaScript(`window.scrollBy(0, 800)`)
      await delay(1500)
    }
    await delay(2000)

    // Step 6: Extract jobs from DOM
    const jobsData = await win.webContents.executeJavaScript(`
      (function() {
        const results = []
        // Try current job cards first
        let cards = document.querySelectorAll('.jobs-search-results__list-item')
        if (!cards.length) cards = document.querySelectorAll('.occludable-job-card')
        if (!cards.length) cards = document.querySelectorAll('[data-occludable-job-id]')
        if (!cards.length) cards = document.querySelectorAll('.job-card-container')

        cards.forEach(card => {
          const titleEl = card.querySelector('.job-card-list__title--link, .occludable-job-card__title, a[data-job-id]')
          const title = titleEl ? (titleEl.textContent || '').trim() : ''
          const companyEl = card.querySelector('.job-card-container__company-name, .occludable-job-card__company-name')
          const company = companyEl ? (companyEl.textContent || '').trim() : ''
          const locEl = card.querySelector('.job-card-container__metadata-item')
          const loc = locEl ? (locEl.textContent || '').trim() : ''
          const linkEl = card.querySelector('a[href*="/jobs/"]')
          const link = linkEl ? 'https://www.linkedin.com' + (linkEl.getAttribute('href') || '').split('?')[0] : ''
          const salaryEl = card.querySelector('.job-card-container__salary-info')
          const salary = salaryEl ? (salaryEl.textContent || '').trim() : ''

          if (title && !title.includes('Promoted')) {
            results.push({ title, company, location: loc || '${loc}', salary, url: link, source: 'LinkedIn', sourceColor: '#0077b5' })
          }
        })
        return { jobs: results.slice(0, 30), count: cards.length }
      })()
    `)

    log('info', `LinkedIn found ${jobsData.count} cards, ${jobsData.jobs.length} valid jobs`)
    win.close(); scrapeWindow = null

    if (jobsData.jobs.length > 0) {
      return { success: true, jobs: jobsData.jobs }
    } else {
      return { success: false, message: 'No jobs found — LinkedIn may have blocked the session', blocked: true }
    }

  } catch (e) {
    log('error', 'LinkedIn scrape error:', e.message)
    try { win.close() } catch (_) {}
    scrapeWindow = null
    return { success: false, message: e.message }
  }
}

// ─── Naukri scraper (stealth) ───────────────────────────────────────────────
async function scrapeNaukri(email, password, keywords, location) {
  log('info', 'Starting Naukri scrape for:', keywords)
  const win = createScrapeWindow()
  const query = keywords.join(' ')

  try {
    await win.loadURL('https://www.naukri.com/nlogin/login', { timeout: 20000 })
    await delay(3000)

    // Check for blocking
    const bodyText = await win.webContents.executeJavaScript(`document.body?.innerText || ''`)
    if (bodyText.includes('unusual traffic') || bodyText.includes('Verify')) {
      win.close(); scrapeWindow = null
      return { success: false, message: 'Naukri blocked — please log in via browser', blocked: true }
    }

    // Find login fields
    const fields = await win.webContents.executeJavaScript(`
      (function() {
        const emailField = document.querySelector('input[type="email"], input[id="emailField"], input[name="email"]')
        const passField = document.querySelector('input[type="password"], input[id="passwordField"], input[name="password"]')
        return {
          emailSel: emailField ? (
            emailField.id ? '#' + emailField.id :
            emailField.name ? '[name="' + emailField.name + '"]' :
            emailField.className ? '.' + emailField.className.split(' ').join('.') : null
          ) : null,
          passSel: passField ? (
            passField.id ? '#' + passField.id :
            passField.name ? '[name="' + passField.name + '"]' : null
          ) : null,
        }
      })()
    `)
    log('info', 'Naukri fields:', JSON.stringify(fields))

    if (!fields?.emailSel || !fields?.passSel) {
      // Already logged in?
      const url = win.webContents.getURL()
      if (!url.includes('login')) {
        log('info', 'Already logged into Naukri')
      } else {
        throw new Error('Could not find Naukri login fields')
      }
    }

    // Fill and submit
    await win.webContents.executeJavaScript(`
      (function() {
        const em = document.querySelector('${fields.emailSel || "input[type=email]"}');
        const pw = document.querySelector('${fields.passSel || "input[type=password]"');
        if (em) { em.value = ''; em.focus(); }
        if (pw) { pw.value = ''; }
      })()
    `)
    await delay(200)

    for (const char of email) {
      await win.webContents.executeJavaScript(`
        (function() {
          const el = document.querySelector('${fields.emailSel || "input[type=email]"');
          if (el) { el.value += '${char}'; el.dispatchEvent(new Event('input', {bubbles:true})); }
        })()
      `)
      await delay(25)
    }
    await delay(150)
    for (const char of password) {
      await win.webContents.executeJavaScript(`
        (function() {
          const el = document.querySelector('${fields.passSel || "input[type=password]"');
          if (el) { el.value += '${char}'; el.dispatchEvent(new Event('input', {bubbles:true})); }
        })()
      `)
      await delay(25)
    }
    await delay(300)

    await win.webContents.executeJavaScript(`
      (function() {
        const btn = document.querySelector('button[type="submit"], .btn-login, input[type="submit"], #loginButton')
        if (btn) btn.click()
        else document.querySelector('form')?.submit()
      })()
    `)
    await delay(6000)

    // Navigate to search
    const searchUrl = `https://www.naukri.com/jobs-in-bangalore?q=${encodeURIComponent(query)}&k=${encodeURIComponent(query)}&l=Bangalore&experience=4-10`
    await win.loadURL(searchUrl, { timeout: 20000 })
    await delay(5000)

    // Scroll to load
    for (let i = 0; i < 3; i++) {
      await win.webContents.executeJavaScript(`window.scrollBy(0, 600)`)
      await delay(1200)
    }

    const jobsData = await win.webContents.executeJavaScript(`
      (function() {
        const results = []
        const tuples = document.querySelectorAll('.jobTuple, article[class*="job"], .resumeaccordion')
        tuples.forEach(card => {
          const titleEl = card.querySelector('.title, [class*="title"], a[href*="/job/"]')
          const title = titleEl ? (titleEl.textContent || '').trim() : ''
          const companyEl = card.querySelector('.company, [class*="company"], .subTitle')
          const company = companyEl ? (companyEl.textContent || '').trim() : ''
          const locEl = card.querySelector('.location, [class*="location"]')
          const loc = locEl ? (locEl.textContent || '').trim() : ''
          const expEl = card.querySelector('.experience, [class*="experience"]')
          const exp = expEl ? (expEl.textContent || '').trim() : ''
          const salaryEl = card.querySelector('.salary, [class*="salary"]')
          const salary = salaryEl ? (salaryEl.textContent || '').trim() : exp || '₹ As per profile'
          const linkEl = card.querySelector('a[href*="/job/"]')
          const link = linkEl ? (linkEl.getAttribute('href') || '') : ''
          if (title) results.push({ title, company, location: loc || 'Bangalore', salary, url: link, source: 'Naukri', sourceColor: '#d32f2f' })
        })
        return { jobs: results.slice(0, 30), count: tuples.length }
      })()
    `)

    log('info', `Naukri found ${jobsData.count} cards, ${jobsData.jobs.length} jobs`)
    win.close(); scrapeWindow = null
    return { success: true, jobs: jobsData.jobs }

  } catch (e) {
    log('error', 'Naukri scrape error:', e.message)
    try { win.close() } catch (_) {}
    scrapeWindow = null
    return { success: false, message: e.message }
  }
}

// ─── Full search with credentials ───────────────────────────────────────────
async function searchWithCredentials(keywords, location) {
  log('info', 'searchWithCredentials for:', keywords)
  const allJobs = []

  const liCreds = getDecryptedCredentials('linkedin')
  if (liCreds?.email && liCreds?.password) {
    log('info', 'Using stored LinkedIn credentials')
    const result = await scrapeLinkedIn(liCreds.email, liCreds.password, keywords, location)
    if (result.success) {
      allJobs.push(...result.jobs)
    } else {
      log('warn', 'LinkedIn scrape failed:', result.message)
    }
  }

  const nakCreds = getDecryptedCredentials('naukri')
  if (nakCreds?.email && nakCreds?.password) {
    log('info', 'Using stored Naukri credentials')
    const result = await scrapeNaukri(nakCreds.email, nakCreds.password, keywords, location)
    if (result.success) {
      allJobs.push(...result.jobs)
    }
  }

  log('info', `Total jobs from credentialed searches: ${allJobs.length}`)
  return allJobs
}

// ─── Test connection ─────────────────────────────────────────────────────────
async function testConnection(platform, creds) {
  log('info', 'Testing connection for', platform)
  if (platform === 'linkedin') {
    return await scrapeLinkedIn(creds.email, creds.password, ['Dynamics 365 Azure ERP'], 'Bangalore')
  } else if (platform === 'naukri') {
    return await scrapeNaukri(creds.email, creds.password, ['Dynamics 365 Azure ERP'], 'Bangalore')
  }
  return { success: false, message: 'Unknown platform' }
}

// ─── Main window ────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200, height: 800, minWidth: 800, minHeight: 600,
    backgroundColor: '#0f172a', titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'), webSecurity: false,
    },
    autoHideMenuBar: true, show: false,
  })

  const indexPath = path.join(__dirname, '..', 'dist', 'index.html')
  mainWindow.loadURL(`file://${indexPath.replace(/\\/g, '/')}`).catch(err => {
    log('error', 'loadURL failed:', err.message || err)
  })

  mainWindow.once('ready-to-show', () => { mainWindow.show() })
  mainWindow.webContents.on('crashed', () => log('error', 'Renderer crashed'))
  mainWindow.webContents.on('render-process-gone', (e, d) => log('error', 'Render process gone:', d.reason))
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
  mainWindow.on('closed', () => { mainWindow = null })
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────
ipcMain.handle('save-credentials', async (event, platform, creds) => {
  const success = saveCredentials(platform, creds)
  if (!success) return { success: false }
  // Verify we can read it back immediately
  const loaded = loadCredentials()
  const stored = loaded[platform]
  if (!stored || !stored.email || !stored.password) {
    log('error', 'Credential save FAILED verification — file may not exist at expected path:', CREDS_FILE)
    return { success: false, verified: false }
  }
  log('info', 'Credential saved and verified for', platform)
  return { success: true, verified: true }
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
  for (const url of urls) {
    try { shell.openExternal(url) } catch (e) { log('warn', 'Failed:', url) }
  }
  return { opened: urls.length }
})

ipcMain.handle('search-jobs', async () => { return [] })

// ─── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  log('info', 'App ready')
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })