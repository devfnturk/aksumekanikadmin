import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useFormik } from 'formik';
import pako from 'pako';
import api from '../api';
import Swal from 'sweetalert2';

type Section = {
  id: string;
  fieldOfActivity: {
    id: string;
    title: string;
  };
  title: string;
  description: string;
  image?: { imageData: string }[];
  client: string;
  location: string;
  area: string;
  projectDate: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  link: string;
  isCompleted: boolean;
  enTitle: string;
  enDescription: string;
}

export function decodeImage(imageData: string): string {
  try {
    const binary = atob(imageData);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
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

const ProjectYonetimi: React.FC = () => {

  const [sections, setSections] = useState<Section[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [imageBase64, setImageBase64] = useState<string>('');
  const [modalContent, setModalContent] = useState<string | null>(null);
  const [imageModalContent, setImageModalContent] = useState<string | null>(null);

  useEffect(() => {
    fetchSections();
  }, []);

  const formik = useFormik({
    initialValues: {
      fieldOfActivityId: '',
      title: '',
      description: '',
      client: '',
      location: '',
      area: '',
      projectDate: '',
      link: '',
      isCompleted: true,
      enTitle: '',
      enDescription: '',
      isActive: true,
    },
    onSubmit: async (values, { resetForm }) => {
      const result = await Swal.fire({
        title: editId ? 'Projeyi güncellemek istediğinize emin misiniz?' : 'Yeni proje eklemek istediğinize emin misiniz?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Evet',
        cancelButtonText: 'Hayır',
        buttonsStyling: false,
        customClass: {
          actions: 'flex justify-center gap-4',
          confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700',
          cancelButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700',
        },
      });

      if (!result.isConfirmed) {
        return;
      }

      const formattedProjectDate = new Date(values.projectDate).toISOString().split('T')[0];

      const requestObject = {
        fieldOfActivityId: values.fieldOfActivityId,
        title: values.title,
        description: values.description,
        client: values.client,
        location: values.location,
        area: values.area,
        projectDate: formattedProjectDate,
        link: values.link,
        isCompleted: values.isCompleted,
        enTitle: values.enTitle,
        enDescription: values.enDescription,
        isActive: values.isActive,
      };

      const formData = new FormData();
      formData.append(
        'request',
        new Blob([JSON.stringify(requestObject)], { type: 'application/json' })
      );

      if (imageBase64) {
        formData.append('files', dataURLToFile(imageBase64));
      }

      try {
        if (editId) {
          await api.put(`/project-management/${editId}`, formData);
          Swal.fire('Başarılı!', 'Proje başarıyla güncellendi.', 'success');
        } else {
          await api.post('/project-management', formData);
          Swal.fire('Başarılı!', 'Yeni proje başarıyla eklendi.', 'success');
        }

        fetchSections();
        resetForm();
        setImageBase64('');
        setEditId(null);
        setIsFormOpen(false);
      } catch (err) {
        console.error('Kaydetme hatası:', err);
        Swal.fire('Hata!', 'Kaydetme sırasında bir hata oluştu.', 'error');
      }
    }
  });

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
    api.get<Section[]>('/project-management')
      .then(res => setSections(res.data))
      .catch(err => console.error('Veri çekme hatası', err));
  };

  const handleEdit = (section: Section) => {
    const formattedProjectDate = new Date(section.projectDate).toISOString().split('T')[0];
    formik.setValues({
      fieldOfActivityId: section.fieldOfActivity?.id || '',
      title: section.title,
      description: section.description,
      client: section.client,
      location: section.location,
      area: section.area,
      projectDate: formattedProjectDate,
      link: section.link,
      isCompleted: section.isCompleted,
      enTitle: section.enTitle,
      enDescription: section.enDescription,
      isActive: section.isActive,
    });
    setImageBase64(
      section.image?.[0]?.imageData ? decodeImage(section.image[0].imageData) : ''
    );
    setEditId(section.id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Bu projeyi silmek istediğinize emin misiniz?',
      text: "Bu işlem geri alınamaz!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Evet, sil!',
      cancelButtonText: 'Hayır, iptal et',
      buttonsStyling: false,
      customClass: {
        actions: 'flex justify-center gap-4',
        confirmButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700',
        cancelButton: 'bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700',
      },
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/project-management/${id}`);
        fetchSections();
        Swal.fire('Silindi!', 'Proje başarıyla silindi.', 'success');
      } catch (err) {
        console.error('Silme hatası', err);
        Swal.fire('Hata!', 'Silme sırasında bir hata oluştu.', 'error');
      }
    }
  };

  const handleToggleCompleted = async (id: string, currentStatus: boolean) => {
    const result = await Swal.fire({
      title: `Proje durumunu "${!currentStatus ? 'Tamamlandı' : 'Tamamlanmadı'}" olarak değiştirmek istediğinize emin misiniz?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Evet',
      cancelButtonText: 'Hayır',
      buttonsStyling: false,
      customClass: {
        actions: 'flex justify-center gap-4',
        confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700',
        cancelButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700',
      },
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const res = await api.get(`/project-management/${id}`);
      const existing = res.data;
      const formattedProjectDate = new Date(existing.projectDate).toISOString().split('T')[0];

      const requestObject = {
        fieldOfActivityId: existing.fieldOfActivity?.id || '',
        title: existing.title,
        description: existing.description,
        client: existing.client,
        location: existing.location,
        area: existing.area,
        projectDate: formattedProjectDate,
        link: existing.link,
        isCompleted: !existing.isCompleted,
        enTitle: existing.enTitle,
        enDescription: existing.enDescription,
        isActive: existing.isActive,
      };

      const formData = new FormData();
      formData.append(
        'request',
        new Blob([JSON.stringify(requestObject)], { type: 'application/json' })
      );

      await api.put(`/project-management/${id}`, formData);
      fetchSections();
      Swal.fire('Başarılı!', `Proje durumu "${!currentStatus ? 'Tamamlandı' : 'Tamamlanmadı'}" olarak güncellendi.`, 'success');
    } catch (err) {
      console.error('Proje durumu güncellenemedi:', err);
      Swal.fire('Hata!', 'Proje durumu güncellenirken bir hata oluştu.', 'error');
    }
  };

  const getDecodedImage = (section: Section): string | null => {
    const imageObj = Array.isArray(section.image) ? section.image[0] : null;
    const encoded = imageObj?.imageData;
    return encoded ? decodeImage(encoded) : null;
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const result = await Swal.fire({
      title: `Proje durumunu "${!currentStatus ? 'Aktif' : 'Pasif'}" olarak değiştirmek istediğinize emin misiniz?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Evet',
      cancelButtonText: 'Hayır',
      buttonsStyling: false,
      customClass: {
        actions: 'flex justify-center gap-4',
        confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700',
        cancelButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700',
      },
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const res = await api.get(`/project-management/${id}`);
      const existing = res.data;
      const formattedProjectDate = new Date(existing.projectDate).toISOString().split('T')[0];

      const requestObject = {
        fieldOfActivityId: existing.fieldOfActivity?.id || '',
        title: existing.title,
        description: existing.description,
        client: existing.client,
        location: existing.location,
        area: existing.area,
        projectDate: formattedProjectDate,
        link: existing.link,
        isCompleted: existing.isCompleted,
        enTitle: existing.enTitle,
        enDescription: existing.enDescription,
        isActive: !existing.isActive,
      };

      const formData = new FormData();
      formData.append(
        'request',
        new Blob([JSON.stringify(requestObject)], { type: 'application/json' })
      );

      await api.put(`/project-management/${id}`, formData);
      fetchSections();
      Swal.fire('Başarılı!', `Proje durumu "${!currentStatus ? 'Aktif' : 'Pasif'}" olarak güncellendi.`, 'success');
    } catch (err) {
      console.error('Proje aktiflik durumu güncellenemedi:', err);
      Swal.fire('Hata!', 'Proje aktiflik durumu güncellenirken bir hata oluştu.', 'error');
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '';
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text;
  };

  const openTextModalWithContent = (content: string) => {
    setModalContent(content);
  };

  // Metin modal kapatma fonksiyonu
  const closeTextModal = () => {
    setModalContent(null);
  };

  // Görsel modal açma fonksiyonu
  const openImageModal = (imageUrl: string) => {
    setImageModalContent(imageUrl);
  };

  // Görsel modal kapatma fonksiyonu
  const closeImageModal = () => {
    setImageModalContent(null);
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Proje Yönetimi</h1>
          <button
            onClick={() => {
              setIsFormOpen(prev => !prev);
              if (isFormOpen) {
                formik.resetForm();
                setEditId(null);
                setImageBase64('');
              }
            }}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            {isFormOpen ? 'Formu Gizle' : 'Yeni Proje Ekle'}
          </button>
        </div>

        {isFormOpen && (
          <form onSubmit={formik.handleSubmit} className="space-y-6 p-6 bg-white rounded-lg shadow-xl">
            {/* ... (Form inputs - no changes here) ... */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-gray-800">Başlık</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  onChange={formik.handleChange}
                  value={formik.values.title}
                  className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-300 hover:bg-gray-50 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="client" className="block text-sm font-semibold text-gray-800">Müşteri</label>
                <input
                  type="text"
                  id="client"
                  name="client"
                  onChange={formik.handleChange}
                  value={formik.values.client}
                  className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-300 hover:bg-gray-50 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label htmlFor="location" className="block text-sm font-semibold text-gray-800">Konum</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  onChange={formik.handleChange}
                  value={formik.values.location}
                  className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-300 hover:bg-gray-50 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="area" className="block text-sm font-semibold text-gray-800">Alan</label>
                <input
                  type="text"
                  id="area"
                  name="area"
                  onChange={formik.handleChange}
                  value={formik.values.area}
                  className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-300 hover:bg-gray-50 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label htmlFor="projectDate" className="block text-sm font-semibold text-gray-800">Proje Tarihi</label>
                <input
                  type="date"
                  id="projectDate"
                  name="projectDate"
                  onChange={formik.handleChange}
                  value={formik.values.projectDate}
                  className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-300 hover:bg-gray-50 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="link" className="block text-sm font-semibold text-gray-800">Link</label>
                <input
                  type="text"
                  id="link"
                  name="link"
                  onChange={formik.handleChange}
                  value={formik.values.link}
                  className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-300 hover:bg-gray-50 focus:outline-none"
                />
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="description" className="block text-sm font-semibold text-gray-800">Açıklama</label>
              <textarea
                id="description"
                name="description"
                onChange={formik.handleChange}
                value={formik.values.description}
                className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-300 hover:bg-gray-50 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label htmlFor="enTitle" className="block text-sm font-semibold text-gray-800">(EN) Başlık</label>
                <input
                  type="text"
                  id="enTitle"
                  name="enTitle"
                  onChange={formik.handleChange}
                  value={formik.values.enTitle}
                  className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-300 hover:bg-gray-50 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="enDescription" className="block text-sm font-semibold text-gray-800">(EN) Açıklama</label>
                <textarea
                  id="enDescription"
                  name="enDescription"
                  onChange={formik.handleChange}
                  value={formik.values.enDescription}
                  className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-300 hover:bg-gray-50 focus:outline-none"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-800">
                <input
                  type="checkbox"
                  id="isCompleted"
                  name="isCompleted"
                  onChange={formik.handleChange}
                  checked={formik.values.isCompleted}
                  className="mr-2"
                />
                Proje Tamamlandı
              </label>
            </div>

            <div className="mb-6">
              <label htmlFor="files" className="block text-sm font-semibold text-gray-800">
                Görsel Yükle
              </label>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="mt-2" />
              {imageBase64 && (
                <img src={imageBase64} alt="Yüklenen görsel" className="h-32 mt-2 rounded shadow-sm" />
              )}
            </div>

            <button type="submit" className="w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 transition duration-300">
              Kaydet
            </button>
          </form>
        )}
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="min-w-full table-auto border-collapse text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3 border">Başlık</th>
                <th className="p-3 border">(EN) Başlık</th>
                <th className="p-3 border">Açıklama</th>
                <th className="p-3 border">(EN) Açıklama</th>
                <th className="p-3 border">İş Veren</th>
                <th className="p-3 border">Yer</th>
                <th className="p-3 border">Alan</th>
                <th className="p-3 border">Proje Tarihi</th>
                <th className="p-3 border">Link</th>
                <th className="p-3 border">Resimler</th>
                <th className="p-3 border">Durum</th>
                <th className="p-3 border">Proje Tamamlandı Mı?</th>
                <th className="p-3 border">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => (
                <tr key={section.id} className="text-center hover:bg-gray-50">
                  <td className="p-3 border max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap"
                    onDoubleClick={() => openTextModalWithContent(section.title)}
                  >
                    {section.title.length > 50 ? (
                      truncateText(section.title, 50)
                    ) : (
                      section.title
                    )}
                  </td>
                  <td className="p-3 border max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap"
                    onDoubleClick={() => openTextModalWithContent(section.enTitle)}>
                    {section.enTitle.length > 50 ? (
                      truncateText(section.enTitle, 50)
                    ) : (
                      section.enTitle
                    )}
                  </td>
                  <td className="p-3 border max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap"
                    onDoubleClick={() => openTextModalWithContent(section.description)}>
                    {section.description.length > 50 ? (
                      truncateText(section.description, 50)
                    ) : (
                      section.description
                    )}
                  </td>
                  <td className="p-3 border max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap"
                    onDoubleClick={() => openTextModalWithContent(section.enDescription)}>
                    {section.enDescription.length > 50 ? (
                      truncateText(section.enDescription, 50)
                    ) : (
                      section.enDescription
                    )}
                  </td>
                  <td className="p-3 border max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap"
                    onDoubleClick={() => openTextModalWithContent(section.client)}>
                    {section.client.length > 50 ? (

                      truncateText(section.client, 50)

                    ) : (
                      section.client
                    )}
                  </td>
                  <td className="p-3 border max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap" onDoubleClick={() => openTextModalWithContent(section.location)}>
                    {section.location.length > 50 ? (

                      truncateText(section.location, 50)
                    ) : (
                      section.location
                    )}
                  </td>
                  <td className="p-3 border max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap"
                    onDoubleClick={() => openTextModalWithContent(section.area)}>
                    {section.area.length > 50 ? (
                      truncateText(section.area, 50)
                    ) : (
                      section.area
                    )}
                  </td>
                  <td className="p-3 border">{section.projectDate}</td>
                  <td className="p-3 border">
                    <a href={section.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                      Link
                    </a>
                  </td>
                  <td className="p-3 border">
                    {section.image && Array.isArray(section.image) && section.image[0]?.imageData ? (
                      <div
                        className="relative w-16 h-10 mx-auto rounded overflow-hidden group cursor-pointer"
                        onClick={() => openImageModal(getDecodedImage(section) || '')}
                      >
                        <img
                          src={getDecodedImage(section) || ''}
                          alt="Referans görseli"
                          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <span className="text-white text-xs font-semibold">Büyüt</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Yok</span>
                    )}
                  </td>
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
                    <span
                      className={
                        section.isCompleted
                          ? 'text-green-600 font-semibold'
                          : 'text-red-500'
                      }
                    >
                      {section.isCompleted ? 'Evet' : 'Hayır'}
                    </span>
                  </td>
                  <td className="p-3 border space-x-2">
                    <button
                      onClick={() => handleToggleActive(section.id, section.isActive)}
                      className={`${section.isActive ? 'bg-red-500' : 'bg-green-500'
                        } text-white px-3 py-1 rounded hover:opacity-90 text-xs`}
                    >
                      {section.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                    </button>
                    <button
                      onClick={() => handleToggleCompleted(section.id, section.isCompleted)}
                      className={`${section.isCompleted ? 'bg-indigo-500' : 'bg-orange-500'
                        } text-white px-3 py-1 rounded hover:opacity-90 text-xs`}
                    >
                      {section.isCompleted ? 'Tamamlandı' : 'Tamamlanmadı'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(section);
                      }}
                      className="bg-yellow-400 text-white px-2 py-1 rounded text-xs"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(section.id);
                      }}
                      className="bg-red-600 text-white px-2 py-1 rounded text-xs"
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

      {/* Yenilenmiş Metin İçerik Modalı */}
      {modalContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full"> {/* max-h, flex-col gibi kaydırma çubuğu ile ilgili sınıfları kaldırdık */}
            <h3 className="text-xl font-bold mb-4">Tam İçerik</h3>
            {/* Metin için div veya p etiketine break-all sınıfını ekleyin */}
            <div className="text-gray-800 break-all"> {/* break-all eklendi, overflow-y-auto ve flex-grow kaldırıldı */}
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

      {imageModalContent && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative bg-white p-4 rounded-lg shadow-xl max-w-3xl max-h-[90vh] overflow-hidden">
            <button
              onClick={closeImageModal}
              className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 hover:bg-red-700 z-10"
              aria-label="Görseli Kapat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img src={imageModalContent} alt="Büyütülmüş Referans Görseli" className="max-w-full max-h-full object-contain" />
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ProjectYonetimi;