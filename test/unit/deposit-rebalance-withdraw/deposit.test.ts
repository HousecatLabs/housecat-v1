import { ethers } from 'hardhat'
import { expect } from 'chai'
import { formatEther, parseEther, parseUnits } from 'ethers/lib/utils'
import mockHousecatAndPool from '../../utils/mock-housecat-and-pool'
import { DAYS, increaseTime } from '../../../utils/evm'
import { mockPriceFeed } from '../../../utils/mock-defi'
import { deposit } from '../../utils/deposit-withdraw'

describe('HousecatPool: deposit', () => {
  it('should fail to increase the weight difference between the pool and the mirrored account', async () => {
    const [signer, mirrored] = await ethers.getSigners()
    const { pool, adapters, amm, assets, weth } = await mockHousecatAndPool({ signer, mirrored })

    // deposit ETH and try to trade half of it to Asset0
    const amountDeposit = parseEther('5')
    const tx = pool.deposit(
      signer.address,
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
            parseEther('2'),
            1,
          ]),
        },
      ],
      { value: amountDeposit }
    )
    await tx
    expect(tx).revertedWith('HousecatPool: weight diff increased')
  })

  it('TODO: should fail to change the loan weights of the pool to differ from the mirrored weights', async () => {
    // TODO: implement when mock Aave implemented
  })

  it('should fail to change the loan ratio of the pool to differ from the mirrored loan ratio', async () => {
    const [signer, mirrored] = await ethers.getSigners()
    const { pool, adapters, loans } = await mockHousecatAndPool({
      signer,
      mirrored,
      weth: { price: '1', amountToMirrored: '10' },
      assets: [{ price: '1', reserveToken: '10000', reserveWeth: '10000' }],
      loans: [{ price: '1', amountToMirrored: '0' }],
    })

    // initial deposit when mirrored holds only weth
    await deposit(pool, adapters, signer, parseEther('10'))

    // add loan to mirrored and pool
    await loans[0].token.mint(mirrored.address, parseEther('5'))
    await loans[0].token.mint(pool.address, parseEther('5'))

    // deposit ETH without adjusting the loan position
    const tx = deposit(pool, adapters, signer, parseEther('10'))

    await expect(tx).revertedWith('HousecatPool: weight diff increased')
  })

  it('should fail to deposit when the mirrored account holds nothing', async () => {
    const [signer, mirrored] = await ethers.getSigners()
    const { pool, adapters } = await mockHousecatAndPool({ signer, mirrored, weth: { price: '1' } })
    const tx = deposit(pool, adapters, signer, parseEther('2'))
    await expect(tx).revertedWith('HousecatPool: weight diff increased')
  })

  it('should fail to reduce the net value of the pool', async () => {
    const [signer, mirrored] = await ethers.getSigners()
    const { pool, weth, adapters, amm, assets } = await mockHousecatAndPool({ signer, mirrored })

    // send initial deposit of 10 ETH
    const amountDeposit = parseEther('10')
    await pool.deposit(
      signer.address,
      [
        {
          adapter: adapters.wethAdapter.address,
          data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [amountDeposit]),
        },
      ],
      { value: amountDeposit }
    )

    // try to send a deposit with 0 amount but trading assets back and forth to spend on trade fees
    const amountIn = parseEther('5')
    const pathBuy = [weth.token.address, assets[0].token.address]
    const pathSell = [assets[0].token.address, weth.token.address]
    const amountOut = (await amm.getAmountsOut(amountIn, pathBuy))[1]
    const tx = pool.deposit(signer.address, [
      {
        adapter: adapters.uniswapV2Adapter.address,
        data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [amm.address, pathBuy, amountIn, 1]),
      },
      {
        adapter: adapters.uniswapV2Adapter.address,
        data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
          amm.address,
          pathSell,
          amountOut,
          1,
        ]),
      },
    ])
    await expect(tx).revertedWith('HousecatPool: pool value reduced')
  })

  it('should fail to reduce the eth balance of the pool', async () => {
    const [signer, mirrored] = await ethers.getSigners()
    const { pool, adapters } = await mockHousecatAndPool({ signer, mirrored })

    // send initial deposit of 10 ETH
    await deposit(pool, adapters, signer, parseEther('10'))

    // try to swap WETH to ETH (reducing the net value of the assets)
    const tx = pool.deposit(signer.address, [
      {
        adapter: adapters.wethAdapter.address,
        data: adapters.wethAdapter.interface.encodeFunctionData('withdraw', [parseEther('1')]),
      },
    ])
    await expect(tx).revertedWith('HousecatPool: ETH balance changed')
  })

  it('should fail to deposit if pool has holders but non positive net value', async () => {
    const [signer, mirrorer1, , mirrorer2, mirrored] = await ethers.getSigners()
    const { pool, mgmt, adapters, amm, weth, assets } = await mockHousecatAndPool({
      signer,
      mirrored,
      assets: [{ price: '1', amountToMirrored: '10', reserveToken: '10000', reserveWeth: '10000' }],
    })

    // initial deposit so that the pool holds asset0
    await pool.connect(mirrorer1).deposit(
      mirrorer1.address,
      [
        {
          adapter: adapters.wethAdapter.address,
          data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [parseEther('5')]),
        },
        {
          adapter: adapters.uniswapV2Adapter.address,
          data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
            amm.address,
            [weth.token.address, assets[0].token.address],
            parseEther('5'),
            1,
          ]),
        },
      ],
      { value: parseEther('5') }
    )

    // set the value of asset0 to 0
    const zeroFeed = await mockPriceFeed(signer, 0, 8)
    await mgmt.setTokenMeta(assets[0].token.address, {
      ...(await mgmt.getTokenMeta(assets[0].token.address)),
      priceFeed: zeroFeed.address,
    })

    // try to deposit
    const deposit2 = pool.connect(mirrorer2).deposit(
      mirrorer2.address,
      [
        {
          adapter: adapters.wethAdapter.address,
          data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [parseEther('5')]),
        },
        {
          adapter: adapters.uniswapV2Adapter.address,
          data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
            amm.address,
            [weth.token.address, assets[0].token.address],
            parseEther('5'),
            1,
          ]),
        },
      ],
      { value: parseEther('5') }
    )

    await expect(deposit2).revertedWith('HousecatPool: pool value 0')
  })

  it('should mint pool tokens an amount equal to the deposit value when the pool total supply is zero', async () => {
    const [signer, mirrorer, mirrored] = await ethers.getSigners()
    const { pool, adapters } = await mockHousecatAndPool({ signer, mirrored })
    await deposit(pool, adapters, mirrorer, parseEther('10'))
    expect(await pool.balanceOf(mirrorer.address)).equal(parseEther('10'))
  })

  it('should mint pool tokens the correct amount when the pool has existing holders', async () => {
    const [signer, mirrorer1, mirrorer2, mirrored] = await ethers.getSigners()
    const { pool, adapters } = await mockHousecatAndPool({ signer, mirrored })

    // initial deposit by mirrorer1
    await deposit(pool, adapters, mirrorer1, parseEther('8'))

    // deposit by another user
    await deposit(pool, adapters, mirrorer2, parseEther('4'))

    const totalSupply = await pool.totalSupply()

    // mirrorer1 should hold 2/3 of total supply
    expect(await pool.balanceOf(mirrorer1.address)).equal(totalSupply.mul(2).div(3))

    // mirrorer2 should hold 1/3 of total supply
    expect(await pool.balanceOf(mirrorer2.address)).equal(totalSupply.mul(1).div(3))
  })

  it('should deposit on behalf of another address', async () => {
    const [signer, depositor, otherUser, mirrored] = await ethers.getSigners()
    const { pool, adapters } = await mockHousecatAndPool({ signer, mirrored })
    const amountDeposit = parseEther('8')
    await pool.connect(depositor).deposit(
      otherUser.address,
      [
        {
          adapter: adapters.wethAdapter.address,
          data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [amountDeposit]),
        },
      ],
      { value: amountDeposit }
    )
    expect(await pool.balanceOf(depositor.address)).eq(0)
    expect(await pool.balanceOf(otherUser.address)).gt(0)
  })

  it('should emit TransferPoolToken event', async () => {
    const [signer, depositor, otherUser, mirrored] = await ethers.getSigners()
    const { pool, adapters } = await mockHousecatAndPool({ signer, mirrored })
    const amountDeposit = parseEther('8')
    const tx = pool.connect(depositor).deposit(
      otherUser.address,
      [
        {
          adapter: adapters.wethAdapter.address,
          data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [amountDeposit]),
        },
      ],
      { value: amountDeposit }
    )
    await expect(tx)
      .emit(pool, 'TransferPoolToken')
      .withArgs(ethers.constants.AddressZero, otherUser.address, parseEther('8'), parseEther('8'))
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

    // first deposit
    await deposit(pool, adapters, mirrorer, parseEther('8'))

    // increase time
    await increaseTime(DAYS * 10)

    // second deposit
    const deposit2 = deposit(pool, adapters, mirrorer, parseEther('4'))

    await expect(deposit2).emit(pool, 'ManagementFeeSettled')
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

    // first deposit
    const amountDeposit1 = parseEther('8')
    await pool.deposit(
      mirrorer.address,
      [
        {
          adapter: adapters.wethAdapter.address,
          data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [amountDeposit1]),
        },
      ],
      { value: amountDeposit1 }
    )

    // increase value
    const newPriceFeed = await mockPriceFeed(signer, parseEther('2'), 8)
    await mgmt.setTokenMeta(weth.token.address, {
      priceFeed: newPriceFeed.address,
      decimals: 18,
      delisted: false,
    })

    // second deposit
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

    await expect(deposit2).emit(pool, 'PerformanceFeeSettled')
    expect(await pool.balanceOf(mirrored.address)).gt(0)
    expect(await pool.balanceOf(treasury.address)).gt(0)
  })

  it('should increase performance fee high watermark value by the deposit value', async () => {
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
    const amount1 = parseEther('8')
    const deposit1 = deposit(pool, adapters, mirrorer, amount1)

    // deposit 2
    const amount2 = parseEther('4')
    const deposit2 = deposit(pool, adapters, mirrorer, amount2)

    await expect(deposit1).emit(pool, 'PerformanceFeeHighWatermarkUpdated').withArgs(amount1)
    await expect(deposit2).emit(pool, 'PerformanceFeeHighWatermarkUpdated').withArgs(amount1.add(amount2))
  })

  it('should fail if pool is suspended', async () => {
    const [signer, mirrored] = await ethers.getSigners()
    const { pool } = await mockHousecatAndPool({ signer, mirrored })
    await pool.connect(signer).setSuspended(true)
    const tx = pool.deposit(signer.address, [])
    await expect(tx).revertedWith('HousecatPool: suspended')
  })

  it('should mint pool tokens correct amount when a token in the pool is delisted', async () => {
    const [signer, treasury, mirrorer1, mirrorer2, mirrored] = await ethers.getSigners()
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

    // deposit 10 ETH by mirrorer 1 (trade WETH to 50/50 Asset0 and Asset1)
    const amountDeposit = parseEther('10')
    await pool.connect(mirrorer1).deposit(
      mirrorer1.address,
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

    // delist token 0
    await mgmt.setTokenMeta(assets[0].token.address, {
      ...(await mgmt.getTokenMeta(assets[0].token.address)),
      delisted: true,
    })

    // deposit 10 ETH by mirrorer 2 (trade WETH to 100% Asset1)
    await pool.connect(mirrorer2).deposit(
      mirrorer2.address,
      [
        {
          adapter: adapters.wethAdapter.address,
          data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [amountDeposit]),
        },
        {
          adapter: adapters.uniswapV2Adapter.address,
          data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
            amm.address,
            [weth.token.address, assets[1].token.address],
            amountDeposit,
            1,
          ]),
        },
      ],
      { value: amountDeposit }
    )

    // both mirrorers should hold the same amount of pool tokens
    const balance1 = parseFloat(formatEther(await pool.balanceOf(mirrorer1.address)))
    const balance2 = parseFloat(formatEther(await pool.balanceOf(mirrorer2.address)))
    expect(balance1).approximately(balance2, 0.005)
  })
})
