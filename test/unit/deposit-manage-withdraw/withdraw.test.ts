import { ethers } from 'hardhat'
import { expect } from 'chai'
import { parseEther } from 'ethers/lib/utils'
import mockHousecatAndPool from '../../mock/mock-housecat-and-pool'

describe('HousecatPool: withdraw', () => {
  it('should fail to increase the weights difference between the pool and the mirrored', async () => {
    const [signer, treasury, mirrorer, mirrored] = await ethers.getSigners()
    const { pool, adapters, amm, assets, weth } = await mockHousecatAndPool(signer, treasury, mirrored)

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

  it('TODO: should fail to change the loan weights of the pool', async () => {
    // TODO: implement when mock Aave implemented
  })

  it('should fail to withdraw more than what the withdrawer owns', async () => {
    const [signer, treasury, mirrored, mirrorer1, mirrorer2] = await ethers.getSigners()
    const { pool, adapters, amm, weth } = await mockHousecatAndPool(
      signer,
      treasury,
      mirrored,
      { price: '1', amountToMirrored: '5' },
      [{ price: '1', reserveToken: '10000', reserveWeth: '10000' }],
      [{ price: '1' }]
    )

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
        adapter: adapters.uniswapV2Adapter.address,
        data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokenToETH', [
          amm.address,
          [weth.token.address, weth.token.address],
          amountDeposit.add(1),
          1,
        ]),
      },
    ])
    await expect(tx).revertedWith('withdraw balance exceeded')
  })

  it('should burn pool tokens an amount being equal to the reduction of pool net value', async () => {
    const [signer, treasury, mirrored, mirrorer1, mirrorer2] = await ethers.getSigners()
    const { pool, adapters, amm, weth } = await mockHousecatAndPool(
      signer,
      treasury,
      mirrored,
      { price: '1', amountToMirrored: '10' },
      [{ price: '1', reserveToken: '10000', reserveWeth: '10000' }],
      [{ price: '1' }]
    )

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
        adapter: adapters.uniswapV2Adapter.address,
        data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokenToETH', [
          amm.address,
          [weth.token.address, weth.token.address],
          parseEther('2'),
          1,
        ]),
      },
    ])

    const totalSupply = await pool.totalSupply()

    // mirrorer1 should hold 8 / 10 of total supply after the withdraw
    expect(await pool.balanceOf(mirrorer1.address)).equal(totalSupply.mul(8).div(10))

    // mirrorer2 should hold 2 / 10 of total supply after the withdraw
    expect(await pool.balanceOf(mirrorer2.address)).equal(totalSupply.mul(2).div(10))
  })

  it('should withdraw on behalf of another address', async () => {
    const [signer, treasury, mirrorer, mirrored, otherUser] = await ethers.getSigners()
    const { pool, adapters, amm, weth } = await mockHousecatAndPool(signer, treasury, mirrored)

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
        adapter: adapters.uniswapV2Adapter.address,
        data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokenToETH', [
          amm.address,
          [weth.token.address, weth.token.address],
          parseEther('5'),
          1,
        ]),
      },
    ])

    // balance of otherUser after
    const balanceAfter = await otherUser.getBalance()

    expect(balanceAfter.sub(balanceBefore)).eq(parseEther('5'))
  })

  it('should emit WithdrawFromPool event', async () => {
    const [signer, treasury, mirrorer, mirrored, otherUser] = await ethers.getSigners()
    const { pool, adapters, amm, weth } = await mockHousecatAndPool(signer, treasury, mirrored)

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
        adapter: adapters.uniswapV2Adapter.address,
        data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokenToETH', [
          amm.address,
          [weth.token.address, weth.token.address],
          parseEther('5'),
          1,
        ]),
      },
    ])

    // the emitted event should include the address of the account who sent pool tokens, not otherUser
    await expect(tx).emit(pool, 'WithdrawFromPool').withArgs(parseEther('5'), parseEther('5'), mirrorer.address)
  })
})
