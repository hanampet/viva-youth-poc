#!/bin/bash
cd "$(dirname "$0")"
nohup npm run dev > /dev/null 2>&1 &
echo $! > .pid
echo "Started (PID: $!)"
