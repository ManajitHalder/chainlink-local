import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";
// import { id, AbiCoder } from "ethers";
import {
  CCIPLocalSimulator,
  CrossChainNameServiceRegister,
  CrossChainNameServiceReceiver,
  CrossChainNameServiceLookup,
} from "../typechain-types";

describe("CrossChainNameService", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployFixture() {
    const [alice, bob] = await hre.ethers.getSigners();

    const ccipLocalSimualtorFactory = await hre.ethers.getContractFactory("CCIPLocalSimulator");
    const ccipLocalSimulator: CCIPLocalSimulator = await ccipLocalSimualtorFactory.deploy();

    
    // Deploy CrossChainNameServiceRegister
    const crossChainNameServiceRegisterFactory = await hre.ethers.getContractFactory("CrossChainNameServiceRegister");
    const crossChainNameServiceRegister: CrossChainNameServiceRegister = await crossChainNameServiceRegisterFactory.deploy(ccipLocalSimulator.address, ccipLocalSimulator.address);

    // Deploy CrossChainNameServiceReceiver
    const crossChainNameServiceReceiverFactory = await hre.ethers.getContractFactory("CrossChainNameServiceReceiver");
    const sourceChainSelector = 1;
    const crossChainNameServiceReceiver: CrossChainNameServiceReceiver = await crossChainNameServiceReceiverFactory.deploy(ccipLocalSimulator.address, ccipLocalSimulator.address, sourceChainSelector);

    // Deploy CrossChainNameServiceLookup
    const crossChainNameServiceLookupFactory = await hre.ethers.getContractFactory("CrossChainNameServiceLookup");
    const crossChainNameServiceLookup: CrossChainNameServiceLookup = await crossChainNameServiceLookupFactory.deploy();

    return { ccipLocalSimulator, crossChainNameServiceRegister, crossChainNameServiceReceiver, crossChainNameServiceLookup, alice, bob };
  }

  it("Should register and lookup of name service in CCIP Cross Chain environment", async function () {

    const { ccipLocalSimulator, crossChainNameServiceRegister, crossChainNameServiceReceiver, crossChainNameServiceLookup, alice, bob } = await loadFixture(deployFixture);

    const config: {
        chainSelector_: bigint;
        sourceRouter_: string;
        destinationRouter_: string;
        wrappedNative_: string;
        linkToken_: string;
        ccipBnM_: string;
        ccipLnM_: string;
    } = await ccipLocalSimulator.configuration();

    // Call enableChain using crossChainNameServiceRegister address as ccnsReceiverAddress
    const chainSelector = 1;
    const ccnsReceiverAddress = crossChainNameServiceRegister.address;
    const gasLimit = 0;
    await crossChainNameServiceRegister.enableChain(chainSelector, ccnsReceiverAddress, gasLimit);

    // Call setCrossChainNameServiceAddress using crossChainNameServiceRegister.address as source instance 
    const crossChainNameServiceSource = crossChainNameServiceRegister.address;
    await crossChainNameServiceLookup.setCrossChainNameServiceAddress(crossChainNameServiceSource);

    // Call setCrossChainNameServiceAddress using crossChainNameServiceRegister.address as receiver instance
    const crossChainNameServiceReciver = crossChainNameServiceReceiver.address;
    await crossChainNameServiceLookup.setCrossChainNameServiceAddress(crossChainNameServiceReciver);

    // Call the register() function and provide “alice.ccns” and Alice’s EOA address as function arguments
    const name = "alice.ccns";
    await crossChainNameServiceRegister.connect(alice).register(name);

    // Call the lookup() function and provide “alice.ccns” as a function argument.
    const registeredAddress = await crossChainNameServiceLookup.lookup(name);

    // const registeredAddress = await ccipLocalSimulator.getAddress(name);
    expect(registeredAddress).to.equal(alice.address);
  })
});
