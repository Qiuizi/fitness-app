@echo off
echo Starting Backend Server (nodemon)...
cd server
start cmd /k "npm run dev"
echo Starting Frontend Application...
cd ../client
start cmd /k "npm start"
echo Fitness App is starting!
echo Backend will run on http://localhost:5000
echo Frontend will run on http://localhost:3000
pause