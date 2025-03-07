import { AuthorizeMemoryResult } from "@saito/keeper";
import { ethers } from "ethers";
import { env } from "../../../env";
import { SaitoMemoryAuthAbi } from "./saito-memory-auth.abi";

const provider = new ethers.JsonRpcProvider(env().ETH_RPC_URL);
const wallet = new ethers.Wallet(env().PRIVATE_KEY, provider);
const contract = new ethers.Contract(env().VERIFICATION_CONTRACT_ADDRESS, SaitoMemoryAuthAbi, wallet);

export abstract class MemoryAuthService {
  abstract checkMemoryAuth(
    memoryId: string,
    requester: string,
): Promise<AuthorizeMemoryResult>;

  abstract constructGrantMemoryEIP712Signature(
    memoryId: string,
    requester: string
  ): Promise<string>;

  abstract grantMemoryAccess(
    memoryId: string,
    requester: string,
    eip712Signature: string,
  ): Promise<AuthorizeMemoryResult>
}

const domain = {
  name: "AuthorizationContract",
  version: "1",
  chainId: env().CHAIN_ID,
  verifyingContract: env().VERIFICATION_CONTRACT_ADDRESS,
};

const types = {
  AccessApproval: [
    { name: "requester", type: "address" },
    { name: "resourceId", type: "bytes32" },
  ],
};

export class DefaultMemoryAuthService implements MemoryAuthService {

  /**
   * Checks whether the requester is authorized to access a specific memory record.
   *
   * This method:
   * 1. Converts the provided memoryId into a resourceId using a SHA-256 hash.
   * 2. Queries the contract to check if the requester is authorized for this resource.
   * 3. Returns an object containing the authorization result.
   *
   * @param memoryId - The unique identifier for the memory record.
   * @param requester - The address of the entity requesting access.
   * @returns A promise that resolves to an object with the authorization status.
   */
    async checkMemoryAuth(memoryId: string, requester: string): Promise<AuthorizeMemoryResult> {
      const resourceId = ethers.sha256(ethers.toUtf8Bytes(memoryId));
      const isAuthorized: boolean = await contract["isAuthorized"](resourceId, requester);
      return {
        requester,
        memory_id: memoryId,
        is_authorized: isAuthorized
      }
    }

  /**
   * Constructs an EIP-712 signature that grants memory access.
   *
   * The signature is generated based on a message containing:
   * - The requester address.
   * - The resourceId (derived from memoryId).
   *
   * This signature is later used to verify that access is properly authorized.
   *
   * @param memoryId - The identifier for the memory record.
   * @param requester - The address for which the access signature is being constructed.
   * @returns A promise that resolves to the EIP-712 signature as a string.
   */
    async constructGrantMemoryEIP712Signature(memoryId: string, requester: string): Promise<string> {
      const resourceId = ethers.sha256(ethers.toUtf8Bytes(memoryId));

      const message = {
        requester,
        resourceId, // This must be a valid 32-byte hex string
      };
      return await wallet.signTypedData(domain, types, message);
    }

  /**
   * Grants access to memory by verifying the provided EIP-712 signature.
   *
   * The method performs these steps:
   * 1. Derives the resourceId from the memoryId.
   * 2. Constructs the message used for signature verification.
   * 3. Verifies that the signature was produced by the trusted wallet address.
   * 4. If the signature is valid, calls the contract to approve access for the requester.
   *
   * @param memoryId - The identifier for the memory record.
   * @param requester - The address of the requester.
   * @param eip712Signature - The signature proving authorization.
   * @returns A promise that resolves to an authorization result object confirming access.
   * @throws An error if the signature verification fails.
   */
    async grantMemoryAccess(memoryId: string, requester: string, eip712Signature: string): Promise<AuthorizeMemoryResult> {

      const resourceId = ethers.sha256(ethers.toUtf8Bytes(memoryId));
      const message = {
        requester, // The address for which access is requested
        resourceId,
      };

      const recoveredAddress = ethers.verifyTypedData(domain, types, message, eip712Signature);
      if(recoveredAddress !== env().WALLET_ADDRESS) {
        throw new Error('signature not matched');
      }

      const tx = await contract["approveAccess"](resourceId, requester, eip712Signature);
      const receipt = await tx.wait();
      return {
        requester,
        memory_id: memoryId,
        is_authorized: true
      };
    }

}

const MemoryAuthServiceProvider = {
  provide: MemoryAuthService,
  useClass: DefaultMemoryAuthService,
};

export default MemoryAuthServiceProvider;
