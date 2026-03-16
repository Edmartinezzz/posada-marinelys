'use client';

import React, { useState } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Space, Typography, Grid } from 'antd';
import {
  CalendarOutlined,
  DollarOutlined,
  UserOutlined,
  LogoutOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const { Header, Sider, Content } = Layout;
const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setUser(user);
        setLoading(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    }
  };

  const menuItems = [
    {
      key: '/',
      icon: <CalendarOutlined />,
      label: 'Calendario',
    },
    {
      key: '/admin/pagos',
      icon: <DollarOutlined />,
      label: 'Pagos',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    router.push(key);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const userMenu = {
    items: [
      {
        key: 'profile',
        label: 'Mi Perfil',
        icon: <UserOutlined />,
      },
      {
        key: 'divider',
        type: 'divider' as const,
      },
      {
        key: 'logout',
        label: 'Cerrar Sesión',
        icon: <LogoutOutlined />,
        onClick: handleLogout,
      },
    ],
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#fdfdfd]">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-600/20 blur-2xl rounded-full animate-pulse" />
          <img 
            src="/logo.jpg" 
            alt="Cargando..." 
            className="w-24 h-24 rounded-full relative z-10 shadow-xl border-4 border-white animate-bounce"
          />
        </div>
        <div className="mt-8 text-center">
          <Title level={5} className="!text-blue-900 !m-0 tracking-widest uppercase text-[10px] font-black">Cargando Sistema</Title>
          <div className="w-32 h-1 bg-blue-100 rounded-full mt-2 overflow-hidden mx-auto">
            <div className="h-full bg-blue-900 animate-[loading_1.5s_infinite]" style={{ width: '40%' }} />
          </div>
        </div>
        <style jsx>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(300%); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <Layout className="min-h-screen bg-transparent">
      {/* Desktop Sider */}
      {!isMobile && (
        <Sider 
          trigger={null} 
          collapsible 
          collapsed={false}
          theme="light"
          className="glass-morphism !m-6 !mr-0 !rounded-3xl overflow-hidden"
          width={240}
        >
          <div className="h-32 flex flex-col items-center justify-center border-b border-white/10 px-4">
            <img 
              src="/logo.jpg" 
              alt="Logo" 
              className="w-16 h-16 object-contain p-1.5 bg-white mb-2 rounded-full border border-blue-50 shadow-sm"
            />
            <Title level={5} className="!m-0 !text-blue-900 tracking-tight font-black">MARINELYS</Title>
            <Text className="text-[9px] uppercase tracking-[0.2em] text-blue-400 font-bold">Posada de Playa</Text>
          </div>
          <Menu
            mode="inline"
            selectedKeys={[pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            className="border-none px-3 mt-6 bg-transparent"
          />
        </Sider>
      )}

      <Layout className="bg-transparent">
        {/* Universal Header (Shows on mobile and desktop) */}
        <Header className="glass-morphism !px-6 flex items-center justify-between !m-4 !md:m-6 !rounded-2xl h-16">
          <div className="flex items-center space-x-3">
            <img 
              src="/logo.jpg" 
              alt="Logo" 
              className="w-10 h-10 object-contain p-1 bg-white rounded-full border border-blue-50"
            />
            <Title level={4} className="!m-0 text-blue-900 title-elegant !text-xl md:!text-2xl">Posada Marinelys</Title>
          </div>
          
          <Space size="middle">
            {!isMobile && (
              <div className="flex flex-col items-end leading-none">
                <Text strong className="text-sm font-semibold">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Cargando...'}
                </Text>
                <Text className="text-[9px] uppercase tracking-wider text-blue-500 font-bold">
                  Acceso Administrativo
                </Text>
              </div>
            )}
            <Dropdown menu={userMenu} placement="bottomRight" arrow>
              <Avatar 
                className="bg-blue-900 border-2 border-blue-100 cursor-pointer shadow-sm hover:scale-105 transition-transform"
                icon={<UserOutlined />} 
                size={isMobile ? 'small' : 'default'}
              />
            </Dropdown>
          </Space>
        </Header>
        
        <Content className="!mx-4 md:!mx-6 !mb-24 md:!mb-6 overflow-x-hidden">
          <div className="animate-in-up md:p-2">
            {children}
          </div>
        </Content>

        {/* Mobile Bottom Navigation */}
        {isMobile && (
          <div className="fixed bottom-4 left-4 right-4 h-16 glass-morphism !rounded-2xl z-50 flex items-center justify-around px-2 mobile-nav-shadow">
            {menuItems.map(item => (
              <button
                key={item.key}
                onClick={() => router.push(item.key)}
                className={`flex flex-col items-center justify-center w-full h-full transition-all duration-300 rounded-xl ${
                  pathname === item.key ? 'text-blue-900 font-bold' : 'text-gray-400 opacity-60'
                }`}
              >
                <span className={`text-xl mb-1 ${pathname === item.key ? 'scale-110' : ''}`}>
                  {item.icon}
                </span>
                <span className="text-[10px]">{item.label}</span>
                {pathname === item.key && (
                  <div className="w-1 h-1 bg-blue-900 rounded-full mt-1" />
                )}
              </button>
            ))}
            <button
               onClick={handleLogout}
               className="flex flex-col items-center justify-center w-full h-full text-red-400 opacity-60"
            >
              <LogoutOutlined className="text-xl mb-1" />
              <span className="text-[10px]">Salir</span>
            </button>
          </div>
        )}
      </Layout>
    </Layout>
  );
}
