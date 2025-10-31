import { ArrowRightIcon, ArrowUpRightIcon } from "@heroicons/react/16/solid";
import { DocumentDuplicateIcon } from "@heroicons/react/16/solid";
import { PrivyLogo } from "./privy-logo";
import { BalanceDropdown } from "./balance-dropdown";
import type { ReactNode } from "react";
import { useState } from "react";

interface HeaderProps {
  rightContent?: ReactNode;
  balance?: string;
  unit?: string;
  isFetching?: boolean;
  tokens?: any[];
  onRefreshBalance?: () => void;
  solPrice?: number;
  address?: string;
  onCopyAddress?: () => void;
  vaultAddress?: string;
  onCopyVaultAddress?: () => void;
}

export function Header({ 
  rightContent, 
  balance, 
  unit, 
  isFetching, 
  tokens, 
  onRefreshBalance,
  solPrice,
  address,
  onCopyAddress,
  vaultAddress,
  onCopyVaultAddress
}: HeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyVault = () => {
    if (onCopyVaultAddress) {
      onCopyVaultAddress();
    } else if (vaultAddress) {
      navigator.clipboard.writeText(vaultAddress).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }).catch(() => {
        // Handle error silently
      });
    }
  };

  return (
    <header className="h-[60px] flex flex-row justify-between items-center px-6 border-b bg-white border-[#E2E3F0]">
      <div className="flex flex-row items-center gap-2 h-[26px]">
        MYDEFI
        <PrivyLogo className="w-[103.48px] h-[23.24px] hidden" />

        <div className="text-medium flex h-[22px] items-center justify-center rounded-[11px] border border-primary px-[0.375rem] text-[0.75rem] text-primary">
          Beta
        </div>
      </div>

      <div className="flex flex-row justify-end items-center gap-4 h-9">
        {balance && unit && tokens && onRefreshBalance ? (
          <>
            {vaultAddress && (
              <div className="flex flex-row items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-md border border-gray-200">
                <span className="text-sm font-mono text-gray-700">
                  {vaultAddress.slice(0, 6)}...{vaultAddress.slice(-4)}
                </span>
                <button
                  onClick={handleCopyVault}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                  title="Copy vault address"
                  aria-label="Copy vault address"
                >
                  <DocumentDuplicateIcon className={`h-4 w-4 ${copied ? 'text-green-600' : ''}`} />
                </button>
              </div>
            )}
            <BalanceDropdown
              balance={balance}
              unit={unit}
              isFetching={isFetching || false}
              tokens={tokens}
              onRefresh={onRefreshBalance}
              solPrice={solPrice}
              address={address}
              onCopyAddress={onCopyAddress}
            />
            {rightContent}
          </>
        ) : rightContent ? (
          rightContent
        ) : (
          <>
            <a
              className="text-primary flex flex-row items-center gap-1 cursor-pointer"
              href="https://docs.privy.io/basics/react/installation"
              target="_blank"
              rel="noreferrer"
            >
              Docs <ArrowUpRightIcon className="h-4 w-4" strokeWidth={2} />
            </a>
          </>
        )}
      </div>
    </header>
  );
}
