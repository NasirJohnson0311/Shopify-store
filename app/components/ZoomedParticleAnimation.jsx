import { useEffect, useRef } from 'react';

// Particle Animation Component
const ZoomedParticleAnimation = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let time = 0;
    let particles = [];
    let currentViewportState = null;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const initializeParticles = () => {
      const isSmallContainer = canvas.width < 440;

      // Same zoom level for both mobile and desktop
      const zoomLevel = 2.5;

      // Different offsets for mobile to push particles to screen edge
      const zoomOffsetX = isSmallContainer ? 0 : canvas.width / 18;
      const zoomOffsetY = canvas.height / 18 - 60;

      // Same particle count for both
      const numParticles = 50;
      const centerX = canvas.width / (2 * zoomLevel) + zoomOffsetX;
      const centerY = canvas.height / (2 * zoomLevel) + zoomOffsetY;

      particles = [];

      // SAME circular pattern for BOTH mobile and desktop
      for (let i = 0; i < numParticles; i++) {
        const angle = (i / numParticles) * Math.PI * 2;
        const baseRadius = 180;
        const radiusVariation = 80;
        const radius = Math.random() * radiusVariation + baseRadius;

        const clusterChance = Math.random();
        const clusterOffset = clusterChance < 0.2 ? 40 : (clusterChance > 0.8 ? -40 : 0);

        // Much slower initial speed on mobile to reduce flickering (95% slower)
        const speedMultiplier = isSmallContainer ? 0.0005 : 1.0;

        // Smaller particle size on mobile
        const particleSize = isSmallContainer
          ? Math.random() * 0.8 + 0.4  // Mobile: 0.4-1.2
          : Math.random() * 1.5 + 0.8; // Desktop: 0.8-2.3

        particles.push({
          x: centerX + Math.cos(angle) * (radius + clusterOffset),
          y: centerY + Math.sin(angle) * (radius + clusterOffset),
          speedX: (Math.random() - 0.5) * 0.05 * speedMultiplier,
          speedY: (Math.random() - 0.5) * 0.05 * speedMultiplier,
          size: particleSize,
          connections: [],
          noiseOffset: Math.random() * 1000,
          idealSpace: 60 + Math.random() * 20,
          allowClustering: clusterChance < 0.35
        });
      }

      // Store current viewport state to detect changes
      currentViewportState = {
        isSmallContainer,
        zoomLevel,
        zoomOffsetX,
        zoomOffsetY,
        centerX,
        centerY,
        numParticles,
        maxConnectionDistance: isSmallContainer ? 120 / zoomLevel : 180 / zoomLevel,
        fadeZoneWidth: 60 / zoomLevel
      };

      return currentViewportState;
    };

    const handleResize = () => {
      const previousWidth = canvas.width;
      resizeCanvas();

      // Only reinitialize particles when crossing mobile/desktop threshold
      const isSmallNow = canvas.width < 440;
      const wasSmall = previousWidth < 440;

      if (isSmallNow !== wasSmall) {
        // Viewport crossed mobile/desktop threshold - reinitialize particles
        initializeParticles();
      } else {
        // Same viewport type - just update viewport state without recreating particles
        const isSmallContainer = canvas.width < 440;
        const zoomLevel = 2.5;
        const zoomOffsetX = isSmallContainer ? 0 : canvas.width / 18;
        const zoomOffsetY = canvas.height / 18 - 60;
        const centerX = canvas.width / (2 * zoomLevel) + zoomOffsetX;
        const centerY = canvas.height / (2 * zoomLevel) + zoomOffsetY;

        currentViewportState = {
          isSmallContainer,
          zoomLevel,
          zoomOffsetX,
          zoomOffsetY,
          centerX,
          centerY,
          numParticles: currentViewportState.numParticles,
          maxConnectionDistance: isSmallContainer ? 120 / zoomLevel : 180 / zoomLevel,
          fadeZoneWidth: 60 / zoomLevel
        };
      }
    };

    resizeCanvas();
    let state = initializeParticles();
    window.addEventListener('resize', handleResize);

    const animate = () => {
      if (!currentViewportState) return;

      // Much slower time increment on mobile to reduce flickering (90% slower)
      const timeIncrement = currentViewportState.isSmallContainer ? 0.0001 : 0.0025;
      time += timeIncrement;

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach(particle => particle.connections = []);

      // Calculate connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const distance = Math.sqrt(
            Math.pow(particles[i].x - particles[j].x, 2) +
            Math.pow(particles[i].y - particles[j].y, 2)
          );

          if (distance < currentViewportState.maxConnectionDistance * currentViewportState.zoomLevel) {
            let alpha;
            if (distance < (currentViewportState.maxConnectionDistance - currentViewportState.fadeZoneWidth) * currentViewportState.zoomLevel) {
              alpha = Math.min(0.12, 0.18 * (1 - distance / ((currentViewportState.maxConnectionDistance - currentViewportState.fadeZoneWidth) * currentViewportState.zoomLevel)));
            } else {
              const fadeProgress = (distance - (currentViewportState.maxConnectionDistance - currentViewportState.fadeZoneWidth) * currentViewportState.zoomLevel) / (currentViewportState.fadeZoneWidth * currentViewportState.zoomLevel);
              alpha = 0.12 * Math.pow(1 - fadeProgress, 3);
            }

            if (alpha > 0.001) {
              particles[i].connections.push({ particle: particles[j], distance, alpha });
              particles[j].connections.push({ particle: particles[i], distance, alpha });
            }
          }
        }
      }

      particles.forEach((particle) => {
        const noiseScale = 0.001;
        const noiseX = particle.x * noiseScale + particle.noiseOffset;
        const noiseY = particle.y * noiseScale + particle.noiseOffset + 100;
        const noiseVal = Math.sin(noiseX + time) * Math.cos(noiseY - time) +
                        Math.sin(noiseX * 2 + time * 0.6) * Math.cos(noiseY * 2 - time * 0.6) * 0.3;

        // Much reduced noise multiplier for mobile to reduce flickering (97% slower)
        const noiseMultiplier = currentViewportState.isSmallContainer ? 0.0000005 : 0.00125;
        particle.speedX += Math.cos(noiseVal * Math.PI * 2) * noiseMultiplier;
        particle.speedY += Math.sin(noiseVal * Math.PI * 2) * noiseMultiplier;

        // Reduced center force for mobile (95% slower)
        const centerForceMultiplier = currentViewportState.isSmallContainer ? 0.002 : 1.0;
        const dx = currentViewportState.centerX - particle.x;
        const dy = currentViewportState.centerY - particle.y;
        const distanceToCenter = Math.sqrt(dx * dx + dy * dy);
        const centerRange = particle.allowClustering ? 130 : 200;
        const minDistance = particle.allowClustering ? 60 : 90;

        if (distanceToCenter > centerRange) {
          particle.speedX += dx / distanceToCenter * 0.002 * centerForceMultiplier;
          particle.speedY += dy / distanceToCenter * 0.002 * centerForceMultiplier;
        } else if (distanceToCenter < minDistance) {
          particle.speedX -= dx / distanceToCenter * 0.0025 * centerForceMultiplier;
          particle.speedY -= dy / distanceToCenter * 0.0025 * centerForceMultiplier;
        }

        // Same particle spacing logic for BOTH mobile and desktop
        particles.forEach(other => {
          if (other === particle) return;

          const dx = particle.x - other.x;
          const dy = particle.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < particle.idealSpace) {
            const force = particle.allowClustering && other.allowClustering ? 0.005 : 0.015;
            if (distance < particle.idealSpace * 0.7) {
              particle.speedX += dx / distance * force;
              particle.speedY += dy / distance * force;
            }
          }
        });

        // Same damping for both mobile and desktop
        const damping = 0.98;
        particle.speedX *= damping;
        particle.speedY *= damping;

        particle.x += particle.speedX;
        particle.y += particle.speedY;

        // Extended left/right boundaries on mobile
        const horizontalPadding = currentViewportState.isSmallContainer ? 80 : 0;
        const minX = -horizontalPadding / currentViewportState.zoomLevel;
        const maxX = (canvas.width / currentViewportState.zoomLevel) + (horizontalPadding / currentViewportState.zoomLevel);

        // Wrap-around boundaries
        if (particle.x < minX) particle.x += (maxX - minX);
        if (particle.x > maxX) particle.x -= (maxX - minX);
        if (particle.y < 0) particle.y += canvas.height / currentViewportState.zoomLevel;
        if (particle.y > canvas.height / currentViewportState.zoomLevel) particle.y -= canvas.height / currentViewportState.zoomLevel;
      });

      ctx.save();
      ctx.translate(-currentViewportState.zoomOffsetX * currentViewportState.zoomLevel, -currentViewportState.zoomOffsetY * currentViewportState.zoomLevel);
      ctx.scale(currentViewportState.zoomLevel, currentViewportState.zoomLevel);
      ctx.lineWidth = 1 / currentViewportState.zoomLevel;
      ctx.lineCap = 'round';

      // Draw connections - reduced opacity on mobile
      particles.forEach(particle => {
        particle.connections.forEach(conn => {
          // Reduce connection opacity by 40% on mobile
          const connectionAlpha = currentViewportState.isSmallContainer
            ? conn.alpha * 0.6
            : conn.alpha;

          ctx.strokeStyle = `rgba(255, 3, 3, ${connectionAlpha})`;
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(conn.particle.x, conn.particle.y);
          ctx.stroke();
        });
      });

      // Draw particles - reduced opacity on mobile
      particles.forEach(particle => {
        const distanceToCenter = Math.sqrt(
          Math.pow(particle.x - currentViewportState.centerX, 2) +
          Math.pow(particle.y - currentViewportState.centerY, 2)
        );
        const alphaVariation = 0.5;
        let alpha = Math.max(0.15, Math.min(0.35, 1 - distanceToCenter / (500 + alphaVariation * 100)));

        // Reduce opacity by 40% on mobile
        if (currentViewportState.isSmallContainer) {
          alpha *= 0.6;
        }

        ctx.fillStyle = `rgba(255, 3, 3, ${alpha})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);

      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      particles.length = 0;
      time = 0;
      currentViewportState = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none'
      }}
    />
  );
};

export default ZoomedParticleAnimation;
