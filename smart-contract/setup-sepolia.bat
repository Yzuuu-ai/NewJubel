@echo off
echo ========================================
echo   JUBEL ESCROW - SEPOLIA DEPLOYMENT
echo ========================================
echo.

echo [1/6] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [2/6] Checking .env configuration...
if not exist .env (
    echo WARNING: .env file not found!
    echo Please copy .env.example to .env and configure:
    echo - PRIVATE_KEY (your wallet private key)
    echo - SEPOLIA_RPC_URL (Infura/Alchemy endpoint)
    echo - ETHERSCAN_API_KEY (for contract verification)
    pause
    exit /b 1
)

echo.
echo [3/6] Compiling smart contract...
call npm run compile
if %errorlevel% neq 0 (
    echo ERROR: Failed to compile contract
    pause
    exit /b 1
)

echo.
echo [4/6] Running tests...
call npm run test
if %errorlevel% neq 0 (
    echo ERROR: Tests failed
    pause
    exit /b 1
)

echo.
echo [5/6] Deploying to Sepolia testnet...
call npm run deploy
if %errorlevel% neq 0 (
    echo ERROR: Deployment failed
    echo Please check:
    echo - Your wallet has Sepolia ETH (get from faucet)
    echo - RPC URL is correct
    echo - Private key is valid
    pause
    exit /b 1
)

echo.
echo [6/6] Contract verification (optional)...
echo To verify contract on Etherscan, run:
echo npm run verify CONTRACT_ADDRESS
echo.

echo ========================================
echo     SEPOLIA DEPLOYMENT COMPLETED!
echo ========================================
echo.
echo Network: Sepolia Testnet
echo Explorer: https://sepolia.etherscan.io
echo.
echo Next Steps:
echo 1. Copy contract address to server/.env
echo 2. Get Sepolia ETH from faucet for testing
echo 3. Test contract functions
echo 4. Integrate with backend API
echo.
pause