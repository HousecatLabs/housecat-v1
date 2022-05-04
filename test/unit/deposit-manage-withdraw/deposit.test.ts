import { ethers } from 'hardhat'
import { expect } from 'chai'
import { parseEther } from 'ethers/lib/utils'
import mockHousecatAndPool from '../../mock/mock-housecat-and-pool'

describe('HousecatPool: deposit', () => {
  it('should fail to change the asset weights of the pool to differ from the mirrored weights', async () => {
    const [signer, treasury, mirrored] = await ethers.getSigners()
    const { pool, adapters, amm, assets, weth } = await mockHousecatAndPool(signer, treasury, mirrored)

    // deposit ETH and try to trade half of it to Asset0
    const amountDeposit = parseEther('1')
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
            parseEther('0.5'),
            1,
          ]),
        },
      ],
      { value: amountDeposit }
    )
    await expect(tx).revertedWith('HousecatPool: weights mismatch')
  })

  it('TODO: should fail to change the loan weights of the pool to differ from the mirrored weights', async () => {
    // TODO: implement when mock Aave implemented
  })

  it('should fail to change the loan ratio of the pool to differ from the mirrored loan ratio', async () => {
    const [signer, treasury, mirrored] = await ethers.getSigners()
    const { pool, adapters } = await mockHousecatAndPool(
      signer,
      treasury,
      mirrored,
      { price: '1', amountToMirrored: '10' },
      [{ price: '1', reserveToken: '10000', reserveWeth: '10000' }],
      [{ price: '1', amountToMirrored: '10' }]
    )

    // deposit ETH without adjusting the loan position
    const amountDeposit = parseEther('1')
    const tx = pool.deposit(
      signer.address,
      [
        {
          adapter: adapters.wethAdapter.address,
          data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [amountDeposit]),
        },
      ],
      { value: amountDeposit }
    )
    await expect(tx).revertedWith('HousecatPool: weights mismatch')
  })

  it('should fail to deposit when the mirrored account holds nothing', async () => {
    const [signer, treasury, mirrored] = await ethers.getSigners()
    const { pool, adapters } = await mockHousecatAndPool(signer, treasury, mirrored, { price: '1' })
    const amountDeposit = parseEther('1')
    const tx = pool.deposit(
      signer.address,
      [
        {
          adapter: adapters.wethAdapter.address,
          data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [amountDeposit]),
        },
      ],
      { value: amountDeposit }
    )
    await expect(tx).revertedWith('HousecatPool: weights mismatch')
  })

  it('should fail to reduce the net value of the pool', async () => {
    const [signer, treasury, mirrored] = await ethers.getSigners()
    const { pool, weth, adapters, amm, assets } = await mockHousecatAndPool(signer, treasury, mirrored)

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
    const [signer, treasury, mirrored] = await ethers.getSigners()
    const { pool, weth, adapters, amm } = await mockHousecatAndPool(signer, treasury, mirrored)

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

    // try to swap WETH to ETH (reducing the net value of the assets)
    const tx = pool.deposit(signer.address, [
      {
        adapter: adapters.uniswapV2Adapter.address,
        data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokenToETH', [
          amm.address,
          [weth.token.address, weth.token.address],
          parseEther('1'),
          1,
        ]),
      },
    ])
    await expect(tx).revertedWith('HousecatPool: ETH balance changed')
  })

  it('should mint pool tokens an amount equal to the deposit value when the pool total supply is zero', async () => {
    const [signer, treasury, mirrorer, mirrored] = await ethers.getSigners()
    const { pool, adapters } = await mockHousecatAndPool(signer, treasury, mirrored)
    const amountDeposit = parseEther('10')
    await pool.deposit(
      mirrorer.address,
      [
        {
          adapter: adapters.wethAdapter.address,
          data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [amountDeposit]),
        },
      ],
      { value: amountDeposit }
    )
    expect(await pool.balanceOf(mirrorer.address)).equal(parseEther('10'))
  })

  it('should mint pool tokens the correct amount when the pool has existing holders', async () => {
    const [signer, treasury, mirrorer1, mirrorer2, mirrored] = await ethers.getSigners()
    const { pool, adapters } = await mockHousecatAndPool(signer, treasury, mirrored)

    // initial deposit by mirrorer1
    const amountDeposit1 = parseEther('8')
    await pool.deposit(
      mirrorer1.address,
      [
        {
          adapter: adapters.wethAdapter.address,
          data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [amountDeposit1]),
        },
      ],
      { value: amountDeposit1 }
    )

    // deposit by another user
    const amountDeposit2 = parseEther('4')
    await pool.deposit(
      mirrorer2.address,
      [
        {
          adapter: adapters.wethAdapter.address,
          data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [amountDeposit2]),
        },
      ],
      { value: amountDeposit2 }
    )

    const totalSupply = await pool.totalSupply()

    // mirrorer1 should hold 2/3 of total supply
    expect(await pool.balanceOf(mirrorer1.address)).equal(totalSupply.mul(2).div(3))

    // mirrorer2 should hold 1/3 of total supply
    expect(await pool.balanceOf(mirrorer2.address)).equal(totalSupply.mul(1).div(3))
  })

  it('should deposit on behalf of another address', async () => {
    const [signer, treasury, depositor, otherUser, mirrored] = await ethers.getSigners()
    const { pool, adapters } = await mockHousecatAndPool(signer, treasury, mirrored)
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

  it('should emit DepositToPool event', async () => {
    const [signer, treasury, depositor, otherUser, mirrored] = await ethers.getSigners()
    const { pool, adapters } = await mockHousecatAndPool(signer, treasury, mirrored)
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
    await expect(tx).emit(pool, 'DepositToPool').withArgs(parseEther('8'), parseEther('8'), otherUser.address)
  })
})
