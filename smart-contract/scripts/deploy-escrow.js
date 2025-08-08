const { ethers } = require("hardhat");
async function main() {
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  if (balance < ethers.parseEther("0.01")) {
  }
  // Deploy the contract
  const EscrowFixed = await ethers.getContractFactory("EscrowFixed");
  const escrow = await EscrowFixed.deploy();
  await escrow.waitForDeployment();
  const contractAddress = await escrow.getAddress();
  // Verify deployment
  try {
    // Test basic functions
    const owner = await escrow.owner();
    const escrowCounter = await escrow.escrowCounter();
    const contractBalance = await escrow.getContractBalance();
    // Test admin functions
    const isOwnerAdmin = await escrow.isAdmin(owner);
    // Get contract stats
    const [totalEscrows, totalAdminProcessed, balance] = await escrow.getContractStats();
  } catch (error) {
    console.error("❌ Contract verification failed:", error.message);
  }
  // Save deployment info
  const deploymentInfo = {
    contractName: "EscrowFixed",
    contractAddress: contractAddress,
    deployer: deployer.address,
    deployerBalance: ethers.formatEther(balance),
    network: network.name,
    chainId: network.config.chainId,
    deploymentTime: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
    features: {
      adminReleaseFunds: true,
      adminRefund: true,
      batchProcessing: true,
      adminTracking: true,
      disputeResolution: true
    }
  };
  if (network.name === "sepolia") {
  } else if (network.name === "mainnet") {
  }
  // Write deployment info to file
  const fs = require('fs');
  const deploymentPath = `./deployments/${network.name}-escrow-deployment.json`;
  // Create deployments directory if it doesn't exist
  if (!fs.existsSync('./deployments')) {
    fs.mkdirSync('./deployments');
  }
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
}
// Error handling
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
