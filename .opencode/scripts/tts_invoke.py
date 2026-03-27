#!/usr/bin/env python3
"""
TTS Audio Generation Script

Generates text-to-speech audio using Edge TTS and writes a WAV file.

Usage:
    python tts_invoke.py --text "你好" --character zh-CN-XiaoxiaoNeural --output audio.wav
"""

import argparse
import asyncio
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path


# Exit codes
EXIT_SUCCESS = 0
EXIT_ARGS_ERROR = 1
EXIT_NETWORK_ERROR = 2
EXIT_TIMEOUT_ERROR = 3
EXIT_SERVICE_ERROR = 4
EXIT_FILE_ERROR = 5


DEFAULT_EDGE_VOICE = "zh-CN-XiaoxiaoNeural"
LEGACY_CHARACTER_VOICE_MAP = {
    "default": DEFAULT_EDGE_VOICE,
    "哆啦A梦": DEFAULT_EDGE_VOICE,
}


def log_info(message: str) -> None:
    print(message, file=sys.stderr)


def log_warning(message: str) -> None:
    print(f"Warning: {message}", file=sys.stderr)


def log_error(message: str) -> None:
    print(f"Error: {message}", file=sys.stderr)


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate TTS audio using Edge TTS",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python tts_invoke.py --text "你好世界" --character zh-CN-XiaoxiaoNeural --speed 1.2 --output audio.wav
  python tts_invoke.py --text "欢迎观看" --character default --output narration.wav
        """,
    )

    parser.add_argument("--text", type=str, required=True, help="Text content to synthesize")
    parser.add_argument(
        "--character",
        type=str,
        default="default",
        help='Edge voice ID (recommended, e.g. "zh-CN-XiaoxiaoNeural")',
    )
    parser.add_argument(
        "--tone",
        type=str,
        default="default",
        help="Deprecated compatibility field. Edge TTS ignores tone labels.",
    )
    parser.add_argument(
        "--emo-weight",
        type=float,
        default=0.2,
        help="Deprecated compatibility field. Edge TTS ignores emotion weights.",
    )
    parser.add_argument(
        "--speed",
        type=float,
        default=1.0,
        help="Playback speed multiplier between 0.5 and 2.0 (default: 1.0)",
    )
    parser.add_argument("--output", type=str, required=True, help="Output audio file path")
    parser.add_argument(
        "--timeout",
        type=int,
        default=60,
        help="Maximum synthesis timeout in seconds (default: 60)",
    )
    parser.add_argument(
        "--max-retries",
        type=int,
        default=3,
        help="Maximum retry attempts on failure (default: 3)",
    )

    args = parser.parse_args()

    if not 0.0 <= args.emo_weight <= 1.0:
        parser.error("--emo-weight must be between 0.0 and 1.0")
    if not 0.5 <= args.speed <= 2.0:
        parser.error("--speed must be between 0.5 and 2.0")

    return args


def resolve_voice(character: str) -> str:
    normalized = character.strip()
    if normalized in LEGACY_CHARACTER_VOICE_MAP:
        return LEGACY_CHARACTER_VOICE_MAP[normalized]
    if "-" in normalized and normalized.endswith("Neural"):
        return normalized
    raise ValueError(
        f'Unsupported voice "{character}". Use "default" or an Edge voice ID such as "{DEFAULT_EDGE_VOICE}".'
    )


def speed_to_rate(speed: float) -> str:
    if speed <= 0:
        raise ValueError("speed must be greater than 0")
    percentage = round((speed - 1.0) * 100)
    return f"{percentage:+d}%"


def ensure_edge_tts_available():
    try:
        import edge_tts  # type: ignore
    except ImportError as exc:
        raise RuntimeError("edge-tts is not installed. Install with: pip install edge-tts") from exc
    return edge_tts


def synthesize_to_mp3(text: str, voice: str, rate: str, output_path: str, timeout: int) -> None:
    edge_tts = ensure_edge_tts_available()

    async def _save() -> None:
        communicator = edge_tts.Communicate(text=text, voice=voice, rate=rate)
        await communicator.save(output_path)

    asyncio.run(asyncio.wait_for(_save(), timeout=timeout))


def convert_audio(source_path: str, output_path: str) -> None:
    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)

    if output_file.suffix.lower() == ".mp3":
        Path(source_path).replace(output_file)
        return

    if not shutil.which("ffmpeg"):
        raise IOError("ffmpeg not found in PATH")

    result = subprocess.run(
        ["ffmpeg", "-y", "-i", source_path, str(output_file)],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise IOError(result.stderr.strip() or "ffmpeg conversion failed")


def generate_audio_with_retry(
    text: str,
    character: str,
    tone: str,
    emo_weight: float,
    speed: float,
    output_path: str,
    timeout: int,
    max_retries: int,
) -> int:
    try:
        voice = resolve_voice(character)
        rate = speed_to_rate(speed)
    except ValueError as exc:
        log_error(str(exc))
        return EXIT_ARGS_ERROR

    if tone not in {"default", "", "平静"}:
        log_warning("Edge TTS does not support the --tone parameter. It will be ignored.")
    if abs(emo_weight - 0.2) > 1e-9:
        log_warning("Edge TTS does not support the --emo-weight parameter. It will be ignored.")

    for attempt in range(1, max_retries + 1):
        temp_path = None
        try:
            if attempt > 1:
                backoff_time = 2 ** (attempt - 1)
                log_info(f"Retry attempt {attempt}/{max_retries} after {backoff_time}s...")
                time.sleep(backoff_time)

            fd, temp_path = tempfile.mkstemp(suffix=".mp3")
            os.close(fd)

            log_info(f"Synthesizing via Edge TTS ({voice}, rate {rate})...")
            synthesize_to_mp3(text=text, voice=voice, rate=rate, output_path=temp_path, timeout=timeout)
            convert_audio(temp_path, output_path)
            log_info(f"Audio saved to: {output_path}")
            return EXIT_SUCCESS

        except asyncio.TimeoutError:
            log_error(f"Synthesis timed out after {timeout} seconds")
            if attempt >= max_retries:
                return EXIT_TIMEOUT_ERROR

        except RuntimeError as exc:
            log_error(str(exc))
            return EXIT_SERVICE_ERROR

        except IOError as exc:
            log_error(f"File error: {exc}")
            return EXIT_FILE_ERROR

        except Exception as exc:
            log_error(f"Edge TTS request failed: {exc}")
            if attempt >= max_retries:
                return EXIT_NETWORK_ERROR

        finally:
            if temp_path and os.path.exists(temp_path):
                os.unlink(temp_path)

    return EXIT_SERVICE_ERROR


def main() -> int:
    try:
        args = parse_arguments()
        return generate_audio_with_retry(
            text=args.text,
            character=args.character,
            tone=args.tone,
            emo_weight=args.emo_weight,
            speed=args.speed,
            output_path=args.output,
            timeout=args.timeout,
            max_retries=args.max_retries,
        )
    except KeyboardInterrupt:
        log_error("Interrupted by user")
        return EXIT_SERVICE_ERROR
    except Exception as exc:
        log_error(f"Fatal error: {exc}")
        return EXIT_ARGS_ERROR


if __name__ == "__main__":
    sys.exit(main())
