import { NextResponse } from "next/server";
import { OnChainNewsService } from "@/services/onChainNewsService";

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const verificationResult =
      await OnChainNewsService.getInstance().getVerificationStatus(params.id);

    if (!verificationResult) {
      return NextResponse.json(
        { error: "Verification status not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(verificationResult);
  } catch (error) {
    console.error("Error in news verification API:", error);
    return NextResponse.json(
      { error: "Failed to verify news" },
      { status: 500 },
    );
  }
}
