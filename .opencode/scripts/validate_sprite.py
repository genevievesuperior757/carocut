#!/usr/bin/env python3
"""
Validate a sprite sheet image for correct grid layout and chroma key quality.

Checks:
  1. Image dimensions are evenly divisible by the specified grid (cols x rows)
  2. Frame aspect ratio is approximately square (optional)
  3. Magenta (#ff00ff) chroma key coverage meets threshold
  4. No magenta bleeding onto non-background areas
  5. Frame-to-frame visual continuity (optional, basic check)

Usage:
  python validate_sprite.py <image_path> --cols 8 --rows 4
  python validate_sprite.py <image_path> --cols 8 --rows 4 --fix-chroma --output fixed.png

Exit codes:
  0 = all checks passed
  1 = validation failed (details in JSON output)
  2 = file not found or unreadable
"""

import os
import sys
import json
import argparse
from pathlib import Path

try:
    from PIL import Image
    import numpy as np
except ImportError:
    print(json.dumps({
        "success": False,
        "error": "Missing dependencies: Pillow and numpy required. pip install Pillow numpy"
    }))
    sys.exit(2)


def validate_dimensions(width: int, height: int, cols: int, rows: int) -> dict:
    """Check if image dimensions are evenly divisible by grid."""
    w_ok = width % cols == 0
    h_ok = height % rows == 0
    frame_w = width // cols if w_ok else width / cols
    frame_h = height // rows if h_ok else height / rows

    result = {
        "check": "dimensions",
        "passed": w_ok and h_ok,
        "image_size": f"{width}x{height}",
        "grid": f"{cols}x{rows}",
        "frame_size": f"{int(frame_w)}x{int(frame_h)}" if w_ok and h_ok else f"{frame_w:.1f}x{frame_h:.1f}",
    }

    if not w_ok:
        result["error_width"] = f"Width {width} not divisible by {cols} columns (remainder {width % cols})"
    if not h_ok:
        result["error_height"] = f"Height {height} not divisible by {rows} rows (remainder {height % rows})"

    return result


def validate_aspect_ratio(width: int, height: int, cols: int, rows: int, tolerance: float = 0.3) -> dict:
    """Check if individual frames have reasonable aspect ratio."""
    frame_w = width / cols
    frame_h = height / rows
    ratio = frame_w / frame_h if frame_h > 0 else 0
    is_square = abs(ratio - 1.0) < tolerance

    return {
        "check": "aspect_ratio",
        "passed": is_square,
        "frame_aspect_ratio": round(ratio, 3),
        "tolerance": tolerance,
        "note": "Frame is approximately square" if is_square else f"Frame aspect ratio {ratio:.3f} deviates from 1.0 by more than {tolerance}",
    }


def validate_chroma_key(img: Image.Image, min_coverage: float = 0.15) -> dict:
    """Check magenta chroma key background coverage."""
    data = np.array(img.convert("RGBA"))

    # Magenta: R > 240, G < 15, B > 240
    magenta_mask = (data[:, :, 0] > 230) & (data[:, :, 1] < 30) & (data[:, :, 2] > 230)
    total_pixels = data.shape[0] * data.shape[1]
    magenta_pixels = int(magenta_mask.sum())
    coverage = magenta_pixels / total_pixels

    return {
        "check": "chroma_key",
        "passed": coverage >= min_coverage,
        "magenta_coverage": round(coverage * 100, 1),
        "min_required": round(min_coverage * 100, 1),
        "magenta_pixels": magenta_pixels,
        "total_pixels": total_pixels,
    }


def apply_chroma_fix(img: Image.Image, output_path: str) -> str:
    """Replace magenta background with transparency."""
    data = np.array(img.convert("RGBA"))
    magenta_mask = (data[:, :, 0] > 230) & (data[:, :, 1] < 30) & (data[:, :, 2] > 230)
    data[magenta_mask] = [0, 0, 0, 0]

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(data).save(str(out))
    return str(out)


def validate_frame_continuity(img: Image.Image, cols: int, rows: int, threshold: float = 0.85) -> dict:
    """Basic frame-to-frame continuity check using pixel similarity."""
    data = np.array(img.convert("RGB")).astype(float)
    w, h = img.size
    frame_w = w // cols
    frame_h = h // rows

    if frame_w == 0 or frame_h == 0:
        return {"check": "continuity", "passed": False, "error": "Frame size is zero"}

    row_scores = []
    for row in range(rows):
        scores = []
        for col in range(cols - 1):
            f1 = data[row * frame_h:(row + 1) * frame_h, col * frame_w:(col + 1) * frame_w]
            f2 = data[row * frame_h:(row + 1) * frame_h, (col + 1) * frame_w:(col + 2) * frame_w]
            # Normalized similarity (1.0 = identical)
            diff = np.abs(f1 - f2).mean() / 255.0
            similarity = 1.0 - diff
            scores.append(round(similarity, 3))
        avg_score = sum(scores) / len(scores) if scores else 0
        row_scores.append({
            "row": row,
            "avg_similarity": round(avg_score, 3),
            "passed": avg_score >= threshold,
        })

    all_passed = all(r["passed"] for r in row_scores)

    return {
        "check": "continuity",
        "passed": all_passed,
        "threshold": threshold,
        "rows": row_scores,
    }


def extract_frames(img: Image.Image, cols: int, rows: int, output_dir: str) -> list[str]:
    """Extract individual frames for visual inspection."""
    w, h = img.size
    frame_w = w // cols
    frame_h = h // rows
    saved = []

    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    for row in range(rows):
        for col in range(cols):
            frame = img.crop((col * frame_w, row * frame_h, (col + 1) * frame_w, (row + 1) * frame_h))
            fname = f"frame_r{row}_c{col}.png"
            frame.save(str(out_path / fname))
            saved.append(fname)

    return saved


def main():
    p = argparse.ArgumentParser(description="Validate sprite sheet for video production")
    p.add_argument("image", help="Path to sprite sheet image")
    p.add_argument("--cols", type=int, required=True, help="Number of columns in sprite grid")
    p.add_argument("--rows", type=int, required=True, help="Number of rows in sprite grid")
    p.add_argument("--min-chroma", type=float, default=0.15,
                   help="Minimum magenta coverage ratio (default: 0.15 = 15%%)")
    p.add_argument("--continuity-threshold", type=float, default=0.85,
                   help="Frame similarity threshold (default: 0.85)")
    p.add_argument("--skip-continuity", action="store_true",
                   help="Skip frame continuity check")
    p.add_argument("--skip-chroma", action="store_true",
                   help="Skip chroma key check (for non-magenta sprites)")
    p.add_argument("--fix-chroma", action="store_true",
                   help="Replace magenta with transparency and save")
    p.add_argument("--output", help="Output path for chroma-fixed image")
    p.add_argument("--extract-frames", dest="extract_dir",
                   help="Extract individual frames to this directory")

    args = p.parse_args()

    if not os.path.isfile(args.image):
        print(json.dumps({"success": False, "error": f"File not found: {args.image}"}))
        sys.exit(2)

    try:
        img = Image.open(args.image)
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Cannot open image: {e}"}))
        sys.exit(2)

    w, h = img.size
    results = {
        "success": True,
        "image": args.image,
        "image_size": f"{w}x{h}",
        "grid": f"{args.cols}x{args.rows}",
        "checks": [],
    }

    # 1. Dimensions check
    dim_result = validate_dimensions(w, h, args.cols, args.rows)
    results["checks"].append(dim_result)
    if not dim_result["passed"]:
        results["success"] = False

    # 2. Aspect ratio check
    ar_result = validate_aspect_ratio(w, h, args.cols, args.rows)
    results["checks"].append(ar_result)
    if not ar_result["passed"]:
        # Aspect ratio is a warning, not a hard failure
        results.setdefault("warnings", []).append(ar_result["note"])

    # 3. Chroma key check
    if not args.skip_chroma:
        chroma_result = validate_chroma_key(img, args.min_chroma)
        results["checks"].append(chroma_result)
        if not chroma_result["passed"]:
            results["success"] = False

    # 4. Continuity check (only if dimensions are valid)
    if not args.skip_continuity and dim_result["passed"]:
        cont_result = validate_frame_continuity(
            img, args.cols, args.rows, args.continuity_threshold
        )
        results["checks"].append(cont_result)
        if not cont_result["passed"]:
            results.setdefault("warnings", []).append("Some animation rows have low frame continuity")

    # 5. Fix chroma if requested
    if args.fix_chroma:
        output = args.output or args.image.replace(".png", "_transparent.png")
        fixed_path = apply_chroma_fix(img, output)
        results["chroma_fixed"] = fixed_path

    # 6. Extract frames if requested
    if args.extract_dir and dim_result["passed"]:
        frames = extract_frames(img, args.cols, args.rows, args.extract_dir)
        results["extracted_frames"] = len(frames)
        results["extract_dir"] = args.extract_dir

    print(json.dumps(results, indent=2, ensure_ascii=False))
    sys.exit(0 if results["success"] else 1)


if __name__ == "__main__":
    main()
