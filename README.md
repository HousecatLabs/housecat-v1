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

Version: efff03d

```js
{
  timestamp: '2022-05-31T14:30:50.592Z',
  network: 'polygon',
  addresses: {
    HousecatManagement: '0x5020bB0208B0B021736162aefB7ea377826A4bd7',
    HousecatFactory: '0xA3590bfcf13d4ccf71160DDc45537CE44DF8fc50',
    HousecatPool: '0xdD836Ba274076BA082Ae1b9E0AC6214f6F82bcdf',
    HousecatQueries: '0x85195813A33D68AC82e3F8F869DEc59A932e4e36',
    WETHAdapter: '0x01F83eDD60E32f6944Bd0327DA378E8Efc3Be037',
    UniswapV2Adapter: '0x4979100a307fEaDabe28Aed1B6d23A2461e77A2F',
    AaveV2Adapter: '0x64C3E4b5b7dD9d3880E1f6B2f545EDb0f84721AD',
    ParaswapV5Adapter: '0x5D7ebaf688a5fcf6e2AFeE940Ce39EEdE3e668FD'
  }
}

```
