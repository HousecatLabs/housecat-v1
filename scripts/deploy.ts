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
    integrations: [
      polygon.uniswapV2Routers.quickswap,
      polygon.uniswapV2Routers.sushiswap,
      polygon.paraswapV5.AugustusSwapper,
    ],
    gasPrice,
  })

  console.log('HousecatManagement:', mgmt.address)
  console.log('HousecatFactory:', factory.address)
  console.log('HousecatPool:', poolTemplate.address)
  const queries = await deployQueries(owner, gasPrice)
  console.log('HousecatQueries:', queries.address)

  console.log('WETHAdapter:', adapters.wethAdapter.address)
  console.log('UniswapV2Adapter:', adapters.uniswapV2Adapter.address)
  console.log('AaveV2Adapter:', adapters.aaveV2Adapter.address)
  console.log('ParaswapV5Adapter:', adapters.paraswapV5Adapter.address)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
