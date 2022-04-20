import { ethers } from 'hardhat'
import { expect } from 'chai'
import { formatEther, parseEther } from 'ethers/lib/utils'
import mockHousecatAndPool from './mock/mock-housecat-and-pool'
import { HousecatPool } from '../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber } from 'ethers'


describe('HousecatPool: withdraw', () => {
  describe('withdraw 100% from a simple pool with only one holder and three normal assets', () => {
    let _pool: HousecatPool
    let _holder: SignerWithAddress
    let ethWithdrawn: BigNumber
    let poolValueReduced: BigNumber

    before(async () => {
      const [signer, treasury, manager, holder] = await ethers.getSigners()
      const { pool, tokens, withdrawAdapter, amm, weth } = await mockHousecatAndPool(signer, treasury, manager)
      const [token0, token1] = tokens.map(t => t.token)
      await pool.connect(holder).deposit({ value: parseEther("1") })
      await token0.connect(signer).mint(pool.address, parseEther("1"))
      await token1.connect(signer).mint(pool.address, parseEther("1"))

      const txSellWeth = withdrawAdapter.interface.encodeFunctionData("uniswapV2__sellTokenForETH", [
        amm.address,
        [weth.token.address, weth.token.address],
        await weth.token.balanceOf(pool.address),
        1,
      ])

      const txSellToken0 = withdrawAdapter.interface.encodeFunctionData("uniswapV2__sellTokenForETH", [
        amm.address,
        [token0.address, weth.token.address],
        await token0.balanceOf(pool.address),
        1,
      ])

      const txSellToken1 = withdrawAdapter.interface.encodeFunctionData("uniswapV2__sellTokenForETH", [
        amm.address,
        [token1.address, weth.token.address],
        await token1.balanceOf(pool.address),
        1,
      ])

      const poolValueBefore = await pool.getPoolValue()
      const ethBalanceBefore = await holder.getBalance()

      await pool.connect(holder).withdraw([
        txSellWeth,
        txSellToken0,
        txSellToken1,
      ])

      const ethBalanceAfter = await holder.getBalance()
      const poolValueAfter = await pool.getPoolValue()

      ethWithdrawn = ethBalanceAfter.sub(ethBalanceBefore)
      poolValueReduced = poolValueBefore.sub(poolValueAfter)

      _pool = pool
      _holder = holder
    })

    it('withdrawer receives ETH for an amount matching the withdrawn value', async () => {
      expect(parseFloat(formatEther(poolValueReduced))).approximately(parseFloat(formatEther(ethWithdrawn)), 0.01)
    })

    it('withdrawers pool token balance decreases to zero', async () => {
      expect(await _pool.balanceOf(_holder.address)).equal(0)
    })

    it('pool value decreases to zero', async () => {
      expect(await _pool.getPoolValue()).equal(0)
    })
  })
})
