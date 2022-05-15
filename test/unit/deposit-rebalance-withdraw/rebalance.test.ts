import { ethers } from 'hardhat'
import { expect } from 'chai'
import mockHousecatAndPool from '../../utils/mock-housecat-and-pool'
import { parseEther } from 'ethers/lib/utils'
import { deposit } from '../../utils/deposit-withdraw'
import { increaseTime, SECONDS } from '../../../utils/evm'

describe('HousecatPool: rebalance', () => {
  it('only owner allowed to call', async () => {
    const [signer, mirrored] = await ethers.getSigners()
    const { pool, adapters } = await mockHousecatAndPool({ signer, mirrored })
    const encoder = new ethers.utils.AbiCoder()
    const data = encoder.encode(['string'], ['foobar'])
    const rebalance = pool.connect(mirrored).rebalance([{ adapter: adapters.uniswapV2Adapter.address, data }])
    await expect(rebalance).revertedWith('Ownable: caller is not the owner')
  })

  it('should fail to reduce the pool net value more than the allowed slippage limit', async () => {
    const [signer, mirrored] = await ethers.getSigners()
    const { pool, weth, adapters, amm, assets } = await mockHousecatAndPool({
      signer,
      mirrored,
      weth: { price: '1', amountToMirrored: '10' },
      assets: [{ price: '1', reserveToken: '20', reserveWeth: '20' }],
      rebalanceSettings: {
        tradeTax: 0,
        minSecondsBetweenRebalances: 0,
        maxSlippage: 1e6
      }
    })

    // send initial deposit of 10 ETH
    await deposit(pool, adapters, signer, parseEther('10'))

    // send a low liquidity Asset0 to the mirrored
    assets[0].token.mint(mirrored.address, parseEther('10'))

    // try to rebalance
    const tx = pool.connect(signer).rebalance([
      {
        adapter: adapters.uniswapV2Adapter.address,
        data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
          amm.address,
          [weth.token.address, assets[0].token.address],
          parseEther('5'),
          1,
        ]),
      },
    ])
    await expect(tx).revertedWith('HousecatPool: pool value reduced')
  })

  it('should fail if rebalance is locked due to a recent rebalance', async () => {
    const [signer, mirrored] = await ethers.getSigners()
    const { pool, adapters } = await mockHousecatAndPool({
      signer,
      mirrored,
      weth: { price: '1', amountToMirrored: '10' },
      assets: [{ price: '1', reserveToken: '20', reserveWeth: '20' }],
      rebalanceSettings: {
        minSecondsBetweenRebalances: 60,
        maxSlippage: 1e6,
        tradeTax: 0,
      },
    })

    // initial deposit
    await deposit(pool, adapters, signer, parseEther('1'))

    // rebalance
    await pool.rebalance([])

    // wait 50 seconds when 60 seconds is the lock period
    await increaseTime(50 * SECONDS)

    // try rebalance
    const rebalance2 = pool.rebalance([])
    await expect(rebalance2).revertedWith('HousecatPool: rebalance locked')

    await increaseTime(10 * SECONDS)

    // try rebalance again when time has passed
    const rebalance3 = pool.rebalance([])
    await expect(rebalance3).not.reverted
  })

  it('should emit RebalancePool event', async () => {
    const [signer, mirrored] = await ethers.getSigners()
    const { pool, adapters } = await mockHousecatAndPool({
      signer,
      mirrored,
      weth: { price: '1', amountToMirrored: '10' },
      assets: [{ price: '1', reserveToken: '20', reserveWeth: '20' }],
      rebalanceSettings: {
        minSecondsBetweenRebalances: 60,
        maxSlippage: 1e6,
        tradeTax: 0,
      },
    })

    // initial deposit
    await deposit(pool, adapters, signer, parseEther('1'))

    // rebalance
    const rebalance = pool.rebalance([])
    await expect(rebalance).emit(pool, 'RebalancePool')
  })

  it('TODO: should fail to increase the weight difference', () => {
    // TODO
  })
})
