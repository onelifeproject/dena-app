import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';

export default function ZoomableImageViewerModal({ isOpen, imageSrc, imageAlt, title = 'ডকুমেন্ট প্রিভিউ', onClose }) {
  if (!isOpen || !imageSrc) return null;

  return (
    <div
      className="modal-overlay image-viewer-overlay"
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
    >
      <div className="image-viewer-shell" onClick={(event) => event.stopPropagation()}>
        <div className="image-viewer-toolbar">
          <h3 className="text-base font-bold text-pure">{title}</h3>
          <button
            type="button"
            className="image-viewer-close"
            onClick={onClose}
            aria-label="বন্ধ করুন"
          >
            &times;
          </button>
        </div>

        <TransformWrapper
          minScale={1}
          maxScale={6}
          initialScale={1}
          wheel={{ step: 0.2 }}
          pinch={{ step: 5 }}
          doubleClick={{ mode: 'toggle', step: 1.4 }}
          panning={{ velocityDisabled: true }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              <div className="image-viewer-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => zoomOut()}>
                  -
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => resetTransform()}>
                  রিসেট
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => zoomIn()}>
                  +
                </button>
              </div>
              <TransformComponent
                wrapperClass="image-viewer-transform-wrapper"
                contentClass="image-viewer-transform-content"
              >
                <img
                  src={imageSrc}
                  alt={imageAlt}
                  className="image-viewer-image"
                />
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </div>
    </div>
  );
}
