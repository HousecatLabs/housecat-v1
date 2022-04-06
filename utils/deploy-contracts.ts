import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { HousecatFactory, HousecatPool, HousecatQueries, ManagerUniswapV2Adapter, WithdrawerUniswapV2Adapter } from '../typechain-types'
import { HousecatManagement } from '../typechain-types'
import { TokenMetaStruct } from '../typechain-types/HousecatManagement'

export const deployQueries = async (signer: SignerWithAddress): Promise<HousecatQueries> => {
  const HousecatQueries = await ethers.getContractFactory('HousecatQueries')
  return HousecatQueries.connect(signer).deploy()
}

export const deployPool = async (signer: SignerWithAddress): Promise<HousecatPool> => {
  const HousecatPool = await ethers.getContractFactory('HousecatPool')
  return HousecatPool.connect(signer).deploy()
}

export const deployManagement = async (
  signer: SignerWithAddress,
  treasury: string,
  weth: string
): Promise<HousecatManagement> => {
  const HousecatManagement = await ethers.getContractFactory('HousecatManagement')
  return HousecatManagement.connect(signer).deploy(treasury, weth)
}

export const deployFactory = async (
  signer: SignerWithAddress,
  management: string,
  poolTemplate: string
): Promise<HousecatFactory> => {
  const HousecatFactory = await ethers.getContractFactory('HousecatFactory')
  return HousecatFactory.connect(signer).deploy(management, poolTemplate)
}

export const deployManagerUniswapV2Adapter = async (signer: SignerWithAddress): Promise<ManagerUniswapV2Adapter> => {
  const UniswapV2Adapter = await ethers.getContractFactory('ManagerUniswapV2Adapter')
  return UniswapV2Adapter.connect(signer).deploy()
}

export const deployWithdrawerUniswapV2Adapter = async (signer: SignerWithAddress): Promise<WithdrawerUniswapV2Adapter> => {
  const UniswapV2Adapter = await ethers.getContractFactory('WithdrawerUniswapV2Adapter')
  return UniswapV2Adapter.connect(signer).deploy()
}

export interface IDeployHousecat {
  signer: SignerWithAddress
  treasury?: string
  weth: string
  tokens?: string[]
  tokensMeta?: TokenMetaStruct[]
  managerAdapters?: string[]
  withdrawerAdapters?: string[]
  integrations?: string[]
}

export const deployHousecat = async ({
  signer,
  treasury,
  weth,
  tokens,
  tokensMeta,
  managerAdapters,
  withdrawerAdapters,
  integrations,
}: IDeployHousecat): Promise<[HousecatManagement, HousecatFactory]> => {
  const poolTemplate = await deployPool(signer)
  const mgmt = await deployManagement(signer, treasury || signer.address, weth)
  const factory = await deployFactory(signer, mgmt.address, poolTemplate.address)
  if (tokens) {
    await mgmt.connect(signer).setSupportedTokens(tokens)
    if (tokensMeta) {
      await mgmt.connect(signer).setTokenMetaMany(tokens, tokensMeta)
    }
  }
  if (managerAdapters) {
    for (let i = 0; i < managerAdapters.length; i++) {
      await mgmt.setManagerAdapter(managerAdapters[i], true)
    }
  }
  if (withdrawerAdapters) {
    for (let i = 0; i < withdrawerAdapters.length; i++) {
      await mgmt.setWithdrawerAdapter(withdrawerAdapters[i], true)
    }
  }
  if (integrations) {
    for (let i = 0; i < integrations.length; i++) {
      await mgmt.setIntegration(integrations[i], true)
    }
  }
  return [mgmt, factory]
}
