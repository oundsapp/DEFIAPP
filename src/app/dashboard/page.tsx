"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth";
import { useSolanaWallets } from "@privy-io/react-auth/solana";
import { ArrowLeftIcon } from "@heroicons/react/16/solid";
import { DocumentDuplicateIcon, ArrowPathIcon } from "@heroicons/react/16/solid";
import { Header } from "@/components/ui/header";
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
  const [regularTokens, setRegularTokens] = useState<any[]>([]);
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


  useEffect(() => {
    fetchBalance();
    fetchSolPrice();
  }, [fetchBalance, fetchSolPrice]);


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
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}


