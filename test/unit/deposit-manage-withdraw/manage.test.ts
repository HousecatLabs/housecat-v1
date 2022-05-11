import { ethers } from 'hardhat'
import { expect } from 'chai'
import mockHousecatAndPool from '../../utils/mock-housecat-and-pool'
import { parseEther } from 'ethers/lib/utils'

describe('HousecatPool: manage', () => {
  it('only owner allowed to call', async () => {
    const [signer, mirrored] = await ethers.getSigners()
    const { pool, adapters } = await mockHousecatAndPool({ signer, mirrored })
    const encoder = new ethers.utils.AbiCoder()
    const data = encoder.encode(['string'], ['foobar'])
    const manage = pool.connect(mirrored).manage([{ adapter: adapters.uniswapV2Adapter.address, data }])
    await expect(manage).revertedWith('Ownable: caller is not the owner')
  })

  it('should fail to reduce the pool net value more than the allowed slippage limit', async () => {
    const [signer, mirrored] = await ethers.getSigners()
    const { pool, weth, adapters, amm, assets } = await mockHousecatAndPool({
      signer,
      mirrored,
      weth: { price: '1', amountToMirrored: '10' },
      assets: [{ price: '1', reserveToken: '20', reserveWeth: '20' }],
    })

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

    // send a low liquidity Asset0 to the mirrored
    assets[0].token.mint(mirrored.address, parseEther('10'))

    // try to rebalance
    const tx = pool.connect(signer).manage([
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
})
