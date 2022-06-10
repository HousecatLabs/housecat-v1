import { ethers } from 'hardhat'
import { IMockHousecat, mockHousecat } from '../../utils/mock-housecat'
import { HousecatPool } from '../../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { IToken, ITokenWithLiquidity } from '../../utils/mock-defi'
import { parseEther, parseUnits } from 'ethers/lib/utils'
import {
  FeeSettingsStruct,
  MirrorSettingsStruct,
  RebalanceSettingsStruct,
} from '../../typechain-types/HousecatManagement'
import { BigNumberish, Wallet } from 'ethers'

interface IWethWithAmountToMirrored extends IToken {
  amountToMirrored?: string
}

interface IAssetWithAmountToMirrored extends ITokenWithLiquidity {
  amountToMirrored?: string
}

interface ILoanWithAmountToMirrored extends IToken {
  amountToMirrored?: string
}

interface IMockHousecatAndPoolProps {
  signer: SignerWithAddress
  treasury?: SignerWithAddress
  mirrored: SignerWithAddress | Wallet
  weth?: IWethWithAmountToMirrored
  assets?: IAssetWithAmountToMirrored[]
  loans?: ILoanWithAmountToMirrored[]
  rebalanceSettings?: RebalanceSettingsStruct
  mirrorSettings?: MirrorSettingsStruct
  managementFee?: FeeSettingsStruct
  performanceFee?: FeeSettingsStruct
  minInitialDepositAmount?: BigNumberish
}

export interface IMockHousecatAndPool extends IMockHousecat {
  pool: HousecatPool
}

const mockHousecatAndPool = async ({
  signer,
  treasury,
  mirrored,
  weth = { price: '1', amountToMirrored: '10' },
  assets = [
    { price: '1', reserveToken: '10000', reserveWeth: '10000' },
    { price: '2', reserveToken: '5000', reserveWeth: '10000' },
    { price: '0.5', reserveToken: '20000', reserveWeth: '10000' },
  ],
  loans = [{ price: '1' }],
  rebalanceSettings = {
    minSecondsBetweenRebalances: 0,
    maxSlippage: 1e6,
    maxCumulativeSlippage: 3e6,
    cumulativeSlippagePeriodSeconds: 0,
    reward: 0,
    protocolTax: 0,
    rebalancers: [],
  },
  mirrorSettings = {
    minPoolValue: 0,
    minMirroredValue: 0,
    maxWeightDifference: 5e6,
  },
  managementFee = { defaultFee: 0, maxFee: parseUnits('0.1', 8), protocolTax: 0 },
  performanceFee = { defaultFee: 0, maxFee: parseUnits('0.25', 8), protocolTax: 0 },
  minInitialDepositAmount = 0,
}: IMockHousecatAndPoolProps): Promise<IMockHousecatAndPool> => {
  const mock = await mockHousecat({
    signer,
    treasury: treasury?.address || signer.address,
    weth,
    assets,
    loans,
    rebalanceSettings,
    mirrorSettings,
    managementFee,
    performanceFee,
    minInitialDepositAmount,
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
