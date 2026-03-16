'use client';

import React, { useState, useMemo } from 'react';
import { Table, Tag, Input, DatePicker, Space, Typography, Card, Image, Button, Tooltip, Badge, App } from 'antd';
import { SearchOutlined, FilterOutlined, EyeOutlined, WhatsAppOutlined, CheckCircleOutlined, ClockCircleOutlined, DollarOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import AppLayout from '@/components/AppLayout';

import { supabase } from '@/lib/supabase';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface PaymentData {
  key: string;
  check_in: string;
  check_out: string;
  habitacion: string;
  cliente: string;
  whatsapp: string;
  comprobante: string;
  registrado_por: string;
  subido_por: string;
  estado: 'verificado' | 'pendiente';
}

export default function AdminPagosPage() {
  const { message } = App.useApp();
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<any>(null);
  const [data, setData] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data: reservas, error } = await supabase
        .from('reservas')
        .select(`
          *,
          habitaciones(nombre),
          registrado:perfiles!registrado_por(nombre, email),
          subido:perfiles!subido_por(nombre, email)
        `)
        .order('check_in', { ascending: false });

      if (error) throw error;

      const formattedData: PaymentData[] = (reservas || []).map(r => ({
        key: r.id,
        check_in: r.check_in,
        check_out: r.check_out,
        habitacion: (r.habitaciones as any)?.nombre || 'N/A',
        cliente: r.cliente_nombre,
        whatsapp: r.cliente_whatsapp,
        comprobante: r.comprobante_url,
        registrado_por: (r.registrado as any)?.nombre || (r.registrado as any)?.email?.split('@')[0] || 'Admin',
        subido_por: (r.subido as any)?.nombre || (r.subido as any)?.email?.split('@')[0] || 'Admin',
        estado: r.estado as 'verificado' | 'pendiente',
      }));

      setData(formattedData);
    } catch (error: any) {
      console.error('Error fetching payments:', error.message || error);
      message.error('Error al cargar pagos');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id: string) => {
    try {
      const { error } = await supabase
        .from('reservas')
        .update({ estado: 'verificado' })
        .eq('id', id);

      if (error) throw error;
      
      message.success('Pago verificado correctamente');
      fetchPayments(); // Recargar datos
    } catch (error: any) {
      message.error('Error al verificar: ' + error.message);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchSearch = item.cliente.toLowerCase().includes(searchText.toLowerCase());
      const matchDate = !dateRange || (
        dayjs(item.check_in).isAfter(dateRange[0].startOf('day')) && 
        dayjs(item.check_in).isBefore(dateRange[1].endOf('day'))
      );
      return matchSearch && matchDate;
    });
  }, [data, searchText, dateRange]);

  const columns: ColumnsType<PaymentData> = [
    {
      title: 'Check-In',
      dataIndex: 'check_in',
      key: 'check_in',
      render: (text) => dayjs(text).format('DD/MM/YY HH:mm'),
      sorter: (a, b) => dayjs(a.check_in).unix() - dayjs(b.check_in).unix(),
    },
    {
      title: 'Check-Out',
      dataIndex: 'check_out',
      key: 'check_out',
      render: (text) => dayjs(text).format('DD/MM/YY HH:mm'),
    },
    {
      title: 'Habitación',
      dataIndex: 'habitacion',
      key: 'habitacion',
      render: (text) => <Tag color="orange" className="font-semibold">{text}</Tag>,
    },
    {
      title: 'Cliente',
      key: 'cliente',
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong className="text-sm">{record.cliente}</Text>
          <Text type="secondary" className="text-[11px]">
            <WhatsAppOutlined className="text-green-500 mr-1" />
            {record.whatsapp}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Comprobante',
      dataIndex: 'comprobante',
      key: 'comprobante',
      align: 'center',
      render: (src) => (
        <Image
          src={src}
          alt="Comprobante"
          width={40}
          height={40}
          className="rounded-md object-cover cursor-pointer hover:opacity-80 transition-opacity"
          preview={{
            cover: <EyeOutlined />,
          }}
          fallback="https://placehold.co/400x600/f3f4f6/94a3b8?text=Sin+Pago"
        />
      ),
    },
    {
      title: 'Registrado',
      dataIndex: 'registrado_por',
      key: 'registrado_por',
      render: (val) => <Tag color="blue" className="text-[10px] uppercase font-bold">{val}</Tag>,
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado) => (
        estado === 'verificado' ? 
        <Tag icon={<CheckCircleOutlined />} color="success" className="rounded-full px-3">Verificado</Tag> : 
        <Tag icon={<ClockCircleOutlined />} color="warning" className="rounded-full px-3">Pendiente</Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="text" className="text-blue-600 hover:bg-blue-50 transition-colors">
            Detalles
          </Button>
          {record.estado === 'pendiente' && (
            <Button 
              type="primary" 
              size="small" 
              className="bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm"
              onClick={() => handleVerify(record.key)}
            >
              Verificar
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 animate-in-up">
        <header className="px-1">
          <Title level={2} className="!mb-1 !text-blue-900 !font-black tracking-tight flex items-center gap-3">
            <DollarOutlined className="text-blue-500" />
            Control de Pagos
          </Title>
          <Text className="text-gray-400 font-medium">Gestión administrativa y verificación de reservas</Text>
        </header>

        <Card className="glass-morphism !border-none !rounded-3xl shadow-xl overflow-hidden" variant="borderless">
          <div className="flex flex-col lg:flex-row justify-between mb-8 gap-4 px-2">
            <Space wrap className="flex-1">
              <Input
                placeholder="Buscar por cliente..."
                prefix={<SearchOutlined className="text-blue-400" />}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full md:w-72 h-11 !rounded-xl !border-gray-100 bg-gray-50/50"
                size="large"
              />
              <RangePicker 
                onChange={(dates) => setDateRange(dates)} 
                placeholder={['Desde', 'Hasta']}
                size="large"
                className="h-11 !rounded-xl !border-gray-100 bg-gray-50/50 w-full md:w-auto"
              />
            </Space>
            <div className="flex items-center gap-3">
              <Button 
                icon={<FilterOutlined />} 
                size="large" 
                className="h-11 w-11 flex items-center justify-center !rounded-xl !border-gray-100" 
              />
              <Button 
                type="primary" 
                size="large" 
                className="h-11 !rounded-xl bg-blue-900 font-bold px-6 shadow-lg shadow-blue-900/20"
              >
                Exportar CSV
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table 
              columns={columns} 
              dataSource={filteredData} 
              pagination={{ pageSize: 7, hideOnSinglePage: true }}
              loading={loading}
              className="premium-table"
              rowClassName="hover:bg-blue-50/40 transition-all cursor-default"
              scroll={{ x: 'max-content' }}
            />
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <Card className="glass-morphism !border-none !rounded-3xl p-2 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <CalendarOutlined className="text-6xl text-blue-900" />
            </div>
            <div className="flex flex-col">
              <Text className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-1">Total Reservas</Text>
              <Title level={2} className="!m-0 text-blue-900 font-black">{data.length}</Title>
              <Badge count={`+${data.length}`} className="mt-2 w-fit" color="#1e3a8a" />
            </div>
          </Card>
          
          <Card className="glass-morphism !border-none !rounded-3xl p-2 relative overflow-hidden group border-b-4 border-b-green-500">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <CheckCircleOutlined className="text-6xl text-green-600" />
            </div>
            <div className="flex flex-col">
              <Text className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-1">Verificados</Text>
              <Title level={2} className="!m-0 text-green-600 font-black">{data.filter(i => i.estado === 'verificado').length}</Title>
              <Text className="text-green-500 text-xs mt-2 font-bold">Líquido confirmado</Text>
            </div>
          </Card>

          <Card className="glass-morphism !border-none !rounded-3xl p-2 relative overflow-hidden group border-b-4 border-b-orange-500">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <ClockCircleOutlined className="text-6xl text-orange-600" />
            </div>
            <div className="flex flex-col">
              <Text className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-1">Por Validar</Text>
              <Title level={2} className="!m-0 text-orange-600 font-black">{data.filter(i => i.estado === 'pendiente').length}</Title>
              <Text className="text-orange-500 text-xs mt-2 font-bold">Requiere atención</Text>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
