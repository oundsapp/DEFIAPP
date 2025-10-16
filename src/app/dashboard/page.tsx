"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth";
import { useSolanaWallets } from "@privy-io/react-auth/solana";
import { ArrowLeftIcon } from "@heroicons/react/16/solid";
import { DocumentDuplicateIcon, ArrowPathIcon } from "@heroicons/react/16/solid";
import { Header } from "@/components/ui/header";
import { PositionsSection } from "@/components/dashboard/positions-section";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { showSuccessToast, showErrorToast } from "@/components/ui/custom-toast";
import { createPublicClient, formatEther, http } from "viem";
import { mainnet } from "viem/chains";
import { Connection, PublicKey } from "@solana/web3.js";

export default function DashboardPage() {
  const { logout } = usePrivy();
  const router = useRouter();
  const { wallets } = useWallets();
  const { wallets: walletsSolana } = useSolanaWallets();
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState<string>("-");
  const [unit, setUnit] = useState<string>("");
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [liquidityPositions, setLiquidityPositions] = useState<any[]>([]);
  const [regularTokens, setRegularTokens] = useState<any[]>([]);
  const [isFetchingPositions, setIsFetchingPositions] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [solPrice, setSolPrice] = useState<number>(100);
  
  const primaryAddress = useMemo(() => {
    const sol = walletsSolana[0]?.address;
    if (sol) return sol;
    const evm = wallets.find((w) => (w as any).chainType === "ethereum")?.address as string | undefined;
    return evm || "";
  }, [wallets, walletsSolana]);

  const displayAddress = useMemo(() => {
    if (!primaryAddress) return "";
    // Truncate: 0x1234...abcd or base58 style
    const start = primaryAddress.slice(0, 6);
    const end = primaryAddress.slice(-4);
    return `${start}...${end}`;
  }, [primaryAddress]);

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

  const fetchPositions = useCallback(async () => {
    if (!primaryAddress) return;
    
    let isCancelled = false;
    setIsFetchingPositions(true);
    try {
      const res = await fetch(`/api/solana/positions?address=${encodeURIComponent(primaryAddress)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Positions API ${res.status}`);
      const data = await res.json();
      
      if (!isCancelled) {
        setLiquidityPositions(data.liquidityPositions || []);
        setRegularTokens(data.regularTokens || []);
        setDebugInfo(data.debug || null);
      }
    } catch (e) {
      console.error("Positions fetch error", e);
      if (!isCancelled) {
        setLiquidityPositions([]);
        setRegularTokens([]);
        setDebugInfo(null);
        showErrorToast("Failed to fetch positions");
      }
    } finally {
      if (!isCancelled) setIsFetchingPositions(false);
    }
    return () => {
      isCancelled = true;
    };
  }, [primaryAddress]);

  useEffect(() => {
    fetchBalance();
    fetchSolPrice();
  }, [fetchBalance, fetchSolPrice]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  async function handleCopy() {
    if (!primaryAddress) return;
    try {
      await navigator.clipboard.writeText(primaryAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      showSuccessToast("Address copied to clipboard");
    } catch {
      // no-op
      showErrorToast("Failed to copy address");
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
        rightContent={
          <button className="button" onClick={handleLogout}>
            <ArrowLeftIcon className="h-4 w-4" strokeWidth={2} /> Logout
          </button>
        }
      />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm text-gray-500">Total Portfolio</div>
              <div className="text-2xl font-bold text-gray-900">
                ${(() => {
                  // Collateral Value (placeholder)
                  const collateralValue = 0;
                  
                  // Calculate LP positions value
                  const lpValue = liquidityPositions.reduce((total, position) => {
                    if ((position as any).positionData?.totalValue) {
                      return total + (position as any).positionData.totalValue;
                    }
                    return total;
                  }, 0);
                  
                  // Calculate SOL value
                  const solValue = parseFloat(balance) * (solPrice || 0);
                  
                  // Calculate token values
                  const tokenValue = regularTokens.reduce((sum, token) => {
                    if (token.tokenInfo?.price) {
                      return sum + (token.uiAmount * token.tokenInfo.price);
                    }
                    return sum;
                  }, 0);
                  
                  // Total Borrowed
                  const totalBorrowed = 100;
                  
                  // Total Portfolio = (Collateral + LP + Wallet) - Borrowed
                  return (collateralValue + lpValue + solValue + tokenValue - totalBorrowed).toFixed(2);
                })()}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm text-gray-500">Collateral Value</div>
              <div className="text-2xl font-bold text-gray-900">$0.00</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm text-gray-500">LP Positions</div>
              <div className="text-2xl font-bold text-gray-900">
                ${liquidityPositions.reduce((total, position) => {
                  if ((position as any).positionData?.totalValue) {
                    return total + (position as any).positionData.totalValue;
                  }
                  return total;
                }, 0).toFixed(2)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm text-gray-500">Total Borrowed</div>
              <div className="text-2xl font-semibold text-gray-900">$100.00</div>
            </div>
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
            </div>
          </div>

          {/* Positions Section */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <PositionsSection
              liquidityPositions={liquidityPositions}
              isFetchingPositions={isFetchingPositions}
              debugInfo={debugInfo}
              onRefresh={fetchPositions}
            />
          </div>
        </div>
      </div>
    </div>
  );
}


