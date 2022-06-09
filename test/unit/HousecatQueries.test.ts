import { ethers } from 'hardhat'
import { expect } from 'chai'
import { BigNumber } from 'ethers'
import { deployQueries } from '../../utils/deploy-contracts'
import { mockAssets, mockLoans, mockPriceFeed, mockToken } from '../../utils/mock-defi'
import { parseEther } from 'ethers/lib/utils'

describe('HousecatQueries', () => {
  describe('deploy', () => {
    it('should deploy successfully', async () => {
      const [signer] = await ethers.getSigners()
      await deployQueries(signer)
    })
  })

  describe('getTokenBalances', () => {
    it('should return balances correctly', async () => {
      const [signer] = await ethers.getSigners()
      const tokenA = await mockToken(signer, 'Test A', 'TA', 18, ethers.utils.parseEther('1.0'))
      const tokenB = await mockToken(signer, 'Test B', 'TB', 18, ethers.utils.parseEther('2.0'))
      const tokenC = await mockToken(signer, 'Test B', 'TB', 18, 0)
      const queries = await deployQueries(signer)
      const [balanceA, balanceB, balanceC] = await queries.getTokenBalances(signer.address, [
        tokenA.address,
        tokenB.address,
        tokenC.address,
      ])
      expect(balanceA).equal(ethers.utils.parseEther('1.0'))
      expect(balanceB).equal(ethers.utils.parseEther('2.0'))
      expect(balanceC).equal(0)
    })
  })

  describe('getTokenPrices', () => {
    it('should return prices for tokens that have price feeds', async () => {
      const [signer] = await ethers.getSigners()
      const priceFeedA = await mockPriceFeed(signer, BigNumber.from(2e8), 8)
      const priceFeedB = await mockPriceFeed(signer, BigNumber.from(0.1e8), 8)
      const queries = await deployQueries(signer)
      const [priceA, priceB] = await queries.getTokenPrices([priceFeedA.address, priceFeedB.address])
      const priceDecimals = await queries.getPriceDecimals()
      expect(priceA).equal(ethers.utils.parseUnits('2', priceDecimals))
      expect(priceB).equal(ethers.utils.parseUnits('0.1', priceDecimals))
    })

    it('should return prices always with correct decimals despite of original decimals() of price feeds', async () => {
      const [signer] = await ethers.getSigners()
      const priceFeedA = await mockPriceFeed(signer, BigNumber.from(2e12), 12)
      const priceFeedB = await mockPriceFeed(signer, BigNumber.from(0.1e6), 6)
      const queries = await deployQueries(signer)
      const [priceA, priceB] = await queries.getTokenPrices([priceFeedA.address, priceFeedB.address])
      const priceDecimals = await queries.getPriceDecimals()
      expect(priceA).equal(ethers.utils.parseUnits('2', priceDecimals))
      expect(priceB).equal(ethers.utils.parseUnits('0.1', priceDecimals))
    })
  })

  describe('getTotalValue', () => {
    it('should return correct total value given balances and prices', async () => {
      const [signer] = await ethers.getSigners()
      const queries = await deployQueries(signer)
      const decimals = [18, 14, 6]
      const balances = [
        ethers.utils.parseUnits('1.0', 18),
        ethers.utils.parseUnits('2.0', 14),
        ethers.utils.parseUnits('3.0', 6),
      ]
      const priceDecimals = 18
      const prices = [
        ethers.utils.parseUnits('1.0', priceDecimals),
        ethers.utils.parseUnits('2.0', priceDecimals),
        ethers.utils.parseUnits('3.0', priceDecimals),
      ]
      const totalValue = await queries.getTotalValue(balances, prices, decimals)
      expect(totalValue).equal(ethers.utils.parseUnits('14.0', priceDecimals))
    })
  })

  describe('getTokenWeights', () => {
    it('should return token weights correctly when at least some of the tokens have balances', async () => {
      const [signer] = await ethers.getSigners()
      const queries = await deployQueries(signer)
      const balances = [ethers.utils.parseEther('0.0'), ethers.utils.parseEther('2.0'), ethers.utils.parseEther('3.0')]
      const prices = [ethers.utils.parseEther('1.0'), ethers.utils.parseEther('2.0'), ethers.utils.parseEther('3.0')]
      const decimals = [18, 18, 18]
      const [weights] = await queries.getTokenWeights(balances, prices, decimals)
      const granularity = await queries.getPercent100()

      expect(weights[0]).equal(0)
      expect(weights[1]).equal(granularity.mul(2 * 2).div(13))
      expect(weights[2]).equal(granularity.mul(3 * 3).div(13))
    })

    it('should return 0 weights for all tokens if all balances are 0', async () => {
      const [signer] = await ethers.getSigners()
      const queries = await deployQueries(signer)
      const balances = [ethers.utils.parseEther('0.0'), ethers.utils.parseEther('0.0')]
      const prices = [ethers.utils.parseEther('1.0'), ethers.utils.parseEther('2.0')]
      const decimals = [18, 18]
      const [weights, totalValue] = await queries.getTokenWeights(balances, prices, decimals)

      expect(weights[0]).equal(0)
      expect(weights[1]).equal(0)
      expect(weights).have.lengthOf(2)
      expect(totalValue).equal(0)
    })
  })

  describe('getTokenAmounts', () => {
    it('should transform weights to amounts correctly', async () => {
      const [signer] = await ethers.getSigners()
      const queries = await deployQueries(signer)
      const balances = [ethers.utils.parseEther('1.0'), ethers.utils.parseEther('2.0')]
      const prices = [ethers.utils.parseEther('2.0'), ethers.utils.parseEther('1.0')]
      const decimals = [18, 18]
      const [weights, totalValue] = await queries.getTokenWeights(balances, prices, decimals)
      const amounts = await queries.getTokenAmounts(weights, totalValue, prices, decimals)
      expect(amounts[0]).equal(balances[0])
      expect(amounts[1]).equal(balances[1])
    })
  })

  describe('getContent', () => {
    it('should have netValue == assetValue - loanValue if loan value is less than asset value', async () => {
      const [signer, account] = await ethers.getSigners()
      const queries = await deployQueries(signer)

      const [, weth, assets] = await mockAssets({
        signer,
        weth: { price: '1' },
        tokens: [
          { price: '1', reserveToken: '10000', reserveWeth: '10000' },
          { price: '1', reserveToken: '10000', reserveWeth: '10000' },
        ],
      })

      await weth.token.mint(account.address, parseEther('1'))
      await assets[0].token.mint(account.address, parseEther('1'))
      await assets[1].token.mint(account.address, parseEther('1'))

      const loans = await mockLoans({
        signer,
        tokens: [{ price: '1' }, { price: '1' }],
      })

      await loans[0].token.mint(account.address, parseEther('1'))
      await loans[1].token.mint(account.address, parseEther('1'))

      const assetData = {
        tokens: [weth.token.address, assets[0].token.address, assets[1].token.address],
        decimals: [18, 18, 18],
        prices: [parseEther('1'), parseEther('1'), parseEther('1')],
        delisted: [false, false, true],
      }

      const loanData = {
        tokens: [loans[0].token.address, loans[1].token.address],
        decimals: [18, 18],
        prices: [parseEther('1'), parseEther('1')],
        delisted: [false, true],
      }

      const content = await queries.getContent(account.address, assetData, loanData, false)
      expect(content.netValue).eq(parseEther('1'))
    })

    it('should have netValue == 0 if loan value exceeds asset value', async () => {
      const [signer, account] = await ethers.getSigners()
      const queries = await deployQueries(signer)

      const [, weth] = await mockAssets({
        signer,
        weth: { price: '1' },
        tokens: [],
      })

      await weth.token.mint(account.address, parseEther('1'))

      const loans = await mockLoans({
        signer,
        tokens: [{ price: '1' }, { price: '1' }],
      })

      await loans[0].token.mint(account.address, parseEther('1'))
      await loans[1].token.mint(account.address, parseEther('1'))

      const assetData = {
        tokens: [weth.token.address],
        decimals: [18, 18, 18],
        prices: [parseEther('1'), parseEther('1'), parseEther('1')],
        delisted: [false, false, true],
      }

      const loanData = {
        tokens: [loans[0].token.address, loans[1].token.address],
        decimals: [18, 18],
        prices: [parseEther('1'), parseEther('1')],
        delisted: [false, true],
      }

      const content = await queries.getContent(account.address, assetData, loanData, false)
      expect(content.netValue).eq(0)
    })

    it('should exclude delisted correctly', async () => {
      const [signer, account] = await ethers.getSigners()
      const queries = await deployQueries(signer)

      const [, weth, assets] = await mockAssets({
        signer,
        weth: { price: '1' },
        tokens: [
          { price: '1', reserveToken: '10000', reserveWeth: '10000' },
          { price: '1', reserveToken: '10000', reserveWeth: '10000' },
        ],
      })

      await weth.token.mint(account.address, parseEther('1'))
      await assets[0].token.mint(account.address, parseEther('1'))
      await assets[1].token.mint(account.address, parseEther('1'))

      const loans = await mockLoans({
        signer,
        tokens: [{ price: '1' }, { price: '1' }],
      })

      await loans[0].token.mint(account.address, parseEther('1'))
      await loans[1].token.mint(account.address, parseEther('1'))

      const assetData = {
        tokens: [weth.token.address, assets[0].token.address, assets[1].token.address],
        decimals: [18, 18, 18],
        prices: [parseEther('1'), parseEther('1'), parseEther('1')],
        delisted: [false, false, true],
      }

      const loanData = {
        tokens: [loans[0].token.address, loans[1].token.address],
        decimals: [18, 18],
        prices: [parseEther('1'), parseEther('1')],
        delisted: [false, true],
      }

      const percent100 = await queries.getPercent100()

      // content when delisted are not excluded
      const contentAll = await queries.getContent(account.address, assetData, loanData, false)

      expect(contentAll.assetBalances[0]).eq(parseEther('1'))
      expect(contentAll.assetBalances[1]).eq(parseEther('1'))
      expect(contentAll.assetBalances[2]).eq(parseEther('1'))
      expect(contentAll.loanBalances[0]).eq(parseEther('1'))
      expect(contentAll.loanBalances[1]).eq(parseEther('1'))

      expect(contentAll.assetWeights[0]).eq(percent100.div(3))
      expect(contentAll.loanWeights[0]).eq(percent100.div(2))

      expect(contentAll.assetValue).eq(parseEther('3'))
      expect(contentAll.loanValue).eq(parseEther('2'))
      expect(contentAll.netValue).eq(parseEther('1'))

      // content when delisted tokens are excluded
      const contentIgnoreDelisted = await queries.getContent(account.address, assetData, loanData, true)

      expect(contentIgnoreDelisted.assetBalances[0]).eq(parseEther('1'))
      expect(contentIgnoreDelisted.assetBalances[1]).eq(parseEther('1'))
      expect(contentIgnoreDelisted.assetBalances[2]).eq(0)
      expect(contentIgnoreDelisted.loanBalances[0]).eq(parseEther('1'))
      expect(contentIgnoreDelisted.loanBalances[1]).eq(0)

      expect(contentIgnoreDelisted.assetWeights[0]).eq(percent100.div(2))
      expect(contentIgnoreDelisted.loanWeights[0]).eq(percent100)

      expect(contentIgnoreDelisted.assetValue).eq(parseEther('2'))
      expect(contentIgnoreDelisted.loanValue).eq(parseEther('1'))
      expect(contentIgnoreDelisted.netValue).eq(parseEther('1'))
    })
  })
})
