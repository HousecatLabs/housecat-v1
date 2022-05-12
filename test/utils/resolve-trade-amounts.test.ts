import { expect } from "chai"
import { BigNumber } from "ethers"
import { formatEther, parseEther, parseUnits } from "ethers/lib/utils"
import { resolveSellAmounts, resolveBuyAmounts } from './resolve-trade-amounts'

describe('resolve-trade-amounts', () => {
  describe('resolveBuyAmounts', () => {
    it('should return correct amounts if pool balances are zero', () => {
      const percent100 = parseUnits('1', 8)
      const poolWeights = [BigNumber.from(0), BigNumber.from(0), BigNumber.from(0)]
      const mirroredWeights = [
        percent100.mul(20).div(100),
        percent100.mul(20).div(100),
        percent100.mul(60).div(100),
      ]

      const depositAmount = parseEther('100')
      const depositValue = depositAmount
      const poolValue = BigNumber.from(0)

      const amounts = resolveBuyAmounts(
        depositAmount,
        depositValue,
        poolValue,
        poolWeights,
        mirroredWeights,
        percent100
      )
      expect(amounts[0]).eq(parseEther('20'))
      expect(amounts[1]).eq(parseEther('20'))
      expect(amounts[2]).eq(parseEther('60'))
    })

    it('should fill missing balances if pool value is positive and weights differ from mirrored', async () => {
      const percent100 = parseUnits('1', 8)
      const poolValue = parseEther('10')
      const poolWeights = [0.2, 0.2, 0.6].map(x => parseUnits(x.toString(), 8))
      const mirroredWeights = [0.3, 0.4, 0.3].map(x => parseUnits(x.toString(), 8))
      const depositAmount = parseEther('10')
      const depositValue = depositAmount
      const amounts = resolveBuyAmounts(
        depositAmount,
        depositValue,
        poolValue,
        poolWeights,
        mirroredWeights,
        percent100
      )
      expect(amounts[0]).eq(parseEther('4'))
      expect(amounts[1]).eq(parseEther('6'))
      expect(amounts[2]).eq(0)
    })

    it('should allocate exceeding balance in accordance with the mirrored weights', async () => {
      const percent100 = parseUnits('1', 8)
      const poolValue = parseEther('10')
      const poolWeights = [0.2, 0.2, 0.6].map(x => parseUnits(x.toString(), 8))
      const mirroredWeights = [0.3, 0.4, 0.3].map(x => parseUnits(x.toString(), 8))
      const depositAmount = parseEther('20')
      const depositValue = depositAmount
      const amounts = resolveBuyAmounts(
        depositAmount,
        depositValue,
        poolValue,
        poolWeights,
        mirroredWeights,
        percent100
      )
      expect(parseFloat(formatEther(amounts[0]))).approximately(7, 0.00001)   // 4 + 3
      expect(parseFloat(formatEther(amounts[1]))).approximately(10, 0.00001)  // 6 + 4
      expect(parseFloat(formatEther(amounts[2]))).approximately(3, 0.00001)  // 0 + 3
    })
  })

  describe('resolveSellAmounts', () => {
    it('should return correct amounts if 100% is withdrawn', () => {
      const percent100 = parseUnits('1', 8)
      const withdrawPercentage = percent100
      const poolValue = parseEther('200')
      const poolBalances = [20, 100, 80].map(x => parseUnits(x.toString(), 18))
      const poolWeights = [0.1, 0.5, 0.4].map(x => parseUnits(x.toString(), 8))
      const mirroredWeights = [0.3, 0.4, 0.3].map(x => parseUnits(x.toString(), 8))
      const sellAmounts = resolveSellAmounts(
        withdrawPercentage,
        poolValue,
        poolBalances,
        poolWeights,
        mirroredWeights,
        percent100
      )
      expect(sellAmounts[0]).eq(parseEther('20'))
      expect(sellAmounts[1]).eq(parseEther('100'))
      expect(sellAmounts[2]).eq(parseEther('80'))
    })

    it('should return correct amounts if weights differ from mirrored', () => {
      const percent100 = parseUnits('1', 8)
      const withdrawPercentage = percent100.div(2)
      const poolValue = parseEther('200')
      const poolBalances = [20, 100, 80].map(x => parseUnits(x.toString(), 18))
      const poolWeights = [0.1, 0.5, 0.4].map(x => parseUnits(x.toString(), 8))
      const mirroredWeights = [0.3, 0.4, 0.3].map(x => parseUnits(x.toString(), 8))
      const sellAmounts = resolveSellAmounts(
        withdrawPercentage,
        poolValue,
        poolBalances,
        poolWeights,
        mirroredWeights,
        percent100
      )
      expect(sellAmounts[0]).eq(0)
      expect(sellAmounts[1]).eq(parseEther('60'))
      expect(sellAmounts[2]).eq(parseEther('40'))
    })
  })

  it('should allocate exceeding withdraw balance in accordance with the mirrored weights', () => {
    const percent100 = parseUnits('1', 8)
    const withdrawPercentage = percent100.div(2)
    const poolValue = parseEther('100')
    const poolBalances = [30, 30, 40].map(x => parseUnits(x.toString(), 18))
    const poolWeights = [0.3, 0.3, 0.4].map(x => parseUnits(x.toString(), 8))
    const mirroredWeights = [0.3, 0.4, 0.3].map(x => parseUnits(x.toString(), 8))
    const sellAmounts = resolveSellAmounts(
      withdrawPercentage,
      poolValue,
      poolBalances,
      poolWeights,
      mirroredWeights,
      percent100
    )
    expect(sellAmounts[0]).eq(parseEther('15'))
    expect(sellAmounts[1]).eq(parseEther('10'))
    expect(sellAmounts[2]).eq(parseEther('25'))
  })
})