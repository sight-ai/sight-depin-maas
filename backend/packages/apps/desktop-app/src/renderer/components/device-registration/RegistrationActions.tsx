/**
 * 设备注册操作组件
 * 提供注册相关的操作按钮和功能
 */

import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { RefreshCw, Settings, Trash2, AlertTriangle } from 'lucide-react';

interface RegistrationActionsProps {
  isRegistered: boolean;
  onRefresh: () => Promise<void>;
  onUpdateDid: () => Promise<void>;
  onUnregister?: () => Promise<void>;
  isLoading?: boolean;
}

export const RegistrationActions: React.FC<RegistrationActionsProps> = ({
  isRegistered,
  onRefresh,
  onUpdateDid,
  onUnregister,
  isLoading = false
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showUnregisterConfirm, setShowUnregisterConfirm] = useState(false);

  // 刷新注册信息
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error('Failed to refresh registration info:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 更新DID
  const handleUpdateDid = async () => {
    setIsUpdating(true);
    try {
      await onUpdateDid();
    } catch (error) {
      console.error('Failed to update DID:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // 取消注册确认
  const handleUnregisterConfirm = async () => {
    if (onUnregister) {
      try {
        await onUnregister();
        setShowUnregisterConfirm(false);
      } catch (error) {
        console.error('Failed to unregister device:', error);
      }
    }
  };

  return (
    <Card className="bg-white rounded-xl shadow-lg p-6">
      <CardContent className="p-0 space-y-6">
        <h2 className="text-xl font-medium text-black">Device Actions</h2>

        {/* 基础操作 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 刷新按钮 */}
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Info'}
          </Button>

          {/* 更新DID按钮 */}
          {isRegistered && (
            <Button
              onClick={handleUpdateDid}
              disabled={isUpdating || isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              {isUpdating ? 'Updating...' : 'Update DID'}
            </Button>
          )}
        </div>

        {/* 注册状态相关操作 */}
        {isRegistered && (
          <div className="space-y-4">
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Advanced Actions</h3>
              
              {/* 取消注册按钮 */}
              {!showUnregisterConfirm ? (
                <Button
                  onClick={() => setShowUnregisterConfirm(true)}
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Unregister Device
                </Button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <div>
                      <h4 className="font-medium text-red-800">Confirm Unregistration</h4>
                      <p className="text-sm text-red-600">
                        This action will remove your device from the network. You will stop earning rewards.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleUnregisterConfirm}
                      size="sm"
                      className="bg-red-600 text-white hover:bg-red-700"
                    >
                      Confirm Unregister
                    </Button>
                    <Button
                      onClick={() => setShowUnregisterConfirm(false)}
                      size="sm"
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 操作说明 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Action Descriptions</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• <strong>Refresh Info:</strong> Update device registration information from the server</p>
            {isRegistered && (
              <>
                <p>• <strong>Update DID:</strong> Refresh your device's decentralized identifier</p>
                <p>• <strong>Unregister Device:</strong> Remove device from the SightAI network</p>
              </>
            )}
          </div>
        </div>

        {/* 状态指示器 */}
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
          <span className="text-sm font-medium text-blue-800">Device Status</span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              isRegistered ? 'bg-green-500' : 'bg-yellow-500'
            }`}></div>
            <span className="text-sm text-blue-700">
              {isRegistered ? 'Registered & Active' : 'Not Registered'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
