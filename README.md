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

Version: 0022cd4

```js
{
  timestamp: '2022-05-22T08:41:28.465Z',
  network: 'polygon',
  addresses: {
    HousecatManagement: '0x5b3ccA24922f9635d628580577074f4e123799c9',
    HousecatFactory: '0x5012C2A3Ef0C7c127fd8321a948d266E9e920F91',
    HousecatPool: '0xb8cB3E9F97Cb668A08f3C710Ea9f9baCe1Dc16F3',
    HousecatQueries: '0x21ECd2AC40F8326d22581648C0a7d3B5FF6277aD',
    WETHAdapter: '0xD2a29Faa6b6cD960538eb49b87458a7Cc56773c0',
    UniswapV2Adapter: '0xB2BC6c3007019BE95B77F18d98a9153d24239a21',
    AaveV2Adapter: '0x1Fd44d4Ff61E49d52402e0E317786B09E3F8b5f4',
    ParaswapV5Adapter: '0xEA055A3C70a8c9DFD710fEf8e7AB75687833D631'
  }
}
```
