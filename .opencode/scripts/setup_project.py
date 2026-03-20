#!/usr/bin/env python3
"""
Remotion Project Setup Script

Copies the bundled Remotion template, installs dependencies,
and configures the browser for rendering.

Usage:
    python setup_project.py
    python setup_project.py --output my-video-project
    python setup_project.py --skip-browser --extras lottie,charts

Requirements:
    - Node.js 18+
    - npm
"""

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import List, Optional


# Template source directory (bundled in repo)
TEMPLATE_DIR = Path(__file__).resolve().parent.parent.parent / "templates" / "template-project"

# Extra package mappings
EXTRA_PACKAGES = {
    "lottie": ["@remotion/lottie", "lottie-web"],
    "3d": ["@remotion/three", "three", "@react-three/fiber"],
    "maps": ["@remotion/mapbox"],
    "charts": ["recharts"],
    "gif": ["@remotion/gif"],
    "captions": ["@remotion/captions"],
}


def run_command(
    cmd: List[str],
    cwd: Optional[str] = None,
    check: bool = True,
    capture: bool = False
) -> subprocess.CompletedProcess:
    """Run a command with optional directory and error checking."""
    print(f">>> {' '.join(cmd)}")
    result = subprocess.run(
        cmd,
        cwd=cwd,
        capture_output=capture,
        text=True,
    )
    if check and result.returncode != 0:
        if capture:
            print(f"Error: {result.stderr}", file=sys.stderr)
        raise RuntimeError(f"Command failed with code {result.returncode}")
    return result


def copy_template(output_dir: str) -> None:
    """Copy the bundled Remotion template to the output directory."""
    if not TEMPLATE_DIR.is_dir():
        print(f"Error: Template directory not found: {TEMPLATE_DIR}", file=sys.stderr)
        sys.exit(1)

    print(f"Copying template from {TEMPLATE_DIR}...")
    shutil.copytree(str(TEMPLATE_DIR), output_dir)
    print(f"Template copied to {output_dir}")


def install_dependencies(project_dir: str) -> None:
    """Install project dependencies with npm."""
    print("Installing dependencies with npm...")
    run_command(["npm", "install"], cwd=project_dir)


def install_browser(project_dir: str) -> None:
    """Install Chromium browser for rendering."""
    print("Installing browser for rendering...")

    # Try the template's browser install script first
    browser_script = Path(project_dir) / "scripts" / "browser_install.sh"
    if browser_script.exists():
        run_command(["sh", str(browser_script)], cwd=project_dir, check=False)
    else:
        # Fallback to remotion browser ensure
        run_command(["npx", "remotion", "browser", "ensure"], cwd=project_dir)


def install_extras(project_dir: str, extras: List[str]) -> None:
    """Install extra packages based on project requirements."""
    packages_to_install = []

    for extra in extras:
        extra = extra.lower().strip()
        if extra in EXTRA_PACKAGES:
            packages_to_install.extend(EXTRA_PACKAGES[extra])
        else:
            print(f"Warning: Unknown extra '{extra}', skipping", file=sys.stderr)

    if packages_to_install:
        print(f"Installing extra packages: {', '.join(packages_to_install)}")
        run_command(["npm", "install"] + packages_to_install, cwd=project_dir)


def verify_setup(project_dir: str) -> bool:
    """Verify the setup by running type check."""
    print("Verifying setup...")
    result = run_command(
        ["npx", "tsc", "--noEmit"],
        cwd=project_dir,
        check=False,
        capture=True
    )
    if result.returncode == 0:
        print("Type check passed!")
        return True
    else:
        print("Warning: Type check had errors:", file=sys.stderr)
        print(result.stdout, file=sys.stderr)
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Set up a Remotion video project"
    )
    parser.add_argument(
        "--output", "-o", default="template-project",
        help="Output directory name (default: template-project)"
    )
    parser.add_argument(
        "--skip-browser", action="store_true",
        help="Skip browser installation"
    )
    parser.add_argument(
        "--extras", "-e",
        help="Comma-separated extra packages to install (lottie,3d,maps,charts,gif,captions)"
    )
    parser.add_argument(
        "--skip-verify", action="store_true",
        help="Skip verification step"
    )

    args = parser.parse_args()

    # Check if output directory already exists
    if Path(args.output).exists():
        print(f"Error: Directory '{args.output}' already exists", file=sys.stderr)
        sys.exit(1)

    try:
        # Step 1: Copy template
        copy_template(args.output)

        # Step 2: Install dependencies
        install_dependencies(args.output)

        # Step 3: Install browser
        if not args.skip_browser:
            install_browser(args.output)

        # Step 4: Install extras
        if args.extras:
            extras = [e.strip() for e in args.extras.split(",")]
            install_extras(args.output, extras)

        # Step 5: Verify
        if not args.skip_verify:
            verify_setup(args.output)

        # Success
        print("\n" + "=" * 50)
        print("Setup complete!")
        print("=" * 50)
        print(f"\nProject directory: {args.output}")
        print("\nNext steps:")
        print(f"  cd {args.output}")
        print("  npm run dev")
        print("\nThis will start the Remotion Studio at http://localhost:3000")

    except Exception as e:
        print(f"\nError: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
