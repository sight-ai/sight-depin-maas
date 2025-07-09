import React from 'react';
import { Construction } from 'lucide-react';

interface EmptyPageProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export const EmptyPageTemplate: React.FC<EmptyPageProps> = ({ 
  title, 
  description = "此页面正在开发中，敬请期待。",
  icon = <Construction className="h-12 w-12 text-gray-400" />
}) => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-600 mt-1">{description}</p>
      </div>

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            {icon}
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            页面开发中
          </h3>
          <p className="text-gray-600 max-w-md">
            {description}
          </p>
          <div className="mt-6">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              返回首页
            </button>
          </div>
        </div>
      </div>

      {/* Placeholder Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 使用示例：
// export const NewPage: React.FC = () => {
//   return (
//     <EmptyPageTemplate 
//       title="新页面标题"
//       description="新页面的描述信息"
//       icon={<YourIcon className="h-12 w-12 text-blue-400" />}
//     />
//   );
// };
