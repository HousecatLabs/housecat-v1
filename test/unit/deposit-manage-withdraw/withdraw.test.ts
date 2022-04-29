import { ethers } from 'hardhat'
import { expect } from 'chai'
import { parseEther } from 'ethers/lib/utils'
import mockHousecatAndPool from '../../mock/mock-housecat-and-pool'

describe('HousecatPool: withdraw', () => {
  it('should fail to change the asset weights of the pool', async () => {
    const [signer, treasury, manager] = await ethers.getSigners()
    const { pool, adapters, amm, assets, weth } = await mockHousecatAndPool(signer, treasury, manager)

    // initial deposit
    await pool.connect(manager).deposit([], { value: parseEther('10') })

    // try to trade WETH to Asset0 on withdraw
    const tx = pool.connect(manager).withdraw([
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
    await expect(tx).revertedWith('HousecatPool: weights changed')
  })

  it('should fail to change the loan weights of the pool', async () => {
    // TODO: implement when mock Aave implemented
  })

  it('should fail to change the loan ratio of the pool', async () => {
    const [signer, treasury, manager] = await ethers.getSigners()
    const { pool, adapters, amm, loans, weth } = await mockHousecatAndPool(
      signer,
      treasury,
      manager,
      { price: '1' },
      [{ price: '1', reserveToken: '10000', reserveWeth: '10000' }],
      [{ price: '1' }]
    )

    // deposit ETH
    await pool.connect(manager).deposit([], { value: parseEther('3') })

    // send Loan0
    await loans[0].token.connect(signer).mint(pool.address, parseEther('1'))

    // try to withdraw without adjusting the loan position
    const tx = pool.connect(manager).withdraw([
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
    await expect(tx).revertedWith('HousecatPool: weights changed')
  })

  it('should fail to withdraw more than what the withdrawer owns', async () => {
    const [signer, treasury, manager, depositor] = await ethers.getSigners()
    const { pool, adapters, amm, weth } = await mockHousecatAndPool(
      signer,
      treasury,
      manager,
      { price: '1' },
      [{ price: '1', reserveToken: '10000', reserveWeth: '10000' }],
      [{ price: '1' }]
    )

    // deposit by manager
    await pool.connect(manager).deposit([], { value: parseEther('5') })

    // deposit by another user
    await pool.connect(depositor).deposit([], { value: parseEther('5') })

    // withdraw by manager
    const tx = pool.connect(manager).withdraw([
      {
        adapter: adapters.uniswapV2Adapter.address,
        data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokenToETH', [
          amm.address,
          [weth.token.address, weth.token.address],
          parseEther('5').add(1),
          1,
        ]),
      },
    ])
    await expect(tx).revertedWith('withdraw balance exceeded')
  })

  it('should burn pool tokens the amount being equal to the reduction of pool net value', async () => {
    const [signer, treasury, manager, withdrawer] = await ethers.getSigners()
    const { pool, adapters, amm, weth } = await mockHousecatAndPool(
      signer,
      treasury,
      manager,
      { price: '1' },
      [{ price: '1', reserveToken: '10000', reserveWeth: '10000' }],
      [{ price: '1' }]
    )

    // initial deposit by manager
    await pool.connect(manager).deposit([], { value: parseEther('8') })

    // deposit by another user
    await pool.connect(withdrawer).deposit([], { value: parseEther('4') })

    // withdraw by withdrawer
    await pool.connect(withdrawer).withdraw([
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

    // manager should hold 8 / 10 of total supply after the withdraw
    expect(await pool.balanceOf(manager.address)).equal(totalSupply.mul(8).div(10))

    // withdrawer should hold 2 / 10 of total supply after the withdraw
    expect(await pool.balanceOf(withdrawer.address)).equal(totalSupply.mul(2).div(10))
  })
})
