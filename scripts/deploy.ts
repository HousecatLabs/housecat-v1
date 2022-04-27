import { ethers } from 'hardhat'
import { deployHousecat } from '../utils/deploy-contracts'
import polygon from '../utils/addresses/polygon'

const gasPrice = ethers.utils.parseUnits('35', 'gwei')


const main = async () => {
  const [owner] = await ethers.getSigners()

  const { mgmt, factory, poolTemplate } = await deployHousecat({
    signer: owner,
    weth: polygon.assets.wmatic.addr,
    assets: Object.values(polygon.assets).map(x => x.addr),
    assetsMeta: Object.values(polygon.assets).map(x => ({
      decimals: x.decimals,
      priceFeed: x.priceFeed,
    })),
    integrations: [
      polygon.uniswapV2Routers.quickswap,
      polygon.uniswapV2Routers.sushiswap,
    ],
    gasPrice
  })

  console.log('HousecatManagement:', mgmt.address)
  console.log('HousecatFactory:', factory.address)
  console.log('HousecatPool:', poolTemplate.address)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
