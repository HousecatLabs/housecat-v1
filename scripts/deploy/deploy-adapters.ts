import { ethers } from 'hardhat'
import { deployAdapters } from '../../utils/deploy-contracts'
import getDeployment from '../../utils/get-deployment'

const gasPrice = ethers.utils.parseUnits('50', 'gwei')

const main = async () => {
  const [owner] = await ethers.getSigners()
  const deployment = getDeployment()
  const mgmt = await ethers.getContractAt('HousecatManagement', deployment.addresses.HousecatManagement)
  const adapters = await deployAdapters(owner, gasPrice)
  for (const adapter of Object.values(adapters)) {
    await mgmt.connect(owner).setAdapter(adapter.address, true)
  }
  console.log('WETHAdapter:', adapters.wethAdapter.address)
  console.log('UniswapV2Adapter:', adapters.uniswapV2Adapter.address)
  console.log('AaveV2Adapter:', adapters.aaveV2Adapter.address)
  console.log('WithdrawAdapter:', adapters.withdrawAdapter.address)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
