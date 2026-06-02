#!/bin/bash
# Download all home-linked pages in 10 chunks (does not modify index.html).
set -e
cd "$(dirname "$0")/.."
node brother_offline/scrape-linked-pages.js --discover
for i in $(seq 1 10); do
  echo "========== Chunk $i/10 =========="
  node brother_offline/scrape-linked-pages.js --chunk "$i/10"
done
node brother_offline/scrape-linked-pages.js --audit
