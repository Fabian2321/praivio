import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, UserEdit, UserX, Shield, Building, 
  Search, Filter, Plus, Edit, Trash2, Eye, EyeOff,
  CheckCircle, AlertCircle, Clock, Lock, Unlock
} from 'lucide-react';
import axios from 'axios';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role_id: '',
    organization_id: '',
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch users, roles, and organizations
      const [usersRes, rolesRes, orgsRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL}/admin/users`),
        axios.get(`${process.env.REACT_APP_API_URL}/admin/roles`),
        axios.get(`${process.env.REACT_APP_API_URL}/admin/organizations`)
      ]);

      setUsers(usersRes.data);
      setRoles(rolesRes.data);
      setOrganizations(orgsRes.data);
    } catch (err) {
      setError('Fehler beim Laden der Daten');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/admin/users`, formData);
      setSuccess('Benutzer erfolgreich erstellt');
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Fehler beim Erstellen des Benutzers');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/admin/users/${selectedUser.id}`, formData);
      setSuccess('Benutzer erfolgreich aktualisiert');
      setShowEditModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Fehler beim Aktualisieren des Benutzers');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Sind Sie sicher, dass Sie diesen Benutzer löschen möchten?')) {
      return;
    }

    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/admin/users/${userId}`);
      setSuccess('Benutzer erfolgreich gelöscht');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Fehler beim Löschen des Benutzers');
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      await axios.patch(`${process.env.REACT_APP_API_URL}/admin/users/${userId}/toggle-status`);
      setSuccess(`Benutzer ${currentStatus ? 'deaktiviert' : 'aktiviert'}`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Fehler beim Ändern des Benutzerstatus');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      role_id: '',
      organization_id: '',
      is_active: true
    });
    setSelectedUser(null);
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email || '',
      password: '',
      role_id: user.role_id,
      organization_id: user.organization_id,
      is_active: user.is_active
    });
    setShowEditModal(true);
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = filterRole === 'all' || user.role_name === filterRole;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && user.is_active) ||
                         (filterStatus === 'inactive' && !user.is_active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleColor = (roleName) => {
    const colors = {
      'admin': 'bg-red-600 text-red-100 border-red-500',
      'manager': 'bg-blue-600 text-blue-100 border-blue-500',
      'user': 'bg-green-600 text-green-100 border-green-500',
      'viewer': 'bg-gray-600 text-gray-100 border-gray-500'
    };
    return colors[roleName] || 'bg-gray-600 text-gray-100 border-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl shadow-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Benutzerverwaltung</h2>
            <p className="text-slate-300">Verwalten Sie Benutzer, Rollen und Berechtigungen</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-lg"
        >
          <UserPlus className="w-4 h-4" />
          <span>Neuer Benutzer</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Benutzer suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">Alle Rollen</option>
            {roles.map(role => (
              <option key={role.id} value={role.name}>{role.name}</option>
            ))}
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">Alle Status</option>
            <option value="active">Aktiv</option>
            <option value="inactive">Inaktiv</option>
          </select>
          
          <div className="text-slate-300 text-sm flex items-center justify-end">
            {filteredUsers.length} von {users.length} Benutzern
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Benutzer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Rolle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Organisation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Letzter Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-white">{user.username}</div>
                        <div className="text-sm text-slate-300">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRoleColor(user.role_name)}`}>
                      {user.role_name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    {user.organization_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      user.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Aktiv
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Inaktiv
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    {user.last_login ? (
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(user.last_login).toLocaleDateString('de-DE')}
                      </div>
                    ) : (
                      <span className="text-slate-500">Nie</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                        title="Bearbeiten"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                        className={`transition-colors ${
                          user.is_active 
                            ? 'text-red-400 hover:text-red-300' 
                            : 'text-green-400 hover:text-green-300'
                        }`}
                        title={user.is_active ? 'Deaktivieren' : 'Aktivieren'}
                      >
                        {user.is_active ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Löschen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <UserModal
          title="Neuen Benutzer erstellen"
          formData={formData}
          setFormData={setFormData}
          roles={roles}
          organizations={organizations}
          onSubmit={handleCreateUser}
          onClose={() => {
            setShowCreateModal(false);
            resetForm();
          }}
          isEdit={false}
        />
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <UserModal
          title="Benutzer bearbeiten"
          formData={formData}
          setFormData={setFormData}
          roles={roles}
          organizations={organizations}
          onSubmit={handleUpdateUser}
          onClose={() => {
            setShowEditModal(false);
            resetForm();
          }}
          isEdit={true}
        />
      )}

      {/* Messages */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg">
          {success}
        </div>
      )}
    </div>
  );
};

// User Modal Component
const UserModal = ({ title, formData, setFormData, roles, organizations, onSubmit, onClose, isEdit }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Benutzername
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              E-Mail
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Passwort {isEdit && '(leer lassen für keine Änderung)'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full px-3 py-2 pr-10 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required={!isEdit}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Rolle
            </label>
            <select
              value={formData.role_id}
              onChange={(e) => setFormData({...formData, role_id: e.target.value})}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="">Rolle auswählen</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Organisation
            </label>
            <select
              value={formData.organization_id}
              onChange={(e) => setFormData({...formData, organization_id: e.target.value})}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="">Organisation auswählen</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
              className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500"
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-slate-300">
              Benutzer ist aktiv
            </label>
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white py-2 px-4 rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200"
            >
              {isEdit ? 'Aktualisieren' : 'Erstellen'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-600 text-white py-2 px-4 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserManagement; 