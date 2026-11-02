@echo off
setlocal
cd /d "%~dp0"
title Aggiorna la versione web di Dungeon Companion
echo ================================================
echo  Aggiornamento della versione web (Cloudflare)
echo ================================================
echo.
if not exist package.json (
  echo ERRORE: questo file deve stare nella cartella principale del progetto,
  echo quella dove c'e' anche il file package.json.
  goto fine
)
where node >nul 2>nul
if errorlevel 1 (
  echo ERRORE: Node.js non e' installato o non e' raggiungibile.
  goto fine
)
where git >nul 2>nul
if not errorlevel 1 (
  echo Passo 0/2: scarico gli ultimi file da GitHub...
  git pull
  echo.
)
echo Passo 1/2: preparo i componenti ^(puo' richiedere un minuto^)...
call npm install
if errorlevel 1 goto errore
echo.
echo Passo 2/2: compilo l'app e la pubblico su Cloudflare...
echo ^(se si apre il browser per accedere a Cloudflare, conferma l'accesso^)
call npm run deploy:web
if errorlevel 1 goto errore
echo.
echo ================================================
echo  FATTO! La versione web e' aggiornata.
echo ================================================
goto fine
:errore
echo.
echo ================================================
echo  Qualcosa e' andato storto. Copia il testo qui sopra
echo  e mandalo a Claude: lo sistema lui.
echo ================================================
:fine
echo.
pause
