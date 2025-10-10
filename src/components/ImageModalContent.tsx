import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import React from 'react';
import Slider from 'react-slick';
// --- Özel Ok Bileşenleri (SVG ile) ---

interface ArrowProps {
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

const NextArrow = ({ className, onClick }: ArrowProps) => {
  return (
    <div
      className={`${className} custom-arrow next-arrow`}
      onClick={onClick}
    >
      {/* react-icons yerine SVG kullandık */}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9.293 7.707a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L13.586 13 9.293 8.707a1 1 0 010-1.414z" />
      </svg>
    </div>
  );
};

const PrevArrow = ({ className, onClick }: ArrowProps) => {
  return (
    <div
      className={`${className} custom-arrow prev-arrow`}
      onClick={onClick}
    >
      {/* react-icons yerine SVG kullandık */}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14.707 16.293a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L10.414 12l4.293 4.293a1 1 0 010 1.414z" />
      </svg>
    </div>
  );
};


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
    appendDots: (dots: React.ReactNode) => (
      <div style={{ position: 'absolute', bottom: '-40px' }}>
        <ul style={{ margin: '0px' }}> {dots} </ul>
      </div>
    ),
  };

  if (!imageUrls || imageUrls.length === 0) {
    return <div className="p-4 text-white">Gösterilecek görsel bulunamadı.</div>;
  }

  return (
    <div className="relative p-4 md:px-16">
      <style>{`
        .custom-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 10;
          cursor: pointer;
          background-color: rgba(255, 255, 255, 0.7);
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
          background-color: rgba(255, 255, 255, 1);
          transform: translateY(-50%) scale(1.1);
        }
        .custom-arrow svg {
          /* SVG'nin rengini ve boyutunu ayarlıyoruz */
          color: #333;
          width: 24px;
          height: 24px;
        }
        .next-arrow {
          right: -15px;
        }
        .prev-arrow {
          left: -15px;
        }
        @media (max-width: 768px) {
          .next-arrow { right: 10px; }
          .prev-arrow { left: 10px; }
        }
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
      
      <h2 className="text-center text-2xl font-semibold text-white mb-5">{title}</h2>
      
      {imageUrls.length <= 1 ? (
        <div className="flex justify-center">
            <img 
                src={imageUrls[0]} 
                alt={title} 
                className="max-w-full h-auto object-contain rounded-lg shadow-xl"
                style={{ maxHeight: '80vh' }}
            />
        </div>
      ) : (
        <Slider {...settings}>
          {imageUrls.map((url, index) => (
            <div key={index} className="px-2">
              <div className="flex justify-center items-center">
                <img 
                    src={url} 
                    alt={`${title} - ${index + 1}`} 
                    className="max-w-full h-auto object-contain rounded-lg shadow-xl"
                    style={{ maxHeight: '80vh' }}
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