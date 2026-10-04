#!/usr/bin/env bash
# Point canonical, hreflang, og:url/og:image, sitemap and robots.txt at the final domain.
# Usage: scripts/set-domain.sh https://kafala.example.om
set -euo pipefail
cd "$(dirname "$0")/.."
NEW="${1:?Usage: scripts/set-domain.sh https://your-domain}"
NEW="${NEW%/}"
case "$NEW" in https://*) ;; *) echo "Domain must start with https://" >&2; exit 1 ;; esac
OLD=$(grep -oE 'rel="canonical" href="https://[^/"]+' index.html | sed 's/.*href="//')
[ "$OLD" = "$NEW" ] && { echo "Already set to $NEW"; exit 0; }
FILES=(index.html en/index.html robots.txt sitemap.xml)
for f in "${FILES[@]}"; do
  sed -i.bak "s#${OLD}#${NEW}#g" "$f" && rm -f "$f.bak"
done
echo "Replaced $OLD -> $NEW in: ${FILES[*]}"
grep -c "$NEW" "${FILES[@]}"
