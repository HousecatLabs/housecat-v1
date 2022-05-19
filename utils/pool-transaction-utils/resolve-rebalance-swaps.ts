import { BigNumber } from 'ethers'
import { formatUnits } from 'ethers/lib/utils'

interface SimulatedSwap {
  idxSell: number
  idxBuy: number
  amountSell: BigNumber
  amountBuy: BigNumber
  weightsAfter: BigNumber[]
  weightDifferenceAfter: BigNumber
}

const valueToAmount = (value: BigNumber, price: BigNumber, decimals: number): BigNumber => {
  return value.mul(BigNumber.from(10).pow(decimals)).div(price)
}

const getWeightDifference = (currentWeights: BigNumber[], mirroredWeights: BigNumber[]): BigNumber => {
  const differences = mirroredWeights.map((weight, idx) => currentWeights[idx].sub(weight))
  return differences.reduce((total, x) => total.add(x.abs()), BigNumber.from(0))
}

const simulateSwap = (
  currentWeights: BigNumber[],
  mirroredWeights: BigNumber[],
  poolValue: BigNumber,
  tokenPrices: BigNumber[],
  tokenDecimals: number[],
  percent100: BigNumber
): SimulatedSwap => {
  const percent100Decimals = Math.log10(percent100.toNumber())
  const differences = mirroredWeights
    .map((weight, idx) => ({ idx, diff: currentWeights[idx].sub(weight) }))
    .sort((a, b) => parseFloat(formatUnits(b.diff.sub(a.diff), percent100Decimals)))
  const excess = differences[0]
  const shortage = differences[differences.length - 1]
  const excessValue = excess.diff.mul(poolValue).div(percent100)
  const shortageValue = shortage.diff.mul(-1).mul(poolValue).div(percent100)
  const idxSell = excess.idx
  const idxBuy = shortage.idx
  if (excessValue.lte(shortageValue)) {
    // sell all of the excess token
    const amountSell = valueToAmount(excessValue, tokenPrices[idxSell], tokenDecimals[idxSell])
    const amountBuy = valueToAmount(excessValue, tokenPrices[idxBuy], tokenDecimals[idxBuy])
    const weightsAfter = currentWeights.map((x, idx) => {
      if (idx === idxSell) {
        return x.sub(excess.diff)
      }
      if (idx === idxBuy) {
        return x.add(excess.diff)
      }
      return x
    })
    const weightDifferenceAfter = getWeightDifference(weightsAfter, mirroredWeights)
    return { idxSell, idxBuy, amountSell, amountBuy, weightsAfter, weightDifferenceAfter }
  } else {
    // buy all of the shortage token
    const amountSell = valueToAmount(shortageValue, tokenPrices[idxSell], tokenDecimals[idxSell])
    const amountBuy = valueToAmount(shortageValue, tokenPrices[idxBuy], tokenDecimals[idxBuy])
    const weightsAfter = currentWeights.map((x, idx) => {
      if (idx === idxSell) {
        return x.add(shortage.diff)
      }
      if (idx === idxBuy) {
        return x.sub(shortage.diff)
      }
      return x
    })
    const weightDifferenceAfter = getWeightDifference(weightsAfter, mirroredWeights)
    return { idxSell, idxBuy, amountSell, amountBuy, weightsAfter, weightDifferenceAfter }
  }
}

const resolveRebalanceSwaps = (
  poolWeights: BigNumber[],
  mirroredWeights: BigNumber[],
  poolValue: BigNumber,
  tokenPrices: BigNumber[],
  tokenDecimals: number[],
  percent100: BigNumber,
  maxDifference: BigNumber
): SimulatedSwap[] => {
  let currentWeights = poolWeights
  let weightDifference = getWeightDifference(currentWeights, mirroredWeights)
  const swaps = []
  while (weightDifference.gt(maxDifference)) {
    const simulated = simulateSwap(currentWeights, mirroredWeights, poolValue, tokenPrices, tokenDecimals, percent100)
    currentWeights = simulated.weightsAfter
    weightDifference = simulated.weightDifferenceAfter
    swaps.push(simulated)
  }
  return swaps
}

export default resolveRebalanceSwaps
