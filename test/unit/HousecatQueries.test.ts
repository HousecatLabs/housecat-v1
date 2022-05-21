import { ethers } from 'hardhat'
import { expect } from 'chai'
import { BigNumber } from 'ethers'
import { deployQueries } from '../../utils/deploy-contracts'
import { mockPriceFeed, mockToken } from '../../utils/mock-defi'

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
    // TODO
  })
})
