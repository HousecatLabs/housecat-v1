# Housecat V1 Contracts

## Development

### Setup

1. Register a free account at `etherscan.io` and create an API key there.
2. Register a free account at any RPC provider (for example `moralis.io`) and create a Polygon RPC URL.
3. Create a `.env` file in the repository root and add the following:

```
POLYGON_RPC_URL=<your polygon rpc url here>
ETHERSCAN_API_KEY=<your etherscan api key here>
```

4. Install dependencies with `npm install`

### Compile and test

Run `npm run build` to compile the smart contracts.
Run `npm run test` to run tests.

### Deployment

Check [Polygon gas prices](https://polygonscan.com/gastracker) and adjust `gasPrice` in `scripts/deploy-contracts.ts` accordingly.

Set environment variable `DEPLOY_PRIVATE_KEY` to private used for deployment. Currently used key can be found in AWS Secrets Manager.

Deploy new contracts with:

```
npx hardhat run scripts/deploy.ts --network polygon
```

Record the contract addresses printed by the deployment script and add the to this `README.md` and change them in the `housecat-ui`
repository. Deploy new frontend with the new contract addresses.

## Deployed addresses:

Version: dfaf4b8

```js
{
  timestamp: '2022-06-10T13:02:15.797Z',
  network: 'polygon',
  addresses: {
    HousecatManagement: '0x958d607Df9BAd77B6795a7E938Ca02f662aB4cDb',
    HousecatFactory: '0xD449F937f8c8acF35Fc1D0c23455f7f8a082a8d9',
    HousecatPool: '0xd7ee650f064F182797f23f9DE5334341Da5d2296',
    HousecatQueries: '0x5cD411e4922F3C9C5788cc77DAfdD88378546dAa',
    WETHAdapter: '0xF7D2D0CbB09b64646e7a1a1ADA05F113A11Bf252',
    UniswapV2Adapter: '0xa33Aed0e3144953755B3AB3cEc1D152d6D064eFB',
    AaveV2Adapter: '0x6d22137e0AD1E73c233034C81984Fcf0B5E581c8',
    ParaswapV5Adapter: '0x13Bc41E70E4a3d3AC796cc8B32D3140Ffb83ACCE',
    WithdrawAdapter: '0x3761D54b544C5ca4a6B873D3Eac1Dc8a4A6D1422'
  }
}

```
