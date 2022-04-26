import { ethers } from 'hardhat'
import { expect } from 'chai'
import mockHousecatAndPool from '../mock/mock-housecat-and-pool'

describe('HousecatPool: manage', () => {
  it('only manager allowed to call', async () => {
    const [signer, treasury, manager] = await ethers.getSigners()
    const { pool, adapters } = await mockHousecatAndPool(signer, treasury, manager)
    const encoder = new ethers.utils.AbiCoder()
    const data = encoder.encode(['string'], ['foobar'])
    const manage = pool.connect(signer).manage([{ adapter: adapters.uniswapV2Adapter.address, data }])
    await expect(manage).revertedWith('Ownable: caller is not the owner')
  })
})
