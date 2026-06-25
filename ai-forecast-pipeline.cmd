@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0ai-forecast-pipeline.ps1" %*
