/**
 * Hero component inspired by Shopify Horizon theme
 * Displays a full-width hero section with background image and optional content overlay
 */
export function Hero({
  image = '/hero-image.jpeg',
  alt = 'Hero banner',
  height = 'medium',
  children,
  overlay = false,
  overlayOpacity = 0.3,
}) {
  // Calculate hero height based on prop
  const getHeight = () => {
    switch (height) {
      case 'small':
        return '400px';
      case 'medium':
        return '600px';
      case 'large':
        return '800px';
      case 'full':
        return '100vh';
      default:
        return '600px';
    }
  };

  return (
    <div className="hero-wrapper">
      <div
        className="hero"
        style={{
          '--hero-min-height': getHeight(),
        }}
      >
        <div className="hero__container">
          {/* Background Image */}
          <div className="hero__media-wrapper">
            {overlay && (
              <div
                className="hero__overlay"
                style={{
                  '--overlay-opacity': overlayOpacity,
                }}
              />
            )}
            <img
              src={image}
              alt={alt}
              className="hero__image"
              loading="eager"
              fetchpriority="high"
            />
          </div>

          {/* Content Overlay */}
          {children && (
            <div className="hero__content-wrapper">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
