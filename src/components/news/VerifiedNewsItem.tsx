"use client";

import React, { useEffect, useState } from "react";
import {
  VerifiedNews,
  NewsVerificationResult,
  OnChainNewsService,
} from "@/services/onChainNewsService";
import {
  Shield,
  ExternalLink,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";

interface VerifiedNewsItemProps {
  news: VerifiedNews;
}

export const VerifiedNewsItem: React.FC<VerifiedNewsItemProps> = ({ news }) => {
  const [verificationResult, setVerificationResult] =
    useState<NewsVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    verifyNews();
  }, [news]);

  const verifyNews = async () => {
    try {
      setIsVerifying(true);
      setError(null);
      const result =
        await OnChainNewsService.getInstance().verifyNewsSignature(news);
      setVerificationResult(result);
    } catch (error) {
      console.error("Error verifying news:", error);
      setError(
        error instanceof Error ? error.message : "Failed to verify news",
      );
      toast.error("Failed to verify news");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
    verifyNews();
  };

  const getVerificationBadge = () => {
    if (isVerifying) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <Clock className="w-3 h-3 mr-1 animate-spin" />
          Verifying...
        </span>
      );
    }

    if (error) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Verification Failed
        </span>
      );
    }

    if (verificationResult?.isValid) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Verified
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <XCircle className="w-3 h-3 mr-1" />
        Unverified
      </span>
    );
  };

  const getVerificationDetails = () => {
    if (isVerifying) {
      return (
        <div className="text-sm text-gray-500">
          <p>Verifying news authenticity...</p>
          <p className="text-xs mt-1">This may take a few moments</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-sm">
          <p className="text-red-600 mb-2">{error}</p>
          <button
            onClick={handleRetry}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Retry Verification
          </button>
        </div>
      );
    }

    if (!verificationResult) {
      return null;
    }

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-700">Signer Address</p>
            <p className="truncate text-gray-600">
              {verificationResult.signerAddress}
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Project Address</p>
            <p className="truncate text-gray-600">{news.projectAddress}</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Timestamp</p>
            <p className="text-gray-600">
              {new Date(news.timestamp * 1000).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Chain ID</p>
            <p className="text-gray-600">{news.chainId}</p>
          </div>
        </div>

        {verificationResult.verificationDetails && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="font-medium text-gray-700 mb-2">
              On-Chain Verification
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-700">Block Number</p>
                <p className="text-gray-600">
                  {verificationResult.verificationDetails.blockNumber}
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Transaction</p>
                <a
                  href={`https://etherscan.io/tx/${verificationResult.verificationDetails.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800"
                >
                  View on Etherscan
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t">
          <h4 className="font-medium text-gray-700 mb-2">
            Verification Status
          </h4>
          <div className="flex items-center space-x-2">
            {verificationResult.isValid ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            <p className="text-sm text-gray-600">
              {verificationResult.isValid
                ? "This news has been verified on-chain"
                : "This news could not be verified"}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold">{news.title}</h3>
        {getVerificationBadge()}
      </div>

      <p className="text-gray-600 mb-4">{news.content}</p>

      <div className="border-t pt-4">{getVerificationDetails()}</div>
    </div>
  );
};
