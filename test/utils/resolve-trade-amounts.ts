import { BigNumber } from 'ethers'
import { parseEther } from 'ethers/lib/utils'

export const resolveBuyAmounts = (
  depositAmount: BigNumber,
  depositValue: BigNumber,
  poolValue: BigNumber,
  poolWeights: BigNumber[],
  mirroredWeights: BigNumber[],
  percent100: BigNumber
): BigNumber[] => {
  const poolValueAfterDeposit = poolValue.add(depositValue)
  const poolWeightsAfterDeposit = poolWeights.map((weight) => poolValue.mul(weight).div(poolValueAfterDeposit))
  const weightDifferences = poolWeightsAfterDeposit.map((weight, idx) => mirroredWeights[idx].sub(weight))
  const weightDifferencesInValue = weightDifferences.map((weight) => poolValueAfterDeposit.mul(weight).div(percent100))

  // fill shortages first
  let remainingDepositValue = depositValue
  const fillValues = weightDifferencesInValue.map((difference) => {
    if (difference.gt(0) && difference.lte(remainingDepositValue)) {
      remainingDepositValue = remainingDepositValue.sub(difference)
      return difference
    }
    if (remainingDepositValue.lt(difference)) {
      const remaining = remainingDepositValue
      remainingDepositValue = BigNumber.from(0)
      return remaining
    }
    return BigNumber.from(0)
  })

  // allocate remaining amount based on mirrored weights
  const increaseValues = mirroredWeights.map((weight) => remainingDepositValue.mul(weight).div(percent100))
  const totalDepositValues = fillValues.map((x, idx) => x.add(increaseValues[idx]))
  const depositAmounts = totalDepositValues.map((value) => depositAmount.mul(value).div(depositValue))
  return depositAmounts
}

export const resolveSellAmounts = (
  withdrawPercentage: BigNumber,
  poolValue: BigNumber,
  poolBalances: BigNumber[],
  poolWeights: BigNumber[],
  mirroredWeights: BigNumber[],
  percent100: BigNumber
) => {
  const poolValues = poolWeights.map((weight) => weight.mul(poolValue).div(percent100))
  const poolValueAfterWithdraw = poolValue.mul(percent100.sub(withdrawPercentage)).div(percent100)
  const targetValues = mirroredWeights.map((weight) => weight.mul(poolValueAfterWithdraw).div(percent100))
  const surplusValues = poolValues.map((value, idx) => value.sub(targetValues[idx]))

  // remove surplus first
  let remainingWithdrawValue = poolValue.sub(poolValueAfterWithdraw)
  const removeSurplusValues = surplusValues.map((value) => {
    if (value.gt(0) && value.lte(remainingWithdrawValue)) {
      remainingWithdrawValue = remainingWithdrawValue.sub(value)
      return value
    }
    if (remainingWithdrawValue.lt(value)) {
      const remaining = remainingWithdrawValue
      remainingWithdrawValue = BigNumber.from(0)
      return remaining
    }
    return BigNumber.from(0)
  })

  // allocate remaining value based on mirrored weights
  const decreaseValues = mirroredWeights.map((weight) => remainingWithdrawValue.mul(weight).div(percent100))
  const totalSellValues = removeSurplusValues.map((value, idx) => value.add(decreaseValues[idx]))
  const oneUSD = parseEther('1')
  const prices = poolValues.map((value, idx) => value.mul(oneUSD).div(poolBalances[idx].gt(0) ? poolBalances[idx] : 1))
  const sellAmounts = totalSellValues.map((value, idx) => value.mul(oneUSD).div(prices[idx].gt(0) ? prices[idx] : 1))
  return sellAmounts
}
