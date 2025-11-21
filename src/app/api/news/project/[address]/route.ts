import { NextResponse } from "next/server";
import { OnChainNewsService } from "@/services/onChainNewsService";

export async function GET(
  request: Request,
  { params }: { params: { address: string } },
) {
  try {
    // Here you would query your smart contract for the project's news
    // This is a placeholder implementation
    const response = await fetch(`${process.env.NEXT_PUBLIC_RPC_URL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_call",
        params: [
          {
            to: process.env.NEXT_PUBLIC_NEWS_CONTRACT_ADDRESS,
            data: `0x${Buffer.from("getProjectNews").toString("hex")}${params.address.slice(2).padStart(64, "0")}`,
          },
          "latest",
        ],
        id: 1,
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }

    // Parse the response and format the news items
    const newsItems = data.result.map((item: any) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      timestamp: parseInt(item.timestamp, 16),
      signer: item.signer,
      project: item.project,
      signature: item.signature,
      isValid: item.isValid,
      version: parseInt(item.version, 16),
    }));

    return NextResponse.json(newsItems);
  } catch (error) {
    console.error("Error in project news API:", error);
    return NextResponse.json(
      { error: "Failed to fetch project news" },
      { status: 500 },
    );
  }
}
