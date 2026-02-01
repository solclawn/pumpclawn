#!/usr/bin/env bash
set -euo pipefail
systemctl --user restart solclaw-api.service
systemctl --user restart solclaw-web.service
