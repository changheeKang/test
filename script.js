const imageUpload = document.getElementById('imageUpload');
const imagePreview = document.getElementById('imagePreview'); // Kept for now, but canvas is primary
const objectDetectionCanvas = document.getElementById('objectDetectionCanvas');
const resultsDiv = document.getElementById('results');
const ctx = objectDetectionCanvas.getContext('2d');
const loader = document.getElementById('loader'); // Get loader element

let mobilenetModel;
let cocoSsdModel;

// Load the MobileNet model (for classification)
async function loadMobileNetModel() {
    try {
        mobilenetModel = await mobilenet.load();
        console.log('MobileNet model loaded successfully');
        return true;
    } catch (error) {
        console.error('Error loading MobileNet model:', error);
        return false;
    }
}

// Load the COCO-SSD model (for object detection)
async function loadCocoSsdModel() {
    try {
        cocoSsdModel = await cocoSsd.load();
        console.log('COCO-SSD model loaded successfully');
        return true;
    } catch (error) {
        console.error('Error loading COCO-SSD model:', error);
        return false;
    }
}

// Load all models
async function loadAllModels() {
    if (loader) loader.style.display = 'block';
    resultsDiv.innerHTML = '<p>Loading models...</p>';
    resultsDiv.classList.remove('visible'); // Keep it hidden initially

    const mobileNetLoaded = await loadMobileNetModel();
    const cocoSsdLoaded = await loadCocoSsdModel();

    let statusMsg = '';
    if (mobileNetLoaded && cocoSsdLoaded) {
        statusMsg = '<p>All models loaded. Ready to classify and detect objects!</p>';
    } else if (mobileNetLoaded) {
        statusMsg = '<p>MobileNet loaded. COCO-SSD failed. Classification available.</p>';
    } else if (cocoSsdLoaded) {
        statusMsg = '<p>COCO-SSD loaded. MobileNet failed. Object detection available.</p>';
    } else {
        statusMsg = '<p class="low-confidence">Error loading models. Please try again later.</p>';
    }
    resultsDiv.innerHTML = statusMsg;
    resultsDiv.classList.add('visible'); // Animate in
    if (loader) loader.style.display = 'none';
}

// loadAllModels(); // Will be called from DOMContentLoaded

// Updated getConfidenceClass function
function getConfidenceClass(probability) {
    if (probability > 0.75) return 'high-confidence';
    if (probability > 0.5) return 'medium-confidence'; // Adjusted threshold
    return 'low-confidence';
}

// Drag and drop event listeners
if (imageUpload) {
    imageUpload.addEventListener('dragenter', (event) => {
        event.preventDefault();
        imageUpload.classList.add('dragover-highlight');
    });
    imageUpload.addEventListener('dragover', (event) => {
        event.preventDefault();
    });
    imageUpload.addEventListener('dragleave', (event) => {
        imageUpload.classList.remove('dragover-highlight');
    });
    imageUpload.addEventListener('drop', (event) => {
        imageUpload.classList.remove('dragover-highlight');
    });
}

imageUpload.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
        if (loader) loader.style.display = 'block';
        resultsDiv.innerHTML = '';
        resultsDiv.classList.remove('visible'); // Reset for animation
        ctx.clearRect(0, 0, objectDetectionCanvas.width, objectDetectionCanvas.height);
        objectDetectionCanvas.classList.remove('loaded');

        const reader = new FileReader();
        reader.onload = async (e) => {
            const img = new Image();
            img.onload = async () => {
                objectDetectionCanvas.width = img.width;
                objectDetectionCanvas.height = img.height;
                ctx.drawImage(img, 0, 0, img.width, img.height);
                objectDetectionCanvas.classList.add('loaded');

                let classificationHtml = '';
                let detectionMessage = '';

                if (mobilenetModel) {
                    try {
                        const predictions = await mobilenetModel.classify(img);
                        classificationHtml = '<h3>Classification:</h3>';
                        if (predictions && predictions.length > 0) {
                            predictions.forEach(prediction => {
                                classificationHtml += `<p class="${getConfidenceClass(prediction.probability)}">${prediction.className}: ${Math.round(prediction.probability * 100)}%</p>`;
                            });
                        } else {
                            classificationHtml += '<p>No classification predictions found.</p>';
                        }
                    } catch (error) {
                        console.error('Error classifying image:', error);
                        classificationHtml = `<h3>Classification:</h3><p class="low-confidence">Error classifying image: ${error.message}</p>`;
                    }
                } else {
                    classificationHtml = '<h3>Classification:</h3><p>MobileNet model not loaded. Skipping classification.</p>';
                }

                if (cocoSsdModel) {
                    try {
                        const detections = await cocoSsdModel.detect(img);
                        drawDetections(img, detections); // Pass img for context if needed by drawDetections

                        if (detections.length > 0) {
                            detectionMessage = '<p>Object detection complete. Results drawn on image.</p>';
                        } else {
                            detectionMessage = '<p>No objects detected.</p>';
                        }
                    } catch (error) {
                        console.error('Error detecting objects:', error);
                        detectionMessage = `<p class="low-confidence">Error detecting objects: ${error.message}</p>`;
                    }
                } else {
                    detectionMessage = '<p>COCO-SSD model not loaded. Skipping object detection.</p>';
                }

                resultsDiv.innerHTML = classificationHtml + detectionMessage;
                resultsDiv.classList.add('visible'); // Trigger slide-in animation

                if (loader) loader.style.display = 'none';
            }
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    } else {
        if (loader) loader.style.display = 'none';
        objectDetectionCanvas.classList.remove('loaded');
        resultsDiv.classList.remove('visible');
        ctx.clearRect(0, 0, objectDetectionCanvas.width, objectDetectionCanvas.height);
        resultsDiv.innerHTML = '';
    }
});

function drawDetections(sourceImage, detections) {
    // Assuming canvas is already correctly sized and has the image from imageUpload listener.
    // If not, you'd call:
    // ctx.clearRect(0,0, objectDetectionCanvas.width, objectDetectionCanvas.height);
    // ctx.drawImage(sourceImage,0,0, objectDetectionCanvas.width, objectDetectionCanvas.height);

    ctx.font = '16px Arial';
    ctx.lineWidth = 2;

    detections.forEach(detection => {
        const confidenceClass = getConfidenceClass(detection.score);

        if (confidenceClass === 'high-confidence') {
            ctx.strokeStyle = '#28a745'; // Green
            ctx.fillStyle = '#28a745';
        } else if (confidenceClass === 'medium-confidence') {
            ctx.strokeStyle = '#fd7e14'; // Orange
            ctx.fillStyle = '#fd7e14';
        } else { // low-confidence
            ctx.strokeStyle = '#dc3545'; // Red
            ctx.fillStyle = '#dc3545';
        }

        ctx.beginPath();
        ctx.rect(detection.bbox[0], detection.bbox[1], detection.bbox[2], detection.bbox[3]);
        ctx.stroke();

        // Text background for better readability
        const text = `${detection.class} (${Math.round(detection.score * 100)}%)`;
        const textWidth = ctx.measureText(text).width;
        const textX = detection.bbox[0];
        const textY = detection.bbox[1] > 20 ? detection.bbox[1] - 5 : detection.bbox[1] + detection.bbox[3] + 15; // Adjust Y to be above or below box edge

        ctx.save(); // Save current context state
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; // Semi-transparent white background for text
        ctx.fillRect(textX, textY - parseInt(ctx.font, 10), textWidth + 4, parseInt(ctx.font, 10) + 4); // Approx background rect

        // Set text color based on confidence again for the fillText
        if (confidenceClass === 'high-confidence') ctx.fillStyle = '#28a745';
        else if (confidenceClass === 'medium-confidence') ctx.fillStyle = '#fd7e14';
        else ctx.fillStyle = '#dc3545';

        ctx.fillText(text, textX + 2, textY);
        ctx.restore(); // Restore context state
    });
}
