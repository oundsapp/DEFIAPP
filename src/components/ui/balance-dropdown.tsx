"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { DocumentDuplicateIcon } from "@heroicons/react/16/solid";

interface Token {
  mint: string;
  balance: number;
  decimals: number;
  uiAmount: number;
  accountAddress: string;
  tokenInfo?: {
    name?: string;
    symbol?: string;
    price?: number;
    image?: string;
  };
}

interface BalanceDropdownProps {
  balance: string;
  unit: string;
  isFetching: boolean;
  tokens: Token[];
  onRefresh: () => void;
  solPrice?: number;
  address?: string;
  onCopyAddress?: () => void;
}

export function BalanceDropdown({ 
  balance, 
  unit, 
  isFetching, 
  tokens, 
  onRefresh,
  solPrice = 100, // Default fallback price
  address,
  onCopyAddress
}: BalanceDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Calculate SOL value using the provided price
  const solValue = parseFloat(balance) * solPrice;
  
  const totalValue = tokens.reduce((sum, token) => {
    if (token.tokenInfo?.price) {
      return sum + (token.uiAmount * token.tokenInfo.price);
    }
    return sum;
  }, 0) + solValue;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isFetching}
      >
        <div className="text-right">
          <div className="font-medium">
            {isFetching ? "Loading..." : `${balance} ${unit}`}
          </div>
          {tokens.length > 0 && (
            <div className="text-xs text-gray-500">
              {totalValue > 0 ? `$${totalValue.toFixed(2)}` : `${tokens.length} tokens`}
            </div>
          )}
        </div>
        <ChevronDownIcon 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="text-2xl font-bold text-gray-900">
                ${totalValue.toFixed(2)}
              </div>
              <button
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                onClick={onRefresh}
              >
                Refresh
              </button>
            </div>
            {address && (
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-500 font-mono">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </div>
                {onCopyAddress && (
                  <button
                    aria-label="Copy address"
                    className="text-blue-600 hover:text-blue-800"
                    onClick={onCopyAddress}
                    title="Copy address"
                  >
                    <DocumentDuplicateIcon className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto">
            {/* SOL Balance */}
            <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                      <img 
                        src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" 
                        alt="SOL"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to gradient icon if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = '<div class="w-full h-full bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">S</div>';
                          }
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900">SOL</div>
                      <div className="text-xs text-gray-500">Solana</div>
                    </div>
                  </div>
                </div>
                <div className="text-right ml-3">
                  <div className="font-medium text-gray-900">{balance}</div>
                  <div className="text-xs text-gray-500">${solValue.toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* Token Holdings */}
            {tokens.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {tokens.map((token, index) => (
                  <div key={index} className="p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                            {token.tokenInfo?.image ? (
                              <img 
                                src={token.tokenInfo.image} 
                                alt={token.tokenInfo.symbol || 'Token'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback to letter icon if image fails to load
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `<div class="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">${token.tokenInfo?.symbol?.charAt(0) || 'T'}</div>`;
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                                {token.tokenInfo?.symbol?.charAt(0) || 'T'}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-gray-900 truncate">
                              {token.tokenInfo?.symbol || 'Token'}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {token.tokenInfo?.name || 'Unknown Token'}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right ml-3">
                        <div className="font-medium text-gray-900">
                          {token.uiAmount.toFixed(6)}
                        </div>
                        {token.tokenInfo?.price && (
                          <div className="text-xs text-gray-500">
                            ${(token.uiAmount * token.tokenInfo.price).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <div className="text-sm">No additional tokens found</div>
                <div className="text-xs mt-1">This wallet only has SOL balance</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
