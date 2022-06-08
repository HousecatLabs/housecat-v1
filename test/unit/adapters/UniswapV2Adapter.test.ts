import { ethers } from 'hardhat'
import { expect } from 'chai'
import { formatEther, parseEther } from 'ethers/lib/utils'
import mockHousecatAndPool, { IMockHousecatAndPool } from '../../utils/mock-housecat-and-pool'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { mockAssets } from '../../../utils/mock-defi'
import { uniswapV2Routers } from '../../../utils/addresses/polygon'

describe('UniswapV2Adapter', () => {
  describe('swapTokens', () => {
    let owner: SignerWithAddress
    let mirrored: SignerWithAddress
    let mock: IMockHousecatAndPool

    before(async () => {
      const [owner_, mirrored_, mirrorer] = await ethers.getSigners()
      owner = owner_
      mirrored = mirrored_
      mock = await mockHousecatAndPool({ signer: owner, mirrored, weth: { price: '1', amountToMirrored: '5' } })

      // deposit ETH so that the pool has WETH
      const amountDeposit = parseEther('5')
      await mock.pool.connect(mirrorer).deposit(
        mirrorer.address,
        [
          {
            adapter: mock.adapters.wethAdapter.address,
            data: mock.adapters.wethAdapter.interface.encodeFunctionData('deposit', [amountDeposit]),
          },
        ],
        { value: amountDeposit }
      )
    })

    it('should fail to use an unsupported AMM router', async () => {
      const tradeWethToToken0 = mock.adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
        uniswapV2Routers.sushiswap, // unsupported router
        [mock.weth.token.address, mock.assets[0].token.address],
        parseEther('1'),
        1,
      ])
      const tx = mock.pool.connect(owner).rebalance(owner.address, [
        {
          adapter: mock.adapters.uniswapV2Adapter.address,
          data: tradeWethToToken0,
        },
      ])
      await expect(tx).revertedWith('UniswapV2Adapter: unsupported router')
    })

    it('should fail to buy unsupported tokens', async () => {
      const mockUnsuportedAssets = await mockAssets({
        signer: owner,
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
      const tx = mock.pool.connect(owner).rebalance(owner.address, [
        {
          adapter: mock.adapters.uniswapV2Adapter.address,
          data: tradeWethToUnsupportedToken,
        },
      ])
      await expect(tx).revertedWith('UniswapV2Adapter: unsupported token to')
    })

    it('should fail to sell unknown tokens', async () => {
      const mockUnsuportedAssets = await mockAssets({
        signer: owner,
        weth: { price: '1', decimals: 18 },
        tokens: [{ price: '1', decimals: 18, reserveToken: '10000', reserveWeth: '10000' }],
      })
      const unsupportedAsset = mockUnsuportedAssets[2][0]
      const tradeUnsupportedTokenToWeth = mock.adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
        mock.amm.address,
        [unsupportedAsset.token.address, mock.weth.token.address],
        parseEther('1'),
        1,
      ])
      const tx = mock.pool.connect(owner).rebalance(owner.address, [
        {
          adapter: mock.adapters.uniswapV2Adapter.address,
          data: tradeUnsupportedTokenToWeth,
        },
      ])
      await expect(tx).revertedWith('UniswapV2Adapter: unsupported token from')
    })

    it('should succeed to swap supported tokens on a supported AMM', async () => {
      // trade weth to Asset0 on mirrored wallet
      await mock.weth.token.connect(mirrored).burn(parseEther('1'))
      await mock.assets[0].token.mint(mirrored.address, parseEther('1'))

      const tradeWethToAsset0 = mock.adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
        mock.amm.address,
        [mock.weth.token.address, mock.assets[0].token.address],
        parseEther('1'),
        1,
      ])
      await mock.pool.connect(owner).rebalance(owner.address, [
        {
          adapter: mock.adapters.uniswapV2Adapter.address,
          data: tradeWethToAsset0,
        },
      ])

      const wethBalance = await mock.weth.token.balanceOf(mock.pool.address)
      expect(parseFloat(formatEther(wethBalance))).approximately(4, 0.04)

      const token0Balance = await mock.assets[0].token.balanceOf(mock.pool.address)
      expect(parseFloat(formatEther(token0Balance))).approximately(1, 0.04)
    })

    it('should succeed to sell delisted tokens for supported tokens on a supported AMM', async () => {
      // trade Asset0 to weth on mirrored wallet
      await mock.assets[0].token.connect(mirrored).burn(parseEther('1'))
      await mock.weth.token.mint(mirrored.address, parseEther('1'))

      // delist token0
      await mock.mgmt.setTokenMeta(mock.assets[0].token.address, {
        ...(await mock.mgmt.getTokenMeta(mock.assets[0].token.address)),
        delisted: true,
      })

      const tradeAsset0ToWeth = mock.adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
        mock.amm.address,
        [mock.assets[0].token.address, mock.weth.token.address],
        await mock.assets[0].token.balanceOf(mock.pool.address),
        1,
      ])
      await mock.pool.connect(owner).rebalance(owner.address, [
        {
          adapter: mock.adapters.uniswapV2Adapter.address,
          data: tradeAsset0ToWeth,
        },
      ])

      const wethBalance = await mock.weth.token.balanceOf(mock.pool.address)
      expect(parseFloat(formatEther(wethBalance))).approximately(5, 0.04)

      const token0Balance = await mock.assets[0].token.balanceOf(mock.pool.address)
      expect(parseFloat(formatEther(token0Balance))).approximately(0, 0.04)
    })
  })
})
