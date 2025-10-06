import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import { useFormik } from 'formik';
import pako from 'pako';
import api from '../api';
import Swal from 'sweetalert2';

// --- TİPLER VE YARDIMCI FONKSİYİYONLAR ---

type Image = {
  id: string;
  name?: string;
  imageData: string;
};

type Section = {
  id: string;
  fieldOfActivity: {
    id: string;
    title: string;
  };
  title: string;
  description: string;
  image?: Image[];
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
};

export function decodeImage(imageData: string): string {
  try {
    const binary = atob(imageData);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    const decompressed = pako.inflate(bytes);
    let result = '';
    for (let i = 0; i < decompressed.length; i += 0x8000) {
      result += String.fromCharCode.apply(null, Array.from(decompressed.subarray(i, i + 0x8000)));
    }
    return `data:image/jpeg;base64,${btoa(result)}`;
  } catch (err) {
    console.error('Decode error:', err);
    return '';
  }
}

const dataURLToFile = (dataUrl: string, fileName: string = 'image.jpg'): File => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], fileName, { type: mime });
};


// --- PERFORMANS OPTİMİZASYONLU BİLEŞENLER ---
const ImageDecoder: React.FC<{ imageData: string; altText: string }> = ({ imageData, altText }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const decoded = decodeImage(imageData);
    setImageUrl(decoded);
  }, [imageData]);

  if (!imageUrl) {
    return <div className="flex items-center justify-center h-full text-xs text-gray-500">Yükleniyor...</div>;
  }

  return <img src={imageUrl} alt={altText} className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110" />;
};

const MemoizedImageDecoder = React.memo(ImageDecoder);

// --- ANA BİLEŞEN ---
const ProjectYonetimi: React.FC = () => {
  const [sections, setSections] = useState<Section[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [modalContent, setModalContent] = useState<string | null>(null);
  
  // GALERİ MODAL STATE'LERİ
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Resim Yönetimi State'leri
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<{ id: string, data: string }[]>([]);
  const [imageIdsToDelete, setImageIdsToDelete] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSections();
  }, []);

  const resetFormAndImages = () => {
    formik.resetForm();
    setEditId(null);
    setFilesToUpload([]);
    setExistingImages([]);
    setImageIdsToDelete(new Set());
  };

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
    onSubmit: async (values) => {
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

      if (!result.isConfirmed) return;

      const formattedProjectDate = values.projectDate ? new Date(values.projectDate).toISOString().split('T')[0] : '';
      
      const requestObject: any = {
        ...values,
        projectDate: formattedProjectDate,
      };

      if (editId) {
        requestObject.deleteImageIds = Array.from(imageIdsToDelete);
      }
      
      const formData = new FormData();
      formData.append('request', new Blob([JSON.stringify(requestObject)], { type: 'application/json' }));

      filesToUpload.forEach(file => {
        formData.append('files', file);
      });

      try {
        if (editId) {
          await api.put(`/project-management/${editId}`, formData);
          Swal.fire('Başarılı!', 'Proje başarıyla güncellendi.', 'success');
        } else {
          await api.post('/project-management', formData);
          Swal.fire('Başarılı!', 'Yeni proje başarıyla eklendi.', 'success');
        }
        fetchSections();
        resetFormAndImages();
        setIsFormOpen(false);
      } catch (err) {
        console.error('Kaydetme hatası:', err);
        Swal.fire('Hata!', 'Kaydetme sırasında bir hata oluştu.', 'error');
      }
    }
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFilesToUpload(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleRemoveNewImage = (index: number) => {
    setFilesToUpload(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteExistingImage = (imageId: string) => {
    setImageIdsToDelete(prev => new Set(prev).add(imageId));
    setExistingImages(prev => prev.filter(img => img.id !== imageId));
  };

  const fetchSections = () => {
    api.get<Section[]>('/project-management')
      .then(res => setSections(res.data))
      .catch(err => console.error('Veri çekme hatası', err));
  };

  const handleEdit = (section: Section) => {
    resetFormAndImages();
    const formattedProjectDate = section.projectDate ? new Date(section.projectDate).toISOString().split('T')[0] : '';
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
    if (section.image && Array.isArray(section.image)) {
      setExistingImages(section.image.map(img => ({ id: img.id, data: img.imageData })));
    }
    setEditId(section.id);
    setIsFormOpen(true);
    window.scrollTo(0, 0);
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
          console.error('Silme hatası:', err);
          Swal.fire('Hata!', 'Silme sırasında bir hata oluştu.', 'error');
        }
      }
  };
  
  const handleToggleBoolean = async (project: Section, field: 'isActive' | 'isCompleted') => {
    const newStatus = !project[field];
    const fieldText = field === 'isActive' ? 'aktiflik durumunu' : 'tamamlanma durumunu';
    const newStatusText = newStatus ? (field === 'isActive' ? 'Aktif' : 'Tamamlandı') : (field === 'isActive' ? 'Pasif' : 'Tamamlanmadı');

    const result = await Swal.fire({
      title: `Proje ${fieldText} "${newStatusText}" olarak değiştirmek istediğinize emin misiniz?`,
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

    if (!result.isConfirmed) return;

    try {
      const { image, ...projectData } = project;
      const requestObject = {
        ...projectData,
        [field]: newStatus,
      };

      const formData = new FormData();
      formData.append('request', new Blob([JSON.stringify(requestObject)], { type: 'application/json' }));

      if (project.image && project.image.length > 0) {
        project.image.forEach((img, index) => {
          const decodedImage = decodeImage(img.imageData);
          if (decodedImage) {
            const imageFile = dataURLToFile(decodedImage, img.name || `image-${index}.jpg`);
            formData.append('files', imageFile);
          }
        });
      }

      await api.put(`/project-management/${project.id}`, formData);
      
      fetchSections();
      Swal.fire('Başarılı!', `Proje ${fieldText} güncellendi.`, 'success');
    } catch (err) {
      console.error(`Proje ${fieldText} güncellenemedi:`, err);
      Swal.fire('Hata!', `Proje ${fieldText} güncellenirken bir hata oluştu.`, 'error');
    }
  };

  const openGalleryModal = useCallback((images: Image[]) => {
    if (!images || images.length === 0) return;
    
    const decodedImages = images.map(img => decodeImage(img.imageData)).filter(Boolean);
    if (decodedImages.length > 0) {
      setGalleryImages(decodedImages);
      setCurrentImageIndex(0);
      setIsGalleryModalOpen(true);
    }
  }, []);

  const closeGalleryModal = useCallback(() => {
    setIsGalleryModalOpen(false);
    setTimeout(() => setGalleryImages([]), 300);
  }, []);

  const nextImage = useCallback(() => {
    if (galleryImages.length === 0) return;
    setCurrentImageIndex(prevIndex => (prevIndex + 1) % galleryImages.length);
  }, [galleryImages.length]);

  const prevImage = useCallback(() => {
    if (galleryImages.length === 0) return;
    setCurrentImageIndex(prevIndex => (prevIndex === 0 ? galleryImages.length - 1 : prevIndex - 1));
  }, [galleryImages.length]);

  const truncateText = (text: string | undefined, maxLength: number = 50) => {
    if (!text) return '';
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text;
  };

  const openTextModalWithContent = (content: string) => setModalContent(content);
  const closeTextModal = () => setModalContent(null);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Proje Yönetimi</h1>
          <button
            onClick={() => {
              const currentlyOpen = isFormOpen;
              setIsFormOpen(!currentlyOpen);
              if (currentlyOpen) {
                resetFormAndImages();
              }
            }}
            className={`${isFormOpen ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white px-4 py-2 rounded transition-colors`}
          >
            {isFormOpen ? 'Formu Kapat' : 'Yeni Proje Ekle'}
          </button>
        </div>

        {isFormOpen && (
          <form onSubmit={formik.handleSubmit} className="space-y-6 p-6 bg-white rounded-lg shadow-xl border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-gray-800">Başlık</label>
                <input type="text" id="title" name="title" onChange={formik.handleChange} value={formik.values.title} className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label htmlFor="client" className="block text-sm font-semibold text-gray-800">Müşteri</label>
                <input type="text" id="client" name="client" onChange={formik.handleChange} value={formik.values.client} className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label htmlFor="location" className="block text-sm font-semibold text-gray-800">Konum</label>
                <input type="text" id="location" name="location" onChange={formik.handleChange} value={formik.values.location} className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label htmlFor="area" className="block text-sm font-semibold text-gray-800">Alan</label>
                <input type="text" id="area" name="area" onChange={formik.handleChange} value={formik.values.area} className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label htmlFor="projectDate" className="block text-sm font-semibold text-gray-800">Proje Tarihi</label>
                <input type="date" id="projectDate" name="projectDate" onChange={formik.handleChange} value={formik.values.projectDate} className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label htmlFor="link" className="block text-sm font-semibold text-gray-800">Link</label>
                <input type="text" id="link" name="link" onChange={formik.handleChange} value={formik.values.link} className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-semibold text-gray-800">Açıklama</label>
                <textarea id="description" name="description" onChange={formik.handleChange} value={formik.values.description} className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label htmlFor="enTitle" className="block text-sm font-semibold text-gray-800">(EN) Başlık</label>
                <input type="text" id="enTitle" name="enTitle" onChange={formik.handleChange} value={formik.values.enTitle} className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="enDescription" className="block text-sm font-semibold text-gray-800">(EN) Açıklama</label>
                <textarea id="enDescription" name="enDescription" onChange={formik.handleChange} value={formik.values.enDescription} className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <label className="flex items-center text-sm font-semibold text-gray-800">
                <input type="checkbox" id="isCompleted" name="isCompleted" onChange={formik.handleChange} checked={formik.values.isCompleted} className="mr-2 h-4 w-4" />
                Proje Tamamlandı
              </label>
              <label className="flex items-center text-sm font-semibold text-gray-800">
                <input type="checkbox" id="isActive" name="isActive" onChange={formik.handleChange} checked={formik.values.isActive} className="mr-2 h-4 w-4" />
                Proje Aktif
              </label>
            </div>

            {/* --- Çoklu Resim Yükleme ve Önizleme Alanı --- */}
            <div>
              <label htmlFor="files" className="block text-sm font-semibold text-gray-800">Görsel Yükle (Çoklu seçim yapabilirsiniz)</label>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" multiple />

              {(existingImages.length > 0 || filesToUpload.length > 0) && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {existingImages.map((image) => (
                    <div key={image.id} className="relative group h-32">
                      <MemoizedImageDecoder imageData={image.data} altText="Mevcut görsel" />
                      <button type="button" onClick={() => handleDeleteExistingImage(image.id)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center text-xs opacity-80 group-hover:opacity-100">&#x2715;</button>
                    </div>
                  ))}
                  {filesToUpload.map((file, index) => (
                    <div key={index} className="relative group h-32">
                      <img src={URL.createObjectURL(file)} alt={`Yüklenecek ${index + 1}`} className="h-full w-full object-cover rounded shadow-sm" />
                      <button type="button" onClick={() => handleRemoveNewImage(index)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center text-xs opacity-80 group-hover:opacity-100">&#x2715;</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-4">
                <button type="button" onClick={() => { setIsFormOpen(false); resetFormAndImages(); }} className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600">İptal</button>
                <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700">{editId ? 'Güncelle' : 'Kaydet'}</button>
            </div>
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
                <th className="p-3 border">Tamamlandı Mı?</th>
                <th className="p-3 border">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => (
                <tr key={section.id} className="text-center">
                  <td className="p-3 border max-w-[150px] truncate hover:bg-gray-50" onDoubleClick={() => openTextModalWithContent(section.title)}>{truncateText(section.title)}</td>
                  <td className="p-3 border max-w-[150px] truncate hover:bg-gray-50" onDoubleClick={() => openTextModalWithContent(section.enTitle)}>{truncateText(section.enTitle)}</td>
                  <td className="p-3 border max-w-[200px] truncate hover:bg-gray-50" onDoubleClick={() => openTextModalWithContent(section.description)}>{truncateText(section.description)}</td>
                  <td className="p-3 border max-w-[200px] truncate hover:bg-gray-50" onDoubleClick={() => openTextModalWithContent(section.enDescription)}>{truncateText(section.enDescription)}</td>
                  <td className="p-3 border max-w-[100px] truncate hover:bg-gray-50" onDoubleClick={() => openTextModalWithContent(section.client)}>{truncateText(section.client)}</td>
                  <td className="p-3 border max-w-[100px] truncate hover:bg-gray-50" onDoubleClick={() => openTextModalWithContent(section.location)}>{truncateText(section.location)}</td>
                  <td className="p-3 border max-w-[100px] truncate hover:bg-gray-50" onDoubleClick={() => openTextModalWithContent(section.area)}>{truncateText(section.area)}</td>
                  <td className="p-3 border">{new Date(section.projectDate).toLocaleDateString('tr-TR')}</td>
                  <td className="p-3 border"><a href={section.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Link</a></td>
                  <td className="p-3 border">
                    {section.image && section.image.length > 0 ? (
                      <div className="relative w-16 h-10 mx-auto rounded overflow-hidden group cursor-pointer" onClick={() => openGalleryModal(section.image!)}>
                        <MemoizedImageDecoder imageData={section.image[0].imageData} altText="Referans görseli" />
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100"><span className="text-white text-xs">Büyüt</span></div>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Yok</span>
                    )}
                  </td>
                  <td className="p-3 border"><span className={section.isActive ? 'text-green-600 font-semibold' : 'text-red-500'}>{section.isActive ? 'Aktif' : 'Pasif'}</span></td>
                  <td className="p-3 border"><span className={section.isCompleted ? 'text-green-600 font-semibold' : 'text-red-500'}>{section.isCompleted ? 'Evet' : 'Hayır'}</span></td>
                  <td className="p-3 border space-x-2 whitespace-nowrap">
                    <button onClick={() => handleToggleBoolean(section, 'isActive')} className={`${section.isActive ? 'bg-red-500' : 'bg-green-500'} text-white px-2 py-1 rounded text-xs`}>{section.isActive ? 'Pasifleştir' : 'Aktifleştir'}</button>
                    <button onClick={() => handleToggleBoolean(section, 'isCompleted')} className={`${section.isCompleted ? 'bg-gray-500' : 'bg-blue-500'} text-white px-2 py-1 rounded text-xs`}>{section.isCompleted ? 'Tamamlanmadı' : 'Tamamla'}</button>
                    <button onClick={() => handleEdit(section)} className="bg-yellow-400 text-white px-2 py-1 rounded text-xs">Düzenle</button>
                    <button onClick={() => handleDelete(section.id)} className="bg-red-600 text-white px-2 py-1 rounded text-xs">Sil</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full">
            <h3 className="text-xl font-bold mb-4">Tam İçerik</h3>
            <div className="text-gray-800 break-words max-h-96 overflow-y-auto"><p>{modalContent}</p></div>
            <div className="mt-6 text-right"><button onClick={closeTextModal} className="bg-blue-600 text-white px-4 py-2 rounded">Kapat</button></div>
          </div>
        </div>
      )}
      
      {isGalleryModalOpen && galleryImages.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 transition-opacity duration-300" onClick={closeGalleryModal}>
          <div className="relative bg-transparent p-4 w-full max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button onClick={closeGalleryModal} className="absolute -top-2 -right-2 md:top-0 md:-right-12 bg-red-600 text-white rounded-full p-2 z-20 hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            <div className="relative w-full h-full flex items-center justify-center">
                {galleryImages.length > 1 && (
                    <button onClick={prevImage} className="absolute left-0 top-1/2 -translate-y-1/2 bg-gray-800 text-white rounded-full p-3 z-10 opacity-70 hover:opacity-100 transition-opacity">
                        &#8249;
                    </button>
                )}
                
                <img src={galleryImages[currentImageIndex]} alt={`Proje Görseli ${currentImageIndex + 1}`} className="max-w-full max-h-full object-contain rounded-md" style={{ maxHeight: '85vh' }} />
                
                {galleryImages.length > 1 && (
                    <button onClick={nextImage} className="absolute right-0 top-1/2 -translate-y-1/2 bg-gray-800 text-white rounded-full p-3 z-10 opacity-70 hover:opacity-100 transition-opacity">
                        &#8250;
                    </button>
                )}
            </div>

            {galleryImages.length > 1 && (
                <div className="absolute bottom-4 text-center text-white bg-black bg-opacity-50 rounded-full px-4 py-1 text-sm">
                    {currentImageIndex + 1} / {galleryImages.length}
                </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ProjectYonetimi;