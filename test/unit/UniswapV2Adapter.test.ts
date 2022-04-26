import { ethers } from 'hardhat'
import { expect } from 'chai'
import { formatEther, parseEther } from 'ethers/lib/utils'
import mockHousecatAndPool, { IMockHousecatAndPool } from '../mock/mock-housecat-and-pool'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { mockAssets } from '../../utils/mock-defi'
import { uniswapV2Routers } from '../../utils/addresses/polygon'


describe('UniswapV2Adapter', () => {
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

  describe('swapTokens', () => {
    it('should fail to use an unsupported AMM router', async () => {
      const tradeWethToToken0 = mock.adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
        uniswapV2Routers.sushiswap, // unsupported router
        [mock.weth.token.address, mock.assets[0].token.address],
        parseEther('1'),
        1,
      ])
      const tx = mock.pool.connect(manager).managePositions([{
        adapter: mock.adapters.uniswapV2Adapter.address,
        data: tradeWethToToken0
      }])
      await expect(tx).revertedWith('UniswapV2Adapter: unsupported router')
    })

    it('should fail to buy unsupported tokens', async () => {
      const mockUnsuportedAssets = await mockAssets({
        signer: deployer,
        weth: { price: '1', decimals: 18 },
        tokens: [{ price: '1', decimals: 18, reserveToken: '10000', reserveWeth: '10000' }]
      })
      const unsupportedAsset = mockUnsuportedAssets[2][0]
      const tradeWethToUnsupportedToken = mock.adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
        mock.amm.address,
        [mock.weth.token.address, unsupportedAsset.token.address],
        parseEther('1'),
        1,
      ])
      const tx = mock.pool.connect(manager).managePositions([{
        adapter: mock.adapters.uniswapV2Adapter.address,
        data: tradeWethToUnsupportedToken
      }])
      await expect(tx).revertedWith('UniswapV2Adapter: unsupported token')
    })

    it('should succeed to swap supported tokens on a supported AMM', async () => {
      const tradeWethToToken0 = mock.adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
        mock.amm.address,
        [mock.weth.token.address, mock.assets[0].token.address],
        parseEther('1'),
        1,
      ])
      await mock.pool.connect(manager).managePositions([{
        adapter: mock.adapters.uniswapV2Adapter.address,
        data: tradeWethToToken0
      }])

      const wethBalance = await mock.weth.token.balanceOf(mock.pool.address)
      expect(parseFloat(formatEther(wethBalance))).approximately(4, 0.04)

      const token0Balance = await mock.assets[0].token.balanceOf(mock.pool.address)
      expect(parseFloat(formatEther(token0Balance))).approximately(1, 0.04)
    })
  })

  describe('swapTokenToETH', () => {
    //
  })

  describe('swapWETHToToken', () => {
    //
  })
})