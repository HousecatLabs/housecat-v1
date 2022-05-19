import axios from 'axios'
import { OptimalRate as OptimalRateResponse } from 'paraswap-core'

export interface IGetOptimalRateProps {
  srcToken: string
  destToken: string
  srcDecimals?: number
  destDecimals?: number
  srcAmount: string
  destAmount: string
  network?: number
}

export interface IBuildSwapProps extends IGetOptimalRateProps {
  userAddress: string
}

export interface IGetTransactionDataProps extends IBuildSwapProps {
  priceRoute: OptimalRateResponse
}

export interface IGetTransactionDataResponse {
  to: string
  from: string
  value: string
  data: string
  gasPrice: string
  gas?: string
  chainId: number
}

export interface IBuildSwapResponse {
  priceRoute: OptimalRateResponse
  txData: IGetTransactionDataResponse
}

const POLYGON_NETWORK_ID = 137

const getOptimalRate = async ({
  srcToken,
  destToken,
  srcAmount,
  network,
}: IGetOptimalRateProps): Promise<OptimalRateResponse> => {
  const url = 'https://apiv5.paraswap.io/prices'
  const params = {
    srcToken,
    destToken,
    amount: srcAmount,
    side: 'SELL',
    network,
    includeContractMethods: 'multiSwap,simpleSwap',
    includeDEXS: 'QuickSwap,SushiSwap,Balancer,UniswapV2,UniswapV3',
  }
  const res = await axios.get<{ priceRoute: OptimalRateResponse }>(url, { params })
  return res.data.priceRoute
}

const getTransactionData = async ({
  srcToken,
  destToken,
  srcAmount,
  userAddress,
  destAmount,
  priceRoute,
  network,
}: IGetTransactionDataProps): Promise<IGetTransactionDataResponse> => {
  const url = `https://apiv5.paraswap.io/transactions/${network}`
  const params = {
    srcToken,
    destToken,
    srcAmount,
    priceRoute,
    userAddress,
    destAmount,
    ignoreChecks: 'true',
  }
  const res = await axios.post<IGetTransactionDataResponse>(url, params)
  return res.data
}

const buildSwap = async ({
  srcToken,
  destToken,
  srcDecimals,
  destDecimals,
  srcAmount,
  userAddress,
  destAmount,
}: IBuildSwapProps): Promise<IBuildSwapResponse> => {
  const network = POLYGON_NETWORK_ID
  const priceRoute = await getOptimalRate({
    srcToken,
    destToken,
    srcDecimals,
    destDecimals,
    srcAmount,
    destAmount,
    network,
  })
  const txData = await getTransactionData({
    srcToken,
    destToken,
    srcAmount,
    destAmount,
    priceRoute,
    userAddress,
    network,
  })
  return {
    priceRoute,
    txData,
  }
}

export default buildSwap
