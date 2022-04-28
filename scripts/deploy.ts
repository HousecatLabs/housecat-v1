import { ethers } from 'hardhat'
import { deployHousecat, deployQueries } from '../utils/deploy-contracts'
import polygon from '../utils/addresses/polygon'

const gasPrice = ethers.utils.parseUnits('50', 'gwei')

const main = async () => {
  const [owner] = await ethers.getSigners()

  const { mgmt, factory, poolTemplate, adapters } = await deployHousecat({
    signer: owner,
    weth: polygon.assets.wmatic.addr,
    assets: Object.values(polygon.assets).map((x) => x.addr),
    assetsMeta: Object.values(polygon.assets).map((x) => ({
      decimals: x.decimals,
      priceFeed: x.priceFeed,
    })),
    integrations: [polygon.uniswapV2Routers.quickswap, polygon.uniswapV2Routers.sushiswap],
    gasPrice,
  })

  console.log('HousecatManagement:', mgmt.address)
  console.log('HousecatFactory:', factory.address)
  console.log('HousecatPool:', poolTemplate.address)
  console.log('uniswapV2Adapter:', adapters.uniswapV2Adapter.address)
  console.log('aaveV2Adapter:', adapters.aaveV2Adapter.address)

  const queries = await deployQueries(owner, gasPrice)
  console.log('HousecatQueries:', queries.address)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
