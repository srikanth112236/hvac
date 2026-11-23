/* global document */
import path from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import puppeteer from 'puppeteer'

const here = path.dirname(fileURLToPath(import.meta.url))
const source = pathToFileURL(path.join(here, 'website-presentation.html')).href
const output = path.join(here, '..', '..', 'Coolvane-Website-Presentation.pdf')

const localBrowsers = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
]

async function launch() {
  try {
    return await puppeteer.launch({ headless: 'new' })
  } catch (error) {
    console.warn('Bundled Chromium unavailable, trying a local browser:', error.message)
  }
  for (const executablePath of localBrowsers) {
    if (!existsSync(executablePath)) continue
    try {
      return await puppeteer.launch({ headless: 'new', executablePath })
    } catch {
      /* try the next candidate */
    }
  }
  throw new Error('No Chromium, Chrome or Edge binary available to render the PDF.')
}

const browser = await launch()
try {
  const page = await browser.newPage()
  await page.goto(source, { waitUntil: 'networkidle0' })
  await page.emulateMediaType('print')
  await page.pdf({
    path: output,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  })
  const pages = await page.evaluate(() => document.querySelectorAll('.page').length)
  console.log(`Rendered ${pages} pages → ${output}`)
} finally {
  await browser.close()
}
