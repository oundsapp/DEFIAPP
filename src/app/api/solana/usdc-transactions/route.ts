import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

// USDC mint address on Solana
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

interface USDCTransaction {
  signature: string;
  timestamp: number;
  type: "sent" | "received";
  amount: number;
  from: string;
  to: string;
  blockTime: number | null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");
    const vaultAddress = searchParams.get("vaultAddress");

    if (!walletAddress || !vaultAddress) {
      return NextResponse.json({ error: "Missing walletAddress or vaultAddress" }, { status: 400 });
    }

    const rpcUrl = process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
    const connection = new Connection(rpcUrl);

    // Validate addresses
    try {
      new PublicKey(walletAddress);
      new PublicKey(vaultAddress);
    } catch {
      return NextResponse.json({ error: "Invalid Solana address" }, { status: 400 });
    }

    // Get token accounts for both addresses
    const walletTokenAccounts = await connection.getParsedTokenAccountsByOwner(
      new PublicKey(walletAddress),
      {
        programId: new PublicKey(TOKEN_PROGRAM_ID),
      }
    );

    const vaultTokenAccounts = await connection.getParsedTokenAccountsByOwner(
      new PublicKey(vaultAddress),
      {
        programId: new PublicKey(TOKEN_PROGRAM_ID),
      }
    );

    // Find USDC token accounts
    const walletUSDCAccount = walletTokenAccounts.value.find(
      (account) => account.account.data.parsed.info.mint === USDC_MINT
    );

    const vaultUSDCAccount = vaultTokenAccounts.value.find(
      (account) => account.account.data.parsed.info.mint === USDC_MINT
    );

    const walletUSDCAddress = walletUSDCAccount?.pubkey.toString();
    const vaultUSDCAddress = vaultUSDCAccount?.pubkey.toString();

    const allTransactions: USDCTransaction[] = [];
    const processedSignatures = new Set<string>();

    // Helper function to process signatures
    const processSignatures = async (tokenAccountAddress: string) => {
      if (!tokenAccountAddress) return;

      try {
        const signatures = await connection.getSignaturesForAddress(
          new PublicKey(tokenAccountAddress),
          { limit: 100 }
        );

        for (const sigInfo of signatures) {
          if (processedSignatures.has(sigInfo.signature)) continue;
          processedSignatures.add(sigInfo.signature);

          try {
            const tx = await connection.getParsedTransaction(sigInfo.signature, {
              maxSupportedTransactionVersion: 0,
            });

            if (!tx || !tx.meta) continue;

            const preBalances = tx.meta.preTokenBalances || [];
            const postBalances = tx.meta.postTokenBalances || [];

            // Find USDC balance changes
            for (const postBalance of postBalances) {
              if (postBalance.mint !== USDC_MINT) continue;

              const preBalance = preBalances.find(
                (pb) => pb.accountIndex === postBalance.accountIndex
              );

              const preAmount = preBalance ? parseFloat(preBalance.uiTokenAmount.uiAmountString || "0") : 0;
              const postAmount = parseFloat(postBalance.uiTokenAmount.uiAmountString || "0");
              const change = postAmount - preAmount;

              if (Math.abs(change) < 0.000001) continue;

              const accountOwner = postBalance.owner || "";
              
              // Determine if this transaction involves both wallet and vault
              const involvesWallet = accountOwner === walletAddress || 
                preBalances.some(pb => pb.owner === walletAddress) ||
                postBalances.some(pb => pb.owner === walletAddress);
              
              const involvesVault = accountOwner === vaultAddress ||
                preBalances.some(pb => pb.owner === vaultAddress) ||
                postBalances.some(pb => pb.owner === vaultAddress);

              if (!involvesWallet || !involvesVault) continue;

              // Determine transaction direction
              let type: "sent" | "received" = "sent";
              let fromAddr = walletAddress;
              let toAddr = vaultAddress;

              if (accountOwner === vaultAddress && change > 0) {
                // USDC increased in vault - sent from wallet
                type = "sent";
                fromAddr = walletAddress;
                toAddr = vaultAddress;
              } else if (accountOwner === walletAddress && change > 0) {
                // USDC increased in wallet - received from vault
                type = "received";
                fromAddr = vaultAddress;
                toAddr = walletAddress;
              } else {
                // Skip if we can't determine direction clearly
                continue;
              }

              allTransactions.push({
                signature: sigInfo.signature,
                timestamp: sigInfo.blockTime || Date.now() / 1000,
                type,
                amount: Math.abs(change),
                from: fromAddr,
                to: toAddr,
                blockTime: sigInfo.blockTime ?? null,
              });

              break; // Only process one transfer per transaction to avoid duplicates
            }
          } catch (error) {
            console.warn(`Failed to parse transaction ${sigInfo.signature}:`, error);
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch signatures for ${tokenAccountAddress}:`, error);
      }
    };

    // Process both accounts
    await Promise.all([
      processSignatures(walletUSDCAddress || ""),
      processSignatures(vaultUSDCAddress || ""),
    ]);

    // Remove duplicates and sort by timestamp (newest first)
    const uniqueTransactions = Array.from(
      new Map(allTransactions.map(tx => [tx.signature, tx])).values()
    ).sort((a, b) => (b.blockTime || 0) - (a.blockTime || 0));

    // Calculate total USDC sent to vault
    const totalSentToVault = uniqueTransactions
      .filter(tx => tx.type === "sent" && tx.to === vaultAddress)
      .reduce((sum, tx) => sum + tx.amount, 0);

    return NextResponse.json({
      transactions: uniqueTransactions,
      totalSentToVault,
      count: uniqueTransactions.length,
    });
  } catch (error: any) {
    console.error("Error fetching USDC transactions:", error);
    return NextResponse.json({ error: error?.message || "Unknown error" }, { status: 500 });
  }
}

