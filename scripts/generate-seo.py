#!/usr/bin/env python3
import html
import re
import textwrap
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
BASE_URL = "https://greenwoods.dev"
OG_DIR = ROOT / "assets" / "og"
HUBS = ("llm-tools", "data-tools", "text-tools", "encoding-tools", "time-tools")
WORKFLOWS = (
    "workflows/ship-a-prompt",
    "workflows/build-a-rag-index",
    "workflows/debug-an-agent",
)


class PageMetadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = []
        self.description = None
        self.page_title = None
        self.in_title = False
        self.in_page_title = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "title":
            self.in_title = True
        elif tag == "meta" and attrs.get("name", "").lower() == "description":
            if self.description is None:
                self.description = attrs.get("content", "")
        elif tag == "h1" and "page-title" in attrs.get("class", "").split():
            self.in_page_title = True

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        elif tag == "h1":
            self.in_page_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title.append(data)
        if self.in_page_title:
            self.page_title = (self.page_title or "") + data


def parse_page(path):
    parser = PageMetadata()
    parser.feed(path.read_text(encoding="utf-8"))
    return parser


def html_attr(value):
    return html.escape(value, quote=True)


def plain_text(value):
    return re.sub(r"\s+", " ", html.unescape(value)).strip()


def tool_pages():
    pages = []
    for path in sorted(ROOT.glob("*.html")):
        metadata = parse_page(path)
        if metadata.page_title:
            pages.append((path, metadata))
    if not pages:
        raise SystemExit("No tool pages with a .page-title heading were found.")
    return pages


def image_text(value):
    return (
        value.replace("→", " to ")
        .replace("↔", " and ")
        .replace("×", "x")
        .replace("—", "-")
        .replace("·", "-")
        .replace("…", "...")
    )


def render_og_card(path, title, description):
    image = Image.new("RGB", (1200, 630), "#0b3d2e")
    draw = ImageDraw.Draw(image)
    title_font = ImageFont.load_default(size=60)
    body_font = ImageFont.load_default(size=28)
    brand_font = ImageFont.load_default(size=25)
    draw.rounded_rectangle((54, 54, 1146, 576), radius=34, fill="#124c3b", outline="#3c8066", width=2)
    draw.text((94, 95), "greenwoods.dev", font=brand_font, fill="#a9dbc4")

    title_lines = textwrap.wrap(image_text(title), width=26)[:2]
    y = 190
    for line in title_lines:
        draw.text((94, y), line, font=title_font, fill="#ffffff")
        y += 76

    summary = image_text(description)
    summary = re.sub(r"^Use [^.]+ in your browser\.\s*", "", summary)
    summary = re.sub(r"\s*Nothing leaves your tab\.$", "", summary)
    summary_lines = textwrap.wrap(summary, width=62)[:3]
    y = max(y + 20, 365)
    for line in summary_lines:
        draw.text((96, y), line, font=body_font, fill="#d5e9df")
        y += 40

    draw.text((96, 510), "Nothing leaves your tab.", font=brand_font, fill="#a9dbc4")
    image.save(path, format="PNG", optimize=True)


def metadata_tags(title, description, canonical, image_url=None):
    tags = [
        f'<link rel="canonical" href="{html_attr(canonical)}" />',
        '<meta property="og:type" content="website" />',
        f'<meta property="og:title" content="{html_attr(title)}" />',
        f'<meta property="og:description" content="{html_attr(description)}" />',
        f'<meta property="og:url" content="{html_attr(canonical)}" />',
        '<meta name="twitter:card" content="summary_large_image" />',
        f'<meta name="twitter:title" content="{html_attr(title)}" />',
        f'<meta name="twitter:description" content="{html_attr(description)}" />',
    ]
    if image_url:
        tags.extend(
            [
                f'<meta property="og:image" content="{html_attr(image_url)}" />',
                f'<meta name="twitter:image" content="{html_attr(image_url)}" />',
            ]
        )
    return "\n  ".join(tags)


def replace_tags(source, metadata):
    source = re.sub(
        r'<link\b(?=[^>]*\brel=["\']canonical["\'])[^>]*>\s*',
        "",
        source,
        flags=re.IGNORECASE,
    )
    source = re.sub(
        r'<meta\b(?=[^>]*\b(?:property|name)=["\'](?:og:[^"\']+|twitter:[^"\']+)["\'])[^>]*>\s*',
        "",
        source,
        flags=re.IGNORECASE,
    )
    source = re.sub(
        r'<meta\b(?=[^>]*\bname=["\']description["\'])[^>]*>\s*',
        "",
        source,
        flags=re.IGNORECASE,
    )
    insertion = (
        f'<meta name="description" content="{html_attr(metadata["description"])}" />\n'
        f'  {metadata_tags(metadata["title"], metadata["description"], metadata["canonical"], metadata.get("image"))}\n'
    )
    if "</head>" not in source:
        raise SystemExit(f"Missing </head> in {metadata['path']}")
    return source.replace("</head>", insertion + "</head>", 1)


def indexable_pages(tool_data):
    pages = [(ROOT / "index.html", "/")]
    pages.extend((ROOT / f"{hub}.html", f"/{hub}") for hub in HUBS)
    pages.extend((ROOT / f"{workflow}/index.html", f"/{workflow}") for workflow in WORKFLOWS)
    pages.extend((path, f"/{path.stem}") for path, _ in tool_data)
    return pages


def update_metadata(tool_data):
    OG_DIR.mkdir(parents=True, exist_ok=True)
    tool_paths = {path for path, _ in tool_data}
    for path, route in indexable_pages(tool_data):
        source = path.read_text(encoding="utf-8")
        parser = parse_page(path)
        title = plain_text("".join(parser.title))
        description = plain_text(parser.description or "")
        if path in tool_paths:
            description = re.sub(
                r"\s*Free and private — your input stays on your device\.?$",
                "",
                description,
            )
            description = re.sub(r"\s*Nothing leaves your tab\.?$", "", description)
            description = f"{description.rstrip('. ')}. Nothing leaves your tab."
            image_path = OG_DIR / f"{path.stem}.png"
            render_og_card(image_path, parser.page_title, description)
            image_url = f"{BASE_URL}/assets/og/{path.stem}.png"
        elif path.name == "llm-tools.html":
            description = "Browse 43 LLM Tools for token counting, prompt design, RAG, and agent debugging. Nothing leaves your tab."
            image_url = None
        elif path == ROOT / "index.html":
            image_url = f"{BASE_URL}/assets/og/home.png"
            render_og_card(OG_DIR / "home.png", "LLM Developer Tools", description)
        else:
            if description and "Nothing leaves your tab." not in description:
                description = f"{description.rstrip('. ')}. Nothing leaves your tab."
            image_url = None

        canonical = f"{BASE_URL}/" if route == "/" else f"{BASE_URL}{route}"
        metadata = {
            "path": path,
            "title": title,
            "description": description,
            "canonical": canonical,
            "image": image_url,
        }
        path.write_text(replace_tags(source, metadata), encoding="utf-8")


def write_sitemap(tool_data):
    urls = [f"{BASE_URL}{route}" if route != "/" else f"{BASE_URL}/" for _, route in indexable_pages(tool_data)]
    if len(urls) != len(set(urls)):
        raise SystemExit("Duplicate sitemap URLs detected.")
    root = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    for url in urls:
        ET.SubElement(ET.SubElement(root, "url"), "loc").text = url
    tree = ET.ElementTree(root)
    ET.indent(tree, space="  ")
    tree.write(ROOT / "sitemap.xml", encoding="utf-8", xml_declaration=True)


def main():
    tools = tool_pages()
    update_metadata(tools)
    write_sitemap(tools)
    (ROOT / "robots.txt").write_text(
        f"User-agent: *\nAllow: /\nSitemap: {BASE_URL}/sitemap.xml\n",
        encoding="utf-8",
    )
    print(f"Generated SEO metadata, {len(tools)} tool cards, and sitemap.")


if __name__ == "__main__":
    main()
