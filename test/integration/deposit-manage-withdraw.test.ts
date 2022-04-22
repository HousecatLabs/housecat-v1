import { ethers } from 'hardhat'
import { formatEther, formatUnits, parseEther } from 'ethers/lib/utils'
import mockHousecatAndPool, { IMockHousecatAndPool } from '../../test/mock/mock-housecat-and-pool'
import {
  DepositAdapter,
  HousecatPool,
  IUniswapV2Router02,
  ManageAssetsAdapter,
  WithdrawAdapter,
} from '../../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber } from 'ethers'
import { ITokenWithPriceFeed } from '../../utils/mock-defi'
import { expect } from 'chai'

const initialDeposit = async (pool: HousecatPool, manager: SignerWithAddress, amount: BigNumber): Promise<void> => {
  await pool.connect(manager).deposit([], { value: amount })
  expect(await pool.balanceOf(manager.address)).equal(amount)
}

const swapWethToTokens = async (
  pool: HousecatPool,
  manager: SignerWithAddress,
  manageAssetsAdapter: ManageAssetsAdapter,
  amm: IUniswapV2Router02,
  weth: ITokenWithPriceFeed,
  tokens: ITokenWithPriceFeed[],
  amountsWeth: BigNumber[]
) => {
  const buyTokenTxs = tokens.map((token, idx) =>
    manageAssetsAdapter.interface.encodeFunctionData('uniswapV2__swapTokens', [
      amm.address,
      [weth.token.address, token.token.address],
      amountsWeth[idx],
      1,
    ])
  )
  await pool.connect(manager).manageAssets(buyTokenTxs)
}

const deposit = async (
  pool: HousecatPool,
  mirrorer: SignerWithAddress,
  depositAdapter: DepositAdapter,
  amm: IUniswapV2Router02,
  weth: ITokenWithPriceFeed,
  tokens: ITokenWithPriceFeed[],
  amountDeposit: BigNumber
) => {
  const [weights] = await pool.getWeights()
  const [, ...tokenWeights] = weights
  const percent100 = await pool.getPercent100()
  const buyTokenTxs = tokens.map((token, idx) =>
    depositAdapter.interface.encodeFunctionData('uniswapV2__swapWETHToToken', [
      amm.address,
      [weth.token.address, token.token.address],
      amountDeposit.mul(tokenWeights[idx]).div(percent100),
      1,
    ])
  )
  await pool.connect(mirrorer).deposit(buyTokenTxs, { value: amountDeposit })
}

const withdraw = async (
  pool: HousecatPool,
  withdrawer: SignerWithAddress,
  withdrawAdapter: WithdrawAdapter,
  amm: IUniswapV2Router02,
  weth: ITokenWithPriceFeed,
  tokens: ITokenWithPriceFeed[],
  amountWithdraw: BigNumber
) => {
  const poolValue = await pool.getValue()
  const percent100 = await pool.getPercent100()
  const withdrawPercentage = amountWithdraw.mul(percent100).div(poolValue)
  const balances = await pool.getBalances()
  const sellTokenTxs = [weth, ...tokens].map((token, idx) =>
    withdrawAdapter.interface.encodeFunctionData('uniswapV2__swapTokenToETH', [
      amm.address,
      [token.token.address, weth.token.address],
      balances[idx].mul(withdrawPercentage).div(percent100),
      1,
    ])
  )
  await pool.connect(withdrawer).withdraw(sellTokenTxs)
}

describe('integration: deposit-manage-withdraw', () => {
  let owner: SignerWithAddress
  let treasury: SignerWithAddress
  let manager: SignerWithAddress
  let mirrorer: SignerWithAddress
  let mock: IMockHousecatAndPool

  before(async () => {
    ;[owner, treasury, manager, mirrorer] = await ethers.getSigners()
    mock = await mockHousecatAndPool(owner, treasury, manager, { price: '1' }, [
      { price: '1', reserveToken: '10000', reserveWeth: '10000' },
      { price: '2', reserveToken: '5000', reserveWeth: '10000' },
      { price: '0.5', reserveToken: '20000', reserveWeth: '10000' },
    ])
  })

  describe('initial deposit of 10 ETH by pool manager', () => {
    before(async () => {
      const { pool } = mock
      await initialDeposit(pool, manager, parseEther('10'))
    })

    it('managers pool token balance should equal the deposit value', async () => {
      expect(await mock.pool.balanceOf(manager.address)).equal(parseEther('10'))
    })

    it('pool value should increase by the value of the deposit', async () => {
      expect(await mock.pool.getValue()).equal(parseEther('10'))
    })

    it('pool total supply should equal the holdings of the manager', async () => {
      expect(await mock.pool.totalSupply()).equal(await mock.pool.balanceOf(manager.address))
    })

    it('pool should hold 100% WETH', async () => {
      const [weights] = await mock.pool.getWeights()
      expect(weights[0]).equal(await mock.pool.getPercent100())
    })
  })

  describe('pool manager trades from 100% weth to 25% of each four token', () => {
    before(async () => {
      const { pool, manageAssetsAdapter, amm, weth, tokens } = mock
      await swapWethToTokens(pool, manager, manageAssetsAdapter, amm, weth, tokens, [
        parseEther('2.5'),
        parseEther('2.5'),
        parseEther('2.5'),
      ])
    })

    it('pool value should not decrease more than the amount of trade fees and slippage', async () => {
      const poolValue = await mock.pool.getValue()
      expect(poolValue).gt(parseEther('9.97'))
    })

    it('pool total supply should not change as a result of trading assets', async () => {
      const totalSupply = await mock.pool.totalSupply()
      expect(totalSupply).equal(parseEther('10'))
    })

    it('pool should hold 25% of each four token', async () => {
      const [weights] = await mock.pool.getWeights()
      weights.forEach((weight) => {
        const percent = parseFloat(formatUnits(weight, 8))
        expect(percent).approximately(0.25, 0.01)
      })
    })
  })

  describe('mirrorer deposits 10 ETH', () => {
    let poolValueBefore: BigNumber

    before(async () => {
      const { pool, depositAdapter, amm, weth, tokens } = mock
      poolValueBefore = await pool.getValue()
      await deposit(pool, mirrorer, depositAdapter, amm, weth, tokens, parseEther('10'))
    })

    it('pool value should increase by the deposit value minus trade fees', async () => {
      const poolValue = await mock.pool.getValue()
      const change = parseFloat(formatEther(poolValue.sub(poolValueBefore)))
      expect(change).approximately(10, 0.03)
    })

    it('pool weights should not change (should still hold 25% of each token)', async () => {
      const [weights] = await mock.pool.getWeights()
      weights.forEach((weight) => {
        const percent = parseFloat(formatUnits(weight, 8))
        expect(percent).approximately(0.25, 0.01)
      })
    })

    it('mirrorer should hold ~50% of the pool token supply after the deposit', async () => {
      const totalSupply = parseFloat(formatEther(await mock.pool.totalSupply()))
      const mirrorerBalance = parseFloat(formatEther(await mock.pool.balanceOf(mirrorer.address)))
      const share = mirrorerBalance / totalSupply
      expect(share).approximately(0.5, 0.01)
    })
  })

  describe('mirrorer withdraws 5 ETH', () => {
    let mirrorerBalanceBefore: BigNumber
    let poolValueBefore: BigNumber

    before(async () => {
      const { pool, withdrawAdapter, amm, weth, tokens } = mock
      mirrorerBalanceBefore = await mirrorer.getBalance()
      poolValueBefore = await pool.getValue()
      await withdraw(pool, mirrorer, withdrawAdapter, amm, weth, tokens, parseEther('5'))
    })

    it('withdrawer should receive ~5 ETH', async () => {
      const balance = await mirrorer.getBalance()
      const balanceAdded = parseFloat(formatEther(balance.sub(mirrorerBalanceBefore)))
      expect(balanceAdded).approximately(5.0, 0.01)
    })

    it('pool value should decrease by the withdrawn value plus trade fees', async () => {
      const poolValue = await mock.pool.getValue()
      const change = parseFloat(formatEther(poolValueBefore.sub(poolValue)))
      expect(change).approximately(5, 0.01)
    })

    it('pool weights should not change (should still hold 25% of each token)', async () => {
      const [weights] = await mock.pool.getWeights()
      weights.forEach((weight) => {
        const percent = parseFloat(formatUnits(weight, 8))
        expect(percent).approximately(0.25, 0.01)
      })
    })

    it('mirrorer should hold 1/3 of the pool token supply after the withdrawal', async () => {
      const totalSupply = parseFloat(formatEther(await mock.pool.totalSupply()))
      const mirrorerBalance = parseFloat(formatEther(await mock.pool.balanceOf(mirrorer.address)))
      const share = mirrorerBalance / totalSupply
      expect(share).approximately(1 / 3, 0.01)
    })
  })
})
