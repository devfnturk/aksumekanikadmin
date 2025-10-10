import React, { useEffect, useState, useCallback, memo } from 'react';
import Layout from '../components/Layout';
import api from '../api';
import { useFormik, FormikProps } from 'formik';
import Swal from 'sweetalert2';
import 'react-toastify/dist/ReactToastify.css';
import { useLoading } from '../contexts/LoadingContext'; // useLoading hook'u import edildi
import Modal from '../components/Modal';
import TextModalContent from '../components/TextModalContent';

// --- Tipler ---
type Brand = {
  id: string;
  title: string;
};

type FieldOfActivity = {
  id: string;
  title: string;
};

type Section = {
  id: string;
  brands: Brand[];
  fieldOfActivity: FieldOfActivity[];
};

interface FormValues {
  brandId: string;
  fieldOfActivity: string;
}

// --- Alt Bileşenlerin Prop Tipleri ---
interface BrandActivityFormProps {
  formik: FormikProps<FormValues>;
  brands: Brand[];
  fieldOfActivity: FieldOfActivity[];
  editId: string | null;
  isFormOpen: boolean;
}

interface BrandActivityTableProps {
  sections: Section[];
  handleEdit: (section: Section) => void;
  handleDelete: (id: string) => void;
  openTextModalWithContent: (content: string) => void;
}


// --- Alt Bileşenler (Değişiklik yok) ---

const BrandActivityForm: React.FC<BrandActivityFormProps> = memo(({
  formik,
  brands,
  fieldOfActivity,
  editId,
  isFormOpen,
}) => {
  if (!isFormOpen) {
    return null;
  }
  return (
    <form
      onSubmit={formik.handleSubmit}
      className="bg-white p-6 rounded-xl shadow space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <select name="brandId" value={formik.values.brandId} onChange={formik.handleChange} className="w-full border rounded-md p-2">
            <option value="">Marka Seçin</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>{brand.title}</option>
            ))}
          </select>
        </div>
        <div>
          <select name="fieldOfActivity" value={formik.values.fieldOfActivity} onChange={formik.handleChange} className="w-full border rounded-md p-2">
            <option value="">Faaliyet Seçin</option>
            {fieldOfActivity.map((area) => (
              <option key={area.id} value={area.id}>{area.title}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="text-right">
        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
          {editId ? 'Güncelle' : 'Kaydet'}
        </button>
      </div>
    </form>
  );
});
BrandActivityForm.displayName = 'BrandActivityForm';

const BrandActivityTable: React.FC<BrandActivityTableProps> = memo(({ sections, handleEdit, handleDelete, openTextModalWithContent }) => {
  const truncateText = (text: string | undefined, maxLength: number = 50) => {
    if (!text) return '—';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };
  return (
    <div className="bg-white rounded-xl shadow overflow-x-auto">
      <table className="min-w-full table-auto border-collapse text-sm">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="p-3 border">Marka</th>
            <th className="p-3 border">Faaliyet Alanı</th>
            <th className="p-3 border">İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((section) => (
            <tr key={section.id} className="text-center">
              <td className="p-3 border hover:bg-gray-50" onDoubleClick={() => openTextModalWithContent(section.brands?.[0]?.title || '—')}>
                {truncateText(section.brands?.[0]?.title)}
              </td>
              <td className="p-3 border hover:bg-gray-50" onDoubleClick={() => openTextModalWithContent(section.fieldOfActivity?.[0]?.title || '—')}>
                {truncateText(section.fieldOfActivity?.[0]?.title)}
              </td>
              <td className="p-3 border space-x-2">
                <button onClick={() => handleEdit(section)} className="bg-yellow-400 px-3 py-1 rounded hover:bg-yellow-500">Düzenle</button>
                <button onClick={() => handleDelete(section.id)} className="bg-red-600 px-3 py-1 rounded text-white hover:bg-red-700">Sil</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
BrandActivityTable.displayName = 'BrandActivityTable';


// --- Ana Bileşen ---
const BrandActivityAreasYonetimi: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [fieldOfActivity, setFieldOfActivities] = useState<FieldOfActivity[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [modalChildren, setModalChildren] = useState<React.ReactNode | null>(null);
  const { showLoading, hideLoading } = useLoading(); // Loading context'i çağrıldı

  const fetchSections = useCallback(async () => {
    showLoading();
    try {
      const res = await api.get('/brand-activity-areas');
      setSections(res.data);
    } catch (err) {
      console.error('Veri çekme hatası', err);
    } finally {
      hideLoading(); // İstek başarılı da olsa, hatalı da olsa loading'i gizle
    }
  }, [showLoading, hideLoading]);

  const fetchInitialData = useCallback(async () => {
    showLoading(); // YÜKLEME EKLENDİ
    try {
      const [brandsRes, activitiesRes, sectionsRes] = await Promise.all([
        api.get('/brands'),
        api.get('/field-of-activities'),
        api.get('/brand-activity-areas'),
      ]);
      setBrands(brandsRes.data);
      setFieldOfActivities(activitiesRes.data);
      setSections(sectionsRes.data);
    } catch (err) {
      console.error('Başlangıç verileri alınamadı', err);
      Swal.fire('Hata', 'Veriler yüklenirken bir sorun oluştu.', 'error');
    } finally {
      hideLoading(); // YÜKLEME EKLENDİ
    }
  }, [showLoading, hideLoading]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const formik = useFormik<FormValues>({
    initialValues: {
      brandId: '',
      fieldOfActivity: '',
    },
    onSubmit: async (values, { resetForm }) => {
      const result = await Swal.fire({
        title: editId ? 'Güncelleme onayı' : 'Ekleme onayı',
        text: editId
          ? 'Bu kaydı güncellemek istediğinize emin misiniz?'
          : 'Yeni kayıt eklemek istediğinize emin misiniz?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Evet',
        cancelButtonText: 'Hayır',
        buttonsStyling: false,
        customClass: {
          popup: 'rounded-xl shadow-lg',
          title: 'text-xl font-semibold',
          htmlContainer: 'text-gray-700',
          actions: 'flex justify-center gap-4 mt-4',
          confirmButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700',
          cancelButton: 'bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400',
        },
      });

      if (!result.isConfirmed) return;
      const formData = new FormData();
      showLoading(); // YÜKLEME EKLENDİ
      try {
        const requestObject = {
          brandIds: [values.brandId],
          fieldOfActivity: [values.fieldOfActivity],
        };
        formData.append(
          'request',
          new Blob([JSON.stringify(requestObject)], { type: 'application/json' })
        );
        if (editId) {
          // Güncelleme isteğini formData ile gönderiyoruz.
          await api.put(`/brand-activity-areas/${editId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }, // Header'ı belirtmek en sağlıklısı
          });
        } else {
          // Ekleme isteğini formData ile gönderiyoruz.
          await api.post('/brand-activity-areas', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }, // Header'ı belirtmek en sağlıklısı
          });
        }

        await fetchSections(); // Veriyi yeniden çekerken kendi içinde loading'i yönetecek

        Swal.fire('Başarılı', editId ? 'Kayıt güncellendi' : 'Yeni kayıt eklendi', 'success');

        resetForm();
        setEditId(null);
        setIsFormOpen(false);
      } catch (err) {
        Swal.fire('Hata', 'İşlem sırasında hata oluştu', 'error');
        console.error('Form gönderme hatası:', err);
      } finally {
        hideLoading(); // YÜKLEME EKLENDİ
      }
    },
  });

  const handleEdit = useCallback((section: Section) => {
    formik.setValues({
      brandId: section.brands?.[0]?.id || '',
      fieldOfActivity: section.fieldOfActivity?.[0]?.id || '',
    });
    setEditId(section.id);
    setIsFormOpen(true);
  }, [formik]);

  const handleDelete = useCallback(async (id: string) => {
    const result = await Swal.fire({
      title: 'Silme onayı',
      text: 'Bu kaydı silmek istediğinize emin misiniz?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Evet',
      cancelButtonText: 'Hayır',
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-xl shadow-lg',
        title: 'text-xl font-semibold',
        htmlContainer: 'text-gray-700',
        actions: 'flex justify-center gap-4 mt-4',
        confirmButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700',
        cancelButton: 'bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400',
      },
    });

    if (!result.isConfirmed) return;

    showLoading(); // YÜKLEME EKLENDİ
    try {
      await api.delete(`/brand-activity-areas/${id}`);
      await fetchSections(); // Bu fonksiyon da kendi içinde loading'i yönetecek
      Swal.fire('Başarılı', 'Kayıt silindi', 'success');
    } catch (err) {
      Swal.fire('Hata', 'Kayıt silinemedi', 'error');
    } finally {
      hideLoading(); // YÜKLEME EKLENDİ
    }
  }, [fetchSections, showLoading, hideLoading]);

  const openTextModal = useCallback((content: string) => {
    setModalChildren(<TextModalContent title="Detaylı İçerik" content={content} />);
  }, []);

  const closeModal = useCallback(() => {
    setModalChildren(null);
  }, []);

  const toggleForm = useCallback(() => {
    const nextState = !isFormOpen;
    setIsFormOpen(nextState);
    if (!nextState) {
      formik.resetForm();
      setEditId(null);
    }
  }, [isFormOpen, formik]);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Marka Etkinlikleri Alanı Yönetimi</h1>
          <button onClick={toggleForm} className="bg-green-600 text-white px-4 py-2 rounded">
            {isFormOpen ? 'Formu Gizle' : 'Yeni Marka Etkinlikleri Alanı Ekle'}
          </button>
        </div>

        <BrandActivityForm
          formik={formik}
          brands={brands}
          fieldOfActivity={fieldOfActivity}
          editId={editId}
          isFormOpen={isFormOpen}
        />

        <BrandActivityTable
          sections={sections}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
          openTextModalWithContent={openTextModal}
        />
      </div>

      <Modal isOpen={modalChildren !== null} onClose={closeModal}>
        {modalChildren}
      </Modal>
    </Layout>
  );
};

export default BrandActivityAreasYonetimi;

