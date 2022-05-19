import { expect } from 'chai'
import { parseEther, parseUnits } from 'ethers/lib/utils'
import resolveRebalanceSwaps from './resolve-rebalance-swaps'

describe('resolveRebalanceSwaps', () => {
  it('should return correct swaps when the pool is not balanced', async () => {
    const poolWeights = [parseUnits('80', 8), parseUnits('10', 8), parseUnits('10', 8)]
    const mirroredWeights = [parseUnits('30', 8), parseUnits('30', 8), parseUnits('40', 8)]
    const poolValue = parseEther('100')
    const tokenPrices = [parseUnits('1', 18), parseUnits('2', 18), parseUnits('0.5', 18)]
    const tokenDecimals = [18, 8, 18]
    const percent100 = parseUnits('100', 8)
    const maxDifference = percent100.div(100)
    const swaps = resolveRebalanceSwaps(
      poolWeights,
      mirroredWeights,
      poolValue,
      tokenPrices,
      tokenDecimals,
      percent100,
      maxDifference
    )
    expect(swaps.length).eq(2)

    const [swap1, swap2] = swaps

    expect(swap1.idxSell).eq(0)
    expect(swap1.idxBuy).eq(2)
    expect(swap1.amountSell).eq(parseUnits('30', 18))
    expect(swap1.amountBuy).eq(parseUnits('60', 18))
    expect(swap1.weightsAfter.map((x) => x.toString())).have.members([
      parseUnits('50', 8).toString(),
      parseUnits('10', 8).toString(),
      parseUnits('40', 8).toString(),
    ])
    expect(swap1.weightDifferenceAfter).eq(percent100.mul(40).div(100))

    expect(swap2.idxSell).eq(0)
    expect(swap2.idxBuy).eq(1)
    expect(swap2.amountSell).eq(parseUnits('20', 18))
    expect(swap2.amountBuy).eq(parseUnits('10', 8))
    expect(swap2.weightsAfter.map((x) => x.toString())).have.members([
      parseUnits('30', 8).toString(),
      parseUnits('30', 8).toString(),
      parseUnits('40', 8).toString(),
    ])
    expect(swap2.weightDifferenceAfter).eq(0)
  })

  it('should return empty array if pool is balanced', async () => {
    const poolWeights = [parseUnits('30', 8), parseUnits('31', 8), parseUnits('39', 8)]
    const mirroredWeights = [parseUnits('30', 8), parseUnits('30', 8), parseUnits('40', 8)]
    const poolValue = parseEther('100')
    const tokenPrices = [parseUnits('1', 18), parseUnits('2', 18), parseUnits('0.5', 18)]
    const tokenDecimals = [18, 8, 18]
    const percent100 = parseUnits('100', 8)
    const maxDifference = percent100.div(50)
    const swaps = resolveRebalanceSwaps(
      poolWeights,
      mirroredWeights,
      poolValue,
      tokenPrices,
      tokenDecimals,
      percent100,
      maxDifference
    )
    expect(swaps).have.lengthOf(0)
  })
})
