#!/usr/bin/env python3
"""
Asset Migration Pipeline

Copies raw assets to Remotion's public directory and generates TypeScript resource maps.

Usage:
    python migrate_assets.py
    python migrate_assets.py --raws raws --public template-project/public
    python migrate_assets.py --resources manifests/resources.yaml --durations raws/audio/vo/durations.json

Generates:
    - template-project/src/lib/resourceMap.ts
    - template-project/src/lib/constants.ts
    - template-project/src/lib/timing.ts
"""

import argparse
import json
import os
import shutil
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    import yaml
except ImportError:
    yaml = None


def load_yaml(path: str) -> Dict[str, Any]:
    """Load YAML file, with fallback if PyYAML not installed."""
    if yaml is None:
        print("Warning: PyYAML not installed, using JSON fallback", file=sys.stderr)
        # Try to load as JSON if it's a .json file
        json_path = path.replace('.yaml', '.json').replace('.yml', '.json')
        if Path(json_path).exists():
            with open(json_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        raise ImportError("Install PyYAML: pip install pyyaml")

    with open(path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)


def copy_assets(raws_dir: str, public_dir: str) -> List[str]:
    """
    Copy all assets from raws to public directory.

    Args:
        raws_dir: Source directory
        public_dir: Destination directory

    Returns:
        List of copied file paths (relative to public_dir)
    """
    copied = []
    raws_path = Path(raws_dir)
    public_path = Path(public_dir)

    # Create public directory
    public_path.mkdir(parents=True, exist_ok=True)

    for root, dirs, files in os.walk(raws_path):
        # Skip hidden directories
        dirs[:] = [d for d in dirs if not d.startswith('.')]

        for file in files:
            # Skip hidden files and certain patterns
            if file.startswith('.') or file.endswith('.DS_Store'):
                continue

            src = Path(root) / file
            rel_path = src.relative_to(raws_path)
            dst = public_path / rel_path

            # Create directory if needed
            dst.parent.mkdir(parents=True, exist_ok=True)

            # Copy file
            shutil.copy2(src, dst)
            copied.append(str(rel_path))

    return copied


def generate_resource_map(
    resources: Dict[str, Any],
    durations: Dict[str, int],
    output_path: str,
    raws_dir: Optional[str] = None,
) -> None:
    """
    Generate TypeScript resource map file.

    Args:
        resources: Parsed resources.yaml content
        durations: VO durations in milliseconds
        output_path: Output TypeScript file path
        raws_dir: Raw assets directory for scanning BGM/SFX files
    """
    lines = [
        '/**',
        ' * Auto-generated resource map',
        ' * DO NOT EDIT MANUALLY - regenerate with migrate_assets.py',
        ' */',
        '',
        "import { staticFile } from 'remotion';",
        '',
    ]

    # Extract visual resources
    visuals = resources.get('resources', {}).get('visual', [])
    if visuals:
        lines.append('// Image resources')
        lines.append('export const IMAGES = {')
        for vis in visuals:
            if vis.get('path'):
                key = vis.get('id', '').replace('vis_', '')
                if not key:
                    key = Path(vis['path']).stem
                path = vis['path'].replace('\\', '/')
                lines.append(f"  {key}: staticFile('{path}'),")
        lines.append('} as const;')
        lines.append('')

    # Extract audio resources
    audios = resources.get('resources', {}).get('audio', [])
    if audios:
        lines.append('// Audio resources')
        lines.append('export const AUDIO = {')
        for aud in audios:
            if aud.get('path'):
                key = aud.get('id', '').replace('aud_', '')
                if not key:
                    key = Path(aud['path']).stem
                path = aud['path'].replace('\\', '/')
                lines.append(f"  {key}: staticFile('{path}'),")
        lines.append('} as const;')
        lines.append('')

    # Voiceover resources
    if durations:
        lines.append('// Voiceover resources')
        lines.append('export const VOICEOVER = {')
        for vo_id in sorted(durations.keys()):
            path = f'audio/vo/{vo_id}.wav'
            lines.append(f"  {vo_id}: staticFile('{path}'),")
        lines.append('} as const;')
        lines.append('')

        # Durations
        lines.append('// Voiceover durations in milliseconds')
        lines.append('export const VO_DURATIONS: Record<keyof typeof VOICEOVER, number> = {')
        for vo_id, duration in sorted(durations.items()):
            lines.append(f"  {vo_id}: {duration},")
        lines.append('};')
        lines.append('')

    # BGM resources
    bgm_files = []
    if raws_dir:
        bgm_dir = Path(raws_dir) / 'audio' / 'bgm'
        if bgm_dir.is_dir():
            bgm_files = sorted(
                f for f in bgm_dir.iterdir()
                if f.is_file() and not f.name.startswith('.')
            )
    if bgm_files:
        lines.append('// BGM resources')
        lines.append('export const BGM = {')
        for f in bgm_files:
            key = f.stem.replace('-', '_').replace(' ', '_')
            rel = f'audio/bgm/{f.name}'
            lines.append(f"  {key}: staticFile('{rel}'),")
        lines.append('} as const;')
        lines.append('')

    # SFX resources
    sfx_files = []
    if raws_dir:
        sfx_dir = Path(raws_dir) / 'audio' / 'sfx'
        if sfx_dir.is_dir():
            sfx_files = sorted(
                f for f in sfx_dir.iterdir()
                if f.is_file() and not f.name.startswith('.')
            )
    if sfx_files:
        lines.append('// SFX resources')
        lines.append('export const SFX = {')
        for f in sfx_files:
            key = f.stem.replace('-', '_').replace(' ', '_')
            rel = f'audio/sfx/{f.name}'
            lines.append(f"  {key}: staticFile('{rel}'),")
        lines.append('} as const;')
        lines.append('')

    # Type exports
    lines.append('// Type exports')
    if visuals:
        lines.append('export type ImageKey = keyof typeof IMAGES;')
    if audios:
        lines.append('export type AudioKey = keyof typeof AUDIO;')
    if durations:
        lines.append('export type VoiceoverKey = keyof typeof VOICEOVER;')
    if bgm_files:
        lines.append('export type BgmKey = keyof typeof BGM;')
    if sfx_files:
        lines.append('export type SfxKey = keyof typeof SFX;')

    # Write file
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    print(f"Generated: {output_path}")


def generate_constants(output_path: str) -> None:
    """Generate constants.ts with color palette and typography."""
    content = '''/**
 * Project constants
 * Generated by migrate_assets.py
 */

// Video specifications
export const VIDEO_CONFIG = {
  width: 1920,
  height: 1080,
  fps: 30,
} as const;

// Color palette
export const COLORS = {
  // Primary colors
  primary: '#3B82F6',
  secondary: '#10B981',
  accent: '#8B5CF6',

  // Backgrounds
  bgDark: '#0F172A',
  bgLight: '#F8FAFC',
  flatGray: '#F1F5F9',
  flatBlue: '#DBEAFE',
  flatGreen: '#DCFCE7',
  flatYellow: '#FEF3C7',
  flatRed: '#FEE2E2',

  // Text colors (for light backgrounds)
  textDark: '#020617',
  textPrimary: '#0F172A',
  textSecondary: '#334155',

  // Text colors (for dark backgrounds)
  textLight: '#F8FAFC',
  textMuted: '#94A3B8',

  // Semantic colors
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
} as const;

// Typography
export const FONTS = {
  primary: 'Inter, system-ui, sans-serif',
  mono: 'JetBrains Mono, monospace',
  display: 'Plus Jakarta Sans, sans-serif',
} as const;

// Font sizes for 1080p
export const FONT_SIZES = {
  title: 72,        // Main titles
  subtitle: 48,     // Section headers
  heading: 36,      // Card headers
  body: 24,         // Body text
  caption: 18,      // Annotations
  code: 20,         // Code blocks
} as const;

// FPS constant
export const FPS = VIDEO_CONFIG.fps;
'''

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Generated: {output_path}")


def generate_timing(output_path: str) -> None:
    """Generate timing.ts with frame calculation utilities."""
    content = '''/**
 * Frame calculation utilities
 * Generated by migrate_assets.py
 */
import { VO_DURATIONS } from './resourceMap';
import { FPS } from './constants';

/**
 * Convert seconds to frames (always integer)
 */
export function secToFrames(sec: number): number {
  return Math.round(sec * FPS);
}

/**
 * Convert milliseconds to frames (always integer)
 */
export function msToFrames(ms: number): number {
  return Math.round((ms / 1000) * FPS);
}

/**
 * Ensure minimum 1-frame duration (prevents interpolate errors)
 */
export function safeDuration(frames: number): number {
  return Math.max(frames, 1);
}

/**
 * Calculate shot duration from voiceover references
 * @param voIds Array of voiceover IDs
 * @param bufferMs Additional buffer time in ms (default 700)
 */
export function calculateShotDuration(
  voIds: (keyof typeof VO_DURATIONS)[],
  bufferMs = 700
): number {
  const totalVoMs = voIds.reduce((sum, id) => sum + (VO_DURATIONS[id] || 0), 0);
  return msToFrames(totalVoMs + bufferMs);
}

/**
 * Calculate cumulative start frame for a shot
 * @param shotIndex Zero-based shot index
 * @param shotDurations Array of shot durations in frames
 */
export function calculateShotStart(
  shotIndex: number,
  shotDurations: number[]
): number {
  return shotDurations.slice(0, shotIndex).reduce((sum, d) => sum + d, 0);
}
'''

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Generated: {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Migrate assets and generate TypeScript resource maps"
    )
    parser.add_argument(
        "--raws", default="raws",
        help="Raw assets directory (default: raws)"
    )
    parser.add_argument(
        "--public", default="template-project/public",
        help="Remotion public directory (default: template-project/public)"
    )
    parser.add_argument(
        "--resources", default="manifests/resources.yaml",
        help="Resources YAML file (default: manifests/resources.yaml)"
    )
    parser.add_argument(
        "--durations", default="raws/audio/vo/durations.json",
        help="VO durations JSON file (default: raws/audio/vo/durations.json)"
    )
    parser.add_argument(
        "--output-dir", default="template-project/src/lib",
        help="Output directory for TypeScript files (default: template-project/src/lib)"
    )
    parser.add_argument(
        "--skip-copy", action="store_true",
        help="Skip asset copying, only generate TypeScript files"
    )

    args = parser.parse_args()

    try:
        # Step 1: Copy assets
        if not args.skip_copy:
            if not Path(args.raws).is_dir():
                print(f"Error: Raws directory '{args.raws}' not found", file=sys.stderr)
                sys.exit(1)

            print(f"Copying assets from {args.raws} to {args.public}...")
            copied = copy_assets(args.raws, args.public)
            print(f"  Copied {len(copied)} files")

        # Step 2: Load resources.yaml
        resources = {}
        if Path(args.resources).exists():
            print(f"Loading resources from {args.resources}...")
            resources = load_yaml(args.resources)
        else:
            print(f"Warning: {args.resources} not found, generating minimal resource map", file=sys.stderr)

        # Step 3: Load durations.json
        durations = {}
        if Path(args.durations).exists():
            print(f"Loading durations from {args.durations}...")
            with open(args.durations, 'r', encoding='utf-8') as f:
                durations = json.load(f)
        else:
            print(f"Warning: {args.durations} not found, no VO durations will be generated", file=sys.stderr)

        # Step 4: Generate TypeScript files
        output_dir = Path(args.output_dir)

        generate_resource_map(
            resources,
            durations,
            str(output_dir / "resourceMap.ts"),
            raws_dir=args.raws,
        )

        generate_constants(str(output_dir / "constants.ts"))

        generate_timing(str(output_dir / "timing.ts"))

        # Summary
        print("\n" + "=" * 50)
        print("Asset migration complete!")
        print("=" * 50)
        if durations:
            total_ms = sum(durations.values())
            print(f"VO files: {len(durations)}")
            print(f"Total VO duration: {total_ms}ms ({total_ms/1000:.1f}s)")
        print(f"\nGenerated files in {args.output_dir}:")
        print("  - resourceMap.ts")
        print("  - constants.ts")
        print("  - timing.ts")
        print("\nNext step: Run 'npx tsc --noEmit' to verify TypeScript")

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
