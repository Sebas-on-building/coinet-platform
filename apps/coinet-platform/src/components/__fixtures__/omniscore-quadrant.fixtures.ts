import { ProjectPoint } from "../OmniScoreQuadrantBoard";
import { DEFAULT_OS_THRESHOLD } from "../../services/omniscore-constants";

// A) All OK: mixed sectors/caps, no gating, movement vectors for a few
export const allOkProjects: ProjectPoint[] = [
  { name: "Ethereum", ticker: "ETH", sector: "L1", capBucket: "mega", qs: 78, osStatus: "ok", os: 72, pos: 55, posAdj: 55.5, confidence: "high", nmi: { score: 12, tier: "clean" }, qsPrev7d: 77, osPrev7d: 70, deltaPOSAdj7d: 1.2 },
  { name: "Solana", ticker: "SOL", sector: "L1", capBucket: "large", qs: 70, osStatus: "ok", os: 68, pos: 52, posAdj: 53, confidence: "medium", nmi: { score: 18, tier: "clean" }, deltaQS7d: 2, deltaOS7d: 1 },
  { name: "Chainlink", ticker: "LINK", sector: "Infrastructure", capBucket: "large", qs: 74, osStatus: "ok", os: 50, pos: 49, posAdj: 49.2, confidence: "high", nmi: { score: 24, tier: "suspicious" } },
  { name: "Aave", ticker: "AAVE", sector: "DeFi", capBucket: "mid", qs: 47, osStatus: "ok", os: 52, pos: 38, posAdj: 38.1, confidence: "medium", nmi: { score: 25, tier: "suspicious" } },
  { name: "Uniswap", ticker: "UNI", sector: "DeFi", capBucket: "mid", qs: 58, osStatus: "ok", os: 61, pos: 44, posAdj: 44.5, confidence: "low", nmi: { score: 30, tier: "manipulated" } },
  { name: "Sui", ticker: "SUI", sector: "L1", capBucket: "mid", qs: 55, osStatus: "ok", os: 64, pos: 46, posAdj: 46.3, confidence: "medium", nmi: { score: 20, tier: "clean" } },
];

// B) Some gated: ensure OS null and plot at midline (use DEFAULT_OS_THRESHOLD as midline)
export const someGatedProjects: ProjectPoint[] = [
  { name: "Ethereum", ticker: "ETH", sector: "L1", capBucket: "mega", qs: 78, osStatus: "ok", os: 72, pos: 55, posAdj: 55.5, confidence: "high", nmi: { score: 12, tier: "clean" } },
  { name: "Polkadot", ticker: "DOT", sector: "L1", capBucket: "large", qs: 59, osStatus: "gated", os: null, pos: 41, posAdj: 41, confidence: "medium", coverageQS: 0.55, nmi: { score: 22, tier: "suspicious" } },
  { name: "Aave", ticker: "AAVE", sector: "DeFi", capBucket: "mid", qs: 47, osStatus: "gated", os: null, pos: 38, posAdj: 38, confidence: "low", coverageQS: 0.50, nmi: { score: 25, tier: "suspicious" } },
  { name: "Uniswap", ticker: "UNI", sector: "DeFi", capBucket: "mid", qs: 58, osStatus: "ok", os: 61, pos: 44, posAdj: 44.5, confidence: "low", nmi: { score: 30, tier: "manipulated" } },
  { name: "Sui", ticker: "SUI", sector: "L1", capBucket: "mid", qs: 55, osStatus: "ok", os: 64, pos: 46, posAdj: 46.3, confidence: "medium", nmi: { score: 20, tier: "clean" } },
  { name: "Supra", ticker: "SUPRA", sector: "Infrastructure", capBucket: "small", qs: 50, osStatus: "gated", os: null, pos: 35, posAdj: 35, confidence: "insufficient", coverageQS: 0.40, nmi: { score: 28, tier: "suspicious" } },
];

// C) Low peer confidence: peerBoostDisabled true via data fields
export const lowPeerConfidenceProjects: ProjectPoint[] = [
  { name: "Chainlink", ticker: "LINK", sector: "Infrastructure", capBucket: "large", qs: 74, osStatus: "ok", os: 50, pos: 49, posAdj: 49.2, confidence: "high", nmi: { score: 24, tier: "suspicious" }, coverageQS: 0.95 },
  { name: "SmallCap1", ticker: "SC1", sector: "DeFi", capBucket: "micro", qs: 62, osStatus: "ok", os: 48, pos: 42, posAdj: 42, confidence: "low", nmi: { score: 18, tier: "clean" }, coverageQS: 0.35 },
  { name: "SmallCap2", ticker: "SC2", sector: "DeFi", capBucket: "micro", qs: 40, osStatus: "ok", os: 42, pos: 33, posAdj: 33, confidence: "insufficient", nmi: { score: 26, tier: "suspicious" }, coverageQS: 0.30 },
  // Mark peer confidence insufficient by implying fallback/global peer context usage
  { name: "Obscure", ticker: "OBSC", sector: "Other", capBucket: "micro", qs: 35, osStatus: "ok", os: 30, pos: 25, posAdj: 25, confidence: "insufficient", nmi: { score: 32, tier: "manipulated" }, coverageQS: 0.25 },
];

