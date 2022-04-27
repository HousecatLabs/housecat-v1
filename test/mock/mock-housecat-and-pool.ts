import { ethers } from 'hardhat'
import { IMockHousecat, mockHousecat } from '../../utils/mock-housecat'
import { HousecatPool } from '../../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { IToken, ITokenWithLiquidity } from '../../utils/mock-defi'

export interface IMockHousecatAndPool extends IMockHousecat {
  pool: HousecatPool
}

const mockHousecatAndPool = async (
  signer: SignerWithAddress,
  treasury: SignerWithAddress,
  manager: SignerWithAddress,
  weth = { price: '1' },
  assets: ITokenWithLiquidity[] = [
    { price: '1', reserveToken: '10000', reserveWeth: '10000' },
    { price: '2', reserveToken: '5000', reserveWeth: '10000' },
    { price: '0.5', reserveToken: '20000', reserveWeth: '10000' },
  ],
  loans: IToken[] = [{ price: '1' }]
): Promise<IMockHousecatAndPool> => {
  const mock = await mockHousecat({
    signer,
    treasury: treasury.address,
    weth,
    assets,
    loans,
  })
  await mock.factory.connect(manager).createPool()
  const pool = await ethers.getContractAt('HousecatPool', await mock.factory.getPool(0))
  return { pool, ...mock }
}

export default mockHousecatAndPool
