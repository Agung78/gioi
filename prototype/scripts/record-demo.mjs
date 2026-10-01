// Drives the prototype through RECORDING-SCENARIOS.md with smooth, human-paced motion.
// Record the window with macOS screen recording (Cmd+Shift+5) while this runs.
//
//   pnpm dev                                 # in another terminal
//   pnpm record                              # all scenarios
//   pnpm record 1 2 4                        # pick scenarios
//   SPEED=1.5 BASE_URL=http://127.0.0.1:5173 pnpm record 6
//
// SPEED > 1 = slower pauses. Press Enter in this terminal to start once the recording is armed.
import { chromium } from 'playwright'
import readline from 'node:readline/promises'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const SPEED = Number(process.env.SPEED ?? 1)
const picked = process.argv.slice(2).map(Number)

// Fake cursor: Playwright input doesn't move the OS cursor, so draw one that follows mouse events.
const CURSOR = `
addEventListener('DOMContentLoaded', () => {
  const c = document.createElement('div')
  c.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:rgba(255,190,60,.55);border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.35);pointer-events:none;z-index:2147483647;transition:transform .12s'
  document.body.appendChild(c)
  addEventListener('mousemove', e => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px' }, true)
  addEventListener('mousedown', () => { c.style.transform = 'scale(.7)' }, true)
  addEventListener('mouseup', () => { c.style.transform = '' }, true)
})`

const browser = await chromium.launch({ headless: !!process.env.HEADLESS, args: ['--window-size=1440,960'] })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 860 } })
await ctx.addInitScript(CURSOR)
const page = await ctx.newPage()
let mouse = { x: 720, y: 430 }

const pause = (ms = 1200) => page.waitForTimeout(ms * SPEED)

/** Eased scroll of the window to a pixel Y or to an element (offset leaves room for sticky header). */
async function glide(target, ms = 1800) {
  const el = typeof target === 'number' ? null : await target.elementHandle()
  await page.evaluate(([el, y, ms]) => new Promise(done => {
    const y0 = scrollY
    const max = document.documentElement.scrollHeight - innerHeight
    const y1 = Math.max(0, Math.min(max, el ? el.getBoundingClientRect().top + scrollY - 120 : y))
    const t0 = performance.now()
    const ease = t => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
    requestAnimationFrame(function step(t) {
      const p = Math.min((t - t0) / ms, 1)
      scrollTo({ top: y0 + (y1 - y0) * ease(p), behavior: 'instant' }) // app CSS sets scroll-behavior: smooth
      p < 1 ? requestAnimationFrame(step) : done()
    })
  }), [el, typeof target === 'number' ? target : 0, ms * SPEED])
  await pause(400)
}

/** Glide into view if off-screen, move the cursor over, then click. */
async function click(loc, after = 900) {
  loc = loc.first()
  await loc.waitFor({ state: 'visible' })
  let box = await loc.boundingBox()
  const vh = page.viewportSize().height
  const inModal = await loc.evaluate(n => !!n.closest('.modal-panel'))
  if (box.y < 80 || box.y + box.height > vh - 20) {
    if (inModal) await loc.scrollIntoViewIfNeeded()
    else await glide(loc, 1200)
    box = await loc.boundingBox()
  }
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  const dist = Math.hypot(x - mouse.x, y - mouse.y)
  await page.mouse.move(x, y, { steps: Math.max(12, Math.round(dist / 18)) })
  mouse = { x, y }
  await pause(250)
  await page.mouse.down()
  await page.mouse.up()
  await pause(after)
}

async function type(loc, text) {
  await click(loc, 200)
  await loc.first().pressSequentially(text, { delay: 55 * SPEED })
  await pause(400)
}

// Filters re-evaluate as the card's buttons change; pin to its position instead.
async function pin(filtered) {
  const i = await filtered.first().evaluate(a => [...document.querySelectorAll('article')].indexOf(a))
  return page.locator('article').nth(i)
}

const btn = (name, scope = page) => scope.getByRole('button', { name, exact: true })

async function go(path) {
  await page.goto(BASE + path)
  await page.waitForLoadState('networkidle')
  await pause(1000)
}

async function resetDemo() {
  await page.goto(BASE + '/')
  await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('gioi.')).forEach(k => localStorage.removeItem(k)))
}

async function signIn(who) {
  await go('/login')
  await click(page.getByText(`Sign in as ${who} →`), 1500)
}

const scenarios = {
  // 1 — Public restaurant experience
  async 1() {
    await resetDemo()
    await go('/')
    await pause(2500) // hero animation
    await glide(page.locator('#experience'), 2500)
    await pause(1500)
    await glide(page.locator('#experience ol'), 2000)
    await pause(2000)
    await glide(page.getByRole('heading', { name: 'Right on the water' }), 2000)
    await pause(1500)
    await glide(page.locator('#visit'), 2000)
    await pause(2500)
    await glide(0, 3000)
    await click(page.locator('#q-date'))
    await click(page.getByRole('dialog', { name: 'Choose a date' }).locator('button:not([disabled])').filter({ hasText: /^\s*\d+\s*$/ }).nth(3))
    await click(page.locator('#q-party'), 300)
    await page.locator('#q-party').selectOption('4')
    await pause(800)
    await click(btn('Find a table'), 2500)
    await go('/')
    await click(page.getByRole('button', { name: /Switch to (dark|light) mode/ }), 2000)
    await click(page.getByRole('button', { name: /Switch to (dark|light) mode/ }), 1500)
    await click(page.getByRole('link', { name: 'Reserve a table' }), 2000)
  },

  // 2 — Guest makes a reservation
  async 2() {
    await resetDemo()
    await go('/book')
    const when = page.locator('#when')
    await click(when.locator('button.min-h-16:not([disabled])').nth(1))
    await click(btn('More guests'), 500)
    await click(btn('More guests'), 500)
    await click(btn('Fewer guests'), 900)
    await glide(when.getByText('Time', { exact: true }), 1500)
    await pause(1500) // disabled slots visible
    const beach = btn('Beachfront', when)
    if (await beach.count()) await click(beach)
    await click(when.locator('button:not([disabled])').filter({ hasText: /^\s*\d{2}:\d{2}/ }).nth(2), 1200)
    await click(page.getByRole('button', { name: /3\. Details/ }))
    await click(btn('Birthday'))
    await click(btn('Vegetarian'), 500)
    await click(btn('Shellfish allergy'))
    await type(page.locator('#accessibility'), 'Ground floor table')
    await type(page.locator('#guestNotes'), 'Beachfront table if possible')
    await type(page.locator('#fullName'), 'Sarah Mitchell')
    await type(page.locator('#phone'), '+61 412 345 678')
    await type(page.locator('#email'), 'sarah@example.com')
    await type(page.locator('#country'), 'Perth, Australia')
    await click(page.getByText('I understand the cancellation policy.'))
    await click(page.getByText('Send me occasional news and events.'))
    await click(btn('Confirm booking').locator('visible=true'), 2500)
    await page.waitForURL(/\/confirmation\//)
    await pause(3000)
    await click(page.getByRole('button', { name: /Copy/ }), 2000)
    for (const name of ['Add to calendar', 'Get directions', 'Message us']) {
      const l = page.getByRole('link', { name }).first()
      const b = await l.boundingBox()
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 20 })
      mouse = { x: b.x + b.width / 2, y: b.y + b.height / 2 }
      await pause(1000)
    }
  },

  // 3 — Availability rules and booking guardrails
  async 3() {
    await resetDemo()
    await go('/book')
    const when = page.locator('#when')
    const closed = when.locator('button.min-h-16[disabled]')
    if (await closed.count()) {
      const b = await closed.first().boundingBox()
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 20 })
      await pause(1500)
    }
    await click(when.locator('button.min-h-16:not([disabled])').nth(2))
    await glide(when.getByText('Time', { exact: true }), 1500)
    await pause(2500)
    const more = btn('More guests')
    for (let i = 0; i < 30 && await more.isEnabled(); i++) await click(more, 250)
    await pause(1500)
    await glide(page.getByText('Message us on'), 1200)
    await pause(2000)
    await glide(page.getByRole('button', { name: 'Confirm booking' }).locator('visible=true'), 2500)
    await pause(2500) // disabled submit
  },

  // 4 — Host service-day operations
  async 4() {
    await resetDemo()
    await signIn('Putu')
    await pause(1500)
    const alert = page.locator('article').filter({ has: page.locator('.alert-danger, .alert-warn') })
    if (await alert.count()) { await glide(alert.first(), 2000); await pause(2500) }
    await glide(0, 1500)
    await click(page.locator('article button.font-display'), 2000)
    await glide(page.getByRole('heading', { name: 'Visit history' }), 1500)
    await click(page.getByRole('link', { name: '← Back to host' }), 1500)

    // Walk one booking through its status chain.
    const startable = page.locator('article').filter({ has: btn('Confirmed') }).or(page.locator('article').filter({ has: btn('Arrived') }))
    if (await startable.count()) {
      const card = await pin(startable)
      for (let i = 0; i < 4; i++) {
        const primary = card.locator('button.btn-primary')
        if (!(await primary.count())) break
        await click(primary, 1800)
      }
    }
    const cancellable = page.locator('article').filter({ has: btn('Cancelled') })
    if (await cancellable.count()) {
      const card = await pin(cancellable)
      await click(btn('Cancelled', card), 1200)
      await click(btn('Yes, Cancelled', card), 1800)
    }

    await glide(0, 1500)
    await click(btn('+ Walk-in'), 1200)
    const f = page.locator('.modal-panel input.field')
    await type(f.nth(0), 'Ketut Walk-in')
    await type(f.nth(1), '+62 811 222 333')
    await click(f.nth(2), 200)
    await f.nth(2).fill('2')
    await pause(800)
    const add = btn('Add walk-in')
    if (await add.isEnabled()) await click(add, 2000)
    else await click(btn('Cancel', page.locator('.modal-panel')))
    const walk = page.locator('article').filter({ hasText: 'Ketut Walk-in' })
    if (await walk.count()) { await glide(walk.first(), 2000); await pause(2000) }
    await glide(0, 1500)
    await click(btn('Previous'), 1500)
    await click(btn('Next'), 1000)
    await click(btn('Next'), 1500)
    await click(btn('Today'), 1500)
  },

  // 5 — Guest search and profile history
  async 5() {
    await signIn('Putu')
    const name = (await page.locator('article button.font-display').first().innerText()).trim()
    await click(btn('Guest search'))
    await type(page.getByPlaceholder('Search by name, phone, or email'), name.split(' ')[0])
    await pause(1200)
    await click(page.locator('li.cursor-pointer'), 2500)
    await glide(page.getByRole('heading', { name: 'Visit history' }), 2000)
    await pause(1500)
    const summary = page.locator('summary')
    if (await summary.count()) await click(summary, 2500)
    await click(page.getByRole('link', { name: '← Back to host' }), 1500)
  },

  // 6 — Manager dashboard
  async 6() {
    await signIn('Made')
    await click(page.getByRole('link', { name: 'Dashboard', exact: true }), 2000)
    const cues = page.getByRole('heading', { name: 'Action cues' })
    if (await cues.count()) await pause(2500)
    for (const h of ['Today live', 'Next 7 days — covers', 'Next 30 days — covers per day', 'Guest mix', 'Channel performance (last 30d)', 'Reliability (last 30d)']) {
      await glide(page.getByRole('heading', { name: h }), 1800)
      await pause(2200)
    }
  },

  // 7 — Settings, seating areas, users, CSV export
  async 7() {
    await signIn('Made')
    await click(page.getByRole('link', { name: 'Settings', exact: true }), 1500)
    const restaurant = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Restaurant' }) })
    const tagline = restaurant.locator('input.field').nth(1)
    await click(tagline, 200)
    await tagline.fill('')
    await type(tagline, 'Fresh from the coast. Made for sunset.')
    await click(btn('Save restaurant'), 2000)

    await glide(page.getByRole('heading', { name: 'Opening hours & rules' }), 2000)
    await pause(2500)
    const closedDate = new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10)
    page.once('dialog', d => d.accept(closedDate))
    await click(btn('+ Add'), 1500)
    await click(btn('Save hours & rules'), 1500)

    await glide(page.getByRole('heading', { name: 'Seating areas' }), 2000)
    await pause(1500)
    await click(btn('+ Add seating area'), 1000)
    const areas = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Seating areas' }) })
    const newName = areas.locator('label:text-is("Name") + input').last()
    await click(newName, 200)
    await newName.fill('')
    await type(newName, 'Sunset Deck')
    await click(btn('Save seating areas'), 1800)

    await glide(page.getByRole('heading', { name: 'Users' }), 2000)
    await pause(2000)
    await click(btn('Save users'), 1500)
    await glide(page.getByRole('heading', { name: 'Data export' }), 1500)
    const download = page.waitForEvent('download')
    await click(btn('Download reservations CSV'), 2500)
    await (await download).cancel()

    // Leave availability clean for later booking takes.
    await glide(page.getByRole('heading', { name: 'Opening hours & rules' }), 1500)
    await click(page.getByRole('button', { name: `Remove ${closedDate}` }), 800)
    await click(btn('Save hours & rules'), 1500)
  },

  // 8 — Audit log
  async 8() {
    await signIn('Made')
    await click(page.getByRole('link', { name: 'Audit', exact: true }), 2500)
    const filter = page.locator('select.field')
    for (const v of ['reservation', 'reservation_status', 'settings', 'seating_area', 'all']) {
      await click(filter, 300)
      await filter.selectOption(v)
      await pause(2200)
    }
  },

  // 9 — Role access and demo reset
  async 9() {
    await signIn('Putu')
    await pause(2000)
    await go('/admin/dashboard') // guard redirects Host away
    await pause(2000)
    await click(btn('Sign out'), 1500)
    await signIn('Made')
    await pause(2500)
    await click(btn('Reset demo data'), 3000)
  },

  // 10 — Optional closing clip
  async 10() {
    await go('/')
    await pause(1500)
    await glide(page.getByRole('heading', { name: 'Make sunset your reservation.' }), 5000)
    await pause(2000)
    await click(page.getByRole('link', { name: 'Reserve a table' }).last(), 2500)
  },
}

await page.goto(BASE)
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
await rl.question('Window ready. Arm Cmd+Shift+5 on it, then press Enter to start… ')
rl.close()

const order = picked.length ? picked : Object.keys(scenarios).map(Number).filter(n => n !== 10)
for (const n of order) {
  console.log(`▶ Scenario ${n}`)
  try {
    await scenarios[n]()
  } catch (e) {
    console.error(`✖ Scenario ${n} failed: ${e.message.split('\n').slice(0, 3).join(' | ')}`)
    if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/fail-${n}.png` }).catch(() => {})
  }
  await pause(2000)
}
console.log('Done. Browser stays open — Ctrl+C to quit.')
