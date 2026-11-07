#!/usr/bin/env python3
"""Builds a public, slides-only copy of a talk deck.

Usage:  python3 build-public-decks.py TALK_DIR OUTPUT.html [--title "Stellar Sessions #2 · x402 en Stellar"]

Runs TALK_DIR/build-standalone.py on a temp copy (it writes next to itself),
then strips speaker notes, the notes and index panels, their buttons, CSS and
N/O key handlers. It injects the SEO head (description, canonical, OG, Twitter,
JSON-LD, theme-color, favicons) from deck-head.ts, which reads src/data/site.ts.
Without --title, the title is "Stellar Sessions #N · <deck title>"
with N taken from an output name like stellar-sessions-N.html.

It then moves every base64 image and font into public/talks/assets/<sha256>.<ext>
(PNG becomes lossless WebP when smaller, SVG stays SVG), sets width, height,
loading and decoding on <img>, and preloads the Latin subset of the display font.
"""
import argparse
import base64
import hashlib
import html
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
from html.parser import HTMLParser

REMOVE_IDS = {"notes-panel", "index-panel", "btn-notes", "btn-index"}
BANNED_CSS = ("#notes-panel", "#index-panel", ".panel-overlay", ".notes")
LEAK_MARKERS = (
    "notes", "Notas", "Índice", "index-panel", "index-list", "indexPanel",
    "indexItems", "toggleIndex", "btn-index", "Sin notas", "Sigue:", "presentador",
)

# (pattern, replacement); every pattern must match at least once.
JS_EDITS = [
    (r"\n\t// ── Index grouped by section ──\n.*?\n\tconst btnNotes = \$\(\"btn-notes\"\)\n", "\n"),
    (r"\n\t\tindexItems\.forEach\(\(li, i\) => li\.classList\.toggle\(\"current\", i === current\)\)", ""),
    (r"\n\t\tconst notes = slide\.querySelector\(\"\.notes\"\)", ""),
    (r"\n\t\t\$\(\"notes-who\"\)[^\n]*", ""),
    (r"\n\t\t\$\(\"notes-body\"\)[^\n]*", ""),
    (r"\n\t\tconst next = slides\[current \+ 1\]\n\t\t\$\(\"notes-next\"\)[^\n]*", ""),
    (r"; indexPanel\.classList\.remove\(\"open\"\) \}\)", " })"),
    (r"\n\tconst toggleNotes = \(force\) => \{\n.*?\n\t\}\n\tconst toggleIndex = [^\n]*", ""),
    (r"\n\tbtnNotes\.addEventListener[^\n]*\n\t\$\(\"btn-index\"\)\.addEventListener[^\n]*", ""),
    (r"\n\t\t\tcase \"n\": case \"N\": toggleNotes\(\); break\n\t\t\tcase \"o\": case \"O\": toggleIndex\(\); break", ""),
    (r"\n\t\t\tcase \"Escape\": toggleNotes\(false\); indexPanel\.classList\.remove\(\"open\"\);( if \(editing\) t\.blur\(\);)? break",
     lambda m: f'\n\t\t\tcase "Escape":{m.group(1)} break' if m.group(1) else ""),
    (r" · N notas · O índice", ""),
]


class Spans(HTMLParser):
    """Records [start, end) offsets of aside.notes and the panel/button elements."""

    def __init__(self, text: str):
        super().__init__(convert_charrefs=True)
        self.line_starts = [0] + [m.end() for m in re.finditer("\n", text)]
        self.text = text
        self.target: list = []  # [tag, start_offset, same-tag depth] while inside a target
        self.spans: list[tuple[int, int]] = []
        self.feed(text)
        self.close()

    def pos(self) -> int:
        line, col = self.getpos()
        return self.line_starts[line - 1] + col

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if self.target:
            if tag == self.target[0]:
                self.target[2] += 1
            return
        is_notes = tag == "aside" and "notes" in (a.get("class") or "").split()
        if is_notes or a.get("id") in REMOVE_IDS:
            self.target = [tag, self.pos(), 1]

    def handle_endtag(self, tag):
        if not self.target or tag != self.target[0]:
            return
        self.target[2] -= 1
        if self.target[2] == 0:
            self.spans.append((self.target[1], self.text.index(">", self.pos()) + 1))
            self.target = []


def remove_elements(doc: str) -> tuple[str, int]:
    p = Spans(doc)
    if p.target:
        sys.exit(f"Unclosed target element: {p.target}")
    for start, end in reversed(p.spans):
        line_start = doc.rfind("\n", 0, start) + 1
        if doc[line_start:start].strip() == "":
            start = line_start
            if doc[end:end + 1] == "\n":
                end += 1
        doc = doc[:start] + doc[end:]
    return doc, len(p.spans)


def strip_css(css: str) -> str:
    def rule(m: re.Match) -> str:
        head, body = m.group(1), m.group(2)
        cut = head.rfind("*/") + 2 if "*/" in head else 0
        prefix, selectors = head[:cut], head[cut:]
        if not any(b in selectors for b in BANNED_CSS):
            return m.group(0)
        lead = selectors[: len(selectors) - len(selectors.lstrip())]
        kept = [s.strip() for s in selectors.split(",") if not any(b in s for b in BANNED_CSS)]
        if not kept:
            return prefix + lead.split("\n")[0] if prefix else ""
        return f"{prefix}{lead}{', '.join(kept)} {{{body}}}"

    css = re.sub(r"([^{}]+)\{([^{}]*)\}", rule, css)
    return re.sub(r"\n{3,}", "\n\n", css)


def strip_styles(doc: str) -> str:
    return re.sub(
        r"(<style>)(.*?)(</style>)",
        lambda m: m.group(1) + (m.group(2) if "@font-face" in m.group(2) else strip_css(m.group(2))) + m.group(3),
        doc,
        flags=re.S,
    )


def strip_js(doc: str) -> str:
    for pattern, repl in JS_EDITS:
        doc, n = re.subn(pattern, repl, doc, flags=re.S)
        if n == 0:
            sys.exit(f"Pattern did not match, source changed? {pattern!r}")
    return doc


def note_paragraphs(source: str) -> list[str]:
    out = []
    for block in re.findall(r'<aside class="notes">(.*?)</aside>', source, flags=re.S):
        for p in re.findall(r"<p>(.*?)</p>", block, flags=re.S):
            text = html.unescape(re.sub(r"<[^>]+>", "", p)).strip()
            if text:
                out.append(text)
    return out


def build_standalone(talk: pathlib.Path) -> str:
    with tempfile.TemporaryDirectory() as tmp:
        work = pathlib.Path(tmp) / talk.name
        shutil.copytree(talk, work, ignore=shutil.ignore_patterns(
            "presentacion.*", "shots", "demo", "demo-web", "node_modules", ".ruff_cache", "v1-*"))
        subprocess.run([sys.executable, "-I", str(work / "build-standalone.py")], check=True, cwd=tmp)
        return (work / "presentacion.html").read_text()


HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent.parent
ASSETS = REPO / "public" / "talks" / "assets"
ASSET_URL = "/talks/assets/"

# (pattern, replacement): WCAG AA (4.5:1) for #btn-prev and #btn-next in decks 1 and 2.
# At opacity 0.55 the ink #0f1b3d renders as #767e93 on #f4f7fc (3.78:1). 0.62 gives #666f86 (4.68:1).
# Deck 3 does not match: its buttons have opacity 0 until hover or focus, then 1.
CSS_EDITS = [
    (r"(\.nav-btns \{[^}]*opacity: )0\.55;", r"\g<1>0.62;"),
]

DATA_URI = re.compile(r"data:(image/png|image/svg\+xml|font/woff2);base64,([A-Za-z0-9+/=]+)")
EXT = {"image/png": "png", "image/svg+xml": "svg", "font/woff2": "woff2"}

WEBP_JS = """
const sharp = require("sharp")
const [src, dst] = process.argv.slice(1)
sharp(src).webp({ lossless: true, effort: 6 }).toFile(dst).catch((e) => { console.error(e); process.exit(1) })
"""


def to_webp(png: bytes) -> bytes:
    with tempfile.TemporaryDirectory() as tmp:
        src, dst = pathlib.Path(tmp) / "in.png", pathlib.Path(tmp) / "out.webp"
        src.write_bytes(png)
        subprocess.run([shutil.which("node") or "node", "-e", WEBP_JS, str(src), str(dst)], check=True, cwd=REPO)
        return dst.read_bytes()


def image_size(mime: str, data: bytes) -> tuple[int, int]:
    if mime == "image/png":
        return int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")
    box = re.search(rb'viewBox="[\d.]+ [\d.]+ ([\d.]+) ([\d.]+)"', data)
    if not box:
        sys.exit("SVG image without viewBox")
    return round(float(box.group(1))), round(float(box.group(2)))


def write_asset(data: bytes, ext: str) -> str:
    name = f"{hashlib.sha256(data).hexdigest()[:16]}.{ext}"
    ASSETS.mkdir(parents=True, exist_ok=True)
    path = ASSETS / name
    if not path.exists() or path.read_bytes() != data:
        path.write_bytes(data)
    return ASSET_URL + name


def extract_assets(doc: str) -> tuple[str, list[dict]]:
    """Replaces each base64 data URI with a root-relative URL to a content-hashed file."""
    found: dict[str, dict] = {}

    def asset(m: re.Match) -> str:
        mime, b64 = m.group(1), m.group(2)
        if b64 in found:
            return found[b64]["url"]
        data = base64.b64decode(b64)
        out, ext = data, EXT[mime]
        if mime == "image/png":
            webp = to_webp(data)
            if len(webp) < len(data):
                out, ext = webp, "webp"
        entry = {"url": write_asset(out, ext), "mime": mime, "source": len(data), "size": len(out)}
        if mime.startswith("image/"):
            entry["width"], entry["height"] = image_size(mime, data)
        found[b64] = entry
        return entry["url"]

    doc = DATA_URI.sub(asset, doc)
    if ";base64," in doc:
        sys.exit("A base64 data URI is left in the deck")
    return doc, list(found.values())


def set_img_attrs(doc: str, assets: list[dict]) -> str:
    sizes = {a["url"]: a for a in assets if "width" in a}
    first_slide_end = doc.find('<section class="slide', doc.find('<section class="slide') + 1)

    def img(m: re.Match) -> str:
        tag = m.group(0)
        src = re.search(r'\ssrc="([^"]+)"', tag)
        if not src or src.group(1) not in sizes:
            sys.exit(f"<img> without an extracted asset: {tag[:120]}")
        a = sizes[src.group(1)]
        attrs = f' width="{a["width"]}" height="{a["height"]}"'
        if m.start() > first_slide_end:
            attrs += ' loading="lazy" decoding="async"'
        return tag[:4] + attrs + tag[4:]

    return re.sub(r"<img\b(?![^>]*\swidth=)[^>]*>", img, doc)


def preload_font(doc: str) -> str:
    """Preloads the Latin (U+0000-00FF) file of the first family in --display, the font of the cover title."""
    family = re.search(r"--display:\s*\"([^\"]+)\"", doc)
    if not family:
        sys.exit("No --display font family in the deck")
    urls = []
    for face in re.findall(r"@font-face\s*\{([^}]*)\}", doc):
        fam = re.search(r"font-family:\s*'([^']+)'", face)
        url = re.search(r"url\((/talks/assets/[^)]+\.woff2)\)", face)
        if fam and url and fam.group(1) == family.group(1) and re.search(r"unicode-range:\s*U\+0000-00FF", face):
            urls.append(url.group(1))
    if not urls:
        sys.exit(f"No Latin @font-face for {family.group(1)}")
    links = "".join(f'<link rel="preload" href="{u}" as="font" type="font/woff2" crossorigin>\n' for u in dict.fromkeys(urls))
    return doc.replace("<title>", links + "<title>", 1)


def edit_css(doc: str) -> str:
    for pattern, repl in CSS_EDITS:
        doc = re.sub(pattern, repl, doc, count=1)
    # Width and height attributes reserve space while an image loads. This rule keeps the CSS
    # width in charge of the height, as it was before the attributes, without beating any deck rule.
    return doc.replace("</style>", ":where(img) { height: auto; }\n</style>", 1)


def theme_color(doc: str) -> str:
    bg = re.search(r"html, body \{[^}]*background(?:-color)?: var\((--[\w-]+)\)", doc)
    if not bg:
        sys.exit("No html, body background variable in the built deck")
    value = re.search(re.escape(bg.group(1)) + r": (#[0-9a-fA-F]{3,8})", doc)
    if not value:
        sys.exit(f"No hex value for {bg.group(1)}")
    return value.group(1)


def seo_head(slug: str, title: str, color: str) -> str:
    node = shutil.which("node")
    if not node:
        sys.exit("node is required for deck-head.ts")
    out = subprocess.run([node, str(HERE / "deck-head.ts"), slug, title, color],
                         check=True, cwd=REPO, capture_output=True, text=True)
    return out.stdout


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("talk", type=pathlib.Path)
    ap.add_argument("output", type=pathlib.Path)
    ap.add_argument("--title")
    args = ap.parse_args()
    talk = args.talk.resolve()

    doc = build_standalone(talk)
    doc, removed = remove_elements(doc)
    doc = strip_styles(doc)
    doc = strip_js(doc)

    slug = re.search(r"stellar-sessions-\d+", args.output.name)
    if not slug:
        sys.exit("Name the output stellar-sessions-N.html")
    found = re.search(r"<title>(.*?)</title>", doc)
    if not found:
        sys.exit("No <title> in the built deck")
    deck_title = html.unescape(found.group(1))
    title = args.title
    if not title:
        title = f"Stellar Sessions #{slug.group(0).rsplit('-', 1)[1]} · {deck_title}"
    head = seo_head(slug.group(0), title, theme_color(doc))
    doc = re.sub(r"<title>.*?</title>", lambda _: f"<title>{html.escape(title, quote=False)}</title>\n{head}", doc, count=1)
    doc = doc.replace('<meta name="viewport"', '<meta name="robots" content="index">\n<meta name="viewport"', 1)

    doc, assets = extract_assets(doc)
    doc = set_img_attrs(doc, assets)
    doc = preload_font(doc)
    doc = edit_css(doc)

    leaks = [m for m in LEAK_MARKERS if m in doc]
    notes = note_paragraphs((talk / "index.html").read_text())
    plain = html.unescape(doc)
    surviving = [n for n in notes if n in plain or n in doc]
    if leaks or surviving:
        sys.exit(f"Leak check failed. markers={leaks} notes={surviving[:3]}")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(doc)
    print(f"{args.output.name}: {args.output.stat().st_size / 1024:.0f} KB, "
          f"removed {removed} elements, {len(notes)} note paragraphs absent, title={title!r}")
    for a in assets:
        print(f"  {a['url']}  {a['mime']}  {a['source'] / 1024:.1f} KB -> {a['size'] / 1024:.1f} KB")


if __name__ == "__main__":
    main()
