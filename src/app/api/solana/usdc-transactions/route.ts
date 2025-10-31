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

    // If no USDC accounts found, return empty
    if (!walletUSDCAddress && !vaultUSDCAddress) {
      return NextResponse.json({
        transactions: [],
        totalSentToVault: 0,
        count: 0,
        message: "No USDC token accounts found for wallet or vault",
      });
    }

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

            // Get account keys to identify token accounts
            const accountKeys = tx.transaction.message.accountKeys.map(key => 
              typeof key === 'string' ? key : key.pubkey.toString()
            );

            // We need both token accounts to be in the transaction to detect a transfer
            if (!walletUSDCAddress || !vaultUSDCAddress) continue;

            // Find wallet and vault USDC token account indices
            const walletTokenAccountIndex = accountKeys.findIndex(addr => addr === walletUSDCAddress);
            const vaultTokenAccountIndex = accountKeys.findIndex(addr => addr === vaultUSDCAddress);

            // Skip if both accounts are not in this transaction (not a transfer between them)
            if (walletTokenAccountIndex === -1 || vaultTokenAccountIndex === -1) continue;

            // Find USDC balance changes for both accounts
            const walletPreBalance = preBalances.find(
              pb => pb.accountIndex === walletTokenAccountIndex && pb.mint === USDC_MINT
            );
            const walletPostBalance = postBalances.find(
              pb => pb.accountIndex === walletTokenAccountIndex && pb.mint === USDC_MINT
            );
            const vaultPreBalance = preBalances.find(
              pb => pb.accountIndex === vaultTokenAccountIndex && pb.mint === USDC_MINT
            );
            const vaultPostBalance = postBalances.find(
              pb => pb.accountIndex === vaultTokenAccountIndex && pb.mint === USDC_MINT
            );

            // Calculate changes
            const walletPreAmount = walletPreBalance 
              ? parseFloat(walletPreBalance.uiTokenAmount.uiAmountString || "0") 
              : 0;
            const walletPostAmount = walletPostBalance 
              ? parseFloat(walletPostBalance.uiTokenAmount.uiAmountString || "0") 
              : 0;
            const vaultPreAmount = vaultPreBalance 
              ? parseFloat(vaultPreBalance.uiTokenAmount.uiAmountString || "0") 
              : 0;
            const vaultPostAmount = vaultPostBalance 
              ? parseFloat(vaultPostBalance.uiTokenAmount.uiAmountString || "0") 
              : 0;

            const walletChange = walletPostAmount - walletPreAmount;
            const vaultChange = vaultPostAmount - vaultPreAmount;

            // Check if this is a transfer between wallet and vault
            // Transfer from wallet to vault: wallet decreases, vault increases
            if (walletChange < -0.000001 && vaultChange > 0.000001 && Math.abs(walletChange + vaultChange) < 0.01) {
              allTransactions.push({
                signature: sigInfo.signature,
                timestamp: sigInfo.blockTime || Date.now() / 1000,
                type: "sent",
                amount: Math.abs(walletChange),
                from: walletAddress,
                to: vaultAddress,
                blockTime: sigInfo.blockTime ?? null,
              });
            }
            // Transfer from vault to wallet: vault decreases, wallet increases
            else if (vaultChange < -0.000001 && walletChange > 0.000001 && Math.abs(vaultChange + walletChange) < 0.01) {
              allTransactions.push({
                signature: sigInfo.signature,
                timestamp: sigInfo.blockTime || Date.now() / 1000,
                type: "received",
                amount: Math.abs(vaultChange),
                from: vaultAddress,
                to: walletAddress,
                blockTime: sigInfo.blockTime ?? null,
              });
            }
          } catch (error) {
            console.warn(`Failed to parse transaction ${sigInfo.signature}:`, error);
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch signatures for ${tokenAccountAddress}:`, error);
      }
    };

    // Process both accounts if they exist
    const promises = [];
    if (walletUSDCAddress) {
      promises.push(processSignatures(walletUSDCAddress));
    }
    if (vaultUSDCAddress) {
      promises.push(processSignatures(vaultUSDCAddress));
    }
    
    await Promise.all(promises);

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
      debug: {
        walletUSDCAddress,
        vaultUSDCAddress,
        hasWalletAccount: !!walletUSDCAddress,
        hasVaultAccount: !!vaultUSDCAddress,
      },
    });
  } catch (error: any) {
    console.error("Error fetching USDC transactions:", error);
    return NextResponse.json({ error: error?.message || "Unknown error" }, { status: 500 });
  }
}

