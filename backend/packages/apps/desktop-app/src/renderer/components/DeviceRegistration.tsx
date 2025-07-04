import React, { useState } from 'react';

export const DeviceRegistration: React.FC = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    name: '',
    type: 'gpu',
    description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 这里实现设备注册逻辑
    console.log('Registering device:', deviceInfo);
  };

  return (
    <div className="device-registration">
      <div className="page-header">
        <h2>设备注册</h2>
        <p>注册新的计算设备到 SightAI 网络</p>
      </div>

      <div className="registration-form-container">
        <form onSubmit={handleSubmit} className="registration-form">
          <div className="form-group">
            <label htmlFor="device-name">设备名称</label>
            <input
              id="device-name"
              type="text"
              value={deviceInfo.name}
              onChange={(e) => setDeviceInfo({ ...deviceInfo, name: (e.target as HTMLInputElement).value })}
              placeholder="输入设备名称"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="device-type">设备类型</label>
            <select
              id="device-type"
              value={deviceInfo.type}
              onChange={(e) => setDeviceInfo({ ...deviceInfo, type: (e.target as HTMLSelectElement).value })}
            >
              <option value="gpu">GPU</option>
              <option value="cpu">CPU</option>
              <option value="tpu">TPU</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="device-description">设备描述</label>
            <textarea
              id="device-description"
              value={deviceInfo.description}
              onChange={(e) => setDeviceInfo({ ...deviceInfo, description: (e.target as HTMLTextAreaElement).value })}
              placeholder="输入设备描述（可选）"
              rows={4}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              注册设备
            </button>
            <button type="button" className="btn-secondary">
              检测硬件
            </button>
          </div>
        </form>

        <div className="device-info-panel">
          <h3>系统检测到的硬件</h3>
          <div className="hardware-list">
            <div className="hardware-item">
              <span className="hardware-icon">🖥️</span>
              <div className="hardware-details">
                <h4>检测中...</h4>
                <p>正在扫描可用的计算设备</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
