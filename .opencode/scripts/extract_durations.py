#!/usr/bin/env python3
"""
Extract audio durations from voiceover files using ffprobe.

Scans a directory for VO_*.wav files and outputs durations in milliseconds to JSON.
Use after any audio modification (speed adjustment, trimming, etc.) to update timing data.

Usage:
    python extract_durations.py raws/audio/vo/
    python extract_durations.py raws/audio/vo/ --output raws/audio/vo/durations.json
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Dict


def get_audio_duration_ms(audio_path: str) -> int:
    """
    Get audio duration in milliseconds using ffprobe.

    Args:
        audio_path: Path to audio file

    Returns:
        Duration in milliseconds
    """
    result = subprocess.run(
        [
            "ffprobe", "-v", "quiet",
            "-show_entries", "format=duration",
            "-of", "json",
            audio_path
        ],
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        raise RuntimeError(f"ffprobe failed for {audio_path}: {result.stderr}")

    data = json.loads(result.stdout)
    duration_sec = float(data["format"]["duration"])
    return int(duration_sec * 1000)


def extract_durations(input_dir: str, pattern: str = "VO_*.wav") -> Dict[str, int]:
    """
    Extract durations from all matching audio files.

    Args:
        input_dir: Directory containing audio files
        pattern: Glob pattern to match files

    Returns:
        Dictionary mapping file stems to durations in milliseconds
    """
    input_path = Path(input_dir)
    durations = {}

    files = sorted(input_path.glob(pattern))

    if not files:
        print(f"Warning: No files matching '{pattern}' found in {input_dir}", file=sys.stderr)
        return durations

    for audio_file in files:
        try:
            duration_ms = get_audio_duration_ms(str(audio_file))
            durations[audio_file.stem] = duration_ms
            print(f"  {audio_file.stem}: {duration_ms}ms ({duration_ms/1000:.2f}s)")
        except Exception as e:
            print(f"  Error processing {audio_file.name}: {e}", file=sys.stderr)

    return durations


def main():
    parser = argparse.ArgumentParser(
        description="Extract audio durations from voiceover files"
    )
    parser.add_argument(
        "input_dir",
        help="Directory containing VO_*.wav files"
    )
    parser.add_argument(
        "--output", "-o",
        help="Output JSON file (default: <input_dir>/durations.json)"
    )
    parser.add_argument(
        "--pattern", "-p", default="VO_*.wav",
        help="File pattern to match (default: VO_*.wav)"
    )
    parser.add_argument(
        "--quiet", "-q", action="store_true",
        help="Only output summary"
    )

    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    if not input_dir.is_dir():
        print(f"Error: {args.input_dir} is not a directory", file=sys.stderr)
        sys.exit(1)

    print(f"Extracting durations from {input_dir}...")

    if args.quiet:
        # Suppress per-file output
        import io
        import contextlib
        with contextlib.redirect_stdout(io.StringIO()):
            durations = extract_durations(str(input_dir), args.pattern)
    else:
        durations = extract_durations(str(input_dir), args.pattern)

    if not durations:
        print("No audio files processed", file=sys.stderr)
        sys.exit(1)

    # Determine output path
    output_path = args.output if args.output else str(input_dir / "durations.json")

    # Save to JSON
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(durations, f, indent=2, ensure_ascii=False)

    # Summary
    total_ms = sum(durations.values())
    print(f"\nExtracted {len(durations)} durations")
    print(f"Total duration: {total_ms}ms ({total_ms/1000:.1f}s)")
    print(f"Saved to: {output_path}")


if __name__ == "__main__":
    main()
