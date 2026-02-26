#!/bin/bash
cd "$(dirname "$0")"
if [ -f .pid ]; then
  kill $(cat .pid) 2>/dev/null
  rm .pid
  echo "Stopped"
else
  echo "Not running"
fi
