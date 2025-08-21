@echo off
echo Installing Overlap app on all running emulators...
echo.

echo Step 1: Installing development build on each emulator (one at a time)...
echo.

echo Installing on TestUser1...
npx expo run:android --device TestUser1
echo TestUser1 installation complete!
echo.

echo Installing on TestUser2... 
npx expo run:android --device TestUser2
echo TestUser2 installation complete!
echo.

echo Installing on TestUser3...
npx expo run:android --device TestUser3
echo TestUser3 installation complete!
echo.

echo Step 2: Starting Metro bundler for all devices...
echo Press Ctrl+C to stop the development server when done testing.
echo.
npx expo start --android

pause