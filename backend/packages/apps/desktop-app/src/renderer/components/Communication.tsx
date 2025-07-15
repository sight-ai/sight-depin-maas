/**
 * Communication页面组件 
 *
 * 遵循SOLID原则：
 * - 单一职责原则：UI组件只负责展示，业务逻辑由Hook处理
 * - 依赖倒置原则：通过抽象接口获取数据
 * - 接口隔离原则：使用专门的Hook接口
 */

import React, { useState, useCallback } from 'react';
import { Copy, MessageCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { useCommunication, COMMUNICATION_CONSTANTS } from '../hooks/useCommunication';
import { BackendStatus } from '../hooks/types';

interface CommunicationProps {
  backendStatus: BackendStatus;
}

/**
 * Service Control组件 
 */
const ServiceControl: React.FC<{
  libp2pService: boolean;
  availableToClaim: number;
  gatewayConnections: number;
  isLoading: boolean;
  onToggle: () => Promise<void>;
}> = ({ libp2pService, availableToClaim, gatewayConnections, isLoading, onToggle }) => {
  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header with title and switch */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-xl lg:text-2xl font-medium text-black">
          Service Control
        </h2>

        <div className="flex items-center gap-3">
          <span className="text-sm lg:text-base text-gray-600">
            LibP2P Service
          </span>

          {/* Custom Switch - exactly matching Figma */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'stretch',
              alignItems: 'stretch',
              padding: '2px 4px',
              width: '52px',
              height: '32px',
              backgroundColor: libp2pService ? '#6750A4' : '#E0E0E0',
              borderRadius: '100px',
              cursor: isLoading ? 'default' : 'pointer',
              transition: 'background-color 0.2s'
            }}
            onClick={() => !isLoading && onToggle()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '4px',
              position: 'relative',
              left: libp2pService ? '8px' : '-10px',
              transition: 'left 0.2s'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                padding: '8px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '11px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '24px',
                  width: '2px',
                  height: '2px'
                }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="responsive-grid">
        {/* Service Status Card */}
        <div className="responsive-card" style={{
          height: '103px',
          background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.04) 100%)',
          border: '1px solid',
          borderImage: 'linear-gradient(90deg, #AAAAAA 0%, #FFFFFF 5.29%, #FFFFFF 94.03%, #AAAAAA 100%) 1',
          borderRadius: '16px',
          boxShadow: '0px 0px 46.5px 0px rgba(242, 242, 242, 1)'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            width: '157px',
            position: 'relative',
            left: '79px',
            top: '21px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              alignSelf: 'stretch',
              gap: '16px',
              padding: '4px 8px',
              width: '141px'
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
                Service Status
              </span>
            </div>

            {/* Running Badge */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100px',
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
                  Running
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Available to claim Card */}
        <div className="responsive-card" style={{
          height: '103px',
          background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.04) 100%)',
          border: '1px solid',
          borderImage: 'linear-gradient(90deg, #AAAAAA 0%, #FFFFFF 5.29%, #FFFFFF 94.03%, #AAAAAA 100%) 1',
          borderRadius: '16px',
          boxShadow: '0px 0px 46.5px 0px rgba(242, 242, 242, 1)'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            width: '166px',
            position: 'relative',
            left: '75px',
            top: '21px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '4px 8px',
              width: '166px'
            }}>
              <span style={{
                fontFamily: 'Roboto',
                fontWeight: 400,
                fontSize: '18px',
                lineHeight: '1.33em',
                letterSpacing: '3.33%',
                color: '#49454F'
              }}>
                Available to claim
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              alignSelf: 'stretch',
              gap: '16px',
              padding: '4px 8px'
            }}>
              <span style={{
                fontFamily: 'Aldrich',
                fontWeight: 400,
                fontSize: '36px',
                lineHeight: '0.67em',
                letterSpacing: '1.67%',
                color: '#49454F',
                textAlign: 'center',
                width: '141px',
                height: '30px'
              }}>
                {availableToClaim}
              </span>
            </div>
          </div>
        </div>

        {/* Gateway Connections Card */}
        <div className="responsive-card" style={{
          height: '103px',
          background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.04) 100%)',
          border: '1px solid',
          borderImage: 'linear-gradient(90deg, #AAAAAA 0%, #FFFFFF 5.29%, #FFFFFF 94.03%, #AAAAAA 100%) 1',
          borderRadius: '16px',
          boxShadow: '0px 0px 46.5px 0px rgba(242, 242, 242, 1)'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            left: '57px',
            top: '17px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '4px 8px'
            }}>
              <span style={{
                fontFamily: 'Roboto',
                fontWeight: 400,
                fontSize: '18px',
                lineHeight: '1.33em',
                letterSpacing: '3.33%',
                color: '#49454F'
              }}>
                Gateway Connections
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              alignSelf: 'stretch',
              gap: '16px',
              padding: '4px 8px'
            }}>
              <span style={{
                fontFamily: 'Aldrich',
                fontWeight: 400,
                fontSize: '36px',
                lineHeight: '0.67em',
                letterSpacing: '1.67%',
                color: '#49454F',
                textAlign: 'center',
                width: '141px',
                height: '30px'
              }}>
                {gatewayConnections}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Peer Information和Device Registration组件 
 */
const PeerInformationAndDeviceRegistration: React.FC<{
  peerId: string;
  listeningAddress: string;
  testMessage: string;
  onCopy: (text: string) => Promise<void>;
  onSendMessage: (message: string) => Promise<void>;
  onTestMessageChange: (message: string) => void;
}> = ({ peerId, listeningAddress, testMessage, onCopy, onSendMessage, onTestMessageChange }) => {
  return (
    <div className="w-full space-y-6 lg:space-y-8">
      <div className="space-y-6 lg:space-y-12">
        {/* Peer Information Section */}
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
              Peer Information
            </h2>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: '519px'
          }}>
            {/* Peer ID Row */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-2 rounded-lg">
              <span className="text-sm lg:text-base text-gray-600 font-medium min-w-0 sm:w-32">
                Peer ID
              </span>

              <div className="flex justify-between items-center gap-2 p-2 lg:p-3 bg-gray-50 rounded-lg flex-1 sm:max-w-xs">
                <span className="text-xs lg:text-sm font-mono text-gray-900 truncate flex-1">
                  {peerId}
                </span>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
                  onClick={() => onCopy(peerId)}
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

            {/* Listening Address Row */}
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
                Listening Address
              </span>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px',
                padding: '10px',
                width: '300px',
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
                  {listeningAddress}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Device Registration Section */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignSelf: 'stretch',
          gap: '24px'
        }}>
          <h2 style={{
            fontFamily: 'Inter',
            fontWeight: 500,
            fontSize: '24px',
            lineHeight: '1.2em',
            letterSpacing: '-2%',
            color: '#000000',
            alignSelf: 'stretch'
          }}>
            Device Registration
          </h2>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignSelf: 'stretch',
            gap: '12px'
          }}>
            <div style={{
              display: 'flex',
              alignSelf: 'stretch',
              gap: '24px'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                flex: 1
              }}>
                <input
                  type="text"
                  value={testMessage}
                  onChange={(e) => onTestMessageChange(e.target.value)}
                  placeholder="Enter test message..."
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    alignSelf: 'stretch',
                    gap: '10px',
                    padding: '10px',
                    backgroundColor: '#F9F9F9',
                    border: '1px solid #D2D5DA',
                    borderRadius: '8px',
                    fontFamily: 'Inter',
                    fontWeight: 400,
                    fontSize: '15px',
                    lineHeight: '1.21em',
                    color: testMessage ? '#000000' : '#9EA4AF',
                    outline: 'none'
                  }}
                />
              </div>

              <button
                onClick={() => onSendMessage(testMessage)}
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  backgroundColor: '#2C2C2C',
                  border: '1px solid #2C2C2C',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                <MessageCircle style={{
                  width: '16px',
                  height: '16px',
                  color: '#F5F5F5',
                  strokeWidth: 1.6
                }} />
              </button>
            </div>

            <span style={{
              fontFamily: 'Inter',
              fontWeight: 400,
              fontSize: '15px',
              lineHeight: '1.21em',
              color: '#888888'
            }}>
              Send a test message to all connected peers
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Connected Peers组件 
 */
const ConnectedPeers: React.FC<{
  peers: Array<any>;
  isLoading: boolean;
}> = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      width: '100%',
      maxWidth: '600px'
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
          Connected Peers
        </h2>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '519px'
      }}>
        {/* Gateway Node */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '6px 7px',
          width: '519px',
          backgroundColor: '#FAFAFA',
          borderRadius: '12px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            alignSelf: 'stretch',
            gap: '16px',
            padding: '4px 8px',
            borderRadius: '12px'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <span style={{
                fontFamily: 'Roboto',
                fontWeight: 400,
                fontSize: '18px',
                lineHeight: '1.33em',
                letterSpacing: '3.33%',
                color: '#49454F'
              }}>
                Gateway Node
              </span>
              <span style={{
                fontFamily: 'Roboto',
                fontWeight: 400,
                fontSize: '14px',
                lineHeight: '1.71em',
                letterSpacing: '4.29%',
                color: '#49454F'
              }}>
                12D3KooWGateway...
              </span>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-end'
            }}>
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
                    Connected
                  </span>
                </div>
              </div>

              <span style={{
                fontFamily: 'Roboto',
                fontWeight: 400,
                fontSize: '14px',
                lineHeight: '1.71em',
                letterSpacing: '4.29%',
                color: '#49454F',
                textAlign: 'right',
                width: '100px'
              }}>
                15 ms
              </span>
            </div>
          </div>
        </div>

        {/* Peer Node */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '6px 7px',
          width: '519px',
          backgroundColor: '#FAFAFA',
          borderRadius: '12px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            alignSelf: 'stretch',
            gap: '16px',
            padding: '4px 8px',
            borderRadius: '12px'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <span style={{
                fontFamily: 'Roboto',
                fontWeight: 400,
                fontSize: '18px',
                lineHeight: '1.33em',
                letterSpacing: '3.33%',
                color: '#49454F'
              }}>
                Peer Node
              </span>
              <span style={{
                fontFamily: 'Roboto',
                fontWeight: 400,
                fontSize: '14px',
                lineHeight: '1.71em',
                letterSpacing: '4.29%',
                color: '#49454F'
              }}>
                12D3KooWGateway...
              </span>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-end'
            }}>
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
                    Connected
                  </span>
                </div>
              </div>

              <span style={{
                fontFamily: 'Roboto',
                fontWeight: 400,
                fontSize: '14px',
                lineHeight: '1.71em',
                letterSpacing: '4.29%',
                color: '#49454F',
                textAlign: 'right',
                width: '100px'
              }}>
                32 ms
              </span>
            </div>
          </div>
        </div>

        {/* Bootstrap Node */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '6px 7px',
          width: '519px',
          backgroundColor: '#FAFAFA',
          borderRadius: '12px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            alignSelf: 'stretch',
            gap: '16px',
            padding: '4px 8px',
            borderRadius: '12px'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <span style={{
                fontFamily: 'Roboto',
                fontWeight: 400,
                fontSize: '18px',
                lineHeight: '1.33em',
                letterSpacing: '3.33%',
                color: '#49454F'
              }}>
                Bootstrap Node
              </span>
              <span style={{
                fontFamily: 'Roboto',
                fontWeight: 400,
                fontSize: '14px',
                lineHeight: '1.71em',
                letterSpacing: '4.29%',
                color: '#49454F'
              }}>
                12D3KooWGateway...
              </span>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-end'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '115px',
                backgroundColor: '#FFF1B8',
                borderRadius: '100px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px'
                }}>
                  <AlertCircle style={{
                    width: '20px',
                    height: '20px',
                    color: '#88451D',
                    strokeWidth: 2
                  }} />
                  <span style={{
                    fontFamily: 'Roboto',
                    fontWeight: 500,
                    fontSize: '14px',
                    lineHeight: '1.43em',
                    letterSpacing: '0.71%',
                    color: '#88451D'
                  }}>
                    Unstable
                  </span>
                </div>
              </div>

              <span style={{
                fontFamily: 'Roboto',
                fontWeight: 400,
                fontSize: '14px',
                lineHeight: '1.71em',
                letterSpacing: '4.29%',
                color: '#49454F',
                textAlign: 'right',
                width: '100px'
              }}>
                156 ms
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Network Configuration组件 
 */
const NetworkConfiguration: React.FC<{
  port: string;
  maxConnections: string;
  enableDHT: boolean;
  enableRelay: boolean;
  isLoading: boolean;
  onToggle: (setting: 'enableDHT' | 'enableRelay', value: boolean) => Promise<void>;
}> = ({ port, maxConnections, enableDHT, enableRelay, isLoading, onToggle }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignSelf: 'stretch',
      gap: '24px'
    }}>
      <h2 style={{
        fontFamily: 'Inter',
        fontWeight: 500,
        fontSize: '24px',
        lineHeight: '1.2em',
        letterSpacing: '-2%',
        color: '#000000',
        alignSelf: 'stretch'
      }}>
        Network Configuration
      </h2>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        <div style={{
          display: 'flex',
          alignSelf: 'stretch',
          gap: '24px'
        }}>
          {/* Port */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignSelf: 'stretch',
            gap: '12px',
            flex: 1
          }}>
            <span style={{
              fontFamily: 'Inter',
              fontWeight: 400,
              fontSize: '15px',
              lineHeight: '1.21em',
              color: '#000000'
            }}>
              Port
            </span>

            <div style={{
              display: 'flex',
              alignSelf: 'stretch',
              gap: '24px'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                flex: 1
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  alignSelf: 'stretch',
                  gap: '10px',
                  padding: '10px',
                  backgroundColor: '#F9F9F9',
                  border: '1px solid #D2D5DA',
                  borderRadius: '8px'
                }}>
                  <span style={{
                    fontFamily: 'Inter',
                    fontWeight: 400,
                    fontSize: '15px',
                    lineHeight: '1.21em',
                    color: '#000000'
                  }}>
                    {port}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Max Connections */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignSelf: 'stretch',
            gap: '12px',
            flex: 1
          }}>
            <span style={{
              fontFamily: 'Inter',
              fontWeight: 400,
              fontSize: '15px',
              lineHeight: '1.21em',
              color: '#000000'
            }}>
              Max Connections
            </span>

            <div style={{
              display: 'flex',
              alignSelf: 'stretch',
              gap: '24px'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                flex: 1
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  alignSelf: 'stretch',
                  gap: '10px',
                  padding: '10px',
                  backgroundColor: '#F9F9F9',
                  border: '1px solid #D2D5DA',
                  borderRadius: '8px'
                }}>
                  <span style={{
                    fontFamily: 'Inter',
                    fontWeight: 400,
                    fontSize: '15px',
                    lineHeight: '1.21em',
                    color: '#000000'
                  }}>
                    {maxConnections}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          {/* Enable DHT */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              alignSelf: 'stretch',
              gap: '16px',
              padding: '4px 8px',
              borderRadius: '12px'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                height: '45px'
              }}>
                <span style={{
                  fontFamily: 'Roboto',
                  fontWeight: 400,
                  fontSize: '18px',
                  lineHeight: '1.33em',
                  letterSpacing: '3.33%',
                  color: '#1D1B20'
                }}>
                  Enable DHT
                </span>
                <span style={{
                  fontFamily: 'Roboto',
                  fontWeight: 400,
                  fontSize: '15px',
                  lineHeight: '1.6em',
                  letterSpacing: '4%',
                  color: '#878787'
                }}>
                  Distributed Hash Table for peer discovery
                </span>
              </div>

              {/* DHT Switch */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'stretch',
                  alignItems: 'stretch',
                  padding: '2px 4px',
                  width: '52px',
                  height: '32px',
                  backgroundColor: enableDHT ? '#6750A4' : '#E0E0E0',
                  borderRadius: '100px',
                  cursor: isLoading ? 'default' : 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onClick={() => !isLoading && onToggle('enableDHT', !enableDHT)}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '4px',
                  position: 'relative',
                  left: enableDHT ? '8px' : '-10px',
                  transition: 'left 0.2s'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: '11px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '24px',
                      width: '2px',
                      height: '2px'
                    }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enable Relay */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              alignSelf: 'stretch',
              gap: '16px',
              padding: '4px 8px',
              borderRadius: '12px'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                height: '45px'
              }}>
                <span style={{
                  fontFamily: 'Roboto',
                  fontWeight: 400,
                  fontSize: '18px',
                  lineHeight: '1.33em',
                  letterSpacing: '3.33%',
                  color: '#1D1B20'
                }}>
                  Enable Relay
                </span>
                <span style={{
                  fontFamily: 'Roboto',
                  fontWeight: 400,
                  fontSize: '15px',
                  lineHeight: '1.6em',
                  letterSpacing: '4%',
                  color: '#878787'
                }}>
                  Allow connections through relay nodes
                </span>
              </div>

              {/* Relay Switch */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'stretch',
                  alignItems: 'stretch',
                  padding: '2px 4px',
                  width: '52px',
                  height: '32px',
                  backgroundColor: enableRelay ? '#6750A4' : '#E0E0E0',
                  borderRadius: '100px',
                  cursor: isLoading ? 'default' : 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onClick={() => !isLoading && onToggle('enableRelay', !enableRelay)}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '4px',
                  position: 'relative',
                  left: enableRelay ? '8px' : '-10px',
                  transition: 'left 0.2s'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: '11px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '24px',
                      width: '2px',
                      height: '2px'
                    }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 主Communication组件 
 */
export const Communication: React.FC<CommunicationProps> = ({ backendStatus }) => {
  // 使用专用Communication Hook获取数据 - 依赖倒置原则
  const { data, loading, toggleLibP2PService, copyToClipboard, toggleNetworkSetting, sendTestMessage } = useCommunication(backendStatus);

  // 复制成功状态和测试消息状态
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string>('');

  // 复制到剪贴板
  const handleCopy = useCallback(async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopySuccess(text);
      setTimeout(() => setCopySuccess(null), COMMUNICATION_CONSTANTS.COPY_SUCCESS_DURATION);
    }
  }, [copyToClipboard]);

  // 切换LibP2P服务
  const handleToggleService = useCallback(async () => {
    try {
      await toggleLibP2PService();
      // 这里可以显示成功提示
    } catch (error) {
      console.error('Toggle service failed:', error);
      // 这里可以显示错误提示
    }
  }, [toggleLibP2PService]);

  // 发送测试消息
  const handleSendMessage = useCallback(async (message: string) => {
    try {
      await sendTestMessage(message);
      setTestMessage(''); // 清空输入框
      // 这里可以显示成功提示
    } catch (error) {
      console.error('Send message failed:', error);
      // 这里可以显示错误提示
    }
  }, [sendTestMessage]);

  // 切换网络设置
  const handleToggleNetworkSetting = useCallback(async (setting: 'enableDHT' | 'enableRelay', value: boolean) => {
    try {
      await toggleNetworkSetting(setting, value);
      // 这里可以显示成功提示
    } catch (error) {
      console.error('Toggle network setting failed:', error);
      // 这里可以显示错误提示
    }
  }, [toggleNetworkSetting]);

  // 错误状态处理
  if (loading.error) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-center p-8">
          <AlertCircle className="h-8 w-8 text-red-500 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-red-800">Failed to load communication data</h3>
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
      className="bg-white rounded-2xl shadow-lg w-full max-w-7xl mx-auto"
      style={{
        borderRadius: '16px',
        padding: '16px 12px',
        boxShadow: '0px 0px 42.4px 7px rgba(237, 237, 237, 1)',
        minHeight: 'auto'
      }}
    >
      <div className="responsive-container space-y-6 lg:space-y-12 py-4 lg:py-8" style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%'
      }}>
        {/* Service Control */}
        <ServiceControl
          libp2pService={data?.serviceStatus.libp2pService || true}
          availableToClaim={data?.serviceStatus.availableToClaim || 12}
          gatewayConnections={data?.serviceStatus.gatewayConnections || 3}
          isLoading={loading.isLoading}
          onToggle={handleToggleService}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Peer Information and Device Registration */}
          <PeerInformationAndDeviceRegistration
            peerId={data?.peerConnections?.[0]?.peerId || 'ABC123DEF456'}
            listeningAddress={data?.peerConnections?.[0]?.address || '/ip4/0.0.0.0/tcp/4001'}
            testMessage={testMessage}
            onCopy={handleCopy}
            onSendMessage={handleSendMessage}
            onTestMessageChange={setTestMessage}
          />

          {/* Connected Peers */}
          <ConnectedPeers peers={data?.peerConnections || []}
            isLoading={loading.isLoading}
          />
        </div>

        {/* Network Configuration */}
        {/* <NetworkConfiguration
          port={data?.networkConfig.port || '4001'}
          maxConnections={data?.networkConfig.maxConnections || '100'}
          enableDHT={data?.networkConfig.enableDHT || true}
          enableRelay={data?.networkConfig.enableRelay || true}
          isLoading={loading.isLoading}
          onToggle={handleToggleNetworkSetting}
        /> */}
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
          Copied to clipboard!
        </div>
      )}
    </div>
  );
};