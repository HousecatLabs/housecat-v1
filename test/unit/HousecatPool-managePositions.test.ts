import { ethers } from 'hardhat'
import { expect } from 'chai'
import { parseEther } from 'ethers/lib/utils'
import mockHousecatAndPool from '../mock/mock-housecat-and-pool'
import { uniswapV2Routers } from '../../utils/addresses/polygon'
import { mockToken } from '../../utils/mock-defi'

describe('HousecatPool: managePositions', () => {
  it('only manager allowed to call', async () => {
    const [signer, treasury, manager] = await ethers.getSigners()
    const { pool, adapters } = await mockHousecatAndPool(signer, treasury, manager)
    const encoder = new ethers.utils.AbiCoder()
    const data = encoder.encode(['string'], ['foobar'])
    const manage = pool.connect(signer).managePositions([{ adapter: adapters.uniswapV2Adapter.address, data }])
    await expect(manage).revertedWith('Ownable: caller is not the owner')
  })

  describe('uniswapV2: swapTokens', () => {
    it('manager should be able to trade tokens on behalf of the pool', async () => {
      const [signer, treasury, manager] = await ethers.getSigners()
      const { pool, adapters, amm, weth, assets } = await mockHousecatAndPool(signer, treasury, manager)

      // deposit ETH so that the pool has WETH
      await pool.connect(manager).deposit([], { value: parseEther('1') })

      // trade all weth to token0
      const data = adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
        amm.address,
        [weth.token.address, assets[0].token.address],
        await weth.token.balanceOf(pool.address),
        1,
      ])
      await pool.connect(manager).managePositions([{ adapter: adapters.uniswapV2Adapter.address, data }])

      // check the pool holds token0 but not weth
      expect(await assets[0].token.balanceOf(pool.address)).gt(0)
      expect(await weth.token.balanceOf(pool.address)).equal(0)
    })
    it('should fail to trade on a router which is not whitelisted', async () => {
      const [signer, treasury, manager] = await ethers.getSigners()
      const { pool, adapters, weth, assets } = await mockHousecatAndPool(signer, treasury, manager)
      const data = adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
        uniswapV2Routers.sushiswap,
        [weth.token.address, assets[0].token.address],
        await weth.token.balanceOf(pool.address),
        1,
      ])
      const manage = pool.connect(manager).managePositions([{ adapter: adapters.uniswapV2Adapter.address, data }])
      await expect(manage).revertedWith('UniswapV2Adapter: unsupported router')
    })
    it('should fail to buy tokens that are not whitelisted', async () => {
      const [signer, treasury, manager] = await ethers.getSigners()
      const { pool, adapters, weth, amm } = await mockHousecatAndPool(signer, treasury, manager)
      const otherToken = await mockToken(signer, 'Other', 'OTHER', 18, 0)
      const data = adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
        amm.address,
        [weth.token.address, otherToken.address],
        await weth.token.balanceOf(pool.address),
        1,
      ])
      const manage = pool.connect(manager).managePositions([{ adapter: adapters.uniswapV2Adapter.address, data }])
      await expect(manage).revertedWith('UniswapV2Adapter: unsupported token to')
    })
    it('should succeed to sell tokens that are not whitelisted', async () => {
      const [signer, treasury, manager] = await ethers.getSigners()
      const { mgmt, pool, adapters, weth, assets, amm } = await mockHousecatAndPool(signer, treasury, manager)

      // remove a token from the whitelist and send that token to the pool
      await mgmt.connect(signer).setSupportedAssets([weth.token.address])
      const token = assets[0].token
      await token.mint(pool.address, parseEther('1'))

      // ensure the pool holds the token
      expect(await token.balanceOf(pool.address)).equal(parseEther('1'))

      // swap the token to weth
      const data = adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
        amm.address,
        [token.address, weth.token.address],
        await token.balanceOf(pool.address),
        1,
      ])
      await pool.connect(manager).managePositions([{ adapter: adapters.uniswapV2Adapter.address, data }])

      // check the pool no longer holds the token but holds weth instead
      expect(await token.balanceOf(pool.address)).equal(0)
      expect(await weth.token.balanceOf(pool.address)).gt(0)
    })
  })
})
