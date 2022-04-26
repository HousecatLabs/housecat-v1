import { ethers } from 'hardhat'
import { expect } from 'chai'
import { formatEther, parseEther } from 'ethers/lib/utils'
import mockHousecatAndPool, { IMockHousecatAndPool } from '../../mock/mock-housecat-and-pool'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { mockAssets } from '../../../utils/mock-defi'
import { uniswapV2Routers } from '../../../utils/addresses/polygon'

describe('UniswapV2Adapter', () => {
  describe('swapTokens', () => {
    let deployer: SignerWithAddress
    let manager: SignerWithAddress
    let mock: IMockHousecatAndPool

    before(async () => {
      const [deployer_, treasury, manager_] = await ethers.getSigners()
      deployer = deployer_
      manager = manager_
      mock = await mockHousecatAndPool(deployer, treasury, manager)

      // deposit ETH so that the pool has WETH
      await mock.pool.connect(manager).deposit([], { value: parseEther('5') })
    })

    it('should fail to use an unsupported AMM router', async () => {
      const tradeWethToToken0 = mock.adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
        uniswapV2Routers.sushiswap, // unsupported router
        [mock.weth.token.address, mock.assets[0].token.address],
        parseEther('1'),
        1,
      ])
      const tx = mock.pool.connect(manager).manage([
        {
          adapter: mock.adapters.uniswapV2Adapter.address,
          data: tradeWethToToken0,
        },
      ])
      await expect(tx).revertedWith('UniswapV2Adapter: unsupported router')
    })

    it('should fail to buy unsupported tokens', async () => {
      const mockUnsuportedAssets = await mockAssets({
        signer: deployer,
        weth: { price: '1', decimals: 18 },
        tokens: [{ price: '1', decimals: 18, reserveToken: '10000', reserveWeth: '10000' }],
      })
      const unsupportedAsset = mockUnsuportedAssets[2][0]
      const tradeWethToUnsupportedToken = mock.adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
        mock.amm.address,
        [mock.weth.token.address, unsupportedAsset.token.address],
        parseEther('1'),
        1,
      ])
      const tx = mock.pool.connect(manager).manage([
        {
          adapter: mock.adapters.uniswapV2Adapter.address,
          data: tradeWethToUnsupportedToken,
        },
      ])
      await expect(tx).revertedWith('UniswapV2Adapter: unsupported token')
    })

    it('should succeed to swap supported tokens on a supported AMM', async () => {
      const tradeWethToToken0 = mock.adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
        mock.amm.address,
        [mock.weth.token.address, mock.assets[0].token.address],
        parseEther('1'),
        1,
      ])
      await mock.pool.connect(manager).manage([
        {
          adapter: mock.adapters.uniswapV2Adapter.address,
          data: tradeWethToToken0,
        },
      ])

      const wethBalance = await mock.weth.token.balanceOf(mock.pool.address)
      expect(parseFloat(formatEther(wethBalance))).approximately(4, 0.04)

      const token0Balance = await mock.assets[0].token.balanceOf(mock.pool.address)
      expect(parseFloat(formatEther(token0Balance))).approximately(1, 0.04)
    })
  })

  describe('swapTokenToETH', () => {
    let deployer: SignerWithAddress
    let manager: SignerWithAddress
    let mock: IMockHousecatAndPool

    before(async () => {
      const [deployer_, treasury, manager_] = await ethers.getSigners()
      deployer = deployer_
      manager = manager_
      mock = await mockHousecatAndPool(deployer, treasury, manager)

      // deposit ETH so that the pool has WETH
      await mock.pool.connect(manager).deposit([], { value: parseEther('5') })

      // send token0 to the pool
      await mock.assets[0].token.mint(mock.pool.address, parseEther('5'))
    })

    it('should fail to use an unsupported AMM router', async () => {
      const tradeToken0ToETH = mock.adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokenToETH', [
        uniswapV2Routers.sushiswap, // unsupported router
        [mock.assets[0].token.address, mock.weth.token.address],
        parseEther('1'),
        1,
      ])
      const tx = mock.pool.connect(manager).withdraw([
        {
          adapter: mock.adapters.uniswapV2Adapter.address,
          data: tradeToken0ToETH,
        },
      ])
      await expect(tx).revertedWith('UniswapV2Adapter: unsupported router')
    })

    it('should fail to sell unsupported tokens', async () => {
      const mockUnsuportedAssets = await mockAssets({
        signer: deployer,
        weth: { price: '1', decimals: 18 },
        tokens: [{ price: '1', decimals: 18, reserveToken: '10000', reserveWeth: '10000' }],
      })
      const unsupportedAsset = mockUnsuportedAssets[2][0]
      const tradeUnsupportedTokenToETH = mock.adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokenToETH', [
        mock.amm.address,
        [unsupportedAsset.token.address, mock.weth.token.address],
        parseEther('1'),
        1,
      ])
      const tx = mock.pool.connect(manager).withdraw([
        {
          adapter: mock.adapters.uniswapV2Adapter.address,
          data: tradeUnsupportedTokenToETH,
        },
      ])
      await expect(tx).revertedWith('UniswapV2Adapter: unsupported token')
    })

    it('should fail if token to is not weth', async () => {
      const tradeToken0ToToken1 = mock.adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokenToETH', [
        mock.amm.address,
        [mock.assets[0].token.address, mock.assets[1].token.address],
        parseEther('1'),
        1,
      ])
      const tx = mock.pool.connect(manager).withdraw([
        {
          adapter: mock.adapters.uniswapV2Adapter.address,
          data: tradeToken0ToToken1,
        },
      ])
      await expect(tx).revertedWith('UniswapV2Adapter: token to must be weth')
    })

    it('should succeed to sell tokens for ETH when both amm and path are valid', async () => {
      const ethBalanceBefore = await manager.getBalance()

      const tradeWethToETH = mock.adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokenToETH', [
        mock.amm.address,
        [mock.weth.token.address, mock.weth.token.address],
        parseEther('1'),
        1,
      ])
      const tradeToken0ToETH = mock.adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokenToETH', [
        mock.amm.address,
        [mock.assets[0].token.address, mock.weth.token.address],
        parseEther('1'),
        1,
      ])
      await mock.pool.connect(manager).withdraw([
        {
          adapter: mock.adapters.uniswapV2Adapter.address,
          data: tradeWethToETH,
        },
        {
          adapter: mock.adapters.uniswapV2Adapter.address,
          data: tradeToken0ToETH,
        },
      ])

      const wethBalance = await mock.weth.token.balanceOf(mock.pool.address)
      expect(parseFloat(formatEther(wethBalance))).approximately(4, 0.01)

      const token0Balance = await mock.assets[0].token.balanceOf(mock.pool.address)
      expect(parseFloat(formatEther(token0Balance))).approximately(4, 0.01)

      const ethBalanceAfter = await manager.getBalance()
      const ethBalanceIncreased = ethBalanceAfter.sub(ethBalanceBefore)
      expect(parseFloat(formatEther(ethBalanceIncreased))).approximately(2, 0.01)
    })
  })
})
