'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTenant } from '../hooks/use-tenant';
import { useAuth } from './auth-provider';
import { supabase } from '../lib/supabase';

interface Message {
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export function ChatbotAssistant() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [productCount, setProductCount] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch product count to show dynamic tenant usage
  useEffect(() => {
    async function loadStats() {
      if (!tenant?.id) return;
      try {
        const { count } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id);
        if (count !== null) setProductCount(count);
      } catch (err) {
        console.error('Error loading stats for bot:', err);
      }
    }
    loadStats();
  }, [tenant]);

  // Initial welcome message
  useEffect(() => {
    if (tenant && messages.length === 0) {
      setMessages([
        {
          sender: 'bot',
          text: `¡Hola! 👋 Soy tu asistente experto de **Obsidiana**. \n\nEstoy listo para ayudarte a administrar **${tenant.nombre}**. ¿En qué puedo colaborar hoy?`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [tenant, messages.length]);

  const handleResetConversation = () => {
    if (tenant) {
      setMessages([
        {
          sender: 'bot',
          text: `¡Hola! 👋 Soy tu asistente experto de **Obsidiana**. \n\nEstoy listo para ayudarte a administrar **${tenant.nombre}**. ¿En qué puedo colaborar hoy?`,
          timestamp: new Date(),
        },
      ]);
    } else {
      setMessages([]);
    }
    setIsTyping(false);
  };

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const getKnowledgeAnswer = (query: string): string => {
    const q = query.toLowerCase();

    // Context variables
    const storeName = tenant?.nombre || 'tu comercio';
    const activePlan = tenant?.plan_id ? tenant.plan_id.toUpperCase() : 'FREE';
    const subStatus = tenant?.subscription_status === 'active' ? 'Activa ●' : 'Inactiva / Expirada ⚠';
    const maxProducts = activePlan === 'PRO' ? 'Ilimitados' : '50';
    const maxBranches = activePlan === 'PRO' ? 'Ilimitadas' : '1';
    const currentProducts = productCount !== null ? productCount : '0';

    if (q.includes('plan') || q.includes('suscripcion') || q.includes('billing') || q.includes('pagar plan') || q.includes('precio')) {
      return `Tu negocio **${storeName}** está utilizando el **Plan ${activePlan}** (${subStatus}).\n\n` +
        `**Detalle del plan:**\n` +
        `• **Productos:** Tenés cargados ${currentProducts} de ${maxProducts} permitidos.\n` +
        `• **Sucursales:** 1 sucursal activa de ${maxBranches} permitidas.\n\n` +
        `Si querés cambiar tu plan o realizar un pago, podés ingresar a la opción de **Ajustes Globales** en la parte inferior del menú lateral y dirigirte a la pestaña de Suscripciones.`;
    }

    if (q.includes('mercado libre') || q.includes('mercadolibre') || q.includes('meli') || q.includes('importar') || q.includes('sincroniz')) {
      return `¡Podés copiar productos de Mercado Libre directamente a tu catálogo en segundos! 🛒\n\n` +
        `**Cómo hacerlo:**\n` +
        `1. Entrá a **Catálogo Web** en el menú lateral.\n` +
        `2. Copiá el link (URL) de la publicación de Mercado Libre que quieras copiar.\n` +
        `3. Pegá el link en el importador y presioná **Buscar**.\n` +
        `4. Revisá que el título, descripción, fotos y variantes de talles/colores estén correctos, y presioná **Importar Producto**.\n\n` +
        `¡Listo! El producto se guardará automáticamente en tu inventario listo para vender.`;
    }

    if (q.includes('caja') || q.includes('cierre') || q.includes('arqueo') || q.includes('ventas') || q.includes('cajero') || q.includes('apertura')) {
      return `Para abrir o cerrar tu caja, seguí estos pasos sencillos:\n\n` +
        `1. **Apertura de Caja**: Dirigite a **Terminal POS** en el menú lateral. Si la caja está cerrada, el sistema te solicitará ingresar el *Nombre de la Caja* (ej: Caja Principal) y el *Monto Inicial* de dinero en efectivo con el que comenzás tu turno.\n` +
        `2. **Operar Ventas**: Una vez abierta, podés registrar tus ventas normalmente.\n` +
        `3. **Cierre de Caja**: Al finalizar tu turno, hacé click en **Cierre de Caja (Z)** en el menú lateral. Ingresá el monto de efectivo real que tenés físicamente en el cajón y presioná **Confirmar y Cerrar Caja** para ver si hay diferencias y descargar o imprimir tu ticket de cierre.\n` +
        `4. **Ver Historial**: Podés consultar cierres anteriores y auditorías desde **Historial de Caja** en el menú lateral.`;
    }

    if (q.includes('stock') || q.includes('critico') || q.includes('inventario') || q.includes('kardex')) {
      return `**Control de Inventario en Obsidiana:**\n\n` +
        `• **Actualizar Inventario**: Podés ver y modificar tus existencias desde la opción **Inventario** en el menú lateral.\n` +
        `• **Alertas de Stock**: Cada vez que un producto tenga pocas unidades, verás un aviso en tu panel para reponer stock a tiempo.\n` +
        `• **Historial de Movimientos**: Todas las ventas y modificaciones de stock se guardan con fecha, hora y el nombre de la persona que las realizó, garantizando transparencia.`;
    }

    if (q.includes('cliente') || q.includes('cuenta corriente') || q.includes('deuda') || q.includes('fiar')) {
      return `**Manejo de Cuentas Corrientes (Fiar):**\n\n` +
        `• **Registrar Clientes**: Desde la sección **Clientes** en el menú lateral podés cargar tus clientes frecuentes y asignarles un *Límite de Crédito* máximo.\n` +
        `• **Vender a Crédito (Fiar)**: En la **Terminal POS**, seleccioná el cliente en el buscador del carrito, activá la opción **Crédito** en los métodos de pago y confirmá la venta. La deuda se registrará automáticamente en su cuenta corriente.\n` +
        `• **Ver Estados de Cuenta**: Entrando a la ficha del cliente en el menú **Clientes**, podés ver cuánto te debe, imprimir su estado de cuenta o registrar entregas de dinero para saldar su deuda.`;
    }

    if (q.includes('whatsapp') || q.includes('tienda online') || q.includes('ecommerce') || q.includes('dominio')) {
      return `**Tu Tienda Online y WhatsApp:**\n\n` +
        `• **Catálogo en Vivo**: Tus clientes pueden ingresar a tu tienda online desde cualquier celular o computadora para ver tus productos y precios actualizados en tiempo real.\n` +
        `• **Pedidos por WhatsApp**: Tus clientes seleccionan lo que desean comprar, completan sus datos de envío y el pedido te llega directamente a tu **WhatsApp** con el detalle listo para preparar.\n` +
        `• **Personalización**: Podés cambiar los colores de tu tienda y subir tu logo desde la opción **Personalización** en el menú lateral.\n` +
        `• **Dominio Propio**: Si querés usar una dirección web personalizada (ej: \`www.tunegocio.com\`), podés solicitarlo ingresando a **Personalización** (disponible para el Plan PRO).`;
    }

    if (q.includes('ayuda') || q.includes('soporte') || q.includes('asistencia') || q.includes('contacto') || q.includes('error')) {
      return `Si necesitás ayuda o tenés alguna duda con el sistema, escribinos:\n\n` +
        `• **Correo electrónico**: ayuda@obsidiana.com.ar\n` +
        `• **WhatsApp de Soporte**: Escribinos para chatear directamente con uno de nuestros técnicos haciendo click en la opción de soporte del sistema.\n` +
        `• *Atendemos consultas de Lunes a Viernes de 9:00 a 18:00 hs.*`;
    }

    // Default reply summarizing index
    return `No estoy del todo seguro sobre esa consulta. Como asistente de **${storeName}**, te sugiero consultar sobre:\n\n` +
      `• **Plan**: Ver tu suscripción activa y límites.\n` +
      `• **Mercado Libre**: Cómo copiar productos usando un enlace.\n` +
      `• **Caja**: Cómo operar arqueos y cierres de turno.\n` +
      `• **Inventario**: Alertas de poco stock y control de existencias.\n` +
      `• **Fiar / Crédito**: Ventas a crédito y deudas de clientes.\n` +
      `• **Soporte**: Datos de contacto y asistencia directa.`;
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      sender: 'user',
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Simulate bot answering with micro-delay
    setTimeout(() => {
      const answer = getKnowledgeAnswer(text);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: answer,
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
    }, 850);
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-6 bottom-20 lg:bottom-8 lg:right-8 z-50 w-14 h-14 bg-violet-600 hover:bg-violet-500 hover:scale-110 active:scale-95 text-white rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(109,40,217,0.5)] transition-all duration-300 border border-violet-400/30"
        title="Asistente de Obsidiana"
      >
        <span className="material-symbols-outlined text-[28px] animate-pulse">
          {isOpen ? 'close' : 'forum'}
        </span>
      </button>

      {/* Expanded Chat Dialog */}
      {isOpen && (
        <div className="fixed right-6 bottom-36 lg:bottom-24 lg:right-8 w-[92%] max-w-sm h-[520px] bg-zinc-900/95 border border-white/10 backdrop-blur-md text-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 flex flex-col font-inter overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="bg-zinc-950/60 p-4 border-b border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">smart_toy</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-black uppercase tracking-wider text-white">Soporte Obsidiana</h3>
              <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-1 mt-0.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                Agente Experto Online
              </p>
            </div>
            <button
              onClick={handleResetConversation}
              className="p-2 hover:bg-white/5 active:scale-95 rounded-xl text-zinc-400 hover:text-red-400 transition-all flex items-center justify-center"
              title="Borrar chat y empezar nueva conversación"
            >
              <span className="material-symbols-outlined text-[20px]">delete_sweep</span>
            </button>
          </div>

          {/* Chat Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-violet-600 text-white rounded-br-none self-end font-semibold'
                    : 'bg-zinc-950/60 border border-white/5 text-zinc-200 rounded-bl-none self-start whitespace-pre-line font-medium'
                }`}
              >
                {msg.text}
              </div>
            ))}

            {isTyping && (
              <div className="bg-zinc-950/60 border border-white/5 text-zinc-400 rounded-2xl rounded-bl-none p-3.5 text-xs self-start flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Panel */}
          {messages.length === 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              <button
                onClick={() => handleSendMessage('¿Cuál es mi plan activo?')}
                className="bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 text-[10px] px-2.5 py-1.5 rounded-full font-bold transition-all text-left"
              >
                📊 Mi Plan
              </button>
              <button
                onClick={() => handleSendMessage('¿Cómo importar productos de Mercado Libre?')}
                className="bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 text-[10px] px-2.5 py-1.5 rounded-full font-bold transition-all text-left"
              >
                🛒 Mercado Libre
              </button>
              <button
                onClick={() => handleSendMessage('¿Cómo hacer el arqueo de caja?')}
                className="bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 text-[10px] px-2.5 py-1.5 rounded-full font-bold transition-all text-left"
              >
                🚪 Cierre Caja
              </button>
            </div>
          )}

          {/* Chat Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
            className="p-3 border-t border-white/5 bg-zinc-950/60 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Escribí tu consulta aquí..."
              className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors font-medium"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white flex items-center justify-center transition-all shrink-0 active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
