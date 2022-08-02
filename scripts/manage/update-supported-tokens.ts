import { ethers } from 'hardhat'
import polygon from '../../utils/addresses/polygon'
import getDeployment from '../../utils/get-deployment'

const gasPrice = ethers.utils.parseUnits('50', 'gwei')

const main = async () => {
  const deployment = getDeployment()
  const [owner] = await ethers.getSigners()
  const assets = Object.values(polygon.assets).map((x) => x.addr)
  const assetsMeta = Object.values(polygon.assets).map((x) => ({
    decimals: x.decimals,
    priceFeed: x.priceFeed,
    delisted: x.delisted ? x.delisted : false,
  }))

  const mgmt = await ethers.getContractAt('HousecatManagement', deployment.addresses.HousecatManagement)
  await (await mgmt.connect(owner).setSupportedAssets(assets, { gasPrice })).wait()
  console.log('supported assets updated')

  await (await mgmt.connect(owner).setTokenMetaMany(assets, assetsMeta, { gasPrice })).wait()
  console.log('token meta data updated')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
