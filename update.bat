@echo off
echo ========================================
echo  10 Year Gov — Update Data + Push
echo ========================================
echo.
echo [1/3] Converting CSV to JSON...
node convert-data.js
if errorlevel 1 (
    echo ERROR: Conversion failed!
    pause
    exit /b 1
)
echo.
echo [2/3] Staging files...
git add -A
echo.
echo [3/3] Committing and pushing...
git commit -m "Update data %date% %time%"
git push
echo.
echo ========================================
echo  Done! Changes pushed to GitHub.
echo ========================================
pause
