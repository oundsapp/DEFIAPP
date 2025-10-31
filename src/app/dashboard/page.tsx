"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth";
import { useSolanaWallets } from "@privy-io/react-auth/solana";
import { ArrowLeftIcon } from "@heroicons/react/16/solid";
import { Header } from "@/components/ui/header";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { showSuccessToast, showErrorToast } from "@/components/ui/custom-toast";
import { createPublicClient, formatEther, http } from "viem";
import { mainnet } from "viem/chains";

export default function DashboardPage() {
  const { logout } = usePrivy();
  const router = useRouter();
  const { wallets } = useWallets();
  const { wallets: walletsSolana } = useSolanaWallets();
  const [balance, setBalance] = useState<string>("-");
  const [unit, setUnit] = useState<string>("");
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [regularTokens] = useState<any[]>([]);
  const [solPrice, setSolPrice] = useState<number>(100);
  const [usdcTransactions, setUsdcTransactions] = useState<any[]>([]);
  const [totalUsdcInVault, setTotalUsdcInVault] = useState<number>(0);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState<boolean>(false);
  
  const primaryAddress = useMemo(() => {
    const sol = walletsSolana[0]?.address;
    if (sol) return sol;
    const evm = wallets.find((w) => (w as any).chainType === "ethereum")?.address as string | undefined;
    return evm || "";
  }, [wallets, walletsSolana]);


  const fetchBalance = useCallback(async () => {
    let isCancelled = false;
    setIsFetching(true);
    try {
      // Prefer Solana if a Solana wallet is present
      const solAddr = walletsSolana[0]?.address;
      if (solAddr) {
        // Fetch via API route to avoid browser RPC restrictions
        const res = await fetch(`/api/solana/balance?address=${encodeURIComponent(solAddr)}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Solana API ${res.status}`);
        const data = (await res.json()) as { lamports?: number };
        const lamports = data?.lamports ?? 0;
        if (!isCancelled) {
          setBalance((lamports / 1_000_000_000).toFixed(4));
          setUnit("SOL");
        }
        return;
      }

      // Otherwise use first EVM-looking wallet (0x-prefixed)
      const evmAddr = (wallets.find((w) => typeof (w as any).address === "string" && (w as any).address.startsWith("0x"))?.address || undefined) as `0x${string}` | undefined;
      if (evmAddr) {
        const client = createPublicClient({ chain: mainnet, transport: http("https://cloudflare-eth.com") });
        const wei = await client.getBalance({ address: evmAddr });
        if (!isCancelled) {
          setBalance(Number(formatEther(wei)).toFixed(4));
          setUnit("ETH");
        }
        return;
      }

      // No wallet connected
      if (!isCancelled) {
        setBalance("-");
        setUnit("");
      }
    } catch (e) {
      console.error("Balance fetch error", e);
      if (!isCancelled) {
        setBalance("-");
        setUnit("");
        showErrorToast("Failed to fetch balance");
      }
    } finally {
      if (!isCancelled) setIsFetching(false);
    }
    return () => {
      isCancelled = true;
    };
  }, [wallets, walletsSolana]);


  const fetchSolPrice = useCallback(async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', {
        cache: "no-store",
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.solana?.usd) {
          setSolPrice(data.solana.usd);
        }
      }
    } catch (error) {
      console.warn("Failed to fetch SOL price:", error);
    }
  }, []);


  const fetchUsdcTransactions = useCallback(async () => {
    const solAddr = walletsSolana[0]?.address;
    if (!solAddr) {
      setUsdcTransactions([]);
      setTotalUsdcInVault(0);
      setIsLoadingTransactions(false);
      return;
    }

    const vaultAddress = process.env.NEXT_PUBLIC_VAULT_ADDRESS || "7wUdSwCTdNJ47Xdii9nBHcxrpZnRCBDpjZm2YWJ6NJAE";
    setIsLoadingTransactions(true);
    
    // Add timeout
    const timeoutId = setTimeout(() => {
      console.warn("USDC transactions fetch timeout");
      setIsLoadingTransactions(false);
    }, 20000); // 20 second timeout

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 18000); // Abort after 18 seconds

      const res = await fetch(
        `/api/solana/usdc-transactions?walletAddress=${encodeURIComponent(solAddr)}&vaultAddress=${encodeURIComponent(vaultAddress)}`,
        { 
          cache: "no-store",
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeout);
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(`USDC transactions API ${res.status}: ${errorData.error || "Unknown error"}`);
      }
      const data = await res.json();
      console.log("USDC transactions data:", data);
      setUsdcTransactions(data.transactions || []);
      setTotalUsdcInVault(data.totalSentToVault || 0);
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.warn("USDC transactions fetch aborted due to timeout");
        showErrorToast("Transaction fetch timed out. Please try again.");
      } else {
        console.error("USDC transactions fetch error", e);
        showErrorToast("Failed to fetch USDC transactions");
      }
      setUsdcTransactions([]);
      setTotalUsdcInVault(0);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [walletsSolana]);

  useEffect(() => {
    fetchBalance();
    fetchSolPrice();
    fetchUsdcTransactions();
  }, [fetchBalance, fetchSolPrice, fetchUsdcTransactions]);


  async function handleCopy() {
    if (!primaryAddress) return;
    try {
      await navigator.clipboard.writeText(primaryAddress);
      showSuccessToast("Address copied to clipboard");
    } catch {
      // no-op
      showErrorToast("Failed to copy address");
    }
  }

  async function handleCopyVaultAddress() {
    const vaultAddress = process.env.NEXT_PUBLIC_VAULT_ADDRESS || "7wUdSwCTdNJ47Xdii9nBHcxrpZnRCBDpjZm2YWJ6NJAE";
    try {
      await navigator.clipboard.writeText(vaultAddress);
      showSuccessToast("Vault address copied to clipboard");
    } catch {
      showErrorToast("Failed to copy vault address");
    }
  }
  
  async function handleLogout() {
    await logout();
    router.replace("/");
  }

  return (
    <div className="w-full h-[calc(100vh)] flex flex-col">
      <Header
        balance={balance}
        unit={unit}
        isFetching={isFetching}
        tokens={regularTokens}
        onRefreshBalance={fetchBalance}
        solPrice={solPrice}
        address={primaryAddress}
        onCopyAddress={handleCopy}
        vaultAddress={process.env.NEXT_PUBLIC_VAULT_ADDRESS || "7wUdSwCTdNJ47Xdii9nBHcxrpZnRCBDpjZm2YWJ6NJAE"}
        onCopyVaultAddress={handleCopyVaultAddress}
        rightContent={
          <button className="button" onClick={handleLogout}>
            <ArrowLeftIcon className="h-4 w-4" strokeWidth={2} /> Logout
          </button>
        }
      />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm text-gray-500">Wallet Balance</div>
              <div className="text-2xl font-semibold text-gray-900">
                ${(() => {
                  // Calculate SOL value
                  const solValue = parseFloat(balance) * (solPrice || 0);
                  
                  // Calculate token values
                  const tokenValue = regularTokens.reduce((sum, token) => {
                    if (token.tokenInfo?.price) {
                      return sum + (token.uiAmount * token.tokenInfo.price);
                    }
                    return sum;
                  }, 0);
                  
                  return (solValue + tokenValue).toFixed(2);
                })()}
              </div>
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="text-xs text-gray-500">USDC in Vault</div>
                <div className="text-lg font-semibold text-gray-900">
                  {isLoadingTransactions ? (
                    <span className="text-gray-400">Loading...</span>
                  ) : (
                    `${totalUsdcInVault.toFixed(2)} USDC`
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* USDC Transactions */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">USDC Transactions</h3>
              <p className="text-sm text-gray-500">Transactions between your wallet and vault</p>
            </div>
            <div className="divide-y divide-gray-200">
              {isLoadingTransactions ? (
                <div className="p-8 text-center text-gray-500">
                  Loading transactions...
                </div>
              ) : usdcTransactions.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="text-sm">No USDC transactions found</div>
                  <div className="text-xs mt-1">Transactions will appear here once you send USDC to or from the vault</div>
                </div>
              ) : (
                usdcTransactions.map((tx, index) => (
                  <a
                    key={tx.signature || index}
                    href={`https://solscan.io/tx/${tx.signature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          tx.type === "sent" ? "bg-red-500" : "bg-green-500"
                        }`} />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {tx.type === "sent" ? "Sent to Vault" : "Received from Vault"}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">
                            {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-semibold ${
                          tx.type === "sent" ? "text-red-600" : "text-green-600"
                        }`}>
                          {tx.type === "sent" ? "-" : "+"}{tx.amount.toFixed(2)} USDC
                        </div>
                        <div className="text-xs text-gray-500">
                          {tx.blockTime 
                            ? new Date(tx.blockTime * 1000).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Unknown date"}
                        </div>
                      </div>
                    </div>
                  </a>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}


