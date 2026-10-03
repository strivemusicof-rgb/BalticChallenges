@echo off
set CI=1
cd /d "%~dp0apps\mobile"
npx expo start --lan
