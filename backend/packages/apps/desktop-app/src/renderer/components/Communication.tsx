/**
 * Communication 页面组件
 * 
 * 根据 Figma 设计实现的通信管理页面
 * 包含服务控制、状态监控、节点信息和网络配置功能
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Copy, Check, CheckCircle, AlertCircle, MessageCircle } from 'lucide-react';
import { Card } from './ui/card';

interface ServiceStatus {
  libp2pService: boolean;
  serviceStatus: 'running' | 'stopped';
  availableToClaim: number;
  gatewayConnections: number;
}

interface PeerInfo {
  peerId: string;
  listeningAddress: string;
}

interface ConnectedPeer {
  id: string;
  type: 'Gateway Node' | 'Peer Node' | 'Bootstrap Node';
  peerId: string;
  status: 'connected' | 'unstable';
  latency: string;
}

interface NetworkConfig {
  port: string;
  maxConnections: string;
  enableDHT: boolean;
  enableRelay: boolean;
}

interface CommunicationProps {
  backendStatus?: {
    isRunning: boolean;
    port: number;
  };
}

export const Communication: React.FC<CommunicationProps> = ({ backendStatus }) => {
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>({
    libp2pService: true,
    serviceStatus: 'running',
    availableToClaim: 12,
    gatewayConnections: 3
  });

  const [peerInfo, setPeerInfo] = useState<PeerInfo>({
    peerId: 'ABC123DEF456',
    listeningAddress: '/ip4/0.0.0.0/tcp/4001'
  });

  const [connectedPeers, setConnectedPeers] = useState<ConnectedPeer[]>([
    {
      id: '1',
      type: 'Gateway Node',
      peerId: '12D3KooWGateway...',
      status: 'connected',
      latency: '15 ms'
    },
    {
      id: '2',
      type: 'Peer Node',
      peerId: '12D3KooWGateway...',
      status: 'connected',
      latency: '32 ms'
    },
    {
      id: '3',
      type: 'Bootstrap Node',
      peerId: '12D3KooWGateway...',
      status: 'unstable',
      latency: '156 ms'
    }
  ]);

  const [networkConfig, setNetworkConfig] = useState<NetworkConfig>({
    port: '4001',
    maxConnections: '100',
    enableDHT: true,
    enableRelay: true
  });

  const [testMessage, setTestMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedPeerId, setCopiedPeerId] = useState(false);

  // 获取服务状态
  const fetchServiceStatus = useCallback(async () => {
    if (!backendStatus?.isRunning) return;

    setError(null);
    try {
      const response = await fetch(`http://localhost:${backendStatus.port}/api/v1/communication/status`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setServiceStatus(result.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch service status:', error);
      setError('Failed to load service status. Please check your connection.');
    }
  }, [backendStatus]);

  // 获取节点信息
  const fetchPeerInfo = useCallback(async () => {
    if (!backendStatus?.isRunning) return;

    try {
      const response = await fetch(`http://localhost:${backendStatus.port}/api/v1/communication/peer-info`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setPeerInfo(result.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch peer info:', error);
    }
  }, [backendStatus]);

  // 获取已连接节点
  const fetchConnectedPeers = useCallback(async () => {
    if (!backendStatus?.isRunning) return;

    try {
      const response = await fetch(`http://localhost:${backendStatus.port}/api/v1/communication/peers`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setConnectedPeers(result.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch connected peers:', error);
    }
  }, [backendStatus]);

  // 获取网络配置
  const fetchNetworkConfig = useCallback(async () => {
    if (!backendStatus?.isRunning) return;

    try {
      const response = await fetch(`http://localhost:${backendStatus.port}/api/v1/communication/network-config`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setNetworkConfig(result.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch network config:', error);
    }
  }, [backendStatus]);

  // 切换 LibP2P 服务
  const toggleLibP2PService = useCallback(async (enabled: boolean) => {
    if (!backendStatus?.isRunning) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:${backendStatus.port}/api/v1/communication/service`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setServiceStatus(prev => ({
            ...prev,
            libp2pService: enabled,
            serviceStatus: enabled ? 'running' : 'stopped'
          }));
        } else {
          throw new Error(result.error || 'Failed to toggle service');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to toggle LibP2P service:', error);
      setError('Failed to toggle service. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [backendStatus]);

  // 发送测试消息
  const sendTestMessage = useCallback(async () => {
    if (!backendStatus?.isRunning || !testMessage.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:${backendStatus.port}/api/v1/communication/test-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: testMessage })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setTestMessage('');
          console.log('Test message sent successfully');
        } else {
          throw new Error(result.error || 'Failed to send test message');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send test message:', error);
      setError('Failed to send test message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [backendStatus, testMessage]);

  // 复制节点 ID
  const copyPeerId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(peerInfo.peerId);
      setCopiedPeerId(true);
      setTimeout(() => setCopiedPeerId(false), 2000);
    } catch (error) {
      console.error('Failed to copy peer ID:', error);
    }
  }, [peerInfo.peerId]);

  // 更新网络配置
  const updateNetworkConfig = useCallback(async (key: keyof NetworkConfig, value: string | boolean) => {
    if (!backendStatus?.isRunning) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:${backendStatus.port}/api/v1/communication/network-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [key]: value })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setNetworkConfig(prev => ({
            ...prev,
            [key]: value
          }));
        } else {
          throw new Error(result.error || 'Failed to update network config');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to update network config:', error);
      setError('Failed to update network configuration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [backendStatus]);

  useEffect(() => {
    fetchServiceStatus();
    fetchPeerInfo();
    fetchConnectedPeers();
    fetchNetworkConfig();
    
    // 定期刷新状态（每30秒）
    const interval = setInterval(() => {
      fetchServiceStatus();
      fetchConnectedPeers();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchServiceStatus, fetchPeerInfo, fetchConnectedPeers, fetchNetworkConfig]);

  return (
    <div className="min-h-screen bg-white">
              <Card className="bg-white rounded-2xl p-6 shadow-lg">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800 text-sm">{error}</div>
          </div>
        )}

        {/* Service Control Section */}
        <div className="space-y-[17px]">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-medium text-black" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '24px', lineHeight: '1.2em', letterSpacing: '-2%' }}>
              Service Control
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-lg text-[#49454F]" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400, fontSize: '18px', lineHeight: '1.33em', letterSpacing: '3.33%' }}>
                LibP2P Service
              </span>
              <Switch
                checked={serviceStatus.libp2pService}
                onCheckedChange={toggleLibP2PService}
                disabled={isLoading}
                className="data-[state=checked]:bg-[#6750A4] data-[state=unchecked]:bg-gray-200 w-[52px] h-[32px]"
              />
            </div>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Service Status */}
            <div className="h-[103px] rounded-2xl border border-gray-200/50" style={{
              background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.04) 100%)',
              boxShadow: '0px 0px 46.5px 0px rgba(242, 242, 242, 1)'
            }}>
              <div className="flex flex-col justify-center items-center h-full">
                <div className="text-lg font-medium text-[#49454F] mb-3" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400, fontSize: '18px', lineHeight: '1.33em', letterSpacing: '3.33%' }}>
                  Service Status
                </div>
                <Badge className={`${serviceStatus.serviceStatus === 'running' ? 'bg-[#C7FACE] text-[#306339]' : 'bg-red-100 text-red-800'} hover:bg-[#C7FACE] flex items-center gap-2 px-3 py-1.5 rounded-full w-[100px] h-[32px] justify-center`}>
                  <CheckCircle size={20} />
                  <span className="font-medium" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500, fontSize: '14px', lineHeight: '1.43em', letterSpacing: '0.71%' }}>
                    {serviceStatus.serviceStatus === 'running' ? 'Running' : 'Stopped'}
                  </span>
                </Badge>
              </div>
            </div>

            {/* Available to Claim */}
            <div className="h-[103px] rounded-2xl border border-gray-200/50" style={{
              background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.04) 100%)',
              boxShadow: '0px 0px 46.5px 0px rgba(242, 242, 242, 1)'
            }}>
              <div className="flex flex-col justify-center items-center h-full">
                <div className="text-lg font-medium text-[#49454F] mb-2" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400, fontSize: '18px', lineHeight: '1.33em', letterSpacing: '3.33%' }}>
                  Available to claim
                </div>
                <div className="text-4xl font-normal text-[#49454F] w-[141px] h-[30px] flex items-center justify-center" style={{ fontFamily: 'Aldrich, monospace', fontWeight: 400, fontSize: '36px', lineHeight: '0.67em', letterSpacing: '1.67%' }}>
                  {serviceStatus.availableToClaim}
                </div>
              </div>
            </div>

            {/* Gateway Connections */}
            <div className="h-[103px] rounded-2xl border border-gray-200/50" style={{
              background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.04) 100%)',
              boxShadow: '0px 0px 46.5px 0px rgba(242, 242, 242, 1)'
            }}>
              <div className="flex flex-col justify-center items-center h-full">
                <div className="text-lg font-medium text-[#49454F] mb-2" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400, fontSize: '18px', lineHeight: '1.33em', letterSpacing: '3.33%' }}>
                  Gateway Connections
                </div>
                <div className="text-4xl font-normal text-[#49454F] w-[141px] h-[30px] flex items-center justify-center" style={{ fontFamily: 'Aldrich, monospace', fontWeight: 400, fontSize: '36px', lineHeight: '0.67em', letterSpacing: '1.67%' }}>
                  {serviceStatus.gatewayConnections}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

          {/* Left Column */}
          <div className="space-y-12">

            {/* Peer Information Section */}
            <div className="space-y-6">
              <h2 className="text-2xl font-medium text-black" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '24px', lineHeight: '1.2em', letterSpacing: '-2%' }}>
                Peer Information
              </h2>

              <div className="space-y-3">
                {/* Peer ID */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 rounded-xl gap-4">
                  <div className="flex-shrink-0">
                    <div className="text-lg text-[#49454F]" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400, fontSize: '18px', lineHeight: '1.33em', letterSpacing: '3.33%' }}>
                      Peer ID
                    </div>
                  </div>
                  <div className="flex-1 max-w-xs bg-[#F9F9F9] rounded-lg px-2.5 py-2.5 flex items-center justify-between">
                    <div className="text-sm text-black" style={{ fontFamily: 'Menlo, monospace', fontWeight: 400, fontSize: '15px', lineHeight: '1.16em' }}>
                      {peerInfo.peerId}
                    </div>
                    <div className="p-2 rounded-lg hover:bg-gray-200 cursor-pointer" onClick={copyPeerId}>
                      {copiedPeerId ? (
                        <Check size={14} className="text-green-600" />
                      ) : (
                        <Copy size={14} className="text-[#1E1E1E]" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Listening Address */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 rounded-xl gap-4">
                  <div className="flex-shrink-0">
                    <div className="text-lg text-[#49454F]" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400, fontSize: '18px', lineHeight: '1.33em', letterSpacing: '3.33%' }}>
                      Listening Address
                    </div>
                  </div>
                  <div className="flex-1 max-w-xs bg-[#F9F9F9] rounded-lg px-2.5 py-2.5">
                    <div className="text-sm text-black" style={{ fontFamily: 'Menlo, monospace', fontWeight: 400, fontSize: '15px', lineHeight: '1.16em' }}>
                      {peerInfo.listeningAddress}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Device Registration Section */}
            <div className="space-y-6">
              <h2 className="text-2xl font-medium text-black" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '24px', lineHeight: '1.2em', letterSpacing: '-2%' }}>
                Device Registration
              </h2>

              <div className="space-y-3">
                <div className="flex gap-6">
                  <div className="flex-1">
                    <Input
                      placeholder="Enter test message..."
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      className="w-full bg-[#F9F9F9] border-[#D2D5DA] text-[#9EA4AF] px-2.5 py-2.5 rounded-lg"
                      style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '15px', lineHeight: '1.21em' }}
                    />
                  </div>
                  <Button
                    onClick={sendTestMessage}
                    disabled={isLoading || !testMessage.trim()}
                    className="bg-[#2C2C2C] hover:bg-gray-700 text-white px-3 py-3 rounded-lg flex items-center justify-center border border-[#2C2C2C]"
                  >
                    <MessageCircle size={16} className="text-[#F5F5F5]" />
                  </Button>
                </div>
                <div className="text-sm text-[#888888]" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '15px', lineHeight: '1.21em' }}>
                  Send a test message to all connected peers
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">

            {/* Connected Peers Section */}
            <div className="space-y-6">
              <h2 className="text-2xl font-medium text-black" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '24px', lineHeight: '1.2em', letterSpacing: '-2%' }}>
                Connected Peers
              </h2>

              <div className="bg-[#FAFAFA] rounded-xl p-3 space-y-3">
                {connectedPeers.map((peer) => (
                  <div key={peer.id} className="bg-white rounded-xl p-2 flex justify-between items-center">
                    <div className="space-y-1">
                      <div className="text-lg text-[#49454F]" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400, fontSize: '18px', lineHeight: '1.33em', letterSpacing: '3.33%' }}>
                        {peer.type}
                      </div>
                      <div className="text-sm text-[#49454F]" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400, fontSize: '14px', lineHeight: '1.71em', letterSpacing: '4.29%' }}>
                        {peer.peerId}
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-center gap-2">
                      <Badge className={`${
                        peer.status === 'connected'
                          ? 'bg-[#C7FACE] text-[#306339]'
                          : 'bg-[#FFF1B8] text-[#88451D]'
                      } hover:bg-[#C7FACE] flex items-center gap-2 px-3 py-1.5 rounded-full w-[115px] h-[32px] justify-center`}>
                        {peer.status === 'connected' ? (
                          <CheckCircle size={16} />
                        ) : (
                          <AlertCircle size={16} />
                        )}
                        <span className="font-medium" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500, fontSize: '14px', lineHeight: '1.43em', letterSpacing: '0.71%' }}>
                          {peer.status === 'connected' ? 'Connected' : 'Unstable'}
                        </span>
                      </Badge>
                      <div className="text-sm text-[#49454F] w-[100px] text-right" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400, fontSize: '14px', lineHeight: '1.71em', letterSpacing: '4.29%' }}>
                        {peer.latency}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Network Configuration Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-medium text-black" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '24px', lineHeight: '1.2em', letterSpacing: '-2%' }}>
            Network Configuration
          </h2>

          <div className="flex gap-6">
            {/* Port and Max Connections */}
            <div className="flex gap-6  flex-col">
              <div className="space-y-3">
                <div className="text-sm text-black" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '15px', lineHeight: '1.21em' }}>
                  Port
                </div>
                <Input
                  value={networkConfig.port}
                  onChange={(e) => updateNetworkConfig('port', e.target.value)}
                  className="bg-[#F9F9F9] border-[#D2D5DA] text-black px-2.5 py-2.5 rounded-lg"
                  style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '15px', lineHeight: '1.21em' }}
                />
              </div>
              <div className="space-y-3">
                <div className="text-sm text-black" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '15px', lineHeight: '1.21em' }}>
                  Max Connections
                </div>
                <Input
                  value={networkConfig.maxConnections}
                  onChange={(e) => updateNetworkConfig('maxConnections', e.target.value)}
                  className="bg-[#F9F9F9] border-[#D2D5DA] text-black px-2.5 py-2.5 rounded-lg"
                  style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '15px', lineHeight: '1.21em' }}
                />
              </div>
            </div>

            {/* DHT and Relay Settings */}
            <div className="space-y-10 mt-9">
              {/* Enable DHT */}
              <div className="bg-white rounded-xl p-2 flex items-center justify-between h-[45px]">
                <div className="space-y-1 flex-1">
                  <div className="text-lg text-[#1D1B20]" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400, fontSize: '18px', lineHeight: '1.33em', letterSpacing: '3.33%' }}>
                    Enable DHT
                  </div>
                  <div className="text-sm text-[#878787]" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400, fontSize: '15px', lineHeight: '1.6em', letterSpacing: '4%' }}>
                    Distributed Hash Table for peer discovery
                  </div>
                </div>
                <Switch
                  checked={networkConfig.enableDHT}
                  onCheckedChange={(checked) => updateNetworkConfig('enableDHT', checked)}
                  disabled={isLoading}
                  className="data-[state=checked]:bg-[#6750A4] data-[state=unchecked]:bg-gray-200 w-[52px] h-[32px] ml-10"
                />
              </div>

              {/* Enable Relay */}
              <div className="bg-white rounded-xl p-2 flex items-center justify-between h-[45px]">
                <div className="space-y-1 flex-1">
                  <div className="text-lg text-[#1D1B20]" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400, fontSize: '18px', lineHeight: '1.33em', letterSpacing: '3.33%' }}>
                    Enable Relay
                  </div>
                  <div className="text-sm text-[#878787]" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400, fontSize: '15px', lineHeight: '1.6em', letterSpacing: '4%' }}>
                    Allow connections through relay nodes
                  </div>
                </div>
                <Switch
                  checked={networkConfig.enableRelay}
                  onCheckedChange={(checked) => updateNetworkConfig('enableRelay', checked)}
                  disabled={isLoading}
                  className="data-[state=checked]:bg-[#6750A4] data-[state=unchecked]:bg-gray-200 w-[52px] h-[32px]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      </Card>
    </div>
  );
};
