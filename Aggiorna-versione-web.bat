@echo off
chcp 65001 >nul
title Aggiorna la versione web di Dungeon Companion
cd /d "%~dp0"

echo ==============================================
echo   Dungeon Companion - aggiornamento versione web
echo ==============================================
echo.

where npm >nul 2>nul
if errorlevel 1 goto nonode

echo [1/3] Scarico le ultime modifiche da GitHub...
where git >nul 2>nul
if errorlevel 1 goto nogit
git pull
if errorlevel 1 goto pullfail
goto install

:nogit
echo Git non trovato: salto questo passo.
echo Se hai modifiche nuove, apri GitHub Desktop e premi Fetch origin e poi Pull origin.
goto install

:pullfail
echo.
echo Non sono riuscito a scaricare le modifiche da GitHub.
echo Apri GitHub Desktop, premi Fetch origin e poi Pull origin, quindi rilancia questo file.
goto fine

:install
echo.
echo [2/3] Installo i componenti necessari...
call npm install --no-audit --no-fund
if errorlevel 1 goto errore

echo.
echo [3/3] Compilo l'app e la pubblico su Cloudflare...
echo Se si apre il browser per accedere a Cloudflare, accetta.
call npm run deploy:web
if errorlevel 1 goto errore

echo.
echo ==============================================
echo   FATTO! La versione web e' aggiornata.
echo   Apri l'indirizzo workers.dev che trovi qui sopra.
echo ==============================================
goto fine

:nonode
echo Node.js non e' installato o non e' raggiungibile.
echo Installalo da https://nodejs.org e riprova.
goto fine

:errore
echo.
echo ATTENZIONE: qualcosa e' andato storto.
echo Copia il testo rosso qui sopra e mandalo a Claude.

:fine
echo.
pause
