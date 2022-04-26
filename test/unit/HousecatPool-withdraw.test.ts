import { ethers } from 'hardhat'
import { expect } from 'chai'
import { parseEther } from 'ethers/lib/utils'
import mockHousecatAndPool, { IMockHousecatAndPool } from '../mock/mock-housecat-and-pool'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { deposit, withdraw, swapWethToTokens } from '../utils/pool-actions'

describe('HousecatPool: withdraw', () => {
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

    const { pool, amm, weth, adapters, assets } = mock

    // add 10 ETH initial deposit
    await pool.connect(manager).deposit([], { value: parseEther('10') })

    // allocate the funds to four tokens 2.5 ETH each
    await swapWethToTokens(pool, manager, adapters, amm, weth, assets, [
      parseEther('2.5'),
      parseEther('2.5'),
      parseEther('2.5'),
    ])

    // mirrorer deposits 10 ETH
    await deposit(pool, mirrorer, adapters, amm, weth, assets, parseEther('10'))
  })

  it('should refuse to change the asset weights of the pool', async () => {
    const { pool, amm, weth, adapters } = mock
    const sellTokenTx = adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokenToETH', [
      amm.address,
      [weth.token.address, weth.token.address],
      parseEther('2.5'),
      1,
    ])
    const tx = pool.connect(mirrorer).withdraw([{ adapter: adapters.uniswapV2Adapter.address, data: sellTokenTx }])
    await expect(tx).revertedWith('HousecatPool: asset weights changed')
  })

  it('should refuse to change the loan weights of the pool', async () => {
    // TODO
  })

  it('should refuse to withdraw more than the withrawer owns in the form of pool tokens', async () => {
    const { pool, amm, weth, adapters, assets } = mock
    const tx = withdraw(pool, mirrorer, adapters, amm, weth, assets, parseEther('11'))
    await expect(tx).revertedWith('HousecatPool: withdraw value too high')
  })
})
