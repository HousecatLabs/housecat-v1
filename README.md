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

Version: c2b8d2a

```js
{
  timestamp: '2022-05-23T12:03:35.285Z',
  network: 'polygon',
  addresses: {
    HousecatManagement: '0x9D11C27CAC1f3381F87B2e1960Cab6596eA10632',
    HousecatFactory: '0x7b704eC4CBb5661C717e1c6B52702544FDe17cAF',
    HousecatPool: '0x6BD6f94827756c8A1301A2cc287aC2f5e3317C5e',
    HousecatQueries: '0xCE392C9E5Ea52E134b9E5224b50121f62462a84F',
    WETHAdapter: '0x4445ae50D7E9dBF203672f4d0fEc788233341eA1',
    UniswapV2Adapter: '0xa057ca872Fa2DCdEdD3c66E32C36b085BC7614b0',
    AaveV2Adapter: '0x890243C090f89273052D66a8Ddc95C504bdd8A28',
    ParaswapV5Adapter: '0x1e0256Ac1eBE93A0cE71B2CD756270fAa9C6CB9f'
  }
}
```
