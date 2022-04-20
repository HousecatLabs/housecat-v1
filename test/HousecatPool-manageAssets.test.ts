import { ethers } from 'hardhat'
import { expect } from 'chai'
import { parseEther } from 'ethers/lib/utils'
import mockHousecatAndPool from './mock/mock-housecat-and-pool'
import { routers } from '../utils/addresses/polygon'
import { mockToken } from '../utils/mock-defi'

describe('HousecatPool: manageAssets', () => {
  it('only manager allowed to call', async () => {
    const [signer, treasury, manager] = await ethers.getSigners()
    const { pool } = await mockHousecatAndPool(signer, treasury, manager)
    const encoder = new ethers.utils.AbiCoder()
    const data = encoder.encode(['string'], ['foobar'])
    const manage = pool.connect(signer).manageAssets([data])
    await expect(manage).revertedWith('Ownable: caller is not the owner')
  })

  describe('uniswapV2__swapTokens', () => {
    it('manager should be able to trade tokens on behalf of the pool', async () => {
      const [signer, treasury, manager] = await ethers.getSigners()
      const { pool, manageAssetsAdapter, amm, weth, tokens } = await mockHousecatAndPool(signer, treasury, manager)

      // deposit ETH so that the pool has WETH
      await pool.connect(manager).deposit({ value: parseEther('1') })

      // trade all weth to token0
      const data = manageAssetsAdapter.interface.encodeFunctionData('uniswapV2__swapTokens', [
        amm.address,
        [weth.token.address, tokens[0].token.address],
        await weth.token.balanceOf(pool.address),
        1,
      ])
      await pool.connect(manager).manageAssets([data])

      // check the pool holds token0 but not weth
      expect(await tokens[0].token.balanceOf(pool.address)).gt(0)
      expect(await weth.token.balanceOf(pool.address)).equal(0)
    })
    it('should fail to trade on a router which is not whitelisted', async () => {
      const [signer, treasury, manager] = await ethers.getSigners()
      const { pool, manageAssetsAdapter, weth, tokens } = await mockHousecatAndPool(signer, treasury, manager)
      const data = manageAssetsAdapter.interface.encodeFunctionData('uniswapV2__swapTokens', [
        routers.sushiswap,
        [weth.token.address, tokens[0].token.address],
        await weth.token.balanceOf(pool.address),
        1,
      ])
      const manage = pool.connect(manager).manageAssets([data])
      await expect(manage).revertedWith('ManageAssetsAdapter: unsupported router')
    })
    it('should fail to buy tokens that are not whitelisted', async () => {
      const [signer, treasury, manager] = await ethers.getSigners()
      const { pool, manageAssetsAdapter, weth, amm } = await mockHousecatAndPool(signer, treasury, manager)
      const otherToken = await mockToken(signer, 'Other', 'OTHER', 18, 0)
      const data = manageAssetsAdapter.interface.encodeFunctionData('uniswapV2__swapTokens', [
        amm.address,
        [weth.token.address, otherToken.address],
        await weth.token.balanceOf(pool.address),
        1,
      ])
      const manage = pool.connect(manager).manageAssets([data])
      await expect(manage).revertedWith('ManageAssetsAdapter: unsupported token to')
    })
    it('should succeed to sell tokens that are not whitelisted', async () => {
      const [signer, treasury, manager] = await ethers.getSigners()
      const { management, pool, manageAssetsAdapter, weth, tokens, amm } = await mockHousecatAndPool(
        signer,
        treasury,
        manager
      )

      // remove a token from the whitelist and send that token to the pool
      await management.connect(signer).setSupportedTokens([weth.token.address])
      const token = tokens[0].token
      await token.mint(pool.address, parseEther('1'))

      // ensure the pool holds the token
      expect(await token.balanceOf(pool.address)).equal(parseEther('1'))

      // swap the token to weth
      const data = manageAssetsAdapter.interface.encodeFunctionData('uniswapV2__swapTokens', [
        amm.address,
        [token.address, weth.token.address],
        await token.balanceOf(pool.address),
        1,
      ])
      await pool.connect(manager).manageAssets([data])

      // check the pool no longer holds the token but holds weth instead
      expect(await token.balanceOf(pool.address)).equal(0)
      expect(await weth.token.balanceOf(pool.address)).gt(0)
    })
  })
})
