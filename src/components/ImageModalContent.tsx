// ImageModalContent.tsx

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import React from 'react';
import Slider from 'react-slick';

// --- Özel Ok Bileşenleri (Değişiklik Yok) ---
interface ArrowProps {
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

const NextArrow = ({ className, onClick }: ArrowProps) => (
  <div className={`${className} custom-arrow next-arrow`} onClick={onClick}>
  </div>
);

const PrevArrow = ({ className, onClick }: ArrowProps) => (
  <div className={`${className} custom-arrow prev-arrow`} onClick={onClick}>
  </div>
);


type ImageModalContentProps = {
  title: string;
  imageUrls: string[];
  startIndex?: number;
};

const ImageModalContent: React.FC<ImageModalContentProps> = ({ title, imageUrls, startIndex = 0 }) => {
  const settings = {
    dots: true,
    infinite: imageUrls.length > 1,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: imageUrls.length > 1,
    adaptiveHeight: true,
    initialSlide: startIndex,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
  };

  if (!imageUrls || imageUrls.length === 0) {
    return <div className="p-4 text-white">Gösterilecek görsel bulunamadı.</div>;
  }

  return (
    // Ana kapsayıcıyı kaldırdık, çünkü Modal.tsx'de zaten var.
    // Sadece gerekli stilleri ve slider'ı bırakıyoruz.
    <div>
      <style>{`
        .custom-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 10;
          cursor: pointer;
          background-color: rgba(0, 0, 0, 0.4);
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
          transition: all 0.2s ease-in-out;
        }
        .custom-arrow:hover {
          background-color: rgba(0, 0, 0, 0.7);
          transform: translateY(-50%) scale(1.1);
        }
        .custom-arrow svg {
          color: #fff; /* Ok rengini beyaz yaptık */
          width: 24px;
          height: 24px;
        }
        .next-arrow {
          right: 15px; /* Okları içeri aldık */
        }
        .prev-arrow {
          left: 15px; /* Okları içeri aldık */
        }
        /* Noktaların stillerini iyileştirelim */
        .slick-dots li button:before {
          font-size: 12px;
          color: #fff;
          opacity: 0.5;
          transition: all 0.2s ease-in-out;
        }
        .slick-dots li.slick-active button:before {
          color: #fff;
          opacity: 1;
        }
      `}</style>
      
      {/* Başlığı resimlerin dışına, modalın üstüne taşıyabiliriz veya burada bırakabiliriz */}
      <h2 className="text-center text-2xl font-semibold text-white mb-4">{title}</h2>
      
      {imageUrls.length <= 1 ? (
        <div className="flex justify-center">
            <img 
                src={imageUrls[0]} 
                alt={title} 
                className="max-w-full h-auto object-contain rounded-lg shadow-xl"
                style={{ maxHeight: '80vh' }} // Yüksekliği kısıtlayalım
            />
        </div>
      ) : (
        <Slider {...settings}>
          {imageUrls.map((url, index) => (
            <div key={index}>
              <div className="flex justify-center items-center bg-black bg-opacity-20">
                <img 
                    src={url} 
                    alt={`${title} - ${index + 1}`} 
                    className="max-w-full h-auto object-contain"
                    style={{ maxHeight: '80vh' }} // Yüksekliği kısıtlayalım
                />
              </div>
            </div>
          ))}
        </Slider>
      )}
    </div>
  );
};

export default ImageModalContent;