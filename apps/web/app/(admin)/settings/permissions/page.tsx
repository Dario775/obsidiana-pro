'use client';

import React, { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: {
    sales_invoice: boolean;
    sales_cancel: boolean;
    sales_discount: boolean;
    cash_open: boolean;
    cash_drawer: boolean;
    cash_close: boolean;
    [key: string]: boolean;
  };
  created_at: string;
}

export default function PermissionsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // Selected user edit form state
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('member');
  const [editPermissions, setEditPermissions] = useState({
    sales_invoice: true,
    sales_cancel: false,
    sales_discount: false,
    cash_open: true,
    cash_drawer: false,
    cash_close: true,
  });

  // Create new user form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('member');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (res.ok) {
        const loadedUsers = data.users || [];
        setUsers(loadedUsers);
        // Automatically select first user
        if (loadedUsers.length > 0) {
          handleSelectUser(loadedUsers[0]);
        }
      } else {
        setError(data.error || 'Error al obtener usuarios');
      }
    } catch (err) {
      setError('Error de red al cargar los usuarios');
    } finally {
      setLoading(false);
    }
  }

  function handleSelectUser(user: User) {
    setSelectedUserId(user.id);
    setEditName(user.name);
    setEditRole(user.role);
    setEditPermissions({
      sales_invoice: user.permissions?.sales_invoice ?? true,
      sales_cancel: user.permissions?.sales_cancel ?? false,
      sales_discount: user.permissions?.sales_discount ?? false,
      cash_open: user.permissions?.cash_open ?? true,
      cash_drawer: user.permissions?.cash_drawer ?? false,
      cash_close: user.permissions?.cash_close ?? true,
    });
    setError(null);
    setSuccess(null);
  }

  const selectedUser = users.find(u => u.id === selectedUserId);
  const isOwner = selectedUser?.role === 'owner';
  const createdSubUsersCount = users.filter(u => u.role !== 'owner').length;
  const isLimitReached = createdSubUsersCount >= 5;

  async function handleSavePermissions() {
    if (!selectedUserId) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          name: editName,
          role: editRole,
          permissions: editPermissions,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Permisos actualizados correctamente');
        // Update local state
        setUsers(prev =>
          prev.map(u =>
            u.id === selectedUserId
              ? { ...u, name: editName, role: editRole, permissions: editPermissions }
              : u
          )
        );
      } else {
        setError(data.error || 'Error al actualizar permisos');
      }
    } catch (err) {
      setError('Error de conexión al servidor');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail || !newPassword || !newName) {
      setError('Por favor completa todos los campos del nuevo usuario');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          name: newName,
          role: newRole,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Usuario ${newName} creado correctamente`);
        const newUser = data.user;
        setUsers(prev => [...prev, newUser]);
        handleSelectUser(newUser);
        setShowCreateModal(false);
        // Clear modal form
        setNewEmail('');
        setNewPassword('');
        setNewName('');
        setNewRole('member');
      } else {
        setError(data.error || 'Error al crear usuario');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteUser(userId: string) {
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) return;
    if (userToDelete.role === 'owner') {
      alert('No se puede eliminar al propietario principal.');
      return;
    }
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente a ${userToDelete.name}?`)) {
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/users?userId=${userId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Usuario eliminado exitosamente');
        const remainingUsers = users.filter(u => u.id !== userId);
        setUsers(remainingUsers);
        if (selectedUserId === userId) {
          const nextUser = remainingUsers[0];
          if (nextUser) {
            handleSelectUser(nextUser);
          } else {
            setSelectedUserId(null);
          }
        }
      } else {
        setError(data.error || 'Error al eliminar usuario');
      }
    } catch (err) {
      setError('Error de red al intentar eliminar');
    } finally {
      setSubmitting(false);
    }
  }

  function handleTogglePermission(key: string) {
    if (isOwner) return; // Owner has full permissions and cannot be modified
    setEditPermissions(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof editPermissions],
    }));
  }

  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-8 pb-32">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl -ml-32 -mt-32 pointer-events-none group-hover:bg-secondary/10 transition-all duration-1000"></div>
        
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-zinc-600 font-black text-[9px] uppercase tracking-[0.2em]">
            <span className="hover:text-secondary transition-colors cursor-pointer">Configuración</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-white">Usuarios y Permisos</span>
          </div>
          <h1 className="font-headline-xl text-3xl font-black text-white tracking-tight">Accesos y Permisos</h1>
          <p className="text-zinc-500 font-body-sm text-sm max-w-2xl">
            Crea personal operativo y define de forma precisa los accesos de ventas y caja para cada uno. Límite de 5 usuarios adicionales.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => !isLimitReached && setShowCreateModal(true)}
            disabled={isLimitReached || submitting}
            className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg flex items-center gap-2 transition-all active:scale-95 group ${
              isLimitReached
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-white/5'
                : 'bg-secondary text-white hover:brightness-110 shadow-[0_0_20px_rgba(var(--secondary),0.3)]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px] group-hover:scale-110 transition-transform">person_add</span>
            Crear Usuario ({createdSubUsersCount}/5)
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3 text-sm">
          <span className="material-symbols-outlined">error</span>
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl flex items-center gap-3 text-sm">
          <span className="material-symbols-outlined">check_circle</span>
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-secondary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Left Column: Users List */}
          <div className="xl:col-span-4 flex flex-col gap-6">
            <div className="bg-[#1A1A1A] rounded-3xl border border-white/10 p-6 flex flex-col gap-4">
              <h3 className="font-black text-xs text-white uppercase tracking-widest border-b border-white/5 pb-3">
                Usuarios ({users.length})
              </h3>
              
              <div className="flex flex-col gap-2 max-h-[550px] overflow-y-auto pr-1">
                {users.map(u => {
                  const isSelected = u.id === selectedUserId;
                  const isUserOwner = u.role === 'owner';
                  
                  return (
                    <div
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group ${
                        isSelected
                          ? 'bg-secondary/10 border-secondary shadow-[0_0_15px_rgba(var(--secondary),0.15)]'
                          : 'bg-zinc-900/50 border-white/5 hover:border-white/10 hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                          isUserOwner 
                            ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' 
                            : 'bg-secondary/10 text-secondary border border-secondary/20'
                        }`}>
                          {u.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white group-hover:text-secondary transition-colors">
                            {u.name}
                          </span>
                          <span className="text-[10px] text-zinc-500 truncate max-w-[150px]">
                            {u.email}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <span className={`px-2 py-0.5 rounded-full font-black text-[8px] uppercase tracking-widest ${
                          isUserOwner
                            ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                            : 'bg-zinc-800 text-zinc-400 border border-white/5'
                        }`}>
                          {isUserOwner ? 'Owner' : u.role}
                        </span>

                        {!isUserOwner && (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            disabled={submitting}
                            className="w-8 h-8 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-zinc-600 flex items-center justify-center transition-all active:scale-90"
                            title="Eliminar usuario"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {users.length === 0 && (
                  <div className="text-center py-8 text-zinc-600 font-bold text-xs uppercase">
                    No hay usuarios cargados
                  </div>
                )}
              </div>
            </div>
            
            {/* Limit Indicator Card */}
            <div className="bg-[#1A1A1A] rounded-3xl p-6 border border-white/10 flex flex-col gap-4">
              <div className="flex justify-between items-center text-xs font-bold text-white">
                <span className="uppercase tracking-widest text-[10px]">Cupo de Usuarios</span>
                <span className="font-data-tabular">{createdSubUsersCount} / 5</span>
              </div>
              <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-white/5">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    createdSubUsersCount >= 5 ? 'bg-red-500' : 'bg-secondary'
                  }`}
                  style={{ width: `${(createdSubUsersCount / 5) * 100}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">
                El plan permite registrar hasta 5 miembros de staff adicionales para venta o caja. El administrador principal (propietario) no cuenta en el cupo.
              </p>
            </div>
          </div>

          {/* Right Column: User Details and Permissions Editor */}
          <div className="xl:col-span-8 flex flex-col gap-8">
            {selectedUser ? (
              <div className="flex flex-col gap-8">
                {/* Selected User Header */}
                <div className="bg-[#1A1A1A] rounded-3xl border border-white/10 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary text-lg font-black">
                      {editName.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {isOwner ? (
                          <span className="font-bold text-white text-lg">{editName}</span>
                        ) : (
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="bg-transparent border-b border-zinc-800 hover:border-zinc-600 focus:border-secondary text-white text-lg font-bold focus:outline-none transition-colors"
                          />
                        )}
                        {isOwner && (
                          <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-black text-[8px] uppercase tracking-widest">
                            Propietario
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-zinc-500">{selectedUser.email}</span>
                    </div>
                  </div>

                  {!isOwner && (
                    <div className="flex items-center gap-3">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Rol:</label>
                      <select
                        value={editRole}
                        onChange={e => setEditRole(e.target.value)}
                        className="bg-zinc-900 border border-white/5 rounded-xl px-4 py-2 text-white font-bold text-xs focus:outline-none focus:border-secondary transition-all cursor-pointer"
                      >
                        <option value="member">Miembro</option>
                        <option value="cajero">Cajero</option>
                        <option value="vendedor">Vendedor</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                  )}
                </div>

                {isOwner && (
                  <div className="bg-yellow-500/5 border border-yellow-500/20 text-yellow-400/80 p-5 rounded-3xl flex items-start gap-4">
                    <span className="material-symbols-outlined text-xl mt-0.5">info</span>
                    <div>
                      <h4 className="font-bold text-sm text-yellow-400 mb-1">Acceso Completo Activo</h4>
                      <p className="text-[11px] font-medium leading-relaxed">
                        Como propietario general del negocio, este usuario cuenta con permisos de administrador irrestrictos sobre todas las secciones operativas, de caja y facturación.
                      </p>
                    </div>
                  </div>
                )}

                {/* Main Permissions Panels */}
                <div className="flex flex-col gap-8 opacity-100">
                  {[
                    {
                      title: 'Ventas y Facturación',
                      icon: 'receipt_long',
                      items: [
                        { key: 'sales_invoice', label: 'Emitir Factura A/B/C', desc: 'Permite generar facturas comerciales y comprobantes fiscales.' },
                        { key: 'sales_cancel', label: 'Anular Ticket / Venta', desc: 'Permite cancelar transacciones o borrar tickets del historial.' },
                        { key: 'sales_discount', label: 'Realizar Descuentos > 10%', desc: 'Permite aplicar rebajas y descuentos mayores al 10% en el POS.' },
                      ]
                    },
                    {
                      title: 'Operaciones de Caja',
                      icon: 'point_of_sale',
                      items: [
                        { key: 'cash_open', label: 'Apertura y Arqueo Inicial', desc: 'Permite habilitar y contar fondos iniciales para abrir un turno de caja.' },
                        { key: 'cash_drawer', label: 'Abrir Cajón Monedero', desc: 'Permite la apertura manual del cajón físico sin registrar venta.' },
                        { key: 'cash_close', label: 'Ejecutar Cierre Z / Caja', desc: 'Permite realizar cierres de turno y balances de caja definitivos.' },
                      ]
                    }
                  ].map((section, i) => (
                    <div key={i} className="bg-[#1A1A1A] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                      <div className="p-6 border-b border-white/5 bg-[#1E1E1E]/50 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-secondary">
                            <span className="material-symbols-outlined">{section.icon}</span>
                          </div>
                          <h3 className="font-black text-sm text-white uppercase tracking-widest">{section.title}</h3>
                        </div>
                      </div>
                      <div className="divide-y divide-white/5">
                        {section.items.map((item, j) => {
                          const isChecked = isOwner ? true : editPermissions[item.key as keyof typeof editPermissions];
                          return (
                            <div 
                              key={j} 
                              onClick={() => !isOwner && handleTogglePermission(item.key)}
                              className={`flex items-center justify-between p-6 transition-colors group ${
                                isOwner ? 'cursor-default' : 'cursor-pointer hover:bg-white/[0.01]'
                              }`}
                            >
                              <div className="flex-1 pr-8">
                                <h4 className="font-bold text-sm text-white group-hover:text-secondary transition-colors">
                                  {item.label}
                                </h4>
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">
                                  {item.desc}
                                </p>
                              </div>
                              <div className="relative inline-flex items-center cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={isChecked}
                                  onChange={() => {}} // Controlled via parent click
                                  disabled={isOwner}
                                  className="sr-only peer" 
                                />
                                <div className="w-11 h-6 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary peer-disabled:opacity-50"></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Save Changes Action */}
                {!isOwner && (
                  <div className="flex justify-end gap-3">
                    <button 
                      onClick={() => handleSelectUser(selectedUser)}
                      disabled={submitting}
                      className="px-6 py-3 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[18px]">undo</span>
                      Descartar
                    </button>
                    <button 
                      onClick={handleSavePermissions}
                      disabled={submitting}
                      className="px-8 py-3 rounded-xl bg-secondary text-white hover:brightness-110 transition-all font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(var(--secondary),0.3)] flex items-center gap-2 active:scale-95 group"
                    >
                      <span className="material-symbols-outlined text-[18px] group-hover:scale-110 transition-transform">save</span>
                      {submitting ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#1A1A1A] rounded-3xl border border-white/10 p-20 flex flex-col items-center justify-center text-center gap-4">
                <span className="material-symbols-outlined text-4xl text-zinc-700">group</span>
                <p className="font-bold text-zinc-500 uppercase tracking-widest text-xs">
                  Selecciona o crea un usuario para configurar sus permisos de acceso
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            onClick={() => !submitting && setShowCreateModal(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          ></div>
          
          {/* Modal Content */}
          <div className="relative z-10 bg-[#1A1A1A] border border-white/10 rounded-3xl w-full max-w-md p-8 shadow-2xl flex flex-col gap-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h3 className="font-black text-sm text-white uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">person_add</span>
                Crear Nuevo Usuario
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                disabled={submitting}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Martín Gómez"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-secondary transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Email de Acceso</label>
                <input
                  type="email"
                  required
                  placeholder="ej. martin@obsidiana.com"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-secondary transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Contraseña (Mín. 8 caracteres)</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-secondary transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Rol Inicial</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className="bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-secondary transition-all cursor-pointer"
                >
                  <option value="cajero">Cajero</option>
                  <option value="vendedor">Vendedor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-4 border-t border-white/5 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 font-black text-[9px] uppercase tracking-widest transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-secondary text-white hover:brightness-110 font-black text-[9px] uppercase tracking-widest shadow-lg shadow-[0_0_15px_rgba(var(--secondary),0.2)] transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  {submitting ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
