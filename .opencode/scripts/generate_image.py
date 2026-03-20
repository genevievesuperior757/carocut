#!/usr/bin/env python3
"""
Image generation via OpenAI-compatible API.

Modes:
  normal  — text-to-image (1024x1024)
  sprite  — sprite sheet (grid layout & rows defined in user prompt, magenta background)
             Sprite mode includes automatic validation and retry (up to --max-retries).

Usage:
  python generate_image.py --prompt "..." --output out.png
  python generate_image.py --prompt "..." --output out.png --reference ref.png
  python generate_image.py --prompt "..." --output sprite.png --mode sprite
  python generate_image.py --prompt "..." --output sprite.png --mode sprite --cols 8 --rows 4

Environment:
  CARO_LLM_API_KEY   — required API key
  CARO_LLM_BASE_URL  — required API base URL (OpenAI-compatible)
  CARO_LLM_MODEL     — required model name
"""

import os
import re
import sys
import json
import base64
import argparse
import subprocess
from pathlib import Path

from openai import OpenAI

# ── config ──────────────────────────────────────────────────────────────────
CARO_LLM_BASE_URL = os.environ.get("CARO_LLM_BASE_URL", "")
MODEL_NAME = os.environ.get("CARO_LLM_MODEL", "")

# ── system prompts ──────────────────────────────────────────────────────────

SYSTEM_PROMPT_NORMAL = (
    "You are a professional image generation assistant. "
    "Generate the image strictly according to the user's description. "
    "Only output the image, no other content.\n"
    "The generated image size should be 1024x1024.\n"
    "If you need to draw text in the image, write the text in Chinese."
)

SYSTEM_PROMPT_SPRITE = """\
You are a professional sprite sheet generation assistant.

Generate a single sprite sheet image. The user prompt will specify the grid dimensions \
(columns × rows) and what each row represents. Follow their layout EXACTLY.

## FORMAT
- Output format: PNG
- Each cell MUST be a perfect square frame (equal width and height)
- Frames must be flush against each other — NO gaps, padding, margins, grid lines, or separators of any kind
- Overall aspect ratio must equal columns:rows (e.g. 8 cols × 4 rows → 8:4 → 2:1)
- Output the highest resolution you can produce (4K preferred; e.g. for an 8×4 grid output 4096×2048, each frame 512×512)

## BACKGROUND
- Background MUST be pure solid magenta (#ff00ff) — no gradients, shadows, textures, noise, or compression artifacts
- NO scene elements whatsoever (no ground, walls, light spots, smoke, particles, etc.)
- Every pixel outside the character MUST be exactly #ff00ff
- Do NOT use magenta (#ff00ff) or near-magenta colors anywhere on the character, props, or shadows — these will be removed during chroma keying
- No magenta reflections, rim lighting, or glow on the character surface

## QUALITY & CONSISTENCY
- High image quality: clear character details, sharp edges, no blur / aliasing / compression artifacts
- Each row = one animation; frames read left-to-right, loop continuously
- Adjacent frames in the same row MUST transition smoothly — no frame skipping, no sudden large displacements / posture changes / expression changes / zoom changes / perspective shifts
- Character position MUST stay consistent across all frames (center-aligned); do NOT crop to edges

If you need to draw text in the image, write the text in Chinese.
Only output this sprite sheet image (PNG). Do not output any other content.
"""

SYSTEM_PROMPTS = {
    "normal": SYSTEM_PROMPT_NORMAL,
    "sprite": SYSTEM_PROMPT_SPRITE,
}

# ── helpers ─────────────────────────────────────────────────────────────────

def image_to_base64(image_path: str) -> str:
    """Convert a local image file to a base64 data-URL."""
    with open(image_path, "rb") as f:
        data = f.read()
    ext = Path(image_path).suffix.lower()
    mime = {
        ".png": "image/png", ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp",
    }.get(ext, "image/png")
    return f"data:{mime};base64,{base64.b64encode(data).decode()}"


def save_png(data_url: str, output_path: str) -> str:
    """Decode a base64 data-URL and save as PNG."""
    if data_url.startswith("data:"):
        _, b64 = data_url.split(",", 1)
    else:
        b64 = data_url

    out = str(Path(output_path).with_suffix(".png"))
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    raw = base64.b64decode(b64)
    with open(out, "wb") as f:
        f.write(raw)
    print(f"Image saved: {out}  ({len(raw):,} bytes)")
    return out


def extract_images(response) -> list[str]:
    """Pull base64 image URLs from the API response."""
    urls: list[str] = []
    if not response.choices:
        return urls
    msg = response.choices[0].message
    if hasattr(msg, "model_extra") and msg.model_extra:
        for img in msg.model_extra.get("images", []):
            if isinstance(img, dict) and "image_url" in img:
                urls.append(img["image_url"]["url"])
    return urls

# ── sprite validation ──────────────────────────────────────────────────────

def _infer_grid_from_prompt(prompt: str) -> tuple[int, int] | None:
    """Try to extract cols x rows from the user prompt."""
    # Patterns: "8 columns x 4 rows", "Grid: 8x4", "8 cols × 4 rows", etc.
    patterns = [
        r"(\d+)\s*(?:columns?|cols?)\s*[x×]\s*(\d+)\s*(?:rows?)",
        r"[Gg]rid[:\s]*(\d+)\s*[x×]\s*(\d+)",
        r"(\d+)\s*[x×]\s*(\d+)\s*(?:grid|sprite|sheet)",
    ]
    for pat in patterns:
        m = re.search(pat, prompt, re.IGNORECASE)
        if m:
            return int(m.group(1)), int(m.group(2))
    return None


def _validate_sprite(image_path: str, cols: int, rows: int) -> dict:
    """Run validate_sprite.py on the generated image. Returns parsed JSON."""
    script_dir = Path(__file__).parent
    validator = str(script_dir / "validate_sprite.py")
    try:
        result = subprocess.run(
            ["python3", validator, image_path,
             "--cols", str(cols), "--rows", str(rows),
             "--skip-continuity"],
            capture_output=True, text=True, timeout=30,
        )
        return json.loads(result.stdout) if result.stdout.strip() else {
            "success": False, "error": result.stderr.strip() or "No output from validator"
        }
    except (subprocess.TimeoutExpired, json.JSONDecodeError, FileNotFoundError) as e:
        return {"success": False, "error": str(e)}


def _enhance_prompt_for_retry(prompt: str, cols: int, rows: int, attempt: int) -> str:
    """Strengthen dimension constraints in the prompt for retry attempts."""
    total_frames = cols * rows
    # Add explicit pixel constraints that get progressively more emphatic
    reinforcements = [
        # Attempt 2: add explicit resolution
        (f"\n\n[CRITICAL REQUIREMENT] The output image MUST have an aspect ratio of exactly "
         f"{cols}:{rows}. The grid MUST be exactly {cols} columns and {rows} rows with "
         f"{total_frames} frames total. Recommended output: {cols * 512}x{rows * 512} pixels "
         f"(each frame {512}x{512})."),
        # Attempt 3: even more emphatic
        (f"\n\n[ABSOLUTE REQUIREMENT - DO NOT IGNORE] Output resolution MUST be exactly "
         f"{cols * 512}x{rows * 512} pixels. Grid: {cols} columns, {rows} rows. "
         f"Each cell: 512x512 pixels. Total cells: {total_frames}. "
         f"The width MUST be divisible by {cols}. The height MUST be divisible by {rows}. "
         f"NO padding, NO borders, NO extra space."),
    ]
    idx = min(attempt - 1, len(reinforcements) - 1)
    return prompt + reinforcements[idx]


# ── core ────────────────────────────────────────────────────────────────────

def _generate_once(
    client: OpenAI,
    prompt: str,
    system_prompt: str,
    reference: list[str] | None,
    output: str,
) -> str:
    """Single generation attempt. Returns saved file path."""
    # build user message
    if reference:
        content: list[dict] = [{"type": "text", "text": prompt}]
        for src in reference:
            if src.startswith("data:"):
                url = src
            elif src.startswith(("http://", "https://")):
                url = src
            elif os.path.exists(src):
                url = image_to_base64(src)
            else:
                print(f"Warning: skipping unresolved image source: {src}")
                continue
            content.append({"type": "image_url", "image_url": {"url": url}})
        user_msg: dict = {"role": "user", "content": content}
    else:
        user_msg = {"role": "user", "content": prompt}

    resp = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": system_prompt},
            user_msg,
        ],
    )

    images = extract_images(resp)
    if not images:
        raise RuntimeError("API returned no images")

    saved = save_png(images[0], output)
    if resp.usage:
        print(f"Tokens: {resp.usage.total_tokens:,}")
    return saved


def generate(
    prompt: str,
    output: str,
    reference: list[str] | None = None,
    system_prompt: str | None = None,
    mode: str = "normal",
    cols: int | None = None,
    rows: int | None = None,
    max_retries: int = 3,
) -> str:
    api_key = os.environ.get("CARO_LLM_API_KEY", "")
    if not api_key:
        print("Error: CARO_LLM_API_KEY not set", file=sys.stderr)
        sys.exit(1)
    if not CARO_LLM_BASE_URL:
        print("Error: CARO_LLM_BASE_URL not set", file=sys.stderr)
        sys.exit(1)
    if not MODEL_NAME:
        print("Error: CARO_LLM_MODEL not set", file=sys.stderr)
        sys.exit(1)

    client = OpenAI(api_key=api_key, base_url=CARO_LLM_BASE_URL)

    if system_prompt is None:
        system_prompt = SYSTEM_PROMPTS.get(mode, SYSTEM_PROMPTS["normal"])

    print(f"Mode: {mode}")
    print(f"Prompt: {prompt[:120]}{'...' if len(prompt) > 120 else ''}")
    if reference:
        print(f"References: {len(reference)}")

    # ── Normal mode: single attempt, no validation ──
    if mode != "sprite":
        print("Generating …")
        try:
            return _generate_once(client, prompt, system_prompt, reference, output)
        except RuntimeError as e:
            print(f"Error: {e}", file=sys.stderr)
            sys.exit(1)

    # ── Sprite mode: generate + validate + retry ──
    # Infer grid dimensions from prompt if not explicitly provided
    if cols is None or rows is None:
        inferred = _infer_grid_from_prompt(prompt)
        if inferred:
            cols, rows = inferred
            print(f"Inferred grid from prompt: {cols} cols × {rows} rows")
        else:
            print("Warning: Could not infer grid dimensions from prompt. "
                  "Use --cols and --rows for automatic validation.", file=sys.stderr)
            # Fall back to single attempt without validation
            print("Generating (no validation) …")
            try:
                return _generate_once(client, prompt, system_prompt, reference, output)
            except RuntimeError as e:
                print(f"Error: {e}", file=sys.stderr)
                sys.exit(1)

    # Sprite generation with validation loop
    current_prompt = prompt
    for attempt in range(1, max_retries + 1):
        print(f"\n{'='*60}")
        print(f"Sprite generation attempt {attempt}/{max_retries}")
        print(f"{'='*60}")
        print("Generating …")

        try:
            saved = _generate_once(client, current_prompt, system_prompt, reference, output)
        except RuntimeError as e:
            print(f"Generation failed: {e}")
            if attempt < max_retries:
                print("Retrying with enhanced prompt…")
                current_prompt = _enhance_prompt_for_retry(prompt, cols, rows, attempt)
                continue
            else:
                print(f"Error: All {max_retries} attempts failed", file=sys.stderr)
                sys.exit(1)

        # Validate the generated sprite
        print(f"Validating sprite ({cols}x{rows})…")
        validation = _validate_sprite(saved, cols, rows)

        if validation.get("success"):
            print(f"Validation PASSED on attempt {attempt}")
            print(json.dumps(validation, indent=2, ensure_ascii=False))
            return saved
        else:
            print(f"Validation FAILED on attempt {attempt}:")
            for check in validation.get("checks", []):
                if not check.get("passed"):
                    print(f"  - {check.get('check')}: {check}")
            if "error" in validation:
                print(f"  - Error: {validation['error']}")

            if attempt < max_retries:
                print("Retrying with enhanced prompt…")
                current_prompt = _enhance_prompt_for_retry(prompt, cols, rows, attempt)
            else:
                print(f"Warning: Sprite validation failed after {max_retries} attempts.",
                      file=sys.stderr)
                print(f"Last generated file kept at: {saved}", file=sys.stderr)
                print("Manual inspection recommended.", file=sys.stderr)
                # Print final validation result and exit with code 1
                print(json.dumps(validation, indent=2, ensure_ascii=False))
                sys.exit(1)

    # Should not reach here, but just in case
    sys.exit(1)

# ── CLI ─────────────────────────────────────────────────────────────────────

def main():
    p = argparse.ArgumentParser(description="Generate images via OpenAI-compatible API")
    p.add_argument("--prompt", required=True, help="User prompt (English)")
    p.add_argument("--output", required=True, help="Output path (always saved as .png)")
    p.add_argument("--reference", nargs="+", help="Reference image path(s) or URL(s)")
    p.add_argument("--system-prompt", dest="system_prompt", help="Override the built-in system prompt")
    p.add_argument("--mode", choices=["normal", "sprite"], default="normal",
                   help="Generation mode (default: normal)")
    p.add_argument("--cols", type=int, default=None,
                   help="Sprite grid columns (sprite mode only, auto-inferred from prompt if omitted)")
    p.add_argument("--rows", type=int, default=None,
                   help="Sprite grid rows (sprite mode only, auto-inferred from prompt if omitted)")
    p.add_argument("--max-retries", type=int, default=3, dest="max_retries",
                   help="Max generation attempts for sprite mode (default: 3)")
    args = p.parse_args()
    generate(args.prompt, args.output, args.reference, args.system_prompt, args.mode,
             args.cols, args.rows, args.max_retries)


if __name__ == "__main__":
    main()
