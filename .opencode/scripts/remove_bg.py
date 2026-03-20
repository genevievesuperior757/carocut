#!/usr/bin/env python3
"""
Remove the background from an image using rembg, producing a transparent PNG.

Usage:
  python remove_bg.py input.png output.png

Dependencies:
  pip install rembg Pillow onnxruntime
"""

import argparse
from pathlib import Path

from PIL import Image
from rembg import remove


def remove_background(input_path: str, output_path: str) -> str:
    """Remove background and save as PNG with transparency."""
    out = str(Path(output_path).with_suffix(".png"))
    Path(out).parent.mkdir(parents=True, exist_ok=True)

    img = Image.open(input_path)
    result = remove(img)
    result.save(out, "PNG")
    print(f"Background removed: {out}")
    return out


def main():
    p = argparse.ArgumentParser(description="Remove image background via rembg")
    p.add_argument("input", help="Input image path")
    p.add_argument("output", help="Output image path (saved as .png)")
    args = p.parse_args()
    remove_background(args.input, args.output)


if __name__ == "__main__":
    main()
