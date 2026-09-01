import React, { useRef, useState, useEffect } from 'react';
import { Camera, CameraOff, Upload, RefreshCw, Play, Square, Image as ImageIcon } from 'lucide-react';

export default function WebcamCapture({
  onCapture,
  isContinuous = false,
  continuousIntervalMs = 2500,
  onContinuousFrame = null,
  label = "Camera Feed",
  sampleImages = [],
  autoStart = false,
  isActive = true,
  hideControls = false,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isRunningContinuous, setIsRunningContinuous] = useState(false);
  const [lastPreview, setLastPreview] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const startCamera = async () => {
    try {
      setErrorMsg(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);
      return true;
    } catch (err) {
      console.warn("Webcam access error:", err);
      setErrorMsg("Camera access denied or unavailable. You can upload an image or choose a demo preset below.");
      setIsCameraActive(false);
      return false;
    }
  };

  const stopCamera = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsRunningContinuous(false);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    let isMounted = true;

    if (!isActive) {
      const finalSnap = grabCurrentFrameBase64();
      if (finalSnap) setLastPreview(finalSnap);
      stopCamera();
      return;
    }

    if (autoStart && isActive) {
      startCamera().then((success) => {
        if (success && isMounted && isContinuous) {
          setTimeout(() => {
            if (isMounted) startIntervalStream();
          }, 800);
        }
      });
    }

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [autoStart, isActive]);

  const grabCurrentFrameBase64 = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  const handleCaptureSnapshot = () => {
    const base64 = grabCurrentFrameBase64();
    if (base64) {
      setLastPreview(base64);
      if (onCapture) onCapture(base64);
    }
  };

  const toggleContinuous = () => {
    if (isRunningContinuous) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsRunningContinuous(false);
    } else {
      if (!isCameraActive) {
        startCamera().then(() => {
          startIntervalStream();
        });
      } else {
        startIntervalStream();
      }
    }
  };

  const startIntervalStream = () => {
    setIsRunningContinuous(true);
    const trigger = () => {
      const base64 = grabCurrentFrameBase64();
      if (base64) {
        setLastPreview(base64);
        if (onContinuousFrame) onContinuousFrame(base64);
        else if (onCapture) onCapture(base64);
      }
    };
    trigger();
    intervalRef.current = setInterval(trigger, continuousIntervalMs);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      setLastPreview(base64);
      if (onCapture) onCapture(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSample = (sampleUrlOrBase64) => {
    setLastPreview(sampleUrlOrBase64);
    if (onCapture) onCapture(sampleUrlOrBase64);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '260px',
          background: 'var(--color-surface-container, #f1f5f9)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Hidden Canvas */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Video Element */}
        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: isCameraActive ? 'block' : 'none',
            transform: 'scaleX(-1)',
          }}
        />

        {/* Static Preview or Placeholder */}
        {!isCameraActive && (
          lastPreview ? (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <img
                src={lastPreview}
                alt="Captured Snapshot"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--color-tertiary-fixed, #dcfce7)',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '8px',
                  color: 'var(--color-on-tertiary-fixed, #14532d)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  border: '1px solid var(--color-tertiary-fixed-dim, #86efac)',
                }}
              >
                ✓ Snapshot Ready
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--text-muted)',
                padding: '1rem',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'var(--color-primary-fixed, #dbeafe)',
                  color: 'var(--color-primary, #2563eb)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Camera size={26} />
              </div>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Camera Ready
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Start webcam or select an image file to proceed
              </span>
            </div>
          )
        )}

        {/* Overlay Label */}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: isCameraActive ? 'var(--color-secondary, #f97316)' : '#ffffff',
            padding: '0.25rem 0.65rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: isCameraActive ? '#ffffff' : 'var(--text-main)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            border: isCameraActive ? 'none' : '1px solid var(--border-subtle)',
          }}
        >
          {isCameraActive && (
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#ffffff',
                display: 'inline-block',
              }}
            />
          )}
          <span>
            {isCameraActive
              ? (isRunningContinuous ? 'Active continuous proctoring' : 'Live webcam stream')
              : (lastPreview ? 'Snapshot captured' : label)}
          </span>
        </div>
      </div>

      {errorMsg && (
        <div
          style={{
            fontSize: '0.8rem',
            color: 'var(--color-on-error-container, #991b1b)',
            background: 'var(--color-error-container, #fee2e2)',
            padding: '0.6rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid #fecaca',
            fontWeight: 500,
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Control Buttons Bar */}
      {!hideControls && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {!isCameraActive ? (
              <button
                type="button"
                className="btn btn-primary"
                style={{ fontSize: '0.82rem', padding: '0.5rem 0.9rem' }}
                onClick={startCamera}
              >
                <Camera size={15} />
                <span>Start Webcam</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-emerald"
                  style={{ fontSize: '0.82rem', padding: '0.5rem 0.9rem' }}
                  onClick={handleCaptureSnapshot}
                >
                  <RefreshCw size={15} />
                  <span>Capture Frame</span>
                </button>

                {isContinuous && (
                  <button
                    type="button"
                    className={`btn ${isRunningContinuous ? 'btn-danger' : 'btn-orange'}`}
                    style={{ fontSize: '0.82rem', padding: '0.5rem 0.9rem' }}
                    onClick={toggleContinuous}
                  >
                    {isRunningContinuous ? <Square size={15} /> : <Play size={15} />}
                    <span>{isRunningContinuous ? 'Pause Stream' : 'Start Auto-Proctoring'}</span>
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.82rem', padding: '0.5rem 0.75rem' }}
                  onClick={stopCamera}
                >
                  <CameraOff size={15} />
                  <span>Turn Off</span>
                </button>
              </>
            )}

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.82rem', padding: '0.5rem 0.9rem' }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={15} />
              <span>Upload Image</span>
            </button>
          </div>

          {/* Sample presets */}
          {sampleImages.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Demo examples:</span>
              {sampleImages.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSample(sample.urlOrBase64)}
                  className="badge badge-blue"
                  style={{ cursor: 'pointer' }}
                >
                  <ImageIcon size={11} />
                  <span>{sample.name}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
