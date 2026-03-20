import fitz  # PyMuPDF
import pdfplumber
import os
import re
import json
from typing import Optional, List


class PDFParser:
    """
    Generalized PDF parser for video production workflows.
    - Coherent text extraction with smart paragraph merging
    - Table screenshot preservation
    - Streamlined output without bbox redundancy
    - Configurable reference patterns
    """

    # Default reference patterns (can be extended via constructor)
    DEFAULT_REF_PATTERNS = [
        # Chinese patterns
        r'图\s*[\d\.]+',
        r'表\s*[\d\.]+',
        r'如图\s*[\d\.]+\s*所示',
        r'见图\s*[\d\.]+',
        r'参见表\s*[\d\.]+',
        # English patterns
        r'Figure\s*[\d\.]+',
        r'Table\s*[\d\.]+',
        r'Fig\.?\s*[\d\.]+',
        r'Tab\.?\s*[\d\.]+',
        r'see\s+Fig\.?\s*[\d\.]+',
        r'shown\s+in\s+Figure\s*[\d\.]+',
        # Generic numbered references
        r'(?:图|表|Figure|Table|Fig|Tab)\.?\s*\d+(?:\.\d+)*',
    ]

    def __init__(
        self,
        pdf_path: str,
        output_dir: str,
        extra_ref_patterns: Optional[List[str]] = None,
        title_patterns: Optional[List[str]] = None
    ):
        """
        Initialize PDF parser.

        Args:
            pdf_path: Path to PDF file
            output_dir: Output directory for extracted content
            extra_ref_patterns: Additional regex patterns for figure/table references
            title_patterns: Custom patterns for title detection (supplements defaults)
        """
        self.pdf_path = pdf_path
        self.output_dir = output_dir
        self.images_dir = os.path.join(output_dir, "images")

        os.makedirs(self.images_dir, exist_ok=True)

        self.structure_data = []

        # Build reference pattern from defaults + extras
        all_patterns = self.DEFAULT_REF_PATTERNS.copy()
        if extra_ref_patterns:
            all_patterns.extend(extra_ref_patterns)
        self._ref_pattern = re.compile('|'.join(all_patterns), re.IGNORECASE)

        # Custom title patterns (can be extended)
        self._custom_title_patterns = title_patterns or []

        # Counters
        self._image_counter = 0
        self._table_counter = 0

    def _extract_coherent_text(self, page) -> list[dict]:
        """
        提取连贯文本，智能合并段落。
        """
        # 获取文本块并按位置排序（从上到下，从左到右）
        blocks = page.get_text("blocks")
        text_blocks = []

        for block in blocks:
            # block结构: (x0, y0, x1, y1, "text", block_no, block_type)
            if block[6] == 0:  # 文本块
                x0, y0, x1, _ = block[:4]
                text = block[4].strip()
                if text:
                    text_blocks.append({
                        "y": y0,
                        "x": x0,
                        "width": x1 - x0,
                        "text": text
                    })

        # 按y坐标排序（从上到下）
        text_blocks.sort(key=lambda b: (b["y"], b["x"]))

        # 合并相邻段落
        merged = self._merge_paragraphs(text_blocks)

        return merged

    def _merge_paragraphs(self, blocks: list[dict], y_threshold: float = 15) -> list[dict]:
        """
        合并相邻的文本块为段落。
        y_threshold: 垂直间距阈值，小于此值认为是同一段落
        """
        if not blocks:
            return []

        paragraphs = []
        current_para = {
            "text": blocks[0]["text"],
            "type": self._classify_text(blocks[0]["text"])
        }
        last_y = blocks[0]["y"]

        for block in blocks[1:]:
            y_gap = block["y"] - last_y
            text = block["text"]
            text_type = self._classify_text(text)

            # 判断是否应该合并
            should_merge = (
                y_gap < y_threshold and
                text_type == "body" and
                current_para["type"] == "body" and
                not current_para["text"].endswith(("。", ".", "!", "?", "！", "？"))
            )

            if should_merge:
                # 合并到当前段落
                current_para["text"] += " " + text
            else:
                # 保存当前段落，开始新段落
                if current_para["text"]:
                    paragraphs.append(current_para)
                current_para = {"text": text, "type": text_type}

            last_y = block["y"]

        # 添加最后一个段落
        if current_para["text"]:
            paragraphs.append(current_para)

        return paragraphs

    def _classify_text(self, text: str) -> str:
        """
        Classify text type using flexible pattern matching.
        Returns 'title' or 'body'.
        """
        text = text.strip()

        # Check custom title patterns first
        for pattern in self._custom_title_patterns:
            if re.match(pattern, text, re.IGNORECASE):
                return "title"

        # Default title detection (short text with structural indicators)
        if len(text) < 80:  # Titles are typically short
            # Numbered sections: "1.1 Introduction", "2.3.1 Methods"
            if re.match(r'^\d+(?:\.\d+)*\s+\S', text):
                return "title"

            # Chinese chapter/section: "第一章", "第2节"
            if re.match(r'^第[一二三四五六七八九十百千\d]+[章节部分篇]', text):
                return "title"

            # Roman numeral sections: "I. Introduction", "IV. Results"
            if re.match(r'^[IVXivx]+\.\s+\S', text):
                return "title"

            # All caps English (likely header)
            if re.match(r'^[A-Z][A-Z\s]{3,}$', text) and len(text) < 50:
                return "title"

            # Common section headers (flexible matching)
            section_keywords = [
                r'Abstract', r'摘要', r'关键词', r'Keywords',
                r'Introduction', r'引言', r'前言', r'背景',
                r'Methods?', r'方法', r'Materials?', r'材料',
                r'Results?', r'结果', r'Discussion', r'讨论',
                r'Conclusion', r'结论', r'总结',
                r'References?', r'参考文献', r'Bibliography',
                r'Appendix', r'附录', r'Acknowledgment', r'致谢',
                r'Overview', r'概述', r'Summary', r'概要',
            ]
            section_pattern = r'^(' + '|'.join(section_keywords) + r')(\s|$|:)'
            if re.match(section_pattern, text, re.IGNORECASE):
                return "title"

        return "body"

    def _extract_images(self, page) -> list[dict]:
        """提取嵌入图片"""
        image_list = page.get_images(full=True)
        saved_images = []

        for img in image_list:
            xref = img[0]
            try:
                base_image = page.parent.extract_image(xref)
                image_bytes = base_image["image"]
                image_ext = base_image["ext"]

                self._image_counter += 1
                image_name = f"img_{self._image_counter:03d}.{image_ext}"
                image_path = os.path.join(self.images_dir, image_name)

                with open(image_path, "wb") as f:
                    f.write(image_bytes)

                saved_images.append({
                    "type": "image",
                    "path": os.path.relpath(image_path, self.output_dir)
                })
            except Exception:
                continue

        return saved_images

    def _extract_tables_as_images(self, page, page_num: int) -> list[dict]:
        """
        使用pdfplumber检测表格区域，用PyMuPDF截图保存。
        """
        saved_tables = []

        try:
            pdf = self._plumber
            if page_num >= len(pdf.pages):
                return saved_tables

            p = pdf.pages[page_num]
            tables = p.find_tables()

            for table in tables:
                bbox = table.bbox  # (x0, y0, x1, y1)
                if not bbox:
                    continue

                # 将pdfplumber坐标转换为PyMuPDF坐标
                # pdfplumber使用PDF坐标系（左上角为原点）
                rect = fitz.Rect(bbox)

                # 稍微扩展边界以确保完整截取
                rect.x0 = max(0, rect.x0 - 5)
                rect.y0 = max(0, rect.y0 - 5)
                rect.x1 = min(page.rect.width, rect.x1 + 5)
                rect.y1 = min(page.rect.height, rect.y1 + 5)

                # 截图
                self._table_counter += 1
                image_name = f"table_{self._table_counter:03d}.png"
                image_path = os.path.join(self.images_dir, image_name)

                # 使用较高分辨率截图
                mat = fitz.Matrix(2, 2)  # 2x缩放
                clip = rect
                pix = page.get_pixmap(matrix=mat, clip=clip)
                pix.save(image_path)

                saved_tables.append({
                    "type": "table",
                    "path": os.path.relpath(image_path, self.output_dir)
                })

        except Exception as e:
            print(f"  警告: 第{page_num + 1}页表格提取失败: {e}")

        return saved_tables

    def _extract_links(self, page) -> list[str]:
        """提取外部链接（仅URI）"""
        links = []
        for link in page.get_links():
            uri = link.get("uri", "")
            if uri and uri.startswith(("http://", "https://")):
                links.append(uri)
        return list(set(links))  # 去重

    def _find_references(self, text: str) -> list[str]:
        """查找图表引用"""
        return self._ref_pattern.findall(text) if text else []

    def parse(self) -> list[dict]:
        """主解析逻辑"""
        doc = fitz.open(self.pdf_path)
        self._plumber = pdfplumber.open(self.pdf_path)
        total_pages = len(doc)

        print(f">>> 开始解析: {self.pdf_path}")
        print(f">>> 共 {total_pages} 页")

        all_elements = []

        for page_num, page in enumerate(doc):
            print(f">>> 处理第 {page_num + 1}/{total_pages} 页...")

            # 1. 提取连贯文本
            paragraphs = self._extract_coherent_text(page)

            # 2. 提取图片
            images = self._extract_images(page)

            # 3. 提取表格截图
            tables = self._extract_tables_as_images(page, page_num)

            # 4. 提取链接
            links = self._extract_links(page)

            # 组装页面数据
            page_elements = []

            # 添加文本元素
            for para in paragraphs:
                elem = {
                    "type": "title" if para["type"] == "title" else "text",
                    "page": page_num + 1,
                    "content": para["text"]
                }
                # 检查图表引用
                refs = self._find_references(para["text"])
                if refs:
                    elem["refs"] = refs
                page_elements.append(elem)

            # 添加图片元素
            for img in images:
                page_elements.append({
                    "type": "image",
                    "page": page_num + 1,
                    "path": img["path"]
                })

            # 添加表格元素
            for tbl in tables:
                page_elements.append({
                    "type": "table",
                    "page": page_num + 1,
                    "path": tbl["path"]
                })

            # 添加链接（页面级别）
            if links:
                page_elements.append({
                    "type": "links",
                    "page": page_num + 1,
                    "urls": links
                })

            all_elements.extend(page_elements)

        doc.close()
        self._plumber.close()

        # 添加上下文关系
        self._enrich_context(all_elements)

        # 生成统计
        stats = self._generate_stats(all_elements)

        # 保存结果
        output = {
            "stats": stats,
            "elements": all_elements
        }

        json_path = os.path.join(self.output_dir, "data.json")
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)

        print(f">>> 解析完成！")
        print(f"    统计: {stats}")
        print(f"    JSON: {json_path}")
        print(f"    图片: {self.images_dir}")

        return all_elements

    def _enrich_context(self, elements: list[dict], window: int = 2):
        """为图表添加上下文"""
        for i, el in enumerate(elements):
            if el["type"] in ("image", "table"):
                context = {"before": [], "after": []}

                # 向前查找
                for j in range(max(0, i - window), i):
                    prev = elements[j]
                    if prev["type"] in ("text", "title"):
                        text = prev.get("content", "")[:150]
                        if text:
                            context["before"].append(text)

                # 向后查找
                for j in range(i + 1, min(len(elements), i + window + 1)):
                    next_el = elements[j]
                    if next_el["type"] in ("text", "title"):
                        text = next_el.get("content", "")[:150]
                        if text:
                            context["after"].append(text)

                if context["before"] or context["after"]:
                    el["context"] = context

    def _generate_stats(self, elements: list[dict]) -> dict:
        """生成统计信息"""
        stats = {
            "total": len(elements),
            "pages": max((el.get("page", 0) for el in elements), default=0),
            "by_type": {}
        }

        for el in elements:
            t = el["type"]
            stats["by_type"][t] = stats["by_type"].get(t, 0) + 1

        return stats

    def export_text(self, output_path: Optional[str] = None) -> str:
        """导出纯文本"""
        json_path = os.path.join(self.output_dir, "data.json")
        if not os.path.exists(json_path):
            raise FileNotFoundError("请先运行 parse()")

        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        lines = []
        current_page = None

        for el in data["elements"]:
            page = el.get("page")
            if page != current_page:
                lines.append(f"\n--- 第 {page} 页 ---\n")
                current_page = page

            if el["type"] == "title":
                lines.append(f"\n## {el.get('content', '')}\n")
            elif el["type"] == "text":
                lines.append(f"{el.get('content', '')}\n")
            elif el["type"] == "table":
                lines.append(f"[表格: {el.get('path', '')}]\n")
            elif el["type"] == "image":
                lines.append(f"[图片: {el.get('path', '')}]\n")

        result = "".join(lines)

        if output_path:
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(result)
            print(f">>> 纯文本已导出: {output_path}")

        return result


# --- CLI Entry Point ---
if __name__ == "__main__":
    import argparse

    arg_parser = argparse.ArgumentParser(
        description="Decompose PDF into structured content for video production",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic usage
  python decompose_pdf.py document.pdf output_dir/

  # With custom title patterns
  python decompose_pdf.py document.pdf output_dir/ --title-pattern "^Chapter\\s+\\d+"

  # With extra reference patterns
  python decompose_pdf.py document.pdf output_dir/ --ref-pattern "Algorithm\\s+\\d+"

  # Export text only
  python decompose_pdf.py document.pdf output_dir/ --text-only
        """
    )

    arg_parser.add_argument(
        "input_pdf",
        help="Path to input PDF file"
    )
    arg_parser.add_argument(
        "output_dir",
        nargs="?",
        default="pdf_output",
        help="Output directory (default: pdf_output)"
    )
    arg_parser.add_argument(
        "--title-pattern",
        action="append",
        dest="title_patterns",
        help="Additional regex pattern for title detection (can be used multiple times)"
    )
    arg_parser.add_argument(
        "--ref-pattern",
        action="append",
        dest="ref_patterns",
        help="Additional regex pattern for figure/table references (can be used multiple times)"
    )
    arg_parser.add_argument(
        "--text-only",
        action="store_true",
        help="Export plain text only, skip images and tables"
    )
    arg_parser.add_argument(
        "--quiet",
        "-q",
        action="store_true",
        help="Suppress progress output"
    )

    args = arg_parser.parse_args()

    if not os.path.exists(args.input_pdf):
        print(f"Error: File not found: {args.input_pdf}")
        exit(1)

    # Initialize parser with custom patterns
    parser = PDFParser(
        args.input_pdf,
        args.output_dir,
        extra_ref_patterns=args.ref_patterns,
        title_patterns=args.title_patterns
    )

    # Parse PDF
    if not args.quiet:
        print(f">>> Processing: {args.input_pdf}")

    elements = parser.parse()

    # Export plain text
    text_path = os.path.join(args.output_dir, "content.txt")
    parser.export_text(text_path)

    # Summary
    if not args.quiet:
        figures = [el for el in elements if el["type"] in ("image", "table")]
        text_count = len([el for el in elements if el["type"] in ("text", "title")])

        print(f"\n>>> Summary:")
        print(f"    Text blocks: {text_count}")
        print(f"    Images: {len([el for el in elements if el['type'] == 'image'])}")
        print(f"    Tables: {len([el for el in elements if el['type'] == 'table'])}")
        print(f"\n>>> Output:")
        print(f"    JSON: {os.path.join(args.output_dir, 'data.json')}")
        print(f"    Text: {text_path}")
        print(f"    Images: {parser.images_dir}")