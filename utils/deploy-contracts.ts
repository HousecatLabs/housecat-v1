import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { HousecatFactory, HousecatPool, HousecatQueries, UniswapV2Integration } from '../typechain-types'
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

export const deployUniswapV2Integration = async (signer: SignerWithAddress): Promise<UniswapV2Integration> => {
  const UniswapV2Integration = await ethers.getContractFactory('UniswapV2Integration')
  return UniswapV2Integration.connect(signer).deploy()
}

export interface IDeployHousecat {
  signer: SignerWithAddress
  treasury?: string
  weth: string
  tokens?: string[]
  tokensMeta?: TokenMetaStruct[]
  integrations?: string[]
}

export const deployHousecat = async ({
  signer,
  treasury,
  weth,
  tokens,
  tokensMeta,
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
  if (integrations) {
    for (let i = 0; i < integrations.length; i++) {
      await mgmt.setIntegrationEnabled(integrations[i], true)
    }
  }
  return [mgmt, factory]
}
