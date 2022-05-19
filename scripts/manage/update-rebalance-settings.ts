import { ethers } from 'hardhat'
import getDeployment from '../../utils/get-deployment'
import { RebalanceSettingsStruct } from '../../typechain-types/HousecatManagement'

const gasPrice = ethers.utils.parseUnits('50', 'gwei')

const main = async () => {
  const deployment = getDeployment()
  const [owner] = await ethers.getSigners()
  const mgmt = await ethers.getContractAt('HousecatManagement', deployment.addresses.HousecatManagement)
  const queries = await ethers.getContractAt('HousecatQueries', deployment.addresses.HousecatQueries)
  const percent100 = await queries.getPercent100()
  const currentSettings = await mgmt.getRebalanceSettings()
  const newSettings: RebalanceSettingsStruct = {
    ...currentSettings,
    maxSlippage: percent100.div(50),
    minSecondsBetweenRebalances: 30,
  }
  await mgmt.connect(owner).updateRebalanceSettings(newSettings, { gasPrice })
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
