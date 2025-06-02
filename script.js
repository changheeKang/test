const imageUpload = document.getElementById('imageUpload');
const imagePreview = document.getElementById('imagePreview'); // Kept for now, but canvas is primary
const objectDetectionCanvas = document.getElementById('objectDetectionCanvas');
const resultsDiv = document.getElementById('results');
const ctx = objectDetectionCanvas.getContext('2d');

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
    resultsDiv.innerHTML = '<p>Loading models...</p>';
    const mobileNetLoaded = await loadMobileNetModel();
    const cocoSsdLoaded = await loadCocoSsdModel();

    if (mobileNetLoaded && cocoSsdLoaded) {
        resultsDiv.innerHTML = '<p>All models loaded. Ready to classify and detect objects!</p>';
    } else if (mobileNetLoaded) {
        resultsDiv.innerHTML = '<p>MobileNet loaded. COCO-SSD failed. Classification available.</p>';
    } else if (cocoSsdLoaded) {
        resultsDiv.innerHTML = '<p>COCO-SSD loaded. MobileNet failed. Object detection available.</p>';
    } else {
        resultsDiv.innerHTML = '<p>Error loading both models. Please try again later.</p>';
    }
}

loadAllModels();

imageUpload.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            // imagePreview.src = e.target.result; // Load into hidden image tag first - not strictly needed if using Image object directly
            // imagePreview.style.display = 'block'; // Temporarily display for dimensions if needed, then hide

            const img = new Image();
            img.onload = async () => {
                // Set canvas dimensions to the image dimensions
                objectDetectionCanvas.width = img.width;
                objectDetectionCanvas.height = img.height;
                // Draw the image onto the canvas
                ctx.drawImage(img, 0, 0, img.width, img.height);
                // imagePreview.style.display = 'none'; // Hide the img tag if it was shown

                resultsDiv.innerHTML = '<p>Processing...</p>';
                let currentResultsHTML = "";

                // Perform classification (optional, can be toggled or removed if only detection is needed)
                if (mobilenetModel) {
                    try {
                        const predictions = await mobilenetModel.classify(img); // Classify the image directly
                        currentResultsHTML += displayClassificationPredictions(predictions); // Renamed for clarity
                    } catch (error) {
                        console.error('Error classifying image:', error);
                        currentResultsHTML += '<p>Error classifying image.</p>';
                    }
                } else {
                    currentResultsHTML += '<p>MobileNet model not loaded. Skipping classification.</p>';
                }

                // Perform object detection
                if (cocoSsdModel) {
                    try {
                        const detections = await cocoSsdModel.detect(img); // Detect objects in the image
                        drawDetections(detections); // New function to draw detections
                        if (detections.length > 0) {
                            currentResultsHTML += '<p>Object detection complete. Results drawn on image.</p>';
                        } else {
                            currentResultsHTML += '<p>No objects detected.</p>';
                        }
                    } catch (error) {
                        console.error('Error detecting objects:', error);
                        currentResultsHTML += '<p>Error detecting objects.</p>';
                    }
                } else {
                    currentResultsHTML += '<p>COCO-SSD model not loaded. Skipping object detection.</p>';
                }
                resultsDiv.innerHTML = currentResultsHTML;
            }
            img.src = e.target.result; // This will trigger img.onload

        };
        reader.readAsDataURL(file);
    } else {
        ctx.clearRect(0, 0, objectDetectionCanvas.width, objectDetectionCanvas.height);
        resultsDiv.innerHTML = '';
        // imagePreview.style.display = 'none'; // Ensure it's hidden if no file
    }
});

function displayClassificationPredictions(predictions) {
    let classificationHtml = '<h3>Classification:</h3>';
    if (predictions && predictions.length > 0) {
        predictions.forEach(prediction => {
            classificationHtml += `<p>${prediction.className}: ${Math.round(prediction.probability * 100)}%</p>`;
        });
    } else {
        classificationHtml += '<p>No classification predictions found.</p>';
    }
    return classificationHtml;
}

// New function to draw detections on the canvas
function drawDetections(detections) {
    // The image is already on the canvas. Now draw boxes.
    // Clear previous drawings (except the image itself) if any, though detections are usually drawn once.
    // If you were re-detecting without reloading image, you'd clear old boxes here.
    // ctx.clearRect(0, 0, objectDetectionCanvas.width, objectDetectionCanvas.height); // Clears everything including image
    // ctx.drawImage(img, 0, 0, objectDetectionCanvas.width, objectDetectionCanvas.height); // Redraw image if cleared, (need img reference)

    ctx.font = '16px Arial';
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'red';
    ctx.fillStyle = 'red';

    detections.forEach(detection => {
        ctx.beginPath();
        // detection.bbox format: [x, y, width, height]
        ctx.rect(detection.bbox[0], detection.bbox[1], detection.bbox[2], detection.bbox[3]);
        ctx.stroke();
        ctx.fillText(
            `${detection.class} (${Math.round(detection.score * 100)}%)`,
            detection.bbox[0],
            detection.bbox[1] > 10 ? detection.bbox[1] - 5 : detection.bbox[1] + 15 // Adjust text position
        );
    });
}
