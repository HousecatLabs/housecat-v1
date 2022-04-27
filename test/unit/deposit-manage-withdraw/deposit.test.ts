import { ethers } from 'hardhat'
import { expect } from 'chai'
import { parseEther } from 'ethers/lib/utils'
import mockHousecatAndPool from '../../mock/mock-housecat-and-pool'

describe('HousecatPool: deposit', () => {
  it('should fail to change the asset weights of the pool', async () => {
    const [signer, treasury, manager] = await ethers.getSigners()
    const { pool, adapters, amm, assets, weth } = await mockHousecatAndPool(signer, treasury, manager)

    // send Asset0 to the empty pool
    await assets[0].token.connect(signer).mint(pool.address, parseEther('10'))

    // deposit ETH without trading all to Asset0
    const tx = pool.deposit(
      [
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
      { value: parseEther('1') }
    )
    await expect(tx).revertedWith('HousecatPool: weights changed')
  })

  it('should fail to change the loan weights of the pool', async () => {
    // TODO: implement when mock Aave implemented
  })

  it('should fail to change the loan ratio of the pool', async () => {
    const [signer, treasury, manager] = await ethers.getSigners()
    const { pool, adapters, amm, assets, loans, weth } = await mockHousecatAndPool(
      signer,
      treasury,
      manager,
      { price: '1' },
      [{ price: '1', reserveToken: '10000', reserveWeth: '10000' }],
      [{ price: '1' }]
    )

    // send Asset0 to the empty pool
    await assets[0].token.connect(signer).mint(pool.address, parseEther('2'))

    // send Loan0 to the empty pool
    await loans[0].token.connect(signer).mint(pool.address, parseEther('1'))

    // deposit ETH and trade all to Asset0 without adjusting Loan0 position
    const tx = pool.deposit(
      [
        {
          adapter: adapters.uniswapV2Adapter.address,
          data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
            amm.address,
            [weth.token.address, assets[0].token.address],
            parseEther('1'),
            1,
          ]),
        },
      ],
      { value: parseEther('1') }
    )
    await expect(tx).revertedWith('HousecatPool: weights changed')
  })

  it('should succeed to deposit to a pool without rebalance trades when the pool holds nothing or only WETH', async () => {
    const [signer, treasury, manager] = await ethers.getSigners()
    const { pool, weth } = await mockHousecatAndPool(signer, treasury, manager)
    await pool.deposit([], { value: parseEther('1') })
    expect(await weth.token.balanceOf(pool.address)).equal(parseEther('1'))
  })

  it('should fail to reduce the net value of the pool', async () => {
    const [signer, treasury, manager] = await ethers.getSigners()
    const { pool, weth, adapters, amm } = await mockHousecatAndPool(signer, treasury, manager)

    // send initial deposit of 1 ETH
    await pool.deposit([], { value: parseEther('10') })

    // try to swap WETH to ETH (reducing the net value of the assets)
    const tx = pool.deposit([
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
    await expect(tx).revertedWith('HousecatPool: pool value reduced')
  })

  it('should mint pool tokens an amount equal to the deposit value when the pool total supply is zero', async () => {
    const [signer, treasury, manager, depositor] = await ethers.getSigners()
    const { pool } = await mockHousecatAndPool(signer, treasury, manager)
    await pool.connect(depositor).deposit([], { value: parseEther('10') })
    expect(await pool.balanceOf(depositor.address)).equal(parseEther('10'))
  })

  it('should mint pool tokens the correct amount when the pool has existing holders', async () => {
    const [signer, treasury, manager, depositor] = await ethers.getSigners()
    const { pool } = await mockHousecatAndPool(signer, treasury, manager)

    // initial deposit by manager
    await pool.connect(manager).deposit([], { value: parseEther('8') })

    // deposit by another user
    await pool.connect(depositor).deposit([], { value: parseEther('4') })

    const totalSupply = await pool.totalSupply()

    // manager should hold 2/3 of total supply
    expect(await pool.balanceOf(manager.address)).equal(totalSupply.mul(2).div(3))

    // depositor should hold 1/3 of total supply
    expect(await pool.balanceOf(depositor.address)).equal(totalSupply.mul(1).div(3))
  })
})
