#!/usr/bin/env python3
"""
Environment validation script for Remotion video production.
Checks all required tools, packages, and environment variables.
"""

import subprocess
import sys
import os
import json
import shutil
from dataclasses import dataclass, field
from typing import Optional, List, Tuple
from enum import Enum


class Status(Enum):
    OK = "ok"
    MISSING = "missing"
    OUTDATED = "outdated"
    ERROR = "error"


@dataclass
class CheckResult:
    name: str
    status: Status
    version: Optional[str] = None
    required_version: Optional[str] = None
    message: Optional[str] = None
    install_command: Optional[str] = None
    category: str = "tool"


@dataclass
class EnvCheckReport:
    os_info: str = ""
    results: List[CheckResult] = field(default_factory=list)

    @property
    def all_passed(self) -> bool:
        critical = [r for r in self.results if r.category in ("tool", "required_api")]
        return all(r.status == Status.OK for r in critical)

    @property
    def missing_items(self) -> List[CheckResult]:
        return [r for r in self.results if r.status != Status.OK]


def run_command(cmd: List[str], timeout: int = 10) -> Tuple[bool, str]:
    """Run a command and return (success, output)."""
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        return result.returncode == 0, result.stdout.strip()
    except FileNotFoundError:
        return False, ""
    except subprocess.TimeoutExpired:
        return False, "timeout"
    except Exception as e:
        return False, str(e)


def check_os() -> CheckResult:
    """Check operating system."""
    success, output = run_command(["uname", "-s"])
    if not success:
        return CheckResult("OS", Status.ERROR, message="Cannot determine OS")

    if output == "Darwin":
        os_name = "macOS"
        _, version = run_command(["sw_vers", "-productVersion"])
        return CheckResult("OS", Status.OK, version=f"{os_name} {version}")
    elif output == "Linux":
        _, distro = run_command(["lsb_release", "-d", "-s"])
        if not distro:
            distro = "Linux"
        return CheckResult("OS", Status.OK, version=distro)
    else:
        return CheckResult(
            "OS", Status.ERROR,
            version=output,
            message="Windows not supported. Use WSL2."
        )


def check_node() -> CheckResult:
    """Check Node.js installation and version."""
    success, output = run_command(["node", "--version"])
    if not success:
        return CheckResult(
            "Node.js", Status.MISSING,
            required_version=">=18.0.0",
            install_command="nvm install 20",
            category="tool"
        )

    try:
        major = int(output.lstrip("v").split(".")[0])
        if major < 18:
            return CheckResult(
                "Node.js", Status.OUTDATED,
                version=output,
                required_version=">=18.0.0",
                message="Version too old, need 18+",
                install_command="nvm install 20"
            )
        return CheckResult("Node.js", Status.OK, version=output)
    except ValueError:
        return CheckResult("Node.js", Status.OK, version=output)


def check_python() -> CheckResult:
    """Check Python installation and version."""
    success, output = run_command(["python3", "--version"])
    if not success:
        return CheckResult(
            "Python", Status.MISSING,
            required_version=">=3.9.0",
            install_command="pyenv install 3.11",
            category="tool"
        )

    try:
        version_str = output.split()[1]
        parts = version_str.split(".")
        major, minor = int(parts[0]), int(parts[1])
        if major < 3 or (major == 3 and minor < 9):
            return CheckResult(
                "Python", Status.OUTDATED,
                version=version_str,
                required_version=">=3.9.0",
                message="Version too old, need 3.9+",
                install_command="pyenv install 3.11"
            )
        return CheckResult("Python", Status.OK, version=version_str)
    except (ValueError, IndexError):
        return CheckResult("Python", Status.OK, version=output)


def check_ffmpeg() -> CheckResult:
    """Check ffmpeg installation."""
    if not shutil.which("ffmpeg"):
        return CheckResult(
            "ffmpeg", Status.MISSING,
            install_command="brew install ffmpeg (macOS) / apt install ffmpeg (Linux)",
            category="tool"
        )

    success, output = run_command(["ffmpeg", "-version"])
    if success:
        first_line = output.split("\n")[0] if output else ""
        version = first_line.split(" ")[2] if len(first_line.split(" ")) > 2 else "unknown"
        return CheckResult("ffmpeg", Status.OK, version=version)

    return CheckResult("ffmpeg", Status.OK, version="installed")


def check_ffprobe() -> CheckResult:
    """Check ffprobe installation."""
    if not shutil.which("ffprobe"):
        return CheckResult(
            "ffprobe", Status.MISSING,
            install_command="brew install ffmpeg (macOS) / apt install ffmpeg (Linux)",
            category="tool"
        )

    success, output = run_command(["ffprobe", "-version"])
    if success:
        first_line = output.split("\n")[0] if output else ""
        version = first_line.split(" ")[2] if len(first_line.split(" ")) > 2 else "unknown"
        return CheckResult("ffprobe", Status.OK, version=version)

    return CheckResult("ffprobe", Status.OK, version="installed")


def check_package_manager() -> CheckResult:
    """Check for npm, pnpm, or bun."""
    managers = [
        ("npm", ["npm", "--version"]),
        ("pnpm", ["pnpm", "--version"]),
        ("bun", ["bun", "--version"]),
    ]

    found = []
    for name, cmd in managers:
        success, version = run_command(cmd)
        if success:
            found.append(f"{name} {version}")

    if found:
        return CheckResult("Package Manager", Status.OK, version=", ".join(found))

    return CheckResult(
        "Package Manager", Status.MISSING,
        message="No package manager found",
        install_command="npm is included with Node.js",
        category="tool"
    )


def load_env_file(env_path: str = ".env") -> dict:
    """Load environment variables from .env file."""
    env_vars = {}
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip().strip('"').strip("'")
    return env_vars


def check_env_var(name: str, purpose: str, required: bool = False, env_vars: dict = None) -> CheckResult:
    """Check if environment variable is set (from os.environ or .env file)."""
    value = os.environ.get(name) or (env_vars or {}).get(name)
    category = "required_api" if required else "optional_api"

    if value:
        masked = value[:4] + "..." + value[-4:] if len(value) > 8 else "***"
        return CheckResult(name, Status.OK, version=masked, category=category)

    return CheckResult(
        name, Status.MISSING,
        message=purpose,
        install_command=f'Add {name}="your_key" to .env file',
        category=category
    )


def check_python_package(name: str, import_name: Optional[str] = None) -> CheckResult:
    """Check if Python package is installed."""
    import_name = import_name or name

    try:
        result = subprocess.run(
            ["python3", "-c", f"import {import_name}; print(getattr({import_name}, '__version__', 'installed'))"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            version = result.stdout.strip()
            return CheckResult(name, Status.OK, version=version, category="python_package")
    except Exception:
        pass

    return CheckResult(
        name, Status.MISSING,
        install_command=f"pip install {name}",
        category="python_package"
    )


def run_full_check(env_file: str = ".env") -> EnvCheckReport:
    """Run all environment checks."""
    report = EnvCheckReport()

    # Load .env file from workspace root
    env_vars = load_env_file(env_file)

    # OS Check
    os_result = check_os()
    report.results.append(os_result)
    report.os_info = os_result.version or "Unknown"

    # Core Tools
    report.results.append(check_node())
    report.results.append(check_python())
    report.results.append(check_ffmpeg())
    report.results.append(check_ffprobe())
    report.results.append(check_package_manager())

    # Environment Variables (check os.environ + .env file)
    pexels = check_env_var("PEXELS_API_KEY", "Image retrieval (Pexels)", required=False, env_vars=env_vars)
    pixabay = check_env_var("PIXABAY_API_KEY", "Image retrieval (Pixabay)", required=False, env_vars=env_vars)

    if pexels.status != Status.OK and pixabay.status != Status.OK:
        pexels.category = "required_api"
        pexels.message = "At least one image API required"

    report.results.append(pexels)
    report.results.append(pixabay)
    report.results.append(check_env_var("CARO_LLM_API_KEY", "Recommended: AI image generation (step-4)", required=False, env_vars=env_vars))
    report.results.append(check_env_var("FREESOUND_API_KEY", "Recommended: BGM/SFX retrieval (step-5)", required=False, env_vars=env_vars))

    # Python Packages
    packages = [
        ("PyMuPDF", "fitz"),
        ("pdfplumber", None),
        ("requests", None),
        ("edge-tts", "edge_tts"),
        ("Pillow", "PIL"),
        ("numpy", None),
        ("PyYAML", "yaml"),
        ("openai", "openai"),
        ("rembg", "rembg"),
        ("beautifulsoup4", "bs4"),
    ]
    for name, import_name in packages:
        report.results.append(check_python_package(name, import_name))

    return report


def format_report_chinese(report: EnvCheckReport) -> str:
    """Format report in Chinese."""
    lines = ["环境检查完成。", ""]

    lines.append("系统状态:")
    tool_results = [r for r in report.results if r.category == "tool" or r.name == "OS"]
    for r in tool_results:
        status_icon = "+" if r.status == Status.OK else "-"
        version_str = f": {r.version}" if r.version else ""
        lines.append(f"  {status_icon} {r.name}{version_str}")

    lines.append("")

    lines.append("API 密钥:")
    api_results = [r for r in report.results if "api" in r.category]
    for r in api_results:
        status_str = "已设置" if r.status == Status.OK else "未设置"
        lines.append(f"  {r.name}: {status_str}")

    lines.append("")

    lines.append("Python 包:")
    pkg_results = [r for r in report.results if r.category == "python_package"]
    for r in pkg_results:
        if r.status == Status.OK:
            lines.append(f"  {r.name}: {r.version}")
        else:
            lines.append(f"  {r.name}: 未安装")

    lines.append("")

    missing = report.missing_items
    if missing:
        lines.append("缺失项目:")
        for i, r in enumerate(missing, 1):
            msg = r.message or ""
            cmd = f" - 安装命令: {r.install_command}" if r.install_command else ""
            lines.append(f"  {i}. {r.name}{': ' + msg if msg else ''}{cmd}")
        lines.append("")
        lines.append("状态: 存在缺失项，请按照上述说明安装后重新检查。")
    else:
        lines.append("状态: 全部通过，可以开始视频制作。")

    return "\n".join(lines)


def format_report_json(report: EnvCheckReport) -> str:
    """Format report as JSON."""
    data = {
        "os": report.os_info,
        "all_passed": report.all_passed,
        "results": [
            {
                "name": r.name,
                "status": r.status.value,
                "version": r.version,
                "category": r.category,
                "message": r.message,
                "install_command": r.install_command,
            }
            for r in report.results
        ],
        "missing": [r.name for r in report.missing_items],
    }
    return json.dumps(data, indent=2, ensure_ascii=False)


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Environment validation for Remotion video production")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--quiet", "-q", action="store_true", help="Only show errors")
    parser.add_argument("--env-file", default=".env", help="Path to .env file (default: .env in cwd)")
    args = parser.parse_args()

    report = run_full_check(env_file=args.env_file)

    if args.json:
        print(format_report_json(report))
    elif args.quiet:
        if not report.all_passed:
            for r in report.missing_items:
                print(f"Missing: {r.name}")
    else:
        print(format_report_chinese(report))

    sys.exit(0 if report.all_passed else 1)


if __name__ == "__main__":
    main()
