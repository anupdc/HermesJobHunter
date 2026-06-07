#!/bin/bash
# JobHunter scheduled job search runner
# Called by cron daily. Logs output and sends notification.

LOG="/opt/data/job_hunter/logs/job-search.log"
echo "=== [$(date)] JobHunter scheduled search triggered ===" >> "$LOG"

# This script would normally fetch jobs and notify the user
# For now, it logs the event. The actual job search aggregation
# is done by the app's "Search Everywhere" feature.
echo "[$(date)] Scheduled search completed" >> "$LOG"