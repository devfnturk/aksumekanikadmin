import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api';
import { useFormik } from 'formik';
import Swal from 'sweetalert2';
import 'react-toastify/dist/ReactToastify.css';

type Section = {
  id: string;
  brands: {
    id: string;
    title: string;
  }[];
  fieldOfActivity: {
    id: string;
    title: string;
  }[];
};

const BrandActivityAreasYonetimi: React.FC = () => {
  type Brand = {
    id: string;
    title: string;
  };
  type FieldOfActivities = {
    id: string;
    title: string;
  };
  const [brands, setBrands] = useState<Brand[]>([]);
  const [fieldOfActivity, setFieldOfActivities] = useState<FieldOfActivities[]>([]);
  const fetchBrands = async () => {
    try {
      const res = await api.get('/brands');
      setBrands(res.data);
    } catch (err) {
      console.error('Brand listesi alınamadı', err);
    }
  };


  const fetchFieldOfActivities = async () => {
    try {
      const res = await api.get('/field-of-activities');
      setFieldOfActivities(res.data);
    } catch (err) {
      console.error('Brand listesi alınamadı', err);
    }
  };
  useEffect(() => {
    fetchSections();
    fetchBrands();
    fetchFieldOfActivities();
  }, []);
  const [sections, setSections] = useState<Section[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [modalContent, setModalContent] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: {
      brandId: '',
      fieldOfActivity: '', // Faaliyet alanı için yeni state
    },
    onSubmit: async (values, { resetForm }) => {
      try {
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
          reverseButtons: true,
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

        const requestObject = {
          brandIds: [values.brandId],
          fieldOfActivity:[values.fieldOfActivity],
        };

        formData.append(
          'request',
          new Blob([JSON.stringify(requestObject)], { type: 'application/json' })
        );
        if (editId) {
          await api.put(`/brand-activity-areas/${editId}`, formData);
          Swal.fire('Başarılı', 'Kayıt güncellendi', 'success');
        } else {
          await api.post('/brand-activity-areas', formData);
          Swal.fire('Başarılı', 'Yeni kayıt eklendi', 'success');
        }
        fetchSections();
        resetForm();
        setEditId(null);
        setIsFormOpen(false);
      } catch (err) {
        Swal.fire('Hata', 'İşlem sırasında hata oluştu', 'error');
        console.error('Form gönderme hatası:', err);
      }
    },
  });
  const fetchSections = () => {
    api
      .get('/brand-activity-areas')
      .then((res) => {
        setSections(res.data);
      })
      .catch((err) => {
        console.error('Veri çekme hatası', err);
      });
  };
  const handleEdit = (section: Section) => {
    formik.setValues({
      brandId: section.brands?.[0]?.id || '',
      fieldOfActivity: section.fieldOfActivity?.[0]?.id || '',
    });
    setEditId(section.id);
    setIsFormOpen(true);
  };


  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Silme onayı',
      text: 'Bu kaydı silmek istediğinize emin misiniz?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Evet',
      cancelButtonText: 'Hayır',
      buttonsStyling: false,
      reverseButtons: true,
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

    api
      .delete(`/brand-activity-areas/${id}`)
      .then(() => {
        fetchSections();
        Swal.fire('Başarılı', 'Kayıt silindi', 'success');
      })
      .catch(() => {
        Swal.fire('Hata', 'Kayıt silinemedi', 'error');
      });
  };
  const truncateText = (text: string | undefined, maxLength: number = 50) => {
    if (!text) return '';
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text;
  };

  const openTextModalWithContent = (content: string) => {
    setModalContent(content);
  };

  const closeTextModal = () => {
    setModalContent(null);
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Marka Etkinlikleri Alanı Yönetimi</h1>
          <button
            onClick={() => {
              formik.resetForm();
              setEditId(null);
              setIsFormOpen((prev) => !prev);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            {isFormOpen ? 'Formu Gizle' : 'Yeni Marka Etkinlikleri Alanı Ekle'}
          </button>
        </div>

        {isFormOpen && (
          <form
            onSubmit={formik.handleSubmit}
            className="bg-white p-6 rounded-xl shadow space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <select
                  name="brandId"
                  value={formik.values.brandId}
                  onChange={formik.handleChange}
                  className="w-full border rounded-md p-2"
                >
                  <option value="">Marka Seçin</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  name="fieldOfActivity" // name güncellendi
                  value={formik.values.fieldOfActivity} // value güncellendi
                  onChange={formik.handleChange}
                  className="w-full border rounded-md p-2"
                >
                  <option value="">Faaliyet Seçin</option>
                  {fieldOfActivity.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-right">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              >
                {editId ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="min-w-full table-auto border-collapse text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3 border" >Marka</th>
                <th className="p-3 border">Faaliyet Alanı</th>
                <th className="p-3 border">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => (
                <tr key={section.id} className="text-center">
                  <td className="p-3 border hover:bg-gray-50" onDoubleClick={() => openTextModalWithContent(section.brands?.[0]?.title || '—')} >{truncateText(section.brands?.[0]?.title || '—')}</td>
                  <td className="p-3 border hover:bg-gray-50" onDoubleClick={() => openTextModalWithContent(section.fieldOfActivity?.[0]?.title || '—')}>{truncateText(section.fieldOfActivity?.[0]?.title || '—')}</td>
                  <td className="p-3 border space-x-2">
                    <button
                      onClick={() => handleEdit(section)}
                      className="bg-yellow-400 px-3 py-1 rounded hover:bg-yellow-500"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => handleDelete(section.id)}
                      className="bg-red-600 px-3 py-1 rounded text-white hover:bg-red-700"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Metin Modal Bileşeni */}
      {modalContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full">
            <h3 className="text-xl font-bold mb-4">Tam İçerik</h3>
            <div className="text-gray-800 break-all">
              <p>{modalContent}</p>
            </div>
            <div className="mt-6 text-right">
              <button
                onClick={closeTextModal}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default BrandActivityAreasYonetimi;