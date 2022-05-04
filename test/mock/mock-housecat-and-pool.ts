import { ethers } from 'hardhat'
import { IMockHousecat, mockHousecat } from '../../utils/mock-housecat'
import { HousecatPool } from '../../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { IToken, ITokenWithLiquidity } from '../../utils/mock-defi'
import { parseEther } from 'ethers/lib/utils'

interface IWethWithAmountToMirrored extends IToken {
  amountToMirrored?: string
}

interface IAssetWithAmountToMirrored extends ITokenWithLiquidity {
  amountToMirrored?: string
}

interface ILoanWithAmountToMirrored extends IToken {
  amountToMirrored?: string
}

export interface IMockHousecatAndPool extends IMockHousecat {
  pool: HousecatPool
}

const mockHousecatAndPool = async (
  signer: SignerWithAddress,
  treasury: SignerWithAddress,
  mirrored: SignerWithAddress,
  weth: IWethWithAmountToMirrored = { price: '1', amountToMirrored: '10' },
  assets: IAssetWithAmountToMirrored[] = [
    { price: '1', reserveToken: '10000', reserveWeth: '10000' },
    { price: '2', reserveToken: '5000', reserveWeth: '10000' },
    { price: '0.5', reserveToken: '20000', reserveWeth: '10000' },
  ],
  loans: ILoanWithAmountToMirrored[] = [{ price: '1' }]
): Promise<IMockHousecatAndPool> => {
  const mock = await mockHousecat({
    signer,
    treasury: treasury.address,
    weth,
    assets,
    loans,
  })
  await mock.factory.connect(signer).createPool(mirrored.address, [])
  const pool = await ethers.getContractAt('HousecatPool', (await mock.factory.getPools(0, 1))[0])

  // send tokens to mirrored
  if (weth.amountToMirrored) {
    await mock.weth.token.connect(signer).mint(mirrored.address, parseEther(weth.amountToMirrored))
  }
  await Promise.all(
    mock.assets.map(async (asset, idx) => {
      if (assets[idx].amountToMirrored) {
        await asset.token.connect(signer).mint(mirrored.address, parseEther(assets[idx].amountToMirrored as string))
      }
    })
  )
  await Promise.all(
    mock.loans.map(async (loan, idx) => {
      if (loans[idx].amountToMirrored) {
        await loan.token.connect(signer).mint(mirrored.address, parseEther(loans[idx].amountToMirrored as string))
      }
    })
  )
  return { pool, ...mock }
}

export default mockHousecatAndPool
