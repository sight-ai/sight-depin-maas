import React, { useState } from 'react';
import { Smartphone, Monitor, Server, Plus, CheckCircle, AlertCircle } from 'lucide-react';

interface Device {
  id: string;
  name: string;
  type: 'mobile' | 'desktop' | 'server';
  status: 'online' | 'offline' | 'pending';
  lastSeen: string;
}

export const DeviceRegistration: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([
    {
      id: '1',
      name: 'MacBook Pro M1',
      type: 'desktop',
      status: 'online',
      lastSeen: '2 分钟前'
    },
    {
      id: '2', 
      name: 'iPhone 15 Pro',
      type: 'mobile',
      status: 'offline',
      lastSeen: '1 小时前'
    }
  ]);

  const [showAddDevice, setShowAddDevice] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceType, setNewDeviceType] = useState<'mobile' | 'desktop' | 'server'>('desktop');

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="h-6 w-6" />;
      case 'desktop':
        return <Monitor className="h-6 w-6" />;
      case 'server':
        return <Server className="h-6 w-6" />;
      default:
        return <Monitor className="h-6 w-6" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'offline':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const handleAddDevice = () => {
    if (newDeviceName.trim()) {
      const newDevice: Device = {
        id: Date.now().toString(),
        name: newDeviceName,
        type: newDeviceType,
        status: 'pending',
        lastSeen: '刚刚'
      };
      setDevices([...devices, newDevice]);
      setNewDeviceName('');
      setShowAddDevice(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">Device Registration</h1>
            <p className="text-gray-600 mt-1">管理和注册计算设备</p>
          </div>
          <button
            onClick={() => setShowAddDevice(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            添加设备
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900">总设备数</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">{devices.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900">在线设备</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {devices.filter(d => d.status === 'online').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900">离线设备</h3>
          <p className="text-3xl font-bold text-red-600 mt-2">
            {devices.filter(d => d.status === 'offline').length}
          </p>
        </div>
      </div>

      {/* Device List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">已注册设备</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {devices.map((device) => (
            <div key={device.id} className="p-6 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-gray-600">
                  {getDeviceIcon(device.type)}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{device.name}</h3>
                  <p className="text-sm text-gray-600 capitalize">{device.type}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(device.status)}
                    <span className={`text-sm font-medium capitalize ${
                      device.status === 'online' ? 'text-green-600' :
                      device.status === 'offline' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {device.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">最后活跃: {device.lastSeen}</p>
                </div>
                <button className="text-blue-600 hover:text-blue-800 text-sm">
                  管理
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Device Modal */}
      {showAddDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">添加新设备</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  设备名称
                </label>
                <input
                  type="text"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="输入设备名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  设备类型
                </label>
                <select
                  value={newDeviceType}
                  onChange={(e) => setNewDeviceType(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="desktop">桌面设备</option>
                  <option value="mobile">移动设备</option>
                  <option value="server">服务器</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddDevice(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                取消
              </button>
              <button
                onClick={handleAddDevice}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
