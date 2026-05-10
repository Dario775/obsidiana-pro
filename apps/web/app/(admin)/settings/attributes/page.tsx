'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/use-tenant';

interface AttributeOption {
  id?: string;
  value: string;
  slug: string;
  color?: string;
  sort_order: number;
}

interface ProductAttribute {
  id?: string;
  name: string;
  slug: string;
  type: 'select' | 'color' | 'text';
  is_required: boolean;
  sort_order: number;
  options?: AttributeOption[];
}

export default function AttributesPage() {
  const { tenant } = useTenant();
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<ProductAttribute | null>(null);
  const [newOption, setNewOption] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    type: 'select',
    is_required: false,
  });

  useEffect(() => {
    if (tenant?.id) fetchAttributes();
  }, [tenant?.id]);

  async function fetchAttributes() {
    if (!tenant?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('product_attributes')
      .select('*, product_attribute_options(*)')
      .eq('tenant_id', tenant.id)
      .order('sort_order');
    
    if (data) {
      const formatted = data.map((a: any) => ({
        id: a.id,
        name: a.name,
        slug: a.slug,
        type: a.type,
        is_required: a.is_required,
        sort_order: a.sort_order,
        options: (a.product_attribute_options || []).sort((o1: any, o2: any) => o1.sort_order - o2.sort_order).map((o: any) => ({
          id: o.id,
          value: o.value,
          slug: o.slug,
          color: o.color,
          sort_order: o.sort_order,
        })),
      }));
      setAttributes(formatted);
    }
    setLoading(false);
  }

  async function handleSaveAttribute() {
    if (!tenant?.id || !formData.name) return;
    setSaving(true);

    const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    
    const attributeData = {
      tenant_id: tenant.id,
      name: formData.name,
      slug,
      type: formData.type,
      is_required: formData.is_required,
      sort_order: attributes.length,
    };

    let attributeId = editingAttribute?.id;

    if (editingAttribute?.id) {
      await supabase.from('product_attributes').update(attributeData).eq('id', editingAttribute.id);
    } else {
      const { data } = await supabase.from('product_attributes').insert(attributeData).select().single();
      attributeId = data?.id;
    }

    setSaving(false);
    setShowModal(false);
    resetForm();
    fetchAttributes();
  }

  async function handleDeleteAttribute(id: string) {
    if (!confirm('¿Eliminar este atributo? También se eliminarán todas sus opciones.')) return;
    await supabase.from('product_attributes').delete().eq('id', id);
    fetchAttributes();
  }

  async function handleAddOption(attributeId: string) {
    if (!newOption.trim()) return;
    const slug = newOption.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    
    await supabase.from('product_attribute_options').insert({
      attribute_id: attributeId,
      value: newOption,
      slug,
      sort_order: 0,
    });
    
    setNewOption('');
    fetchAttributes();
  }

  async function handleDeleteOption(optionId: string) {
    await supabase.from('product_attribute_options').delete().eq('id', optionId);
    fetchAttributes();
  }

  function resetForm() {
    setFormData({ name: '', slug: '', type: 'select', is_required: false });
    setEditingAttribute(null);
  }

  function openEditModal(attr?: ProductAttribute) {
    if (attr) {
      setEditingAttribute(attr);
      setFormData({
        name: attr.name,
        slug: attr.slug,
        type: attr.type,
        is_required: attr.is_required,
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-8 pb-32">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Atributos de Producto</h1>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
            Define variantes como tallas, colores y materiales
          </p>
        </div>
        <button
          onClick={() => openEditModal()}
          className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl font-bold text-xs uppercase flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          Nuevo Atributo
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-zinc-500">Cargando...</div>
      ) : attributes.length === 0 ? (
        <div className="bg-zinc-900 border border-white/5 rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-zinc-600 mb-2">layers</span>
          <p className="text-zinc-500 text-sm">No hay atributos configurados</p>
          <p className="text-zinc-600 text-xs mt-1">Crea atributos como Talla, Color, Material</p>
        </div>
      ) : (
        <div className="space-y-4">
          {attributes.map((attr) => (
            <div key={attr.id} className="bg-zinc-900 border border-white/5 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    attr.type === 'color' ? 'bg-gradient-to-br from-pink-500 to-violet-500' : 'bg-zinc-800'
                  }`}>
                    <span className="material-symbols-outlined text-white">
                      {attr.type === 'color' ? 'palette' : attr.type === 'text' ? 'text_fields' : 'checklist'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{attr.name}</h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase">
                      {attr.type} • {attr.is_required ? 'Obligatorio' : 'Opcional'} • {attr.options?.length || 0} opciones
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(attr)}
                    className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteAttribute(attr.id!)}
                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {attr.options?.map((opt) => (
                  <div
                    key={opt.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-lg group"
                  >
                    {attr.type === 'color' && opt.color && (
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: opt.color }} />
                    )}
                    <span className="text-xs font-medium text-white">{opt.value}</span>
                    <button
                      onClick={() => handleDeleteOption(opt.id!)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-all"
                    >
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                  </div>
                ))}

                {attr.type === 'select' && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddOption(attr.id!)}
                      placeholder="Agregar opción..."
                      className="px-3 py-1.5 bg-zinc-950 border border-white/10 rounded-lg text-xs text-white placeholder:text-zinc-600 focus:border-emerald-500/50 outline-none w-32"
                    />
                    <button
                      onClick={() => handleAddOption(attr.id!)}
                      className="p-1.5 text-zinc-500 hover:text-emerald-400 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-black text-white uppercase mb-4">
              {editingAttribute ? 'Editar Atributo' : 'Nuevo Atributo'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase">Nombre</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Talla, Color, Material"
                  className="w-full mt-1 bg-zinc-950 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-emerald-500/50 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase">Tipo</label>
                <div className="flex gap-2 mt-2">
                  {['select', 'color', 'text'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setFormData({ ...formData, type })}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase ${
                        formData.type === type
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-400 border border-white/10'
                      }`}
                    >
                      {type === 'select' ? 'Selección' : type === 'color' ? 'Color' : 'Texto'}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_required}
                  onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                  className="w-4 h-4 rounded bg-zinc-800 border-white/20"
                />
                <span className="text-sm text-zinc-400">Campo obligatorio</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="flex-1 py-3 bg-zinc-900 border border-white/10 rounded-xl text-zinc-400 font-bold text-xs uppercase"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAttribute}
                disabled={saving || !formData.name}
                className="flex-1 py-3 bg-emerald-500 rounded-xl text-white font-bold text-xs uppercase disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}