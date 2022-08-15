import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import { parseEther } from 'ethers/lib/utils'
import { ethers } from 'hardhat'
import { AggregatorV3Mock, ChainlinkMulticall } from '../../../typechain-types'
import { mockPriceFeed } from '../../../utils/mock-defi'

describe('ChainlinkMulticall', () => {
  let signer: SignerWithAddress
  let feed1: AggregatorV3Mock
  let feed2: AggregatorV3Mock
  let multiCall: ChainlinkMulticall

  before(async () => {
    ;[signer] = await ethers.getSigners()
    feed1 = await mockPriceFeed(signer, parseEther('1.25'), 8)
    feed2 = await mockPriceFeed(signer, parseEther('2.25'), 8)
    multiCall = await (await ethers.getContractFactory('ChainlinkMulticall')).deploy()
  })

  describe('getRoundData', () => {
    it('should fetch multiple answers by roundIds and priceFeeds', async () => {
      const result = await multiCall.getRoundData([
        { priceFeed: feed1.address, roundId: 10 },
        { priceFeed: feed1.address, roundId: 11 },
        { priceFeed: feed2.address, roundId: 10 },
        { priceFeed: feed2.address, roundId: 11 },
      ])
      expect(result).have.length(4)
      expect(result[0].answer).equal(parseEther('1.25'))
      expect(result[0].roundId).equal(10)
      expect(result[1].answer).equal(parseEther('1.25'))
      expect(result[1].roundId).equal(11)
      expect(result[2].answer).equal(parseEther('2.25'))
      expect(result[2].roundId).equal(10)
      expect(result[3].answer).equal(parseEther('2.25'))
      expect(result[3].roundId).equal(11)
    })
  })

  describe('latestRoundData', () => {
    it('should fetch multiple answers by priceFeeds', async () => {
      const result = await multiCall.latestRoundData([feed1.address, feed2.address])
      expect(result).have.length(2)
      expect(result[0].answer).equal(parseEther('1.25'))
      expect(result[1].answer).equal(parseEther('2.25'))
    })
  })
})
