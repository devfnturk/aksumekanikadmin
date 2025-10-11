
import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import { useFormik } from 'formik';
import api from '../api';
import Swal from 'sweetalert2';
import { useLoading } from '../contexts/LoadingContext';
import Modal from '../components/Modal';
import TextModalContent from '../components/TextModalContent';
import ImageModalContent from '../components/ImageModalContent';

// --- TİPLER VE YARDIMCI FONKSİYONLAR ---

type Image = {
  id: string;
  url: string;
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

// Google Drive URL'lerini thumbnail'e çeviren yardımcı fonksiyon
const convertToThumbnail = (url: string): string => {
  if (!url) return '';
  if (url.includes('drive.google.com/file/d/')) {
    const match = url.match(/d\/(.*?)\//);
    if (match && match[1]) {
      const fileId = match[1];
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=s1920`;
    }
  }
  return url;
};


// --- Form Bileşeni - GÖRSEL ÖNİZLEME EKLENDİ ---
const ProjectForm = React.memo(({
  onSubmit,
  initialValues,
  initialImages,
  onDeleteExistingImage,
  onCancel
}: {
  onSubmit: (values: any, imageUrls: { id: string | null; url: string }[]) => Promise<void>;
  initialValues: any;
  initialImages: Image[];
  onDeleteExistingImage: (imageId: string) => void;
  onCancel: () => void;
}) => {
  const formik = useFormik({
    initialValues,
    enableReinitialize: true,
    onSubmit: async (values) => {
      await onSubmit(values, images);
    }
  });

  const [images, setImages] = useState<{ id: string | null; url: string }[]>([]);

  useEffect(() => {
    if (initialImages && initialImages.length > 0) {
      setImages(initialImages);
    } else {
      setImages([{ id: null, url: '' }]);
    }
  }, [initialImages]);


  const handleUrlChange = (index: number, value: string) => {
    const updatedImages = [...images];
    updatedImages[index].url = value;
    setImages(updatedImages);
  };

  const addUrlInput = () => {
    setImages([...images, { id: null, url: '' }]);
  };

  const removeUrlInput = (index: number) => {
    const imageToRemove = images[index];
    if (imageToRemove.id) {
      onDeleteExistingImage(imageToRemove.id);
    }
    setImages(images.filter((_, i) => i !== index));
  };


  return (
    <form onSubmit={formik.handleSubmit} className="space-y-6 p-6 bg-white rounded-lg shadow-xl border">
      {/* Diğer form alanları aynı kaldı... */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="title" className="block text-sm font-semibold text-gray-800">Başlık</label>
          <input
            type="text"
            id="title"
            name="title"
            onChange={formik.handleChange}
            value={formik.values.title}
            className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            autoComplete="off"
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
            className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="location" className="block text-sm font-semibold text-gray-800">Konum</label>
          <input
            type="text"
            id="location"
            name="location"
            onChange={formik.handleChange}
            value={formik.values.location}
            className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            autoComplete="off"
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
            className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="projectDate" className="block text-sm font-semibold text-gray-800">Proje Tarihi</label>
          <input
            type="date"
            id="projectDate"
            name="projectDate"
            onChange={formik.handleChange}
            value={formik.values.projectDate}
            className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
            className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            autoComplete="off"
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="description" className="block text-sm font-semibold text-gray-800">Açıklama</label>
          <textarea
            id="description"
            name="description"
            onChange={formik.handleChange}
            value={formik.values.description}
            className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            rows={3}
          />
        </div>
        <div>
          <label htmlFor="enTitle" className="block text-sm font-semibold text-gray-800">(EN) Başlık</label>
          <input
            type="text"
            id="enTitle"
            name="enTitle"
            onChange={formik.handleChange}
            value={formik.values.enTitle}
            className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            autoComplete="off"
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="enDescription" className="block text-sm font-semibold text-gray-800">(EN) Açıklama</label>
          <textarea
            id="enDescription"
            name="enDescription"
            onChange={formik.handleChange}
            value={formik.values.enDescription}
            className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            rows={3}
          />
        </div>
      </div>
      <div className="flex items-center space-x-6">
        <label className="flex items-center text-sm font-semibold text-gray-800">
          <input
            type="checkbox"
            id="isCompleted"
            name="isCompleted"
            onChange={formik.handleChange}
            checked={formik.values.isCompleted}
            className="mr-2 h-4 w-4"
          />
          Proje Tamamlandı
        </label>
        <label className="flex items-center text-sm font-semibold text-gray-800">
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            onChange={formik.handleChange}
            checked={formik.values.isActive}
            className="mr-2 h-4 w-4"
          />
          Proje Aktif
        </label>
      </div>

      {/********** DEĞİŞİKLİK BURADA **********/}
      <div>
        <label className="block text-sm font-semibold text-gray-800">Görsel URL'leri</label>
        {images.map((image, index) => (
          <div key={index} className="mt-2 flex items-center gap-3">
            {/* --- YENİ: Görsel Önizleme Kutusu --- */}
            <div className="w-20 h-14 flex-shrink-0 bg-gray-100 rounded border flex items-center justify-center overflow-hidden">
              {image.url ? (
                <img
                  src={convertToThumbnail(image.url)}
                  alt={`Önizleme ${index + 1}`}
                  className="w-full h-full object-cover"
                  // Hata durumunda kırık resim ikonunu gizle
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  // Tekrar geçerli bir URL girilirse görünür yap
                  onLoad={(e) => { e.currentTarget.style.display = 'block'; }}
                  loading="lazy"
                />
              ) : (
                <span className="text-xs text-gray-400 text-center px-1">URL Girin</span>
              )}
            </div>

            {/* URL Giriş Alanı */}
            <input
              type="text"
              value={image.url}
              onChange={(e) => handleUrlChange(index, e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="flex-grow px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />

            {/* Butonlar */}
            <button
              type="button"
              onClick={() => removeUrlInput(index)}
              className="bg-red-500 text-white w-8 h-8 rounded-md hover:bg-red-600 flex items-center justify-center font-bold flex-shrink-0"
            >
              -
            </button>
            {index === images.length - 1 && (
              <button
                type="button"
                onClick={addUrlInput}
                className="bg-green-500 text-white w-8 h-8 rounded-md hover:bg-green-600 flex items-center justify-center font-bold flex-shrink-0"
              >
                +
              </button>
            )}
          </div>
        ))}
        {images.length === 0 && (
             <button
                type="button"
                onClick={addUrlInput}
                className="mt-2 bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 text-sm"
              >
                Görsel Ekle
              </button>
        )}
      </div>
      {/******************************************/}

      <div className="flex justify-end gap-4">
        <button type="button" onClick={onCancel} className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600">İptal</button>
        <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700">Kaydet</button>
      </div>
    </form>
  );
});


// --- ANA BİLEŞEN (Değişiklik yok) ---
const ProjectYonetimi: React.FC = () => {
  const { showLoading, hideLoading } = useLoading();
  const [sections, setSections] = useState<Section[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [modalChildren, setModalChildren] = useState<React.ReactNode | null>(null);
  const [imageIdsToDelete, setImageIdsToDelete] = useState<Set<string>>(new Set());
  const [initialImagesForForm, setInitialImagesForForm] = useState<Image[]>([]);

  const [formInitialValues, setFormInitialValues] = useState({
    fieldOfActivityId: '', title: '', description: '', client: '',
    location: '', area: '', projectDate: '', link: '',
    isCompleted: true, enTitle: '', enDescription: '', isActive: true,
  });

  const fetchSections = useCallback(async () => {
    showLoading();
    try {
      const res = await api.get<Section[]>('/project-management');
      setSections(res.data);
    } catch (err) {
      console.error('Veri çekme hatası', err);
      Swal.fire('Hata!', 'Veriler alınırken hata oluştu.', 'error');
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const resetFormAndImages = useCallback(() => {
    setFormInitialValues({
      fieldOfActivityId: '', title: '', description: '', client: '',
      location: '', area: '', projectDate: '', link: '',
      isCompleted: true, enTitle: '', enDescription: '', isActive: true,
    });
    setEditId(null);
    setImageIdsToDelete(new Set());
    setInitialImagesForForm([]);
  }, []);

  const handleFormSubmit = useCallback(async (values: any, images: { id: string | null; url: string }[]) => {
    const result = await Swal.fire({
      title: editId ? 'Projeyi güncellemek istediğinize emin misiniz?' : 'Yeni proje eklemek istediğinize emin misiniz?',
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Evet',
      cancelButtonText: 'Hayır', buttonsStyling: false,
      customClass: {
        actions: 'flex justify-center gap-4',
        confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700',
        cancelButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700',
      },
    });
    if (!result.isConfirmed) return;
    showLoading();

    const newImageUrls = images
      .filter(img => img.id === null && img.url.trim() !== '')
      .map(img => convertToThumbnail(img.url));

    const requestPayload = {
      ...values,
      projectDate: values.projectDate ? new Date(values.projectDate).toISOString().split('T')[0] : '',
      imageUrls: newImageUrls,
      deleteImageIds: Array.from(imageIdsToDelete),
    };

    try {
      if (editId) {
        await api.put(`/project-management/${editId}`, requestPayload);
        Swal.fire('Başarılı!', 'Proje başarıyla güncellendi.', 'success');
      } else {
        await api.post('/project-management', requestPayload);
        Swal.fire('Başarılı!', 'Yeni proje başarıyla eklendi.', 'success');
      }
      fetchSections();
      resetFormAndImages();
      setIsFormOpen(false);
    } catch (err) {
      console.error('Kaydetme hatası:', err);
      Swal.fire('Hata!', 'Kaydetme sırasında bir hata oluştu.', 'error');
    } finally {
      hideLoading();
    }
  }, [editId, imageIdsToDelete, showLoading, hideLoading, resetFormAndImages, fetchSections]);

  const handleDeleteExistingImage = useCallback((imageId: string) => {
    setImageIdsToDelete(prev => new Set(prev).add(imageId));
  }, []);

  const handleEdit = useCallback((section: Section) => {
    resetFormAndImages();
    const formattedProjectDate = section.projectDate ? new Date(section.projectDate).toISOString().split('T')[0] : '';
    setFormInitialValues({
      fieldOfActivityId: section.fieldOfActivity?.id || '',
      title: section.title, description: section.description, client: section.client,
      location: section.location, area: section.area, projectDate: formattedProjectDate,
      link: section.link, isCompleted: section.isCompleted, enTitle: section.enTitle,
      enDescription: section.enDescription, isActive: section.isActive,
    });
    
    setInitialImagesForForm(section.image || []);
    
    setEditId(section.id);
    setIsFormOpen(true);
    window.scrollTo(0, 0);
  }, [resetFormAndImages]);

  const handleDelete = useCallback(async (id: string) => {
    const result = await Swal.fire({
        title: 'Bu projeyi silmek istediğinize emin misiniz?',
        text: "Bu işlem geri alınamaz!", icon: 'warning', showCancelButton: true,
        confirmButtonText: 'Evet, sil!', cancelButtonText: 'Hayır, iptal et',
        buttonsStyling: false,
        customClass: {
          actions: 'flex justify-center gap-4',
          confirmButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700',
          cancelButton: 'bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700',
        },
      });
  
      if (!result.isConfirmed) return;
  
      showLoading();
      try {
        await api.delete(`/project-management/${id}`);
        fetchSections();
        Swal.fire('Silindi!', 'Proje başarıyla silindi.', 'success');
      } catch (err) {
        console.error('Silme hatası:', err);
        Swal.fire('Hata!', 'Silme sırasında bir hata oluştu.', 'error');
      } finally {
        hideLoading();
      }
  }, [showLoading, hideLoading, fetchSections]);

  const handleToggleBoolean = useCallback(async (project: Section, field: 'isActive' | 'isCompleted') => {
    const newStatus = !project[field];
    const fieldText = field === 'isActive' ? 'aktiflik durumunu' : 'tamamlanma durumunu';
    const newStatusText = newStatus ? (field === 'isActive' ? 'Aktif' : 'Tamamlandı') : (field === 'isActive' ? 'Pasif' : 'Tamamlanmadı');

    const result = await Swal.fire({
      title: `Proje ${fieldText} "${newStatusText}" olarak değiştirmek istediğinize emin misiniz?`,
      icon: 'question', showCancelButton: true, confirmButtonText: 'Evet',
      cancelButtonText: 'Hayır', buttonsStyling: false,
      customClass: {
        actions: 'flex justify-center gap-4',
        confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700',
        cancelButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700',
      },
    });

    if (!result.isConfirmed) return;

    showLoading();
    try {
      const payload = {
        ...project,
        imageUrls: project.image?.map(img => img.url) || [],
        [field]: newStatus,
      };
      delete (payload as any).image;

      await api.put(`/project-management/${project.id}`, payload);

      fetchSections();
      Swal.fire('Başarılı!', `Proje ${fieldText} güncellendi.`, 'success');
    } catch (err) {
      console.error(`Proje ${fieldText} güncellenemedi:`, err);
      Swal.fire('Hata!', `Proje ${fieldText} güncellenirken bir hata oluştu.`, 'error');
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading, fetchSections]);


  const truncateText = useCallback((text: string | undefined, maxLength: number = 50) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }, []);

  const openTextModal = useCallback((content: string) => {
    setModalChildren(<TextModalContent title="Detaylı İçerik" content={content} />);
  }, []);

  const openImageModal = useCallback((images: Image[], startIndex: number = 0) => {
    if (!images || images.length === 0) return;
    const imageUrls = images.map(img => img.url);
    setModalChildren(
      <ImageModalContent
        title="Proje Görselleri"
        imageUrls={imageUrls}
        startIndex={startIndex}
      />
    );
  }, []);

  const closeModal = useCallback(() => setModalChildren(null), []);
  const handleCancelForm = useCallback(() => {
    setIsFormOpen(false);
    resetFormAndImages();
  }, [resetFormAndImages]);

  const TableRowComponent = React.memo(({ section }: { section: Section }) => {
    return (
      <tr className="text-center">
        <td className="p-3 border max-w-[150px] truncate hover:bg-gray-50 cursor-pointer" onDoubleClick={() => openTextModal(section.title)}>{truncateText(section.title)}</td>
        <td className="p-3 border max-w-[150px] truncate hover:bg-gray-50 cursor-pointer" onDoubleClick={() => openTextModal(section.enTitle)}>{truncateText(section.enTitle)}</td>
        <td className="p-3 border max-w-[200px] truncate hover:bg-gray-50 cursor-pointer" onDoubleClick={() => openTextModal(section.description)}>{truncateText(section.description)}</td>
        <td className="p-3 border max-w-[200px] truncate hover:bg-gray-50 cursor-pointer" onDoubleClick={() => openTextModal(section.enDescription)}>{truncateText(section.enDescription)}</td>
        <td className="p-3 border max-w-[100px] truncate hover:bg-gray-50 cursor-pointer" onDoubleClick={() => openTextModal(section.client)}>{truncateText(section.client)}</td>
        <td className="p-3 border max-w-[100px] truncate hover:bg-gray-50 cursor-pointer" onDoubleClick={() => openTextModal(section.location)}>{truncateText(section.location)}</td>
        <td className="p-3 border max-w-[100px] truncate hover:bg-gray-50 cursor-pointer" onDoubleClick={() => openTextModal(section.area)}>{truncateText(section.area)}</td>
        <td className="p-3 border">{new Date(section.projectDate).toLocaleDateString('tr-TR')}</td>
        <td className="p-3 border"><a href={section.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Link</a></td>
        <td className="p-3 border">
          {section.image && section.image.length > 0 ? (
            <div className="relative w-16 h-10 mx-auto rounded overflow-hidden group cursor-pointer" onClick={() => openImageModal(section.image!, 0)}>
              <img src={section.image[0].url} alt="Proje görseli" className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110" loading="lazy" />
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <span className="text-white text-xs font-semibold">Büyüt</span>
              </div>
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
    );
  });

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Proje Yönetimi</h1>
          <button
            onClick={() => {
              const currentlyOpen = isFormOpen;
              if (currentlyOpen) {
                resetFormAndImages();
              }
              setIsFormOpen(!currentlyOpen);
            }}
            className={`${isFormOpen ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white px-4 py-2 rounded transition-colors`}
          >
            {isFormOpen ? 'Formu Kapat' : 'Yeni Proje Ekle'}
          </button>
        </div>

        {isFormOpen && (
          <ProjectForm
            onSubmit={handleFormSubmit}
            initialValues={formInitialValues}
            initialImages={initialImagesForForm}
            onDeleteExistingImage={handleDeleteExistingImage}
            onCancel={handleCancelForm}
          />
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
                <TableRowComponent key={section.id} section={section} />
              ))}
              {sections.length === 0 && (
                <tr>
                  <td colSpan={13} className="p-4 text-center text-gray-400">
                    Henüz proje eklenmedi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalChildren !== null} onClose={closeModal}>
        {modalChildren}
      </Modal>
    </Layout>
  );
};

export default ProjectYonetimi;