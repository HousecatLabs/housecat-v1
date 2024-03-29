import hre, { ethers } from 'hardhat'
import fs from 'fs'
import { deployHousecat, deployQueries } from '../../utils/deploy-contracts'
import polygon from '../../utils/addresses/polygon'

const gasPrice = ethers.utils.parseUnits('50', 'gwei')
const gasLimit = undefined //6e6

const main = async () => {
  const [owner] = await ethers.getSigners()
  const { mgmt, factory, poolTemplate, adapters } = await deployHousecat({
    signer: owner,
    rebalancers: [owner.address],
    weth: polygon.assets.wmatic.addr,
    assets: Object.values(polygon.assets).map((x) => x.addr),
    assetsMeta: Object.values(polygon.assets).map((x) => ({
      decimals: x.decimals,
      priceFeed: x.priceFeed,
      delisted: false,
    })),
    integrations: [polygon.uniswapV2Routers.quickswap, polygon.uniswapV2Routers.sushiswap],
    gasPrice,
    gasLimit,
  })
  const queries = await deployQueries(owner, gasPrice, gasLimit)
  const deployment = {
    timestamp: new Date().toISOString(),
    network: hre.hardhatArguments.network,
    addresses: {
      HousecatManagement: mgmt.address,
      HousecatFactory: factory.address,
      HousecatPool: poolTemplate.address,
      HousecatQueries: queries.address,
      WETHAdapter: adapters.wethAdapter.address,
      UniswapV2Adapter: adapters.uniswapV2Adapter.address,
      AaveV2Adapter: adapters.aaveV2Adapter.address,
      WithdrawAdapter: adapters.withdrawAdapter.address,
    },
  }
  console.log(deployment)
  const fileName = `deployment-${deployment.network}.json`
  fs.writeFile(fileName, JSON.stringify(deployment), () => console.log(`Generated ${fileName}`))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
