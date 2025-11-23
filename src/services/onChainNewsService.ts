import { ethers } from "ethers";
import { toast } from "react-hot-toast";

export interface VerifiedNews {
  id: string;
  title: string;
  content: string;
  timestamp: number;
  signature: string;
  signerAddress: string;
  projectAddress: string;
  chainId: number;
  txHash?: string;
}

export interface NewsVerificationResult {
  isValid: boolean;
  signerAddress: string;
  projectAddress: string;
  timestamp: number;
  verificationDetails?: {
    chainId: number;
    blockNumber: number;
    txHash: string;
  };
}

export class OnChainNewsService {
  private static instance: OnChainNewsService;
  private provider: ethers.JsonRpcProvider;

  private constructor() {
    // Initialize with a default provider - you might want to make this configurable
    this.provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
  }

  public static getInstance(): OnChainNewsService {
    if (!OnChainNewsService.instance) {
      OnChainNewsService.instance = new OnChainNewsService();
    }
    return OnChainNewsService.instance;
  }

  /**
   * Verify a news announcement's signature
   */
  public async verifyNewsSignature(
    news: VerifiedNews,
  ): Promise<NewsVerificationResult> {
    try {
      // Create the message hash that was signed
      const messageHash = ethers.hashMessage(
        `${news.title}${news.content}${news.timestamp}`,
      );

      // Recover the signer's address
      const recoveredAddress = ethers.verifyMessage(
        `${news.title}${news.content}${news.timestamp}`,
        news.signature,
      );

      // Verify the recovered address matches the claimed signer
      const isValid =
        recoveredAddress.toLowerCase() === news.signerAddress.toLowerCase();

      // If there's a transaction hash, verify it on-chain
      let verificationDetails;
      if (news.txHash) {
        const tx = await this.provider.getTransaction(news.txHash);
        if (tx) {
          verificationDetails = {
            chainId: Number(tx.chainId),
            blockNumber: tx.blockNumber || 0,
            txHash: news.txHash,
          };
        }
      }

      return {
        isValid,
        signerAddress: recoveredAddress,
        projectAddress: news.projectAddress,
        timestamp: news.timestamp,
        verificationDetails,
      };
    } catch (error) {
      console.error("Error verifying news signature:", error);
      toast.error("Failed to verify news signature");
      throw error;
    }
  }

  /**
   * Sign a news announcement (to be used by project teams)
   */
  public async signNewsAnnouncement(
    title: string,
    content: string,
    projectAddress: string,
    privateKey: string,
  ): Promise<VerifiedNews> {
    try {
      const wallet = new ethers.Wallet(privateKey, this.provider);
      const timestamp = Math.floor(Date.now() / 1000);

      // Create the message to sign
      const message = `${title}${content}${timestamp}`;
      const signature = await wallet.signMessage(message);

      const verifiedNews: VerifiedNews = {
        id: ethers.keccak256(ethers.toUtf8Bytes(`${title}${timestamp}`)),
        title,
        content,
        timestamp,
        signature,
        signerAddress: wallet.address,
        projectAddress,
        chainId: Number((await this.provider.getNetwork()).chainId),
      };

      return verifiedNews;
    } catch (error) {
      console.error("Error signing news announcement:", error);
      toast.error("Failed to sign news announcement");
      throw error;
    }
  }

  /**
   * Store verified news on-chain (optional)
   */
  public async storeNewsOnChain(
    news: VerifiedNews,
    privateKey: string,
  ): Promise<string> {
    try {
      const wallet = new ethers.Wallet(privateKey, this.provider);

      // Here you would interact with your smart contract
      // This is a placeholder for the actual contract interaction
      const tx = await wallet.sendTransaction({
        to: process.env.NEXT_PUBLIC_NEWS_CONTRACT_ADDRESS,
        data: ethers.hexlify(ethers.toUtf8Bytes(JSON.stringify(news))),
      });

      return tx.hash;
    } catch (error) {
      console.error("Error storing news on-chain:", error);
      toast.error("Failed to store news on-chain");
      throw error;
    }
  }

  /**
   * Get verification status for a news item
   */
  public async getVerificationStatus(
    newsId: string,
  ): Promise<NewsVerificationResult | null> {
    try {
      // Here you would query your backend or blockchain for the verification status
      // This is a placeholder implementation
      const response = await fetch(`/api/news/verify/${newsId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch verification status");
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching verification status:", error);
      toast.error("Failed to fetch verification status");
      return null;
    }
  }
}
