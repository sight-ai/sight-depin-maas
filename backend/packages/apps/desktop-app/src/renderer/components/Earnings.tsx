/**
 * Earnings页面组件 - 严格按照Figma设计实现
 *
 * 遵循SOLID原则：
 * - 单一职责原则：UI组件只负责展示，业务逻辑由Hook处理
 * - 依赖倒置原则：通过抽象接口获取数据
 * - 接口隔离原则：使用专门的Hook接口
 */

import React, { useState, useCallback } from 'react';
import { Button } from './ui/button';
import { AlertCircle } from 'lucide-react';
import { useEarnings, EARNINGS_CONSTANTS } from '../hooks/useEarnings';
import { BackendStatus } from '../hooks/types';

interface EarningsProps {
  backendStatus: BackendStatus;
}

/**
 * Current Balance组件 - 按照Figma设计实现
 */
const CurrentBalance: React.FC<{
  totalEarnings: number;
  availableToClaim: number;
  pending: number;
  isLoading: boolean;
}> = ({ totalEarnings, availableToClaim, pending, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-medium text-black">Current Balance</h2>
        <div className="grid grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-black" style={{
        fontFamily: 'Inter',
        fontSize: '24px',
        fontWeight: 500,
        lineHeight: '28.8px',
        letterSpacing: '-2%'
      }}>
        Current Balance
      </h2>

      <div className="flex justify-between gap-12" style={{ gap: '49px' }}>
        {/* Total Earnings */}
        <div
          className="rounded-2xl border"
          style={{
            background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.04) 100%)',
            borderImage: 'linear-gradient(90deg, #AAAAAA 0%, #FFFFFF 5.29%, #FFFFFF 94.03%, #AAAAAA 100%) 1',
            borderRadius: '16px',
            width: '315px',
            height: '103px',
            boxShadow: '0px 0px 46.5px 0px rgba(242, 242, 242, 1)'
          }}
        >
          <div className="flex flex-col justify-center items-center h-full">
            <span
              className="text-center"
              style={{
                fontFamily: 'Aldrich',
                fontSize: '36px',
                fontWeight: 400,
                lineHeight: '24px',
                letterSpacing: '1.67%',
                color: '#49454F',
                width: '141px',
                height: '30px'
              }}
            >
              $ 127.4
            </span>
            <span
              className="text-center mt-2"
              style={{
                fontFamily: 'Roboto',
                fontSize: '18px',
                fontWeight: 400,
                lineHeight: '24px',
                letterSpacing: '3.33%',
                color: '#49454F',
                width: '141px'
              }}
            >
              Total Earnings
            </span>
          </div>
        </div>

        {/* Available to Claim */}
        <div
          className="rounded-2xl border"
          style={{
            background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.04) 100%)',
            borderImage: 'linear-gradient(90deg, #AAAAAA 0%, #FFFFFF 5.29%, #FFFFFF 94.03%, #AAAAAA 100%) 1',
            borderRadius: '16px',
            width: '315px',
            height: '103px',
            boxShadow: '0px 0px 46.5px 0px rgba(242, 242, 242, 1)'
          }}
        >
          <div className="flex flex-col justify-center items-center h-full">
            <span
              className="text-center"
              style={{
                fontFamily: 'Aldrich',
                fontSize: '36px',
                fontWeight: 400,
                lineHeight: '24px',
                letterSpacing: '1.67%',
                color: '#49454F',
                width: '141px',
                height: '30px'
              }}
            >
              $ 89.2
            </span>
            <span
              className="text-center mt-2"
              style={{
                fontFamily: 'Roboto',
                fontSize: '18px',
                fontWeight: 400,
                lineHeight: '24px',
                letterSpacing: '3.33%',
                color: '#49454F'
              }}
            >
              Available to claim
            </span>
          </div>
        </div>

        {/* Pending */}
        <div
          className="rounded-2xl border"
          style={{
            background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.04) 100%)',
            borderImage: 'linear-gradient(90deg, #AAAAAA 0%, #FFFFFF 5.29%, #FFFFFF 94.03%, #AAAAAA 100%) 1',
            borderRadius: '16px',
            width: '315px',
            height: '103px',
            boxShadow: '0px 0px 46.5px 0px rgba(242, 242, 242, 1)'
          }}
        >
          <div className="flex flex-col justify-center items-center h-full">
            <span
              className="text-center"
              style={{
                fontFamily: 'Aldrich',
                fontSize: '36px',
                fontWeight: 400,
                lineHeight: '24px',
                letterSpacing: '1.67%',
                color: '#49454F',
                width: '141px',
                height: '30px'
              }}
            >
              $ 38.2
            </span>
            <span
              className="text-center mt-2"
              style={{
                fontFamily: 'Roboto',
                fontSize: '18px',
                fontWeight: 400,
                lineHeight: '24px',
                letterSpacing: '3.33%',
                color: '#49454F',
                width: '141px'
              }}
            >
              Pending
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Claim Earnings组件 - 按照Figma设计实现
 */
const ClaimEarnings: React.FC<{
  walletAddress: string;
  network: string;
  estimatedGasFee: string;
  availableToClaim: number;
  canClaim: boolean;
  isLoading: boolean;
  onClaim: () => Promise<void>;
  onCopy: (text: string) => Promise<void>;
}> = ({ walletAddress, network, estimatedGasFee, availableToClaim, canClaim, isLoading, onClaim, onCopy }) => {
  return (
    <div className="space-y-6" style={{ marginTop: '48px' }}>
      <div className="flex justify-between items-center" style={{ gap: '823px' }}>
        <h2 className="text-black" style={{
          fontFamily: 'Inter',
          fontSize: '22px',
          fontWeight: 500,
          lineHeight: '28.8px',
          letterSpacing: '-2%',
        }}>
          Claim Earnings
        </h2>

        <Button
          onClick={onClaim}
          disabled={isLoading || !canClaim || availableToClaim <= EARNINGS_CONSTANTS.MIN_CLAIM_AMOUNT}
          className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg"
          style={{
            backgroundColor: '#2C2C2C',
            borderColor: '#2C2C2C',
            borderWidth: '1px',
            borderRadius: '10px',
            padding: '12px',
            height: '36px'
          }}
        >
          <span style={{
            fontFamily: 'Inter',
            fontSize: '16px',
            fontWeight: 400,
            lineHeight: '16px',
            color: '#F5F5F5'
          }}>
            Claim $ 89.2
          </span>
        </Button>
      </div>

      <div className="space-y-3">
        {/* Total Earnings (Wallet Address) */}
        <div className="flex justify-between items-center gap-4 px-2 py-1" style={{
          borderRadius: '12px',
          padding: '4px 8px'
        }}>
          <span style={{
            fontFamily: 'Roboto',
            fontSize: '18px',
            fontWeight: 400,
            lineHeight: '24px',
            letterSpacing: '3.33%',
            color: '#49454F'
          }}>
            Total Earnings
          </span>
          <span style={{
            fontFamily: 'Roboto',
            fontSize: '18px',
            fontWeight: 400,
            lineHeight: '24px',
            letterSpacing: '3.33%',
            color: '#1D1B20',
            textAlign: 'right'
          }}>
            0x1234...5678
          </span>
        </div>

        {/* Network */}
        <div className="flex justify-between items-center gap-4 px-2 py-1" style={{
          borderRadius: '12px',
          padding: '4px 8px'
        }}>
          <span style={{
            fontFamily: 'Roboto',
            fontSize: '18px',
            fontWeight: 400,
            lineHeight: '24px',
            letterSpacing: '3.33%',
            color: '#49454F'
          }}>
            Network
          </span>
          <span style={{
            fontFamily: 'Roboto',
            fontSize: '18px',
            fontWeight: 400,
            lineHeight: '24px',
            letterSpacing: '3.33%',
            color: '#1D1B20',
            textAlign: 'right'
          }}>
            Ethereum Mainnet
          </span>
        </div>

        {/* Estimated Gas Fee */}
        <div className="flex justify-between items-center gap-4 px-2 py-1" style={{
          borderRadius: '12px',
          padding: '4px 8px'
        }}>
          <span style={{
            fontFamily: 'Roboto',
            fontSize: '18px',
            fontWeight: 400,
            lineHeight: '24px',
            letterSpacing: '3.33%',
            color: '#49454F'
          }}>
            Estimated Gas Fee
          </span>
          <span style={{
            fontFamily: 'Roboto',
            fontSize: '18px',
            fontWeight: 400,
            lineHeight: '24px',
            letterSpacing: '3.33%',
            color: '#1D1B20',
            textAlign: 'right'
          }}>
            Ethereum Mainnet
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Earnings History组件 - 按照Figma设计实现
 */
const EarningsHistory: React.FC<{
  history: Array<{
    id: string;
    date: string;
    taskType: string;
    model: string;
    duration: string;
    amount: number;
    status: 'paid' | 'pending' | 'failed';
  }>;
  isLoading: boolean;
}> = ({ history, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-6" style={{ marginTop: '48px' }}>
        <h2 className="text-2xl font-medium text-black">Earnings History</h2>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex space-x-4">
              <div className="h-4 bg-gray-200 rounded flex-1"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-2xl p-6"
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0px 0px 40px 0px rgba(236, 236, 236, 1)',
        marginTop: '48px'
      }}
    >
      <h2 className="text-black mb-4" style={{
        fontFamily: 'Inter',
        fontSize: '24px',
        fontWeight: 500,
        lineHeight: '28.8px',
        letterSpacing: '-2%'
      }}>
        Earnings History
      </h2>

      <div style={{ width: '1081px' }}>
        {/* 表格头部 */}
        <div
          className="flex justify-between items-center border-b"
          style={{
            backgroundColor: '#F8F8F8',
            borderBottomColor: 'rgba(0, 0, 0, 0.06)',
            borderBottomWidth: '1px',
            borderRadius: '12px 12px 0px 0px',
            padding: '0px 12px'
          }}
        >
          <div className="flex items-center" style={{ width: '1002px' }}>
            <div className="flex items-center gap-1 px-4 py-4" style={{
              width: '164px',
              height: '53px',
              padding: '16px'
            }}>
              <span style={{
                fontFamily: 'Roboto',
                fontSize: '14px',
                fontWeight: 500,
                lineHeight: '20px',
                letterSpacing: '1.79%',
                color: 'rgba(0, 0, 0, 0.85)'
              }}>
                Date
              </span>
            </div>

            <div className="flex justify-center px-4 py-4" style={{
              width: '222px',
              height: '53px',
              padding: '16px'
            }}>
              <span style={{
                fontFamily: 'Roboto',
                fontSize: '14px',
                fontWeight: 500,
                lineHeight: '20px',
                letterSpacing: '1.79%',
                color: 'rgba(0, 0, 0, 0.85)'
              }}>
                Task Type
              </span>
            </div>

            <div className="flex justify-center px-4 py-4" style={{
              width: '156px',
              height: '53px',
              padding: '16px'
            }}>
              <span style={{
                fontFamily: 'Roboto',
                fontSize: '14px',
                fontWeight: 500,
                lineHeight: '20px',
                letterSpacing: '1.79%',
                color: 'rgba(0, 0, 0, 0.85)'
              }}>
                Model
              </span>
            </div>

            <div className="flex justify-center px-4 py-4" style={{
              width: '154px',
              height: '53px',
              padding: '16px'
            }}>
              <span style={{
                fontFamily: 'Roboto',
                fontSize: '14px',
                fontWeight: 500,
                lineHeight: '20px',
                letterSpacing: '1.79%',
                color: 'rgba(0, 0, 0, 0.85)'
              }}>
                Duration
              </span>
            </div>

            <div className="flex items-center gap-2.5 px-4" style={{
              width: '113px',
              height: '53px',
              padding: '0px 16px'
            }}>
              <span style={{
                fontFamily: 'Roboto',
                fontSize: '14px',
                fontWeight: 500,
                lineHeight: '20px',
                letterSpacing: '1.79%',
                color: '#000000'
              }}>
                Amount
              </span>
            </div>

            <div className="flex items-center gap-2.5 px-6" style={{
              width: '143px',
              height: '53px',
              padding: '0px 24px'
            }}>
              <span style={{
                fontFamily: 'Roboto',
                fontSize: '14px',
                fontWeight: 500,
                lineHeight: '20px',
                letterSpacing: '1.79%',
                color: '#000000'
              }}>
                Status
              </span>
            </div>
          </div>
        </div>

        {/* 表格数据行 - 第一行 (Paid) */}
        <div
          className="flex justify-between items-center border-b"
          style={{
            borderBottomColor: 'rgba(0, 0, 0, 0.06)',
            borderBottomWidth: '1px',
            borderRadius: '12px 12px 0px 0px',
            padding: '0px 12px'
          }}
        >
          <div className="flex items-center" style={{ width: '1002px' }}>
            <div className="flex items-center gap-1 px-4 py-4" style={{
              width: '164px',
              height: '53px',
              padding: '16px'
            }}>
              <span style={{
                fontFamily: 'Roboto',
                fontSize: '14px',
                fontWeight: 400,
                lineHeight: '20px',
                letterSpacing: '1.79%',
                color: 'rgba(0, 0, 0, 0.85)'
              }}>
                2024-01-15
              </span>
            </div>

            <div className="flex justify-center px-4 py-4" style={{
              width: '222px',
              height: '53px',
              padding: '16px'
            }}>
              <span style={{
                fontFamily: 'Roboto',
                fontSize: '14px',
                fontWeight: 400,
                lineHeight: '20px',
                letterSpacing: '1.79%',
                color: 'rgba(0, 0, 0, 0.85)'
              }}>
                Text Generation
              </span>
            </div>

            <div className="flex justify-center px-4 py-4" style={{
              width: '156px',
              height: '53px',
              padding: '16px'
            }}>
              <span style={{
                fontFamily: 'Roboto',
                fontSize: '14px',
                fontWeight: 400,
                lineHeight: '20px',
                letterSpacing: '1.79%',
                color: 'rgba(0, 0, 0, 0.85)'
              }}>
                llama2-7b
              </span>
            </div>

            <div className="flex justify-center px-4 py-4" style={{
              width: '154px',
              height: '53px',
              padding: '16px'
            }}>
              <span style={{
                fontFamily: 'Roboto',
                fontSize: '14px',
                fontWeight: 400,
                lineHeight: '20px',
                letterSpacing: '1.79%',
                color: 'rgba(0, 0, 0, 0.85)'
              }}>
                2m 15s
              </span>
            </div>

            <div className="flex items-center gap-2.5 px-4" style={{
              width: '113px',
              height: '53px',
              padding: '0px 16px'
            }}>
              <span style={{
                fontFamily: 'Roboto',
                fontSize: '14px',
                fontWeight: 400,
                lineHeight: '20px',
                letterSpacing: '1.79%',
                color: '#000000'
              }}>
                $ 0.34
              </span>
            </div>

            <div className="flex items-center gap-2.5 px-4" style={{
              width: '143px',
              height: '53px',
              padding: '0px 16px'
            }}>
              <div
                className="flex justify-center items-center gap-1 px-3 py-1.5 rounded-full"
                style={{
                  backgroundColor: '#C7FACE',
                  borderRadius: '100px',
                  padding: '6px 12px',
                  width: '100px',
                  height: '38px'
                }}
              >
                <div className="w-5 h-5" style={{ width: '20px', height: '20px' }}>
                  {/* Check circle icon placeholder */}
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M16.67 5L7.5 14.17L3.33 10" stroke="#306339" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{
                  fontFamily: 'Roboto',
                  fontSize: '14px',
                  fontWeight: 500,
                  lineHeight: '20px',
                  letterSpacing: '0.71%',
                  color: '#306339'
                }}>
                  Paid
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 表格数据行 - 第二行 (Pending) */}
        <div
          className="flex justify-between items-center border-b"
          style={{
            borderBottomColor: 'rgba(0, 0, 0, 0.06)',
            borderBottomWidth: '1px',
            borderRadius: '12px 12px 0px 0px',
            padding: '0px 12px'
          }}
        >
          <div className="flex items-center" style={{ width: '1002px' }}>
            <div className="flex items-center gap-1 px-4 py-4" style={{
              width: '164px',
              height: '53px',
              padding: '16px'
            }}>
              <span style={{
                fontFamily: 'Roboto',
                fontSize: '14px',
                fontWeight: 400,
                lineHeight: '20px',
                letterSpacing: '1.79%',
                color: 'rgba(0, 0, 0, 0.85)'
              }}>
                2024-01-15
              </span>
            </div>

            <div className="flex justify-center px-4 py-4" style={{
              width: '222px',
              height: '53px',
              padding: '16px'
            }}>
              <span style={{
                fontFamily: 'Roboto',
                fontSize: '14px',
                fontWeight: 400,
                lineHeight: '20px',
                letterSpacing: '1.79%',
                color: 'rgba(0, 0, 0, 0.85)'
              }}>
                Text Generation
              </span>
            </div>

            <div className="flex justify-center px-4 py-4" style={{
              width: '156px',
              height: '53px',
              padding: '16px'
            }}>
              <span style={{
                fontFamily: 'Roboto',
                fontSize: '14px',
                fontWeight: 400,
                lineHeight: '20px',
                letterSpacing: '1.79%',
                color: 'rgba(0, 0, 0, 0.85)'
              }}>
                llama2-7b
              </span>
            </div>

            <div className="flex justify-center px-4 py-4" style={{
              width: '154px',
              height: '53px',
              padding: '16px'
            }}>
              <span style={{
                fontFamily: 'Roboto',
                fontSize: '14px',
                fontWeight: 400,
                lineHeight: '20px',
                letterSpacing: '1.79%',
                color: 'rgba(0, 0, 0, 0.85)'
              }}>
                2m 15s
              </span>
            </div>

            <div className="flex items-center gap-2.5 px-4" style={{
              width: '113px',
              height: '53px',
              padding: '0px 16px'
            }}>
              <span style={{
                fontFamily: 'Roboto',
                fontSize: '14px',
                fontWeight: 400,
                lineHeight: '20px',
                letterSpacing: '1.79%',
                color: '#000000'
              }}>
                $ 0.34
              </span>
            </div>

            <div className="flex items-center gap-2.5 px-4" style={{
              width: '143px',
              height: '53px',
              padding: '0px 16px'
            }}>
              <div
                className="flex justify-center items-center gap-1 px-3 py-1.5 rounded-full"
                style={{
                  backgroundColor: '#FFF1B8',
                  borderRadius: '100px',
                  padding: '6px 12px',
                  height: '38px'
                }}
              >
                <div className="w-5 h-5" style={{ width: '20px', height: '20px' }}>
                  {/* Clock icon placeholder */}
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8.33" stroke="#88451D" strokeWidth="2"/>
                    <path d="M10 5.83V10l2.5 2.5" stroke="#88451D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{
                  fontFamily: 'Roboto',
                  fontSize: '14px',
                  fontWeight: 500,
                  lineHeight: '20px',
                  letterSpacing: '0.71%',
                  color: '#88451D'
                }}>
                  Pending
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 主Earnings组件 - 遵循依赖倒置原则
 */
export const Earnings: React.FC<EarningsProps> = ({ backendStatus }) => {
  // 使用专用Earnings Hook获取数据 - 依赖倒置原则
  const { data, loading, claimEarnings, copyToClipboard } = useEarnings(backendStatus);

  // 复制成功状态
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // 复制到剪贴板
  const handleCopy = useCallback(async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopySuccess(text);
      setTimeout(() => setCopySuccess(null), EARNINGS_CONSTANTS.COPY_SUCCESS_DURATION);
    }
  }, [copyToClipboard]);

  // 提取收益
  const handleClaim = useCallback(async () => {
    try {
      await claimEarnings();
      // 这里可以显示成功提示
    } catch (error) {
      console.error('Claim failed:', error);
      // 这里可以显示错误提示
    }
  }, [claimEarnings]);

  // 错误状态处理
  if (loading.error) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-center p-8">
          <AlertCircle className="h-8 w-8 text-red-500 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-red-800">Failed to load earnings data</h3>
            <p className="text-sm text-red-600 mt-1">{loading.error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-2xl shadow-lg relative m-3"
      style={{
        width: '1225px',
        height: '1050px',
        borderRadius: '16px',
        padding: '27px 26px',
        boxShadow: '0px 0px 42.4px 7px rgba(237, 237, 237, 1)'
      }}
    >
      <div
        className="flex flex-col items-center gap-12 p-14"
        style={{
          padding: '51px 54px',
          gap: '48px',
          width: '1129px'
        }}
      >
        {/* Current Balance */}
        <div style={{ width: '1107px' }}>
          <CurrentBalance
            totalEarnings={127.4}
            availableToClaim={89.2}
            pending={38.2}
            isLoading={loading.isLoading}
          />
        </div>
 
        {/* Claim Earnings */}
        <div style={{ width: '1107px' }}>
          <ClaimEarnings
            walletAddress="0x1234...5678"
            network="Ethereum Mainnet"
            estimatedGasFee="Ethereum Mainnet"
            availableToClaim={89.2}
            canClaim={true}
            isLoading={loading.isLoading}
            onClaim={handleClaim}
            onCopy={handleCopy}
          />
        </div>

        {/* Earnings History */}
        <EarningsHistory
          history={[]}
          isLoading={loading.isLoading}
        />
      </div>

      {/* 复制成功提示 */}
      {copySuccess && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg">
          Copied to clipboard!
        </div>
      )}
    </div>
  );
};
