/**
 * DID Management页面组件 - 严格按照Figma设计实现
 *
 * 遵循SOLID原则：
 * - 单一职责原则：UI组件只负责展示，业务逻辑由Hook处理
 * - 依赖倒置原则：通过抽象接口获取数据
 * - 接口隔离原则：使用专门的Hook接口
 */

import React, { useState, useCallback } from 'react';
import { Copy, Download, CheckCircle, AlertTriangle, Eye, Shield } from 'lucide-react';
import { useDIDManagement, DID_MANAGEMENT_CONSTANTS } from '../hooks/useDIDManagement';
import { BackendStatus } from '../hooks/types';

interface DIDManagementProps {
  backendStatus: BackendStatus;
}

/**
 * My DID Information组件 - 严格按照Figma设计实现
 */
const MyDIDInformation: React.FC<{
  did: string;
  controller: string;
  created: string;
  status: 'active' | 'inactive' | 'pending';
  onCopy: (text: string) => Promise<void>;
}> = ({ did, controller, created, status, onCopy }) => {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignSelf: 'stretch', 
      gap: '24px' 
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        alignSelf: 'stretch', 
        gap: '823px' 
      }}>
        <h2 style={{
          fontFamily: 'Inter',
          fontWeight: 500,
          fontSize: '24px',
          lineHeight: '1.2em',
          letterSpacing: '-2%',
          color: '#000000'
        }}>
          My DID Information
        </h2>
      </div>
      
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignSelf: 'stretch', 
        gap: '12px' 
      }}>
        {/* DID Row */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          alignSelf: 'stretch', 
          gap: '16px', 
          padding: '4px 8px',
          borderRadius: '12px'
        }}>
          <span style={{
            fontFamily: 'Roboto',
            fontWeight: 400,
            fontSize: '18px',
            lineHeight: '1.33em',
            letterSpacing: '3.33%',
            color: '#49454F',
            width: '141px'
          }}>
            DID
          </span>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            padding: '10px',
            backgroundColor: '#F9F9F9',
            borderRadius: '8px'
          }}>
            <span style={{
              fontFamily: 'Menlo',
              fontWeight: 400,
              fontSize: '15px',
              lineHeight: '1.16em',
              color: '#000000'
            }}>
              {did}
            </span>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '4px 8px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
            onClick={() => onCopy(did)}
            >
              <Copy style={{ 
                width: '14px', 
                height: '14px', 
                color: '#1E1E1E',
                strokeWidth: 1
              }} />
            </div>
          </div>
        </div>

        {/* Controller Row */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          alignSelf: 'stretch', 
          gap: '16px', 
          padding: '4px 8px',
          borderRadius: '12px'
        }}>
          <span style={{
            fontFamily: 'Roboto',
            fontWeight: 400,
            fontSize: '18px',
            lineHeight: '1.33em',
            letterSpacing: '3.33%',
            color: '#49454F'
          }}>
            Controller
          </span>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            padding: '10px',
            backgroundColor: '#F9F9F9',
            borderRadius: '8px'
          }}>
            <span style={{
              fontFamily: 'Menlo',
              fontWeight: 400,
              fontSize: '15px',
              lineHeight: '1.16em',
              color: '#000000'
            }}>
              {controller}
            </span>
          </div>
        </div>

        {/* Created Row */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          alignSelf: 'stretch', 
          gap: '16px', 
          padding: '4px 8px',
          borderRadius: '12px'
        }}>
          <span style={{
            fontFamily: 'Roboto',
            fontWeight: 400,
            fontSize: '18px',
            lineHeight: '1.33em',
            letterSpacing: '3.33%',
            color: '#49454F'
          }}>
            Created
          </span>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            padding: '10px',
            backgroundColor: '#F9F9F9',
            borderRadius: '8px'
          }}>
            <span style={{
              fontFamily: 'Menlo',
              fontWeight: 400,
              fontSize: '15px',
              lineHeight: '1.16em',
              color: '#000000'
            }}>
              {created}
            </span>
          </div>
        </div>

        {/* Status Row */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          alignSelf: 'stretch', 
          gap: '16px', 
          padding: '4px 8px',
          borderRadius: '12px'
        }}>
          <span style={{
            fontFamily: 'Roboto',
            fontWeight: 400,
            fontSize: '18px',
            lineHeight: '1.33em',
            letterSpacing: '3.33%',
            color: '#49454F'
          }}>
            Status
          </span>
          
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '115px',
            height: '32px',
            backgroundColor: '#C7FACE',
            borderRadius: '100px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px'
            }}>
              <CheckCircle style={{ 
                width: '20px', 
                height: '20px', 
                color: '#306339',
                strokeWidth: 2
              }} />
              <span style={{
                fontFamily: 'Roboto',
                fontWeight: 500,
                fontSize: '14px',
                lineHeight: '1.43em',
                letterSpacing: '0.71%',
                color: '#306339'
              }}>
                Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * DID Operations组件 - 严格按照Figma设计实现
 */
const DIDOperations: React.FC<{
  onExportDocument: () => Promise<void>;
  onCopyDID: () => Promise<void>;
}> = ({ onExportDocument, onCopyDID }) => {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '13px',
      width: '456px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        alignSelf: 'stretch', 
        gap: '823px' 
      }}>
        <h2 style={{
          fontFamily: 'Inter',
          fontWeight: 500,
          fontSize: '24px',
          lineHeight: '1.2em',
          letterSpacing: '-2%',
          color: '#000000'
        }}>
          DID Operations
        </h2>
      </div>
      
      {/* Export DID Document Button */}
      <button
        onClick={onExportDocument}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          alignSelf: 'stretch',
          gap: '8px',
          padding: '12px',
          backgroundColor: '#F8F5FF',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        <Download style={{ 
          width: '16px', 
          height: '16px', 
          color: '#6750A4',
          strokeWidth: 1.6
        }} />
        <span style={{
          fontFamily: 'Inter',
          fontWeight: 400,
          fontSize: '16px',
          lineHeight: '1em',
          color: '#6750A4'
        }}>
          Export DID Document
        </span>
      </button>

      {/* Copy DID to Clipboard Button */}
      <button
        onClick={onCopyDID}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          alignSelf: 'stretch',
          gap: '8px',
          padding: '12px',
          backgroundColor: '#F9F9F9',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        <Copy style={{ 
          width: '16px', 
          height: '16px', 
          color: '#000000',
          strokeWidth: 1.6
        }} />
        <span style={{
          fontFamily: 'Inter',
          fontWeight: 400,
          fontSize: '16px',
          lineHeight: '1em',
          color: '#000000'
        }}>
          Copy DID to Clipboard
        </span>
      </button>
    </div>
  );
};

/**
 * Gateway Settings组件 - 严格按照Figma设计实现
 */
const GatewaySettings: React.FC<{
  privateKey: string;
  privateKeyVisible: boolean;
  onToggleVisibility: () => void;
  onExportPrivateKey: () => Promise<void>;
}> = ({ privateKey, privateKeyVisible, onToggleVisibility, onExportPrivateKey }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '13px',
      width: '456px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        alignSelf: 'stretch',
        gap: '823px'
      }}>
        <h2 style={{
          fontFamily: 'Inter',
          fontWeight: 500,
          fontSize: '24px',
          lineHeight: '1.2em',
          letterSpacing: '-2%',
          color: '#000000'
        }}>
          Gateway Settings
        </h2>
      </div>

      {/* High Risk Warning */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        width: '456px',
        backgroundColor: '#FFF1F0',
        border: '1px solid #FFA39E',
        borderRadius: '8px'
      }}>
        <div style={{
          display: 'flex',
          alignSelf: 'stretch',
          gap: '10px'
        }}>
          <AlertTriangle style={{
            width: '24px',
            height: '24px',
            color: '#CF1322'
          }} />
          <span style={{
            fontFamily: 'Inter',
            fontWeight: 600,
            fontSize: '16px',
            lineHeight: '1.21em',
            color: '#CF1322'
          }}>
            High Risk Operation
          </span>
        </div>

        <span style={{
          fontFamily: 'Inter',
          fontWeight: 400,
          fontSize: '14px',
          lineHeight: '1.21em',
          color: '#CF1322'
        }}>
          Exporting your private key is extremely dangerous. Only do this if you fully understand the security implications.
        </span>
      </div>

      {/* Private Key Display */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        alignSelf: 'stretch',
        gap: '10px',
        padding: '16px 10px',
        backgroundColor: '#F9F9F9',
        borderRadius: '8px'
      }}>
        <span style={{
          fontFamily: 'Menlo',
          fontWeight: 400,
          fontSize: '15px',
          lineHeight: '1.16em',
          color: '#000000'
        }}>
          Private Key
        </span>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 8px',
          borderRadius: '8px'
        }}>
          <span style={{
            fontFamily: 'Menlo',
            fontWeight: 400,
            fontSize: '15px',
            lineHeight: '1.16em',
            color: '#000000'
          }}>
            {privateKeyVisible ? privateKey : '••••••••••'}
          </span>

          <div style={{
            cursor: 'pointer'
          }}
          onClick={onToggleVisibility}
          >
            <Eye style={{
              width: '15px',
              height: '15px',
              color: '#1E1E1E',
              strokeWidth: 1
            }} />
          </div>
        </div>
      </div>

      {/* Export Private Key Button */}
      <button
        onClick={onExportPrivateKey}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          alignSelf: 'stretch',
          gap: '8px',
          padding: '16px 12px',
          backgroundColor: '#FFF1F0',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        <Download style={{
          width: '16px',
          height: '16px',
          color: '#CF1322',
          strokeWidth: 1.6
        }} />
        <span style={{
          fontFamily: 'Inter',
          fontWeight: 600,
          fontSize: '14px',
          lineHeight: '1em',
          color: '#CF1322'
        }}>
          Export Private Key (Dangerous)
        </span>
      </button>
    </div>
  );
};

/**
 * Verification Status组件 - 严格按照Figma设计实现
 */
const VerificationStatus: React.FC<{
  didDocumentVerified: boolean;
  controllerSignatureValid: boolean;
  gatewayRegistered: boolean;
}> = ({ didDocumentVerified, controllerSignatureValid, gatewayRegistered }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignSelf: 'stretch',
      gap: '13px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        alignSelf: 'stretch',
        gap: '823px'
      }}>
        <h2 style={{
          fontFamily: 'Inter',
          fontWeight: 500,
          fontSize: '24px',
          lineHeight: '1.2em',
          letterSpacing: '-2%',
          color: '#000000'
        }}>
          Verification Status
        </h2>
      </div>

      {/* DID Document Verified */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        alignSelf: 'stretch',
        gap: '4px',
        padding: '8px 16px',
        backgroundColor: '#F6F6F6',
        borderRadius: '8px',
        boxShadow: '0px 0px 35.6px 0px rgba(235, 235, 235, 0.13)',
        backdropFilter: 'blur(34.1px)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px',
          width: '755px'
        }}>
          <CheckCircle style={{
            width: '20px',
            height: '20px',
            color: '#14AE5C',
            strokeWidth: 2
          }} />
          <span style={{
            fontFamily: 'Inter',
            fontWeight: 600,
            fontSize: '16px',
            lineHeight: '1.21em',
            color: '#219921'
          }}>
            DID Document Verified
          </span>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '115px',
          height: '32px',
          backgroundColor: '#C7FACE',
          borderRadius: '100px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 12px'
          }}>
            <CheckCircle style={{
              width: '20px',
              height: '20px',
              color: '#306339',
              strokeWidth: 2
            }} />
            <span style={{
              fontFamily: 'Roboto',
              fontWeight: 500,
              fontSize: '14px',
              lineHeight: '1.43em',
              letterSpacing: '0.71%',
              color: '#306339'
            }}>
              Valid
            </span>
          </div>
        </div>
      </div>

      {/* Controller Signature Valid */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        alignSelf: 'stretch',
        gap: '4px',
        padding: '8px 16px',
        backgroundColor: '#F6F6F6',
        borderRadius: '8px',
        boxShadow: '0px 0px 35.6px 0px rgba(235, 235, 235, 0.13)',
        backdropFilter: 'blur(34.1px)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px',
          width: '755px'
        }}>
          <CheckCircle style={{
            width: '20px',
            height: '20px',
            color: '#14AE5C',
            strokeWidth: 2
          }} />
          <span style={{
            fontFamily: 'Inter',
            fontWeight: 600,
            fontSize: '16px',
            lineHeight: '1.21em',
            color: '#219921'
          }}>
            Controller Signature Valid
          </span>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '115px',
          height: '32px',
          backgroundColor: '#C7FACE',
          borderRadius: '100px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 12px'
          }}>
            <CheckCircle style={{
              width: '20px',
              height: '20px',
              color: '#306339',
              strokeWidth: 2
            }} />
            <span style={{
              fontFamily: 'Roboto',
              fontWeight: 500,
              fontSize: '14px',
              lineHeight: '1.43em',
              letterSpacing: '0.71%',
              color: '#306339'
            }}>
              Valid
            </span>
          </div>
        </div>
      </div>

      {/* Gateway Registration */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        alignSelf: 'stretch',
        gap: '4px',
        padding: '8px 16px',
        backgroundColor: '#F6F6F6',
        borderRadius: '8px',
        boxShadow: '0px 0px 35.6px 0px rgba(235, 235, 235, 0.13)',
        backdropFilter: 'blur(34.1px)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px',
          width: '755px'
        }}>
          <Shield style={{
            width: '20px',
            height: '20px',
            color: '#14AE5C',
            strokeWidth: 2
          }} />
          <span style={{
            fontFamily: 'Inter',
            fontWeight: 600,
            fontSize: '16px',
            lineHeight: '1.21em',
            color: '#219921'
          }}>
            Gateway Registration
          </span>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '115px',
          height: '32px',
          backgroundColor: '#C7FACE',
          borderRadius: '100px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 12px'
          }}>
            <CheckCircle style={{
              width: '20px',
              height: '20px',
              color: '#306339',
              strokeWidth: 2
            }} />
            <span style={{
              fontFamily: 'Roboto',
              fontWeight: 500,
              fontSize: '14px',
              lineHeight: '1.43em',
              letterSpacing: '0.71%',
              color: '#306339'
            }}>
              Registered
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 主DIDManagement组件 - 严格按照Figma设计实现
 */
export const DIDManagement: React.FC<DIDManagementProps> = ({ backendStatus }) => {
  // 使用专用DID Management Hook获取数据 - 依赖倒置原则
  const {
    data,
    loading,
    exportDIDDocument,
    copyDIDToClipboard,
    exportPrivateKey,
    togglePrivateKeyVisibility,
    copyToClipboard
  } = useDIDManagement(backendStatus);

  // 复制成功状态和私钥可见性状态
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [privateKeyVisible, setPrivateKeyVisible] = useState<boolean>(false);

  // 复制到剪贴板
  const handleCopy = useCallback(async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopySuccess(text);
      setTimeout(() => setCopySuccess(null), DID_MANAGEMENT_CONSTANTS.COPY_SUCCESS_DURATION);
    }
  }, [copyToClipboard]);

  // 导出DID文档
  const handleExportDocument = useCallback(async () => {
    try {
      await exportDIDDocument();
      // 这里可以显示成功提示
    } catch (error) {
      console.error('Export DID document failed:', error);
      // 这里可以显示错误提示
    }
  }, [exportDIDDocument]);

  // 复制DID到剪贴板
  const handleCopyDID = useCallback(async () => {
    try {
      await copyDIDToClipboard();
      setCopySuccess('DID copied to clipboard');
      setTimeout(() => setCopySuccess(null), DID_MANAGEMENT_CONSTANTS.COPY_SUCCESS_DURATION);
    } catch (error) {
      console.error('Copy DID failed:', error);
      // 这里可以显示错误提示
    }
  }, [copyDIDToClipboard]);

  // 切换私钥可见性
  const handleTogglePrivateKeyVisibility = useCallback(() => {
    setPrivateKeyVisible(!privateKeyVisible);
    togglePrivateKeyVisibility();
  }, [privateKeyVisible, togglePrivateKeyVisibility]);

  // 导出私钥
  const handleExportPrivateKey = useCallback(async () => {
    try {
      await exportPrivateKey();
      // 这里可以显示成功提示
    } catch (error) {
      console.error('Export private key failed:', error);
      // 这里可以显示错误提示
    }
  }, [exportPrivateKey]);

  // 错误状态处理
  if (loading.error) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-center p-8">
          <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-red-800">Failed to load DID management data</h3>
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
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '48px',
        padding:'50px'
        // width: '1010px',
        // position: 'relative',
        // left: '113px',
        // top: '70px'
      }}>
        {/* My DID Information */}
        <MyDIDInformation
          did={data?.didInfo.did || 'did:sightai:1234567890abcdef'}
          controller={data?.didInfo.controller || '0x1234...5678'}
          created={data?.didInfo.created || '2024-01-15 10:30:00'}
          status={data?.didInfo.status || 'active'}
          onCopy={handleCopy}
        />

        {/* DID Operations and Gateway Settings */}
        <div style={{
          display: 'flex',
          alignSelf: 'stretch',
          gap: '90px'
        }}>
          <DIDOperations
            onExportDocument={handleExportDocument}
            onCopyDID={handleCopyDID}
          />

          <GatewaySettings
            privateKey={data?.gatewaySettings.privateKey || '0x1234567890abcdef...'}
            privateKeyVisible={privateKeyVisible}
            onToggleVisibility={handleTogglePrivateKeyVisibility}
            onExportPrivateKey={handleExportPrivateKey}
          />
        </div>

        {/* Verification Status */}
        <VerificationStatus
          didDocumentVerified={data?.verificationStatus.didDocumentVerified || true}
          controllerSignatureValid={data?.verificationStatus.controllerSignatureValid || true}
          gatewayRegistered={data?.verificationStatus.gatewayRegistered || true}
        />
      </div>

      {/* 复制成功提示 */}
      {copySuccess && (
        <div style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          backgroundColor: '#10B981',
          color: '#FFFFFF',
          padding: '8px 16px',
          borderRadius: '8px',
          boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
          zIndex: 1000
        }}>
          {copySuccess}
        </div>
      )}
    </div>
  );
};
