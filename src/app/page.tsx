'use client';

import React, { useState } from 'react';
import { Calendar, Badge, Modal, Form, Input, Button, Upload, message as staticMessage, Typography, Card, Tag, DatePicker, Select, Row, Col, App, Space, Popconfirm } from 'antd';
import { UploadOutlined, PhoneOutlined, UserOutlined, CalendarOutlined, ClockCircleOutlined, HomeOutlined, WhatsAppOutlined, CheckCircleOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import AppLayout from '@/components/AppLayout';

import { supabase } from '@/lib/supabase';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const ROOM_MAPPING: Record<string, string[]> = {
  'Triple': ['Habitación 1', 'Habitación 2', 'Habitación 6', 'Habitación 9', 'Habitación 10'],
  'Familiar': ['Habitación 12'],
  'Matrimonial': ['Habitación 3', 'Habitación 4', 'Habitación 7', 'Habitación 8', 'Habitación 15', 'Habitación 17', 'Habitación 18'],
  'Doble': ['Habitación 5', 'Habitación 16']
};

export default function CalendarPage() {
  const { message } = App.useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [occupiedDates, setOccupiedDates] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState<'details' | 'form'>('form');
  const [selectedRoomType, setSelectedRoomType] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<[Dayjs, Dayjs] | null>(null);

  // Load data on mount
  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch rooms
    const { data: roomsData } = await supabase.from('habitaciones').select('*');
    if (roomsData) setRooms(roomsData);

    // Fetch reservations with details
    const { data: reservasData, error } = await supabase
      .from('reservas')
      .select(`
        id,
        check_in,
        check_out,
        habitacion_id,
        cliente_nombre,
        cliente_whatsapp,
        adultos,
        ninos,
        tipo_habitacion,
        ciudad_origen,
        estado,
        habitaciones(nombre)
      `);
    
    if (error) {
      console.error('Error fetching reservations:', error.message || error);
    } else if (reservasData) {
      setOccupiedDates(reservasData);
    }
  };

  const cellRender = (current: Dayjs, info: any) => {
    if (info.type !== 'date') return info.originNode;
    
    const staying = occupiedDates.filter(r => 
      dayjs(r.check_in).isSame(current, 'day') || 
      (current.isAfter(dayjs(r.check_in), 'day') && current.isBefore(dayjs(r.check_out), 'day'))
    );

    const leaving = occupiedDates.filter(r => 
      dayjs(r.check_out).isSame(current, 'day')
    );

    if (staying.length > 0 || leaving.length > 0) {
      return (
        <div className="flex flex-col gap-1 overflow-hidden">
          {staying.map((r, i) => (
            <Badge 
              key={`stay-${i}`} 
              status="error" 
              text={<span className="text-[10px] font-bold text-red-600 truncate">Ocupado</span>} 
            />
          ))}
          {leaving.map((r, i) => (
            <Badge 
              key={`leave-${i}`} 
              status="processing" 
              text={<span className="text-[10px] font-bold text-blue-600 truncate">Salida</span>} 
            />
          ))}
        </div>
      );
    }
    return null;
  };

  const onSelect = (date: Dayjs) => {
    setSelectedDate(date);
    
    // Find reservations on this day
    const dayReservations = occupiedDates.filter(r => 
      dayjs(r.check_in).isSame(date, 'day') || 
      dayjs(r.check_out).isSame(date, 'day') ||
      (date.isAfter(dayjs(r.check_in), 'day') && date.isBefore(dayjs(r.check_out), 'day'))
    );

    if (dayReservations.length > 0) {
      // If there are reservations, show details view instead of direct new form
      setCurrentView('details');
    } else {
      // If empty, show new form directly
      setCurrentView('form');
      const defaultRange: [Dayjs, Dayjs] = [date.startOf('day'), date.add(1, 'day').startOf('day')];
      form.setFieldsValue({
        fechas: defaultRange,
        tipo_habitacion: null,
        habitaciones: []
      });
      setSelectedDates(defaultRange);
      setSelectedRoomType(null);
    }
    setIsModalOpen(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      let publicUrl = '';

      // 1. Upload file if exists
      if (fileList.length > 0) {
        const file = fileList[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('pagos')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('pagos')
          .getPublicUrl(filePath);
        
        publicUrl = urlData.publicUrl;
      }

      // 2. Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // 3. Save reservations (Multiple rooms)
      const reservationPromises = values.habitaciones.map((habitacionId: string) => 
        supabase
          .from('reservas')
          .insert({
            cliente_nombre: values.nombre,
            cliente_whatsapp: values.whatsapp,
            adultos: values.adultos,
            ninos: values.ninos,
            tipo_habitacion: values.tipo_habitacion,
            ciudad_origen: values.ciudad_origen,
            check_in: values.fechas[0].startOf('day').add(14, 'hour').toISOString(),
            check_out: values.fechas[1].startOf('day').add(12, 'hour').toISOString(),
            habitacion_id: habitacionId,
            comprobante_url: publicUrl,
            registrado_por: user?.id,
            subido_por: user?.id,
            estado: 'pendiente'
          })
      );

      const results = await Promise.all(reservationPromises);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw errors[0].error;

      message.success(`${values.habitaciones.length} habitacion(es) reservada(s) exitosamente`);
      setIsModalOpen(false);
      if (currentView === 'form') form.resetFields();
      setFileList([]);
      fetchData(); // Refresh calendar
    } catch (error: any) {
      console.error('Error:', error);
      message.error('Error al registrar reserva: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('reservas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      message.success('Reserva eliminada exitosamente');
      fetchData(); // Refresh calendar updates
    } catch (error: any) {
      console.error('Error deleting:', error);
      message.error('Error al eliminar reserva: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    if (currentView === 'form') form.resetFields();
    setFileList([]);
  };

  const uploadProps = {
    onRemove: (file: any) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    beforeUpload: (file: any) => {
      setFileList([...fileList, file]);
      return false; // Prevent automatic upload
    },
    fileList,
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-700">
        <header className="flex justify-between items-end">
          <div>
            <Title level={2} className="!mb-0 !text-blue-900">Gestión de Disponibilidad</Title>
            <Text type="secondary">Organiza las estadías y habitaciones de la posada</Text>
          </div>
          <div className="flex gap-2">
            <Tag color="error" className="px-4 py-1 rounded-full font-medium">Ocupado</Tag>
            <Tag color="success" className="px-4 py-1 rounded-full font-medium">Disponible</Tag>
          </div>
        </header>

        <Card className="premium-card shadow-xl overflow-hidden" variant="borderless">
          <Calendar 
            cellRender={cellRender} 
            onSelect={onSelect}
            className="p-2 custom-calendar"
          />
        </Card>
      </div>

      <Modal
        title={
          <div className="flex items-center space-x-2 text-blue-900 border-b pb-3">
            <CalendarOutlined className="text-xl" />
            <span className="text-lg">
              {currentView === 'details' ? `Reservas para el ${selectedDate?.format('DD [de] MMMM')}` : 'Nueva Reserva'}
            </span>
          </div>
        }
        open={isModalOpen}
        onOk={currentView === 'form' ? handleOk : undefined}
        onCancel={handleCancel}
        confirmLoading={loading}
        okText={currentView === 'form' ? "Registrar Estadía" : undefined}
        cancelText={currentView === 'form' ? "Cancelar" : "Cerrar"}
        footer={currentView === 'details' ? [
          <Button key="close" onClick={handleCancel}>Cerrar</Button>,
          <Button 
            key="add" 
            type="primary" 
            className="bg-blue-900" 
            onClick={() => {
              setCurrentView('form');
              // Delay to allow Form to mount
              setTimeout(() => {
                const defaultRange: [Dayjs, Dayjs] = [selectedDate?.startOf('day') || dayjs().startOf('day'), (selectedDate?.add(1, 'day').startOf('day') || dayjs().add(1, 'day').startOf('day'))];
                form.setFieldsValue({
                  fechas: defaultRange,
                  tipo_habitacion: null,
                  habitaciones: []
                });
                setSelectedDates(defaultRange);
                setSelectedRoomType(null);
              }, 0);
            }}
          >
            Nueva Reserva
          </Button>
        ] : undefined}
        okButtonProps={{ size: 'large', className: 'bg-blue-900 h-11 px-8 rounded-lg' }}
        cancelButtonProps={{ size: 'large', className: 'rounded-lg' }}
        width={currentView === 'details' ? 650 : 600}
        centered
        className="booking-modal"
      >
        {currentView === 'details' ? (
          <div className="py-4">
            <div className="space-y-4 max-h-[400px] overflow-y-auto px-1">
              {occupiedDates
                .filter(r => 
                  selectedDate && (
                    dayjs(r.check_in).isSame(selectedDate, 'day') || 
                    dayjs(r.check_out).isSame(selectedDate, 'day') ||
                    (selectedDate.isAfter(dayjs(r.check_in), 'day') && selectedDate.isBefore(dayjs(r.check_out), 'day'))
                  )
                )
                .map((res, idx) => (
                  <Card key={idx} size="small" className="border-l-4 border-l-blue-600 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <Space orientation="vertical" size={2}>
                        <Text strong className="text-blue-900 text-base">{res.cliente_nombre}</Text>
                        <Space className="text-xs" separator={<span className="text-gray-300">|</span>}>
                          <Text type="secondary">
                            <WhatsAppOutlined className="text-green-500 mr-1" />
                            {res.cliente_whatsapp}
                          </Text>
                          <Text type="secondary" className="font-medium">
                            {res.adultos} {res.adultos === 1 ? 'Adulto' : 'Adultos'}
                            {res.ninos > 0 && `, ${res.ninos} ${res.ninos === 1 ? 'Niño' : 'Niños'}`}
                          </Text>
                          {res.ciudad_origen && (
                            <Text type="secondary" className="italic">
                              De: {res.ciudad_origen}
                            </Text>
                          )}
                        </Space>
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <Tag color="orange" className="font-bold m-0">{(res.habitaciones as any)?.nombre}</Tag>
                          <Text className="text-[11px] font-medium bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                            {dayjs(res.check_in).isSame(selectedDate, 'day') ? 'Entrada' : dayjs(res.check_out).isSame(selectedDate, 'day') ? 'Salida' : 'Estadía'}
                          </Text>
                        </div>
                      </Space>
                      <div className="flex flex-col items-end gap-2">
                        {res.estado === 'verificado' ? (
                          <Tag color="success" icon={<CheckCircleOutlined />}>Confirmado</Tag>
                        ) : (
                          <Tag color="warning" icon={<ClockCircleOutlined />}>Pendiente</Tag>
                        )}
                        <Popconfirm
                          title="Eliminar reserva"
                          description="¿Estás seguro de que deseas eliminar esta reserva?"
                          onConfirm={() => handleDelete(res.id)}
                          okText="Sí, eliminar"
                          cancelText="No"
                          okButtonProps={{ danger: true }}
                        >
                          <Button 
                            type="text" 
                            danger 
                            icon={<DeleteOutlined />} 
                            size="small"
                            className="hover:bg-red-50"
                          >
                            Eliminar
                          </Button>
                        </Popconfirm>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        ) : (
          <Form
            form={form}
            layout="vertical"
            className="mt-6"
            requiredMark={false}
          >
            {/* Form content (unchanged but needs to be here if replacing entirely) */}
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="nombre"
                  label={<span className="font-semibold text-gray-700">Nombre del Cliente</span>}
                  rules={[{ required: true, message: 'Requerido' }]}
                >
                  <Input prefix={<UserOutlined className="text-blue-500" />} placeholder="Ej: Juan Pérez" size="large" className="rounded-lg" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="whatsapp"
                  label={<span className="font-semibold text-gray-700">Número de WhatsApp</span>}
                  rules={[{ required: true, message: 'Requerido' }]}
                >
                  <Input prefix={<PhoneOutlined className="text-green-500" />} placeholder="Ej: +58 412 1234567" size="large" className="rounded-lg" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="adultos"
                  label={<span className="font-semibold text-gray-700">Adultos</span>}
                  initialValue={1}
                  rules={[{ required: true }]}
                >
                  <Input prefix={<UserOutlined className="text-blue-500" />} type="number" min={1} size="large" className="rounded-lg" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="ninos"
                  label={<span className="font-semibold text-gray-700">Niños</span>}
                  initialValue={0}
                >
                  <Input prefix={<UserOutlined className="text-blue-200" />} type="number" min={0} size="large" className="rounded-lg" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="tipo_habitacion"
                  label={<span className="font-semibold text-gray-700">Tipo de Habitación</span>}
                  rules={[{ required: true, message: 'Selecciona' }]}
                >
                  <Select 
                    placeholder="Tipo" 
                    size="large" 
                    className="rounded-lg"
                    onChange={(val) => {
                      setSelectedRoomType(val);
                      form.setFieldsValue({ habitaciones: [] });
                    }}
                  >
                    <Option value="Matrimonial">Matrimonial</Option>
                    <Option value="Triple">Triple</Option>
                    <Option value="Doble">Doble</Option>
                    <Option value="Familiar">Familiar</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="habitaciones"
              label={<span className="font-semibold text-gray-700">Número de habitación</span>}
              rules={[{ required: true, message: 'Selecciona al menos una habitación' }]}
            >
              <Select 
                mode="multiple"
                size="large" 
                placeholder="Selecciona una o más habitaciones" 
                className="rounded-lg"
                suffixIcon={<HomeOutlined className="text-blue-500" />}
              >
                {rooms
                  .filter(room => {
                    // 1. Filter by room type
                    const matchesType = !selectedRoomType || ROOM_MAPPING[selectedRoomType]?.includes(room.nombre);
                    if (!matchesType) return false;

                    // 2. Filter by availability (overlap check)
                    if (selectedDates && selectedDates[0] && selectedDates[1]) {
                      const newStart = selectedDates[0];
                      const newEnd = selectedDates[1];

                      const isOccupied = occupiedDates.some(res => {
                        if (res.habitacion_id !== room.id) return false;
                        
                        const existingStart = dayjs(res.check_in);
                        const existingEnd = dayjs(res.check_out);

                        // Overlap if (newStart < existingEnd) AND (existingStart < newEnd)
                        // This accounts for 12:00 checkout and 14:00 check-in
                        return newStart.isBefore(existingEnd, 'day') && existingStart.isBefore(newEnd, 'day');
                      });
                      return !isOccupied;
                    }
                    return true;
                  })
                  .map(room => (
                    <Option key={room.id} value={room.id}>{room.nombre}</Option>
                  ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="fechas"
              label={<span className="font-semibold text-gray-700">Check-In y Check-Out</span>}
              rules={[{ required: true, message: 'Selecciona las fechas' }]}
            >
              <RangePicker 
                format="YYYY-MM-DD"
                className="w-full h-11 rounded-lg"
                placeholder={['Entrada', 'Salida']}
                onChange={(dates) => {
                  setSelectedDates(dates as [Dayjs, Dayjs]);
                  form.setFieldsValue({ habitaciones: [] });
                }}
              />
            </Form.Item>

            <Form.Item
              name="ciudad_origen"
              label={<span className="font-semibold text-gray-700">Ciudad de origen</span>}
              rules={[{ required: true, message: 'Requerido' }]}
            >
              <Input prefix={<ClockCircleOutlined className="text-blue-400 rotate-90" />} placeholder="Ej: Caracas, Valencia..." size="large" className="rounded-lg" />
            </Form.Item>

            <Form.Item
              name="pago"
              label={<span className="font-semibold text-gray-700">Comprobante de Pago</span>}
            >
              <Upload {...uploadProps} maxCount={1} listType="picture" className="w-full">
                <Button icon={<UploadOutlined />} size="large" className="w-full h-11 rounded-lg border-dashed text-blue-600 border-blue-200 bg-blue-50/50 hover:bg-blue-50">
                  Subir captura del pago
                </Button>
              </Upload>
            </Form.Item>

            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 mt-6 flex items-start gap-3">
              <ClockCircleOutlined className="text-amber-600 mt-1" />
              <Text className="text-amber-800 text-xs leading-relaxed">
                <strong>Nota:</strong> El check-in estándar es a las 14:00 y el check-out a las 12:00.
              </Text>
            </div>
          </Form>
        )}
      </Modal>

      <style jsx global>{`
        .custom-calendar .ant-picker-calendar-date-content {
          height: 80px !important;
          overflow-y: auto !important;
        }
        .custom-calendar .ant-picker-panel {
          background: white !important;
          border-radius: 12px !important;
        }
        .custom-calendar .ant-picker-calendar-date {
          border-top: 2px solid #f0f0f0 !important;
          margin: 0 !important;
          padding: 8px !important;
        }
        .custom-calendar .ant-picker-calendar-date-today {
          background-color: #f0f7ff !important;
          border-top-color: #1e3a8a !important;
        }
        .booking-modal .ant-modal-content {
          border-radius: 20px !important;
          padding: 24px !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
        }
        .booking-modal .ant-modal-header {
          margin-bottom: 0 !important;
        }
      `}</style>
    </AppLayout>
  );
}
