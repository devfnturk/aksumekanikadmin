import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import Layout from '../components/Layout';
import api from '../api';
import { useFormik, FormikProps } from 'formik';
import * as Yup from 'yup';
import Swal from 'sweetalert2';
import { useLoading } from '../contexts/LoadingContext';

// --- Tipler ---
interface User {
  id: string;
  username:string;
}

interface FormValues {
  newPassword: string;
  confirmNewPassword: string;
}

// --- Alt Bileşen (Performans için ayrıştırıldı) ---

interface PasswordUpdateFormProps {
  user: User;
  formik: FormikProps<FormValues>;
}

const PasswordUpdateForm: React.FC<PasswordUpdateFormProps> = memo(({ user, formik }) => {
  return (
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
            <td className="border p-2 bg-gray-50">{user.username}</td>
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
  );
});
PasswordUpdateForm.displayName = 'PasswordUpdateForm';

// --- Ana Bileşen ---
const SifreYonetimi: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { showLoading, hideLoading } = useLoading();

  const fetchUsers = useCallback(async () => {
    showLoading();
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Kullanıcılar alınamadı:', error);
      Swal.fire('Hata', 'Kullanıcı listesi yüklenemedi.', 'error');
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // OPTIMIZATION: selectedUser'ı her render'da hesaplamak yerine useMemo ile hafızaya alıyoruz.
  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId),
    [users, selectedUserId]
  );

  const formik = useFormik<FormValues>({
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
        Swal.fire('Uyarı!', 'Lütfen bir kullanıcı seçin.', 'warning');
        return;
      }
      
      showLoading();
      try {
        await api.put(`/users/${selectedUser.id}`, {
          username: selectedUser.username,
          password: values.newPassword,
          isActive: true, // Bu alanın backend tarafından beklendiğini varsayıyoruz.
        });

        Swal.fire('Başarılı!', 'Şifre başarıyla güncellendi.', 'success');
        resetForm();
        // İsteğe bağlı: Şifre güncellendikten sonra kullanıcı seçimini temizleyebilirsin.
        // setSelectedUserId(null); 
      } catch (error) {
        console.error('Şifre güncelleme hatası:', error);
        Swal.fire('Hata!', 'Şifre güncellenemedi. Lütfen tekrar deneyin.', 'error');
      } finally {
        hideLoading();
      }
    },
  });

  // Kullanıcı değiştiğinde formu temizle
  useEffect(() => {
    formik.resetForm();
  }, [selectedUserId, formik]); // <-- DÜZELTME BURADA YAPILDI

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
              <option key={user.id} value={user.id}>
                {user.username}
              </option>
            ))}
          </select>
        </div>
        
        {/* OPTIMIZATION: Formu ayrı bir bileşene taşıdık */}
        {selectedUser && <PasswordUpdateForm user={selectedUser} formik={formik} />}
      </div>
    </Layout>
  );
};

export default SifreYonetimi;