import { ethers } from 'hardhat'
import polygon from '../utils/addresses/polygon'

const gasPrice = ethers.utils.parseUnits('50', 'gwei')

const mgmtAddress = '0xca8284CD96C93B317C9ABFB6f91d627CCb8B8118'

const main = async () => {
  const [owner] = await ethers.getSigners()

  const assets = Object.values(polygon.assets).map((x) => x.addr)
  const assetsMeta = Object.values(polygon.assets).map((x) => ({
    decimals: x.decimals,
    priceFeed: x.priceFeed,
  }))

  const mgmt = await ethers.getContractAt('HousecatManagement', mgmtAddress)
  await (await mgmt.connect(owner).setSupportedAssets(assets, { gasPrice })).wait()
  console.log('supported assets updated')

  await (await mgmt.connect(owner).setTokenMetaMany(assets, assetsMeta, { gasPrice })).wait()
  console.log('token meta data updated')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
