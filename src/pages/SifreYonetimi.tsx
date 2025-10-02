import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Swal from 'sweetalert2';
interface User {
  id: string;
  username: string;
  // varsa diğer alanlar (ör: email, fullName)
}

const SifreYonetimi: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('/users');
        setUsers(response.data);
      } catch (error) {
        console.error('Kullanıcılar alınamadı:', error);
      }
    };

    fetchUsers();
  }, []);

  const selectedUser = users.find((user) => user.id === selectedUserId);

  const formik = useFormik({
    initialValues: {
      newPassword: '',
      confirmNewPassword: '',
    },
    validationSchema: Yup.object({
      newPassword: Yup.string().required('Yeni şifre gerekli'),
      confirmNewPassword: Yup.string()
        .oneOf([Yup.ref('newPassword')], 'Şifreler uyuşmuyor')
        .required('Tekrar şifre gerekli'),
    }),
    onSubmit: async (values, { resetForm }) => {
      if (!selectedUser) {
        Swal.fire({
          title: 'Uyarı!',
          text: 'Lütfen bir kullanıcı seçin.',
          icon: 'warning',
          confirmButtonText: 'Tamam',
          buttonsStyling: false,
          customClass: {
            popup: 'rounded-xl shadow-lg',
            confirmButton: 'bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600',
          },
        });
        return;
      }

      try {
        await api.put(`/users/${selectedUser.id}`, {
          username: selectedUser.username,
          password: values.newPassword,
          isActive: true,
        });

        Swal.fire({
          title: 'Başarılı!',
          text: 'Şifre başarıyla güncellendi.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          customClass: {
            popup: 'rounded-xl shadow-lg',
            title: 'text-lg font-bold',
          },
        });

        resetForm();
      } catch (error) {
        console.error('Şifre güncelleme hatası:', error);

        Swal.fire({
          title: 'Hata!',
          text: 'Şifre güncellenemedi. Lütfen tekrar deneyin.',
          icon: 'error',
          confirmButtonText: 'Tamam',
          buttonsStyling: false,
          customClass: {
            popup: 'rounded-xl shadow-lg',
            confirmButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700',
          },
        });
      }
    },

  });

  return (
    <Layout>
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow space-y-6">
        <h1 className="text-2xl font-bold">Kullanıcı Şifresi Değiştir</h1>
        <div className="mb-4">
          <label className="block font-semibold mb-1">Kullanıcı Seç</label>
          <select
            value={selectedUserId ?? ''}
            onChange={(e) => setSelectedUserId(e.target.value || null)}
            className="w-full border rounded-md p-2"
          >
            <option value="">-- Kullanıcı Seçin --</option>
            {users.map((user) => (
              <option key={user.id} value={user.id.toString()}>
                {user.username}
              </option>
            ))}
          </select>
        </div>

        {selectedUser && (
          <form onSubmit={formik.handleSubmit} className="space-y-6">
            <table className="w-full table-auto border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Kullanıcı Adı</th>
                  <th className="border p-2 text-left">Yeni Şifre</th>
                  <th className="border p-2 text-left">Yeni Şifre (Tekrar)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-2 bg-gray-50">{selectedUser.username}</td>
                  <td className="border p-2">
                    <input
                      type="password"
                      name="newPassword"
                      value={formik.values.newPassword}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className="w-full border rounded p-1"
                      placeholder="Yeni şifre"
                    />
                    {formik.touched.newPassword && formik.errors.newPassword && (
                      <div className="text-red-500 text-sm">{formik.errors.newPassword}</div>
                    )}
                  </td>
                  <td className="border p-2">
                    <input
                      type="password"
                      name="confirmNewPassword"
                      value={formik.values.confirmNewPassword}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className="w-full border rounded p-1"
                      placeholder="Yeni şifre tekrar"
                    />
                    {formik.touched.confirmNewPassword && formik.errors.confirmNewPassword && (
                      <div className="text-red-500 text-sm">{formik.errors.confirmNewPassword}</div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="text-right">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
              >
                Şifreyi Güncelle
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
};

export default SifreYonetimi;
