import { ethers } from 'hardhat'
import { expect } from 'chai'
import { formatEther, parseEther, parseUnits } from 'ethers/lib/utils'
import mockHousecatAndPool from '../../utils/mock-housecat-and-pool'
import { DAYS, increaseTime } from '../../../utils/evm'
import { mockPriceFeed } from '../../../utils/mock-defi'
import { deposit } from '../../utils/deposit-withdraw'

describe('HousecatPool: withdraw', () => {
  it('should fail to increase the weights difference between the pool and the mirrored', async () => {
    const [signer, mirrorer, mirrored] = await ethers.getSigners()
    const { pool, adapters, amm, assets, weth } = await mockHousecatAndPool({ signer, mirrored })

    // initial deposit
    const amountDeposit = parseEther('10')
    await pool.connect(mirrorer).deposit(
      mirrorer.address,
      [
        {
          adapter: adapters.wethAdapter.address,
          data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [amountDeposit]),
        },
      ],
      { value: amountDeposit }
    )

    // try to trade WETH to Asset0 on withdraw
    const tx = pool.connect(mirrorer).withdraw(mirrorer.address, [
      {
        adapter: adapters.uniswapV2Adapter.address,
        data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
          amm.address,
          [weth.token.address, assets[0].token.address],
          parseEther('1'),
          1,
        ]),
      },
    ])
    await expect(tx).revertedWith('HousecatPool: weight diff increased')
  })

  it('should fail to change current weights of the pool if the mirrored value is less than minMirroredValue', async () => {
    const [signer, mirrored] = await ethers.getSigners()
    const { pool, adapters, assets, amm, weth, mgmt } = await mockHousecatAndPool({
      signer,
      mirrored,
      weth: { price: '1', amountToMirrored: '2' },
      assets: [{ price: '1', reserveToken: '1000', reserveWeth: '1000', amountToMirrored: '0' }],
    })

    // initial deposit
    await deposit(pool, adapters, signer, parseEther('2'))

    // send asset0 to mirrored
    await assets[0].token.mint(mirrored.address, parseEther('2'))

    // update mirror settings
    await mgmt.updateMirrorSettings({
      minPoolValue: 0,
      minMirroredValue: parseEther('4').add(1),
      maxWeightDifference: 1e6,
    })

    // withdraw when mirrored weights have changed and the mirrored value is too small
    const tx = pool.withdraw(signer.address, [
      {
        adapter: adapters.uniswapV2Adapter.address,
        data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
          amm.address,
          [weth.token.address, assets[0].token.address],
          parseEther('0.5'),
          1,
        ]),
      },
      {
        adapter: adapters.wethAdapter.address,
        data: adapters.wethAdapter.interface.encodeFunctionData('withdraw', [parseEther('1')]),
      },
    ])
    await expect(tx).revertedWith('HousecatPool: weight diff increased')
  })

  it('TODO: should fail to change the loan weights of the pool', async () => {
    // TODO: implement when mock Aave implemented
  })

  it('should fail to withdraw more than what the withdrawer owns', async () => {
    const [signer, mirrored, mirrorer1, mirrorer2] = await ethers.getSigners()
    const { pool, adapters } = await mockHousecatAndPool({
      signer,
      mirrored,
      weth: { price: '1', amountToMirrored: '5' },
      assets: [{ price: '1', reserveToken: '10000', reserveWeth: '10000' }],
      loans: [{ price: '1' }],
    })

    // deposit by mirrorer1
    const amountDeposit = parseEther('10')

    await pool.connect(mirrorer1).deposit(
      mirrorer1.address,
      [
        {
          adapter: adapters.wethAdapter.address,
          data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [amountDeposit]),
        },
      ],
      { value: amountDeposit }
    )

    // deposit by another user
    await pool.connect(mirrorer2).deposit(
      mirrorer2.address,
      [
        {
          adapter: adapters.wethAdapter.address,
          data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [amountDeposit]),
        },
      ],
      { value: amountDeposit }
    )

    // withdraw by mirrorer1
    const tx = pool.connect(mirrorer1).withdraw(mirrorer1.address, [
      {
        adapter: adapters.wethAdapter.address,
        data: adapters.wethAdapter.interface.encodeFunctionData('withdraw', [amountDeposit.add(1)]),
      },
    ])
    await expect(tx).revertedWith('balance exceeded')
  })

  it('should burn pool tokens an amount being equal to the reduction of pool net value', async () => {
    const [signer, mirrored, mirrorer1, mirrorer2] = await ethers.getSigners()
    const { pool, adapters } = await mockHousecatAndPool({
      signer,
      mirrored,
      weth: { price: '1', amountToMirrored: '10' },
      assets: [{ price: '1', reserveToken: '10000', reserveWeth: '10000' }],
      loans: [{ price: '1' }],
    })

    // initial deposit by mirrorer1
    const amountDeposit1 = parseEther('8')
    await pool.connect(mirrorer1).deposit(
      mirrorer1.address,
      [
        {
          adapter: adapters.wethAdapter.address,
          data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [amountDeposit1]),
        },
      ],
      { value: amountDeposit1 }
    )

    // deposit by mirrorer2
    const amountDeposit2 = parseEther('4')
    await pool.connect(mirrorer2).deposit(
      mirrorer2.address,
      [
        {
          adapter: adapters.wethAdapter.address,
          data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [amountDeposit2]),
        },
      ],
      { value: amountDeposit2 }
    )

    // withdraw by mirrorer2
    await pool.connect(mirrorer2).withdraw(mirrorer2.address, [
      {
        adapter: adapters.wethAdapter.address,
        data: adapters.wethAdapter.interface.encodeFunctionData('withdraw', [parseEther('2')]),
      },
    ])

    const totalSupply = await pool.totalSupply()

    // mirrorer1 should hold 8 / 10 of total supply after the withdraw
    expect(await pool.balanceOf(mirrorer1.address)).equal(totalSupply.mul(8).div(10))

    // mirrorer2 should hold 2 / 10 of total supply after the withdraw
    expect(await pool.balanceOf(mirrorer2.address)).equal(totalSupply.mul(2).div(10))
  })

  it('should burn all tokens if the remaining value of pool tokens after withrawal is less than 0.05 USD', async () => {
    const [signer, mirrorer, mirrored] = await ethers.getSigners()
    const { pool, adapters } = await mockHousecatAndPool({ signer, mirrored })

    // deposit
    const amountDeposit = parseEther('10')
    await pool.connect(mirrorer).deposit(
      mirrorer.address,
      [
        {
          adapter: adapters.wethAdapter.address,
          data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [amountDeposit]),
        },
      ],
      { value: amountDeposit }
    )

    // withdraw
    await pool.connect(mirrorer).withdraw(mirrorer.address, [
      {
        adapter: adapters.wethAdapter.address,
        data: adapters.wethAdapter.interface.encodeFunctionData('withdraw', [parseEther('9.951')]),
      },
    ])

    expect(await pool.balanceOf(mirrorer.address)).equal(0)
  })

  it('should withdraw on behalf of another address', async () => {
    const [signer, mirrorer, mirrored, otherUser] = await ethers.getSigners()
    const { pool, adapters } = await mockHousecatAndPool({ signer, mirrored })

    // deposit
    const amountDeposit = parseEther('10')
    await pool.connect(mirrorer).deposit(
      mirrorer.address,
      [
        {
          adapter: adapters.wethAdapter.address,
          data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [amountDeposit]),
        },
      ],
      { value: amountDeposit }
    )

    // balance of otherUser before
    const balanceBefore = await otherUser.getBalance()

    // withdraw to otherUser
    await pool.connect(mirrorer).withdraw(otherUser.address, [
      {
        adapter: adapters.wethAdapter.address,
        data: adapters.wethAdapter.interface.encodeFunctionData('withdraw', [parseEther('5')]),
      },
    ])

    // balance of otherUser after
    const balanceAfter = await otherUser.getBalance()

    expect(balanceAfter.sub(balanceBefore)).eq(parseEther('5'))
  })

  it('should emit TransferPoolToken event', async () => {
    const [signer, mirrorer, mirrored, otherUser] = await ethers.getSigners()
    const { pool, adapters } = await mockHousecatAndPool({ signer, mirrored })

    // deposit
    const amountDeposit = parseEther('10')
    await pool.connect(mirrorer).deposit(
      mirrorer.address,
      [
        {
          adapter: adapters.wethAdapter.address,
          data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [amountDeposit]),
        },
      ],
      { value: amountDeposit }
    )

    // withdraw to otherUser
    const tx = pool.connect(mirrorer).withdraw(otherUser.address, [
      {
        adapter: adapters.wethAdapter.address,
        data: adapters.wethAdapter.interface.encodeFunctionData('withdraw', [parseEther('5')]),
      },
    ])

    // the emitted event should include the address of the account who sent pool tokens, not otherUser
    await expect(tx)
      .emit(pool, 'TransferPoolToken')
      .withArgs(mirrorer.address, ethers.constants.AddressZero, parseEther('5'), parseEther('5'))
  })

  it('should settle accrued management fee', async () => {
    const [signer, treasury, mirrorer, mirrored] = await ethers.getSigners()
    const { pool, adapters } = await mockHousecatAndPool({
      signer,
      treasury,
      mirrored,
      managementFee: {
        defaultFee: parseUnits('0.01', 8),
        maxFee: parseUnits('0.01', 8),
        protocolTax: parseUnits('0.25', 8),
      },
    })

    // deposit
    const amountDeposit = parseEther('8')
    await pool.connect(mirrorer).deposit(
      mirrorer.address,
      [
        {
          adapter: adapters.wethAdapter.address,
          data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [amountDeposit]),
        },
      ],
      { value: amountDeposit }
    )

    // increase time
    await increaseTime(DAYS * 10)

    // withdraw
    const amountWithdraw = parseEther('4')
    const withdraw = await pool.connect(mirrorer).withdraw(mirrorer.address, [
      {
        adapter: adapters.wethAdapter.address,
        data: adapters.wethAdapter.interface.encodeFunctionData('withdraw', [amountWithdraw]),
      },
    ])

    await expect(withdraw).emit(pool, 'ManagementFeeSettled')
    expect(await pool.balanceOf(mirrored.address)).gt(0)
    expect(await pool.balanceOf(treasury.address)).gt(0)
  })

  it('should settle accrued performance fee', async () => {
    const [signer, treasury, mirrorer, mirrored] = await ethers.getSigners()
    const { pool, adapters, weth, mgmt } = await mockHousecatAndPool({
      signer,
      treasury,
      mirrored,
      performanceFee: {
        defaultFee: parseUnits('0.1', 8),
        maxFee: parseUnits('0.1', 8),
        protocolTax: parseUnits('0.25', 8),
      },
    })

    // deposit
    const amountDeposit = parseEther('8')
    await pool.connect(mirrorer).deposit(
      mirrorer.address,
      [
        {
          adapter: adapters.wethAdapter.address,
          data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [amountDeposit]),
        },
      ],
      { value: amountDeposit }
    )

    // increase pool value
    const newPriceFeed = await mockPriceFeed(signer, parseUnits('2', 8), 8)
    await mgmt.setTokenMeta(weth.token.address, {
      priceFeed: newPriceFeed.address,
      decimals: 18,
      delisted: false,
    })

    // withdraw
    const amountWithdraw = parseEther('4')
    const withdraw = await pool.connect(mirrorer).withdraw(mirrorer.address, [
      {
        adapter: adapters.wethAdapter.address,
        data: adapters.wethAdapter.interface.encodeFunctionData('withdraw', [amountWithdraw]),
      },
    ])

    await expect(withdraw).emit(pool, 'PerformanceFeeSettled')
    expect(await pool.balanceOf(mirrored.address)).gt(0)
    expect(await pool.balanceOf(treasury.address)).gt(0)
  })

  it('should decrease performance fee high watermark value by the withdraw value', async () => {
    const [signer, treasury, mirrorer, mirrored] = await ethers.getSigners()
    const { pool, adapters } = await mockHousecatAndPool({
      signer,
      treasury,
      mirrored,
      performanceFee: {
        defaultFee: parseUnits('0.1', 8),
        maxFee: parseUnits('0.1', 8),
        protocolTax: parseUnits('0.25', 8),
      },
    })

    // deposit 1
    const amountDeposit1 = parseEther('8')
    const deposit1 = await pool.deposit(
      mirrorer.address,
      [
        {
          adapter: adapters.wethAdapter.address,
          data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [amountDeposit1]),
        },
      ],
      { value: amountDeposit1 }
    )

    // deposit 2
    const amountDeposit2 = parseEther('4')
    const deposit2 = await pool.deposit(
      mirrorer.address,
      [
        {
          adapter: adapters.wethAdapter.address,
          data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [amountDeposit2]),
        },
      ],
      { value: amountDeposit2 }
    )

    await expect(deposit1).emit(pool, 'PerformanceFeeHighWatermarkUpdated').withArgs(amountDeposit1)
    await expect(deposit2).emit(pool, 'PerformanceFeeHighWatermarkUpdated').withArgs(amountDeposit1.add(amountDeposit2))
  })

  it('should be able to unwind position in a delisted token on withdraw', async () => {
    const [signer, treasury, mirrorer, mirrored] = await ethers.getSigners()
    const { pool, adapters, mgmt, assets, amm, weth } = await mockHousecatAndPool({
      signer,
      treasury,
      mirrored,
      weth: { price: '1', amountToMirrored: '0' },
      assets: [
        { price: '1', reserveToken: '100000', reserveWeth: '100000', amountToMirrored: '10' },
        { price: '1', reserveToken: '100000', reserveWeth: '100000', amountToMirrored: '10' },
      ],
    })

    // deposit 10 ETH by mirrorer (trade WETH to 50/50 Asset0 and Asset1)
    const amountDeposit = parseEther('10')
    await pool.connect(mirrorer).deposit(
      mirrorer.address,
      [
        {
          adapter: adapters.wethAdapter.address,
          data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [amountDeposit]),
        },
        {
          adapter: adapters.uniswapV2Adapter.address,
          data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
            amm.address,
            [weth.token.address, assets[0].token.address],
            amountDeposit.div(2),
            1,
          ]),
        },
        {
          adapter: adapters.uniswapV2Adapter.address,
          data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
            amm.address,
            [weth.token.address, assets[1].token.address],
            amountDeposit.div(2),
            1,
          ]),
        },
      ],
      { value: amountDeposit }
    )

    const ethBalanceBeforeWithdraw = await mirrorer.getBalance()
    const poolBalanceBeforeWithdraw = await pool.balanceOf(mirrorer.address)

    // delist token 0
    await mgmt.setTokenMeta(assets[0].token.address, {
      ...(await mgmt.getTokenMeta(assets[0].token.address)),
      delisted: true,
    })

    // withdraw 5 ETH by mirrorer (unwind position in Asset0)
    await pool.connect(mirrorer).withdraw(mirrorer.address, [
      {
        adapter: adapters.uniswapV2Adapter.address,
        data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
          amm.address,
          [assets[0].token.address, weth.token.address],
          await assets[0].token.balanceOf(pool.address),
          1,
        ]),
      },
      {
        adapter: adapters.wethAdapter.address,
        data: adapters.wethAdapter.interface.encodeFunctionData('withdrawUntil', [0]),
      },
    ])

    const ethBalanceAfterWithdraw = await mirrorer.getBalance()
    const poolBalanceAfterWithdraw = await pool.balanceOf(mirrorer.address)

    // should receive ~5 ETH
    expect(parseFloat(formatEther(ethBalanceAfterWithdraw.sub(ethBalanceBeforeWithdraw)))).approximately(5, 0.05)

    // should burn 50% of the pool position
    expect(poolBalanceBeforeWithdraw.div(poolBalanceAfterWithdraw)).equal(2)
  })
})
