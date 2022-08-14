import { ethers } from 'hardhat'
import { expect } from 'chai'
import { parseEther } from 'ethers/lib/utils'
import mockHousecatAndPool, { IMockHousecatAndPool } from '../../utils/mock-housecat-and-pool'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { mockAssets } from '../../../utils/mock-defi'
import { uniswapV2Routers } from '../../../utils/addresses/polygon'
import { BigNumber } from 'ethers'

describe('WithdrawAdapter', () => {
  describe('withdrawPercentage', () => {
    let owner: SignerWithAddress
    let mirrored: SignerWithAddress
    let mirrorer: SignerWithAddress
    let mock: IMockHousecatAndPool
    let percent100: BigNumber

    before(async () => {
      const [owner_, mirrored_, mirrorer_] = await ethers.getSigners()
      owner = owner_
      mirrored = mirrored_
      mirrorer = mirrorer_
      mock = await mockHousecatAndPool({ signer: owner, mirrored, weth: { price: '1', amountToMirrored: '5' } })
      percent100 = await mock.pool.getPercent100()

      // deposit ETH so that the pool has WETH
      const amountDeposit = parseEther('5')
      await mock.pool.connect(mirrorer).deposit(
        mirrorer.address,
        [
          {
            adapter: mock.adapters.wethAdapter.address,
            data: mock.adapters.wethAdapter.interface.encodeFunctionData('deposit', [amountDeposit]),
          },
        ],
        { value: amountDeposit }
      )

      // send Token0 to the pool
      await mock.assets[0].token.mint(mock.pool.address, parseEther('5'))
    })

    it('should fail to use an unsupported AMM router', async () => {
      const sellToken0 = mock.adapters.withdrawAdapter.interface.encodeFunctionData('withdrawPercentage', [
        percent100.div(2),
        [
          {
            router: uniswapV2Routers.sushiswap, // unsupported router
            path: [mock.assets[0].token.address, mock.weth.token.address],
          },
        ],
        1,
        false,
      ])
      const tx = mock.pool.connect(owner).withdraw(owner.address, [
        {
          adapter: mock.adapters.withdrawAdapter.address,
          data: sellToken0,
        },
      ])
      await expect(tx).revertedWith('WithdrawAdapter: unsupported router')
    })

    it('should fail to buy other than ETH', async () => {
      const mockUnsuportedAssets = await mockAssets({
        signer: owner,
        weth: { price: '1', decimals: 18 },
        tokens: [{ price: '1', decimals: 18, reserveToken: '10000', reserveWeth: '10000' }],
      })
      const unsupportedAsset = mockUnsuportedAssets[2][0]
      const tradeTokenToUnsupportedToken = mock.adapters.withdrawAdapter.interface.encodeFunctionData(
        'withdrawPercentage',
        [
          percent100.div(2),
          [
            {
              router: mock.amm.address,
              path: [mock.assets[0].token.address, unsupportedAsset.token.address],
            },
          ],
          1,
          false,
        ]
      )
      const tx = mock.pool.connect(owner).withdraw(owner.address, [
        {
          adapter: mock.adapters.withdrawAdapter.address,
          data: tradeTokenToUnsupportedToken,
        },
      ])
      await expect(tx).revertedWith('WithdrawAdapter: token to !== WETH')
    })

    it('should fail to sell unknown tokens', async () => {
      const mockUnsuportedAssets = await mockAssets({
        signer: owner,
        weth: { price: '1', decimals: 18 },
        tokens: [{ price: '1', decimals: 18, reserveToken: '10000', reserveWeth: '10000' }],
      })
      const unsupportedAsset = mockUnsuportedAssets[2][0]
      await unsupportedAsset.token.mint(mock.pool.address, parseEther('5'))

      const tradeUnsupportedTokenToWeth = mock.adapters.withdrawAdapter.interface.encodeFunctionData(
        'withdrawPercentage',
        [
          percent100.div(2),
          [
            {
              router: mock.amm.address,
              path: [unsupportedAsset.token.address, mock.weth.token.address],
            },
          ],
          1,
          false,
        ]
      )
      const tx = mock.pool.connect(owner).withdraw(owner.address, [
        {
          adapter: mock.adapters.withdrawAdapter.address,
          data: tradeUnsupportedTokenToWeth,
        },
      ])
      await expect(tx).revertedWith('WithdrawAdapter: unsupported token from')
    })

    it('should succeed to sell supported tokens for ETH on a supported AMM', async () => {
      const withdrawTx = mock.adapters.withdrawAdapter.interface.encodeFunctionData('withdrawPercentage', [
        percent100.div(2),
        [
          {
            router: mock.amm.address,
            path: [mock.assets[0].token.address, mock.weth.token.address],
          },
        ],
        1,
        false,
      ])
      await mock.pool.connect(mirrorer).withdraw(mirrorer.address, [
        {
          adapter: mock.adapters.withdrawAdapter.address,
          data: withdrawTx,
        },
      ])

      const token0Balance = await mock.assets[0].token.balanceOf(mock.pool.address)
      expect(token0Balance).equal(parseEther('5').div(2))
    })

    it('should succeed to sell supported tokens fully for ETH on a supported AMM', async () => {
      const withdrawTx = mock.adapters.withdrawAdapter.interface.encodeFunctionData('withdrawPercentage', [
        percent100,
        [
          {
            router: mock.amm.address,
            path: [mock.assets[0].token.address, mock.weth.token.address],
          },
        ],
        1,
        false,
      ])
      await mock.pool.connect(mirrorer).withdraw(mirrorer.address, [
        {
          adapter: mock.adapters.withdrawAdapter.address,
          data: withdrawTx,
        },
      ])

      const token0Balance = await mock.assets[0].token.balanceOf(mock.pool.address)
      expect(token0Balance).equal(0)
    })
  })
})
