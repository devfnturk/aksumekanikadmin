import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api';
import pako from 'pako';
import { useFormik } from 'formik';
import Swal from 'sweetalert2';
import 'react-toastify/dist/ReactToastify.css';

type Section = {
  id: string;
  image?: { imageData: string }[];
  title: string;
  description: string;
  isActive: boolean;
  enTitle: string;
  enDescription: string;
  brands: {
    id: string;
    title: string;
  }[];
};

export function decodeImage(imageData: string): string {
  try {
    const binary = atob(imageData);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const decompressed = pako.inflate(bytes);
    let result = '';
    for (let i = 0; i < decompressed.length; i += 0x8000) {
      result += String.fromCharCode.apply(
        null,
        Array.from(decompressed.subarray(i, i + 0x8000))
      );
    }
    return `data:image/jpeg;base64,${btoa(result)}`;
  } catch (err) {
    console.error('Decode error:', err);
    return '';
  }
}

const BrandActivityAreasYonetimi: React.FC = () => {
  type Brand = {
    id: string;
    title: string;
  };
  const [brands, setBrands] = useState<Brand[]>([]);

  const fetchBrands = async () => {
    try {
      const res = await api.get('/brands'); // API endpoint'ini senin backend'e göre ayarla
      setBrands(res.data);
    } catch (err) {
      console.error('Brand listesi alınamadı', err);
    }
  };

  useEffect(() => {
    fetchSections();
    fetchBrands();
  }, []);
  const [sections, setSections] = useState<Section[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [imageBase64, setImageBase64] = useState<string>('');

  const formik = useFormik({
    initialValues: {
      brandId: '',
      title: '',
      isActive: true,
      description: '',
      enTitle: '',
      enDescription: '',
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
          reverseButtons: true, // Butonların yerini değiştirir (cancel solda olur)
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
          title: values.title,
          brandIds: [values.brandId],
          isActive: values.isActive,
          description: values.description,
          enTitle: values.enTitle,
          enDescription: values.enDescription,
        };

        formData.append(
          'request',
          new Blob([JSON.stringify(requestObject)], { type: 'application/json' })
        );

        if (imageBase64) {
          const file = dataURLToFile(imageBase64);
          formData.append('files', file); // array olarak files[] bekliyorsa adını 'files' tut
        }
        console.log("formData", formData)
        if (editId) {
          await api.put(`/brand-activity-areas/${editId}`, formData);
          Swal.fire('Başarılı', 'Kayıt güncellendi', 'success');
        } else {
          await api.post('/brand-activity-areas', formData);
          Swal.fire('Başarılı', 'Yeni kayıt eklendi', 'success');
        }
        fetchSections();
        resetForm();
        setImageBase64('');
        setEditId(null);
        setIsFormOpen(false);
      } catch (err) {
        Swal.fire('Hata', 'İşlem sırasında hata oluştu', 'error');
        console.error('Form gönderme hatası:', err);
      }
    },
  });

  const dataURLToFile = (dataUrl: string) => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], 'image.jpg', { type: mime });
  };

  const fetchSections = () => {
    api
      .get('/brand-activity-areas')
      .then((res) => {
        setSections(res.data);
        console.log("res.data", res.data)
      })
      .catch((err) => {
        console.error('Veri çekme hatası', err);
      });
  };

  useEffect(() => {
    fetchSections();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = (section: Section) => {
    formik.setValues({
      title: section.title || '',
      description: section.description || '',
      isActive: section.isActive,
      enTitle: section.enTitle || '',
      enDescription: section.enDescription || '',
      brandId: section.brands?.[0]?.id || '', // ✅ artık array üzerinden
    });

    setImageBase64(
      section.image?.[0]?.imageData ? decodeImage(section.image[0].imageData) : ''
    );

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
      reverseButtons: true, // Butonların yerini değiştirir (cancel solda olur)
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

  const toggleActiveStatus = async (id: string) => {
    const result = await Swal.fire({
      title: 'Durum değiştirme',
      text: 'Bu kaydın aktiflik durumunu değiştirmek istediğinize emin misiniz?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Evet',
      cancelButtonText: 'Hayır',
      buttonsStyling: false,
      reverseButtons: true, // Butonların yerini değiştirir (cancel solda olur)
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

    try {
      const res = await api.get(`/brand-activity-areas/${id}`);
      const existing = res.data;
      const formData = new FormData();
      const updatedSection = {
        isActive: !existing.isActive,
        title: existing.title || '',
        description: existing.description || '',
        brandId: existing.brand?.id || '',
        enTitle: existing.enTitle || '',
        enDescription: existing.enDescription || '',
      };
      formData.append(
        'request',
        new Blob([JSON.stringify(updatedSection)], {
          type: 'application/json',
        })
      );
      if (existing.image?.[0]?.imageData) {
        const decoded = decodeImage(existing.image[0].imageData);
        const file = dataURLToFile(decoded);
        formData.append('files', file);
      }

      await api.put(`/brand-activity-areas/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchSections();
      Swal.fire('Başarılı', 'Durum güncellendi', 'success');
    } catch (err) {
      Swal.fire('Hata', 'Aktiflik güncellenemedi', 'error');
      console.error('Aktiflik güncellenemedi:', err);
    }
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
                <input
                  type="text"
                  name="title"
                  value={formik.values.title}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full border rounded-md p-2"
                  placeholder="Başlık"
                />
              </div>

              <div className="md:col-span-2">
                <textarea
                  name="description"
                  value={formik.values.description}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full border rounded-md p-2"
                  placeholder="Açıklama"
                />
                {formik.touched.description && formik.errors.description && (
                  <div className="text-red-500 text-sm">
                    {formik.errors.description}
                  </div>
                )}
              </div>

              <input
                type="text"
                name="enTitle"
                value={formik.values.enTitle}
                onChange={formik.handleChange}
                className="w-full border rounded-md p-2"
                placeholder="Başlık (EN)"
              />

              <textarea
                name="enDescription"
                value={formik.values.enDescription}
                onChange={formik.handleChange}
                className="w-full border rounded-md p-2 md:col-span-2"
                placeholder="Açıklama (EN)"
              />

              <select
                name="isActive"
                value={formik.values.isActive.toString()}
                onChange={formik.handleChange}
                className="w-full border rounded-md p-2"
              >
                <option value="true">Aktif</option>
                <option value="false">Pasif</option>
              </select>

              <input
                type="file"
                name="image"
                accept="image/*"
                onChange={handleImageUpload}
                className="md:col-span-2"
              />
              {imageBase64 && (
                <img
                  src={imageBase64}
                  alt="Yüklenen görsel"
                  className="h-32 mt-2 rounded"
                />
              )}
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
                <th className="p-3 border">Marka</th>
                <th className="p-3 border">Başlık</th>
                <th className="p-3 border">(EN) Başlık</th>
                <th className="p-3 border">Açıklama</th>
                <th className="p-3 border">(EN) Açıklama</th>
                <th className="p-3 border">Durum</th>
                <th className="p-3 border">Görsel</th>
                <th className="p-3 border">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => (
                <tr key={section.id} className="text-center">
                  <td className="p-3 border">{section.brands?.[0]?.title || '—'}</td>
                  <td className="p-3 border">{section.title}</td>
                  <td className="p-3 border">{section.enTitle}</td>
                  <td className="p-3 border">{section.description}</td>
                  <td className="p-3 border">{section.enDescription}</td>
                  <td className="p-3 border">
                    <span
                      className={
                        section.isActive
                          ? 'text-green-600 font-semibold'
                          : 'text-red-500'
                      }
                    >
                      {section.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="p-3 border">
                    {section.image?.[0]?.imageData && (
                      <img
                        src={decodeImage(section.image[0].imageData)}
                        alt="banner"
                        className="h-32 w-32 object-cover rounded-md"
                      />
                    )}
                  </td>
                  <td className="p-3 border space-x-2">
                    <button
                      onClick={() => toggleActiveStatus(section.id)}
                      className={`${section.isActive ? 'bg-red-500' : 'bg-green-500'
                        } text-white px-3 py-1 rounded hover:opacity-90`}
                    >
                      {section.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                    </button>
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
    </Layout>
  );
};

export default BrandActivityAreasYonetimi;
