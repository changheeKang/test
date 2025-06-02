const imageUpload = document.getElementById('imageUpload');
const imagePreview = document.getElementById('imagePreview');
const resultsDiv = document.getElementById('results');
let model;

// Load the MobileNet model
async function loadModel() {
    try {
        model = await mobilenet.load();
        console.log('Model loaded successfully');
        resultsDiv.innerHTML = '<p>Model loaded. Ready to classify!</p>';
    } catch (error) {
        console.error('Error loading model:', error);
        resultsDiv.innerHTML = '<p>Error loading model. Please try again later.</p>';
    }
}

loadModel();

imageUpload.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
            resultsDiv.innerHTML = '<p>Classifying...</p>';

            if (model) {
                try {
                    const predictions = await model.classify(imagePreview);
                    displayPredictions(predictions);
                } catch (error) {
                    console.error('Error classifying image:', error);
                    resultsDiv.innerHTML = '<p>Error classifying image.</p>';
                }
            } else {
                resultsDiv.innerHTML = '<p>Model not loaded yet. Please wait.</p>';
            }
        };
        reader.readAsDataURL(file);
    } else {
        imagePreview.style.display = 'none';
        resultsDiv.innerHTML = '';
    }
});

function displayPredictions(predictions) {
    if (predictions && predictions.length > 0) {
        resultsDiv.innerHTML = '<h3>Predictions:</h3>';
        predictions.forEach(prediction => {
            const p = document.createElement('p');
            p.innerText = `${prediction.className}: ${Math.round(prediction.probability * 100)}%`;
            resultsDiv.appendChild(p);
        });
    } else {
        resultsDiv.innerHTML = '<p>No predictions found.</p>';
    }
}
