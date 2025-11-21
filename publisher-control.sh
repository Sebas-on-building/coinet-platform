#!/bin/bash
# publisher-control.sh - Control script for the AutomatedNewsPublisher service

PUBLISHER_PROCESS="node /Users/sebastian/Desktop/Arbeit/Coinet/dist/publisher.js"

start_publisher() {
  echo "Starting AutomatedNewsPublisher service..."
  node publish.js &
  echo "Service started. Run '$0 status' to check status."
}

stop_publisher() {
  echo "Stopping AutomatedNewsPublisher service..."
  pkill -f "$PUBLISHER_PROCESS"
  echo "Service stopped."
}

restart_publisher() {
  stop_publisher
  sleep 1
  start_publisher
}

status_publisher() {
  if pgrep -f "$PUBLISHER_PROCESS" > /dev/null; then
    echo "AutomatedNewsPublisher service is RUNNING"
    ps aux | grep "$PUBLISHER_PROCESS" | grep -v grep
  else
    echo "AutomatedNewsPublisher service is NOT RUNNING"
  fi
}

view_logs() {
  if [ -d "auto-generated-articles" ]; then
    echo "Recent articles generated:"
    ls -lat auto-generated-articles | head -10
  else
    echo "No articles directory found."
  fi
  
  if [ -f "publishing-history.json" ]; then
    echo -e "\nPublishing history:"
    cat publishing-history.json | head -20
  else
    echo -e "\nNo publishing history found."
  fi
}

case "$1" in
  start)
    start_publisher
    ;;
  stop)
    stop_publisher
    ;;
  restart)
    restart_publisher
    ;;
  status)
    status_publisher
    ;;
  logs)
    view_logs
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status|logs}"
    exit 1
    ;;
esac

exit 0 