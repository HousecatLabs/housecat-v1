import { ethers } from 'hardhat'
import { HousecatPool } from '../typechain-types'

export const getPoolPortfolio = async (pool: HousecatPool) => {
  const mgmt = await ethers.getContractAt('HousecatManagement', await pool.management())
  const [assets, assetsMeta] = await mgmt.getAssetsWithMeta()
  const [loans, loansMeta] = await mgmt.getLoansWithMeta()
  const assetData = await pool.getTokenData(assets, assetsMeta)
  const loanData = await pool.getTokenData(loans, loansMeta)
  return pool.getPortfolio(pool.address, assetData, loanData)
}
