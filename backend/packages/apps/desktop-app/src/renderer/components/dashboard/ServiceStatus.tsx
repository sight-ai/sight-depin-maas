/**
 * 服务状态组件
 * 显示各个服务的运行状态、连接数、响应时间等信息
 */

import React from 'react';
import { Card, CardContent } from '../ui/card';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface Service {
  name: string;
  status: 'online' | 'offline' | 'warning';
  uptime: string;
  connections: number;
  port?: number;
  responseTime?: number;
}

interface ServiceStatusProps {
  services: Service[];
}

export const ServiceStatus: React.FC<ServiceStatusProps> = ({
  services
}) => {
  // 状态图标组件
  const StatusIcon: React.FC<{ status: Service['status'] }> = ({ status }) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'offline':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <XCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  // 状态颜色
  const getStatusColor = (status: Service['status']) => {
    switch (status) {
      case 'online':
        return 'text-green-600';
      case 'offline':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  // 状态背景色
  const getStatusBgColor = (status: Service['status']) => {
    switch (status) {
      case 'online':
        return 'bg-green-50 border-green-200';
      case 'offline':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card className="bg-white rounded-xl shadow-lg p-6">
      <CardContent className="p-0 space-y-6">
        <h2 className="text-xl font-medium text-black">Service Status</h2>

        {/* 服务状态列表 */}
        <div className="space-y-4">
          {services.map((service, index) => (
            <div
              key={index}
              className={`border rounded-lg p-4 ${getStatusBgColor(service.status)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusIcon status={service.status} />
                  <div>
                    <h3 className="font-medium text-gray-800">{service.name}</h3>
                    <div className="text-sm text-black" style={{
                      fontFamily: 'Roboto',
                      fontSize: '14px',
                      lineHeight: '20px',
                      letterSpacing: '0.25px',
                      color: '#000000'
                    }}>
                      Uptime: {service.uptime} ｜Connections: {service.connections}
                      {service.port && ` ｜Port: ${service.port}`}
                      {service.responseTime && ` ｜Response: ${service.responseTime}ms`}
                    </div>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(service.status)}`}>
                  {service.status.toUpperCase()}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 服务概览统计 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Service Overview</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-green-600">
                {services.filter(s => s.status === 'online').length}
              </div>
              <div className="text-sm text-gray-600">Online</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-yellow-600">
                {services.filter(s => s.status === 'warning').length}
              </div>
              <div className="text-sm text-gray-600">Warning</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-red-600">
                {services.filter(s => s.status === 'offline').length}
              </div>
              <div className="text-sm text-gray-600">Offline</div>
            </div>
          </div>
        </div>

        {/* 总连接数 */}
        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
          <span className="text-sm font-medium text-blue-800">Total Active Connections</span>
          <span className="text-lg font-bold text-blue-600">
            {services.reduce((total, service) => total + service.connections, 0)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
