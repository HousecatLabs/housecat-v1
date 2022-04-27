import { ethers } from 'hardhat'
import { expect } from 'chai'
import mockHousecatAndPool from '../../mock/mock-housecat-and-pool'
import { parseEther } from 'ethers/lib/utils'

describe('HousecatPool: manage', () => {
  it('only manager allowed to call', async () => {
    const [signer, treasury, manager] = await ethers.getSigners()
    const { pool, adapters } = await mockHousecatAndPool(signer, treasury, manager)
    const encoder = new ethers.utils.AbiCoder()
    const data = encoder.encode(['string'], ['foobar'])
    const manage = pool.connect(signer).manage([{ adapter: adapters.uniswapV2Adapter.address, data }])
    await expect(manage).revertedWith('Ownable: caller is not the owner')
  })

  it('should fail to reduce the pool net value more than the allowed slippage limit', async () => {
    const [signer, treasury, manager] = await ethers.getSigners()
    const { pool, weth, adapters, amm } = await mockHousecatAndPool(signer, treasury, manager)

    // send initial deposit of 1 ETH
    await pool.deposit([], { value: parseEther('10') })

    // try to swap WETH to ETH (reducing the net value of the assets)
    const tx = pool.connect(manager).manage([
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
})
