#!/usr/bin/env python3
"""
Search and index royalty-free images from Pexels and Pixabay APIs.
Returns image metadata including URLs, dimensions, and photographer info.
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime
from typing import Optional

import requests


def search_pexels(
    query: str,
    count: int = 3,
    orientation: Optional[str] = None,
    color: Optional[str] = None,
    page: int = 1,
) -> dict:
    """Search images on Pexels API."""
    api_key = os.environ.get("PEXELS_API_KEY")
    if not api_key:
        raise ValueError("PEXELS_API_KEY environment variable not set")

    url = "https://api.pexels.com/v1/search"
    headers = {"Authorization": api_key}
    params = {
        "query": query,
        "per_page": min(count, 80),  # Pexels max is 80
        "page": page,
    }

    if orientation:
        # Pexels: landscape, portrait, square
        params["orientation"] = orientation

    if color:
        params["color"] = color

    response = requests.get(url, headers=headers, params=params, timeout=30)
    response.raise_for_status()
    data = response.json()

    images = []
    for photo in data.get("photos", []):
        images.append({
            "id": str(photo["id"]),
            "source": "pexels",
            "url_page": photo["url"],
            "url_original": photo["src"]["original"],
            "url_large": photo["src"]["large2x"],
            "url_medium": photo["src"]["medium"],
            "url_small": photo["src"]["small"],
            "width": photo["width"],
            "height": photo["height"],
            "photographer": photo["photographer"],
            "photographer_url": photo["photographer_url"],
            "avg_color": photo.get("avg_color", ""),
            "alt": photo.get("alt", ""),
        })

    return {
        "query": query,
        "source": "pexels",
        "total_results": data.get("total_results", 0),
        "page": data.get("page", 1),
        "per_page": data.get("per_page", count),
        "images": images,
    }


def search_pixabay(
    query: str,
    count: int = 3,
    orientation: Optional[str] = None,
    color: Optional[str] = None,
    page: int = 1,
) -> dict:
    """Search images on Pixabay API."""
    api_key = os.environ.get("PIXABAY_API_KEY")
    if not api_key:
        raise ValueError("PIXABAY_API_KEY environment variable not set")

    url = "https://pixabay.com/api/"
    params = {
        "key": api_key,
        "q": query,
        "per_page": min(count, 200),  # Pixabay max is 200
        "page": page,
        "image_type": "photo",
        "safesearch": "true",
    }

    if orientation:
        # Pixabay: horizontal, vertical (map from common names)
        orientation_map = {
            "landscape": "horizontal",
            "portrait": "vertical",
            "horizontal": "horizontal",
            "vertical": "vertical",
        }
        if orientation in orientation_map:
            params["orientation"] = orientation_map[orientation]

    if color:
        # Pixabay colors: grayscale, transparent, red, orange, yellow, green,
        # turquoise, blue, lilac, pink, white, gray, black, brown
        params["colors"] = color

    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()
    data = response.json()

    images = []
    for hit in data.get("hits", []):
        images.append({
            "id": str(hit["id"]),
            "source": "pixabay",
            "url_page": hit["pageURL"],
            "url_original": hit.get("largeImageURL", hit["webformatURL"]),
            "url_large": hit.get("largeImageURL", hit["webformatURL"]),
            "url_medium": hit["webformatURL"],
            "url_small": hit["previewURL"],
            "width": hit["imageWidth"],
            "height": hit["imageHeight"],
            "photographer": hit["user"],
            "photographer_url": f"https://pixabay.com/users/{hit['user']}-{hit['user_id']}/",
            "tags": hit.get("tags", ""),
            "likes": hit.get("likes", 0),
            "downloads": hit.get("downloads", 0),
        })

    return {
        "query": query,
        "source": "pixabay",
        "total_results": data.get("totalHits", 0),
        "page": page,
        "per_page": min(count, 200),
        "images": images,
    }


def download_image(url: str, output_path: str, timeout: int = 30) -> str:
    """
    Download an image from URL to local path.

    Args:
        url: Image URL to download
        output_path: Local file path to save to
        timeout: Request timeout in seconds

    Returns:
        The output_path on success
    """
    response = requests.get(url, timeout=timeout, stream=True)
    response.raise_for_status()
    os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
    with open(output_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
    return output_path


def search_both(
    query: str,
    count: int = 3,
    orientation: Optional[str] = None,
    color: Optional[str] = None,
    page: int = 1,
) -> dict:
    """Search images on both Pexels and Pixabay APIs."""
    results = {
        "query": query,
        "source": "both",
        "total_results": 0,
        "images": [],
        "errors": [],
    }

    # Half from each source
    half_count = max(count // 2, 1)

    # Try Pexels
    try:
        pexels_result = search_pexels(query, half_count, orientation, color, page)
        results["images"].extend(pexels_result["images"])
        results["total_results"] += pexels_result["total_results"]
    except Exception as e:
        results["errors"].append(f"Pexels: {e}")

    # Try Pixabay
    try:
        pixabay_result = search_pixabay(query, half_count, orientation, color, page)
        results["images"].extend(pixabay_result["images"])
        results["total_results"] += pixabay_result["total_results"]
    except Exception as e:
        results["errors"].append(f"Pixabay: {e}")

    if not results["images"] and results["errors"]:
        raise ValueError("; ".join(results["errors"]))

    return results


def main():
    parser = argparse.ArgumentParser(
        description="Search royalty-free images from Pexels and Pixabay"
    )
    parser.add_argument(
        "--query", "-q", required=True, help="Search keywords (English recommended)"
    )
    parser.add_argument(
        "--source",
        "-s",
        choices=["pexels", "pixabay", "both"],
        default="pexels",
        help="Image source (default: pexels)",
    )
    parser.add_argument(
        "--count",
        "-c",
        type=int,
        default=3,
        help="Number of results (default: 3, max 80 for Pexels, 200 for Pixabay)",
    )
    parser.add_argument(
        "--orientation",
        "-o",
        choices=["landscape", "portrait", "square", "horizontal", "vertical"],
        help="Filter by orientation",
    )
    parser.add_argument(
        "--color",
        help="Filter by color (e.g., blue, red, #ffffff)",
    )
    parser.add_argument(
        "--page",
        "-p",
        type=int,
        default=1,
        help="Results page number (default: 1)",
    )
    parser.add_argument(
        "--output",
        help="Save results to JSON file",
    )
    parser.add_argument(
        "--download", action="store_true",
        help="Download images to local directory",
    )
    parser.add_argument(
        "--output-dir",
        default="downloaded_images",
        help="Directory for downloaded images (default: downloaded_images)",
    )

    args = parser.parse_args()

    try:
        if args.source == "pexels":
            result = search_pexels(
                args.query, args.count, args.orientation, args.color, args.page
            )
        elif args.source == "pixabay":
            result = search_pixabay(
                args.query, args.count, args.orientation, args.color, args.page
            )
        else:
            result = search_both(
                args.query, args.count, args.orientation, args.color, args.page
            )

        # Add timestamp
        result["searched_at"] = datetime.utcnow().isoformat() + "Z"

        # Download images if requested
        if args.download and result.get("images"):
            os.makedirs(args.output_dir, exist_ok=True)
            sanitized = re.sub(r'[^\w\s-]', '', args.query).strip().replace(' ', '_')
            downloaded = 0
            for idx, img in enumerate(result["images"]):
                img_url = img.get("url_large") or img.get("url_original")
                if not img_url:
                    continue
                filename = f"{sanitized}_{idx:03d}.jpg"
                filepath = os.path.join(args.output_dir, filename)
                try:
                    download_image(img_url, filepath)
                    img["downloaded_path"] = filepath
                    downloaded += 1
                except Exception as e:
                    print(f"Failed to download {img_url}: {e}", file=sys.stderr)
            print(f"Downloaded {downloaded}/{len(result['images'])} images to {args.output_dir}")

        # Output
        output_json = json.dumps(result, indent=2, ensure_ascii=False)

        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                f.write(output_json)
            print(f"Results saved to {args.output}")
            print(f"Found {len(result['images'])} images (total available: {result['total_results']})")
        else:
            print(output_json)

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
