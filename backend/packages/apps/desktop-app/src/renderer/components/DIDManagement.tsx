import React, { useState } from 'react';
import { Key, Shield, Copy, Plus, Trash2, Eye, EyeOff } from 'lucide-react';

interface DIDRecord {
  id: string;
  did: string;
  alias: string;
  type: 'personal' | 'device' | 'service';
  status: 'active' | 'inactive' | 'revoked';
  createdAt: string;
  lastUsed: string;
}

export const DIDManagement: React.FC = () => {
  const [dids, setDids] = useState<DIDRecord[]>([
    {
      id: '1',
      did: 'did:sight:1234567890abcdef',
      alias: '主设备身份',
      type: 'device',
      status: 'active',
      createdAt: '2024-01-10',
      lastUsed: '2024-01-15'
    },
    {
      id: '2',
      did: 'did:sight:fedcba0987654321',
      alias: '个人身份',
      type: 'personal',
      status: 'active',
      createdAt: '2024-01-05',
      lastUsed: '2024-01-14'
    }
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDIDAlias, setNewDIDAlias] = useState('');
  const [newDIDType, setNewDIDType] = useState<'personal' | 'device' | 'service'>('device');
  const [showPrivateKeys, setShowPrivateKeys] = useState<Record<string, boolean>>({});

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'personal': return '个人身份';
      case 'device': return '设备身份';
      case 'service': return '服务身份';
      default: return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'inactive': return 'text-yellow-600 bg-yellow-100';
      case 'revoked': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '活跃';
      case 'inactive': return '非活跃';
      case 'revoked': return '已撤销';
      default: return status;
    }
  };

  const handleCreateDID = () => {
    if (newDIDAlias.trim()) {
      const newDID: DIDRecord = {
        id: Date.now().toString(),
        did: `did:sight:${Math.random().toString(36).substr(2, 16)}`,
        alias: newDIDAlias,
        type: newDIDType,
        status: 'active',
        createdAt: new Date().toISOString().split('T')[0],
        lastUsed: new Date().toISOString().split('T')[0]
      };
      setDids([...dids, newDID]);
      setNewDIDAlias('');
      setShowCreateModal(false);
    }
  };

  const handleCopyDID = (did: string) => {
    navigator.clipboard.writeText(did);
    alert('DID已复制到剪贴板');
  };

  const handleRevokeDID = (id: string) => {
    if (confirm('确定要撤销此DID吗？此操作不可逆。')) {
      setDids(dids.map(d => 
        d.id === id ? { ...d, status: 'revoked' as const } : d
      ));
    }
  };

  const togglePrivateKeyVisibility = (id: string) => {
    setShowPrivateKeys(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">DID Management</h1>
            <p className="text-gray-600 mt-1">去中心化身份标识符管理</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            创建DID
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Key className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">总DID数</h3>
              <p className="text-3xl font-bold text-blue-600">{dids.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Shield className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">活跃DID</h3>
              <p className="text-3xl font-bold text-green-600">
                {dids.filter(d => d.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Trash2 className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">已撤销</h3>
              <p className="text-3xl font-bold text-red-600">
                {dids.filter(d => d.status === 'revoked').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* DID List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">DID列表</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {dids.map((did) => (
            <div key={did.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-medium text-gray-900">{did.alias}</h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(did.status)}`}>
                      {getStatusLabel(did.status)}
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {getTypeLabel(did.type)}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">DID:</span>
                      <code className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                        {did.did}
                      </code>
                      <button
                        onClick={() => handleCopyDID(did.did)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">私钥:</span>
                      <code className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                        {showPrivateKeys[did.id] 
                          ? '0x1234567890abcdef...' 
                          : '••••••••••••••••••••'
                        }
                      </code>
                      <button
                        onClick={() => togglePrivateKeyVisibility(did.id)}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        {showPrivateKeys[did.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    
                    <div className="flex space-x-4 text-sm text-gray-600">
                      <span>创建: {new Date(did.createdAt).toLocaleDateString('zh-CN')}</span>
                      <span>最后使用: {new Date(did.lastUsed).toLocaleDateString('zh-CN')}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    编辑
                  </button>
                  {did.status !== 'revoked' && (
                    <button
                      onClick={() => handleRevokeDID(did.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      撤销
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create DID Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">创建新DID</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  别名
                </label>
                <input
                  type="text"
                  value={newDIDAlias}
                  onChange={(e) => setNewDIDAlias(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="输入DID别名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  类型
                </label>
                <select
                  value={newDIDType}
                  onChange={(e) => setNewDIDType(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="device">设备身份</option>
                  <option value="personal">个人身份</option>
                  <option value="service">服务身份</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                取消
              </button>
              <button
                onClick={handleCreateDID}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
