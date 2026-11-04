import { createRequire } from "node:module"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const require = createRequire("/Users/bitfalt/.pi/agent/npm/node_modules/")
const { chromium } = require("playwright-core")

const HERE = path.dirname(fileURLToPath(import.meta.url))
const TALKS = "/Users/bitfalt/Developer/talks"
const BROWSER = process.env.CHROMIUM || "/Applications/Helium.app/Contents/MacOS/Helium"
const DECKS = [
	{ slug: "stellar-sessions-1", src: "stellar-workshop-talk", slides: 61 },
	{ slug: "stellar-sessions-2", src: "stellar-x402-talk", slides: 39 },
	{ slug: "stellar-sessions-3", src: "stellar-web3-onboarding-talk", slides: 22 },
]

const notesOf = (html) =>
	[...html.matchAll(/<aside class="notes">([\s\S]*?)<\/aside>/g)].map((m) =>
		m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())

const sentence = (note) => note.split(/(?<=[.?!])\s+/).find((s) => s.length > 40) || note.slice(0, 80)

const browser = await chromium.launch({ executablePath: BROWSER, headless: true })
let failed = false
const check = (ok, msg) => { console.log(`${ok ? "PASS" : "FAIL"} ${msg}`); if (!ok) failed = true }

for (const d of DECKS) {
	const file = path.join(HERE, "out", `${d.slug}.html`)
	const html = fs.readFileSync(file, "utf8")
	console.log(`\n== ${d.slug} (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`)

	const notes = notesOf(fs.readFileSync(path.join(TALKS, d.src, "index.html"), "utf8"))
	const picks = [0, Math.floor(notes.length / 2), notes.length - 1].map((i) => sentence(notes[i]))
	for (const s of picks) check(!html.includes(s), `note sentence absent: "${s.slice(0, 70)}…"`)

	const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, offline: true })
	const blocked = new Set()
	await ctx.route(/^(?!file:|data:|blob:)/, (r) => { blocked.add(new URL(r.request().url()).origin); r.abort() })
	const page = await ctx.newPage()
	const errors = []
	const netErrors = []
	page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`))
	page.on("console", (m) => {
		if (m.type() !== "error") return
		const t = m.text()
		;(/net::|Failed to load resource|Failed to fetch/.test(t) ? netErrors : errors).push(t)
	})
	await page.goto(`file://${file}`)
	await page.waitForTimeout(400)

	const count = await page.locator(".deck .slide").count()
	check(count === d.slides, `slide count ${count} === ${d.slides}`)
	check(await page.locator("aside.notes, #notes-panel, #index-panel, #btn-notes, #btn-index, .panel-overlay").count() === 0, "no notes/index markup in DOM")
	check(await page.evaluate(() => [...document.fonts].some((f) => f.status === "loaded" || f.status === "unloaded")), "embedded @font-face present")

	const overlays = () => page.evaluate(() =>
		[...document.querySelectorAll("body *")].filter((e) => {
			const cs = getComputedStyle(e)
			return cs.position === "fixed" && cs.display !== "none" && e.getBoundingClientRect().height > 200
		}).map((e) => e.id || e.className))
	const before = await overlays()
	const hashBefore = await page.evaluate(() => location.hash)
	for (const k of ["n", "N", "o", "O", "Escape"]) await page.keyboard.press(k)
	await page.waitForTimeout(150)
	check(JSON.stringify(await overlays()) === JSON.stringify(before), `N/O/Escape open nothing (fixed large elements: ${JSON.stringify(before)})`)
	check(await page.evaluate(() => location.hash) === hashBefore, "N/O do not change slide")

	const shots = path.join(HERE, "out", "shots", d.slug)
	fs.rmSync(shots, { recursive: true, force: true })
	fs.mkdirSync(shots, { recursive: true })
	await page.keyboard.press("Home")
	for (let i = 0; i < count; i++) {
		if (i > 0) await page.keyboard.press("ArrowRight")
		await page.waitForTimeout(250)
		const cur = await page.evaluate(() => [...document.querySelectorAll(".deck .slide")].findIndex((s) => s.classList.contains("is-current")))
		if (cur !== i) check(false, `arrow navigation reached slide ${cur + 1}, expected ${i + 1}`)
		await page.screenshot({ path: path.join(shots, `${String(i + 1).padStart(2, "0")}.png`) })
	}
	check(fs.readdirSync(shots).length === count, `${count} screenshots in out/shots/${d.slug}`)
	check(await page.evaluate(() => location.hash) === `#/${count}`, "stepped to last slide via ArrowRight")

	check(errors.length === 0, `zero console/page errors${errors.length ? ": " + errors.join(" | ") : ""}`)
	console.log(`INFO network attempts blocked: ${[...blocked].join(", ") || "none"}; network console errors: ${netErrors.length}${netErrors.length ? " (" + [...new Set(netErrors)].slice(0, 3).join(" | ") + ")" : ""}`)
	await ctx.close()
}

await browser.close()
console.log(failed ? "\nSOME CHECKS FAILED" : "\nALL CHECKS PASSED")
process.exit(failed ? 1 : 0)
