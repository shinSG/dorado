#!/bin/bash
# detect-env.sh — Dorado 环境探测脚本
# 在本地运行，输出 JSON 环境信息

set -e

echo "{"
echo '  "os": "'"$(uname -s)"'",'
echo '  "arch": "'"$(uname -m)"'",'

# rustup / rustc / cargo
if command -v rustup &>/dev/null; then
    echo '  "rustup": "'"$(rustup --version 2>/dev/null | head -1)"'",'
    echo '  "rustc": "'"$(rustc --version 2>/dev/null)"'",'
    echo '  "cargo": "'"$(cargo --version 2>/dev/null)"'",'
    echo '  "toolchains": "'"$(rustup toolchain list 2>/dev/null | tr '\n' '; ')"'",'
    echo '  "components": "'"$(rustup component list --installed 2>/dev/null | tr '\n' '; ')"'",'
else
    echo '  "rustup": null,'
    echo '  "rustc": null,'
    echo '  "cargo": null,'
    echo '  "toolchains": null,'
    echo '  "components": null,'
fi

# Helper tools
echo '  "cargo_watch": '"$(command -v cargo-watch &>/dev/null && echo true || echo false)"','
echo '  "cargo_nextest": '"$(command -v cargo-nextest &>/dev/null && echo true || echo false)"','
echo '  "lld_available": '"$(command -v lld &>/dev/null && echo true || echo false)"','

# System deps
echo '  "cc": '"$(command -v cc &>/dev/null && echo true || echo false)"','
echo '  "cmake": '"$(command -v cmake &>/dev/null && echo true || echo false)"','
echo '  "pkg_config": '"$(command -v pkg-config &>/dev/null && echo true || echo false)"''
echo "}"
