import requests
from bs4 import BeautifulSoup
import os
import re
import json
import yaml
import time
import argparse
from urllib.parse import urljoin, urlparse
from datetime import datetime, timezone
from typing import Optional, List


class URLCrawler:
    """
    Web page crawler for video production workflows.
    - Extracts structured text content (headings, paragraphs, lists, tables)
    - Downloads and filters images
    - Outputs data.json and inventory.yaml compatible with PDF decomposition
    """

    DEFAULT_USER_AGENT = (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )

    def __init__(
        self,
        url: str,
        output_dir: str,
        download_images: bool = True,
        max_images: int = 50,
        min_image_size: int = 100,
        timeout: int = 30,
        user_agent: Optional[str] = None,
    ):
        self.url = url
        self.output_dir = output_dir
        self.images_dir = os.path.join(output_dir, "images", "crawled")
        self.download_images = download_images
        self.max_images = max_images
        self.min_image_size = min_image_size
        self.timeout = timeout
        self.user_agent = user_agent or self.DEFAULT_USER_AGENT
        self.max_retries = 3

        os.makedirs(self.images_dir, exist_ok=True)

        self._image_counter = 0
        self._downloaded_images: List[dict] = []
        self._warnings: List[str] = []

    def _request_with_retry(self, url: str, stream: bool = False) -> requests.Response:
        """Send HTTP request with retry logic."""
        headers = {"User-Agent": self.user_agent}
        last_error = None
        for attempt in range(self.max_retries):
            try:
                resp = requests.get(
                    url, headers=headers, timeout=self.timeout, stream=stream
                )
                resp.raise_for_status()
                return resp
            except requests.RequestException as e:
                last_error = e
                if attempt < self.max_retries - 1:
                    time.sleep(1 * (attempt + 1))
        raise last_error

    def _fetch_html(self) -> str:
        """Fetch and decode HTML from URL."""
        resp = self._request_with_retry(self.url)
        # Auto-detect encoding
        if resp.encoding and resp.encoding.lower() != "utf-8":
            resp.encoding = resp.apparent_encoding
        return resp.text

    def _parse_sections(self, soup: BeautifulSoup) -> List[dict]:
        """
        Parse HTML into structured sections.
        Each heading (h1-h6) starts a new section; content until the next
        heading is grouped under that section.
        """
        # Remove script, style, nav, footer, header elements
        for tag in soup.find_all(["script", "style", "nav", "footer", "header", "noscript"]):
            tag.decompose()

        body = soup.find("body") or soup
        sections = []
        current_section = {"title": "", "content_parts": [], "images": [], "tables": []}

        for element in body.find_all(
            ["h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "table", "img", "figure", "blockquote", "pre"]
        ):
            tag_name = element.name

            if tag_name in ("h1", "h2", "h3", "h4", "h5", "h6"):
                # Save previous section if it has content
                if current_section["content_parts"] or current_section["images"] or current_section["tables"]:
                    sections.append(self._finalize_section(current_section))
                current_section = {
                    "title": element.get_text(strip=True),
                    "content_parts": [],
                    "images": [],
                    "tables": [],
                }

            elif tag_name == "p":
                text = element.get_text(strip=True)
                if text:
                    current_section["content_parts"].append(text)
                # Check for inline images
                for img in element.find_all("img"):
                    src = self._resolve_image_src(img)
                    if src:
                        current_section["images"].append(src)

            elif tag_name == "li":
                text = element.get_text(strip=True)
                if text:
                    current_section["content_parts"].append(f"- {text}")

            elif tag_name == "blockquote":
                text = element.get_text(strip=True)
                if text:
                    current_section["content_parts"].append(f"> {text}")

            elif tag_name == "pre":
                text = element.get_text(strip=True)
                if text:
                    current_section["content_parts"].append(text)

            elif tag_name == "table":
                table_data = self._parse_table(element)
                if table_data:
                    current_section["tables"].append(table_data)

            elif tag_name == "img":
                src = self._resolve_image_src(element)
                if src:
                    current_section["images"].append(src)

            elif tag_name == "figure":
                # Extract images from <figure> containers (common in WordPress)
                for img in element.find_all("img"):
                    src = self._resolve_image_src(img)
                    if src:
                        current_section["images"].append(src)
                # Also extract figcaption text
                figcaption = element.find("figcaption")
                if figcaption:
                    cap_text = figcaption.get_text(strip=True)
                    if cap_text:
                        current_section["content_parts"].append(cap_text)

        # Don't forget the last section
        if current_section["content_parts"] or current_section["images"] or current_section["tables"]:
            sections.append(self._finalize_section(current_section))

        return sections

    def _finalize_section(self, section: dict) -> dict:
        """Convert internal section representation to output format."""
        # Deduplicate images while preserving order
        seen = set()
        unique_images = []
        for img in section["images"]:
            if img not in seen:
                seen.add(img)
                unique_images.append(img)
        return {
            "title": section["title"],
            "content": "\n\n".join(section["content_parts"]),
            "images": unique_images,
            "tables": section["tables"],
        }

    def _resolve_image_src(self, img_tag) -> Optional[str]:
        """Extract and resolve image URL from img tag. Returns None if filtered."""
        src = img_tag.get("src") or img_tag.get("data-src") or ""
        if not src:
            return None

        # Filter data URIs
        if src.startswith("data:"):
            return None

        # Filter inline SVG references
        if src.endswith(".svg") or "svg" in src.lower().split("?")[0].split("/")[-1]:
            return None

        # Convert to absolute URL
        absolute_url = urljoin(self.url, src)

        # Filter by size attributes if available
        width = img_tag.get("width", "")
        height = img_tag.get("height", "")
        try:
            if width and int(width) < self.min_image_size:
                return None
            if height and int(height) < self.min_image_size:
                return None
        except (ValueError, TypeError):
            pass

        return absolute_url

    def _parse_table(self, table_tag) -> List[List[str]]:
        """Parse HTML table into a list of rows."""
        rows = []
        for tr in table_tag.find_all("tr"):
            cells = []
            for cell in tr.find_all(["th", "td"]):
                cells.append(cell.get_text(strip=True))
            if cells:
                rows.append(cells)
        return rows

    def _collect_all_images(self, sections: List[dict], soup: BeautifulSoup) -> List[str]:
        """Collect unique image URLs from sections + full-page fallback sweep."""
        seen = set()
        urls = []

        # 1. Collect from parsed sections
        for section in sections:
            for img_url in section.get("images", []):
                if img_url not in seen:
                    seen.add(img_url)
                    urls.append(img_url)

        # 2. Full-page fallback: sweep ALL <img> tags to catch any missed
        #    by section-based parsing (e.g. images inside <figure>, <div>, etc.)
        body = soup.find("body") or soup
        for img_tag in body.find_all("img"):
            src = self._resolve_image_src(img_tag)
            if src and src not in seen:
                seen.add(src)
                urls.append(src)
                # Also inject into the last section so data.json stays consistent
                if sections:
                    sections[-1]["images"].append(src)

        return urls

    def _download_image(self, img_url: str) -> Optional[str]:
        """Download a single image. Returns local filename or None on failure."""
        try:
            resp = self._request_with_retry(img_url, stream=True)
            content_type = resp.headers.get("Content-Type", "")

            # Determine extension from URL or content-type
            parsed = urlparse(img_url)
            path_ext = os.path.splitext(parsed.path)[1].lower()

            ext_map = {
                "image/jpeg": ".jpg",
                "image/png": ".png",
                "image/gif": ".gif",
                "image/webp": ".webp",
                "image/bmp": ".bmp",
                "image/tiff": ".tiff",
            }

            if path_ext in (".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff"):
                ext = path_ext
            elif content_type in ext_map:
                ext = ext_map[content_type]
            else:
                # Try partial content-type match
                for ct, e in ext_map.items():
                    if ct in content_type:
                        ext = e
                        break
                else:
                    ext = ".jpg"  # fallback

            self._image_counter += 1
            filename = f"crawled_img_{self._image_counter:03d}{ext}"
            filepath = os.path.join(self.images_dir, filename)

            with open(filepath, "wb") as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    f.write(chunk)

            return filename

        except Exception as e:
            self._warnings.append(f"Failed to download {img_url}: {e}")
            return None

    def _download_images(self, image_urls: List[str]) -> dict:
        """Download images and return URL -> local filename mapping."""
        url_to_local = {}
        downloaded = 0

        for img_url in image_urls:
            if downloaded >= self.max_images:
                break

            filename = self._download_image(img_url)
            if filename:
                url_to_local[img_url] = filename
                downloaded += 1
                self._downloaded_images.append({
                    "path": f"images/crawled/{filename}",
                    "source_url": img_url,
                })

            # Polite delay between downloads
            time.sleep(0.5)

        return url_to_local

    def crawl(self) -> dict:
        """Main crawl logic. Returns summary dict."""
        print(f">>> Crawling: {self.url}")

        # 1. Fetch HTML
        html = self._fetch_html()
        soup = BeautifulSoup(html, "html.parser")

        # 2. Extract title
        title_tag = soup.find("title")
        title = title_tag.get_text(strip=True) if title_tag else ""
        print(f">>> Title: {title}")

        # 3. Parse sections
        sections = self._parse_sections(soup)
        print(f">>> Sections: {len(sections)}")

        # 4. Collect and download images (with full-page fallback sweep)
        all_image_urls = self._collect_all_images(sections, soup)
        print(f">>> Images found: {len(all_image_urls)}")

        url_to_local = {}
        if self.download_images and all_image_urls:
            url_to_local = self._download_images(all_image_urls)
            print(f">>> Images downloaded: {len(url_to_local)}")

        # 5. Replace image URLs with local filenames in sections
        for section in sections:
            local_images = []
            for img_url in section.get("images", []):
                if img_url in url_to_local:
                    local_images.append(url_to_local[img_url])
            section["images"] = local_images

        # 6. Count stats
        text_blocks = sum(
            1 for s in sections if s.get("content")
        )
        table_count = sum(
            len(s.get("tables", [])) for s in sections
        )
        total_images = len(url_to_local)

        # 7. Build data.json
        crawled_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        data = {
            "source": self.url,
            "source_type": "url",
            "crawled_at": crawled_at,
            "title": title,
            "sections": sections,
        }

        data_path = os.path.join(self.output_dir, "data.json")
        with open(data_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        # 8. Build inventory.yaml
        inventory = {
            "inventory": {
                "source_files": [
                    {
                        "name": self.url,
                        "type": "url",
                        "crawled": True,
                    }
                ],
                "images": [
                    {
                        "path": img["path"],
                        "source": "url_crawled",
                        "description": f"Downloaded from URL",
                    }
                    for img in self._downloaded_images
                ],
                "text_blocks": text_blocks,
                "tables": table_count,
                "total_images": total_images,
            }
        }

        inventory_path = os.path.join(self.output_dir, "inventory.yaml")
        with open(inventory_path, "w", encoding="utf-8") as f:
            yaml.dump(inventory, f, default_flow_style=False, allow_unicode=True)

        # 9. Summary
        summary = {
            "status": "success",
            "url": self.url,
            "title": title,
            "sections": len(sections),
            "text_blocks": text_blocks,
            "tables": table_count,
            "images_found": len(all_image_urls),
            "images_downloaded": total_images,
            "output_dir": self.output_dir,
            "data_json": data_path,
            "inventory_yaml": inventory_path,
            "warnings": self._warnings,
        }

        print(f">>> Crawl complete!")
        print(f"    Sections: {len(sections)}")
        print(f"    Text blocks: {text_blocks}")
        print(f"    Tables: {table_count}")
        print(f"    Images downloaded: {total_images}")
        print(f"    data.json: {data_path}")
        print(f"    inventory.yaml: {inventory_path}")

        if self._warnings:
            print(f"    Warnings: {len(self._warnings)}")
            for w in self._warnings:
                print(f"      - {w}")

        return summary


# --- CLI Entry Point ---
if __name__ == "__main__":
    arg_parser = argparse.ArgumentParser(
        description="Crawl a URL and extract structured content for video production",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Session workspace mode (recommended)
  python crawl_url.py https://example.com/article --project-path /path/to/workspaces/ses_xxx/

  # Legacy mode with explicit output directory
  python crawl_url.py https://example.com/article --output-dir /path/to/output/

  # Without downloading images
  python crawl_url.py https://example.com/article --project-path /path/to/ses_xxx/ --no-download-images

  # Limit images and set minimum size
  python crawl_url.py https://example.com/article --project-path /path/to/ses_xxx/ --max-images 20 --min-image-size 200
        """,
    )

    arg_parser.add_argument("url", help="Target URL to crawl")
    arg_parser.add_argument(
        "--project-path",
        type=str,
        default=None,
        help="Session workspace root path. Output auto-organized to {project_path}/raws/",
    )
    arg_parser.add_argument(
        "--output-dir",
        type=str,
        default=None,
        help="Explicit output directory (legacy mode, use --project-path instead)",
    )
    arg_parser.add_argument(
        "--no-download-images",
        action="store_true",
        dest="no_download_images",
        help="Skip downloading images",
    )
    arg_parser.add_argument(
        "--max-images",
        type=int,
        default=50,
        help="Maximum number of images to download (default: 50)",
    )
    arg_parser.add_argument(
        "--min-image-size",
        type=int,
        default=100,
        help="Minimum image dimension in pixels to filter small icons (default: 100)",
    )
    arg_parser.add_argument(
        "--timeout",
        type=int,
        default=30,
        help="HTTP request timeout in seconds (default: 30)",
    )
    arg_parser.add_argument(
        "--user-agent",
        type=str,
        default=None,
        help="Custom User-Agent string",
    )

    args = arg_parser.parse_args()

    # Resolve output directory: --project-path takes precedence
    if args.project_path:
        output_dir = os.path.join(args.project_path, "raws")
    elif args.output_dir:
        output_dir = args.output_dir
    else:
        arg_parser.error("Either --project-path or --output-dir is required")

    crawler = URLCrawler(
        url=args.url,
        output_dir=output_dir,
        download_images=not args.no_download_images,
        max_images=args.max_images,
        min_image_size=args.min_image_size,
        timeout=args.timeout,
        user_agent=args.user_agent,
    )

    try:
        summary = crawler.crawl()
        # Output JSON summary to stdout for tool consumption
        print(json.dumps(summary, ensure_ascii=False))
    except Exception as e:
        error_result = {"status": "error", "url": args.url, "error": str(e)}
        print(json.dumps(error_result, ensure_ascii=False))
        exit(1)
