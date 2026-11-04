#!/usr/bin/env python3
"""Builds a public, slides-only copy of a talk deck.

Usage:  python3 build-public-decks.py TALK_DIR OUTPUT.html [--title "Stellar Sessions #2 · x402 en Stellar"]

Runs TALK_DIR/build-standalone.py on a temp copy (it writes next to itself),
then strips speaker notes, the notes and index panels, their buttons, CSS and
N/O key handlers. Without --title, the title is "Stellar Sessions #N · <deck title>"
with N taken from an output name like stellar-sessions-N.html.
"""
import argparse
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

    found = re.search(r"<title>(.*?)</title>", doc)
    if not found:
        sys.exit("No <title> in the built deck")
    deck_title = html.unescape(found.group(1))
    title = args.title
    if not title:
        m = re.search(r"stellar-sessions-(\d+)", args.output.name)
        if not m:
            sys.exit("Pass --title or name the output stellar-sessions-N.html")
        title = f"Stellar Sessions #{m.group(1)} · {deck_title}"
    doc = re.sub(r"<title>.*?</title>", f"<title>{html.escape(title, quote=False)}</title>", doc, count=1)
    doc = doc.replace('<meta name="viewport"', '<meta name="robots" content="index">\n<meta name="viewport"', 1)

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


if __name__ == "__main__":
    main()
