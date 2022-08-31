const { expect } = require("chai");
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");

const delay = ms => new Promise(res => setTimeout(res, ms));


describe("FYTE", function () {
  async function deployContracts() {


    // Contracts are deployed using the first signer/account by default
    const [owner, address1] = await ethers.getSigners();
    const NFT = await ethers.getContractFactory("NFT");
    const nftV1 = await NFT.deploy('', '', '');
    const nftV2 = await NFT.deploy('', '', '');
    const FYTE = await ethers.getContractFactory("FYTE");
    const fyte = await FYTE.deploy(nftV1.address, nftV2.address, [owner.address, address1.address], [80, 20]);
    return { fyte, nftV1, nftV2, owner, address1 };

  }
  describe("Deployment", function () {
    it("Should set the right contract addresses", async function () {
      const { fyte, nftV1, nftV2 } = await loadFixture(deployContracts);
      expect(await fyte.V1Address.call()).to.equal(nftV1.address);
      expect(await fyte.V2Address.call()).to.equal(nftV2.address);
    });
  })
  describe("Calculate Claim", function () {
    it("Calculates First Claim", async function () {
      const { fyte, nftV1, nftV2, owner, address1 } = await loadFixture(deployContracts);
      await nftV1.mint(1)
      await nftV2.mint(1)
      const claimAmount = await fyte.claimAmount();
      expect(claimAmount).to.equal((15 * 10 ** 18).toString())
    })

    it("Calculates Claim Multiplier", async function () {
      const { fyte, nftV1, nftV2, owner, address1 } = await loadFixture(deployContracts);
      await fyte.setClaimPause(false);
      await fyte.setTimeBetweenClaim(60);
      await nftV1.mint(1)
      await nftV2.mint(1)
      await fyte.claim();
      await network.provider.send("evm_increaseTime", [360])
      await network.provider.send("evm_mine")
      const claimAmount = await fyte.claimAmount();
      expect(claimAmount).to.equal((90 * 10 ** 18).toString())
    })
  })
  describe("Time To Claim", function () {
    it("Calculates First Claim Scenario", async function () {
      const { fyte, nftV1, nftV2, owner, address1 } = await loadFixture(deployContracts);
      await nftV1.mint(1)
      await nftV2.mint(1)
      const timeToClaim = await fyte.timeToClaim();
      expect(timeToClaim).to.equal(0)
    })
    it("Returns Time Until Claim", async function () {
      const { fyte, nftV1, nftV2, owner, address1 } = await loadFixture(deployContracts);
      await fyte.setTimeBetweenClaim(60);
      await fyte.setClaimPause(false);
      await nftV1.mint(1)
      await nftV2.mint(1)
      await fyte.claim()
      const timeToClaim = await fyte.timeToClaim();
      expect(timeToClaim).to.equal(60)
    })
    it("Calculates When Ready To Claim", async function () {
      const { fyte, nftV1, nftV2, owner, address1 } = await loadFixture(deployContracts);
      await fyte.setTimeBetweenClaim(60);
      await fyte.setClaimPause(false);
      await nftV1.mint(1)
      await nftV2.mint(1)
      await fyte.claim()
      await network.provider.send("evm_increaseTime", [60])
      await network.provider.send("evm_mine")
      const timeToClaim = await fyte.timeToClaim();
      expect(timeToClaim).to.equal(0)
    })

  })
  describe("Claim", function () {
    it("Can Only Claim When Unpaused", async function () {
      const { fyte, nftV1, nftV2 } = await loadFixture(deployContracts);
      try {
        await fyte.claim();
        expect(1).to.equal(2);
      } catch (e) {
        expect(e.message).to.equal("VM Exception while processing transaction: reverted with reason string 'Claim is Paused'")
      }
    });
    it("Can Only Claim After Time Elapsed", async function () {
      const { fyte, nftV1, nftV2, owner, address1 } = await loadFixture(deployContracts);

      await fyte.setTimeBetweenClaim(60);
      await fyte.setClaimPause(false);
      await nftV1.mint(1)
      await nftV2.mint(1)
      try {
        await fyte.claim();
        await fyte.claim();
        expect(1).to.equal(2);
      } catch (e) {
        expect(e.message).to.equal("VM Exception while processing transaction: reverted with reason string 'Tokens Already Claimed'");
      }
    });
    it("Multiplies Claim Amount By Time", async function () {
      const { fyte, nftV1, nftV2, owner, address1 } = await loadFixture(deployContracts);
      await fyte.setTimeBetweenClaim(60);
      await fyte.setClaimPause(false);
      await nftV1.mint(1)
      await nftV2.mint(1)
      await fyte.claim();
      await network.provider.send("evm_increaseTime", [120])
      await network.provider.send("evm_mine")
      await fyte.claim()
      let tokenBalance = (await fyte.balanceOf(owner.address)).toString()
      expect(tokenBalance).to.equal('45000000000000000000');

    })

    it("Claims Correct Amount of Tokens", async function () {
      const { fyte, nftV1, nftV2, owner, address1 } = await loadFixture(deployContracts);
      await nftV1.mint(2)
      await nftV2.mint(3)
      await fyte.setTimeBetweenClaim(0);
      await fyte.setClaimPause(false);
      await fyte.claim();
      let tokenBalance = (await fyte.balanceOf(owner.address)).toString()
      expect(tokenBalance).to.equal("35000000000000000000");
    });
  })
  describe("Buy", function () {
    it("Can Only Purchase While UnPaused", async function () {
      const { fyte, nftV1, nftV2, owner, address1 } = await loadFixture(deployContracts);
      try {
        await fyte.buy(1);
        expect(1).to.equal(2);
      } catch (e) {
        expect(e.message).to.equal("VM Exception while processing transaction: reverted with reason string 'Buy is Paused'");
      }
    })
    it("Requires Proper Amount of Bread (Payment)", async function () {
      const { fyte, nftV1, nftV2, owner, address1 } = await loadFixture(deployContracts);
      await fyte.setBuyPause(false)
      try {
        await fyte.buy((1 * 10 ** 18).toString(), { value: (1 * 10 ** 18).toString() })
        expect(1).to.equal(2);
      } catch (e) {
        expect(e.message.includes('insufficient funds for intrinsic transaction cost')).to.equal(true);
      }
    })
    it("Must Buy At Least 1 Ether", async function () {
      const { fyte, nftV1, nftV2, owner, address1 } = await loadFixture(deployContracts);
      await fyte.setBuyPause(false)
      try {
        await fyte.buy(1);
        expect(1).to.equal(2);
      } catch (e) {
        expect(e.message.includes("reverted with reason string 'Must Buy 1 Token'")).to.equal(true);
      }
    })
    it("Mints Correct Amount of Tokens", async function () {
      const { fyte, nftV1, nftV2, owner, address1 } = await loadFixture(deployContracts);
      await fyte.setBuyPause(false)
      await fyte.buy((1 * 10 ** 18).toString(), { value: (10 * 10 ** 18).toString() })
      expect(await fyte.balanceOf(owner.address)).to.equal('1000000000000000000')
    })
  })

  describe("Owner Mint", function () {
    it("Owner Can Mint", async function () {
      const { fyte, nftV1, nftV2, owner, address1 } = await loadFixture(deployContracts);
      await fyte.ownerMint(address1.address, 1)
      expect(await fyte.balanceOf(address1.address)).to.equal('1000000000000000000')
    })
    it("Non-Owner Can't Mint", async function () {
      const { fyte, nftV1, nftV2, owner, address1 } = await loadFixture(deployContracts);
      try {
        await fyte.connect(address1).ownerMint(address1.address, 1)
        expect(0).to.equal(1, "Non Owner Can Mint")
      } catch (e) {
        expect(e.message).to.equal("VM Exception while processing transaction: reverted with reason string 'Ownable: caller is not the owner'")
      }
    })
  })

  describe("Settings", function () {
    it("Can Update Claim Pause", async function () {
      const { fyte, nftV1, nftV2, owner, address1 } = await loadFixture(deployContracts);
      await fyte.setClaimPause(false);
      const claimPause = await fyte.claimPause();
      expect(claimPause).to.equal(false)
    })
    it("Can Update Buy Pause", async function () {
      const { fyte, nftV1, nftV2, owner, address1 } = await loadFixture(deployContracts);
      await fyte.setBuyPause(false);
      const buyPause = await fyte.buyPause();
      expect(buyPause).to.equal(false)
    })
    it("Can Update V1 Address", async function () {
      const { fyte, nftV1, nftV2, owner, address1 } = await loadFixture(deployContracts);
      await fyte.setV1Address(nftV2.address);
      const V1Address = await fyte.V1Address();
      expect(V1Address).to.equal(nftV2.address)
    })
    it("Can Update V2 Address", async function () {
      const { fyte, nftV1, nftV2, owner, address1 } = await loadFixture(deployContracts);
      await fyte.setV2Address(nftV1.address);
      const V2Address = await fyte.V2Address();
      expect(V2Address).to.equal(nftV1.address)
    })
    it("Can Update V1 Claim Amount", async function () {
      const { fyte, nftV1, nftV2, owner, address1 } = await loadFixture(deployContracts);
      await fyte.setV1ClaimAmount(1);
      const V1ClaimAmount = await fyte.V1ClaimAmount();
      expect(V1ClaimAmount).to.equal(1)
    })
    it("Can Update V2 Claim Amount", async function () {
      const { fyte, nftV1, nftV2, owner, address1 } = await loadFixture(deployContracts);
      await fyte.setV2ClaimAmount(1);
      const V2ClaimAmount = await fyte.V2ClaimAmount();
      expect(V2ClaimAmount).to.equal(1)
    })
    it("Can Update Time Between Claim", async function () {
      const { fyte, nftV1, nftV2, owner, address1 } = await loadFixture(deployContracts);
      await fyte.setTimeBetweenClaim(1)
      const time = await fyte.timeBetweenClaim();
      expect(time).to.equal(1)
    })
  })

  describe("PullPayment", function () {
    it("Can Pull Payment", async function () {
      const { fyte, nftV1, nftV2, owner, address1 } = await loadFixture(deployContracts);
      await fyte.setBuyPause(false)
      await fyte.buy((10 * 10 ** 18).toString(), { value: (100 * 10 ** 18).toString() })
      provider = ethers.provider;
      let ownerBalance = await provider.getBalance(owner.address)
      let address1Balance = await provider.getBalance(address1.address)
      await fyte['release(address)'](owner.address)
      await fyte['release(address)'](address1.address)
      expect(await provider.getBalance(owner.address) > ownerBalance).to.equal(true)
      expect(await provider.getBalance(address1.address) > address1Balance).to.equal(true)
    })
  })





});
