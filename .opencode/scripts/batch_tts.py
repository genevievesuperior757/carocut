#!/usr/bin/env python3
"""
Batch TTS generation from script.md

Parses voiceover lines from script.md and generates audio files using Edge TTS.
Extracts durations and saves to durations.json.

Usage:
    python batch_tts.py --script manifests/script.md --output raws/audio/vo/
    python batch_tts.py --script manifests/script.md --output raws/audio/vo/ --character zh-CN-XiaoxiaoNeural --speed 1.2

Environment:
    Requires edge-tts and ffmpeg to be available (see tts_invoke.py)
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Tuple


def parse_script(script_path: str) -> List[Tuple[str, str]]:
    """
    Parse script.md to extract voiceover lines.

    Expected format:
        **[VO_001]** "Text content here"

    Args:
        script_path: Path to script.md

    Returns:
        List of (vo_id, text) tuples
    """
    vo_pattern = re.compile(r'\*\*\[(VO_\d+)\]\*\*\s*["""]([^"""]+)["""]')

    with open(script_path, 'r', encoding='utf-8') as f:
        content = f.read()

    matches = vo_pattern.findall(content)

    if not matches:
        # Try alternative pattern
        alt_pattern = re.compile(r'\[(VO_\d+)\]\s*["""]([^"""]+)["""]')
        matches = alt_pattern.findall(content)

    return matches


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
        raise RuntimeError(f"ffprobe failed: {result.stderr}")

    data = json.loads(result.stdout)
    duration_sec = float(data["format"]["duration"])
    return int(duration_sec * 1000)


def build_tts_command(
    vo_id: str,
    text: str,
    output_dir: Path,
    character: str,
    speed: float,
    timeout: int,
    tone: str = "平静",
) -> List[str]:
    output_path = output_dir / f"{vo_id}.wav"
    script_dir = Path(__file__).parent
    tts_script = script_dir / "tts_invoke.py"
    return [
        sys.executable,
        str(tts_script),
        "--text",
        text,
        "--character",
        character,
        "--tone",
        tone,
        "--speed",
        str(speed),
        "--timeout",
        str(timeout),
        "--output",
        str(output_path),
    ]


def generate_tts(
    vo_id: str,
    text: str,
    output_dir: Path,
    character: str = "default",
    tone: str = "平静",
    speed: float = 1.2,
    timeout: int = 60,
) -> str:
    """
    Generate TTS for a single voiceover line.

    Args:
        vo_id: Voiceover ID (e.g., "VO_001")
        text: Text to synthesize
        output_dir: Output directory
        character: Edge voice ID or legacy alias
        tone: Deprecated compatibility field
        timeout: Generation timeout

    Returns:
        Path to generated audio file
    """
    output_path = output_dir / f"{vo_id}.wav"
    result = subprocess.run(
        build_tts_command(
            vo_id=vo_id,
            text=text,
            output_dir=output_dir,
            character=character,
            tone=tone,
            speed=speed,
            timeout=timeout,
        ),
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        raise RuntimeError(f"TTS generation failed for {vo_id}: {result.stderr}")

    return str(output_path)


def main():
    parser = argparse.ArgumentParser(
        description="Batch generate TTS from script.md"
    )
    parser.add_argument(
        "--script", "-s", required=True,
        help="Path to script.md"
    )
    parser.add_argument(
        "--output", "-o", required=True,
        help="Output directory for audio files"
    )
    parser.add_argument(
        "--character", "-c", default="default",
        help='Edge voice ID or legacy alias (default: default)'
    )
    parser.add_argument(
        "--tone", "-t", default="平静",
        help="Deprecated compatibility field. Edge TTS ignores tone labels."
    )
    parser.add_argument(
        "--speed", type=float, default=1.2,
        help="Playback speed multiplier passed directly to Edge TTS (default: 1.2)"
    )
    parser.add_argument(
        "--timeout", type=int, default=60,
        help="Timeout per TTS generation in seconds (default: 60)"
    )
    parser.add_argument(
        "--start-from",
        help="Start from specific VO_ID (skip earlier ones)"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Parse script and show VO lines without generating"
    )

    args = parser.parse_args()

    # Parse script
    vo_lines = parse_script(args.script)

    if not vo_lines:
        print("Error: No voiceover lines found in script", file=sys.stderr)
        sys.exit(1)

    print(f"Found {len(vo_lines)} voiceover lines")

    if args.dry_run:
        for vo_id, text in vo_lines:
            preview = text[:60] + "..." if len(text) > 60 else text
            print(f"  {vo_id}: {preview}")
        return

    # Create output directory
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Track progress
    durations: Dict[str, int] = {}
    skip_until = args.start_from
    skipping = skip_until is not None

    for i, (vo_id, text) in enumerate(vo_lines, 1):
        # Handle start-from
        if skipping:
            if vo_id == skip_until:
                skipping = False
            else:
                print(f"[{i}/{len(vo_lines)}] Skipping {vo_id}")
                continue

        print(f"[{i}/{len(vo_lines)}] Generating {vo_id}...")

        try:
            # Generate TTS
            audio_path = generate_tts(
                vo_id=vo_id,
                text=text,
                output_dir=output_dir,
                character=args.character,
                tone=args.tone,
                speed=args.speed,
                timeout=args.timeout,
            )

            # Get duration
            duration_ms = get_audio_duration_ms(audio_path)
            durations[vo_id] = duration_ms
            print(f"  Duration: {duration_ms}ms ({duration_ms/1000:.1f}s)")

        except Exception as e:
            print(f"  Error: {e}", file=sys.stderr)
            continue

    # Save durations
    durations_path = output_dir / "durations.json"
    if args.start_from and durations_path.exists():
        with open(durations_path, 'r', encoding='utf-8') as f:
            existing = json.load(f)
        existing.update(durations)
        durations = existing
    with open(durations_path, 'w', encoding='utf-8') as f:
        json.dump(durations, f, indent=2, ensure_ascii=False)

    # Summary
    total_ms = sum(durations.values())
    print(f"\nGeneration complete!")
    print(f"  Files: {len(durations)}/{len(vo_lines)}")
    print(f"  Total duration: {total_ms}ms ({total_ms/1000:.1f}s)")
    print(f"  Durations saved to: {durations_path}")


if __name__ == "__main__":
    main()
