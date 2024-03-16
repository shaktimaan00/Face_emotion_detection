import React, { useRef, useEffect } from 'react';
import './style.css'; // Import the CSS file
import * as faceapi from 'face-api.js';

const FaceDetectionComponent = () => {
  const videoRef = useRef(null);

  useEffect(() => {
    const loadModels = async () => {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        faceapi.nets.faceExpressionNet.loadFromUri('/models'),
        faceapi.nets.ageGenderNet.loadFromUri('/models')
      ]);
      startWebCam();
    };

    const startWebCam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing webcam:', error);
      }
    };

    loadModels();

    return () => {
      // Clean up code if necessary
    };
  }, []);

  useEffect(() => {
    const setupFaceDetection = async () => {
      if (!videoRef.current) return;

      // Wait for the video to load metadata (including dimensions)
      await new Promise(resolve => {
        videoRef.current.onloadedmetadata = resolve;
      });

      const canvas = faceapi.createCanvasFromMedia(videoRef.current);
      document.body.append(canvas);

      faceapi.matchDimensions(canvas, { height: videoRef.current.videoHeight, width: videoRef.current.videoWidth });

      const intervalId = setInterval(async () => {
        if (!videoRef.current.paused && !videoRef.current.ended) {
          const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceExpressions()
            .withAgeAndGender();

          canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
          const resizedDetections = faceapi.resizeResults(detections, {
            height: videoRef.current.videoHeight,
            width: videoRef.current.videoWidth
          });

          faceapi.draw.drawDetections(canvas, resizedDetections);
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
          faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

          resizedDetections.forEach(detection => {
            const box = detection.detection.box;
            const drawBox = new faceapi.draw.DrawBox(box, {
              label: `${Math.round(detection.age)} year old ${detection.gender}`
            });
            drawBox.draw(canvas);
          });
        }
      }, 100);

      return () => {
        clearInterval(intervalId);
        if (canvas) canvas.remove();
      };
    };

    setupFaceDetection();
  }, []);

  return (
    <video id="video" ref={videoRef} width="640" height="480" autoPlay muted></video>
  );
};

export default FaceDetectionComponent;
