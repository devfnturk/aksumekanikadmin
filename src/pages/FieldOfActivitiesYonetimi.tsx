import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import Layout from '../components/Layout';
import api from '../api';
import pako from 'pako';

type Section = {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  enTitle: string;
  enDescription: string;
  image?: { imageData: string }[];
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


const FieldOfActivitiesYonetimi: React.FC = () => {
  const [sections, setSections] = useState<Section[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      const res = await api.get<Section[]>('/field-of-activities');
      setSections(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const formik = useFormik({
    initialValues: {
      title: '',
      description: '',
      isActive: true,
      enTitle: '',
      enDescription: '',
    },
    onSubmit: async (values, { resetForm }) => {
      try {
        const formData = new FormData();

        const requestObject = {
          title: values.title,
          description: values.description,
          isActive: values.isActive,
          enTitle: values.enTitle,
          enDescription: values.enDescription,
        };

        formData.append('request', new Blob([JSON.stringify(requestObject)], { type: 'application/json' }));

        if (imageBase64) {
          const file = dataURLToFile(imageBase64);
          formData.append('files', file); // array olarak files[] bekliyorsa adını 'files' tut
        }
        logFormData(formData);
        if (editId) {
          await api.put(`/field-of-activities/${editId}`, {
            title: values.title,
            description: values.description,
            isActive: values.isActive,
            enTitle: values.enTitle,
            enDescription: values.enDescription,
          });
        } else {
          await api.post('/field-of-activities', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }

        alert('Başarıyla kaydedildi!');
        fetchSections();
        resetForm();
        setImageBase64('');
        setEditId(null);
        setIsFormOpen(false);
      } catch (err) {
        console.error('Form gönderme hatası:', err);
      }
    },
  });
    const logFormData = (formData: FormData) => {
    const obj: { [key: string]: any } = {};
    formData.forEach((value, key) => {
      obj[key] = value;
    });
    console.log(obj); // JSON formatında gösterir
  };
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
    console.log("handleEdit", section)
    formik.setValues({
      title: section.title,
      description: section.description,
      isActive: section.isActive,
      enTitle: section.enTitle,
      enDescription: section.enDescription,
    });
    setImageBase64(
      section.image?.[0]?.imageData ? decodeImage(section.image[0].imageData) : ''
    );
    setEditId(section.id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/field-of-activities/${id}`);
      fetchSections();
    } catch (err) {
      console.error('Silme hatası:', err);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      console.log("handleToggleActive", id)
      // Önce mevcut referans verisini al
      const res = await api.get(`/field-of-activities/${id}`);
      const existing = res.data;

      // Tüm alanlarla birlikte güncelle
      const data = {
        title: existing.title,
        description: existing.description,
        isActive: !existing.isActive,
        enTitle: existing.enTitle,
        enDescription: existing.enDescription,
      };

      await api.put(`/field-of-activities/${id}`, data);
      fetchSections();
    } catch (err) {
      console.error('Aktiflik güncellenemedi:', err);
    }
  };

  const getDecodedImage = (section: Section): string | null => {
    const imageObj = Array.isArray(section.image) ? section.image[0] : null;
    const encoded = imageObj?.imageData;
    return encoded ? decodeImage(encoded) : null;
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Referanslar Yönetimi</h1>
        <div className="text-right">
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition"
          >
            {isFormOpen ? 'Formu Gizle' : 'Yeni Ekle'}
          </button>
        </div>

        {isFormOpen && (
          <form onSubmit={formik.handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl shadow">
            <div>
              <label className="block font-semibold mb-1">Başlık</label>
              <input
                name="title"
                value={formik.values.title}
                onChange={formik.handleChange}
                className="w-full border rounded-md p-2"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">En Başlık</label>
              <input
                name="enTitle"
                value={formik.values.enTitle}
                onChange={formik.handleChange}
                className="w-full border rounded-md p-2"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Açıklama</label>
              <input
                name="description"
                value={formik.values.description}
                onChange={formik.handleChange}
                className="w-full border rounded-md p-2"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">En Açıklama</label>
              <input
                name="enDescription"
                value={formik.values.enDescription}
                onChange={formik.handleChange}
                className="w-full border rounded-md p-2"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Durum</label>
              <select
                name="isActive"
                value={formik.values.isActive.toString()}
                onChange={(e) => formik.setFieldValue('isActive', e.target.value === 'true')}
                className="w-full border rounded-md p-2"
              >
                <option value="true">Aktif</option>
                <option value="false">Pasif</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold mb-1">Resim Yükle</label>
              <input type="file" accept="image/*" onChange={handleImageUpload} />
              {imageBase64 && (
                <img src={imageBase64} alt="Yüklenen görsel" className="h-32 mt-2 rounded" />
              )}
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
                {editId ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto bg-white rounded-xl shadow">
          <table className="min-w-full table-auto border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 border">Başlık</th>
                <th className="p-3 border">En Başlık</th>
                <th className="p-3 border">Açıklama</th>
                <th className="p-3 border">En Açıklama</th>
                <th className="p-3 border">Resim</th>
                <th className="p-3 border">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => (
                <tr key={section.id} className="text-center">
                  <td className="p-3 border">{section.title}</td>
                  <td className="p-3 border">{section.enTitle}</td>
                  <td className="p-3 border">{section.description}</td>
                  <td className="p-3 border">{section.enDescription}</td>
                  <td className="p-3 border">
                    {section.image && Array.isArray(section.image) && section.image[0]?.imageData ? (
                      <img
                        src={getDecodedImage(section) || ''}
                        alt="Referans görseli"
                        className="w-16 h-10 object-cover mx-auto rounded"
                      />
                    ) : (
                      <span className="text-gray-400 italic">Yok</span>
                    )}
                  </td>
                  <td className="p-3 border space-x-2">
                    <button
                      onClick={() => handleToggleActive(section.id)}
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
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
              {sections.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-400">
                    Henüz içerik eklenmedi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default FieldOfActivitiesYonetimi;
