'use client';

import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, App, Space } from 'antd';
import { LockOutlined, UserOutlined, HomeOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';

const { Title, Text } = Typography;

export default function LoginPage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        message.error('Error al iniciar sesión: ' + error.message);
      } else {
        message.success('Bienvenido, ' + (data.user?.user_metadata?.full_name || 'Administrador'));
        router.push('/');
      }
    } catch (err) {
      console.error(err);
      message.error('Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-900">
      {/* Dynamic Background Image */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url("/fondo.webp")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.9) blur(3px)'
        }}
      />
      
      {/* Light overlay for readability */}
      <div className="absolute inset-0 bg-white/10 z-[1]" />

      <Card 
        className="w-full max-w-md premium-card glass relative z-10" 
        variant="borderless"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img 
              src="/logo.jpg" 
              alt="Logo Posada Marinelys" 
              className="w-32 h-32 object-contain p-2 bg-white rounded-full shadow-md border border-blue-50"
            />
          </div>
          <Title level={2} className="!mb-1 !text-blue-900 !font-bold">Posada Marinelys</Title>
          <Text className="text-blue-500/70 font-medium">Portal de Gestión de Reservas</Text>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Por favor ingresa tu email' },
              { type: 'email', message: 'Por favor ingresa un email válido' }
            ]}
          >
            <Input 
              prefix={<UserOutlined className="text-gray-400" />} 
              placeholder="Email" 
              className="bg-white/50"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Por favor ingresa tu contraseña' }]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="Contraseña"
              className="bg-white/50"
            />
          </Form.Item>

          <div className="flex justify-between items-center mb-6">
            <Text type="secondary" className="text-xs italic">Ingresa con tus credenciales de Supabase</Text>
          </div>

          <Form.Item className="mb-0">
            <Button 
              type="primary" 
              htmlType="submit" 
              className="w-full h-12 text-lg font-semibold shadow-lg shadow-blue-500/30"
              loading={loading}
            >
              Iniciar Sesión
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <div className="absolute bottom-4 text-center w-full">
        <Text type="secondary" className="text-[10px] uppercase tracking-widest opacity-50">
          © {new Date().getFullYear()} Posada Marinelys - v1.0
        </Text>
      </div>
    </div>
  );
}
