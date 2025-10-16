import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    if (!address) {
      return NextResponse.json({ error: "Missing address" }, { status: 400 });
    }

    const rpcUrl = process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

    const rpcResponse = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "get-balance",
        method: "getBalance",
        params: [address],
      }),
      // Rely on server-side to avoid CORS issues
      cache: "no-store",
    });

    if (!rpcResponse.ok) {
      const text = await rpcResponse.text();
      return NextResponse.json({ error: `Upstream error: ${rpcResponse.status} ${text}` }, { status: 502 });
    }

    const json = await rpcResponse.json();
    if (json.error) {
      return NextResponse.json({ error: json.error?.message || "RPC error" }, { status: 502 });
    }

    const lamports = json.result?.value ?? 0;
    return NextResponse.json({ lamports });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unknown error" }, { status: 500 });
  }
}


