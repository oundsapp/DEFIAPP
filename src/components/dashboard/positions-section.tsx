"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { ArrowPathIcon } from "@heroicons/react/16/solid";

interface Position {
  mint: string;
  balance: number;
  decimals: number;
  uiAmount: number;
  accountAddress: string;
  isLiquidityPool?: boolean;
  isPancakeSwapLP?: boolean;
  positionData?: {
    token0?: string;
    token1?: string;
    token0Symbol?: string;
    token1Symbol?: string;
    liquidity?: string;
    tickLower?: number;
    tickUpper?: number;
    fee?: number;
    poolAddress?: string;
    wsolAmount?: number;
    usdcAmount?: number;
    wsolValue?: number;
    usdcValue?: number;
    totalValue?: number;
    priceRange?: {
      lower: number;
      upper: number;
      current: number;
    };
  };
}

interface PositionsSectionProps {
  liquidityPositions: Position[];
  isFetchingPositions: boolean;
  debugInfo: any;
  onRefresh: () => void;
}

export function PositionsSection({ 
  liquidityPositions, 
  isFetchingPositions, 
  debugInfo, 
  onRefresh 
}: PositionsSectionProps) {
  const [collapsedPositions, setCollapsedPositions] = useState<Set<number>>(new Set());

  const togglePositionCollapse = (index: number) => {
    setCollapsedPositions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Liquidity Pool Positions</h2>
        <button
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          onClick={onRefresh}
          disabled={isFetchingPositions}
        >
          <ArrowPathIcon className={`w-4 h-4 ${isFetchingPositions ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {isFetchingPositions ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading positions...</div>
        </div>
      ) : liquidityPositions.length > 0 ? (
        <div className="space-y-3">
          {liquidityPositions.map((position, index) => {
            const isCollapsed = collapsedPositions.has(index);
            const hasRealData = (position as any).isPancakeSwapLP && (position as any).positionData?.wsolAmount;
            
            // Check if position is in range
            const isInRange = hasRealData && (position as any).positionData?.priceRange && 
              (position as any).positionData.priceRange.current >= (position as any).positionData.priceRange.lower &&
              (position as any).positionData.priceRange.current <= (position as any).positionData.priceRange.upper;
            
            return (
              <div key={index} className={`border rounded-lg ${
                (position as any).isPancakeSwapLP 
                  ? isInRange 
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
                    : 'bg-white'
                  : 'bg-gradient-to-r from-blue-50 to-indigo-50'
              }`}>
                {/* Collapsible Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-black/5 transition-colors"
                  onClick={() => togglePositionCollapse(index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          {(position as any).isPancakeSwapLP && hasRealData && (
                            <div className="flex items-center gap-2 mb-1">
                              <div className="flex -space-x-1">
                                <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                                  <img 
                                    src={`https://img.raydium.io/icon/${(position as any).positionData.token0 || 'So11111111111111111111111111111111111111112'}.png`}
                                    alt={(position as any).positionData.token0Symbol || 'Token'}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const parent = target.parentElement;
                                      if (parent) {
                                        parent.innerHTML = `<div class="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold border border-white">${(position as any).positionData.token0Symbol?.charAt(0) || 'W'}</div>`;
                                      }
                                    }}
                                  />
                                </div>
                                <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                                  <img 
                                    src={`https://img.raydium.io/icon/${(position as any).positionData.token1 || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'}.png`}
                                    alt={(position as any).positionData.token1Symbol || 'Token'}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const parent = target.parentElement;
                                      if (parent) {
                                        parent.innerHTML = `<div class="w-full h-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-bold border border-white">${(position as any).positionData.token1Symbol?.charAt(0) || 'U'}</div>`;
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="text-lg font-semibold text-gray-900">
                                {(position as any).positionData.token0Symbol || 'WSOL'}/{(position as any).positionData.token1Symbol || 'USDC'}
                              </div>
                            </div>
                          )}
                            <div className="text-sm font-medium text-gray-600">
                              {(position as any).isPancakeSwapLP 
                                ? 'PancakeSwap V3 Position' 
                                : 'Liquidity Pool Token'}
                            </div>
                          {(position as any).isPancakeSwapLP && !hasRealData && (
                            <div className="text-xs text-gray-500 mt-1">
                              Liquidity Pool Position
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Claim Rewards Button */}
                    {(position as any).isPancakeSwapLP && hasRealData && (
                      <div className="ml-4">
                        <a
                          href={`https://pancakeswap.finance/liquidity/position/v3/solana/4QU2NpRaqmKMvPSwVKQDeW4V6JFEKJdkzbzdauumD9qN/${position.mint}?chain=sol&persistChain=1`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-pink-500 to-pink-600 rounded-md hover:from-pink-600 hover:to-pink-700 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          Claim Rewards
                        </a>
                      </div>
                    )}
                    
                    {/* Total Value Display */}
                    {hasRealData && (
                      <div className="text-right ml-6">
                        <div className="text-2xl font-bold text-green-700">
                          ${(position as any).positionData.totalValue?.toFixed(2) || 'N/A'}
                        </div>
                        <div className="text-xs text-green-600">Total Value</div>
                      </div>
                    )}
                    
                    {/* Collapse Icon */}
                    <div className="ml-4">
                      {isCollapsed ? (
                        <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Collapsible Content */}
                {!isCollapsed && (
                  <div className="px-4 pb-4">
                    {(position as any).isPancakeSwapLP && (position as any).positionData ? (
                      <div className="mt-3">
                        {/* Real position amounts if available */}
                        {(position as any).positionData.wsolAmount && (position as any).positionData.usdcAmount ? (
                          <div className="space-y-3">
                            {/* Token Holdings */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                                      <img 
                                        src={`https://img.raydium.io/icon/${(position as any).positionData.token0 || 'So11111111111111111111111111111111111111112'}.png`}
                                        alt={(position as any).positionData.token0Symbol || 'Token'}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                          const parent = target.parentElement;
                                          if (parent) {
                                            parent.innerHTML = '<div class="w-full h-full bg-blue-500 rounded-full"></div>';
                                          }
                                        }}
                                      />
                                    </div>
                                    <span className="text-sm font-semibold text-blue-600">{(position as any).positionData.token0Symbol}</span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xl font-bold text-blue-700">{(position as any).positionData.wsolAmount}</div>
                                    <div className="text-sm text-blue-500">${(position as any).positionData.wsolValue?.toFixed(2)}</div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                                      <img 
                                        src={`https://img.raydium.io/icon/${(position as any).positionData.token1 || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'}.png`}
                                        alt={(position as any).positionData.token1Symbol || 'Token'}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                          const parent = target.parentElement;
                                          if (parent) {
                                            parent.innerHTML = '<div class="w-full h-full bg-green-500 rounded-full"></div>';
                                          }
                                        }}
                                      />
                                    </div>
                                    <span className="text-sm font-semibold text-green-600">{(position as any).positionData.token1Symbol}</span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xl font-bold text-green-700">{(position as any).positionData.usdcAmount}</div>
                                    <div className="text-sm text-green-500">${(position as any).positionData.usdcValue?.toFixed(2)}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Price Range */}
                            {(position as any).positionData.priceRange && (
                              <div className={`relative rounded-lg p-4 overflow-hidden ${
                                isInRange 
                                  ? 'bg-gradient-to-r from-green-50 to-green-100 border border-green-200' 
                                  : 'bg-gradient-to-r from-red-50 to-red-100 border border-red-200'
                              }`}>
                                {/* Background Progress Bar */}
                                <div className="absolute inset-0 opacity-20">
                                  <div 
                                    className={`h-full ${isInRange ? 'bg-gradient-to-r from-green-400 to-green-500' : 'bg-gradient-to-r from-red-400 to-red-500'}`}
                                    style={{
                                      width: `${Math.min(100, Math.max(0, 
                                        ((position as any).positionData.priceRange.current - (position as any).positionData.priceRange.lower) / 
                                        ((position as any).positionData.priceRange.upper - (position as any).positionData.priceRange.lower) * 100
                                      ))}%`
                                    }}
                                  />
                                </div>
                                
                                {/* Content */}
                                <div className="relative z-10">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className={`text-sm font-semibold ${isInRange ? 'text-green-800' : 'text-red-800'}`}>
                                      Price Range
                                    </div>
                                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                      isInRange 
                                        ? 'bg-green-200 text-green-800' 
                                        : 'bg-red-200 text-red-800'
                                    }`}>
                                      {isInRange ? 'In Range' : 'Out of Range'}
                                    </span>
                                  </div>
                                  
                                  {/* Price Labels */}
                                  <div className="flex items-center justify-between text-sm">
                                    <div className={`${isInRange ? 'text-green-700' : 'text-red-700'}`}>
                                      ${(position as any).positionData.priceRange.lower}
                                    </div>
                                    <div className={`font-bold text-lg ${isInRange ? 'text-green-800' : 'text-red-800'}`}>
                                      ${(position as any).positionData.priceRange.current}
                                    </div>
                                    <div className={`${isInRange ? 'text-green-700' : 'text-red-700'}`}>
                                      ${(position as any).positionData.priceRange.upper}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-sm text-gray-600">Fee Tier</span>
                              <span className="font-semibold text-gray-900">{((position as any).positionData.fee / 10000).toFixed(2)}%</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-sm text-gray-600">Liquidity</span>
                              <span className="font-semibold text-gray-900">{((position as any).positionData.liquidity / 1000000).toFixed(2)}M</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                              <span className="text-sm text-gray-600">Tick Range</span>
                              <span className="font-semibold text-gray-900">{(position as any).positionData.tickLower} to {(position as any).positionData.tickUpper}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 font-mono">{position.mint.slice(0, 8)}...{position.mint.slice(-8)}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <div className="mb-2">No liquidity pool positions found</div>
          <div className="text-sm">This wallet may not have any LP tokens or PancakeSwap LP positions (NFTs).</div>
          {debugInfo && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg text-left text-xs">
              <div className="font-semibold mb-2">Debug Info:</div>
              <div>Total Token Accounts: {debugInfo.totalTokenAccounts}</div>
              <div>NFTs Found: {debugInfo.nftsFound}</div>
              <div>All NFTs Found: {debugInfo.allNFTsFound}</div>
              <div>PancakeSwap Positions: {debugInfo.pancakeSwapPositions}</div>
              <div>Tokens with Metadata: {debugInfo.tokensWithMetadata}</div>
              {debugInfo.sampleTokens && debugInfo.sampleTokens.length > 0 && (
                <div className="mt-2">
                  <div className="font-semibold">Sample Tokens:</div>
                  {debugInfo.sampleTokens.map((token: any, idx: number) => (
                    <div key={idx} className="ml-2">
                      {token.mint.slice(0, 8)}... - {token.symbol} ({token.name}) - Metadata: {token.hasMetadata ? 'Yes' : 'No'}
                    </div>
                  ))}
                </div>
              )}
              {debugInfo.directNFTCheck && (
                <div className="mt-2">
                  <div className="font-semibold">Direct NFT Check:</div>
                  <div className="ml-2 text-xs">
                    Found: {debugInfo.directNFTCheck.found ? 'Yes' : 'No'}
                    {debugInfo.directNFTCheck.found && (
                      <div>Mint: {debugInfo.directNFTCheck.mint.slice(0, 8)}... - Name: {debugInfo.directNFTCheck.name}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}